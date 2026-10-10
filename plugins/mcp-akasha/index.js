// @akasha-book/mcp —— 阿卡夏之书 MCP 注册桥（自带 stdio 客户端，**不引用任何 @deepseek-ai/* 包**）
//
// 为什么自带：DSH-Store 契约禁止第三方 Bundle Patch 以 `name: @deepseek-ai/...` 引用官方包
// （`SUBMISSION_PATCH_PROTECTED`），而官方 `@deepseek-ai/dsh-mcp-client` 并未导出"注册一个 MCP 服务器"
// 的服务。因此本插件自己完成：spawn MCP 服务器（stdio）→ JSON-RPC 握手 → tools/list → 用
// `ctx.tools.register(def)` 把每个工具注册成 `mcp__<serverName>__<tool>`。
//
// 与官方桥的**形状对齐**（照契约自写，未抄其代码）：
//   · 公开名规范化：`mcp__${serverName}__${rawName}`，非法字符→`_`；被改写或超长（>64）→ 截断 + 12 位 sha256 后缀；
//   · 工具定义六项：name / description / parameters(=inputSchema) / output{schema, render} / execute；
//   · execute 返回 { content, structuredContent? }；MCP `isError` → throw（让运行时记为失败）；
//   · 输出 schema：{ type:'object', properties:{ content:{type:'array',items:{}}, structuredContent? }, required, additionalProperties:false }。
//
// 已知限制（如实）：① 仅支持 stdio；② 文本内容完整保留，图片等非文本块在**渲染**里降级为占位符
// （值仍原样返回，不丢数据）；③ v1 不做自动重连（启动失败按 `failOnStartupError` 决定抛或降级）。

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

export const name = 'mcp-akasha';
export const inject = ['tools'];

const MAX_PUBLIC_NAME_LENGTH = 64;
const INVALID_NAME_CHARS = /[^A-Za-z0-9_-]/g;
const HASH_LENGTH = 12;
const DEFAULTS = {
  transport: 'stdio',
  serverName: 'akasha',
  command: 'node',
  args: [],
  env: {},
  cwd: '',
  toolCallTimeoutMs: 60000,
  startupTimeoutMs: 20000,
  failOnStartupError: false,
};

/** 与官方同名函数的规则一致：必要时加哈希后缀，保证公开名稳定且合法。 */
export function publicToolName(serverName, rawName) {
  const joined = `mcp__${serverName}__${rawName}`;
  const normalized = joined.replace(INVALID_NAME_CHARS, '_');
  if (normalized === joined && normalized.length <= MAX_PUBLIC_NAME_LENGTH) return normalized;
  const hash = createHash('sha256').update(`${serverName}\0${rawName}`).digest('hex').slice(0, HASH_LENGTH);
  return `${normalized.slice(0, MAX_PUBLIC_NAME_LENGTH - HASH_LENGTH - 1)}_${hash}`;
}

/** 文本提取：把 MCP content 里的文本块按行拼起来（非文本块给占位符，不丢数据）。 */
export function renderText(content) {
  const blocks = Array.isArray(content) ? content : [];
  return blocks
    .map((block) => (block && block.type === 'text' ? String(block.text ?? '') : `[${block?.type ?? 'unknown'}]`))
    .join('\n');
}

/** 极简 MCP stdio 客户端（换行分隔 JSON-RPC 2.0）。 */
export class StdioMcpClient {
  constructor({ command, args = [], env = {}, cwd = '', log = () => {} }) {
    this.command = command;
    this.args = args;
    this.env = env;
    this.cwd = cwd || undefined;
    this.log = log;
    this.child = null;
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = '';
    this.closed = false;
  }

