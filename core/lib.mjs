// 阿卡夏之书（Akasha）v0 核心库。零依赖（仅 Node stdlib）。
// 数据：data/*.jsonl（append-only）。规范见 SCHEMA.md / PROTOCOL.md。
import { readFileSync, appendFileSync, writeFileSync, mkdirSync, existsSync, statSync, openSync, closeSync, writeSync, fsyncSync, renameSync, unlinkSync, constants } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const ROOT = dirname(fileURLToPath(import.meta.url));
export const DATA = join(ROOT, 'data');
export const STORES = ['canon', 'mirror', 'orphan', 'pricing', 'lexicon', 'frontier'];
const SOURCE_TYPES = ['复现', '实验', '官方', '他人', '共识'];
const SEVERITIES = ['高', '中', '低'];
/** 镜像库条目角色（wave1）：solution＝做成过的解法（做任务时主查）；boundary＝失败 / 越界 / 适用边界（改流程、复盘时查）。 */
export const MIRROR_ROLES = Object.freeze(['solution', 'boundary']);
/** mirrorMatch 的 mode：task＝解法 + 未分层；improve＝边界 + 未分层；all（缺省）＝不过滤（旧行为）。 */
export const MIRROR_MODES = Object.freeze(['all', 'task', 'improve']);

export function storePath(name) {
  return join(DATA, name + '.jsonl');
}

/** 凭据形字符串打码（2026-10 复查）。不打路径：实体钩子靠路径，整段打码会拆掉召回。 */
const REDACT_RES = [
  [/\bsk-[A-Za-z0-9]{8,}\b/g, 'sk-[redacted]'],
  [/\bAKIA[0-9A-Z]{16}\b/g, '[redacted-akid]'],
  [/\bghp_[A-Za-z0-9]{10,}\b/g, 'ghp_[redacted]'],
  [/\bgithub_pat_[A-Za-z0-9_]{10,}\b/g, '[redacted-gh]'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, '[redacted-slack]'],
  [/\b(Bearer\s+)[A-Za-z0-9._\-]{8,}/gi, '$1[redacted]'],
  [/((?:api[_-]?key|token|secret|password|passwd|pwd)\s*[=:]\s*)(\S+)/gi, '$1[redacted]'],
  // 自家补充（2026-10-08）：npm / HuggingFace / GitLab 凭证前缀
  [/\bnpm_[A-Za-z0-9]{20,}\b/g, 'npm_[redacted]'],
  [/\bhf_[A-Za-z0-9]{20,}\b/g, 'hf_[redacted]'],
  [/\bglpat-[A-Za-z0-9_\-]{16,}\b/g, '[redacted-glpat]']
];
export function redact(value) {
  let out = String(value ?? '');
  for (const [re, to] of REDACT_RES) out = out.replace(re, to);
  return out;
}

/** 原子替换（先写临时文件再 rename）。 */
export function writeFileAtomic(file, text) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  const fd = openSync(tmp, 'w');
  try { writeSync(fd, text); fsyncSync(fd); }
  finally { closeSync(fd); }
  renameSync(tmp, file);
}

/** 排他锁。陈锁（>30s）清掉；等待上限 5s。同进程不可重入同一文件。 */
export function withFileLock(file, fn) {
  mkdirSync(dirname(file), { recursive: true });
  const lock = file + '.lock';
  const start = Date.now();
  let fd;
  for (;;) {
    try { fd = openSync(lock, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY); break; }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try { if (Date.now() - statSync(lock).mtimeMs > 30000) { unlinkSync(lock); continue; } } catch { /* 锁刚被取走 */ }
      if (Date.now() - start > 5000) throw new Error('锁超时：' + lock);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
  try { return fn(); }
  finally { try { closeSync(fd); } catch { /* 已关 */ } try { unlinkSync(lock); } catch { /* 已删 */ } }
}

export function parseJsonl(text) {
  const records = []; const errors = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const s = line.trim();
    if (!s) return;
    try { records.push(JSON.parse(s)); }
    catch (e) { errors.push({ line: i + 1, error: 'JSON 解析失败：' + e.message }); }
  });
  return { records, errors };
}

export function loadStore(name, file = storePath(name)) {
  if (!existsSync(file)) return { name, records: [], errors: [{ line: 0, error: '文件不存在：' + file }] };
  return { name, ...parseJsonl(readFileSync(file, 'utf8')) };
}

const isStr = v => typeof v === 'string' && v.trim() !== '';
const isNum = v => typeof v === 'number' && Number.isFinite(v);

