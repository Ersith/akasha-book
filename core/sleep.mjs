// akasha/sleep.mjs —— 睡眠器蒸馏核心（2026-10-07 v2：逻辑归库、调度归插件）。
// 迁移自 @akasha-book/sleep v1.3.1 的 lib/index.js（distillHooks / buildTodos / renderContextLine / renderPulseLine 逐字一致）；
// 新增：sleepRun（含 --dry / 同日报告不覆盖 / report/state/inbox 写失败观测线）+ shouldSleep（去抖判断）。
// 手动触发：node akasha.mjs sleep [--dry] —— 与插件自动触发共用同一水位线 sleep-state.json（不重复蒸馏、不丢增量）。
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, STORES, audit, currentRecords, isProtocolId, parseJsonl, recallSignals, redact, storePath, tokenize, writeFileAtomic } from './lib.mjs';

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
  const parsed = [];
  for (const raw of lines) {
    const text = String(raw ?? '').trim();
    if (!text) continue;
    let rec;
    try { rec = JSON.parse(text); } catch { counters.badJson = (counters.badJson ?? 0) + 1; continue; }
    counters.lines++;
    parsed.push(rec);
    if (rec.kind === 'turn-end') counters.turns++;
    else if (rec.kind === 'tool') {
      counters.tools++;
      const tool = String(rec.tool ?? '?');
      counters.byTool[tool] = (counters.byTool[tool] ?? 0) + 1;
      if (rec.ok === false) {
        counters.toolErrors++;
        if (notes.length < 5) notes.push(redact(`工具失败 ${tool}: ${String(rec.message ?? '').slice(0, 120)}`));
      }
    } else if (rec.kind === 'gate-denied') counters.denials++;
    else if (rec.kind === 'agent-error') counters.agentErrors++;
  }
  // B2（wave1）：召回失败信号——失败回合里「失败前没查库」的计数（口径见 lib.recallSignals）。
  const rs = recallSignals(parsed);
  counters.failureTurns = rs.failureTurns;
  counters.recalledBefore = rs.recalledBefore;
  counters.recallMisses = rs.misses;
  counters.lateRecall = rs.lateRecall;
  return { counters, notes, recall: rs };
}

/**
 * 生成待办（纯函数）：audit 警告 → review；工具失败 / 门控拦截 / agent 错误 → orphan-candidate；
 * 召回漏（失败前未查库的回合，wave1.1）→ review `recall-miss`（复盘项，不自动转孤案——「本该查到什么」是语义判断）。
 */
