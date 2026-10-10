// @akasha-book/mcp 自测：Bundle Patch 契约（STORE 硬门）+ 注册桥端到端（桩 ctx + 真实 MCP 服务器）
// 运行：node selftest.test.mjs（退出码 0 = 全过）；不碰真实 profile、不读任何密钥、不写真实库。
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORE = join(HERE, '..', '..', 'core');
const PATCH = join(HERE, 'cordis.patch.yml');
const patch = readFileSync(PATCH, 'utf8');

// —— ① Bundle Patch 契约（STORE 硬门：入口 ID 自有、不以 name 引用官方命名空间、不 disable/replace）——
assert.ok(/id:\s*mcp-akasha/.test(patch), '入口 id 为插件自有 ID：mcp-akasha');
assert.ok(!/\bname:\s*['"]?@deepseek-ai\//i.test(patch), 'Bundle Patch 不得以 name 引用 @deepseek-ai/* 官方包（SUBMISSION_PATCH_PROTECTED）');
assert.ok(/name:\s*['"]@akasha-book\/mcp['"]/.test(patch), 'Patch 引用自有包名 @akasha-book/mcp');
assert.ok(!/^\s*(remove|disable|patch):/m.test(patch), 'Bundle Patch 只使用 insert；不得出现 remove/disable/patch 行');

// —— ② 命令以数组给出，不做 shell 字符串拼接（fail closed：避免注入面）——
assert.ok(/args:\s*\[/.test(patch), 'args 必须为数组（不拼接 shell 字符串）');
assert.ok(!/command:\s*['"][^'"]*[;&|]/.test(patch), 'command 不得含 shell 元字符（; & |）');

// —— ③ 纯函数：公开名规范化（与官方同类规则：非法字符→_；改写或超长 → 截断 + 12 位哈希）——
const { apply, publicToolName, renderText } = await import('./index.js');
assert.equal(publicToolName('akasha', 'akasha_check'), 'mcp__akasha__akasha_check', '常规名不改写');
assert.match(publicToolName('akasha', 'a b/c'), /^mcp__akasha__a_b_c_[0-9a-f]{12}$/, '名被改写时加 12 位哈希后缀（与官方同类规则一致）');
{
  const long = publicToolName('akasha', 'x'.repeat(120));
  assert.ok(long.length <= 64, '超长名截断到 ≤64（实际 ' + long.length + '）');
  assert.match(long, /_[0-9a-f]{12}$/, '超长名带 12 位哈希后缀');
}
assert.equal(renderText([{ type: 'text', text: 'a' }, { type: 'image', data: 'x' }]), 'a\n[image]', '非文本块降级为占位符（不丢值）');

// —— ④ 注册桥端到端：临时 core 副本 + 真实 MCP 服务器（stdio）→ 注册 → 真调一个工具 ——
const SCRATCH = mkdtempSync(join(tmpdir(), 'mcp-akasha-selftest-'));
try {
  const coreCopy = join(SCRATCH, 'core');
  cpSync(CORE, coreCopy, { recursive: true });
  // 初始化示例库（数据面），让 akasha_check 有东西可校验
  execFileSync(process.execPath, ['init-example.mjs'], { cwd: coreCopy, stdio: 'pipe', timeout: 60000 });

  const registered = new Map();
  const logs = [];
  let disposer = null;
  const ctx = {
    tools: { register(definition) { registered.set(definition.name, definition); return () => registered.delete(definition.name); } },
    logger: { info: (m) => logs.push(String(m)), error: (m) => logs.push('ERROR ' + String(m)) },
    effect(fn) { disposer = fn(); },
  };
  apply(ctx, {
    serverName: 'akasha',
    transport: 'stdio',
    command: process.execPath,
    args: [join(coreCopy, 'mcp.mjs')],
    startupTimeoutMs: 30000,
    toolCallTimeoutMs: 60000,
    failOnStartupError: true,
  });

  for (let i = 0; i < 60 && registered.size === 0; i++) await new Promise((r) => setTimeout(r, 500));
  assert.ok(registered.size > 0, '应从真实 MCP 服务器注册到工具（实际 ' + registered.size + ' 个；日志：' + logs.slice(-2).join(' | ') + '）');
  const names = [...registered.keys()];
  assert.ok(names.every((n) => n.startsWith('mcp__akasha__')), '全部工具名前缀为 mcp__akasha__');
  const sample = registered.get('mcp__akasha__akasha_check');
  assert.ok(sample, '注册表里应含 mcp__akasha__akasha_check（实际：' + names.slice(0, 4).join(', ') + '）');
  assert.equal(typeof sample.execute, 'function', 'execute 存在');
  assert.equal(typeof sample.output?.render, 'function', 'output.render 存在');
  assert.equal(sample.parameters?.type, 'object', 'parameters 为 JSON schema');

  // 真调一次：akasha_check（示例库口径，应通过）
  const result = await sample.execute({}, { signal: undefined });
  assert.ok(Array.isArray(result.content) && result.content.length > 0, '工具返回 content 数组');
  const text = renderText(result.content);
  assert.ok(text.length > 0, '工具返回可渲染文本');
  assert.ok(/OK|canon/.test(text), 'akasha_check 在示例库上返回 OK（实际文本前缀：' + text.slice(0, 80).replace(/\n/g, ' ') + '）');
  console.log('端到端：注册 ' + registered.size + ' 个工具；akasha_check 实调返回：' + text.slice(0, 100).replace(/\n/g, ' '));

  // 取消信号：已 abort 的调用必须立即拒绝，而不是照跑到超时
  const aborted = new AbortController();
  aborted.abort();
  await assert.rejects(sample.execute({}, { signal: aborted.signal }), /已取消/, 'abort 信号 → 立即拒绝');

  // 注册中途失败 → 必须**回滚已注册部分**（防"半注册 + 日志说谎"）
  {
    const partial = new Map();
    let calls = 0;
    const poisonCtx = {
      tools: { register(definition) { calls += 1; if (calls === 3) throw new Error('poison'); partial.set(definition.name, definition); return () => partial.delete(definition.name); } },
      logger: { info: () => {}, error: () => {} },
      effect: () => {},
    };
    await assert.rejects(
      apply(poisonCtx, { serverName: 'akasha', transport: 'stdio', command: process.execPath, args: [join(coreCopy, 'mcp.mjs')], startupTimeoutMs: 30000, failOnStartupError: true }),
      /已回滚全部注册/,
      '注册中途失败 → 抛回滚错误',
    );
    assert.equal(partial.size, 0, '回滚后不得残留任何注册（实际 ' + partial.size + ' 个）');
  }

  // 对外安装体验回归：用户机器上未必有 `node` 在 PATH ⇒ 必须自动回退到宿主自带 node
  {
    const reg = new Map();
    const logs = [];
    const ctx = {
      tools: { register(definition) { reg.set(definition.name, definition); return () => reg.delete(definition.name); } },
      logger: { info: (m) => logs.push(String(m)), error: (m) => logs.push('ERROR ' + String(m)) },
      effect: () => {},
    };
    await apply(ctx, {
      serverName: 'akasha', transport: 'stdio', command: 'node', args: [join(coreCopy, 'mcp.mjs')],
      startupTimeoutMs: 30000, toolCallTimeoutMs: 30000, failOnStartupError: false, env: { PATH: '' },
    });
    for (let i = 0; i < 40 && reg.size === 0; i++) await new Promise((r) => setTimeout(r, 500));
    assert.ok(logs.some((l) => /回退到宿主自带 node/.test(l)), '应记录 node 回退日志（实际日志：' + logs.slice(-2).join(' | ').slice(0, 140) + '）');
    assert.ok(reg.size > 0, '回退后仍应注册到工具（实际 ' + reg.size + ' 个）');
    console.log('node 回退：注册 ' + reg.size + ' 个工具');
  }

  // 失败闭合：malformed 配置（缺 command）必须显式拒绝，而不是静默无工具（apply 是 async → 用 rejects）
  await assert.rejects(apply({ tools: { register: () => () => {} }, logger: {} }, { command: '' }), /command/, '缺 command → fail closed（显式拒绝）');

  // 清理：调用插件注册的 disposer（会杀掉 MCP 子进程），避免事件循环不归零
  if (typeof disposer === 'function') disposer();
} finally {
  rmSync(SCRATCH, { recursive: true, force: true });
}

// —— ④b 回归：子进程秒退（无效路径）时**不得**因 EPIPE / 未处理拒绝打死宿主 ——
// 这是 E3 抓到的真实故障：子进程死后写 stdin 会以异步 'error' 事件抛 EPIPE，未挂处理即未捕获异常。
{
  const logs = [];
  const softCtx = { tools: { register: () => () => {} }, logger: { info: (m) => logs.push(String(m)), error: (m) => logs.push('ERROR ' + String(m)) }, effect: () => {} };
  await apply(softCtx, {
    serverName: 'akasha', transport: 'stdio', command: process.execPath,
    args: [join(SCRATCH, 'definitely-missing-server.mjs')],
    startupTimeoutMs: 5000, toolCallTimeoutMs: 5000, failOnStartupError: false,
  });
  await new Promise((r) => setTimeout(r, 2000)); // 给 spawn/EPIPE 冒头的时间
  assert.ok(logs.some((l) => l.startsWith('ERROR')), '软失败路径：必须留降级日志（fail-soft，绝不静默）');

  const hardCtx = { tools: { register: () => () => {} }, logger: { info: () => {}, error: () => {} }, effect: () => {} };
  await assert.rejects(
    apply(hardCtx, {
      serverName: 'akasha', transport: 'stdio', command: process.execPath,
      args: [join(SCRATCH, 'definitely-missing-server.mjs')],
      startupTimeoutMs: 5000, toolCallTimeoutMs: 5000, failOnStartupError: true,
    }),
    '硬失败路径：failOnStartupError=true → apply 必须 reject（而不是未处理拒绝）',
  );
}

// —— ⑤ MCP 服务端：malformed JSON-RPC 不得导致非零退出（stdio 容错）——
{
  const serverPath = join(CORE, 'mcp.mjs');
  if (existsSync(serverPath)) {
    const result = await new Promise((resolve) => {
      const child = spawn(process.execPath, [serverPath], { stdio: ['pipe', 'pipe', 'pipe'] });
      let settled = false;
      const done = (v) => { if (!settled) { settled = true; try { child.kill(); } catch { /* 已退出 */ } resolve(v); } };
      const timer = setTimeout(() => done({ code: null }), 10000);
      child.on('error', () => { clearTimeout(timer); done({ code: 'spawn-error' }); });
      child.on('exit', (code) => { clearTimeout(timer); done({ code }); });
      const send = (s) => { try { child.stdin.write(s); } catch { /* stdin 关闭 */ } };
      // 畸形但各种形状：null / 数字 / 字符串 / 数组 / 无 method 的对象 / 非法 JSON
      // —— 每一个都必须回 JSON-RPC 错误（-32600 / -32700），而**不能**让服务器崩掉。
      send('null\n');
      send('123\n');
      send('"just a string"\n');
      send('[]\n');
      send('{}\n');
      send('{ this is not json }\n');
      send(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'no/such-method', params: {} }) + '\n');
      // 存活探针在块外做（见下方 liveness 断言）
    });
    assert.ok(result.code === null || result.code === 0, 'malformed JSON-RPC 不得导致非零退出（实际 exit=' + result.code + '）');
  }
}

