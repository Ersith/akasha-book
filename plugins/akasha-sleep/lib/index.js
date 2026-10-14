// 阿卡夏之书睡眠器 v1.5.1 —— 调度与注入（蒸馏逻辑归核心库 sleep.mjs）。
//   · 触发：agent/status → idle（去抖 minIntervalHours）+ 定时兜底 ctx.interval（默认 1h）
//   · 蒸馏/复核/待办/报告/水位线：核心库 sleepRun —— 手动 `node akasha.mjs sleep` 与之共用同一水位线
//   · 条子一：systemPrompt.context（akasha:sleep）——每回合带最近一次睡眠摘要
//   · 条子二（唤醒条）：agent/created → agent.inject 起床包摘要（不唤醒、不打断）
//   · 条子三（库脉搏 + 回查，v1.5）：systemPrompt.context（akasha:pulse）——六库计数 + 最近写入；
//     窗口内（默认 30 分钟）有失败时追一行「回查提示」（错误钩子的注入级动作，不拦截）
//   · 条子四（行为层，v1.10；2026-10-13 **按裁定重挂·默认关**）：形态 B（无正文 + 无工具）检测 → 观测线 `idle-shape`；
//     `idleResume:true` 时才自动续行（强信号＝思维链尾部「好。」；冷却 + 限次；文案禁清单/打勾/句号收尾）
//   · 降级：核心库不可用 → sleep-error 观测线 + 条子提示文案，不炸、不失活。
import { appendFileSync, closeSync, mkdirSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

// 注入安全（2026-10-11 立）：坑前提示注入的是**库正文**（canon 的 act 字段）⇒ 属"不可信输入"，
// 须先转义花括号（裸 `{{` 会让宿主插值抛错、该会话永久不可用），并加「库原文·仅参考」标注。
import { safeInject, safeInjectInline } from './prompt-safety.js';

export const inject = ['systemPrompt', 'timer'];

// —— 唤醒条消息构造（模块级导出，便于契约测试与复用）——
// 语义等价于宿主 @deepseek-ai/dsh-llm 的 createUserMessage：
//   createMessage(input) = deepFreeze(structuredClone({ ...input, id: brandString(randomUUID()) }))
// 其中 brandString 是纯编译期类型标记（运行时恒等，见 @deepseek-ai/dsh-brand）。
export const newMessageId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `akasha-${Date.now()}-${Math.random().toString(16).slice(2)}`);
export const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const item of Object.values(value)) deepFreeze(item);
    Object.freeze(value);
  }
  return value;
};
export const createUserMessage = (input) => deepFreeze({ ...structuredClone(input), role: 'user', id: newMessageId() });

// 默认值：家目录下的 .akasha（可用 config 逐项覆盖）。
// 默认值：`AKASHA_DIR` 环境变量 → 家目录下的 .akasha（2026-10-10：一处配置贯通全部路径，
// 对外安装体验——此前用户必须逐项写 log/stateFile/inboxFile/akashaDir，漏一项就落到别处）。
const ENV_AKASHA = typeof process.env.AKASHA_DIR === 'string' && process.env.AKASHA_DIR.trim() !== '' ? process.env.AKASHA_DIR.trim() : null;
const DEFAULT_AKASHA = ENV_AKASHA ? (ENV_AKASHA === '~' ? homedir() : (ENV_AKASHA.startsWith('~/') || ENV_AKASHA.startsWith('~\\') ? join(homedir(), ENV_AKASHA.slice(2)) : ENV_AKASHA)) : join(homedir(), '.akasha');
const DEFAULTS = {
  log: join(DEFAULT_AKASHA, 'logs', 'hooks.jsonl'),
  akashaDir: DEFAULT_AKASHA,
  stateFile: join(DEFAULT_AKASHA, 'logs', 'sleep-state.json'),
  inboxFile: join(DEFAULT_AKASHA, 'logs', 'inbox.jsonl'),
  // 唤醒条：消息由插件**本地构造**（语义同宿主 createUserMessage；不动态加载宿主包——DSH-Store 静态扫描口径）。
  wakeNote: true,
  minIntervalHours: 6,
  timerCheckMs: 3600000,
  contextOrder: 130,
  pulseOrder: 132,
  addressOrder: 133,
  preflightOrder: 135, // C1｜易错点前置
  statefulOrder: 134,  // C3｜断言前把关（order 134 < 135 ⇒ 先渲染，命中时 C1 让位）
  // I-12b 行为层（2026-10-13 重挂；**默认关**——先观测）：判据＝形态 B；冷却 / 限次防扰动循环。
  idleResume: false,
  idleResumeOnWeak: false,
  idleResumeCooldownMs: 300000,
  idleResumeMax: 3,
  idleTailChars: 32
};

/** 唤醒条是否值得推（有内容才说话）：无睡眠记录 / 有待办 / 审计有警告。 */
export function isWakeNoteworthy(k) {
  return !k.sleep || (k.inbox?.totalItems ?? 0) > 0 || (k.review?.findings ?? []).some((f) => f.level === 'warn');
}

/** 组装「唤醒条」文本（纯函数）。 */
export function buildWakeNote(k) {
  const lines = ['【阿卡夏·起床包】'];
  lines.push(`库况：canon ${k.library.canon} / mirror ${k.library.mirror} / orphan ${k.library.orphan} / pricing ${k.library.pricing} / lexicon ${k.library.lexicon} / frontier ${k.library.frontier}`);
  lines.push(k.sleep ? `睡眠：${k.sleep.lastRunAt}（${k.sleep.trigger}）待办 ${k.sleep.todo}` : '睡眠：无记录（等待首个空闲）');
  if ((k.inbox?.totalItems ?? 0) > 0) lines.push(`待办 inbox：${k.inbox.totalItems} 条（akasha_promote 可转正）`);
  const warns = (k.review?.findings ?? []).filter((f) => f.level === 'warn');
  if (warns.length) lines.push(`审计：${warns.map((f) => f.code + '×' + f.count).join('，')}`);
  lines.push('详情：akasha_kit');
  return lines.join('\n');
}

// —— I-12b 行为层：形态 B 判定（纯函数；2026-10-13 **按裁定重挂**）——
// 前史：旧钩子 1.8.x（判据＝「流无正文」）因 **形态 A 误报 + 扰动循环（抢险注入被写进思考链）**
//   被 Master 裁定删除（`canon-idle-hook-removed-20261013`）。本版按机制报告 §⑥ 收窄：
//   **形态 B ＝ 有思考、无正文、无工具调用**（真卡壳）；**形态 A（无正文 + 有工具）＝正常中间步骤，绝不报**。
//   先兆信号：思维链尾部「好。」（强，11× 危险比）/「。」（弱）；干预只在开闸（默认关）且强信号时发生。
export const IDLE_RESUME_TEXT = '【自动续行】请直接继续执行下一步：禁止列清单、禁止打勾、禁止以「。」收尾（想一条做一条）。若确实已无事可做、或需要用户输入，请直接输出正文说明。';
/** 一回合的流信号 → 判定：shape `normal` | `A`（无正文+有工具）| `B`（无正文+无工具）；signal `hao` | `o` | null。 */
export function judgeIdleTurn({ hasText, toolCalls, tail } = {}) {
  const shape = hasText === true ? 'normal' : ((Number(toolCalls) || 0) > 0 ? 'A' : 'B');
  const t = String(tail ?? '');
  const signal = t.endsWith('好。') ? 'hao' : (t.endsWith('。') ? 'o' : null);
  return { shape, signal, stall: shape === 'B' };
}

