// akasha/sleep.mjs —— 睡眠器蒸馏核心（2026-10-07 v2：逻辑归库、调度归插件）。
// 迁移自 @akasha-book/akasha-sleep v1.3.1 的 lib/index.js（distillHooks / buildTodos / renderContextLine / renderPulseLine 逐字一致）；
// 新增：sleepRun（含 --dry / 同日报告不覆盖 / report/state/inbox 写失败观测线）+ shouldSleep（去抖判断）。
// 手动触发：node akasha.mjs sleep [--dry] —— 与插件自动触发共用同一水位线 sleep-state.json（不重复蒸馏、不丢增量）。
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ROOT, audit } from './lib.mjs';

export const SLEEP_DEFAULTS = {
  log: join(ROOT, 'logs', 'hooks.jsonl'),
  stateFile: join(ROOT, 'logs', 'sleep-state.json'),
  inboxFile: join(ROOT, 'logs', 'inbox.jsonl'),
  reportDir: join(ROOT, 'logs'),
  minIntervalHours: 6
};

/** 把 hooks.jsonl 的一批记录蒸馏为计数与备注（纯函数，可测）。 */
export function distillHooks(lines) {
  const counters = { lines: 0, turns: 0, tools: 0, toolErrors: 0, denials: 0, agentErrors: 0, byTool: {} };
  const notes = [];
  for (const raw of lines) {
    const text = String(raw ?? '').trim();
    if (!text) continue;
    let rec;
    try { rec = JSON.parse(text); } catch { continue; }
    counters.lines++;
    if (rec.kind === 'turn-end') counters.turns++;
    else if (rec.kind === 'tool') {
      counters.tools++;
      const tool = String(rec.tool ?? '?');
      counters.byTool[tool] = (counters.byTool[tool] ?? 0) + 1;
      if (rec.ok === false) {
        counters.toolErrors++;
        if (notes.length < 5) notes.push(`工具失败 ${tool}: ${String(rec.message ?? '').slice(0, 120)}`);
      }
    } else if (rec.kind === 'gate-denied') counters.denials++;
    else if (rec.kind === 'agent-error') counters.agentErrors++;
  }
  return { counters, notes };
}

/** 生成待办（纯函数）：audit 警告 → review；工具失败 / 门控拦截 / agent 错误 → orphan-candidate。 */
export function buildTodos(counters, notes, audit) {
  const todo = [];
  const findings = Array.isArray(audit?.findings) ? audit.findings : [];
  for (const finding of findings) {
    todo.push({
      kind: 'review',
      code: String(finding.code),
      count: Number(finding.count ?? 0),
      note: `${finding.code} ×${finding.count}（akasha_audit 可查明细）`
    });
  }
  if ((counters?.toolErrors ?? 0) > 0) {
    todo.push({ kind: 'orphan-candidate', code: 'tool-error', count: counters.toolErrors, note: String(notes?.[0] ?? ''), samples: (notes ?? []).slice(0, 3) });
  }
  if ((counters?.denials ?? 0) > 0) {
    todo.push({ kind: 'orphan-candidate', code: 'gate-denied', count: counters.denials, note: '被门控拦截的写入尝试（失败回查候选，见 gate-denied 明细）' });
  }
  if ((counters?.agentErrors ?? 0) > 0) {
    todo.push({ kind: 'orphan-candidate', code: 'agent-error', count: counters.agentErrors, note: 'agent 级错误（失败回查候选）' });
  }
  return todo;
}

/** 渲染「门口条子」：一行睡眠摘要（纯函数，可测）。 */
export function renderContextLine(state) {
  try {
    if (!state || !state.lastRunAt) return '阿卡夏·睡眠：尚未运行（将在空闲时首次蒸馏）。';
    const c = state.lastCounters ?? {};
    let auditBit = '审计不可用';
    if (state.lastAudit === 'ok') auditBit = '审计 OK';
    else if (typeof state.lastAudit === 'number') auditBit = `审计警告 ${state.lastAudit} 条`;
    const todoBit = Number.isInteger(state.lastTodo) && state.lastTodo > 0 ? `；待办 ${state.lastTodo} 条（inbox.jsonl）` : '';
    return `阿卡夏·睡眠：${state.lastRunAt}（${state.lastTrigger ?? '?'}）新增 ${c.lines ?? 0} 条 / 工具 ${c.tools ?? 0}（错误 ${c.toolErrors ?? 0}、拦截 ${c.denials ?? 0}）；${auditBit}${todoBit}；报告 ${state.lastReport ?? '（无）'}。`;
  } catch {
    return '阿卡夏·睡眠：状态读取失败。';
  }
}

/** 组装「库脉搏」行（纯函数）：六库当前计数 + 全库最近一条写入与相对时间。 */
export function renderPulseLine(p) {
  if (!p || !p.stores) return null;
  const counts = Object.entries(p.stores).map(([k, v]) => `${k} ${v.current ?? v.count}`).join(' / ');
  const newest = p.newest && p.newest.id ? `${p.newest.store}#${p.newest.id}（${p.newest.ageText ?? '?'}）` : '（无）';
  return `阿卡夏·库脉搏：${counts}；最近写入 ${newest}`;
}