// —— ⑤b 加固回归：畸形输入后服务器**仍活着**（形状校验 + 存活探针）——
{
  const serverPath = join(CORE, 'mcp.mjs');
  if (existsSync(serverPath)) {
    const result = await new Promise((resolve) => {
      const child = spawn(process.execPath, [serverPath], { stdio: ['pipe', 'pipe', 'pipe'] });
      let buffer = ''; const responses = [];
      child.stdout.on('data', (d) => {
        buffer += String(d);
        let i;
        while ((i = buffer.indexOf('\n')) >= 0) { const line = buffer.slice(0, i).trim(); buffer = buffer.slice(i + 1); if (line) { try { responses.push(JSON.parse(line)); } catch { /* 忽略 */ } } }
      });
      child.stderr.on('data', () => {});
      const send = (s) => { try { child.stdin.write(s + '\n'); } catch { /* stdin 关闭 */ } };
      send('null'); send('123'); send('"str"'); send('[]'); send('{}'); send('{ bad }');
      setTimeout(() => {
        send(JSON.stringify({ jsonrpc: '2.0', id: 99, method: 'tools/list' }));
        setTimeout(() => {
          const alive = child.exitCode === null;
          const list = responses.find((r) => r.id === 99);
          const errors = responses.filter((r) => r.error).length;
          try { child.kill(); } catch { /* 已退出 */ }
          resolve({ alive, tools: list?.result?.tools?.length ?? 0, errors });
        }, 900);
      }, 700);
    });
    assert.ok(result.errors >= 6, '六种畸形形状都须回 JSON-RPC 错误（实际 ' + result.errors + '）');
    assert.ok(result.alive, '畸形输入后服务器必须仍然存活');
    assert.ok(result.tools > 0, '存活探针：tools/list 仍可用（实际 ' + result.tools + ' 个工具）');
    console.log('加固回归：畸形输入 ' + result.errors + ' 个错误响应；服务器存活；tools/list=' + result.tools);
  }
}

console.log('selftest: all assertions passed');
// MCP 子进程（即使已 kill）可能让事件循环不归零 → 全部用例跑完显式退出（与 akasha-session 自测同口径）。
process.exit(0);