export function validateRecord(store, r) {
  if (!r || typeof r !== 'object') return ['记录不是对象'];
  const e = [];
  if (!isStr(r.id)) e.push('缺少 id');
  if (r.event_time !== undefined && !isStr(r.event_time)) e.push('event_time 须为非空字符串（YYYY-MM-DD 或 ISO）');
  if (r.logged_at !== undefined && !isStr(r.logged_at)) e.push('logged_at 须为非空字符串（ISO）');
  if (r.valence !== undefined && (!isNum(r.valence) || r.valence < -1 || r.valence > 1)) e.push('valence 须为 [-1,1] 内数字');
  if (r.arousal !== undefined && (!isNum(r.arousal) || r.arousal < 0 || r.arousal > 1)) e.push('arousal 须为 [0,1] 内数字');
  if (store === 'canon') {
    if (!isStr(r.claim)) e.push('缺少 claim');
    if (!r.source || !SOURCE_TYPES.includes(r.source.type)) e.push('source.type 须为 ' + SOURCE_TYPES.join('/'));
    if (!r.source || !isStr(r.source.ref)) e.push('缺少 source.ref');
    if (!isStr(r.last_reviewed)) e.push('缺少 last_reviewed');
  }
  if (store === 'mirror') {
    for (const f of ['situation', 'behavior', 'outcome', 'social_reaction', 'emotion', 'story'])
      if (!isStr(r[f])) e.push('缺少 ' + f);
    // wave1：解法库 / 边界库同库分层（可选字段；缺省 = 未分层，行为与旧版一致）。
    if (r.role !== undefined && !MIRROR_ROLES.includes(r.role)) e.push('role 须为 ' + MIRROR_ROLES.join('/') + '（解法 / 边界；可省略）');
  }
  if (store === 'orphan') {
    for (const f of ['summary', 'observed', 'hypothesis', 'would_confirm', 'would_refute'])
      if (!isStr(r[f])) e.push('缺少 ' + f);
    if (!SEVERITIES.includes(r.severity)) e.push('severity 须为 ' + SEVERITIES.join('/'));
    if (!isStr(r.created)) e.push('缺少 created');
  }
  if (store === 'pricing') {
    if (!isStr(r.behavior)) e.push('缺少 behavior');
    if (!isNum(r.valence) || r.valence < -1 || r.valence > 1) e.push('valence 须为 [-1,1] 内数字');
    if (!Number.isInteger(r.severity_default) || r.severity_default < 1 || r.severity_default > 5) e.push('severity_default 须为 1..5 整数');
  }
  if (store === 'lexicon') {
    for (const f of ['term', 'trigger', 'behavior', 'resolution', 'source'])
      if (!isStr(r[f])) e.push('缺少 ' + f);
  }
  if (store === 'frontier') {
    for (const f of ['title', 'url', 'topic', 'status', 'last_checked', 'next_review'])
      if (!isStr(r[f])) e.push('缺少 ' + f);
    if (!['已实践', '已复现', '高引用', '待验证'].includes(r.status)) e.push('status 须为 已实践/已复现/高引用/待验证');
    if (isStr(r.url) && !/^https?:\/\//.test(r.url)) e.push('url 须以 http(s):// 开头');
    if (r.year !== undefined && r.year !== null && !Number.isInteger(r.year)) e.push('year 须为整数或留空');
    if (r.supports !== undefined && (!Array.isArray(r.supports) || r.supports.some(s => typeof s !== 'string'))) e.push('supports 须为字符串数组');
  }
  // wave2 §3：验证事件只记在修订版上（根版的层级由 source.type 推导，不另存）。ref 必填。
  if (r.verification !== undefined) {
    const v = r.verification;
    if (!v || typeof v !== 'object' || Array.isArray(v)) e.push('verification 须为对象');
    else {
      if (!VERIFY_KINDS.includes(v.kind)) e.push('verification.kind 须为 ' + VERIFY_KINDS.join('/'));
      if (!isStr(v.at)) e.push('verification.at 须为非空字符串（YYYY-MM-DD 或 ISO）');
      if (!isStr(v.ref)) e.push('verification.ref 必填（指向可核对的来源：会话 ptr / frontier id / URL）');
      if (!isStr(r.supersedes)) e.push('verification 只允许出现在修订版（须带 supersedes）');
    }
  }
  // wave2 §1：段升格来源（可选）。replay 只允许人工确认，且仅 canon + source.type=复现 必填。
  if (r.promoted_from !== undefined) {
    const p = r.promoted_from;
    if (!p || typeof p !== 'object' || Array.isArray(p)) e.push('promoted_from 须为对象');
    else {
      if (p.store !== 'session') e.push('promoted_from.store 须为 session');
      if (!isStr(p.id) || !p.id.startsWith('seg-')) e.push('promoted_from.id 须为段 id（seg- 开头）');
      if (!isStr(p.session)) e.push('promoted_from.session 须为非空字符串');
      if (!Number.isInteger(p.seq)) e.push('promoted_from.seq 须为整数');
      if (!isStr(p.at)) e.push('promoted_from.at 须为非空字符串（ISO）');
      if (p.replay !== undefined && p.replay !== 'manual') e.push('promoted_from.replay 只允许 "manual"');
      if (p.replay === 'manual' && !isStr(p.replay_at)) e.push('promoted_from.replay_at 须为非空字符串');
      if (p.replay === undefined && p.replay_at !== undefined) e.push('没有 replay 不得写 replay_at');
      const replaySource = store === 'canon' && r.source && r.source.type === '复现';
      if (replaySource && p.replay !== 'manual') e.push('source.type=复现 必须带 promoted_from.replay="manual"（段里没有成败，不能代核）');
      if (p.replay !== undefined && !replaySource) e.push('promoted_from.replay 仅用于 canon 且 source.type=复现');
    }
  }
  return e;
}

export function checkAll(opts = {}) {
  const report = { ok: true, errors: [], stores: {} };
  const loaded = {};
  for (const name of STORES) {
    const { records, errors } = loadStore(name, (opts.files && opts.files[name]) || storePath(name));
    loaded[name] = records;
    const ids = new Set(); const dups = [];
    let ok = 0;
    records.forEach((r, i) => {
      const errs = validateRecord(name, r);
      if (errs.length) report.errors.push({ store: name, index: i, id: r.id, errors: errs });
      else ok += 1;
      if (isStr(r.id)) { if (ids.has(r.id)) dups.push(r.id); ids.add(r.id); }
    });
    errors.forEach(x => report.errors.push({ store: name, ...x }));
    if (dups.length) report.errors.push({ store: name, errors: ['重复 id：' + dups.join(', ')] });
    for (const e of checkSupersedes(name, records)) report.errors.push(e);
    for (const e of checkRetires(name, records)) report.errors.push(e);
    report.stores[name] = { total: records.length, ok, current: currentRecords(records).length, retired: retiredIds(records).size, loadErrors: errors.length };
  }
  // wave2 §1：升格跨库核对。没有 promoted_from 且会话文件不存在 → 不读。
  // 文件在则整次只读一次（段 id 集合 + promotion 标记）；坏行报错；绝不打开 zstd 原档。
  const sessionFile = opts.sessionFile !== undefined ? opts.sessionFile : join(DATA, 'session.jsonl');
  for (const err of checkPromotions(loaded, sessionFile)) report.errors.push(err);
  report.ok = report.errors.length === 0;
  return report;
}

/** 升格三向 + 会话文件缺失/坏行。纯核对，不读 ptr、不打开归档。 */
export function checkPromotions(loaded, sessionFile) {
  const out = [];
  const promoted = [];
  for (const name of STORES) {
    for (const r of loaded[name] ?? []) {
      if (!r || !r.promoted_from || r.retires) continue;
      promoted.push({ store: name, rec: r });
    }
  }
  const present = existsSync(sessionFile);
  if (!promoted.length && !present) return out;
  if (promoted.length && !present) {
    out.push({ store: 'session', code: 'promotion-session-missing', errors: ['有升格记录但 session.jsonl 不存在：' + sessionFile] });
    return out;
  }
  const parsed = parseJsonl(readFileSync(sessionFile, 'utf8'));
  for (const err of parsed.errors) out.push({ store: 'session', code: 'bad-jsonl', ...err, errors: [err.error] });
  const segIds = new Set();
  const marks = [];
  for (const r of parsed.records) {
    if (!r || typeof r !== 'object') continue;
    if (r.kind === 'promotion') marks.push(r);
    else if (isStr(r.id)) segIds.add(r.id);
  }
  const markKey = new Set();
  for (const m of marks) {
    const to = m.promoted_to;
    if (!to || !STORES.includes(to.store) || !isStr(to.id) || !isStr(m.seg)) {
      out.push({ store: 'session', id: m.id, code: 'promotion-dangling', errors: ['promotion 标记不完整：' + (m.id ?? '?')] });
      continue;
    }
    const ids = new Set((loaded[to.store] ?? []).map((r) => r && r.id).filter(Boolean));
    if (!ids.has(to.id)) out.push({ store: 'session', id: m.id, code: 'promotion-dangling', errors: [`标记指向不存在的记录 ${to.store}/${to.id}`] });
    markKey.add(to.store + '\0' + to.id + '\0' + m.seg);
  }
  const covered = (store, rec) => {
    const byId = new Map((loaded[store] ?? []).filter((r) => r && r.id).map((r) => [r.id, r]));
    let cur = rec;
    const seen = new Set();
    while (cur && cur.id && !seen.has(cur.id)) {
      seen.add(cur.id);
      if (markKey.has(store + '\0' + cur.id + '\0' + rec.promoted_from.id)) return true;
      cur = cur.supersedes ? byId.get(cur.supersedes) : null;
    }
    return false;
  };
  for (const { store, rec } of promoted) {
    const from = rec.promoted_from;
    if (!from || !isStr(from.id) || !segIds.has(from.id)) {
      out.push({ store, id: rec.id, code: 'promotion-source-missing', errors: ['promoted_from 指向不存在的段：' + (from && from.id)] });
    }
    if (!covered(store, rec)) {
      out.push({ store, id: rec.id, code: 'promotion-unmarked', errors: ['有 promoted_from 但没有 promotion 标记：' + rec.id] });
    }
  }
  return out;
}

const LOOKUP_FIELDS = {
  canon: ['claim', 'tags'],
  mirror: ['situation', 'behavior', 'outcome', 'social_reaction', 'emotion', 'story'],
  orphan: ['summary', 'observed', 'hypothesis'],
  pricing: ['behavior'],
  lexicon: ['term', 'trigger', 'behavior', 'resolution'],
  frontier: ['title', 'note', 'topic', 'supports']
};

// 检索计分（2026-10-07 检索退化修复，对应 orphan-brief-phrase-miss-20261007）：
// 整词命中 ×1；含中文且 ≥3 字的词追加相邻二字（bigram）回退 ×0.25——治「词组未原样出现 → 零命中」。
// 2 字词与纯 ASCII 词的行为与旧版一致。
const CJK_RE = /[\u4e00-\u9fff]/;
const TOKEN_SPLIT_RE = /[\s,，、|]+/;
export function tokenize(q) {
  return String(q || '').toLowerCase().split(TOKEN_SPLIT_RE).filter(Boolean);
}
/** 计分零件（2026-10-07 复查）：whole＝整词命中次数（每次 ×1）；fb＝中文回退贡献（单 token 封顶 0.9，仅 ≥3 字 CJK 词）。 */
export function matchParts(hayL, token) {
  const t = String(token || '').toLowerCase();
  if (!t) return { whole: 0, fb: 0 };
  let whole = 0;
  let idx = hayL.indexOf(t);
  while (idx !== -1) { whole += 1; idx = hayL.indexOf(t, idx + t.length); }
  let fb = 0;
  if (t.length >= 3 && CJK_RE.test(t)) {
    let bg = 0;
    for (let i = 0; i < t.length - 1; i += 1) {
      const g = t.slice(i, i + 2);
      if (!CJK_RE.test(g)) continue;
      let j = hayL.indexOf(g);
      while (j !== -1) { bg += 1; j = hayL.indexOf(g, j + g.length); }
    }
    fb = Math.min(bg * 0.25, 0.9);
  }
  return { whole, fb };
}
export function matchScore(hayL, token) { const p = matchParts(hayL, token); return p.whole + p.fb; }
/** 记录级计分（2026-10-07 复查）：Σ整词 ×1 + min(Σ回退, 0.9)
 *  ⇒ **记录分 ≥1 ⟺ 至少一次整词命中**（口径承诺：多 token 弱回退叠加不得越过 1；此前「回退 <1」只按单 token 成立）。 */
export function scoreTokens(hayL, tokens) {
  let whole = 0;
  let fb = 0;
  for (const t of tokens) { const p = matchParts(hayL, t); whole += p.whole; fb += p.fb; }
  return { whole, fb, score: whole + Math.min(fb, 0.9) };
}

// 情绪 tip（2026-10-07；wave3 起 arousal 主进 rankFactors.severity，避免与乘子双计）。
// emotionBoost 仍保留：旧测试与「只要 tip 不要整套因子」的调用方；brief 排序改走 rankFactors，
// 负价只留 +0.25 tip（教训优先），不再把 arousal 加进 base。
export function emotionBoost(r) {
  const arousal = typeof r.arousal === 'number' ? r.arousal : 0;
  const negative = typeof r.valence === 'number' && r.valence < 0 ? 0.25 : 0;
  return +(arousal * 0.5 + negative).toFixed(3);
}
/** brief 用的负价 tip（不含 arousal，arousal 已进严重度乘子）。 */
export function valenceTip(r) {
  return typeof r?.valence === 'number' && r.valence < 0 ? 0.25 : 0;
}

// 时间过滤（2026-10-07）：时间戳 = event_time（事件时间，优先）|| logged_at（记录时间，ISO UTC）。
// 带过滤参数时，无时间戳的条目被排除；比较按日期级字符串（UTC 口径）。
function tsOf(r) { return r.event_time || r.logged_at || null; }
function inRange(r, since, until) {
  if (!since && !until) return true;
  const ts = tsOf(r);
  if (!ts) return false;
  const day = String(ts).slice(0, 10);
  if (since && day < String(since).slice(0, 10)) return false;
  if (until && day > String(until).slice(0, 10)) return false;
  return true;
}

/** 日期参数归一（接受 YYYY-MM-DD 或 ISO 8601；一律按 UTC 取日）。返回 {ok:true, day}|{ok:false, error}。 */
export function normalizeDateArg(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return { ok: true, day: null };
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].+)?$/.exec(raw);
  if (!m) return { ok: false, error: `非法日期：${raw}（应为 YYYY-MM-DD 或 ISO 8601，含时区按 UTC 归一）` };
  const day = `${m[1]}-${m[2]}-${m[3]}`;
  const probe = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(probe.getTime()) || probe.toISOString().slice(0, 10) !== day) return { ok: false, error: `非法日期：${raw}` };
  if (raw.length > 10) {
    const t = new Date(raw);
    if (Number.isNaN(t.getTime())) return { ok: false, error: `非法日期：${raw}` };
    return { ok: true, day: t.toISOString().slice(0, 10) };
  }
  return { ok: true, day };
}

/** 日期三分（单条）：in=范围内 / out=范围外 / undated=无戳（无法定年，不参与"该时段发生了什么"判断）；附 timeSource。 */
export function dateBucket(r, { since, until } = {}) {
  const hasEvt = !!r.event_time;
  const ts = tsOf(r);
  const src = ts ? (hasEvt ? 'event_time' : 'logged_at') : null;
  if (!since && !until) return { bucket: 'in', timeSource: src };
  if (!ts) return { bucket: 'undated', timeSource: null };
  const day = String(ts).slice(0, 10);
  if (since && day < String(since).slice(0, 10)) return { bucket: 'out', timeSource: src };
  if (until && day > String(until).slice(0, 10)) return { bucket: 'out', timeSource: src };
  return { bucket: 'in', timeSource: src };
}

/** 全库日期覆盖统计（供 cross/brief 的"日期未知"提示；与关键词无关的粗口径）。 */
export function dateCoverageStats({ since, until } = {}) {
  const stats = { undated: 0, excluded: 0, total: 0 };
  if (!since && !until) return stats;
  for (const name of STORES) {
    const { records } = loadStore(name);
    for (const r of currentRecords(records)) {
      stats.total += 1;
      const b = dateBucket(r, { since, until });
      if (b.bucket === 'undated') stats.undated += 1;
      else if (b.bucket === 'out') stats.excluded += 1;
    }
  }
  return stats;
}

// 对位比较的主行（每条记录“说什么”的那一行，不截断）。
const PRIMARY_LINE = {
  canon: (r) => String(r.claim ?? ''),
  mirror: (r) => `${r.situation ?? ''} → ${r.behavior ?? ''}`,
  orphan: (r) => String(r.summary ?? ''),
  pricing: (r) => String(r.behavior ?? ''),
  lexicon: (r) => `${r.term ?? ''}：${r.behavior ?? ''}`,
  frontier: (r) => String(r.title ?? '')
};

