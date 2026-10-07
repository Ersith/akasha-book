// 阿卡夏之书（Akasha）v0 核心库。零依赖（仅 Node stdlib）。
// 数据：data/*.jsonl（append-only）。规范见 SCHEMA.md / PROTOCOL.md。
import { readFileSync, appendFileSync, existsSync, statSync } from 'node:fs';
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
    report.stores[name] = { total: records.length, ok, current: currentRecords(records).length, loadErrors: errors.length };
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
      if (sc.score > 0) hits.push({ id: r.id, score: sc.score, line: (PRIMARY_LINE[name] ? PRIMARY_LINE[name](r) : hay).slice(0, 240) });
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
      if (b.bucket === 'undated' && !opts.includeUndated) {
        stats.undated += 1;
        if (stats.undatedSamples.length < 3) stats.undatedSamples.push({ store: name, id: r.id, snippet: hay.slice(0, 60) });
        continue;
      }
      if (b.timeSource) stats.timeSource[b.timeSource] += 1;
      if (b.bucket === 'in') stats.dated += 1;
      const hit = { store: name, id: r.id, score: sc.score, snippet: hay.slice(0, 120) };
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
      if (sc.score > 0) scored.push({ r, score: sc.score });
    }
    const weight = (x) => x.score + (name === 'frontier' ? (STATUS_WEIGHT[x.r.status] ?? 0) : 0) + emotionBoost(x.r);
    scored.sort((a, b) => weight(b) - weight(a));
    if (scored.length) {
      groups.push({ store: name, total: scored.length, hits: scored.slice(0, perStore).map(x => briefHit(name, x.r, x.score)) });
    }
  }
  return {
    query: q, tokens, groups,
    note: groups.length
      ? '库内条目引用时标注「记得·库内」；基石优先级 已实践 > 已复现 > 高引用 > 待验证（未验证先按「待验证」处理）。'
      : '六库无命中：换词再试；仍无 → 这是「确定不知道」，按协议标注来源态，不要编。'
  };
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
export function show(id) {
  const target = String(id || '').trim();
  if (!target) return { found: false, note: '给一个记录 id' };
  for (const name of STORES) {
    const records = loadStore(name).records;
    const rec = currentRecords(records).find(r => r.id === target);
    if (rec) return { found: true, store: name, id: rec.id, record: rec };
    const old = records.find(r => r.id === target);
    if (old) {
      let tip = old;
      for (;;) { const next = records.find(r => r.supersedes === tip.id); if (!next) break; tip = next; }
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
export function metrics(opts = {}) {
  const logPath = opts.log || join(ROOT, 'logs', 'hooks.jsonl');
  const since = opts.since ? String(opts.since).slice(0, 10) : null;
  let lines = [];
  try { lines = readFileSync(logPath, 'utf8').split(/\r?\n/).filter(Boolean); } catch { lines = []; }
  const counters = { tools: 0, toolErrors: 0, denials: 0, agentErrors: 0, turnEnds: 0, sleeps: 0, wakeNotes: 0, outputAudits: 0, usageRefs: 0 };
  const toolErrorsByName = {}; const usageById = {};
  const memoryByName = {}; let memoryCalls = 0;
  for (const raw of lines) {
    let rec;
    try { rec = JSON.parse(raw); } catch { continue; }
    if (since && String(rec.ts || '').slice(0, 10) < since) continue;
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
    topToolErrors: Object.entries(toolErrorsByName).sort((a, b) => b[1] - a[1]).slice(0, 5),
    topUsage: Object.entries(usageById).sort((a, b) => b[1] - a[1]).slice(0, 10),
    revisions: { count: revisions, longest, longestId }
  };
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
export function currentRecords(records) {
  const superseded = new Set(records.map((r) => r.supersedes).filter((v) => typeof v === 'string' && v !== ''));
  return records.filter((r) => !superseded.has(r.id));
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
export function revise(store, id, patch = {}, opts = {}) {
  if (!STORES.includes(store)) throw new Error('未知存储：' + store);
  const records = loadStore(store, opts.storeFile).records;
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
  appendRecord(store, next, opts.storeFile ? { file: opts.storeFile } : {});
  return { store, id: newId, supersedes: tip.id, root: root.id };
}

export function appendRecord(store, obj, opts = {}) {
  if (!STORES.includes(store)) throw new Error('未知存储：' + store);
  const record = { ...obj };
  // 双时态（2026-10-07）：记录时间（logged_at）由写入路径统一盖戳——缺则盖、自带保留；
  // 事件时间（event_time）由作者写，不强制、不回填历史。
  if (record.logged_at === undefined) record.logged_at = new Date().toISOString();
  const errs = validateRecord(store, record);
  if (errs.length) throw new Error('校验失败：' + errs.join('；'));
  const file = opts.file || storePath(store);
  appendFileSync(file, JSON.stringify(record) + '\n', 'utf8');
  return { store, file, id: record.id };
}
