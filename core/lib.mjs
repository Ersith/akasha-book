// 阿卡夏之书（Akasha）v0 核心库。零依赖（仅 Node stdlib）。
// 数据：data/*.jsonl（append-only）。规范见 SCHEMA.md / PROTOCOL.md。
import { readFileSync, appendFileSync, writeFileSync, mkdirSync, existsSync, statSync, openSync, closeSync, writeSync, fsyncSync, renameSync, unlinkSync, constants } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const ROOT = dirname(fileURLToPath(import.meta.url));
export const DATA = join(ROOT, 'data');
export const STORES = ['canon', 'mirror', 'orphan', 'pricing', 'lexicon', 'frontier'];
const SOURCE_TYPES = ['复现', '官方', '他人', '共识'];
const SEVERITIES = ['高', '中', '低'];

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
  return e;
}

export function checkAll() {
  const report = { ok: true, errors: [], stores: {} };
  for (const name of STORES) {
    const { records, errors } = loadStore(name);
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
  report.ok = report.errors.length === 0;
  return report;
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

// 情绪 boost（2026-10-07）：价值信号参与召回——arousal 线性加权 + 负价小幅加权（教训优先）。
export function emotionBoost(r) {
  const arousal = typeof r.arousal === 'number' ? r.arousal : 0;
  const negative = typeof r.valence === 'number' && r.valence < 0 ? 0.25 : 0;
  return +(arousal * 0.5 + negative).toFixed(3);
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
  for (const name of STORES) {
    const { records } = loadStore(name);
    const hits = [];
    for (const r of currentRecords(records)) {
      if (!inRange(r, opts.since, opts.until)) continue;
      const hay = (LOOKUP_FIELDS[name] || [])
        .map(f => (Array.isArray(r[f]) ? r[f].join(' ') : (r[f] || '')))
        .join(' | ');
      const hayL = hay.toLowerCase();
      const sc = scoreTokens(hayL, tokens);
      if (sc.score > 0) hits.push({ id: r.id, score: sc.score, zeroWeight: name === 'orphan', line: PRIMARY_LINE[name] ? PRIMARY_LINE[name](r) : hay });
    }
    hits.sort((a, b) => b.score - a.score);
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

export function lookupDetailed(query, opts = {}) {
  const q = String(query || '').trim().toLowerCase();
  const stats = { dated: 0, undated: 0, undatedSamples: [], excluded: 0, timeSource: { event_time: 0, logged_at: 0 } };
  if (!q) return { hits: [], stats };
  const tokens = tokenize(q);
  const hits = [];
  for (const name of STORES) {
    const { records } = loadStore(name);
    for (const r of currentRecords(records)) {
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
      const hit = { store: name, id: r.id, score: sc.score, strong: name !== 'orphan' && sc.whole >= 1, zeroWeight: name === 'orphan', snippet: redact(hay.slice(0, 120)) };
      if (b.bucket === 'undated') hit.undated = true;
      hits.push(hit);
    }
  }
  return { hits: hits.sort((a, b) => b.score - a.score).slice(0, 20), stats };
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
  for (const name of STORES) {
    const { records } = loadStore(name);
    const scored = [];
    for (const r of currentRecords(records)) {
      if (!inRange(r, opts.since, opts.until)) continue;
      const hay = (LOOKUP_FIELDS[name] || [])
        .map(f => (Array.isArray(r[f]) ? r[f].join(' ') : (r[f] || '')))
        .join(' | ')
        .toLowerCase();
      const hayL = hay.toLowerCase();
      const sc = scoreTokens(hayL, tokens);
      if (sc.score > 0) scored.push({ r, score: sc.score, strong: name !== 'orphan' && sc.whole >= 1, zeroWeight: name === 'orphan' });
    }
    const weight = (x) => (x.zeroWeight ? 0 : x.score + (name === 'frontier' ? (STATUS_WEIGHT[x.r.status] ?? 0) : 0) + emotionBoost(x.r));
    scored.sort((a, b) => weight(b) - weight(a) || Number(b.strong) - Number(a.strong));
    if (scored.length) {
      groups.push({ store: name, total: scored.length, hits: scored.slice(0, perStore).map(x => ({ ...briefHit(name, x.r, x.score), strong: x.strong, zeroWeight: x.zeroWeight })) });
    }
  }
  const strongHits = groups.reduce((n, g) => n + g.hits.filter((h) => h.strong).length, 0);
  let note;
  if (!groups.length) note = '六库无命中：换词再试；仍无 → 这是「确定不知道」，按协议标注来源态，不要编。';
  else if (!strongHits) note = '无强命中（整词命中为零；孤案为零权重，不算证据）：这是「确定不知道」，弱命中只是疑似相关，不要编。';
  else note = '强命中可标「记得·库内」；弱命中（strong=false）与孤案（zeroWeight）不算证据。基石优先级 已实践 > 已复现 > 高引用 > 待验证。';
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
    const rec = currentRecords(records).find(r => r.id === target);
    if (rec) return { found: true, store: name, id: rec.id, record: rec };
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
          record: old,
        };
      }
      return { found: false, store: name, id: target, note: '该 id 为旧版本（record 字段＝所查版本全文，不会自动跳转）；当前版本：' + tip.id, record: old };
    }
  }
  return { found: false, note: '六库均无此 id：' + target };
}

