// 阿卡夏之书 · 会话层（session layer）—— 单会话记忆（读取 / 抽取 / 索引 / 检索）。
// 会话层 v0：会话档案读取 / 段抽取 / 索引 / 检索（单会话记忆）；多帧 zstd 容器按魔数逐帧解压。
import { readFileSync, appendFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { zstdDecompressSync } from 'node:zlib';
import { homedir } from 'node:os';
import { ROOT, loadStore, tokenize, matchScore } from './lib.mjs';

export const SESSION_DEFAULTS = {
  storeFile: join(ROOT, 'data', 'session.jsonl'),
  metaFile: join(ROOT, 'data', 'session-meta.json'),
  sessionsRoot: join(homedir(), '.dsh', 'sessions')  // 按你的宿主实际会话目录配置
};

const ZSTD_MAGIC = [0x28, 0xb5, 0x2f, 0xfd];

/** 读会话档案（多帧 zstd 拼接容器；单帧兼容）。坏容器抛错。 */
export function readSessionArchive(filePath) {
  const buf = readFileSync(filePath);
  const hits = [];
  for (let i = 0; i <= buf.length - 4; i++) {
    if (buf[i] === ZSTD_MAGIC[0] && buf[i + 1] === ZSTD_MAGIC[1] && buf[i + 2] === ZSTD_MAGIC[2] && buf[i + 3] === ZSTD_MAGIC[3]) {
      hits.push(i);
      i += 3;
    }
  }
  if (hits.length <= 1) {
    try {
      return { text: zstdDecompressSync(buf).toString('utf8'), frames: hits.length || 1, frameFails: 0, frameTruncated: 0 };
    } catch (e) {
      throw new Error('不是有效的 zstd 会话容器：' + filePath + '（' + e.message + '）');
    }
  }
  const parts = [];
  let frameFails = 0;
  for (let k = 0; k < hits.length; k++) {
    const end = k + 1 < hits.length ? hits[k + 1] : buf.length;
    try {
      parts.push(zstdDecompressSync(buf.slice(hits[k], end)));
    } catch {
      frameFails += 1; // 半写/损坏帧：跳过不中断（Review Focus #1）
    }
  }
  if (!parts.length) throw new Error('不是有效的 zstd 会话容器：' + filePath + '（全部帧解压失败）');
  const text = Buffer.concat(parts).toString('utf8');
  // 截断帧信号（2026-10-07；跨 node 版本稳健）：zstdDecompressSync 对「末尾截断帧」不抛错——
  // v24.19 返回部分字节（尾行非空且不可解析 ⇒ 文本完整性测）；v24.21 静默只回已完整帧（帧数不匹配 ⇒ 计数测）。
  // 两路任一命中 ⇒ frameTruncated=1；下游按 parseFails 丢弃半行。
  const tail = text.slice(text.lastIndexOf('\n') + 1).trim();
  const missingFrames = parts.length < hits.length; // 帧数不匹配：截断/损坏帧未产出内容（跨 node 稳健信号）
  let frameTruncated = 0;
  if (missingFrames) frameTruncated = 1;
  else if (tail) {
    try { JSON.parse(tail); } catch { frameTruncated = 1; }
  }
  return { text, frames: hits.length, frameFails, frameTruncated };
}

/** 按会话 id 在 sessionsRoot 递归找档案（`session-<id>` 目录下第一个 *.zstd）；未命中 null。
 *  两种 id 形态都收：`session-<id>`（宿主事件里常见）与裸 `<id>`——目录名恒为 `session-<id>`。 */
export function resolveSessionFile(sessionsRoot, sessionId) {
  const needle = String(sessionId ?? '');
  if (!needle) return null;
  const dirName = needle.startsWith('session-') ? needle : 'session-' + needle;
  const walk = (dir) => {
    let entries = [];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return null; }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (!e.isDirectory()) continue;
      if (e.name === dirName) {
        try { for (const f of readdirSync(p)) if (f.endsWith('.zstd')) return join(p, f); } catch { return null; }
      }
      const deeper = walk(p);
      if (deeper) return deeper;
    }
    return null;
  };
  return walk(sessionsRoot);
}