/** S4（2026-10-13）：尾部窗口读 + 取「最近一条非注入 intent 的 gist」——两个纯函数。
 *  做成**顶层导出**（而不是埋在 apply 里）的唯一理由：自测要拿它们做等价对照；
 *  生产路径（apply 内的 akasha:stateful 状态条）调用的就是这两个导出，不存在「测试一份、生产另一份」。 */
export const TAIL_WINDOW_BYTES = 256 * 1024;
export function tailReadText(file, maxBytes = TAIL_WINDOW_BYTES) {
  const st = statSync(file);
  const start = Math.max(0, st.size - maxBytes);
  const len = st.size - start;
  if (len <= 0) return { text: '', bytes: 0, truncated: false };
  const fd = openSync(file, 'r');
  try {
    const buf = Buffer.allocUnsafe(len);
    const n = readSync(fd, buf, 0, len, start);
    let text = buf.subarray(0, n).toString('utf8');
    if (start > 0) { const nl = text.indexOf('\n'); if (nl === -1) return { text: '', bytes: n, truncated: true }; text = text.slice(nl + 1); }
    return { text, bytes: n, truncated: start > 0 };
  } finally { closeSync(fd); }
}
// N09→Q06（第三/四轮）：`normSid` 归一已弃用——多对一转换无法区分 `session-1` 与 `1` 两个合法 ID；
//   读取走「精确优先 + 单前缀差兜底」（见 latestIntentGist），生产者（session 插件）改存完整原始 ID。

export function latestIntentGist(text, session) {
  // R04/N09/Q06（GPT 二~四轮）：会话意图读取——**精确优先**（原始 id 全等），精确无命中时才接受「单前缀差」变体
  //   （旧数据兼容：历史索引记录曾剥 `session-` 前缀）。**遇歧义不猜测归属**：两个合法 ID（`session-1` 与 `1`）并存时
  //   各走各的精确记录、不互读；unknown 仍返回 null。
  if (session === null) return null;
  const want = session === undefined ? undefined : String(session);
  const lines = String(text ?? '').split('\n');
  const pick = (pred) => {
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      if (!lines[i].includes('"kind":"intent"')) continue;
      let r; try { r = JSON.parse(lines[i]); } catch { continue; }
      if (pred && !pred(r)) continue;
      const g = String(r.gist || '');
      if (!g) continue;
      // 规则化跳过注入段（2026-10-10 生产核对：除 runtime context 外还有 openviking / hindsight 等注入块被记成 intent）
      if (g.startsWith('<') || g.length > 800
        || /Current runtime context|Relevant memory from|Hindsight|openviking-context|阿卡夏·/.test(g)) continue;
      return g;
    }
    return null;
  };
  if (want === undefined) return pick(null);
  const exact = pick((r) => String(r.session ?? '') === want);
  if (exact !== null) return exact;
  const up = 'session-' + want;
  const down = want.startsWith('session-') ? want.slice('session-'.length) : want;
  if (up === want && down === want) return null;
  return pick((r) => { const s = String(r.session ?? ''); return s === up || s === down; });
}

