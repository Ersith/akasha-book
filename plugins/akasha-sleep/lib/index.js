// 阿卡夏之书睡眠器 v1.5.1 —— 调度与注入（蒸馏逻辑归核心库 sleep.mjs）。
//   · 触发：agent/status → idle（去抖 minIntervalHours）+ 定时兜底 ctx.interval（默认 1h）
//   · 蒸馏/复核/待办/报告/水位线：核心库 sleepRun —— 手动 `node akasha.mjs sleep` 与之共用同一水位线
//   · 条子一：systemPrompt.context（akasha:sleep）——每回合带最近一次睡眠摘要
//   · 条子二（唤醒条）：agent/created → agent.inject 起床包摘要（不唤醒、不打断）
//   · 条子三（库脉搏 + 回查，v1.5）：systemPrompt.context（akasha:pulse）——六库计数 + 最近写入；
//     窗口内（默认 30 分钟）有失败时追一行「回查提示」（错误钩子的注入级动作，不拦截）
//   · 降级：核心库不可用 → sleep-error 观测线 + 条子提示文案，不炸、不失活。
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

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
  preflightOrder: 135  // C1｜易错点前置（order 135；C3 若上线则 136，优先级 C3 > C1）
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
        content: [{ type: 'text', text: buildWakeNote(k) }],
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

  // 条子：每个新回合的 runtime context 自动带上最近一次睡眠摘要（渲染自核心库，失败安全）。
  ctx.systemPrompt.context({
    name: 'akasha:sleep',
    order: cfg.contextOrder,
    text: () => {
      try { return core().renderContextLine(readState()); }
      catch { return '阿卡夏·睡眠：核心库不可用（akasha\\sleep.mjs 缺失或损坏）。'; }
    }
  });

  // 回查提示（v1.5，错误钩子的注入级动作）：进程内记录近期失败（工具 / agent），窗口内幂等渲染。
  const recentFailures = [];
  const noteFailure = (tool) => {
    try {
      recentFailures.push({ ts: Date.now(), tool: String(tool ?? '?') });
      if (recentFailures.length > 20) recentFailures.splice(0, recentFailures.length - 20);
    } catch { /* 静默 */ }
  };
  ctx.on('tools/result', (exec, result) => { if (result?.isError === true) noteFailure(exec?.name); });
  ctx.on('agent/error', () => noteFailure('agent'));

  // 库脉搏（v1.3；v1.5 起附加回查行）：写→可见通道——并行会话 / 脚本写入库后，下一回合即可见并命名新内容。
  ctx.systemPrompt.context({
    name: 'akasha:pulse',
    order: cfg.pulseOrder,
    text: () => {
      try {
        const lib = require_(join(cfg.akashaDir, 'lib.mjs'));
        const lines = [core().renderPulseLine(lib.pulse())];
        const recall = core().renderRecallLine(recentFailures, Date.now());
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
    text: () => {
      try {
        const lib = require_(join(cfg.akashaDir, 'lib.mjs'));
        const recs = lib.currentRecords(lib.loadStore('canon').records);
        const hit = recs.filter((r) => String(r.id).startsWith('canon-address-layers')).pop();
        if (hit && typeof hit.claim === 'string') return core().renderAddressLine(hit.claim);
      } catch { /* 读库失败 → 兜底短句 */ }
      return core().renderAddressLine('');
    }
  });

  // C1｜易错点前置（pre-flight hint，2026-10-10 解冻后实现；评审 v2 定稿）
  // 依据：可预防漏召率 91.2%（回合级）、会话级 100% ⇒ 缺的不是知识，是"动作前把库拉进来"。
  // 形态：一行 ≤80 字，只提示不阻断；关（preflightHints:false）则**提示与事件双停**（不写假触发）。
  // 近似说明（如实）：context 行在**回合开始**渲染，此刻还不知道本回合会调用什么工具，
  //   故用"最近失败的工具"作为**预提示**（近 30 分钟窗口 + 同工具去重）；"本回合尚未查库"这一前置
  //   在渲染时无法判定，改为"上一个回合没有查库动作时更倾向提示"的弱化版（v1 取"总是可提示"，由去重与上限约束）。
  const preflightState = { tool: null, at: 0 };
  if (cfg.preflightHints !== false) {
    ctx.systemPrompt.context({
      name: 'akasha:preflight',
      order: cfg.preflightOrder,
      text: () => {
        try {
          const lib = require_(join(cfg.akashaDir, 'lib.mjs'));
          const now = Date.now();
          const WINDOW = 30 * 60 * 1000;
          const recent = (recentFailures || []).filter((f) => now - f.at <= WINDOW);
          if (!recent.length) return null;
          const last = recent[recent.length - 1];
          const tool = String(last.tool || '');
          const map = lib.RECALL_TRAP_MAP || {};
          const ids = map[tool];
          if (!ids || !ids.length) return null;                       // 不在映射表 ⇒ 不提示
          if (preflightState.tool === tool && now - preflightState.at < WINDOW) return null;  // 同工具 30 分钟去重
          const ACTIONS = {
            'canon-trap-edit-context-mismatch': '先 read 原文再改、改完复核',
            'canon-trap-read-offset-range': '先用 grep 拿真实行号再读',
            'canon-trap-grep-exit2-path': '换浅范围/排除 node_modules 再 grep',
            'canon-trap-unknown-tool-name': '只从本会话可见工具面选名字',
            'canon-trap-provider-method-list': '先列方法清单再调用',
          };
          const id = ids.find((x) => ACTIONS[x]) || ids[0];
          const act = ACTIONS[id] || '先查库再动手';
          const line = '[坑前提示] ' + tool + ' 前：' + act + ' —— 条目 ' + id;
          preflightState.tool = tool; preflightState.at = now;
          try {                                                        // 事件：关闭时走不到这里（双停）
            const fs = require_('node:fs');
            fs.appendFileSync(join(cfg.akashaDir, 'logs', 'hooks.jsonl'),
              JSON.stringify({ ts: new Date().toISOString(), kind: 'preflight', tool, entry: id }) + '\n');
          } catch { /* 事件失败不影响提示 */ }
          return line.length <= 80 ? line : line.slice(0, 79) + '…';
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