// 对位比较：把同一主题词在六库里的命中**全部**摆在一起（按库分组、当前版本、主行不截断）。
export function cross(query, opts = {}) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return { query: '', groups: [], total: 0, hint: '请给一个主题词（如：重启 / 记忆 / 来源态）。' };
  const tokens = tokenize(q);
  const groups = [];
  const rankOpts = loadBalanceEnabled(opts) ? { ...opts, usageWindow: opts.usageWindow || resolveUsageWindow(opts) } : opts;
  for (const name of STORES) {
    const records = recordsOf(name, opts);
    const creds = credibilityMap(name, records, opts);
    const hits = [];
    for (const r of currentRecords(records)) {
      const cred = creds.get(r.id);
      if (cred && cred.refuted && !opts.includeRefuted) continue;
      if (!inRange(r, opts.since, opts.until)) continue;
      const hay = (LOOKUP_FIELDS[name] || [])
        .map(f => (Array.isArray(r[f]) ? r[f].join(' ') : (r[f] || '')))
        .join(' | ');
      const hayL = hay.toLowerCase();
      const sc = scoreTokens(hayL, tokens);
      if (sc.score > 0) {
        const strong = name !== 'orphan' && sc.whole >= 1;
        const rf = applyRank(sc.score, name, r, cred, { ...rankOpts, strong });
        hits.push({
          id: r.id, score: sc.score, strong, zeroWeight: name === 'orphan', line: PRIMARY_LINE[name] ? PRIMARY_LINE[name](r) : hay,
          rank: rf.rank, factor: rf.factor, severity: rf.severity, complexity: rf.complexity, factorApplied: rf.factorApplied, balance: rf.balance,
          tier: cred ? cred.tier : null, displayTier: cred ? cred.displayTier : null, stale: !!(cred && cred.stale), refuted: !!(cred && cred.refuted)
        });
      }
    }
    hits.sort((a, b) => b.rank - a.rank || b.score - a.score);
    const items = opts.perStore ? hits.slice(0, opts.perStore) : hits;
    if (items.length) groups.push({ store: name, total: hits.length, items });
  }
  const total = groups.reduce((n, g) => n + g.total, 0);
  const multi = groups.filter(g => g.total >= 2).map(g => `${g.store}×${g.total}`);
  const hint = multi.length
    ? `同题多源：${multi.join('、')}——对位时若见矛盾：不合并；矛盾留档用「孤案」（orphan add），定论用「修订链」（revise）。`
    : null;
  return { query: q, groups, total, hint };
}

// —— 可信度（wave2 §3）——
// 不新增存储字段。层级由根版 source.type 起步，沿修订链应用 verification；过期只降展示层。
// 系数只进排序权重与命中行标签，不改 strong / weak（strong 仍是整词命中 ≥ 1；孤案仍 zeroWeight）。
export const TIER_OF_SOURCE = Object.freeze({ '复现': 'T1', '实验': 'T2', '官方': 'T3', '他人': 'T4', '共识': 'T5' });
export const TIER_WEIGHT = Object.freeze({ T1: 1, T2: 0.9, T3: 0.8, T4: 0.65, T5: 0.5 });
export const VERIFY_KINDS = Object.freeze(['replay', 'experiment', 'doc', 'incident', 'refute']);
export const CRED_DEFAULTS = Object.freeze({ snapshotDays: 90, evergreenDays: 180, verifyUsageMin: 3 });
const TIER_ORDER = Object.freeze({ T1: 1, T2: 2, T3: 3, T4: 4, T5: 5 });
const ORDER_TIER = Object.freeze(['', 'T1', 'T2', 'T3', 'T4', 'T5']);
const SNAPSHOT_ID_RE = /-(\d{8})$/;

const credDay = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : '');
const credAge = (a, b) => Math.floor((Date.parse(b) - Date.parse(a)) / 86400000);
const betterTier = (a, b) => (!a ? b : (TIER_ORDER[a] <= TIER_ORDER[b] ? a : b));
const dropTier = (t) => (t ? ORDER_TIER[Math.min(5, TIER_ORDER[t] + 1)] : null);

function chainEndingAt(records, rec) {
  const byId = new Map(records.filter((r) => isStr(r.id)).map((r) => [r.id, r]));
  const chain = [];
  let c = rec;
  const seen = new Set();
  while (c && isStr(c.id) && !seen.has(c.id)) {
    seen.add(c.id);
    chain.unshift(c);
    c = isStr(c.supersedes) ? byId.get(c.supersedes) : null;
  }
  return chain;
}

/**
 * 一条链（根在前）的可信度。纯函数。
 * opts.today（YYYY-MM-DD，缺省 UTC 今天）、snapshotDays、evergreenDays。
 * 返回 { tier（存储层，排序用）, displayTier（展示层，过期降一档）, weight, refuted, stale, cls, anchor, steps }。
 * 升格没有加成：promoted_from 不参与，层级就是 source.type + verification。
 */
export function credibilityOf(store, chain, opts = {}) {
  const rows = Array.isArray(chain) ? chain.filter((r) => r && typeof r === 'object') : [];
  const today = credDay(opts.today) || new Date().toISOString().slice(0, 10);
  const steps = [];
  let tier = null;
  let refuted = false;
  rows.forEach((rec, i) => {
    const why = [];
    const type = rec.source && rec.source.type;
    const prevType = i > 0 && rows[i - 1].source ? rows[i - 1].source.type : undefined;
    if (TIER_OF_SOURCE[type] && (i === 0 || type !== prevType)) {
      tier = TIER_OF_SOURCE[type];
      why.push('source.type=' + type);
    }
    const v = rec.verification;
    const isRevision = isStr(rec.supersedes);
    if (v && typeof v === 'object' && isRevision && VERIFY_KINDS.includes(v.kind)) {
      if (v.kind === 'replay') { tier = 'T1'; refuted = false; }
      else if (v.kind === 'experiment') { tier = betterTier(tier, 'T2'); refuted = false; }
      else if (v.kind === 'doc') { tier = betterTier(tier, 'T3'); refuted = false; }
      else if (v.kind === 'refute') refuted = true;
      why.push('verification.' + v.kind);
    }
    steps.push({ id: rec.id ?? null, tier, refuted, why: why.join(' → ') || '沿用上一版' });
  });
  const root = rows[0] || {};
  const tip = rows[rows.length - 1] || {};
  const rootId = isStr(root.id) ? root.id : '';
  let cls = 'evergreen';
  if (rows.some((r) => isProtocolId(r.id))) cls = 'protocol';
  else if (store === 'frontier') cls = 'frontier';
  else if (SNAPSHOT_ID_RE.test(rootId)) cls = 'snapshot';
  let stale = false;
  let anchor = null;
  let limit = null;
  if (cls === 'snapshot') {
    anchor = credDay(tip.last_reviewed);
    limit = Number.isInteger(opts.snapshotDays) ? opts.snapshotDays : CRED_DEFAULTS.snapshotDays;
    stale = !!anchor && credAge(anchor, today) > limit;
  } else if (cls === 'frontier') {
    anchor = credDay(tip.next_review);
    stale = !!anchor && anchor <= today;
  } else if (cls === 'evergreen') {
    const marks = rows
      .filter((r) => r.verification && r.verification.kind !== 'incident')
      .map((r) => credDay(r.verification.at))
      .filter(Boolean)
      .sort();
    const lastV = marks.length ? marks[marks.length - 1] : '';
    const reviewed = credDay(tip.last_reviewed);
    anchor = lastV > reviewed ? lastV : (reviewed || null);
    limit = Number.isInteger(opts.evergreenDays) ? opts.evergreenDays : CRED_DEFAULTS.evergreenDays;
    stale = !!anchor && credAge(anchor, today) > limit;
  }
  const displayTier = stale ? dropTier(tier) : tier;
  const weight = refuted ? 0 : (tier ? TIER_WEIGHT[tier] : 1);
  return {
    tier, displayTier, weight, refuted, stale, cls, anchor, limitDays: limit, today, steps,
    label: [displayTier, refuted ? 'refuted' : '', stale ? '待复核' : ''].filter(Boolean).join(' ')
  };
}

// —— 排序补齐（wave3 · 严重度 × 可信度 × 复杂度）——
// 只进排序 / 展示，不改存储。不新增字段：用已有 severity / severity_default / valence / arousal。
// strong / weak 仍只看 scoreTokens 整词命中；孤案仍 zeroWeight。时间仍只做 --since/--until 门与有效期门。
// A1 检索负载均衡（research/weight-internalization-pid）：默认关闭；开启后只乘校正项，不改语义/不删条。
export const LOAD_BALANCE_DEFAULTS = Object.freeze({
  windowMs: 7 * 24 * 3600 * 1000, // 近期窗口（缺省 7 天）
  kP: 1,            // 超配额衰减强度（防垄断）
  kExplore: 0.25,   // 长期零引用 + 弱命中的探索加成上限
  kD: 0.5,          // 集中度恶化斜率的刹车强度
  slopeThresh: 0.05,// HHI 斜率超过此值才激活 D 项
  minCorrection: 0.25,
  maxCorrection: 1.5
});
export const RANK_DEFAULTS = Object.freeze({ loadBalance: false });
/** 类别模板：由 credibilityOf.cls 选定。协议条强制 sev/cpx = 1（不让 arousal 抬协议）。 */
export const RANK_TEMPLATES = Object.freeze({
  protocol: Object.freeze({ severityScale: 0, complexityScale: 0, label: 'protocol' }),
  snapshot: Object.freeze({ severityScale: 1, complexityScale: 1, label: 'snapshot' }),
  frontier: Object.freeze({ severityScale: 1, complexityScale: 1, label: 'frontier' }),
  evergreen: Object.freeze({ severityScale: 1, complexityScale: 1, label: 'evergreen' })
});
const ORPHAN_SEV = Object.freeze({ '高': 1, '中': 0.75, '低': 0.5 });
const clamp01 = (n) => Math.max(0, Math.min(1, n));
/** arousal → [0.5, 1]：缺省不压到 0，避免「没写 arousal」被当成最不严重。 */
const arousalUnit = (a) => 0.5 + 0.5 * clamp01(a);

/**
 * 从已有字段读严重度 / 复杂度（纯函数；不写库）。
 * severity：orphan.severity → pricing.severity_default/5 → arousal 映射 → 1。
 * complexity：无独立字段。若严重度已来自显式 severity 且有 arousal，则 arousal 当复杂度代理；
 *            若严重度已来自 arousal，复杂度固定 1（避免同一信号乘两次）。否则 1。
 * valence 负价不进乘子（仍由 brief 行首 ⚠ / 小幅 tip 表达）；不改 strong。
 */
export function severityComplexityOf(store, r) {
  const rec = r && typeof r === 'object' ? r : {};
  let severity = 1;
  let severityFrom = 'default';
  if (store === 'orphan' && ORPHAN_SEV[rec.severity] != null) {
    severity = ORPHAN_SEV[rec.severity];
    severityFrom = 'severity';
  } else if (store === 'pricing' && Number.isInteger(rec.severity_default) && rec.severity_default >= 1 && rec.severity_default <= 5) {
    severity = rec.severity_default / 5;
    severityFrom = 'severity_default';
  } else if (typeof rec.arousal === 'number' && Number.isFinite(rec.arousal)) {
    severity = +arousalUnit(rec.arousal).toFixed(4);
    severityFrom = 'arousal';
  }
  let complexity = 1;
  let complexityFrom = 'default';
  if (severityFrom !== 'arousal' && typeof rec.arousal === 'number' && Number.isFinite(rec.arousal)) {
    complexity = +arousalUnit(rec.arousal).toFixed(4);
    complexityFrom = 'arousal';
  }
  return { severity, complexity, severityFrom, complexityFrom };
}

/**
 * 排序因子：factor = credibility × severity' × complexity'（模板缩放后）。
 * cred 缺省按 weight=1、cls=evergreen。refuted → factor 0。
 * A1 负载均衡不在这里乘——见 applyRank / loadBalanceCorrection（正交、可关）。
 */