export function apply(ctx, config = {}) {

  // A/B 实验开关（2026-10-10 用户解冻，见 docs/ab-experiment-design.md §6）：
  // abOff=true ⇒ **关闭臂**——本插件不注册任何守卫/注入/工具，只记一行观测；库文件与日志照旧（便于事后复盘）。
  if (config.abOff === true) {
    try { (ctx.logger?.info ?? (() => {}))('sleep: abOff=true（A/B 关闭臂）——本插件不注册任何面'); } catch { /* 静默 */ }
    return;
  }
  const cfg = { ...DEFAULTS, ...config };
  const require_ = createRequire(import.meta.url);
  const reportDir = join(cfg.akashaDir, 'logs');
  const stateFile = cfg.stateFile || join(reportDir, 'sleep-state.json');
  const inboxFile = cfg.inboxFile || join(reportDir, 'inbox.jsonl');

  const log = (record) => {
    try {
      mkdirSync(dirname(cfg.log), { recursive: true });
      appendFileSync(cfg.log, JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n', 'utf8');
    } catch { /* 静默：观测线写不了不拖垮宿主 */ }
  };
  const readState = () => { try { return JSON.parse(readFileSync(stateFile, 'utf8')); } catch { return {}; } };

  // 核心库（蒸馏逻辑）动态加载：插件只做调度与注入；缺文件时降级留痕（不失活）。
  const core = () => require_(join(cfg.akashaDir, 'sleep.mjs'));

  const runSleep = (trigger) => {
    try {
      const r = core().sleepRun({ trigger, log: cfg.log, stateFile, inboxFile, reportDir });
      if (!r.ok) { log({ kind: 'sleep-error', trigger, message: String(r.error).slice(0, 300) }); return false; }
      log({ kind: 'sleep-done', trigger, report: r.reportFile, todo: r.todo, counters: r.state?.lastCounters, audit: r.state?.lastAudit });
      return true;
    } catch (error) {
      log({ kind: 'sleep-error', trigger, message: String(error?.message ?? error).slice(0, 300) });
      return false;
    }
  };

  const maybeSleep = (trigger) => {
    try {
      const verdict = core().shouldSleep(readState(), Date.now(), cfg.minIntervalHours);
      if (!verdict.due) { log({ kind: 'sleep-skip', trigger, sinceHours: verdict.hoursSince }); return; }
      runSleep(trigger);
    } catch (error) {
      log({ kind: 'sleep-error', trigger, message: String(error?.message ?? error).slice(0, 300) });
    }
  };

  // 唤醒条（M6b）：新会话（agent/created）自动把「起床包」摘要递进 next-step inbox（不唤醒、不打断）。
  // 仅当有内容（无睡眠记录 / 有待办 / 审计警告）才说话；子代理与 compact 不打扰；一切异常只留痕。
  // 消息构造用模块级 createUserMessage（见文件头；本地实现、不动态加载宿主包）。
  const llmSkipNote = cfg.wakeNote === false ? 'wakeNote=false：唤醒条注入跳过（其余功能不受影响）' : null;

  const injectWakeNote = (agent) => {
    try {
      if (!agent || typeof agent.inject !== 'function' || !createUserMessage) return;
      const k = require_(join(cfg.akashaDir, 'lib.mjs')).kit();
      if (!isWakeNoteworthy(k)) return;
      const message = createUserMessage({
        content: [{ type: 'text', text: safeInject(buildWakeNote(k)) }],   // #14 保守包裹：唤醒条内含 kit（库内容：待办/审计/脉搏）；agent.inject 是否也走插值**未验证** ⇒ 包上无害 ✓（2026-10-11 手检）
        source: { kind: 'akasha-wake' }
      });
      agent.inject(message);
      log({ kind: 'wake-note', session: String(agent.id ?? ''), todo: k.inbox?.totalItems ?? 0, auditOk: k.review?.ok ?? null });
    } catch (error) {
      log({ kind: 'wake-note-error', message: String(error?.message ?? error).slice(0, 200) });
    }
  };

  ctx.on('agent/created', (payload) => {
    try {
      // 2026-10-07 复查：官方 agent/created 的 source 只有 startup/resume；子代理守卫沿用 header.origin / delegationDepth。
      const agent = payload?.agent;
      const header = agent?.session?.header;
      if (header?.origin === 'subagent' || (header?.delegationDepth ?? 0) > 0) return;
      if (cfg.wakeNote === false) return;
      injectWakeNote(agent);
    } catch (error) {
      log({ kind: 'wake-note-error', message: String(error?.message ?? error).slice(0, 200) });
    }
  });

  // —— I-12b 行为层（2026-10-13 深夜 · **按 Master 裁定「重挂（默认关）」重挂**）——
  // 前史：同位置旧钩子（判据＝「流无正文」）因 **形态 A 误报 + 扰动循环** 被裁定删除（canon-idle-hook-removed-20261013）。
  // **物证（2026-10-13 复查）**：旧实现包 `local-akasha-sleep-1.8.1-h1.tgz` 仍在——其链路＝「**流 end 帧**判定 →
  //   `agent.inject(createUserMessage{source.kind:'akasha-resume'})`」，三级降级全部实测拉回成功（canon-idle-resume-verified-20261013）。
  //   ⇒ 本版**沿用该有效链路**（判定点＝attempt `end` 帧、注入 API ＝ agent.inject），**只换判据与护栏**：
  // ① 判据收窄至**形态 B**（该 attempt：无正文 + 无工具调用；A 形态＝正常中间步骤，绝不报，只落观测线）
  //    + 强信号＝思维链尾部「好。」；
  // ② 干预**默认关**（`idleResume:true` 才开；观测线 `idle-shape` 无论开关都落——先观测）；
  // ③ 防扰动循环：冷却 idleResumeCooldownMs + 单会话限次 idleResumeMax + 文案禁清单/打勾/句号收尾（机制报告 §⑥）。
  // 证据链：canon-idle-mechanism-20261013-r1 · research/lora-cot-degradation-investigation-20261013.md
  const idleAttempts = new Map();   // attemptId -> { sid, text, tools, tail }（按 attempt 收，end 帧判完即删）
  const idleGate = new Map();       // sid -> { count, lastAt }
  const idleTailChars = Number.isInteger(cfg.idleTailChars) && cfg.idleTailChars > 0 ? cfg.idleTailChars : 32;
  const isSubagentAgent = (agent) => {
    const h = agent?.session?.header;
    return h?.origin === 'subagent' || (h?.delegationDepth ?? 0) > 0;
  };
  const idleEvaluate = (agent, a, meta = {}) => {
    const sid = String(agent?.session?.id ?? agent?.id ?? '');
    if (!sid || isSubagentAgent(agent)) return;
    const j = judgeIdleTurn({ hasText: a.text, toolCalls: a.tools, tail: a.tail });
    if (j.shape !== 'normal') log({ kind: 'idle-shape', session: sid, shape: j.shape, signal: j.signal, tools: a.tools, turn: meta.turn ?? null, step: meta.step ?? null });
    const strong = j.signal === 'hao' || (cfg.idleResumeOnWeak === true && j.signal === 'o');
    const gate = idleGate.get(sid) ?? { count: 0, lastAt: 0 };
    const now = Date.now();
    const eligible = j.stall && strong
      && gate.count < (Number.isInteger(cfg.idleResumeMax) ? cfg.idleResumeMax : 3)
      && (now - gate.lastAt) >= (Number.isFinite(cfg.idleResumeCooldownMs) ? cfg.idleResumeCooldownMs : 0);
    if (cfg.idleResume === true && eligible && typeof agent?.inject === 'function') {
      agent.inject(createUserMessage({ content: [{ type: 'text', text: IDLE_RESUME_TEXT }], source: { kind: 'akasha-idle-resume' } }));
      idleGate.set(sid, { count: gate.count + 1, lastAt: now });
      log({ kind: 'idle-resume', session: sid, turn: meta.turn ?? null, step: meta.step ?? null, count: gate.count + 1, signal: j.signal });
    }
  };
  ctx.on('agent/assistant-stream', (payload) => {
    try {
      const agent = payload?.agent;
      const frame = payload?.frame;
      const frameType = String(frame?.type ?? '');
      const attemptId = String(frame?.attemptId ?? '');
      if (!frameType) return;
      if (frameType === 'start') {
        idleAttempts.set(attemptId || String(idleAttempts.size), { sid: String(agent?.session?.id ?? agent?.id ?? ''), text: false, tools: 0, tail: '' });
        if (idleAttempts.size > 30) idleAttempts.delete(idleAttempts.keys().next().value);   // 保新：只留最近 30 条流
        return;
      }
      if (frameType === 'end') {
        const key = attemptId || '';
        const a = idleAttempts.get(key);
        idleAttempts.delete(key);
        if (!a) return;
        idleEvaluate(agent, a, { turn: frame?.turn ?? null, step: frame?.step ?? null });
        return;
      }
      if (frameType !== 'chunk') return;
      const c = frame?.chunk;
      if (!c || typeof c.type !== 'string') return;
      const key = attemptId || 'anon';
      let a = idleAttempts.get(key);
      if (!a) { a = { sid: String(agent?.session?.id ?? agent?.id ?? ''), text: false, tools: 0, tail: '' }; idleAttempts.set(key, a); }
      if (c.type === 'text-delta') a.text = true;
      else if (c.type === 'tool-call-delta') a.tools += 1;
      else if (c.type === 'reasoning-delta') a.tail = (a.tail + String(c.text ?? '')).slice(-idleTailChars);
    } catch { /* 观测不拖垮宿主 */ }
  });

  // 条子：每个新回合的 runtime context 自动带上最近一次睡眠摘要（渲染自核心库，失败安全）。
  ctx.systemPrompt.context({
    name: 'akasha:sleep',
    order: cfg.contextOrder,
    text: (context) => {
      retarget(renderSidOf(context));
      try { return core().renderContextLine(readState()); }
      catch { return '阿卡夏·睡眠：核心库不可用（akasha\\sleep.mjs 缺失或损坏）。'; }
    }
  });

  // 回查提示（v1.5，错误钩子的注入级动作）：进程内记录近期失败（工具 / agent），窗口内幂等渲染。

  // 触发词路由（2026-10-11 解冻后新增）：**最近的用户消息文本** + 已触发过的条目（去重）。
  // ⚠ 只存内存、只在进程内、不落盘；超 TTL 视为过期（避免拿很久以前的任务文本乱触发）。
  const USER_TEXT_TTL = 10 * 60 * 1000;
  /** 从 session/event 的 user/message 事件里**防御式**取正文（载荷形状随宿主版本可能不同）。 */
  const textOfUserEvent = (p) => {
    try {
      const d = p?.data ?? p ?? {};
      const cand = [d?.text, d?.content, d?.message?.text, d?.message?.content,
        d?.parts, d?.message?.parts, d?.message];
      for (const c of cand) {
        if (typeof c === 'string' && c.trim()) return c.trim();
        if (Array.isArray(c)) {
          const s = c.map((x) => (typeof x === 'string' ? x : (x && typeof x.text === 'string' ? x.text : ''))).join(' ').trim();
          if (s) return s;
        }
      }
    } catch { /* 取不到就当作没消息 */ }
    return '';
  };
  // ── F09/F10（2026-10-14 外部审查 · GPT）：**会话状态按 session 分桶** ─────────────────────────────
  //   原实现把 观测计数（轮/压缩）/失败列表/首用集合/触发去重/去抖状态 全放进程级 ⇒ 换会话后新会话继承旧会话的
  //   「已压缩 N 次」「上次失败是 edit」等状态（上下文污染 + 抑制当前提醒）。现在全部进**会话桶**：
  //   事件先 retarget(sidOf(payload)) 切桶，渲染面取当前桶；会话 id 缺失时归 '(unknown)' 桶（最多 8 桶 LRU）。
  //   F10 同批：C3 的「已触发」从**永久布尔**改为**当轮标记**（c3Turn）——不再是「一次触发压制到重载」。
  const sessionStates = new Map();
  let curSid = '(unknown)';
  const sidOf = (p) => {
    try {
      const a = p?.agent ?? p?.data?.agent;
      const s = (typeof p === 'string' ? p : null) ?? p?.id ?? a?.session?.id ?? a?.id ?? p?.session?.id ?? p?.session ?? p?.data?.session ?? p?.sessionId;
      return s === undefined || s === null || s === '' ? null : String(s);
    } catch { return null; }
  };
  const freshState = () => ({
    obs: { turn: 0, steps: 0, compactions: 0, usedToolsN: 0, lastRecallTurn: null, lastCompactionTurn: null },
    recentFailures: [], usedTools: new Set(), announcedTraps: new Set(),
    lastUserText: { text: '', at: 0 }, firedTriggers: new Map(), broughtUp: { at: 0, id: null },
    gateState: { c3Cat: null, c3At: 0, c3Turn: -1 }, preflight: { tool: null, at: 0 },
  });
  const S = () => {
    if (!sessionStates.has(curSid)) sessionStates.set(curSid, freshState());
    const s = sessionStates.get(curSid);
    sessionStates.delete(curSid); sessionStates.set(curSid, s);
    while (sessionStates.size > 8) sessionStates.delete(sessionStates.keys().next().value);
    return s;
  };
  // R04：**无 sid 不继承**——缺身份的输入归 `(unknown)` 桶，绝不沿用上一会话（来源不明 ⇒ 不碰敏感提醒）。
  const retarget = (sid) => { curSid = sid ? String(sid) : '(unknown)'; };
  const renderSidOf = (context) => sidOf(context?.agent ?? context?.session ?? context);
  // Q06：normSid 归一弃用（见 latestIntentGist 的精确优先实现；生产者改存完整 ID）。
  const noteFailure = (tool) => {
    try {
      S().recentFailures.push({ ts: Date.now(), tool: String(tool ?? '?') });
      if (S().recentFailures.length > 20) S().recentFailures.splice(0, S().recentFailures.length - 20);
    } catch { /* 静默 */ }
  };
  // 极限观测（2026-10-11 用户令）：把「该查库了」变成**可见信号**，不靠记性——针对"200 轮后忘记查库"的观察。
  const clip = (s) => (s.length <= 80 ? s : s.slice(0, 79) + '…');   // 行宽硬约束的统一裁剪（模块级，供多行共用）
  const isRecallTool = (name) => /^mcp__akasha__/.test(String(name || ''));
  ctx.on('tools/result', (exec, result) => {
    retarget(sidOf(exec));
    const tool = String(exec?.name ?? '?');
    S().usedTools.add(tool);                                          // 首用预告用（2026-10-11）
    S().obs.usedToolsN = S().usedTools.size;
    if (isRecallTool(tool)) S().obs.lastRecallTurn = S().obs.turn;         // MCP 召回 ⇒ 刷新"距上次查库"
    else {
      // CLI 查库也算召回（2026-10-11 实测：本会话大量查库走 `node akasha.mjs …`，只认 MCP 会显示"尚未查库"＝自欺）
      try {
        // N11（GPT 第三轮）：宿主 ToolExecution 的执行参数在 **exec.arguments**（dsh-tools 契约）；args/input/params
        //   只作旧夹具兼容——前者优先，避免「真实 CLI 查库后仍显示未查库」。
        const blob = JSON.stringify(exec?.arguments ?? exec?.args ?? exec?.input ?? exec?.params ?? '');
        if (/akasha\.mjs|session\.mjs|mcp\.mjs/.test(blob)) S().obs.lastRecallTurn = S().obs.turn;
      } catch { /* 忽略 */ }
    }
    if (result?.isError === true) noteFailure(exec?.name);
  });
  ctx.on('agent/error', (p) => { retarget(sidOf(p)); noteFailure('agent'); });
  // 轮次与压缩真值：能拿到就用真值，拿不到就保持 0（宁缺勿假）
  try { ctx.on('agent/turn-stopping', (p) => { retarget(sidOf(p)); if (p && typeof p.turn === 'number') S().obs.turn = p.turn; }); } catch { /* 事件不存在 */ }
  try { ctx.on('agent/turn-end', (p) => { retarget(sidOf(p)); if (p && typeof p.turn === 'number') S().obs.turn = Math.max(S().obs.turn, p.turn); }); } catch { /* 事件不存在 */ }
  try {
    ctx.on('session/event', (sessOrP, maybeEvent) => {
      // R05（GPT 复核二轮）：宿主实际按 **(session, event)** 发布（dsh-session：callbackArgs=[session,event]）；
      //   兼容旧单参夹具：event 缺省时退化。身份取 session.id；内容取 event（type/data）。
      const sess = maybeEvent !== undefined ? sessOrP : null;
      const p = maybeEvent !== undefined ? maybeEvent : sessOrP;
      retarget(sidOf(sess) ?? sidOf(p));
      const t = String(p?.type ?? p?.name ?? p?.eventType ?? '');
      // R04/R05：回合真值也接 **turn/start**（取消/异常回合不更新 turn-stopping ⇒ C3 当轮标记须靠 start 失效）。
      if (t === 'turn/start') { const tn = Number(p?.data?.turn ?? p?.turn); if (Number.isFinite(tn)) S().obs.turn = Math.max(S().obs.turn, tn); }
      if (t.startsWith('compaction/end') || (t === 'compaction' && p?.phase === 'end')) {
        // N10（GPT 第三轮）：**失败压缩不计成功**——宿主失败路径同样发 end（data.error 非空）⇒ 此前把失败算成
        //   「已压缩 N 次」并触发多余补查。成功才计数与更新脆弱窗；失败另计（观测用，不触发提醒）。
        const failed = !!(p?.data && p.data.error) || !!p?.error;
        if (failed) S().obs.compactionFailed = (S().obs.compactionFailed || 0) + 1;
        else {
          S().obs.compactions++;
          S().obs.lastCompactionTurn = S().obs.turn;      // 脆弱窗判据（压缩补偿行用）
        }
      }
      // 触发词路由（2026-10-11 解冻后新增，外部对照启发：灵枢的「触发词路由」）：
      //   捕获**最近的用户消息文本**，供注入面（system-prompt/assemble 时求值的函数）做触发词匹配——
      //   宿主注入面拿不到当前用户消息，故按灵枢的两步式：**事件里记录、组装时注入**。
      //   ⚠ 只存一行文本 + 时间戳（内存、不出进程、不落盘）；超时即视为过期。
      if (t === 'user/message') {
        const s = textOfUserEvent(p);
        if (s) { S().lastUserText.text = s.slice(0, 4000); S().lastUserText.at = Date.now(); }
      }
    });
  } catch { /* 事件不存在 */ }

  // 库脉搏（v1.3；v1.5 起附加回查行）：写→可见通道——并行会话 / 脚本写入库后，下一回合即可见并命名新内容。
  ctx.systemPrompt.context({
    name: 'akasha:pulse',
    order: cfg.pulseOrder,
    text: (context) => {
      retarget(renderSidOf(context));
      try {
        const lib = require_(join(cfg.akashaDir, 'lib.mjs'));
        const lines = [core().renderPulseLine(lib.pulse())];
        const recall = core().renderRecallLine(S().recentFailures, Date.now());
        if (recall) lines.push(recall);
        return lines.filter(Boolean).join('\n') || null;
      } catch { return null; }
    }
  });

  // 称呼行（2026-10-10 用户复盘「长会话中期称呼易漂移」）：
  // 规则躺在会话开头那坨注入（akasha:self）里，**执行时看不到** ⇒ 必然漂移。
  // 修法＝接进每回合必然经过的执行点：这条 runtime context 行每回合都出现，内容渲染自
  // canon 的称呼体系当前版本（降级为内置短句），并写明执行点要求（交付/验收/复盘的开口句）。
  ctx.systemPrompt.context({
    name: 'akasha:address',
    order: cfg.addressOrder,
    text: (context) => {
      retarget(renderSidOf(context));
      try {
        const lib = require_(join(cfg.akashaDir, 'lib.mjs'));
        const recs = lib.currentRecords(lib.loadStore('canon').records);
        const hit = recs.filter((r) => String(r.id).startsWith('canon-address-layers')).pop();
        if (hit && typeof hit.claim === 'string') return safeInject(core().renderAddressLine(hit.claim));   // #14：canon claim 是库原文 ⇒ 必须包裹
      } catch { /* 读库失败 → 兜底短句 */ }
      return safeInject(core().renderAddressLine(''));
    }
  });

  // C3｜断言前把关（stateful-fact gate，2026-10-10；评审 v2 定稿＝触发改到提问侧）
  // 为什么改触发：context 行在回合开始渲染、回复尚未产生；且本插件看不到用户消息事件 ⇒
  //   取**会话层最近一条 intent 段**（跳过注入样式的段）做 6 类关键词判定。
  // 只提醒不阻断；statefulGate:false ⇒ 提示与事件双停。
  // 2026-10-13（举一反三 S4）：取 intent 的读法从「整读 session.jsonl 再 slice(-200)」改为**尾部窗口读**
  //   ——该文件已 21 MB 且每回合都在长，原先每次渲染都整文件进内存（实测 57 ms / 19 MB 读入）。
  //   窗口 = 尾部 256 KB；起点切在行中时丢掉半行；从尾向前逐条找非注入 intent。
  //   与旧口径的关系（如实）：旧口径按 **200 行** 切——记录变长时会漏掉仍在窗口内的 intent；
  //   新口径按**字节**切，不受单行大小影响（更大记录下更稳，属**语义改进**而非纯等价）。
  //   两个纯函数（tailReadText / latestIntentGist）移到模块顶层导出，供自测做等价对照。
  // 去抖状态（同类 30 分钟内只提醒一次；见下方 c3Cat 判定）
  if (cfg.statefulGate !== false) {
    const STATEFUL = [
      { cat: "发布", re: /已发布|未发布|上架|没过审|已过审|待审/ },
      { cat: "安装", re: /已安装|未安装|装好了|装上了/ },
      { cat: "版本", re: /版本|version/i },
      { cat: "开关/运行", re: /开关|启用|禁用|默认开|默认关|开着|关着|在跑|跑着|还在吗|开着吗|装着吗|有没有开/ },
      { cat: "存在", re: /是否存在|有没有|在不在|还在吗/ },
    ];
    ctx.systemPrompt.context({
      name: "akasha:stateful",
      order: cfg.statefulOrder,
      text: (context) => {
        retarget(renderSidOf(context));
        try {
          const path = join(cfg.akashaDir, "data", "session.jsonl");
          let gist = null;
          try { gist = latestIntentGist(tailReadText(path).text, curSid === '(unknown)' ? null : curSid); } catch { /* 文件缺失/半行等 → 走 null */ }
          if (!gist) return null;
          const hit = STATEFUL.find((k) => k.re.test(gist));
          if (!hit) return null;
          const now = Date.now();
          if (S().gateState.c3Cat === hit.cat && now - S().gateState.c3At < 30 * 60 * 1000) return null;  // 同类 30 分钟去重
          S().gateState.c3Cat = hit.cat; S().gateState.c3At = now; S().gateState.c3Turn = S().obs.turn;   // F10：当轮标记（非永久布尔）
          try {
            appendFileSync(join(cfg.akashaDir, "logs", "hooks.jsonl"),
              JSON.stringify({ ts: new Date().toISOString(), kind: "stateful-reminder", cat: hit.cat }) + "\n", "utf8");
          } catch { /* 事件失败不影响提示 */ }
          return "[断言提醒] 状态性事实——先查再答（例：versions + dist-tags 两处核对）";
        } catch { return null; }
      }
    });
  }

  // C1｜易错点前置（pre-flight hint，2026-10-10 解冻后实现；评审 v2 定稿）
  // 依据：可预防漏召率 91.2%（回合级）、会话级 100% ⇒ 缺的不是知识，是"动作前把库拉进来"。
  // 形态：一行 ≤80 字，只提示不阻断；关（preflightHints:false）则**提示与事件双停**（不写假触发）。
  // 近似说明（如实）：context 行在**回合开始**渲染，此刻还不知道本回合会调用什么工具，
  //   故用"最近失败的工具"作为**预提示**（近 30 分钟窗口 + 同工具去重）；"本回合尚未查库"这一前置
  //   在渲染时无法判定，改为"上一个回合没有查库动作时更倾向提示"的弱化版（v1 取"总是可提示"，由去重与上限约束）。
  if (cfg.preflightHints !== false) {
    ctx.systemPrompt.context({
      name: 'akasha:preflight',
      order: cfg.preflightOrder,
      text: (context) => {
        retarget(renderSidOf(context));
        try {
          if (S().gateState.c3Turn === S().obs.turn) return null;   // F10：仅同轮让位   // C3 优先（同回合只出一条）
          const lib = require_(join(cfg.akashaDir, 'lib.mjs'));
          const now = Date.now();
          const WINDOW = 30 * 60 * 1000;
          const recent = (S().recentFailures || []).filter((f) => now - Number(f.ts ?? f.at) <= WINDOW);  // 字段是 ts（见 noteFailure）
          const map = lib.RECALL_TRAP_MAP || {};
          // 2026-10-11 修复（用户裁定：反射要能随工程知识纠错与优化）：
          //   **反射文本随条目走** —— 不再只认写死的表。
          //   ① 链感知解析（id 或 id-rN 取链尾）；② 条目缺失/已退役 ⇒ **不打**（fail closed，不执行过期反射）；
          //   ③ 优先用条目自带 `hint`（≤80 字反射文本：**改条目＝改反射**）；④ `hint_until` 过期 ⇒ 跳过；
          //   ⑤ 内置表降级为**过渡兜底**；⑥ 都取不到 ⇒ 不打（宁缺勿滥）。
          // 该表仅作过渡：条目补上 hint 后即成为唯一来源。
          const FALLBACK_ACTIONS = {
            'canon-trap-edit-context-mismatch': '先 read 原文再改、改完复核',
            'canon-trap-read-offset-range': '先用 grep 拿真实行号再读',
            'canon-trap-grep-exit2-path': '换浅范围/排除 node_modules 再 grep',
            'canon-trap-unknown-tool-name': '只从本会话可见工具面选名字',
            'canon-trap-provider-method-list': '先列方法清单再调用',
          };
          let canonRecs = [];
          try { canonRecs = lib.currentRecords(lib.loadStore('canon').records); } catch { /* 读不到 ⇒ 只走兜底 */ }
          const resolveEntry = (cid) => canonRecs.filter((r) => String(r.id) === cid || String(r.id).startsWith(cid + '-r')).pop() || null;
          const isRetired = (rec) => !!rec && (/已退役|retired/i.test(String(rec.claim ?? '')) || String(rec.id).endsWith('-retired'));
          const today = new Date().toISOString().slice(0, 10);
          /** 某工具的首选反射：条目 `hint` 优先 → 兜底表；退役/过期/缺失一律跳过；取不到返回 null（fail closed）。
           *  ⚠ 口径：**库可读时，条目是唯一来源**——该条目没有 hint 也**不**回落兜底（否则"退役/过期"会被兜底表救活，
           *  等于过期反射照打）。兜底表只在**库读不到**时生效。 */
          const hintForTool = (tool) => {
            const ids = map[tool];
            if (!ids || !ids.length) return null;
            for (const cand of ids) {
              if (canonRecs.length) {
                const rec = resolveEntry(cand);
                if (!rec) continue;                                       // 链上已无此条 ⇒ 跳过
                if (isRetired(rec)) continue;                              // 已退役 ⇒ 不执行过期反射
                if (rec.hint_until && String(rec.hint_until) < today) continue;  // 反射有效期已过 ⇒ 跳过
                if (typeof rec.hint === 'string' && rec.hint.trim()) return { id: cand, act: rec.hint.trim(), hintSource: 'entry' };
                continue;                                                  // 有条目但无 hint ⇒ 该候选作罢，不回落
              }
              if (FALLBACK_ACTIONS[cand]) return { id: cand, act: FALLBACK_ACTIONS[cand], hintSource: 'fallback' };
            }
            return null;
          };
          const emitPreflight = (payload) => {
            try {                                                        // 事件：关闭时走不到这里（双停）
              appendFileSync(join(cfg.akashaDir, 'logs', 'hooks.jsonl'),
                JSON.stringify({ ts: new Date().toISOString(), kind: 'preflight', ...payload }) + '\n', 'utf8');
            } catch { /* 事件失败不影响提示 */ }
          };
          const trim80 = (s) => (s.length <= 80 ? s : s.slice(0, 79) + '…');

          // ① 失败驱动（原逻辑）：近 30 分钟内有过失败 ⇒ 给"那件工具"的反射
          if (recent.length) {
            const tool = String(recent[recent.length - 1].tool || '');
            const fresh = !(S().preflight.tool === tool && now - S().preflight.at < WINDOW);  // 同工具 30 分钟去重
            if (fresh && map[tool]) {
              const h = hintForTool(tool);
              if (h) {
                S().preflight.tool = tool; S().preflight.at = now;
                emitPreflight({ tool, entry: h.id, hintSource: h.hintSource, mode: 'failure' });
                return trim80('[坑前提示] ' + tool + ' 前：' + safeInjectInline(h.act) + ' —— 条目 ' + h.id);
              }
            }
          }

          // 条件事实（供条目 `when` 判定；#9 条件谓词化的落地）：只含**可判定**的现场事实。
          const condCtx = {
            turn: S().obs.turn,
            date: today,
            usedTools: [...S().usedTools],
            failedRecently: recent.length > 0,
          };
          // 条目 `when` 闸（可选）：不满足就不打（把"不适用条件"变成可判定的谓词，而不是靠人记）。
          const whenOk = (rec) => {
            if (!rec || rec.when === undefined || rec.when === null) return true;
            try { return lib.evalCondition(rec.when, condCtx); }
            catch (e) { emitPreflight({ entry: String(rec.id), mode: 'when-invalid', error: String(e?.message ?? e).slice(0, 120) }); return false; }  // 非法条件⇒不打（fail closed）
          };

          // ①b 触发词路由（2026-10-11 解冻后新增；外部对照启发＝灵枢的「触发词路由」）：
          //     与①/②都不同——它**不依赖历史失败、也不依赖工具名**，而是按**当前任务文本**命中条目自带的
          //     `triggers` ⇒ 在**动手前**把库拉进来。这正是台账诊断的那句「规则躺在库里、执行点没有接线」的解药。
          //     字段与 hint 同构：`hint`（≤80 字反射）+ `triggers`（触发词数组）；退役 / `hint_until` 过期 / 无 hint 一律不打。
          //     去重：同条目 30 分钟一次（与①同窗）；条数上限：每回合最多一条（本函数只 return 一条）。
          if (cfg.triggerRouting !== false) {
            const txt = (S().lastUserText.text && now - S().lastUserText.at <= USER_TEXT_TTL) ? S().lastUserText.text : '';
            if (txt) {
              const matched = (rec) => {
                const trs = Array.isArray(rec.triggers) ? rec.triggers : [];
                return trs.find((t) => { const s = String(t).trim(); return s && txt.includes(s); }) ?? null;
              };
              const hit = canonRecs.find((r) => {
                if (isRetired(r)) return false;
                if (r.hint_until && String(r.hint_until) < today) return false;
                if (typeof r.hint !== 'string' || !r.hint.trim()) return false;
                if (!whenOk(r)) return false;          // #9：条目 `when` 不满足 ⇒ 不打
                return matched(r) !== null;
              });
              if (hit) {
                const key = String(hit.id);
                if (now - (S().firedTriggers.get(key) ?? 0) >= WINDOW) {
                  const tr = matched(hit);
                  S().firedTriggers.set(key, now);
                  emitPreflight({ entry: key, trigger: tr, hintSource: 'entry', mode: 'trigger' });
                  return trim80('[触发] ' + tr + ' ⇒ ' + safeInjectInline(String(hit.hint).trim()) + ' —— 条目 ' + key);
                }
              }
            }
          }

          // ①c「自动端上来」（2026-10-11；补截图里点名的第二个缺口"只做到提示我去查"）：
          //     与①b 的差别：①b 靠**条目自带触发词**（人写好才命中）；①c 是在**触发词没命中时**退化为
          //     **一次轻量词法召回** —— 按当前任务把最相关的一条**直接端上来**，而不是提示"你去查"。
          //     纪律：上限 1 条 · 阈值 ≥2 分（防误端）· 同一条消息只算一次 · 与①b 互斥 · 可关（autoBringUp）· 失败静默。
          if (cfg.autoBringUp !== false) {
            const txt = (S().lastUserText.text && now - S().lastUserText.at <= USER_TEXT_TTL) ? S().lastUserText.text : '';
            if (txt && S().broughtUp.at !== S().lastUserText.at) {
              try {
                // 分词修正（2026-10-11 实测）：`tokenize` 把中文长句当成**一个 token** ⇒ 每条最多拿 0.9 的中文回退分
                // ⇒ 阈值 2 永远够不到（146 条并列 0.90，等于"要么全端、要么都不端"）。故此处**额外做 bigram 展开**
                // （只对 CJK 连续串）；**不改全局 tokenize**，避免污染既有检索口径。实测后 top 得分 26.9/21.9/20.9，区分度良好。
                const base = lib.tokenize(txt);
                const bi = [];
                for (const t of base) {
                  if (!/\u4e00-\u9fff/.test(t)) continue;
                  const s = t.replace(/[^\u4e00-\u9fff]/g, '');
                  for (let i = 0; i + 1 < s.length; i += 1) bi.push(s.slice(i, i + 2));
                }
                const toks = [...base, ...bi].slice(0, 24);
                let best = null;
                if (toks.length) {
                  for (const r of canonRecs) {
                    if (isRetired(r)) continue;
                    const claim = String(r.claim ?? '').slice(0, 2000);
                    if (!claim) continue;
                    const hay = (String(r.id) + ' ' + claim + ' ' + (Array.isArray(r.tags) ? r.tags.join(' ') : '')).toLowerCase();
                    let score = 0;
                    for (const tk of toks) score += lib.matchScore(hay, tk);
                    if (!best || score > best.score) best = { score, rec: r };
                  }
                }
                // 接受判据（2026-10-11 实测标定）：**归一 ≥1.0 且 绝对分 ≥8** 双条件。
                //   切题样本：归一 1.59/1.68/3.45（分 15.9/26.9/51.8）⇒ 全端；
                //   不切题样本：归一 0.82/0.45/0.29（分 4.9/4.9/2.0）⇒ 全不端 ⇒ 完美分离。
                const norm = best ? best.score / toks.length : 0;
                const accept = !!best && best.score >= 8 && norm >= 1.0;
                S().broughtUp.at = S().lastUserText.at;
                S().broughtUp.id = accept ? String(best.rec.id) : null;
                if (accept && whenOk(best.rec)) {
                  emitPreflight({ entry: String(best.rec.id), score: best.score, norm: Number(norm.toFixed(2)), mode: 'bring-up' });
                  return trim80('[端上来] ' + safeInjectInline(String(best.rec.claim).slice(0, 44)) + ' —— ' + String(best.rec.id).slice(0, 26));
                }
              } catch { /* 静默：端不上来不影响回合 */ }
            }
          }

          // ② 首用预告（2026-10-11 新增；补"漏召"的结构缺口）：
          //    渲染时**不知道本回合会用什么工具**，但知道**本会话还没用过哪些** ⇒ 逐个把"未用过的陷阱工具"预告一遍，
          //    每个工具只预告一次（用过即止）= 把"事后回查"提前成"动手前预检"，不依赖历史失败。
          if (cfg.preflightFirstUse !== false) {
            const nextTool = Object.keys(map).find((t) => !S().usedTools.has(t) && !S().announcedTraps.has(t));
            if (nextTool) {
              const h = hintForTool(nextTool);
              if (h) {
                S().announcedTraps.add(nextTool);
                emitPreflight({ tool: nextTool, entry: h.id, hintSource: h.hintSource, mode: 'first-use' });
                return trim80('[坑前提示·首用] ' + nextTool + ' 还没用过：' + safeInjectInline(h.act) + ' —— 条目 ' + h.id);
              }
            }
          }
          return null;
        } catch { return null; }
      }
    });
  }

  // 极限观测行（2026-10-11，用户令）：轮次维度的机械钩子——把「该查库了」变成可见信号，不靠记性。
  //   只在知道轮次时渲染（拿不到真值就保持静默，不伪造）。硬约束同 C1：**一行、≤80 字**。
  if (cfg.extremeObs !== false) {
    ctx.systemPrompt.context({
      name: 'akasha:extreme',
      order: (cfg.pulseOrder ?? 132) + 2,
      text: (context) => {
        retarget(renderSidOf(context));
        try {
          if (!S().obs.turn) return null;
          const gap = S().obs.lastRecallTurn === null ? '(本进程尚未查库)' : '距今 ' + Math.max(0, S().obs.turn - S().obs.lastRecallTurn) + ' 轮';
          // 口径标注（2026-10-11）：轮次/压缩/查库均为**本进程**统计——重启即归零；不标会被读成"整场会话"
          const line = '[极限观测·本进程] 轮=' + S().obs.turn + ' 压缩=' + S().obs.compactions + ' 上次查库=' + gap;
          return line.length <= 80 ? line : line.slice(0, 79) + '…';
        } catch { return null; }
      }
    });
  }

  // 压缩补偿行（2026-10-11 用户方向："针对压缩轮次增加，逐步强行增加使用库查记忆进行补全"）。
  //   依据（当晚实测）：① 压缩摘要只保话题、**丢约定**——四条核心约定存活率 0–21%，而**每回合注入的称呼层 100% 存活**；
  //   ② 「丢记忆」实例（turn 220）落在**压缩后 15 轮内**（压缩在 205）。
  //   ⇒ 分级补偿：**脆弱窗**（距上次压缩 ≤15 轮）要求"重要结论先落库"；**压缩 ≥3** 且本回合尚未查库 ⇒ 要求先查；
  //   **压缩 ≥5** ⇒ 升级为强制；**查过即不再催**（闭环，避免噪音）。
  const RECALL_WINDOW = 15;
  if (cfg.compensate !== false) {
    ctx.systemPrompt.context({
      name: 'akasha:compensate',
      order: (cfg.pulseOrder ?? 132) + 3,
      text: (context) => {
        retarget(renderSidOf(context));
        try {
          if (!S().obs.turn || !S().obs.compactions) return null;                  // 没压缩过 ⇒ 不打扰
          const sinceComp = S().obs.lastCompactionTurn === null ? null : Math.max(0, S().obs.turn - S().obs.lastCompactionTurn);
          const recalledRecently = S().obs.lastRecallTurn !== null && (S().obs.turn - S().obs.lastRecallTurn) <= 2;
          const inWindow = sinceComp !== null && sinceComp <= RECALL_WINDOW;
          if (S().obs.compactions >= 5 && !recalledRecently) {
            return clip('[压缩补偿·强制] 本会话已压缩 ' + S().obs.compactions + ' 次：关键动作前先 akasha_lookup/brief 补全，再动手');
          }
          if (S().obs.compactions >= 3 && !recalledRecently) {
            return clip('[压缩补偿] 已压缩 ' + S().obs.compactions + ' 次' + (inWindow ? '（脆弱窗 距上次 ' + sinceComp + ' 轮）' : '') + '：本回合先查库再答');
          }
          if (inWindow) {
            return clip('[压缩补偿·脆弱窗] 距上次压缩 ' + sinceComp + ' 轮：重要结论先落库，动手前先查');
          }
          return null;
        } catch { return null; }
      }
    });
  }

  // 核心约定常驻行（2026-10-11 用户裁定）：**防目标漂移**——压缩丢的是"我们怎么做事"（实测五条约定存活 0–21%），
  //   而每回合注入的称呼层 100% 存活 ⇒ 把核心约定也做成**常驻**。**库驱动**：渲染时读 canon 的
  //   `canon-core-conventions` 当前版本的 `line` 字段 ⇒ **改约定＝改条目**（不碰代码）；读不到 ⇒ 内置兜底（永不为空）。
  //   行宽**破例放宽到 160 字**（其余行均为 80）：它是漂移锚，值得多占一行。
  if (cfg.conventions !== false) {
    const CONV_ID = 'canon-core-conventions';
    const FALLBACK_CONVENTIONS = '库无界·装载有界｜来源态四标签｜修订链：追加不改原文｜零编造（红线）｜称呼：Master/大肥鱼';
    const clipLong = (s) => (s.length <= 160 ? s : s.slice(0, 159) + '…');
    ctx.systemPrompt.context({
      name: 'akasha:conventions',
      order: (cfg.pulseOrder ?? 132) + 4,
      text: (context) => {
        retarget(renderSidOf(context));
        try {
          const lib = require_(join(cfg.akashaDir, 'lib.mjs'));
          const recs = lib.currentRecords(lib.loadStore('canon').records);
          const rec = recs.filter((r) => String(r.id) === CONV_ID || String(r.id).startsWith(CONV_ID + '-r')).pop();
          const text = (rec && typeof rec.line === 'string' && rec.line.trim()) ? rec.line.trim() : FALLBACK_CONVENTIONS;
          return safeInject(clipLong('[约定] ' + text));   // F06（2026-10-14 外部审查）：库原文可能含合法模板示例（如 {{unknown}}）——出口整体包裹，防宿主插值抛错
        } catch { return safeInject(clipLong('[约定] ' + FALLBACK_CONVENTIONS)); }
      }
    });
  }

  // ① 语义钩子 + 显式钩子（2026-10-11 用户令「开搞」；补设计稿 §2.4 五类钩子中缺的两类）
  //   · **显式钩子**（"上次那个"）：读**本会话最近 intent 段**（会话层＝用户消息的摘要）⇒ 检测指代词 ⇒ 检索六库 ⇒ **一行**指路。
  //     ⚠ 已知限制（如实）：数据源是**摘要**而非原话，摘要可能丢掉指代词 ⇒ **宁可漏触发不误触发**；
  //       若要原话级，需让 hooks 侧记录 user-message 行（待办）。
  //   · **语义钩子**（"当前处境作为查询"）：本会话近 30 分钟内有工具失败 ⇒ 用工具名检索六库 ⇒ **一行**指路。
  //   两钩子**每回合最多出一行**，优先级 显式 > 语义；都无触发 ⇒ **静默**（不制造噪音）；可关 `recallHook:false`。
  if (cfg.recallHook !== false) {
    const PRONOUN = /(上次|之前|上回|那天|那个|说过|记得|当时|前面说|前面提)/;
    // N08（GPT 第三轮）：按当前身份过滤；unknown 不读共享最后一条。
    // Q06（GPT 第四轮）：与 C3 共用同一读法（latestIntentGist：精确优先 + 旧数据单前缀差兜底）。
    const recentIntentGist = () => {
      try {
        const sid = curSid;
        if (!sid || sid === '(unknown)') return '';
        const txt = tailReadText(join(cfg.akashaDir, 'data', 'session.jsonl')).text;
        return String(latestIntentGist(txt, sid) || '');
      } catch { return ''; }
    };
    const clip120 = (s) => (s.length <= 120 ? s : s.slice(0, 119) + '…');
    ctx.systemPrompt.context({
      name: 'akasha:recall',
      order: (cfg.pulseOrder ?? 132) + 5,
      text: (context) => {
        retarget(renderSidOf(context));
        try {
          const lib = require_(join(cfg.akashaDir, 'lib.mjs'));
          // 显式钩子（指代）
          const gist = recentIntentGist();
          if (gist && PRONOUN.test(gist)) {
            // 去掉**所有**指代词（2026-10-11 修：replace 无 g 标志时只替一次，残留「那个」会污染查询）
            const q = gist.replace(new RegExp(PRONOUN.source, 'g'), ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || gist.slice(0, 60);
            const r = lib.lookupDetailed(q, { limit: 2, contextBudget: false, via: 'probe' }); // via:'probe'（2026-10-14 复检）——机制探针，不进检索面指标
            const ids = (r.hits || []).map((h) => String(h.id)).slice(0, 2).join(' · ');
            if (ids) return safeInject(clip120('[指代检索] 像是问旧事 → 先看：' + ids));   // F06：库侧内容出口必须包裹（防模板插值）
          }
          // 语义钩子（近失败）
          const f = S().recentFailures[S().recentFailures.length - 1];
          if (f && S().obs.turn && Date.now() - f.ts < 30 * 60 * 1000) {
            const r = lib.lookupDetailed(String(f.tool || ''), { limit: 2, contextBudget: false, via: 'probe' }); // 同上：机制探针（近失败回查），不进检索面指标
            const top = (r.hits || [])[0];
            if (top) return safeInject(clip120('[处境检索] ' + f.tool + ' 近 30 分钟内失败过 → 相关条目 ' + top.id + '：' + String(top.snippet || '').slice(0, 42)));   // F06 同上
          }
          return null;
        } catch { return null; }
      }
    });
  }

  // 空闲触发（事件失败开放）。
  ctx.on('agent/status', (payload) => {
    try { if (payload?.status === 'idle') maybeSleep('idle'); } catch { /* 静默 */ }
  });

  // 定时兜底：宿主长期不空闲也能按节奏睡。
  // ⚠️ timer 是「混入服务」：访问 ctx.interval 需要 inject:['timer']，否则属性访问本身抛出
  //    "cannot get property \"timer\" without inject"——v1.1.0 事故：整个 apply 失败、插件静默失活。
  //    ctx.interval 返回的停止函数再挂到本插件自己的 effect 上，卸载即停。
  if (typeof ctx.interval === 'function') {
    try {
      const stop = ctx.interval(() => { try { maybeSleep('timer'); } catch { /* 静默 */ } }, cfg.timerCheckMs);
      ctx.effect(() => () => { try { stop(); } catch { /* 静默 */ } });
    } catch { /* 静默 */ }
  }

  // 首次激活即跑一次，此后按去抖节奏。
  const boot = readState();
  if (!boot.lastRunAt) runSleep('activate');

  log({ kind: 'sleep-armed', pid: process.pid, minIntervalHours: cfg.minIntervalHours, timerCheckMs: cfg.timerCheckMs });
  if (llmSkipNote) log({ kind: 'wake-note-llm-skip', message: llmSkipNote });
}