export function buildTodos(counters, notes, audit, recall) {
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
  const misses = Number(counters?.recallMisses ?? 0);
  if (misses > 0) {
    const turns = Number(counters?.failureTurns ?? misses);
    const late = Number(counters?.lateRecall ?? 0);
    const samples = (Array.isArray(recall?.samples) ? recall.samples : []).slice(0, 3)
      .map((x) => `${x?.what ?? '?'}${x?.session ? ' @' + x.session : ''}${x?.ts ? ' ' + String(x.ts).slice(0, 16) : ''}`);
    todo.push({
      kind: 'review', code: 'recall-miss', count: misses, failureTurns: turns, lateRecall: late,
      note: `失败前未查库 ${misses}/${turns} 回合${late ? `（其中事后才查 ${late}）` : ''}——召回复盘：库里本来有没有能救它的条目？有 → 补召回入口（触发词 / 镜像解法）；没有 → 记孤案或定价`,
      samples
    });
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
    const recallBit = Number(c.recallMisses) > 0 ? `；失败前未查库 ${c.recallMisses}/${c.failureTurns ?? c.recallMisses} 回合` : '';
    return `阿卡夏·睡眠：${state.lastRunAt}（${state.lastTrigger ?? '?'}）新增 ${c.lines ?? 0} 条 / 工具 ${c.tools ?? 0}（错误 ${c.toolErrors ?? 0}、拦截 ${c.denials ?? 0}${recallBit}）；${auditBit}${todoBit}；报告 ${state.lastReport ?? '（无）'}。`;
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
    let buf = Buffer.alloc(0);
    try { buf = readFileSync(logPath); } catch { buf = Buffer.alloc(0); }
    // 水位线按字节（2026-10 复查）。旧状态只有 processedLines 时折算一次；文件变短视为轮转，从头蒸馏并留 truncated。
    let fromByte = Number.isInteger(state.processedBytes) ? state.processedBytes : null;
    let truncated = false;
    if (fromByte === null && Number.isInteger(state.processedLines) && state.processedLines > 0) {
      let n = 0; let i = 0;
      while (n < state.processedLines && i < buf.length) { if (buf[i] === 10) n += 1; i += 1; }
      fromByte = i;
    }
    if (fromByte === null) fromByte = 0;
    if (fromByte > buf.length) { truncated = true; fromByte = 0; }
    let end = buf.length;
    if (end > fromByte && buf[end - 1] !== 10) {
      const nl = buf.lastIndexOf(10);
      end = nl >= fromByte ? nl + 1 : fromByte;
    }
    const slice = buf.subarray(fromByte, end).toString('utf8').split(/\r?\n/).filter(Boolean);
    const { counters, notes, recall } = distillHooks(slice);
    // 对外仍以「条」计（CLI / 旧测试）；字节水位只进 state.processedBytes。
    const lineFrom = truncated ? 0 : (Number.isInteger(state.processedLines) ? state.processedLines : 0);
    const lineTo = lineFrom + slice.length;

    let auditResult;
    try {
      const result = audit();
      auditResult = { ok: result.ok, findings: result.findings.map((f) => ({ level: f.level, code: f.code, count: f.detail.length })) };
    } catch (error) {
      auditResult = { ok: null, error: String(error?.message ?? error).slice(0, 200) };
    }

    const todo = buildTodos(counters, notes, auditResult, recall);
    const stamp = now.toISOString();
    const date = stamp.slice(0, 10);
    const report = { date, ranAt: stamp, trigger, processedFrom: lineFrom, processedTo: lineTo, processedBytes: end, truncated, counters, notes, audit: auditResult, todo };

    if (opts.dry) {
      return { ok: true, dry: true, report, reportFile: null, todo: todo.length, processedFrom: lineFrom, processedTo: lineTo, truncated };
    }

    let reportFile = `sleep-${date}.json`;
    try {
      mkdirSync(reportDir, { recursive: true });
      if (existsSync(join(reportDir, reportFile))) reportFile = `sleep-${date}-${stamp.slice(11, 19).replace(/:/g, '')}.json`;
      writeFileAtomic(join(reportDir, reportFile), JSON.stringify(report, null, 2));
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
      processedBytes: end,
      processedLines: lineTo,
      lastRunAt: stamp,
      lastTrigger: trigger,
      lastReport: reportFile,
      lastCounters: counters,
      lastTodo: todo.length,
      lastAudit: auditResult.ok === true ? 'ok' : auditResult.ok === false ? (auditResult.findings?.length ?? 0) : 'unavailable'
    };
    try {
      mkdirSync(dirname(stateFile), { recursive: true });
      writeFileAtomic(stateFile, JSON.stringify(next, null, 2));
    } catch (error) { emit({ kind: 'sleep-state-error', message: String(error?.message ?? error).slice(0, 200) }); }

    return { ok: true, reportFile, todo: todo.length, processedFrom: lineFrom, processedTo: lineTo, truncated, state: next };
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

// —— 睡眠期合并 / 丢弃：只出计划（wave2 §2 第一批，2026-10-08）——
// `sleep --plan` 只读六库、只写 logs/ 下的计划文件；不调 appendRecord / revise / retire，不动水位线。
// --apply / 回滚 / revokes 等计划评审过后再做（下一批；P4 立场见 SCHEMA「睡眠计划」）。
// 规则全是机械的、可复算：同一份库 + 同一份日志 + 同一组参数 ⇒ 同一组 ops、同一个 planId（createdAt 不进 planId）。
export const PLAN_DEFAULTS = Object.freeze({ theta: 0.8, maxOps: 20, orphanDays: 90, staleDays: 365 });
const PLAN_OP_ORDER = { merge: 0, discard: 1 };
const PLAN_CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/;
const SNAPSHOT_RE = /^(.+)-(\d{8})$/;

/** 计划用的主文本（每库一种；frontier 不比文本，只比 url；orphan 零权重，不进合并）。 */
export function planPrimaryText(store, r) {
  const s = (v) => (typeof v === 'string' ? v : '');
  if (store === 'canon') return s(r.claim);
  if (store === 'mirror') return `${s(r.situation)} ${s(r.behavior)}`;
  if (store === 'lexicon') return `${s(r.term)} ${s(r.trigger)}`;
  if (store === 'pricing') return s(r.behavior);
  return '';
}

/** 计划用的 token 集（纯函数）：沿用 lib.tokenize 切词；含中文的词再拆相邻二字（中文不靠空格分词，整句会成一个 token）。 */
export function planTokens(text) {
  const out = new Set();
  for (const tok of tokenize(text)) {
    if (!PLAN_CJK_RE.test(tok) || tok.length < 2) { out.add(tok); continue; }
    for (let i = 0; i < tok.length - 1; i += 1) out.add(tok.slice(i, i + 2));
  }
  return out;
}

/** token Jaccard（纯函数）：|A∩B| / |A∪B|；两边都空 → 0（空文本不算相似）。 */
export function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const fingerprint = (file) => {
  if (!existsSync(file)) return { buf: null, fp: { bytes: 0, sha256: null, missing: true } };
  const buf = readFileSync(file);
  return { buf, fp: { bytes: buf.length, sha256: sha256(buf) } };
};
const dayDiff = (a, b) => Math.floor((Date.parse(b) - Date.parse(a)) / 86400000);
const day10 = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : '');
const byStr = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** 修订链视图：每条当前记录 → 根 id、链上全部 id、链上是否带 promoted_from。 */
function chainView(records) {
  const byId = new Map(records.map((r) => [r.id, r]));
  const rootOf = (r) => { let c = r; const seen = new Set(); while (c && typeof c.supersedes === 'string' && byId.has(c.supersedes) && !seen.has(c.id)) { seen.add(c.id); c = byId.get(c.supersedes); } return c; };
  return currentRecords(records).filter((r) => typeof r.id === 'string' && r.id).map((r) => {
    const chain = []; let c = r; const seen = new Set();
    while (c && !seen.has(c.id)) { seen.add(c.id); chain.unshift(c); c = typeof c.supersedes === 'string' ? byId.get(c.supersedes) : null; }
    const root = rootOf(r) || r;
    return { rec: r, rootId: root.id, rootLoggedAt: typeof root.logged_at === 'string' ? root.logged_at : '', chainIds: chain.map((x) => x.id), chain, promoted: chain.some((x) => x.promoted_from != null) };
  });
}

/** hooks 日志里 kind:"usage" 的引用计数（只读）；文件缺失 → null（不知道 ≠ 零引用）。 */
function usageFromLog(buf) {
  if (!buf) return null;
  const usage = new Map();
  for (const raw of buf.toString('utf8').split(/\r?\n/)) {
    if (!raw.trim()) continue;
    let rec; try { rec = JSON.parse(raw); } catch { continue; }
    if (rec && rec.kind === 'usage' && Array.isArray(rec.ids)) for (const id of rec.ids) usage.set(String(id), (usage.get(String(id)) ?? 0) + 1);
  }
  return usage;
}

/**
 * 生成睡眠计划（只读）。opts：
 *   files    —— { <store>: 路径 }（缺省 storePath；测试注入临时库）
 *   log      —— hooks.jsonl（canon-stale 的引用计数来源；缺省 logs/hooks.jsonl）
 *   today    —— YYYY-MM-DD（缺省 UTC 今天；进 params 与 planId）
 *   theta / maxOps / orphanDays / staleDays —— 见 PLAN_DEFAULTS
 *   out      —— 计划文件路径；缺省 logs/sleep-plan-<today>.json；false = 不落盘（纯计算）
 *   now      —— createdAt 用的时间（缺省 new Date()；不进 planId）
 * 返回 { ok, plan, planFile }；不调用任何写库函数。
 */
export function sleepPlan(opts = {}) {
  try {
    const today = opts.today ? String(opts.today).slice(0, 10) : new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || Number.isNaN(Date.parse(today))) return { ok: false, error: 'today 须为 YYYY-MM-DD：' + opts.today };
    const num = (v, d) => (v === undefined || v === null || v === true || v === '' ? d : Number(v));
    const params = {
      today,
      theta: num(opts.theta, PLAN_DEFAULTS.theta),
      maxOps: num(opts.maxOps, PLAN_DEFAULTS.maxOps),
      orphanDays: num(opts.orphanDays, PLAN_DEFAULTS.orphanDays),
      staleDays: num(opts.staleDays, PLAN_DEFAULTS.staleDays)
    };
    if (!(params.theta > 0 && params.theta <= 1)) return { ok: false, error: 'theta 须在 (0, 1]：' + opts.theta };
    for (const k of ['maxOps', 'orphanDays', 'staleDays']) if (!Number.isInteger(params[k]) || params[k] < 0) return { ok: false, error: `${k} 须为非负整数：` + params[k] };

    // 1) 读库 + 指纹（同一份字节既算指纹又解析，保证 basis 与 ops 对应同一快照）
    const files = opts.files || {};
    const basis = {}; const views = {}; const badLines = {};
    for (const store of STORES) {
      const { buf, fp } = fingerprint(files[store] || storePath(store));
      basis[store] = fp;
      const parsed = buf ? parseJsonl(buf.toString('utf8')) : { records: [], errors: [] };
      if (parsed.errors.length) badLines[store] = parsed.errors.length;
      views[store] = chainView(parsed.records);
    }
    const logFile = opts.log || SLEEP_DEFAULTS.log;
    const logFp = fingerprint(logFile);
    const usage = usageFromLog(logFp.buf);
    const inputs = { hooksLog: logFp.fp };

    // 2) 资格：协议条、带 promoted_from 的链、已退役（currentRecords 已排除）永不进计划
    const excluded = { protocol: 0, promoted: 0 };
    const eligible = {};
    for (const store of STORES) {
      eligible[store] = views[store].filter((v) => {
        if (v.chainIds.some(isProtocolId)) { excluded.protocol += 1; return false; }
        if (v.promoted) { excluded.promoted += 1; return false; }
        return true;
      }).sort((a, b) => byStr(a.rootLoggedAt, b.rootLoggedAt) || byStr(a.rootId, b.rootId) || byStr(a.rec.id, b.rec.id));
    }

    const used = new Set(); // `${store}\u0000${id}`：一条记录至多出现在一个 op 里
    const key = (store, id) => store + '\u0000' + id;
    const discards = []; const merges = []; const skipped = [];

    // 3) discard（先于 merge：被取代的旧快照不该被当成合并的 keep）
    //   a. canon 快照被更新快照取代：根 id 形如 <主题>-YYYYMMDD，同主题有更晚日期的当前快照
    //      （同主题的「更新快照」从全部当前 canon 里找——哪怕它本身因 promoted_from 不进计划，也照样算取代者）
    const eligibleCanon = new Set(eligible.canon.map((v) => v.rec.id));
    const snaps = new Map();
    for (const v of views.canon) {
      if (v.chainIds.some(isProtocolId)) continue;
      const m = SNAPSHOT_RE.exec(v.rootId);
      if (!m) continue;
      if (!snaps.has(m[1])) snaps.set(m[1], []);
      snaps.get(m[1]).push({ v, date: m[2] });
    }
    for (const [stem, list] of [...snaps.entries()].sort((a, b) => byStr(a[0], b[0]))) {
      if (list.length < 2) continue;
      list.sort((a, b) => byStr(b.date, a.date) || byStr(a.v.rootId, b.v.rootId));
      const newest = list[0];
      for (const { v, date } of list.slice(1)) {
        if (date === newest.date || !eligibleCanon.has(v.rec.id)) continue;
        discards.push({ op: 'discard', store: 'canon', id: v.rec.id, reason: 'snapshot-superseded', evidence: { stem, snapshotDate: date, supersededBy: newest.v.rec.id, newerDate: newest.date } });
        used.add(key('canon', v.rec.id));
      }
    }
    //   b. canon-stale（last_reviewed 超过 staleDays）且 usage 从未引用过链上任何 id；没有日志 = 不知道 → 不出此类 op
    if (usage === null) skipped.push({ rule: 'canon-stale-unused', why: 'hooks 日志不存在：引用次数未知，不按「从未引用」处理' });
    else {
      for (const v of eligible.canon) {
        if (used.has(key('canon', v.rec.id))) continue;
        const lr = day10(v.rec.last_reviewed);
        if (!lr) continue;
        const age = dayDiff(lr, today);
        if (!(age > params.staleDays)) continue;
        const refs = v.chainIds.reduce((n, id) => n + (usage.get(id) ?? 0), 0);
        if (refs > 0) continue;
        discards.push({ op: 'discard', store: 'canon', id: v.rec.id, reason: 'canon-stale-unused', evidence: { last_reviewed: lr, ageDays: age, staleDays: params.staleDays, usageRefs: 0, chainIds: v.chainIds } });
        used.add(key('canon', v.rec.id));
      }
    }
    //   c. orphan-aging：created 超过 orphanDays，且这段时间里链上没有修订（无确认）
    for (const v of eligible.orphan) {
      const created = day10(v.rec.created) || day10(v.chain[0].created);
      if (!created) continue;
      const age = dayDiff(created, today);
      if (!(age > params.orphanDays)) continue;
      const lastRevision = v.chain.filter((x) => typeof x.supersedes === 'string').map((x) => day10(x.logged_at)).filter(Boolean).sort().pop() || null;
      if (lastRevision && dayDiff(lastRevision, today) <= params.orphanDays) continue;
      discards.push({ op: 'discard', store: 'orphan', id: v.rec.id, reason: 'orphan-aging', evidence: { created, ageDays: age, orphanDays: params.orphanDays, lastRevision, severity: v.rec.severity ?? null } });
      used.add(key('orphan', v.rec.id));
    }
    //   frontier 永不 discard（只走 frontier recheck）——这里没有规则，不是遗漏。

    // 4) merge：同库当前集；keep = 根 logged_at 最早（同则根 id 字典序）；贪心——keep 只吸收与它本身 ≥ θ 的条目（每个 absorb 都有直接证据）
    for (const store of ['canon', 'mirror', 'lexicon', 'pricing']) {
      const cands = eligible[store].filter((v) => !used.has(key(store, v.rec.id))).map((v) => ({ v, toks: planTokens(planPrimaryText(store, v.rec)) })).filter((c) => c.toks.size > 0);
      const taken = new Set();
      for (let i = 0; i < cands.length; i += 1) {
        if (taken.has(i)) continue;
        const absorb = []; const pairs = [];
        for (let j = i + 1; j < cands.length; j += 1) {
          if (taken.has(j)) continue;
          const sim = jaccard(cands[i].toks, cands[j].toks);
          if (sim >= params.theta) { taken.add(j); absorb.push(cands[j].v.rec.id); pairs.push({ id: cands[j].v.rec.id, jaccard: +sim.toFixed(4) }); }
        }
        if (!absorb.length) continue;
        taken.add(i);
        merges.push({ op: 'merge', store, keep: cands[i].v.rec.id, absorb, reason: 'near-duplicate', mergedText: null, evidence: { theta: params.theta, field: store === 'canon' ? 'claim' : store === 'mirror' ? 'situation+behavior' : store === 'lexicon' ? 'term+trigger' : 'behavior', pairs } });
        for (const id of [cands[i].v.rec.id, ...absorb]) used.add(key(store, id));
      }
    }
    //   frontier：同 url（与 audit duplicate-url 同口径：精确相等）
    const byUrl = new Map();
    for (const v of eligible.frontier) {
      if (used.has(key('frontier', v.rec.id)) || typeof v.rec.url !== 'string' || !v.rec.url) continue;
      if (!byUrl.has(v.rec.url)) byUrl.set(v.rec.url, []);
      byUrl.get(v.rec.url).push(v);
    }
    for (const [url, list] of [...byUrl.entries()].sort((a, b) => byStr(a[0], b[0]))) {
      if (list.length < 2) continue;
      const [keep, ...rest] = list; // eligible 已按 keep 优先级排好
      merges.push({ op: 'merge', store: 'frontier', keep: keep.rec.id, absorb: rest.map((v) => v.rec.id), reason: 'duplicate-url', mergedText: null, evidence: { url, statuses: Object.fromEntries(list.map((v) => [v.rec.id, v.rec.status ?? null])) } });
    }

    // 5) 排序 + 截断到 K
    const storeIdx = (s) => STORES.indexOf(s);
    const all = [...merges, ...discards].sort((a, b) =>
      PLAN_OP_ORDER[a.op] - PLAN_OP_ORDER[b.op] || storeIdx(a.store) - storeIdx(b.store) || byStr(a.reason, b.reason) || byStr(a.keep ?? a.id, b.keep ?? b.id));
    const ops = all.slice(0, params.maxOps);
    const truncated = { total: all.length, dropped: all.length - ops.length };

    const planId = 'plan-' + sha256(JSON.stringify({ v: 1, params, basis, inputs, ops })).slice(0, 16);
    const plan = {
      planId, version: 1, mode: 'plan-only',
      createdAt: (opts.now instanceof Date ? opts.now : new Date()).toISOString(),
      params, basis, inputs, ops, truncated, excluded, skipped,
      ...(Object.keys(badLines).length ? { badLines } : {}),
      note: '只读计划：未改六库。mergedText 留给模型 / 人填写；--apply / 回滚 / revokes 尚未实现（待本计划评审）。'
    };
    let planFile = null;
    if (opts.out !== false) {
      planFile = opts.out || join(SLEEP_DEFAULTS.reportDir, `sleep-plan-${today}.json`);
      const resolved = new Set(STORES.map((s) => resolve(files[s] || storePath(s))));
      if (resolved.has(resolve(planFile))) return { ok: false, error: '拒绝把计划写到存储文件上：' + planFile };
      mkdirSync(dirname(planFile), { recursive: true });
      writeFileAtomic(planFile, JSON.stringify(plan, null, 2) + '\n');
    }
    return { ok: true, plan, planFile };
  } catch (error) {
    return { ok: false, error: String(error?.message ?? error).slice(0, 300) };
  }
}
