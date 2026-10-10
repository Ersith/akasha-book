// 阿卡夏之书钩子 v1.2 —— 只记录、不干预。
// 监听五类 emit 事件（全部为 contained 语义，失败不会打断宿主）：
//   session/event（turn/end）· tools/result（全部结果，含工具名与失败原因）
//   agent/error（step / turn 出错）· agent/status（running→idle，去抖）
//   agent/assistant-stream（v1.1：输出审计的数据源——累积文本 → 核心库 auditText → output-audit / usage 线）
// 记录到 append-only JSONL；设计见 research\ai-memory-architecture-20261006.md（§7 后台层雏形）。
import { appendFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

// 默认值：家目录下的 .akasha（可用 config.akashaDir / log 覆盖）。
// ⚠ 2026-10 wave1：不得写成字面量 '~/...'——Node 不展开 `~`（会在 cwd 下建出名为 `~` 的目录）。
const DEFAULT_AKASHA = join(homedir(), '.akasha');
const DEFAULT_LOG = join(DEFAULT_AKASHA, 'logs', 'hooks.jsonl');
const expandHome = (p) => (p === '~' ? homedir() : (p.startsWith('~/') || p.startsWith('~\\')) ? join(homedir(), p.slice(2)) : p);

// B2（wave1）：shell 里经 akasha CLI 的只读查库也算「召回」——只记子命令名（不记命令原文，免泄露）。
// 2026-10-10 人读复查补 `dsh_wsl`：工具目录长了，这个集合没跟上 ⇒ WSL 里的查库不会被计入召回。
const SHELL_TOOLS = new Set(['bash', 'pwsh', 'sh', 'shell', 'dsh_wsl']);
const CLI_RECALL = /akasha\.mjs["']?\s+(lookup|brief|cross|kit|show|summary|mirror\s+match|session\s+lookup|frontier\s+due)\b/i;
/** 工具调用若是 akasha CLI 查库子命令 → 归一名（'lookup' / 'mirror-match' / 'session-lookup' …）；否则 null。 */
export function akashaCliOf(name, args) {
  try {
    if (!SHELL_TOOLS.has(String(name ?? ''))) return null;
    const m = CLI_RECALL.exec(String(args?.command ?? args?.script ?? ''));
    return m ? m[1].toLowerCase().replace(/\s+/g, '-') : null;
  } catch { return null; }
}

export function apply(ctx, config = {}) {
  const logPath = typeof config.log === 'string' && config.log.trim() !== '' ? expandHome(config.log) : DEFAULT_LOG;
  const akashaDir = typeof config.akashaDir === 'string' && config.akashaDir.trim() !== '' ? expandHome(config.akashaDir) : DEFAULT_AKASHA;
  const idleDebounceMs = Number.isInteger(config.idleDebounceMs) && config.idleDebounceMs > 0 ? config.idleDebounceMs : 600000;
  const logToolResults = config.logToolResults !== false;
  const auditOutput = config.auditOutput !== false;

  const require_ = createRequire(import.meta.url);
  const core = () => require_(join(akashaDir, 'lib.mjs'));

  let ready = false;
  try {
    mkdirSync(dirname(logPath), { recursive: true });
    ready = true;
  } catch {
    // 目录建不出来就静默停用；宿主不受影响
  }

  const write = (record) => {
    if (!ready) return;
    try {
      appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n', 'utf8');
    } catch {
      // 审计层自身失败不拖垮宿主：吞掉，下一行再试
    }
  };

  const counters = { tools: 0, toolErrors: 0, turnEnds: 0, agentErrors: 0, audits: 0, usageRefs: 0 };
  let lastIdleLog = 0;

  write({ kind: 'activated', pid: process.pid, log: logPath });

  // 回合结束（durable：session 日志的 turn/end）。
  ctx.on('session/event', (session, event) => {
    try {
      if (!event || event.type !== 'turn/end') return;
      counters.turnEnds += 1;
      write({
        kind: 'turn-end',
        session: String(session?.id ?? ''),
        turn: event.data?.turn ?? null,
        reason: event.data?.reason?.kind ?? null
      });
    } catch { /* 见文件头注释 */ }
  });

  // 工具结果：成功只记名字（供结果计数器），失败附原因。
  ctx.on('tools/result', (exec, result) => {
    try {
      counters.tools += 1;
      const isError = result?.isError === true;
      if (isError) counters.toolErrors += 1;
      if (!logToolResults && !isError) return;
      let message;
      if (isError) {
        message = String(result?.error?.message ?? '').slice(0, 400);
        try { message = core().redact(message); } catch { /* 核心库缺失时仍截断 */ }
      }
      const akashaCli = akashaCliOf(exec?.name, exec?.arguments);
      // wave1.1：会话 id ＝ exec.agent.id（DSH ToolExecution.agent 由 agent loop 设置；Agent.id 的类型就是 SessionId，
      // 与 session/event 的 session.id、agent/error 的 payload.agent.id 同一值）。非 agent loop 发起的调用没有 agent → 不写该字段。
      const sid = typeof exec?.agent?.id === 'string' && exec.agent.id ? exec.agent.id : null;
      write({
        kind: 'tool',
        ...(sid ? { session: sid } : {}),
        tool: exec?.name ?? null,
        ok: !isError,
        message,
        ...(akashaCli ? { akashaCli } : {})
      });
    } catch { /* 见文件头注释 */ }
  });

  // agent 级错误（step / turn 出错）。
  ctx.on('agent/error', (payload) => {
    try {
      counters.agentErrors += 1;
      let message = payload?.error instanceof Error ? payload.error.message : String(payload?.error ?? '');
      message = message.slice(0, 400);
      try { message = core().redact(message); } catch { /* 截断已做 */ }
      write({
        kind: 'agent-error',
        session: String(payload?.agent?.id ?? ''),
        turn: payload?.turn ?? null,
        step: payload?.step ?? null,
        message
      });
    } catch { /* 见文件头注释 */ }
  });

  // 输出审计（v1.1；v1.2 修复累积）：按 attemptId 累积 assistant 文本流，committed 结束时跑核心库 auditText——
  //   引用不存在的库 id → output-audit 线（编造引用嫌疑）；真实 id → usage 线（条目级使用计数 v0）。
  //   ⚠ 2026-10-07 复查：宿主 revision **逐帧递增**（nextRevision() 每 emit 一次）——不得按 revision 重置累积，
  //   否则每 chunk 清空、审计恒空（output-audit/usage 0 条实证）；跨帧切分的 id 必须能还原。
  const streams = new Map();
  ctx.on('agent/assistant-stream', (payload) => {
    try {
      if (!auditOutput) return;
      const frame = payload?.frame;
      if (!frame) return;
      const key = String(frame.attemptId ?? '');
      if (frame.type === 'start') {
        streams.set(key, { text: '' });
        if (streams.size > 30) { const k0 = streams.keys().next().value; streams.delete(k0); }
        return;
      }
      if (frame.type === 'chunk') {
        let st = streams.get(key);
        if (!st) { st = { text: '' }; streams.set(key, st); }
        const c = frame.chunk;
        if (c && c.type === 'text-delta' && typeof c.text === 'string') {
          st.text += c.text;
          if (st.text.length > 400000) st.text = st.text.slice(-400000); // 保尾：长输出的尾部对审计更有信息量
        }
        return;
      }
      if (frame.type === 'end') {
        const st = streams.get(key);
        streams.delete(key);
        const committed = frame.outcome && frame.outcome.kind === 'committed';
        if (!committed || !st || !st.text) return;
        let audit = null;
        try { audit = core().auditText(st.text); } catch { return; }
        const session = String(payload?.agent?.id ?? '');
        const eventType = frame.outcome?.eventType ?? null;
        if (audit.unknownIds.length) {
          counters.audits += 1;
          write({ kind: 'output-audit', session, eventType, unknown: audit.unknownIds.slice(0, 8), tagged: audit.tagged, chars: st.text.length });
        }
        if (audit.ids.length) {
          counters.usageRefs += audit.ids.length;
          write({ kind: 'usage', session, eventType, ids: audit.ids.slice(0, 20) });
        }
      }
    } catch { /* 见文件头注释 */ }
  });

  // 空闲脉冲（running → idle，去抖；附计数器快照）。
  ctx.on('agent/status', (payload) => {
    try {
      if (payload?.status !== 'idle') return;
      const now = Date.now();
      if (now - lastIdleLog < idleDebounceMs) return;
      lastIdleLog = now;
      write({ kind: 'idle', session: String(payload?.agent?.id ?? ''), counters: { ...counters } });
    } catch { /* 见文件头注释 */ }
  });
}