/** 折叠空白（纯函数）。 */
function cleanText(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

/** 首行（≤120 字，供 why）。 */
function firstLine(s) {
  const line = String(s ?? '').split(/\r?\n/).map((x) => x.trim()).find((x) => x);
  return line ? (line.length > 120 ? line.slice(0, 119) + '…' : line) : '';
}

/** 毫秒时间 → ISO（缺则空串）。 */
function iso(ms) {
  return Number.isFinite(ms) ? new Date(ms).toISOString() : '';
}

/** 截断（超长加 …，总长 ≤ n）。 */
function cut(s, n) {
  const t = String(s ?? '');
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

/** 机械关键词抽取：工具名 → 路径 → 「」引文 → ASCII 标识符 → 中文高频 bigram；去重 ≤12。 */
function extractKeywords(text, tools = []) {
  const out = [];
  const seen = new Set();
  const add = (k) => {
    const v = String(k || '').trim();
    if (!v || seen.has(v) || out.length >= 12) return;
    seen.add(v);
    out.push(v);
  };
  for (const t of tools) add(t);
  const src = String(text ?? '');
  for (const m of src.matchAll(/[A-Za-z]:\\[^\s"'|<>]+/g)) add(m[0].replace(/[。，、；：）？!.,;:)]+$/, ''));
  for (const m of src.matchAll(/「([^」]{1,40})」/g)) add(m[1]);
  for (const m of src.matchAll(/[A-Za-z][A-Za-z0-9_.-]{4,}/g)) add(m[0]);
  const bigrams = new Map();
  for (const m of src.matchAll(/[\u4e00-\u9fff]+/g)) {
    const run = m[0];
    for (let i = 0; i < run.length - 1; i += 1) {
      const g = run.slice(i, i + 2);
      bigrams.set(g, (bigrams.get(g) ?? 0) + 1);
    }
  }
  for (const [g, n] of [...bigrams.entries()].filter(([, n]) => n >= 2)) add(g);
  return out;
}

const KIND_LIMIT = { intent: 400, conclusion: 400, action: 360, process: 200 };

/** 轻量内容指纹（djb2 → 8 hex）：同内容幂等、变内容追加新版（F2 漂移修复；不引 crypto）。 */
function fp8(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

function makeSeg(sid, sid8, { seq, time, turn, step, kind, gist, why, keywords, tools, ptr }) {
  const rec = {
    store: 'session',
    session: sid,
    seq,
    time: time || '',
    turn: Number.isInteger(turn) ? turn : null,
    step: Number.isInteger(step) ? step : null,
    kind,
    gist: cut(cleanText(gist), KIND_LIMIT[kind] ?? 400)
  };
  if (why) rec.why = cut(cleanText(why), 120);
  rec.keywords = keywords ?? [];
  rec.tools = tools ?? [];
  rec.ptr = ptr ?? {};
  rec.id = `seg-${sid8}-${seq}-${fp8([rec.kind, rec.gist, rec.why ?? '', rec.tools.join(',')].join('|'))}`;
  return rec;
}

const contentText = (content) =>
  Array.isArray(content) ? content.filter((x) => x && x.type === 'text' && typeof x.text === 'string').map((x) => x.text).join(' ') : '';

/** 记录数组 → 段数组（纯函数；v0.1 机械启发式）。段序：assistant 内 conclusion 先、process 后。 */
export function extractSegments(records, { session } = {}) {
  const sid = String(session ?? 'unknown');
  const sid8 = sid.slice(0, 8);
  const out = [];
  const pending = new Map();
  const lastReasoning = new Map();
  const list = Array.isArray(records) ? records : [];
  list.forEach((rec, i) => {
    if (!rec || typeof rec !== 'object') return;
    const seq = Number.isInteger(rec.seq) ? rec.seq : i + 1;
    const time = iso(rec.time);
    const d = rec.data ?? {};
    const turn = d.turn ?? null;
    const step = d.step ?? null;
    if (rec.type === 'user/message') {
      const text = contentText(d.content);
      if (text) out.push(makeSeg(sid, sid8, { seq, time, turn, step, kind: 'intent', gist: text, keywords: extractKeywords(text), ptr: { seq } }));
    } else if (rec.type === 'assistant/message') {
      const items = Array.isArray(d.message?.content) ? d.message.content : [];
      const textItem = items.find((x) => x && x.type === 'text' && typeof x.text === 'string');
      const reasoningItem = items.find((x) => x && (x.type === 'reasoning' || x.type === 'thinking') && typeof x.text === 'string');
      if (reasoningItem) lastReasoning.set(`${turn}:${step}`, firstLine(reasoningItem.text));
      if (textItem) out.push(makeSeg(sid, sid8, { seq, time, turn, step, kind: 'conclusion', gist: textItem.text, keywords: extractKeywords(textItem.text), ptr: { seq } }));
      if (reasoningItem) out.push(makeSeg(sid, sid8, { seq, time, turn, step, kind: 'process', gist: reasoningItem.text, keywords: extractKeywords(reasoningItem.text), ptr: { seq } }));
    } else if (rec.type === 'tool/call') {
      const callId = d.callId ?? `seq-${seq}`;
      pending.set(callId, { seq, time, turn, step, name: String(d.name ?? '?'), args: String(d.arguments ?? '') });
    } else if (rec.type === 'tool/result') {
      const callId = d.toolCallId ?? d.message?.toolCallId;
      const p = callId ? pending.get(callId) : null;
      if (p) {
        pending.delete(callId);
        const resultText = contentText(d.content) || contentText(d.message?.content);
        const why = lastReasoning.get(`${p.turn}:${p.step}`) ?? '';
        const gist = `${p.name}：${cut(cleanText(p.args), 120)} ↳ ${cut(cleanText(resultText), 160)}`;
        out.push(makeSeg(sid, sid8, { seq, time, turn: p.turn, step: p.step, kind: 'action', gist, why, keywords: extractKeywords(gist + ' ' + p.args, [p.name]), tools: [p.name], ptr: { seq, callSeq: p.seq } }));
      }
    }
  });
  for (const p of pending.values()) {
    const why = lastReasoning.get(`${p.turn}:${p.step}`) ?? '';
    const gist = `${p.name}：${cut(cleanText(p.args), 120)}（无结果）`;
    out.push(makeSeg(sid, sid8, { seq: p.seq, time: p.time, turn: p.turn, step: p.step, kind: 'action', gist, why, keywords: extractKeywords(gist + ' ' + p.args, [p.name]), tools: [p.name], ptr: { seq: p.seq, callSeq: p.seq } }));
  }
  return out;
}

/** 段批量追加（append-only；自动盖 logged_at）。 */
export function appendSegments(storeFile, segs) {
  let added = 0;
  for (const seg of segs) {
    const rec = { ...seg };
    if (rec.logged_at === undefined) rec.logged_at = new Date().toISOString();
    appendFileSync(storeFile, JSON.stringify(rec) + '\n', 'utf8');
    added += 1;
  }
  return { added };
}

function readMeta(metaFile) {
  try { return JSON.parse(readFileSync(metaFile, 'utf8')); } catch { return {}; }
}

/** 索引一个会话档案：水位 + id 去重 + meta 记账；full=true 忽略水位重扫（仍按 id 去重）。 */
export function indexSession({ file, session, storeFile = SESSION_DEFAULTS.storeFile, metaFile = SESSION_DEFAULTS.metaFile, full = false } = {}) {
  const sid = String(session ?? 'unknown');
  const { text, frameFails, frameTruncated } = readSessionArchive(file);
  const records = [];
  let parseFails = 0;
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    try { records.push(JSON.parse(s)); } catch { parseFails += 1; }
  }
  const seqOf = (rec, i) => (Number.isInteger(rec.seq) ? rec.seq : i + 1);
  const meta = readMeta(metaFile);
  const prev = meta.sessions?.[sid] ?? {};
  const lastSeq = Number.isInteger(prev.lastSeq) ? prev.lastSeq : 0;
  let maxSeq = lastSeq;
  const fresh = [];
  records.forEach((rec, i) => {
    const seq = seqOf(rec, i);
    if (seq > maxSeq) maxSeq = seq;
    if (full || seq > lastSeq) fresh.push(rec);
  });
  const segs = extractSegments(fresh, { session: sid });
  const existing = new Set(loadStore('session', storeFile).records.map((r) => r.id));
  const incoming = segs.filter((x) => !existing.has(x.id));
  const skipped = segs.length - incoming.length;
  appendSegments(storeFile, incoming);
  const ownedRecs = loadStore('session', storeFile).records.filter((r) => r.session === sid);
  const ownedIds = new Set(ownedRecs.map((r) => r.id));
  const conclIds = new Set(ownedRecs.filter((r) => r.kind === 'conclusion').map((r) => r.id));
  const next = {
    ...meta,
    version: 1,
    sessions: {
      ...(meta.sessions ?? {}),
      [sid]: { lastSeq: maxSeq, segments: ownedIds.size, conclusions: conclIds.size, indexedAt: new Date().toISOString(), source: file }
    }
  };
  writeFileSync(metaFile, JSON.stringify(next, null, 2), 'utf8');
  return { session: sid, added: incoming.length, skipped, lastSeq: maxSeq, parseFails, frameFails, frameTruncated };
}

/** 会话层检索：默认 意图/动作/结论/节点（结论 +1.0 优先）；process 仅 includeProcess 或显式 kind；level='nodes'|'segs' 过滤；节点只取当前代。 */
export function lookupSegments(query, { storeFile = SESSION_DEFAULTS.storeFile, session, kind, since, until, includeProcess = false, limit = 10, level } = {}) {
  const q = String(query ?? '').trim();
  if (!q) return [];
  const tokens = tokenize(q);
  if (!tokens.length) return [];
  const SEG_KINDS = ['intent', 'action', 'conclusion', ...(includeProcess ? ['process'] : [])];
  let kinds;
  if (kind != null) kinds = (Array.isArray(kind) ? kind : String(kind).split(',')).map((x) => String(x).trim()).filter(Boolean);
  else if (level === 'nodes') kinds = ['node'];
  else if (level === 'segs') kinds = SEG_KINDS;
  else kinds = [...SEG_KINDS, 'node'];
  const records = loadStore('session', storeFile).records;
  let genBy = null;
  if (kinds.includes('node')) {
    genBy = new Map(); // 各会话各取最新代——跨会话查询不得互相遮挡（终局复核 F1）
    for (const r of records) {
      if (r.kind !== 'node' || (session && r.session !== session)) continue;
      genBy.set(r.session, Math.max(genBy.get(r.session) ?? -1, Number(r.treegen) || 0));
    }
  }
  const hits = [];
  for (const r of records) {
    if (session && r.session !== session) continue;
    if (!kinds.includes(r.kind)) continue;
    if (r.kind === 'node' && (Number(r.treegen) || 0) !== genBy.get(r.session)) continue; // 旧代不参与检索
    if (since || until) {
      const day = String((r.kind === 'node' ? r.time_from : r.time) || '').slice(0, 10);
      if (!day) continue;
      if (since && day < String(since).slice(0, 10)) continue;
      if (until && day > String(until).slice(0, 10)) continue;
    }
    const gistL = String(r.gist ?? '').toLowerCase();
    const extraKeywords = (r.keywords ?? []).filter((k) => !gistL.includes(String(k).toLowerCase()));
    const hay = [r.gist, r.extra, r.why, extraKeywords.join(' ')].filter(Boolean).join(' ').toLowerCase();
    let score = 0;
    for (const t of tokens) score += matchScore(hay, t);
    if (score <= 0) continue;
    const weight = score + (r.kind === 'conclusion' ? 1.0 : 0);
    const hit = { id: r.id, session: r.session, seq: r.seq, time: r.kind === 'node' ? (r.time_from ?? '') : r.time, turn: r.turn ?? null, step: r.step ?? null, kind: r.kind, score: +score.toFixed(3), weight: +weight.toFixed(3), gist: r.gist };
    if (r.kind === 'node') {
      hit.level = r.level;
      hit.children = r.children ?? [];
      hit.time_to = r.time_to ?? '';
    }
    hits.push(hit);
  }
  return hits.sort((a, b) => b.weight - a.weight || a.seq - b.seq).slice(0, limit);
}

/** 注入块渲染（小体积；≤budget 字符，命令提示始终保底）。 */
export function renderSessionContext({ storeFile = SESSION_DEFAULTS.storeFile, session, budget = 600 } = {}) {
  const records = loadStore('session', storeFile).records.filter((r) => !session || r.session === session);
  const counts = { conclusion: 0, action: 0, intent: 0, process: 0 };
  for (const r of records) if (counts[r.kind] !== undefined) counts[r.kind] += 1;
  const sid8 = String(session ?? '').slice(0, 8) || 'all';
  const latest = records.filter((r) => r.kind === 'conclusion').slice(-2).map((r) => String(r.gist).slice(0, 120));
  const head = `小阿卡夏·会话层（${sid8}）：共 ${records.length} 段（结论 ${counts.conclusion} · 动作 ${counts.action} · 意图 ${counts.intent} · 过程 ${counts.process}）`;
  const mid = latest.length ? `；最近结论：${latest.join('；')}` : '';
  const tail = '；查详情：node akasha.mjs session lookup <词>';
  let text = head + mid + tail;
  if (text.length > budget) {
    const room = Math.max(0, budget - tail.length - 1);
    text = (head + mid).slice(0, room) + '…' + tail;
  }
  return text;
}

// ---------- 抽象层 v0.2：弧线节点（机械树；设计稿 §4.4） ----------

const NODE_GIST_CAP = 400;

function pickNodeText(items, cap) {
  const W = { conclusion: 3, node: 2, action: 2, intent: 1, process: 1 };
  const sorted = [...items].sort((a, b) => (W[b.kind] ?? 1) - (W[a.kind] ?? 1) || (a.seq ?? 0) - (b.seq ?? 0));
  const parts = [];
  let len = 0;
  for (const s of sorted) {
    const text = String(s.gist ?? '');
    if (!text) continue;
    if (len + text.length + 1 > cap) {
      const room = cap - len - 1;
      if (room > 8) parts.push(text.slice(0, room));
      break;
    }
    parts.push(text);
    len += text.length + 1;
  }
  return parts.join(' ');
}
const NODE_EXTRA_CAP = 1200;

/** 机械切块 + 递归聚合（纯函数式：只读 store；写盘用 appendNodes）。切块＝按 turn 边界每 chunkTurns 个 turn 一块。 */
export function buildTree({ session, storeFile = SESSION_DEFAULTS.storeFile, chunkTurns = 8, fanout = 4 } = {}) {
  const sid = String(session ?? 'unknown');
  const sid8 = sid.slice(0, 8);
  const seen = new Set();
  const segs = [];
  for (const r of loadStore('session', storeFile).records) {
    if (r.session !== sid || r.kind === 'node' || seen.has(r.id)) continue;
    seen.add(r.id);
    segs.push(r);
  }
  segs.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));

  const chunks = [];
  let cur = [];
  let turnsIn = new Set();
  for (const s of segs) {
    const t = Number.isInteger(s.turn) ? s.turn : null;
    if (cur.length && t !== null && !turnsIn.has(t) && turnsIn.size >= chunkTurns) {
      chunks.push(cur);
      cur = [];
      turnsIn = new Set();
    }
    cur.push(s);
    if (t !== null) turnsIn.add(t);
  }
  if (cur.length) chunks.push(cur);

  const mkNode = (level, items, children) => {
    const times = items.map((x) => String(x.time ?? '')).filter(Boolean).sort();
    const kw = [];
    outer: for (const s of items) {
      for (const k of s.keywords ?? []) {
        if (!kw.includes(k)) kw.push(k);
        if (kw.length >= 12) break outer;
      }
    }
    const seq0 = Math.min(...items.map((x) => x.seq ?? 0));
    const seq1 = Math.max(...items.map((x) => x.seq ?? 0));
    const gist = pickNodeText(items, NODE_GIST_CAP);
    const extra = pickNodeText(items, NODE_EXTRA_CAP);
    const fp = fp8([`L${level}`, children.join(','), gist].join('|'));
    return {
      id: `node-${sid8}-L${level}-${seq0}-${seq1}-${fp}`,
      store: 'session',
      session: sid,
      kind: 'node',
      level,
      children: [...children],
      time_from: times[0] ?? '',
      time_to: times[times.length - 1] ?? '',
      gist,
      extra,
      keywords: kw.slice(0, 12),
      seq: seq0
    };
  };

  const nodes = chunks.map((ch) => mkNode(1, ch, ch.map((s) => s.id)));
  let level = 1;
  let layer = nodes;
  while (layer.length > 2 && level < 3) {
    level += 1;
    const parents = [];
    for (let i = 0; i < layer.length; i += fanout) {
      const group = layer.slice(i, i + fanout);
      const items = group.map((n) => ({ kind: 'node', gist: n.gist, keywords: n.keywords, seq: n.seq, time: n.time_from }));
      parents.push(mkNode(level, items, group.map((n) => n.id)));
    }
    nodes.push(...parents);
    layer = parents;
  }
  const prevGen = loadStore('session', storeFile).records.reduce((m, r) => (r.kind === 'node' && r.session === sid ? Math.max(m, Number(r.treegen) || 0) : m), 0);
  return { treegen: Math.max(Date.now(), prevGen + 1), nodes };
}

/** 节点批量追加（append-only；整批带 treegen 代际标记）。 */
export function appendNodes(storeFile, nodes, treegen) {
  let added = 0;
  for (const n of nodes) {
    const rec = { ...n, treegen };
    if (rec.logged_at === undefined) rec.logged_at = new Date().toISOString();
    appendFileSync(storeFile, JSON.stringify(rec) + '\n', 'utf8');
    added += 1;
  }
  return { added };
}

/** 当前代（最新 treegen）节点；旧代留档但不参与检索/渲染。 */
export function latestNodes(storeFile, session) {
  const sid = String(session ?? '');
  const nodeRecs = loadStore('session', storeFile).records.filter((r) => r.kind === 'node' && r.session === sid);
  if (!nodeRecs.length) return [];
  const latest = Math.max(...nodeRecs.map((r) => Number(r.treegen) || 0));
  return nodeRecs
    .filter((r) => (Number(r.treegen) || 0) === latest)
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || (a.seq ?? 0) - (b.seq ?? 0));
}

/** 树渲染（当前代）：层级行；供自主导航「看弧线」用。 */
export function renderTree(storeFile, session) {
  const sid = String(session ?? '');
  const nodes = latestNodes(storeFile, sid);
  if (!nodes.length) return `（无节点：先 node akasha.mjs session tree --build --session ${sid || '<id>'}）`;
  const segCount = new Set(loadStore('session', storeFile).records.filter((r) => r.session === sid && r.kind !== 'node').map((r) => r.id)).size;
  const levels = [...new Set(nodes.map((n) => n.level))].sort((a, b) => b - a);
  const gen = nodes[0]?.treegen ?? '';
  const lines = [`小阿卡夏·树（${sid.slice(0, 8)}）：${nodes.length} 节点 / ${segCount} 段（treegen ${gen}）`];
  for (const lv of levels) {
    lines.push(`L${lv}：`);
    for (const n of nodes.filter((x) => x.level === lv)) {
      lines.push(`  - ${n.id} [${String(n.time_from).slice(0, 16)} → ${String(n.time_to).slice(0, 16)}] ${String(n.gist).slice(0, 80)}`);
    }
  }
  lines.push('细节：session node <id>；检索：session lookup <词> --level nodes');
  return lines.join('\n');
}

/** 循环观测汇总（P0 干跑，2026-10-07）：只读 hooks 记录 → phase/type/session 计数 + 最近摘录（坏行容忍）。 */
export function loopWatchStats(records, { since } = {}) {
  const s = { total: 0, byPhase: {}, byType: {}, bySession: {}, probes: 0, recent: [] };
  for (const r of records ?? []) {
    if (!r) continue;
    if (r.kind === 'loop-watch-probe') { s.probes += 1; continue; }
    if (r.kind !== 'loop-watch') continue;
    if (since && String(r.ts || '').slice(0, 10) < String(since).slice(0, 10)) continue;
    s.total += 1;
    const ph = r.phase ?? '?';
    s.byPhase[ph] = (s.byPhase[ph] ?? 0) + 1;
    const t = r.hit?.type ?? '?';
    s.byType[t] = (s.byType[t] ?? 0) + 1;
    const sid = r.session ?? '?';
    s.bySession[sid] = (s.bySession[sid] ?? 0) + 1;
    s.recent.push({ ts: r.ts, session: sid, turn: r.turn ?? null, phase: ph, type: t, excerpt: String(r.hit?.excerpt ?? '').slice(0, 60) });
  }
  if (s.recent.length > 10) s.recent = s.recent.slice(-10);
  return s;
}