export function rankFactors(store, r, cred = null, opts = {}) {
  const c = cred && typeof cred === 'object' ? cred : { weight: 1, cls: 'evergreen', refuted: false, tier: null };
  const tpl = RANK_TEMPLATES[c.cls] || RANK_TEMPLATES.evergreen;
  const sc = severityComplexityOf(store, r);
  const severity = tpl.severityScale === 0 ? 1 : +(1 + (sc.severity - 1) * tpl.severityScale).toFixed(4);
  const complexity = tpl.complexityScale === 0 ? 1 : +(1 + (sc.complexity - 1) * tpl.complexityScale).toFixed(4);
  const credibility = c.refuted ? 0 : (typeof c.weight === 'number' ? c.weight : 1);
  const factor = +(credibility * severity * complexity).toFixed(6);
  return {
    credibility, severity, complexity, factor,
    severityFrom: sc.severityFrom, complexityFrom: sc.complexityFrom,
    template: tpl.label, tier: c.tier ?? null, cls: c.cls ?? null
  };
}

const hhiOf = (counts) => {
  const vals = [...counts.values()].filter((n) => n > 0);
  const total = vals.reduce((a, b) => a + b, 0);
  if (!total) return 0;
  return vals.reduce((s, n) => s + (n / total) ** 2, 0);
};

/**
 * 从 hooks 记录建用量窗口（纯函数可测）。
 * 只统计 kind:"usage" 的 ids（与 metrics 同源）。opts.windowMs / nowMs。
 * 返回 { byId, total, distinct, quota, hhi, hhiOld, hhiNew, slope, windowMs, missing }。
 */
export function usageWindowFromRecords(records, opts = {}) {
  const windowMs = Number.isFinite(opts.windowMs) ? opts.windowMs : LOAD_BALANCE_DEFAULTS.windowMs;
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const start = nowMs - windowMs;
  const mid = start + windowMs / 2;
  const byId = new Map();
  const old = new Map();
  const neu = new Map();
  let total = 0;
  for (const rec of records ?? []) {
    if (!rec || rec.kind !== 'usage' || !Array.isArray(rec.ids)) continue;
    const ts = rec.ts ? Date.parse(rec.ts) : NaN;
    const t = Number.isFinite(ts) ? ts : nowMs; // 无戳 → 算进窗口（宽口径，不夸大饿死）
    if (t < start || t > nowMs) continue;
    for (const raw of rec.ids) {
      const id = String(raw ?? '');
      if (!id) continue;
      byId.set(id, (byId.get(id) ?? 0) + 1);
      total += 1;
      if (t < mid) old.set(id, (old.get(id) ?? 0) + 1);
      else neu.set(id, (neu.get(id) ?? 0) + 1);
    }
  }
  const distinct = byId.size;
  const quota = total / Math.max(1, distinct);
  const hhiOld = hhiOf(old);
  const hhiNew = hhiOf(neu);
  return {
    byId, total, distinct, quota: +quota.toFixed(4),
    hhi: +hhiOf(byId).toFixed(6),
    hhiOld: +hhiOld.toFixed(6), hhiNew: +hhiNew.toFixed(6),
    slope: +(hhiNew - hhiOld).toFixed(6),
    windowMs, missing: false
  };
}

/** 读 hooks 日志建窗口；文件缺失 → missing:true、空窗口（不假装有引用）。 */
export function usageWindowFromLog(logPath, opts = {}) {
  const file = logPath || join(ROOT, 'logs', 'hooks.jsonl');
  if (!existsSync(file)) {
    return { byId: new Map(), total: 0, distinct: 0, quota: 0, hhi: 0, hhiOld: 0, hhiNew: 0, slope: 0, windowMs: opts.windowMs ?? LOAD_BALANCE_DEFAULTS.windowMs, missing: true };
  }
  const records = [];
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!raw.trim()) continue;
    try { records.push(JSON.parse(raw)); } catch { /* 坏行跳过 */ }
  }
  return usageWindowFromRecords(records, opts);
}

/** 解析本轮要用的用量窗口（可注入 usageWindow / usage Map / balanceLog）。 */
export function resolveUsageWindow(opts = {}) {
  if (opts.usageWindow && typeof opts.usageWindow === 'object') return opts.usageWindow;
  if (opts.usage instanceof Map) {
    const byId = opts.usage;
    let total = 0; for (const n of byId.values()) total += n;
    const distinct = [...byId.values()].filter((n) => n > 0).length;
    return {
      byId, total, distinct, quota: total / Math.max(1, distinct || 1),
      hhi: +hhiOf(byId).toFixed(6), hhiOld: 0, hhiNew: +hhiOf(byId).toFixed(6), slope: 0,
      windowMs: opts.windowMs ?? LOAD_BALANCE_DEFAULTS.windowMs, missing: false
    };
  }
  return usageWindowFromLog(opts.balanceLog || opts.log, opts);
}

/**
 * A1 校正（纯函数）：correction 乘在已有 rank 上。
 * - 超软配额（count > quota）→ 降（防垄断，P）
 * - 窗口内零引用且本命中为弱命中 → 探索加成（防饿死）
 * - 集中度斜率上升超阈 → 对超配额项再刹车（D；改善时不抖）
 * 不隐藏、不删条；与 credibility/pricing 正交。
 */
export function loadBalanceCorrection(id, opts = {}) {
  const p = { ...LOAD_BALANCE_DEFAULTS, ...(opts.params || {}) };
  const win = opts.window || { byId: new Map(), total: 0, distinct: 0, quota: 0, slope: 0 };
  const count = Number(opts.count ?? win.byId?.get?.(id) ?? 0) || 0;
  const quota = Math.max(win.quota || 0, 0);
  const strong = opts.strong === true;
  const reasons = [];
  let correction = 1;
  const error = count - quota;
  if (error > 0 && quota > 0) {
    const damp = 1 / (1 + p.kP * (error / quota));
    correction *= damp;
    reasons.push({ code: 'over-quota', count, quota, error: +error.toFixed(4), damp: +damp.toFixed(4) });
  }
  if (count === 0 && !strong) {
    const boost = 1 + p.kExplore;
    correction *= boost;
    reasons.push({ code: 'explore-zero-weak', boost });
  }
  const slope = Number(win.slope) || 0;
  if (slope > p.slopeThresh && error > 0) {
    const brake = 1 / (1 + p.kD * ((slope - p.slopeThresh) / p.slopeThresh));
    correction *= brake;
    reasons.push({ code: 'slope-brake', slope, thresh: p.slopeThresh, brake: +brake.toFixed(4) });
  }
  correction = Math.max(p.minCorrection, Math.min(p.maxCorrection, correction));
  return {
    enabled: true,
    id: String(id ?? ''),
    correction: +correction.toFixed(4),
    count, quota: +quota.toFixed(4), error: +error.toFixed(4),
    slope, reasons,
    params: { kP: p.kP, kExplore: p.kExplore, kD: p.kD, slopeThresh: p.slopeThresh, windowMs: win.windowMs ?? p.windowMs }
  };
}

export function loadBalanceEnabled(opts = {}) {
  return opts.loadBalance === true || RANK_DEFAULTS.loadBalance === true;
}

/** 词法分（及 brief 的 status/tip）× 排序因子 [× A1 校正]。孤案 / zeroWeight → 只用词法分。
 * factorApplied：因子是否乘进了 rank。孤案仍算出 factor/severity/complexity 供对照，但 rank=score，factorApplied=false。 */
export function applyRank(score, store, r, cred, opts = {}) {
  const f = rankFactors(store, r, cred, opts);
  const enabled = loadBalanceEnabled(opts);
  const base = { ...f, loadBalance: enabled, balance: { enabled: false, correction: 1 }, factorApplied: true };
  if (store === 'orphan' || opts.zeroWeight) {
    return { rank: +Number(score).toFixed(4), ...base, factorApplied: false };
  }
  let rank = Number(score) * f.factor;
  if (enabled) {
    const win = opts.usageWindow || resolveUsageWindow(opts);
    const bal = loadBalanceCorrection(r?.id, { window: win, strong: opts.strong === true, params: opts.balance });
    rank *= bal.correction;
    base.balance = bal;
  }
  return { rank: +rank.toFixed(4), ...base };
}

function recordsOf(name, opts = {}) {
  const file = (opts.files && opts.files[name]) || storePath(name);
  return loadStore(name, file).records;
}

/** 当前集 id → credibilityOf（链走到该条）。opts.today / files 透传。 */
export function credibilityMap(store, records, opts = {}) {
  const map = new Map();
  for (const r of currentRecords(records)) {
    if (!isStr(r.id)) continue;
    map.set(r.id, credibilityOf(store, chainEndingAt(records, r), opts));
  }
  return map;
}

/**
 * 睡眠待办用的可信度扫描（只读，不写库）。
 * - 当前集里被 refute 的 → kind:review code:refuted（提醒复审，不自动改）
 * - 存储层为 T5 且 hooks 日志 usage 引用链上 id 合计 ≥ verifyUsageMin（缺省 3）→ kind:verify-candidate
 * 日志缺失 = 引用数未知 → 不出 verify-candidate。
 */
export function credibilityTodos(opts = {}) {
  const today = credDay(opts.today) || new Date().toISOString().slice(0, 10);
  const min = Number.isInteger(opts.verifyUsageMin) ? opts.verifyUsageMin : CRED_DEFAULTS.verifyUsageMin;
  let usage = null;
  if (opts.usage instanceof Map) usage = opts.usage;
  else if (opts.log) {
    let text = '';
    try { text = readFileSync(opts.log, 'utf8'); } catch { text = ''; }
    if (text) {
      usage = new Map();
      for (const raw of text.split(/\r?\n/)) {
        if (!raw.trim()) continue;
        let rec; try { rec = JSON.parse(raw); } catch { continue; }
        if (rec && rec.kind === 'usage' && Array.isArray(rec.ids)) {
          for (const id of rec.ids) usage.set(String(id), (usage.get(String(id)) ?? 0) + 1);
        }
      }
    }
  }
  const items = [];
  for (const name of STORES) {
    const records = recordsOf(name, opts);
    for (const r of currentRecords(records)) {
      if (!isStr(r.id)) continue;
      const chain = chainEndingAt(records, r);
      const cred = credibilityOf(name, chain, { ...opts, today });
      if (cred.refuted) {
        items.push({ kind: 'review', code: 'refuted', store: name, id: r.id, count: 1, note: `${r.id} 被 verification.refute 标记：检索默认隐藏（--include-refuted 或 show 可见），权重 0；不自动改库` });
        continue;
      }
      if (usage && cred.tier === 'T5') {
        const n = chain.reduce((s, row) => s + (usage.get(row.id) ?? 0), 0);
        if (n >= min) items.push({ kind: 'verify-candidate', code: 'verify-candidate', store: name, id: r.id, count: n, note: `${r.id} 为 T5（共识）且被 usage 引用 ${n} 次（≥${min}）：只是提醒去验证，不自动改` });
      }
    }
  }
  items.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return items;
}