  start() {
    return new Promise((resolve, reject) => {
      let settled = false;
      try {
        this.child = spawn(this.command, this.args, {
          cwd: this.cwd,
          env: { ...process.env, ...this.env },
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (error) {
        reject(error);
        return;
      }
      this.child.on('error', (error) => {
        if (!settled) { settled = true; reject(error); }
        this.#fail(error);
      });
      this.child.on('exit', (code, signal) => {
        this.closed = true;
        this.#fail(new Error(`MCP server exited (code=${code} signal=${signal ?? 'none'})`));
      });
      this.child.stdout.on('data', (chunk) => this.#onData(chunk));
      this.child.stderr.on('data', (chunk) => this.log('stderr: ' + String(chunk).trim().slice(0, 500)));
      // 关键：子进程死后写 stdin 会以**异步 'error' 事件**抛 EPIPE（try/catch 抓不到同步的），
      // 未处理就是未捕获异常 → 会打死宿主。三条流都挂 error 处理，失败走 #fail（拒绝挂起请求）。
      this.child.stdin.on('error', (error) => this.#fail(error));
      this.child.stdout.on('error', (error) => this.#fail(error));
      this.child.stderr.on('error', () => { /* stderr 出错无需处理 */ });
      this.child.on('spawn', () => { settled = true; resolve(); });
    });
  }

  #fail(error) {
    for (const { reject, timer } of this.pending.values()) { clearTimeout(timer); reject(error); }
    this.pending.clear();
  }

  #onData(chunk) {
    this.buffer += String(chunk);
    let index;
    while ((index = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, index).trim();
      this.buffer = this.buffer.slice(index + 1);
      if (!line) continue;
      let message;
      try { message = JSON.parse(line); } catch { this.log('跳过无法解析的行：' + line.slice(0, 200)); continue; }
      if (message && message.id !== undefined && this.pending.has(message.id)) {
        const { resolve, reject, timer } = this.pending.get(message.id);
        clearTimeout(timer);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(`MCP ${message.error.code ?? 'error'}: ${message.error.message ?? 'unknown'}`));
        else resolve(message.result);
      } else if (message && message.method) {
        this.log('忽略服务器通知：' + String(message.method));
      }
    }
  }

  request(method, params, timeoutMs) {
    if (this.closed) return Promise.reject(new Error('MCP server is not running'));
    if (!this.child?.stdin?.writable) return Promise.reject(new Error('MCP server stdin is not writable'));
    const id = this.nextId++;
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params: params ?? {} });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP ${method} 超时（${timeoutMs}ms）`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try { this.child.stdin.write(payload + '\n'); } catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
    });
  }

  notify(method, params) {
    if (this.closed) return;
    try { this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params: params ?? {} }) + '\n'); } catch (error) { this.log('通知写入失败：' + String(error?.message ?? error)); }
  }

  async initialize(timeoutMs) {
    const result = await this.request('initialize', {
      protocolVersion: '2026-06-18',
      capabilities: {},
      clientInfo: { name: 'akasha-book-mcp', version: '1.1.0' },
    }, timeoutMs);
    this.notify('notifications/initialized', {});
    return result;
  }

  listTools(timeoutMs) {
    return this.request('tools/list', {}, timeoutMs);
  }

  callTool(rawName, args, timeoutMs) {
    return this.request('tools/call', { name: rawName, arguments: args ?? {} }, timeoutMs);
  }

  close() {
    this.closed = true;
    this.#fail(new Error('MCP client closed'));
    try { this.child?.kill(); } catch { /* 已退出 */ }
  }
}

/** 按官方契约造一个工具定义（六项形状）。 */
export function createToolDefinition(client, { serverName, tool, toolCallTimeoutMs }) {
  const rawName = tool.name;
  const publicName = publicToolName(serverName, rawName);
  const outputSchema = tool.outputSchema;
  return {
    name: publicName,
    description: tool.description ?? '',
    parameters: tool.inputSchema ?? { type: 'object', properties: {} },
    output: {
      schema: {
        type: 'object',
        properties: { content: { type: 'array', items: {} }, ...(outputSchema === undefined ? {} : { structuredContent: outputSchema }) },
        required: outputSchema === undefined ? ['content'] : ['content', 'structuredContent'],
        additionalProperties: false,
      },
      render(_args, value) {
        return [{ type: 'text', text: renderText(value?.content) }];
      },
    },
    async execute(args, exec) {
      const argsObject = args && typeof args === 'object' ? args : {};
      if (exec?.signal?.aborted) throw new Error(`tool ${rawName} 已取消`);
      const call = client.callTool(rawName, argsObject, toolCallTimeoutMs);
      // 尊重调用方取消信号（与官方桥同语义：取消即拒绝，不等超时）
      const result = exec?.signal
        ? await Promise.race([
            call,
            new Promise((_resolve, reject) => {
              const onAbort = () => reject(new Error(`tool ${rawName} 已取消`));
              exec.signal.addEventListener('abort', onAbort, { once: true });
              call.finally(() => exec.signal.removeEventListener('abort', onAbort));
            }),
          ])
        : await call;
      const text = renderText(result?.content);
      if (result?.isError === true) throw new Error(text || `tool ${rawName} failed`);
      return { content: result?.content ?? [], ...(result?.structuredContent === undefined ? {} : { structuredContent: result.structuredContent }) };
    },
    projectContent() { return undefined; },
  };
}

export async function apply(ctx, config = {}) {

  // A/B 实验开关（2026-10-10 用户解冻，见 docs/ab-experiment-design.md §6）：
  // abOff=true ⇒ **关闭臂**——本插件不注册任何守卫/注入/工具，只记一行观测；库文件与日志照旧（便于事后复盘）。
  if (config.abOff === true) {
    try { (ctx.logger?.info ?? (() => {}))('mcp: abOff=true（A/B 关闭臂）——本插件不注册任何面'); } catch { /* 静默 */ }
    return;
  }
  const cfg = { ...DEFAULTS, ...(config ?? {}) };
  const log = (message) => { try { ctx.logger?.info?.(`mcp-akasha(${cfg.serverName}): ${message}`); } catch { /* 日志失败不影响主流程 */ } };
  const logError = (message) => { try { ctx.logger?.error?.(`mcp-akasha(${cfg.serverName}): ${message}`); } catch { /* 同上 */ } };

  if (cfg.transport !== 'stdio') {
    logError(`不支持的 transport=${String(cfg.transport)}（本桥仅 stdio）`);
    return;
  }
  if (typeof cfg.command !== 'string' || cfg.command.trim() === '') {
    throw new Error('mcp-akasha: 配置缺失 command（stdio 传输必需）');
  }
  if (!Array.isArray(cfg.args) || cfg.args.length === 0) {
    logError('未配置 args（通常应指向 mcp.mjs 的路径）');
  }

  let client = new StdioMcpClient({ command: cfg.command, args: cfg.args, env: cfg.env, cwd: cfg.cwd, log: (m) => log(m) });
  const disposers = new Map();
  const disposeAll = () => { for (const dispose of disposers.values()) { try { dispose(); } catch { /* ignore */ } } disposers.clear(); };

  const boot = (async () => {
    try {
      await client.start();
    } catch (error) {
      // 2026-10-10（对外安装体验）：用户机器上未必有 `node` 在 PATH（DSH 自带运行时）。
      // 若配置里就是 `node` 而启动失败（ENOENT），自动改用**宿主自己的**可执行文件重试一次。
      const looksLikeEnvNode = String(cfg.command).trim().toLowerCase() === 'node';
      const isMissing = String(error?.code ?? '') === 'ENOENT' || /ENOENT/.test(String(error?.message ?? ''));
      if (!looksLikeEnvNode || !isMissing) throw error;
      log(`command='node' 不可用（${String(error?.message ?? error).slice(0, 120)}）→ 回退到宿主自带 node：${process.execPath}`);
      client = new StdioMcpClient({ command: process.execPath, args: cfg.args, env: cfg.env, cwd: cfg.cwd, log: (m) => log(m) });
      await client.start();
    }
    const info = await client.initialize(cfg.startupTimeoutMs);
    log(`已连接 ${String(info?.serverInfo?.name ?? 'unknown')} ${String(info?.serverInfo?.version ?? '')}`.trim());
    const listed = await client.listTools(cfg.startupTimeoutMs);
    const tools = Array.isArray(listed?.tools) ? listed.tools : [];
    const seen = new Set();
    try {
      for (const tool of tools) {
        const definition = createToolDefinition(client, { serverName: cfg.serverName, tool, toolCallTimeoutMs: cfg.toolCallTimeoutMs });
        if (seen.has(definition.name)) { logError(`服务器重复列出工具 ${definition.name}，跳过后续重复项`); continue; }
        seen.add(definition.name);
        disposers.set(definition.name, ctx.tools.register(definition));
      }
    } catch (error) {
      // 注册中途失败：**必须回滚已注册的部分**（否则"半注册"状态与日志不符），再按配置决定抛或降级
      disposeAll();
      throw new Error(`工具注册失败，已回滚全部注册：${String(error?.message ?? error).slice(0, 200)}`);
    }
    log(`已注册 ${disposers.size} 个工具（前缀 mcp__${cfg.serverName}__；清单为启动时快照，重启宿主以刷新）`);
  })();

  const cleanup = () => { disposeAll(); client.close(); };

  if (cfg.failOnStartupError === true) {
    // 让 loader 拿到失败（apply 是 async，拒绝即插件的激活失败）——不在 catch 里 throw（那会变成未处理拒绝）
    try {
      await boot;
    } catch (error) {
      cleanup();
      throw error;
    }
  } else {
    // 降级路径：立刻挂上 catch（同步挂，避免未处理拒绝）；**必须 cleanup**——否则：
    //   ① 已注册的工具残留在宿主里（"无工具"的日志会说谎）；② spawn 成功但握手失败时子进程会泄漏。
    boot.catch((error) => {
      cleanup();
      logError(`启动失败（failOnStartupError=false → 已回滚并终止子进程，降级为无工具）：${String(error?.message ?? error).slice(0, 300)}`);
    });
  }

  if (typeof ctx.effect === 'function') ctx.effect(() => cleanup);
  else if (typeof ctx.on === 'function') { try { ctx.on('dispose', cleanup); } catch { /* 无 dispose 事件 */ } }
}