/** 去抖判断（纯函数）：跑过且未满间隔 → 不睡（返回 sinceHours 供留痕）；其余（含从未跑过）→ 睡。 */
export function shouldSleep(state, nowMs, minIntervalHours = SLEEP_DEFAULTS.minIntervalHours) {
  const last = state && state.lastRunAt ? Date.parse(state.lastRunAt) : 0;
  const hours = last ? (nowMs - last) / 3600000 : null;
  const rounded = hours === null ? null : Math.round(hours * 10) / 10;
  if (last && hours < minIntervalHours) return { due: false, hoursSince: rounded };
  return { due: true, hoursSince: rounded };
}

/**
 * 睡眠主流程：读状态 → 水位线增量 → 蒸馏 → audit → 报告 → inbox → 水位线推进。
 * dry:true → 全不写、只返回预览。report/state/inbox 写失败 → 观测线（v1.3.1「静默失败清剿」语义不变）。
 */
export function sleepRun(opts = {}) {
  const logPath = opts.log || SLEEP_DEFAULTS.log;
  const stateFile = opts.stateFile || SLEEP_DEFAULTS.stateFile;
  const inboxFile = opts.inboxFile || SLEEP_DEFAULTS.inboxFile;
  const reportDir = opts.reportDir || SLEEP_DEFAULTS.reportDir;
  const trigger = opts.trigger || 'manual';
  const now = opts.now ? new Date(opts.now) : new Date();
  const emit = (record) => {
    try {
      mkdirSync(dirname(logPath), { recursive: true });
      appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n', 'utf8');
    } catch { /* 静默：观测线写不了不拖垮 */ }
  };
  try {
    let state = {};
    try { state = JSON.parse(readFileSync(stateFile, 'utf8')); } catch { state = {}; }
    let all = [];
    try { all = readFileSync(logPath, 'utf8').split(/\r?\n/).filter(Boolean); } catch { all = []; }
    const from = Number.isInteger(state.processedLines) ? state.processedLines : 0;
    const { counters, notes } = distillHooks(all.slice(from));

    let auditResult;
    try {
      const result = audit();
      auditResult = { ok: result.ok, findings: result.findings.map((f) => ({ level: f.level, code: f.code, count: f.detail.length })) };
    } catch (error) {
      auditResult = { ok: null, error: String(error?.message ?? error).slice(0, 200) };
    }

    const todo = buildTodos(counters, notes, auditResult);
    const stamp = now.toISOString();
    const date = stamp.slice(0, 10);
    const report = { date, ranAt: stamp, trigger, processedFrom: from, processedTo: all.length, counters, notes, audit: auditResult, todo };

    if (opts.dry) {
      return { ok: true, dry: true, report, reportFile: null, todo: todo.length, processedFrom: from, processedTo: all.length };
    }

    let reportFile = `sleep-${date}.json`;
    try {
      mkdirSync(reportDir, { recursive: true });
      if (existsSync(join(reportDir, reportFile))) reportFile = `sleep-${date}-${stamp.slice(11, 19).replace(/:/g, '')}.json`;
      writeFileSync(join(reportDir, reportFile), JSON.stringify(report, null, 2), 'utf8');
    } catch (error) {
      emit({ kind: 'sleep-report-error', message: String(error?.message ?? error).slice(0, 300), code: String(error?.code ?? '') });
    }

    if (todo.length > 0) {
      try {
        mkdirSync(dirname(inboxFile), { recursive: true });
        appendFileSync(inboxFile, JSON.stringify({ ts: stamp, kind: 'todo', fromReport: reportFile, items: todo }) + '\n', 'utf8');
      } catch (error) { emit({ kind: 'sleep-inbox-error', message: String(error?.message ?? error).slice(0, 200) }); }
    }

    const next = {
      processedLines: all.length,
      lastRunAt: stamp,
      lastTrigger: trigger,
      lastReport: reportFile,
      lastCounters: counters,
      lastTodo: todo.length,
      lastAudit: auditResult.ok === true ? 'ok' : auditResult.ok === false ? (auditResult.findings?.length ?? 0) : 'unavailable'
    };
    try {
      mkdirSync(dirname(stateFile), { recursive: true });
      writeFileSync(stateFile, JSON.stringify(next, null, 2), 'utf8');
    } catch (error) { emit({ kind: 'sleep-state-error', message: String(error?.message ?? error).slice(0, 200) }); }

    return { ok: true, reportFile, todo: todo.length, processedFrom: from, processedTo: all.length, state: next };
  } catch (error) {
    return { ok: false, error: String(error?.message ?? error).slice(0, 300) };
  }
}

/** 回查提示（v1.5，2026-10-07）：窗口内有失败（工具 / agent）→ 一行提示（幂等：同窗口渲染结果稳定）；无 → null。 */
export function renderRecallLine(failures, nowMs = Date.now(), windowMs = 1800000) {
  const recent = (Array.isArray(failures) ? failures : []).filter((f) => f && typeof f.ts === 'number' && nowMs - f.ts <= windowMs);
  if (!recent.length) return null;
  const tools = [...new Set(recent.map((f) => String(f.tool || '未知')))].slice(0, 4);
  const minutes = Math.round(windowMs / 60000);
  return `阿卡夏·回查提示：近 ${minutes} 分钟内 ${recent.length} 次失败（${tools.join(' / ')}）——先查库（lookup / brief 相关主题）再继续；失败回查：库里本来有没有能救它的东西？`;
}