export function lookupDetailed(query, opts = {}) {
  const q = String(query || '').trim().toLowerCase();
  const stats = { dated: 0, undated: 0, undatedSamples: [], excluded: 0, timeSource: { event_time: 0, logged_at: 0 } };
  if (!q) return { hits: [], stats };
  const tokens = tokenize(q);
  const hits = [];
  const rankOpts = loadBalanceEnabled(opts) ? { ...opts, usageWindow: opts.usageWindow || resolveUsageWindow(opts) } : opts;
  for (const name of STORES) {
    const records = recordsOf(name, opts);
    const creds = credibilityMap(name, records, opts);
    for (const r of currentRecords(records)) {
      const cred = creds.get(r.id);
      if (cred && cred.refuted && !opts.includeRefuted) continue;
      const hay = (LOOKUP_FIELDS[name] || [])
        .map(f => (Array.isArray(r[f]) ? r[f].join(' ') : (r[f] || '')))
        .join(' | ');
      const hayL = hay.toLowerCase();
      const sc = scoreTokens(hayL, tokens);
      if (sc.score <= 0) continue; // 统计只看「关键词命中者」的日期归桶
      const b = dateBucket(r, opts);
      if (b.bucket === 'out') { stats.excluded += 1; continue; }
      if (b.bucket === 'undated') {
        stats.undated += 1; // 计数不随并入开关变（报告口径一致）
        if (!opts.includeUndated) {
          if (stats.undatedSamples.length < 3) stats.undatedSamples.push({ store: name, id: r.id, snippet: hay.slice(0, 60) });
          continue;
        }
      }
      if (b.timeSource) stats.timeSource[b.timeSource] += 1;
      if (b.bucket === 'in') stats.dated += 1;
      // strong 只看整词命中；严重度×可信度×复杂度只进 rank，不进 score。
      const strong = name !== 'orphan' && sc.whole >= 1;
      const rf = applyRank(sc.score, name, r, cred, { ...rankOpts, strong });
      const hit = {
        store: name, id: r.id, score: sc.score, strong, zeroWeight: name === 'orphan', snippet: redact(hay.slice(0, 120)),
        rank: rf.rank, factor: rf.factor, severity: rf.severity, complexity: rf.complexity, factorApplied: rf.factorApplied, balance: rf.balance,
        tier: cred ? cred.tier : null, displayTier: cred ? cred.displayTier : null, stale: !!(cred && cred.stale), refuted: !!(cred && cred.refuted)
      };
      if (b.bucket === 'undated') hit.undated = true;
      hits.push(hit);
    }
  }
  return { hits: hits.sort((a, b) => b.rank - a.rank || b.score - a.score).slice(0, 20), stats };
}

export function lookup(query, opts = {}) {
  return lookupDetailed(query, opts).hits;
}

// 主题简报：把「先查再答」从逐条 lookup 升级为按主题跨六库取料（带来源态与基石映射）。
const STATUS_WEIGHT = { '已实践': 3, '已复现': 2, '高引用': 1, '待验证': 0 };

function briefHit(store, r, score) {
  const base = { id: r.id, score, time: tsOf(r) ? String(tsOf(r)).slice(0, 10) : null, valence: typeof r.valence === 'number' ? r.valence : null, arousal: typeof r.arousal === 'number' ? r.arousal : null };
  if (store === 'canon') return { ...base, claim: r.claim, source: r.source && r.source.type, ref: r.source && r.source.ref, last_reviewed: r.last_reviewed };
  if (store === 'frontier') return { ...base, title: r.title, status: r.status, topic: r.topic, supports: Array.isArray(r.supports) ? r.supports : [], url: r.url };
  if (store === 'mirror') return { ...base, situation: r.situation, outcome: r.outcome, emotion: r.emotion };
  if (store === 'orphan') return { ...base, summary: r.summary, severity: r.severity };
  if (store === 'pricing') return { ...base, behavior: r.behavior, valence: r.valence, severity_default: r.severity_default };
  if (store === 'lexicon') return { ...base, term: r.term, resolution: r.resolution };
  return base;
}

export function brief(query, opts = {}) {
  const q = String(query || '').trim();
  if (!q) return { query: q, tokens: [], groups: [], note: '空查询：给一个主题词（多个词用空格分隔）。' };
  const tokens = tokenize(q);
  const perStore = Number.isInteger(opts.perStore) && opts.perStore > 0 ? opts.perStore : 3;
  const groups = [];
  const rankOpts = loadBalanceEnabled(opts) ? { ...opts, usageWindow: opts.usageWindow || resolveUsageWindow(opts) } : opts;
  for (const name of STORES) {
    const records = recordsOf(name, opts);
    const creds = credibilityMap(name, records, opts);
    const scored = [];
    for (const r of currentRecords(records)) {
      const cred = creds.get(r.id);
      if (cred && cred.refuted && !opts.includeRefuted) continue;
      if (!inRange(r, opts.since, opts.until)) continue;
      const hay = (LOOKUP_FIELDS[name] || [])
        .map(f => (Array.isArray(r[f]) ? r[f].join(' ') : (r[f] || '')))
        .join(' | ')
        .toLowerCase();
      const hayL = hay.toLowerCase();
      const sc = scoreTokens(hayL, tokens);
      if (sc.score > 0) scored.push({ r, cred, score: sc.score, strong: name !== 'orphan' && sc.whole >= 1, zeroWeight: name === 'orphan' });
    }
    // 排序 = (词法分 + frontier 状态 + 负价 tip) × (严重度 × 可信度 × 复杂度)。
    // arousal 进严重度乘子，不再加进 base（防双计）。过期不改存储层系数。strong 不看乘子。
    const weight = (x) => {
      if (x.zeroWeight || (x.cred && x.cred.refuted)) return 0;
      const base = x.score + (name === 'frontier' ? (STATUS_WEIGHT[x.r.status] ?? 0) : 0) + valenceTip(x.r);
      return applyRank(base, name, x.r, x.cred, { ...rankOpts, strong: x.strong }).rank;
    };
    scored.sort((a, b) => weight(b) - weight(a) || Number(b.strong) - Number(a.strong));
    if (scored.length) {
      groups.push({ store: name, total: scored.length, hits: scored.slice(0, perStore).map(x => {
        const base = x.score + (name === 'frontier' ? (STATUS_WEIGHT[x.r.status] ?? 0) : 0) + valenceTip(x.r);
        const rf = applyRank(base, name, x.r, x.cred, { ...rankOpts, strong: x.strong });
        return {
          ...briefHit(name, x.r, x.score), strong: x.strong, zeroWeight: x.zeroWeight,
          rank: rf.rank, factor: rf.factor, severity: rf.severity, complexity: rf.complexity, factorApplied: rf.factorApplied, balance: rf.balance,
          tier: x.cred ? x.cred.tier : null, displayTier: x.cred ? x.cred.displayTier : null,
          stale: !!(x.cred && x.cred.stale), refuted: !!(x.cred && x.cred.refuted)
        };
      }) });
    }
  }
  const strongHits = groups.reduce((n, g) => n + g.hits.filter((h) => h.strong).length, 0);
  let note;
  if (!groups.length) note = '六库无命中：换词再试；仍无 → 这是「确定不知道」，按协议标注来源态，不要编。';
  else if (!strongHits) note = '无强命中（整词命中为零；孤案为零权重，不算证据）：这是「确定不知道」，弱命中只是疑似相关，不要编。';
  else note = '强命中可标「记得·库内」（命中行带层级标签，如 T3；待复核只是展示）；弱命中（strong=false）、孤案（zeroWeight）与被 refute 的记录不算证据。层级系数只影响排序，不改变 strong。基石优先级 已实践 > 已复现 > 高引用 > 待验证。';
  return { query: q, tokens, groups, strongHits, note };
}

// 全库摘要：六库计数 + 各库最近 N 条（主行）+ frontier 状态分布 + 审计概要 + 最近写入。
// 「不带问题看一眼全库」的入口——kit 是开工动作、summary 是库自身全貌。
export function summary(opts = {}) {
  const per = Number.isInteger(opts.per) && opts.per > 0 ? opts.per : 3;
  const today = opts.today || new Date().toISOString().slice(0, 10);
  const stores = {};
  for (const name of STORES) {
    const cur = currentRecords(loadStore(name).records);
    stores[name] = {
      total: cur.length,
      recent: cur.slice(-per).reverse().map(r => ({
        id: r.id,
        event_time: r.event_time ?? null,
        line: String(PRIMARY_LINE[name] ? PRIMARY_LINE[name](r) : '').slice(0, 160)
      }))
    };
  }
  const s = stats();
  stores.frontier.by_status = s.frontier.by_status;
  const a = audit({ today });
  const p = pulse();
  return {
    at: new Date().toISOString(),
    today,
    stores,
    audit: { ok: a.ok, findings: a.findings.map(f => ({ level: f.level, code: f.code, count: f.detail.length })) },
    newest: p.newest ? { store: p.newest.store, id: p.newest.id, ageText: p.newest.ageText } : null
  };
}

// 直读一条：按 id 跨库取全文；命中**旧版本**时返回所查版本全文 + 附注链尾 id（不自动跳转；Letta「needle+expand」的 expand 最小形态）。
export function show(id, opts = {}) {
  const target = String(id || '').trim();
  if (!target) return { found: false, note: '给一个记录 id' };
  const stores = opts.store ? [opts.store] : STORES;
  for (const name of stores) {
    const records = loadStore(name, opts.file || storePath(name)).records;
    const credOf = (rec) => credibilityOf(name, chainEndingAt(records, rec), opts);
    const rec = currentRecords(records).find(r => r.id === target);
    if (rec) return { found: true, store: name, id: rec.id, record: rec, credibility: credOf(rec) };
    const old = records.find(r => r.id === target);
    if (old) {
      let tip = old;
      for (;;) { const next = records.find(r => r.supersedes === tip.id); if (!next) break; tip = next; }
      // 退役态优先判定（2026-10-08）：链尾被墓碑 retires 时，不能再提示「当前版本：<链尾>」——链尾本身也已退役。
      const tomb = records.find(r => r.retires === tip.id);
      if (tomb) {
        return {
          found: false, store: name, id: target, retired: true,
          note: `该 id 已退役（${tomb.retired_at || '时间未记'}）${tomb.retired_reason ? '：' + tomb.retired_reason : ''}——已不属于当前集（lookup / brief / cross / summary / audit / 列表均不再命中）；历史仍在库里可追溯。`,
          record: old, credibility: credOf(old),
        };
      }
      return { found: false, store: name, id: target, note: '该 id 为旧版本（record 字段＝所查版本全文，不会自动跳转）；当前版本：' + tip.id, record: old, credibility: credOf(old) };
    }
  }
  return { found: false, note: '六库均无此 id：' + target };
}