/** 镜像结构匹配（2026-10-07）：五元组字段计分（situation 权重 ×2）+ patterns 可选加权；返回 top N。 */
export function mirrorMatch(text, opts = {}) {
  const tokens = tokenize(text);
  if (!tokens.length) return [];
  const limit = Number.isInteger(opts.limit) && opts.limit > 0 ? opts.limit : 3;
  const hits = [];
  for (const r of currentRecords(loadStore('mirror').records)) {
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
        id: r.id, score: +score.toFixed(2),
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

/** 结果计数器 v0（2026-10-07）：hook 线 + 修订链统计 → 可机检指标。 */
// —— 召回失败信号（B2 · 2026-10 wave1）——
// 双路召回（机械钩子 + 主动查库）漏掉的，只能事后从日志里认出来：某回合出了失败，而失败之前没有任何查库动作。
// 纯机械口径（代码做计数、语义判断留给模型/人）：
//   窗口 = 相邻两条 turn-end 之间（hooks.jsonl 的 tool 线不带会话 id → 全局窗口；多会话并发时窗口会混，属近似）；
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

/** 召回失败计数（纯函数；输入为已解析的 hooks 记录，按日志顺序）。 */
export function recallSignals(records) {
  const out = { failureTurns: 0, recalledBefore: 0, misses: 0, lateRecall: 0, missRate: 0, samples: [] };
  let w = { recalled: false, failed: null, late: false };
  const close = () => {
    if (w.failed) {
      out.failureTurns += 1;
      if (w.recalled) out.recalledBefore += 1;
      else {
        out.misses += 1;
        if (w.late) out.lateRecall += 1;
        if (out.samples.length < 5) out.samples.push(w.failed);
      }
    }
    w = { recalled: false, failed: null, late: false };
  };
  for (const rec of records ?? []) {
    if (!rec || typeof rec !== 'object') continue;
    if (rec.kind === 'turn-end') { close(); continue; }
    if (isRecallRecord(rec)) { if (w.failed) w.late = true; else w.recalled = true; continue; }
    const isFail = (rec.kind === 'tool' && rec.ok === false && !String(rec.tool ?? '').startsWith(MEMORY_PREFIX)) || rec.kind === 'agent-error';
    if (isFail && !w.failed) w.failed = { ts: rec.ts ?? null, what: rec.kind === 'agent-error' ? 'agent-error' : String(rec.tool ?? '?') };
  }
  close();
  out.missRate = out.failureTurns ? +(out.misses / out.failureTurns).toFixed(3) : 0;
  return out;
}

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
  if (!sleep) hints.push('睡眠从未运行：等待首个空闲（或 timer 兜底）触发，或检查 @akasha-book/akasha-sleep 是否激活。');
  if (inbox.totalItems > 0) hints.push(`待办 ${inbox.totalItems} 条（logs\\inbox.jsonl）：按「失败回查 / 孤案候选」处理或转正式条目。`);
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