/** 镜像结构匹配（2026-10-07）：五元组字段计分（situation 权重 ×2）+ patterns 可选加权；返回 top N。 */
export function mirrorMatch(text, opts = {}) {
  const tokens = tokenize(text);
  if (!tokens.length) return [];
  const limit = Number.isInteger(opts.limit) && opts.limit > 0 ? opts.limit : 3;
  // wave1：解法 / 边界分层。mode 宽过滤（未分层条目总在）；role 严过滤（只要该层）。非法值直接报错，不静默放宽。
  const mode = opts.mode === undefined || opts.mode === null || opts.mode === '' ? 'all' : String(opts.mode);
  if (!MIRROR_MODES.includes(mode)) throw new Error('mode 须为 ' + MIRROR_MODES.join('/'));
  const role = opts.role === undefined || opts.role === null || opts.role === '' ? null : String(opts.role);
  if (role !== null && !MIRROR_ROLES.includes(role)) throw new Error('role 须为 ' + MIRROR_ROLES.join('/'));
  const keepRole = (r) => {
    const rr = MIRROR_ROLES.includes(r.role) ? r.role : null;
    if (role) return rr === role;
    if (mode === 'task') return rr !== 'boundary';
    if (mode === 'improve') return rr !== 'solution';
    return true;
  };
  const hits = [];
  for (const r of currentRecords(loadStore('mirror', opts.file || storePath('mirror')).records)) {
    if (!keepRole(r)) continue;
    const fields = [['situation', 2], ['behavior', 1], ['outcome', 1], ['social_reaction', 1], ['emotion', 1]];
    let score = 0;
    for (const [f, w] of fields) {
      const hay = String(r[f] ?? '').toLowerCase();
      for (const t of tokens) score += matchScore(hay, t) * w;
    }
    if (Array.isArray(r.patterns)) {
      for (const p of r.patterns) {
        const pl = String(p).toLowerCase();
        for (const t of tokens) if (pl.includes(t)) score += 2;
      }
    }
    if (score > 0) {
      hits.push({
        id: r.id, score: +score.toFixed(2), role: MIRROR_ROLES.includes(r.role) ? r.role : null,
        situation: r.situation ?? '', behavior: r.behavior ?? '', outcome: r.outcome ?? '',
        social_reaction: r.social_reaction ?? '', emotion: r.emotion ?? ''
      });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** 输出审计 v0（2026-10-07）：抽取疑似库 id → 存在性核对。
 * 只做可机检硬核：引用不存在的库 id = 编造嫌疑（unknownIds）；真实 id = 引用命中（ids，供使用计数线）。 */
const OUTPUT_ID_RE = /\b(canon|front|orphan|mirror|price|lex)-[a-z0-9][a-z0-9-]{4,}/gi;
export function auditText(text) {
  const s = String(text || '');
  const found = [...new Set((s.match(OUTPUT_ID_RE) || []).map((x) => x.toLowerCase()))];
  const all = new Set();
  for (const name of STORES) for (const r of loadStore(name).records) all.add(r.id);
  return {
    ids: found.filter((id) => all.has(id)),
    unknownIds: found.filter((id) => !all.has(id)),
    tagged: (s.match(/学过|接触过|记得·库内|搜到/g) || []).length
  };
}

/** 一条 hooks 记录里点名的库 id（usage.ids，以及 output/result/text 里的 id 形）。不读库。 */
export function recordCitedIds(rec) {
  if (!rec || typeof rec !== 'object') return [];
  const ids = [];
  const push = (id) => { if (typeof id === 'string' && id && !ids.includes(id)) ids.push(id); };
  if (Array.isArray(rec.ids)) for (const id of rec.ids) push(id);
  for (const key of ['output', 'result', 'text']) {
    if (typeof rec[key] !== 'string') continue;
    OUTPUT_ID_RE.lastIndex = 0;
    for (const m of rec[key].match(OUTPUT_ID_RE) || []) push(m.toLowerCase());
  }
  return ids;
}

// —— 召回失败信号（B2 · 2026-10 wave1；会话分区 wave1.1）——
// 双路召回（机械钩子 + 主动查库）漏掉的，只能事后从日志里认出来：某回合出了失败，而失败之前没有任何查库动作。
// 纯机械口径（代码做计数、语义判断留给模型/人）：
//   分区 = 会话 id（宿主真值：tool 线 `session` ← tools/result 的 exec.agent.id；turn-end ← session/event 的 session.id；
//          agent-error ← payload.agent.id——三者同为 DSH 的 SessionId，Agent 以其会话 id 为身份）。前缀 `session-` 归一。
//   窗口 = 同一会话内相邻两条 turn-end 之间；并发会话互不混窗。
//   旧日志兼容：不带 session 的行进「未归属」窗口 `*`（＝旧的全局口径）；任一 turn-end 同时关闭 `*` 窗口；
//          `*` 窗口里的召回对同期任何会话的失败都算数（无法证伪，按宽口径，不夸大漏召）。
//   召回 = 只读查库面成功调用（MCP mcp__akasha__<RECALL_TOOLS>，或 hooks 标注的 akasha CLI 查库子命令 akashaCli）；
//   失败 = 非记忆工具 ok:false 或 agent-error（记忆工具自身失败不算任务失败，也不算召回；gate-denied 不计）；
//   每窗口只看第一次失败：之前查过库 → recalledBefore；没查过 → miss（之后才查 → 另记 lateRecall）。
export const RECALL_TOOLS = Object.freeze(['akasha_lookup', 'akasha_brief', 'akasha_cross', 'akasha_kit', 'akasha_show', 'akasha_summary', 'akasha_mirror_match', 'akasha_session_lookup', 'akasha_frontier_due']);
export const RECALL_CLI = Object.freeze(['lookup', 'brief', 'cross', 'kit', 'show', 'summary', 'mirror-match', 'session-lookup', 'frontier-due']);
const MEMORY_PREFIX = 'mcp__akasha__';

/** 一条 hooks 记录是否为「召回」动作（纯函数）。 */
export function isRecallRecord(rec) {
  if (!rec || rec.kind !== 'tool' || rec.ok === false) return false;
  const tool = String(rec.tool ?? '');
  if (tool.startsWith(MEMORY_PREFIX)) return RECALL_TOOLS.includes(tool.slice(MEMORY_PREFIX.length));
  return typeof rec.akashaCli === 'string' && RECALL_CLI.includes(rec.akashaCli);
}

/** hooks 记录的会话分区键（纯函数）：裸会话 id；缺失 → '*'（未归属，旧日志）。 */
export function sessionKeyOf(rec) {
  const raw = typeof rec?.session === 'string' ? rec.session.trim() : '';
  return raw ? raw.replace(/^session-/, '') : '*';
}

/** 召回失败计数（纯函数；输入为已解析的 hooks 记录，按日志顺序；按会话分区）。 */
export function recallSignals(records) {
  const out = { failureTurns: 0, recalledBefore: 0, misses: 0, lateRecall: 0, missRate: 0, samples: [], sessions: 0, unattributed: 0 };
  const wins = new Map();  // key -> { recalled, failed, late, starRecall }
  const seen = new Set();
  const win = (k) => { let w = wins.get(k); if (!w) { w = { recalled: false, failed: null, late: false }; wins.set(k, w); } return w; };
  const close = (k) => {
    const w = wins.get(k);
    wins.delete(k);
    if (!w || !w.failed) return;
    out.failureTurns += 1;
    if (w.recalled) out.recalledBefore += 1;
    else {
      out.misses += 1;
      if (w.late) out.lateRecall += 1;
      if (out.samples.length < 5) out.samples.push(w.failed);
    }
  };
  for (const rec of records ?? []) {
    if (!rec || typeof rec !== 'object') continue;
    const k = sessionKeyOf(rec);
    if (rec.kind === 'turn-end') { close(k); if (k !== '*') close('*'); continue; }
    if (rec.kind !== 'tool' && rec.kind !== 'agent-error') continue;
    if (k === '*') out.unattributed += 1; else seen.add(k);
    if (isRecallRecord(rec)) {
      const w = win(k);
      if (w.failed) w.late = true; else w.recalled = true;
      if (k === '*') for (const [kk, ww] of wins) if (kk !== '*' && !ww.failed) ww.recalled = true; // 未归属召回：宽口径
      continue;
    }
    const isFail = (rec.kind === 'tool' && rec.ok === false && !String(rec.tool ?? '').startsWith(MEMORY_PREFIX)) || rec.kind === 'agent-error';
    if (!isFail) continue;
    const w = win(k);
    if (w.failed) continue;
    if (!w.recalled && k !== '*' && wins.get('*')?.recalled) w.recalled = true; // 同期未归属召回同样算数
    w.failed = { ts: rec.ts ?? null, what: rec.kind === 'agent-error' ? 'agent-error' : String(rec.tool ?? '?'), session: k === '*' ? null : k };
  }
  for (const k of [...wins.keys()]) close(k);
  out.sessions = seen.size;
  out.missRate = out.failureTurns ? +(out.misses / out.failureTurns).toFixed(3) : 0;
  return out;
}

/** 结果计数器 v0（2026-10-07）：hook 线 + 修订链统计 → 可机检指标。 */
export function metrics(opts = {}) {
  const logPath = opts.log || join(ROOT, 'logs', 'hooks.jsonl');
  const since = opts.since ? String(opts.since).slice(0, 10) : null;
  let lines = [];
  try { lines = readFileSync(logPath, 'utf8').split(/\r?\n/).filter(Boolean); } catch { lines = []; }
  const counters = { tools: 0, toolErrors: 0, denials: 0, agentErrors: 0, turnEnds: 0, sleeps: 0, wakeNotes: 0, outputAudits: 0, usageRefs: 0 };
  const toolErrorsByName = {}; const usageById = {};
  const memoryByName = {}; let memoryCalls = 0;
  const kept = [];
  for (const raw of lines) {
    let rec;
    try { rec = JSON.parse(raw); } catch { continue; }
    if (since && String(rec.ts || '').slice(0, 10) < since) continue;
    kept.push(rec);
    if (rec.kind === 'tool') {
      counters.tools += 1;
      const toolName = String(rec.tool ?? '?');
      if (toolName.startsWith('mcp__akasha__')) { memoryCalls += 1; memoryByName[toolName] = (memoryByName[toolName] ?? 0) + 1; }
      if (rec.ok === false) { counters.toolErrors += 1; toolErrorsByName[toolName] = (toolErrorsByName[toolName] ?? 0) + 1; }
    } else if (rec.kind === 'gate-denied') counters.denials += 1;
    else if (rec.kind === 'agent-error') counters.agentErrors += 1;
    else if (rec.kind === 'turn-end') counters.turnEnds += 1;
    else if (rec.kind === 'sleep-done') counters.sleeps += 1;
    else if (rec.kind === 'wake-note') counters.wakeNotes += 1;
    else if (rec.kind === 'output-audit') counters.outputAudits += 1;
    else if (rec.kind === 'usage' && Array.isArray(rec.ids)) {
      counters.usageRefs += rec.ids.length;
      for (const id of rec.ids) usageById[id] = (usageById[id] ?? 0) + 1;
    }
  }
  let revisions = 0; let longest = 0; let longestId = null;
  for (const name of STORES) {
    const recs = loadStore(name).records;
    const byId = new Map(recs.map((r) => [r.id, r]));
    for (const r of recs) {
      if (!r.supersedes) continue;
      revisions += 1;
      let d = 1; let cur = r;
      while (cur.supersedes && byId.has(cur.supersedes)) { cur = byId.get(cur.supersedes); d += 1; if (d > 5000) break; }
      if (d > longest) { longest = d; longestId = r.id; }
    }
  }
  return {
    at: new Date().toISOString(), since, counters,
    memoryTools: {
      calls: memoryCalls,
      share: +(memoryCalls / Math.max(1, counters.tools)).toFixed(3),
      perTurn: +(memoryCalls / Math.max(1, counters.turnEnds)).toFixed(2),
      byTool: memoryByName
    },
    recall: recallSignals(kept),
    topToolErrors: Object.entries(toolErrorsByName).sort((a, b) => b[1] - a[1]).slice(0, 5),
    topUsage: Object.entries(usageById).sort((a, b) => b[1] - a[1]).slice(0, 10),
    revisions: { count: revisions, longest, longestId }
  };
}

/** 到期复审只看当前版本（旧版 next_review 不报）。 */
export function frontierDue(today = new Date().toISOString().slice(0, 10)) {
  return currentRecords(loadStore('frontier').records).filter((r) => r.next_review && r.next_review <= today);
}

export function price({ severity, irreversibility, cost, good }) {
  const clamp = v => Math.min(5, Math.max(1, Math.round(Number(v) || 1)));
  const s = clamp(severity); const i = clamp(irreversibility); const c = clamp(cost);
  const raw = s * i * c;
  return {
    formula: '严重度 × 不可逆性 × 代价',
    severity: s, irreversibility: i, cost: c,
    price_raw: raw,
    arousal: +(raw / 125).toFixed(3),
    valence: good === true ? 1 : good === false ? -1 : 0
  };
}

export function stats() {
  const out = {};
  const cur = (name) => currentRecords(loadStore(name).records);
  const superseded = (name, current) => loadStore(name).records.length - current.length;
  const canon = cur('canon');
  out.canon = {
    total: canon.length,
    superseded: superseded('canon', canon),
    by_source: canon.reduce((m, r) => { const k = (r.source && r.source.type) || '?'; m[k] = (m[k] || 0) + 1; return m; }, {})
  };
  const mirrors = cur('mirror');
  out.mirror = { total: mirrors.length, superseded: superseded('mirror', mirrors) };
  const orphans = cur('orphan');
  out.orphan = {
    total: orphans.length,
    superseded: superseded('orphan', orphans),
    by_severity: orphans.reduce((m, r) => { m[r.severity] = (m[r.severity] || 0) + 1; return m; }, {})
  };
  const priceRows = cur('pricing');
  out.pricing = { total: priceRows.length, superseded: superseded('pricing', priceRows) };
  const lex = cur('lexicon');
  out.lexicon = { total: lex.length, superseded: superseded('lexicon', lex) };
  const fronts = cur('frontier');
  out.frontier = {
    total: fronts.length,
    superseded: superseded('frontier', fronts),
    by_status: fronts.reduce((m, r) => { m[r.status] = (m[r.status] || 0) + 1; return m; }, {})
  };
  return out;
}

/** 相对时间文本（纯函数）。 */
export function ageText(ms) {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '未知';
  const min = Math.floor(ms / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr} 小时前`;
  return `${Math.floor(hr / 24)} 天前`;
}

// 库脉搏（纯读）：六库计数 / 当前版本数 / 每库最后一条 id / 全库最近写入（含相对时间）。
// 「写→可见」通道的数据源：任何会话/脚本写入后，条子下一回合即可命名新内容（可立即 lookup/brief）。
export function pulse() {
  const stores = {};
  let newest = null;
  const now = Date.now();
  for (const name of STORES) {
    const file = storePath(name);
    const { records } = loadStore(name);
    let mtime = null;
    try { mtime = statSync(file).mtimeMs; } catch { /* 容缺 */ }
    const last = records.length ? records[records.length - 1] : null;
    stores[name] = { count: records.length, current: currentRecords(records).length, lastId: last ? last.id : null, mtime };
    if (mtime !== null && (newest === null || mtime > newest.mtime)) newest = { store: name, id: last ? last.id : null, mtime };
  }
  if (newest) { newest.ageMs = Math.max(0, now - newest.mtime); newest.ageText = ageText(newest.ageMs); }
  return { at: new Date().toISOString(), stores, newest };
}

// 机械审计（抽样审计的可机检部分）：到期复审 / 陈旧复核 / 重复链接 / 孤案积压。
export function audit(opts = {}) {
  const today = opts.today || new Date().toISOString().slice(0, 10);
  const days = (a, b) => Math.floor((Date.parse(b) - Date.parse(a)) / 86400000);
  const findings = [];

  const fronts = currentRecords(loadStore('frontier').records);
  const due = fronts.filter(r => r.next_review && r.next_review <= today);
  if (due.length) findings.push({ level: 'warn', code: 'frontier-due', detail: due.map(r => `${r.id}(${r.next_review})`) });

  const urls = new Map();
  for (const r of fronts) {
    if (!r.url) continue;
    if (!urls.has(r.url)) urls.set(r.url, []);
    urls.get(r.url).push(r.id);
  }
  const dupUrls = [...urls.entries()].filter(([, ids]) => ids.length > 1);
  if (dupUrls.length) findings.push({ level: 'info', code: 'duplicate-url', detail: dupUrls.map(([u, ids]) => `${ids.join(' = ')} @ ${u}`) });

  const canon = currentRecords(loadStore('canon').records);
  const stale = canon.filter(r => r.last_reviewed && days(r.last_reviewed, today) > 365);
  if (stale.length) findings.push({ level: 'warn', code: 'canon-stale', detail: stale.map(r => r.id) });

  const orphans = currentRecords(loadStore('orphan').records);
  const aging = orphans.filter(r => r.created && days(r.created, today) > 90);
  if (aging.length) findings.push({ level: 'info', code: 'orphan-aging', detail: aging.map(r => r.id) });

  for (const name of STORES) {
    const { errors } = loadStore(name);
    // 文件不存在（line 0）是空安装，不是损坏。只有解析失败的行才算丢行。
    const bad = errors.filter((e) => e.line > 0);
    if (bad.length) findings.push({ level: 'warn', code: 'bad-jsonl', detail: bad.map((e) => `${name}:${e.line}:${e.error}`) });
  }

  return { today, ok: findings.every(f => f.level !== 'warn'), findings, summary: stats() };
}

// 起床包：开工前一次装配——睡眠摘要 + 待办（inbox）+ 当前审计 + 库况 + 提示。
// stateFile / inboxFile 可注入（测试用）；默认读 logs\sleep-state.json 与 logs\inbox.jsonl。
export function kit(opts = {}) {
  const stateFile = opts.stateFile || join(ROOT, 'logs', 'sleep-state.json');
  const inboxFile = opts.inboxFile || join(ROOT, 'logs', 'inbox.jsonl');
  const readJson = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };
  const readLines = (f) => { try { return readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean); } catch { return []; } };

  const sleepState = readJson(stateFile);
  const sleep = sleepState ? {
    lastRunAt: sleepState.lastRunAt ?? null,
    trigger: sleepState.lastTrigger ?? null,
    todo: sleepState.lastTodo ?? 0,
    audit: sleepState.lastAudit ?? null,
    report: sleepState.lastReport ?? null,
    counters: sleepState.lastCounters ?? null
  } : null;

  const inboxLines = readLines(inboxFile);
  // 消费记账：promote 转正后向 inbox 追加 kind:"consumed"（带 upTo 行位）；
  // 待办只统计最后一条 consumed 之后的批次——已消费的历史批次不再重复计数（2026-10-07 修）
  const parsedInbox = inboxLines.map((l) => { try { return JSON.parse(l); } catch { return null; } });
  let consumedUpTo = 0;
  parsedInbox.forEach((rec, i) => {
    if (rec && rec.kind === 'consumed') {
      consumedUpTo = Number.isInteger(rec.upTo) ? Math.max(consumedUpTo, Math.min(rec.upTo, parsedInbox.length)) : Math.max(consumedUpTo, i + 1);
    }
  });
  let totalItems = 0;
  let latest = [];
  let pendingBatches = 0;
  for (let i = consumedUpTo; i < parsedInbox.length; i++) {
    const rec = parsedInbox[i];
    if (!rec) continue;
    const n = rec.items?.length ?? 0;
    if (n) { totalItems += n; pendingBatches += 1; latest = rec.items; }
  }
  const inbox = { batches: pendingBatches, totalItems, latest: latest.slice(0, 5) };

  const auditResult = audit({ today: opts.today });
  const review = {
    today: auditResult.today,
    ok: auditResult.ok,
    findings: auditResult.findings.map(f => ({ level: f.level, code: f.code, count: f.detail.length }))
  };

  const s = stats();
  const library = {
    canon: s.canon.total, mirror: s.mirror.total, orphan: s.orphan.total,
    pricing: s.pricing.total, lexicon: s.lexicon.total, frontier: s.frontier.total,
    frontier_by_status: s.frontier.by_status
  };

  const hints = [];
  if (!sleep) hints.push('睡眠从未运行：等待首个空闲（或 timer 兜底）触发，或检查 @akasha-book/sleep 是否激活。');
  if (inbox.totalItems > 0) hints.push(`待办 ${inbox.totalItems} 条（logs\\inbox.jsonl）：按「失败回查 / 孤案候选 / 召回复盘（recall-miss）」处理或转正式条目。`);
  for (const f of review.findings) if (f.level === 'warn') hints.push(`审计警告：${f.code} ×${f.count}（akasha_audit / akasha_frontier_due 可查明细）。`);
  hints.push('开工姿势：相关主题先 brief；事实性断言带来源态（学过 / 接触过 / 记得·库内 / 搜到）。');

  const historyItems = [];
  for (const name of STORES) {
    for (const r of currentRecords(loadStore(name).records)) {
      if (typeof r.valence === 'number' && r.valence < 0) {
        historyItems.push({
          store: name, id: r.id, valence: r.valence,
          arousal: typeof r.arousal === 'number' ? r.arousal : 0,
          line: String(PRIMARY_LINE[name] ? PRIMARY_LINE[name](r) : '').slice(0, 100)
        });
      }
    }
  }
  historyItems.sort((a, b) => b.arousal - a.arousal || a.valence - b.valence);
  const history = historyItems.slice(0, 3);

  return {
    at: new Date().toISOString(),
    protocol: '来源态四标签（学过 / 接触过 / 记得·库内 / 搜到）；无据的确定 ≪ 有据的不确定；编造比承认不知道更糟。',
    sleep, inbox, review, library, hints, history
  };
}

// 候选转正：把 sleep/inbox 的孤案候选（失败回查素材）机械落成孤案条目（零权重留档）。
// 幂等：id = code + 样本摘要（orphan-b<8hex>），已存在跳过；dry=true 只报不写。
export function promoteInbox(opts = {}) {
  const inboxFile = opts.inboxFile || join(ROOT, 'logs', 'inbox.jsonl');
  const storeFile = opts.storeFile;
  const today = opts.today || new Date().toISOString().slice(0, 10);
  const lines = (() => { try { return readFileSync(inboxFile, 'utf8').split(/\r?\n/).filter(Boolean); } catch { return []; } })();
  const existing = new Set(loadStore('orphan', storeFile).records.map(r => r.id));
  const promoted = []; const wouldPromote = []; const skipped = [];
  for (const line of lines) {
    let batch;
    try { batch = JSON.parse(line); } catch { continue; }
    for (const item of batch.items ?? []) {
      if (item.kind !== 'orphan-candidate') continue;
      const digest = createHash('md5').update(String(item.code ?? '?') + '|' + JSON.stringify(item.samples ?? item.note ?? '')).digest('hex').slice(0, 8);
      const id = `orphan-b${digest}`;
      if (existing.has(id)) { skipped.push(id); continue; }
      if (opts.dry) { wouldPromote.push(id); continue; }
      const rec = {
        id,
        summary: `[inbox候选] ${item.code ?? '?'} ×${item.count ?? 1}`,
        observed: String(item.note || (Array.isArray(item.samples) ? item.samples.join('；') : '')).slice(0, 500) || '（见 inbox.jsonl 对应批次）',
        hypothesis: '（待补：由 sleep 候选自动入库，待复盘）',
        would_confirm: '（待补）',
        would_refute: '（待补）',
        severity: item.code === 'agent-error' ? '中' : '低',
        created: today
      };
      appendRecord('orphan', rec, storeFile ? { file: storeFile } : {});
      existing.add(id);
      promoted.push(id);
    }
  }
  const consumed = promoted.length + skipped.length;
  // dry 只读不改：即使是 dry，也不得落消费记账（否则一次 dry 复检=整批待办静默消失，
  // 缺陷会被记录层抹掉——不得用 dry 试探未消费批次）。
  if (!opts.dry && consumed > 0) {
    // 消费记账：向 inbox 追加 consumed 行（upTo=本次读入的行数）——kit 的待办计数以此为界（2026-10-07 修）
    try {
      appendFileSync(inboxFile, JSON.stringify({ ts: new Date().toISOString(), kind: 'consumed', by: 'promote', count: promoted.length, skipped: skipped.length, upTo: lines.length }) + '\n', 'utf8');
    } catch { /* 记账失败不回滚转正：promote 幂等，重跑可补记 */ }
  }
  return { promoted, wouldPromote, skipped, dry: !!opts.dry, consumed: consumed > 0 };
}

// —— 修订链：append-only 之上的「追加式更正」——
// 约定：修订记录携带 supersedes:<被修订 id>；「当前版本」= 没有被任何记录 supersedes 的记录。
// 退役（2026-10-08）：墓碑记录携带 retires:<被退役 id>；被退役 id 及其墓碑都不进「当前集」——
// 于是 lookup / brief / summary / audit / stats 全部自动不再看见它（它们都走 currentRecords）。
export function currentRecords(records) {
  const superseded = new Set(records.map((r) => r.supersedes).filter((v) => typeof v === 'string' && v !== ''));
  const retired = new Set(records.map((r) => r.retires).filter((v) => typeof v === 'string' && v !== ''));
  return records.filter((r) => !superseded.has(r.id) && !retired.has(r.id) && !isStr(r.retires));
}

export function retiredIds(records) {
  return new Set(records.map((r) => r.retires).filter((v) => typeof v === 'string' && v !== ''));
}

// 历史 id 集合（含被 supersedes / 被退役 / 墓碑）：**幂等判重必须用它**。
// 2026-10-08 事故：某脚本用 currentRecords 判重 → 已退役 id 不在当前集 → 被重新追加（复活 + 重复 id）。
export function allIds(records) {
  return new Set(records.map((r) => r.id).filter((v) => typeof v === 'string' && v !== ''));
}

export function checkSupersedes(store, records) {
  const ids = new Set(records.map((r) => r.id));
  const errors = [];
  for (const r of records) {
    if (r.supersedes !== undefined && !ids.has(r.supersedes)) {
      errors.push({ store, id: r.id, errors: ['supersedes 指向不存在的 id：' + r.supersedes] });
    }
  }
  return errors;
}

// 追加一版修订：从任意链上版本出发都落到链尾的下一版；未打补丁的字段自动保留。
const PROTOCOL_ROOT = 'canon-akasha-usage';
export function isProtocolId(id) {
  const s = String(id ?? '');
  return s === PROTOCOL_ROOT || s.startsWith(PROTOCOL_ROOT + '-r');
}

export function revise(store, id, patch = {}, opts = {}) {
  if (!STORES.includes(store)) throw new Error('未知存储：' + store);
  if (isProtocolId(id) && !opts.allowProtocol) {
    throw new Error('拒绝修订 ' + id + '：该条渲染进系统提示。模型路径（MCP）不可改；人工确认后用 CLI --allow-protocol。');
  }
  const file = opts.storeFile || storePath(store);
  return withFileLock(file, () => reviseUnlocked(store, id, patch, { ...opts, file }));
}

function reviseUnlocked(store, id, patch, opts) {
  const records = loadStore(store, opts.file).records;
  const byId = new Map(records.map((r) => [r.id, r]));
  const found = byId.get(id);
  if (!found) throw new Error('找不到记录：' + id);
  let tip = found;
  for (;;) {
    const next = records.find((r) => r.supersedes === tip.id);
    if (!next) break;
    tip = next;
  }
  const chain = [tip];
  let cursor = tip;
  while (cursor.supersedes && byId.has(cursor.supersedes)) { cursor = byId.get(cursor.supersedes); chain.unshift(cursor); }
  const root = chain[0];
  const newId = `${root.id}-r${chain.length}`;
  if (byId.has(newId)) throw new Error('修订 id 冲突：' + newId);
  const next = { ...tip, ...patch, id: newId, supersedes: tip.id };
  // 修订 = 一次新写入：logged_at 不继承旧版（SCHEMA：修订链每行都有 ⇒「何时被改」可查）；补丁显式自带则保留
  if (patch.logged_at === undefined) delete next.logged_at;
  const errs = validateRecord(store, next);
  if (errs.length) throw new Error('校验失败：' + errs.join('；'));
  appendRecord(store, next, { file: opts.file, locked: true });
  return { store, id: newId, supersedes: tip.id, root: root.id };
}

export function checkRetires(store, records) {
  const ids = new Set(records.map((r) => r.id));
  const errors = [];
  for (const r of records) {
    if (r.retires !== undefined && !ids.has(r.retires)) {
      errors.push({ store, id: r.id, errors: ['retires 指向不存在的 id：' + r.retires] });
    }
  }
  return errors;
}

// 退役（2026-10-08，用户裁定）：把一条记录（及其整条修订链）移出「当前集」。
//   hard=false（默认）：追加墓碑记录（克隆链尾 + id 后缀 -retired + retires 指针）——append-only 不破，
//                        可追溯「谁在何时因何退役」，且不再出现在任何 currentRecords 视图里。
//   hard=true         ：把该 id 的整条链与墓碑行从文件里删掉，删前把被删行备份到 data/_trash/<日期>-<store>.jsonl。
// 返回值：{ store, id, retired, tombstone?, hard, removed?, trash? }
export function retireRecord(store, id, opts = {}) {
  if (!STORES.includes(store)) throw new Error('未知存储：' + store);
  const file = opts.file || storePath(store);
  // wave1：读→判→写整段持锁（此前硬删在锁外整文件重写——与并发 appendRecord 竞争时会吞掉新行）。
  return withFileLock(file, () => retireRecordUnlocked(store, id, opts, file));
}

function retireRecordUnlocked(store, id, opts, file) {
  const hard = opts.hard === true;
  const reason = typeof opts.reason === 'string' && opts.reason.trim() ? opts.reason.trim() : '';
  const records = loadStore(store, file).records;
  const byId = new Map(records.map((r) => [r.id, r]));
  if (!byId.has(id)) throw new Error('找不到记录：' + id);

  // 链尾（与 revise 同语义：从任意链上版本出发都落到链尾）
  let tip = byId.get(id);
  for (;;) {
    const next = records.find((r) => r.supersedes === tip.id);
    if (!next) break;
    tip = next;
  }
  // 已退役的判定只对「软退役」短路（2026-10-08 二次修复：硬删必须继续走下去——
  // 否则对已退役条目执行 --hard 会静默返回 already、什么也不删，复活出来的重复行就清不掉）。
  if (!hard && records.some((r) => r.retires === tip.id)) {
    return { store, id: tip.id, retired: tip.id, already: true, hard: false };
  }

  // 该 id 名下全部版本
  const chainIds = new Set([tip.id]);
  let cursor = tip;
  while (cursor.supersedes && byId.has(cursor.supersedes)) { cursor = byId.get(cursor.supersedes); chainIds.add(cursor.id); }

  if (hard) {
    const dropIds = new Set(chainIds);
    for (const r of records) if (r.retires && dropIds.has(r.retires)) dropIds.add(r.id);   // 连墓碑一起
    const removed = records.filter((r) => dropIds.has(r.id));
    const keep = records.filter((r) => !dropIds.has(r.id));
    // 回收站跟着存储文件走（真库 = DATA/_trash，与此前一致）；此前固定写 DATA/_trash，
    // 用临时 opts.file 的自检会把夹具行写进示例库目录。
    const trashDir = join(dirname(file), '_trash');
    mkdirSync(trashDir, { recursive: true });
    const trash = join(trashDir, new Date().toISOString().slice(0, 10) + '-' + store + '.jsonl');
    // 顺序：先落回收站（fsync）再原子替换——任一步崩溃都不丢数据（最坏是回收站多一份）。
    if (removed.length) {
      const fd = openSync(trash, 'a');
      try { writeSync(fd, removed.map((r) => JSON.stringify(r)).join('\n') + '\n'); fsyncSync(fd); }
      finally { closeSync(fd); }
    }
    writeFileAtomic(file, keep.map((r) => JSON.stringify(r)).join('\n') + (keep.length ? '\n' : ''));
    return { store, id: tip.id, retired: tip.id, hard: true, removed: removed.length, trash };
  }

  const tomb = { ...tip, id: tip.id + '-retired', retires: tip.id, retired_at: new Date().toISOString() };
  if (reason) tomb.retired_reason = reason;
  delete tomb.logged_at;   // 与 revise 一致：墓碑自成一版，盖自己的写入时间戳
  appendRecordUnlocked(store, tomb, file, {});   // 已在 retireRecord 的锁内（锁不可重入）
  return { store, id: tip.id, retired: tip.id, tombstone: tomb.id, hard: false, reason };
}

function appendRecordUnlocked(store, obj, file, opts = {}) {
  const record = { ...obj };
  // 防复活（2026-10-08）：已退役的 id 不得被静默重新追加——这正是当晚的实际事故
  // （脚本拿 currentRecords 判重 → 退役 id 不在当前集 → 被当新条目追加重放）。
  if (!opts.allowResurrect) {
    const existing = loadStore(store, file).records;
    if (retiredIds(existing).has(record.id)) {
      throw new Error(`id 已退役，拒绝复活：${record.id}（确需重加请传 { allowResurrect: true }，或改用一个新 id）`);
    }
    if (existing.some((r) => r.id === record.id)) throw new Error('重复 id：' + record.id);
  }
  // 双时态（2026-10-07）：记录时间（logged_at）由写入路径统一盖戳——缺则盖、自带保留；
  // 事件时间（event_time）由作者写，不强制、不回填历史。
  if (record.logged_at === undefined) record.logged_at = new Date().toISOString();
  for (const k of Object.keys(record)) if (typeof record[k] === 'string') record[k] = redact(record[k]);
  if (record.source && typeof record.source.ref === 'string') record.source = { ...record.source, ref: redact(record.source.ref) };
  const errs = validateRecord(store, record);
  if (errs.length) throw new Error('校验失败：' + errs.join('；'));
  mkdirSync(dirname(file), { recursive: true });
  const fd = openSync(file, 'a');
  try { writeSync(fd, JSON.stringify(record) + '\n'); fsyncSync(fd); }
  finally { closeSync(fd); }
  return { store, file, id: record.id };
}

export function appendRecord(store, obj, opts = {}) {
  if (!STORES.includes(store)) throw new Error('未知存储：' + store);
  const file = opts.file || storePath(store);
  if (opts.locked) return appendRecordUnlocked(store, obj, file, opts);
  return withFileLock(file, () => appendRecordUnlocked(store, obj, file, opts));
}
