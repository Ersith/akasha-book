// @akasha-book/session 自检 —— 桩 ctx 端到端（临时目录，不碰真库）。运行：node selftest.mjs
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CORE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'core');
const SCRATCH = join(tmpdir(), 'akasha-session-selftest');
mkdirSync(SCRATCH, { recursive: true });
// 清残：失败路径可能留下的临时目录（成功路径自清）
try { for (const d of readdirSync(SCRATCH)) if (d.startsWith('akasha-sesplug-')) rmSync(join(SCRATCH, d), { recursive: true, force: true }); } catch { /* 静默 */ }

let passed = 0; const failures = [];
function t(name, fn) {
  try { fn(); passed++; console.log('PASS', name); }
  catch (e) { failures.push([name, e]); console.log('FAIL', name, '—', e.message); }
}

let mod = null;
try { mod = await import('./lib/index.js'); }
catch (e) { failures.push(['import lib/index.js', e]); console.log('FAIL import lib/index.js —', e.message); }

function makeCtx() {
  const handlers = {}; const contexts = [];
  return {
    handlers, contexts,
    ctx: {
      on: (name, fn) => { (handlers[name] ??= []).push(fn); },
      systemPrompt: { context: (o) => { contexts.push(o); } },
      effect: (fn) => { try { fn(); } catch { /* stub */ } },
      interval: undefined
    }
  };
}
const readLines = (log) => readFileSync(log, 'utf8').trim().split(/\r?\n/).map((l) => JSON.parse(l));

if (mod) {
  t('骨架：apply 落 session-armed 线（pid + 节流配置）', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-sesplug-'));
    const { ctx } = makeCtx();
    mod.apply(ctx, { akashaDir: CORE, log: join(dir, 'hooks.jsonl'), sessionsRoot: join(dir, 'sessions'), metaFile: join(dir, 'meta.json'), minIndexIntervalMs: 30000 });
    const lines = readLines(join(dir, 'hooks.jsonl'));
    assert.equal(lines[0].kind, 'session-armed');
    assert.equal(lines[0].pid, process.pid);
    assert.equal(lines[0].minIndexIntervalMs, 30000);
    assert.ok(lines[0].timerCheckMs > 0);
    rmSync(dir, { recursive: true, force: true });
  });
  t('骨架：挂 1 条 context 行（akasha:session，order 134）；无数据静默 null', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-sesplug-'));
    const { ctx, contexts } = makeCtx();
    mod.apply(ctx, { akashaDir: CORE, log: join(dir, 'hooks.jsonl'), sessionsRoot: join(dir, 'sessions'), metaFile: join(dir, 'meta.json') });
    assert.equal(contexts.length, 1);
    assert.equal(contexts[0].name, 'akasha:session');
    assert.equal(contexts[0].order, 134);
    assert.equal(contexts[0].text(), null, '空库应静默');
    rmSync(dir, { recursive: true, force: true });
  });
  t('纯函数：shouldIndex 去抖', () => {
    assert.equal(mod.shouldIndex(0, 1000, 30000), true);
    assert.equal(mod.shouldIndex(1000, 2000, 30000), false);
    assert.equal(mod.shouldIndex(1000, 31001, 30000), true);
  });
  const { zstdCompressSync } = await import('node:zlib');
  const { appendFileSync, writeFileSync } = await import('node:fs');
  t('索引：turn/end → 增量索引（fixture）；去抖 skip；幂等 0 增', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-sesplug-'));
    const log = join(dir, 'hooks.jsonl');
    const sessionsRoot = join(dir, 'sessions');
    const sDir = join(sessionsRoot, '--W--', 'session-abc12345');
    mkdirSync(sDir, { recursive: true });
    const mk = (seqs) => Buffer.from(seqs.map((seq) => JSON.stringify({ seq, time: 1791312000000 + seq * 1000, type: 'user/message', data: { content: [{ type: 'text', text: '第' + seq + '条' }] } })).join('\n') + '\n');
    const fx = join(sDir, 'session.v4.jsonl.zstd');
    writeFileSync(fx, zstdCompressSync(mk([1, 2])));
    const { ctx, handlers } = makeCtx();
    mod.apply(ctx, { akashaDir: CORE, log, sessionsRoot, metaFile: join(dir, 'meta.json'), storeFile: join(dir, 'store.jsonl'), minIndexIntervalMs: 30000 });
    const fire = (h) => (h['session/event'] ?? []).forEach((fn) => fn({ id: 'abc12345' }, { type: 'turn/end', data: { turn: 1 } }));
    fire(handlers);
    let idx = readLines(log).filter((l) => l.kind === 'session-index');
    assert.equal(idx.length, 1, JSON.stringify(readLines(log)));
    assert.ok(typeof idx[0].lagMs === 'number', '索引线应含事件循环延迟采样 lagMs：' + JSON.stringify(idx[0]));
    assert.equal(idx[0].added, 2);
    assert.equal(idx[0].session, 'abc12345');
    assert.equal(idx[0].frameFails, 0, '观测线应带 frameFails');
    assert.equal(idx[0].turn, 1, '观测线应带 turn');
    const metaObj = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
    assert.ok(Number.isInteger(metaObj.sessions.abc12345.conclusions), 'meta 应记结论数：' + JSON.stringify(metaObj.sessions.abc12345));
    fire(handlers);
    assert.equal(readLines(log).filter((l) => l.kind === 'session-index-skip').length, 1, '去抖应 skip');
    appendFileSync(fx, zstdCompressSync(mk([3])));
    const { ctx: ctx2, handlers: h2 } = makeCtx();
    const log2 = join(dir, 'hooks2.jsonl');
    mod.apply(ctx2, { akashaDir: CORE, log: log2, sessionsRoot, metaFile: join(dir, 'meta.json'), storeFile: join(dir, 'store.jsonl'), minIndexIntervalMs: 0 });
    fire(h2);
    appendFileSync(fx, zstdCompressSync(mk([3]))); // 同内容再落一帧：档案变了（过 stat 快路）但无新 seq
    fire(h2);
    const idx2 = readLines(log2).filter((l) => l.kind === 'session-index');
    assert.equal(idx2[0].added, 1, '增量只收新帧：' + JSON.stringify(idx2));
    assert.equal(idx2[1].added, 0, '重复内容再触发幂等（水位 + 去重）');
    rmSync(dir, { recursive: true, force: true });
  });
  t('索引：档案缺失（resolveSessionFile 未命中）→ session-index-error + 背压（窗口内不重报）', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-sesplug-'));
    const { ctx, handlers } = makeCtx();
    mod.apply(ctx, { akashaDir: CORE, log: join(dir, 'hooks.jsonl'), sessionsRoot: join(dir, 'sessions'), metaFile: join(dir, 'meta.json'), storeFile: join(dir, 'store.jsonl'), minIndexIntervalMs: 0 });
    const fire = () => (handlers['session/event'] ?? []).forEach((fn) => fn({ id: 'missing1' }, { type: 'turn/end', data: { turn: 1 } }));
    fire();
    fire();
    const lines = readLines(join(dir, 'hooks.jsonl'));
    assert.ok(lines.some((l) => l.kind === 'session-index-error' && String(l.message).includes('未找到')), JSON.stringify(lines));
    assert.equal(lines.filter((l) => l.kind === 'session-index-error').length, 1, '未命中应走背压（窗口内不重复报错）：' + JSON.stringify(lines));
    rmSync(dir, { recursive: true, force: true });
  });
  t('降级：核心库缺失 → session-index-error + 统一失败背压（窗口内不重报）', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-sesplug-'));
    const { ctx, handlers } = makeCtx();
    mod.apply(ctx, { akashaDir: CORE, log: join(dir, 'hooks.jsonl'), akashaDir: join(dir, 'empty'), sessionsRoot: join(dir, 'sessions'), metaFile: join(dir, 'meta.json'), storeFile: join(dir, 'store.jsonl'), minIndexIntervalMs: 0 });
    const fire = () => (handlers['session/event'] ?? []).forEach((fn) => fn({ id: 'x1' }, { type: 'turn/end', data: { turn: 1 } }));
    fire();
    fire();
    const lines = readLines(join(dir, 'hooks.jsonl'));
    assert.ok(lines.some((l) => l.kind === 'session-index-error'), JSON.stringify(lines));
    assert.equal(lines.filter((l) => l.kind === 'session-index-error').length, 1, '统一背压（失败窗口内静默）：' + JSON.stringify(lines));
    rmSync(dir, { recursive: true, force: true });
  });
  t('注入：压缩事件（compaction/end 真值）→ session-compact 线 + 节奏条点名；失败压缩不记', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-sesplug-'));
    const log = join(dir, 'hooks.jsonl');
    const meta = join(dir, 'meta.json');
    writeFileSync(meta, JSON.stringify({ version: 1, sessions: { abc12345: { lastSeq: 5, segments: 3, indexedAt: '2026-10-07T00:00:00.000Z', source: 'x' }, def67890: { lastSeq: 9, segments: 7, indexedAt: '2026-10-07T01:00:00.000Z', source: 'y' } } }));
    const { ctx, handlers, contexts } = makeCtx();
    mod.apply(ctx, { akashaDir: CORE, log, sessionsRoot: join(dir, 'sessions'), metaFile: meta, storeFile: join(dir, 'store.jsonl') });
    let line = contexts[0].text();
    assert.ok(line && line.includes('10 段') && line.includes('2 会话'), String(line));
    assert.ok(line.includes('session lookup'), String(line));
    assert.ok(!line.includes('压缩'), '无压缩窗口不应点名：' + line);
    const fire = (session, event) => (handlers['session/event'] ?? []).forEach((fn) => fn(session, event));
    // 2026-10-07 复查：压缩真信号＝session 事件 compaction/end（agent/created 的 source 只有 startup/resume，没有 compact）
    fire({ id: 'abc12345' }, { type: 'compaction/end', data: { turn: 9 } });
    assert.ok(readLines(log).some((l) => l.kind === 'session-compact' && l.session === 'abc12345'), JSON.stringify(readLines(log)));
    fire({ id: 'def67890' }, { type: 'compaction/end', data: { turn: 9, error: 'boom' } });
    assert.equal(readLines(log).filter((l) => l.kind === 'session-compact').length, 1, '失败压缩不记：' + JSON.stringify(readLines(log).filter((l) => l.kind === 'session-compact')));
    line = contexts[0].text();
    assert.ok(line.includes('压缩'), String(line));
    assert.ok(line.includes('session lookup'), String(line));
    rmSync(dir, { recursive: true, force: true });
  });
  t('注入：无数据 / 坏 meta 两态都静默（null）', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-sesplug-'));
    const { ctx, contexts } = makeCtx();
    mod.apply(ctx, { akashaDir: CORE, log: join(dir, 'hooks.jsonl'), sessionsRoot: join(dir, 'sessions'), metaFile: join(dir, 'missing.json'), storeFile: join(dir, 'store.jsonl') });
    assert.equal(contexts[0].text(), null);
    writeFileSync(join(dir, 'meta2.json'), '{bad json');
    const { ctx: c2, contexts: k2 } = makeCtx();
    mod.apply(c2, { log: join(dir, 'h2.jsonl'), sessionsRoot: join(dir, 'sessions'), metaFile: join(dir, 'meta2.json'), storeFile: join(dir, 'store.jsonl') });
    assert.equal(k2[0].text(), null);
    rmSync(dir, { recursive: true, force: true });
  });
  t('接缝：inject 声明覆盖 apply 触碰的服务（systemPrompt / timer）', () => {
    assert.ok(Array.isArray(mod.inject), '应导出 inject 数组');
    assert.ok(mod.inject.includes('systemPrompt'), '缺 systemPrompt → 真宿主激活必抛：' + JSON.stringify(mod.inject));
    assert.ok(mod.inject.includes('timer'), JSON.stringify(mod.inject));
  });
  t('注入：压缩点名含「已收入 + 段/结论数 + 工具名」；renderSessionLine 边界', () => {
    const line = mod.renderSessionLine({ meta: { sessions: { a: { segments: 3, conclusions: 2 } } }, compacts: [{ session: 'a', ts: Date.now() }] }, Date.now());
    assert.ok(line.includes('已收入'), line);
    assert.ok(line.includes('3 段') && line.includes('结论 2 条'), line);
    assert.ok(line.includes('akasha_session_lookup'), line);
    assert.equal(mod.renderSessionLine({ meta: { sessions: { a: { segments: 0 } } }, compacts: [] }, 0), null, '全零段静默');
    const line2 = mod.renderSessionLine({ meta: { sessions: { a: { segments: 1 } } }, compacts: [{ ts: 'bad' }, null] }, Date.now());
    assert.ok(line2 && !line2.includes('压缩'), '坏 compacts 条目不进窗口：' + line2);
  });
  t('索引：档案未变 → stat 快路跳过；effectiveThrottle 自适应', () => {
    assert.equal(mod.effectiveThrottle(1024, 30000), 30000);
    assert.equal(mod.effectiveThrottle(20 * 1024 * 1024, 30000), 120000);
    const dir = mkdtempSync(join(SCRATCH, 'akasha-sesplug-'));
    const log = join(dir, 'hooks.jsonl');
    const sessionsRoot = join(dir, 'sessions');
    const sDir = join(sessionsRoot, '--W--', 'session-abc12345');
    mkdirSync(sDir, { recursive: true });
    const mk = (seqs) => Buffer.from(seqs.map((seq) => JSON.stringify({ seq, time: 1791312000000 + seq * 1000, type: 'user/message', data: { content: [{ type: 'text', text: '第' + seq + '条' }] } })).join('\n') + '\n');
    writeFileSync(join(sDir, 'session.v4.jsonl.zstd'), zstdCompressSync(mk([1])));
    const { ctx, handlers } = makeCtx();
    mod.apply(ctx, { akashaDir: CORE, log, sessionsRoot, metaFile: join(dir, 'meta.json'), storeFile: join(dir, 'store.jsonl'), minIndexIntervalMs: 0 });
    const fire = () => (handlers['session/event'] ?? []).forEach((fn) => fn({ id: 'abc12345' }, { type: 'turn/end', data: { turn: 1 } }));
    fire();
    fire();
    const idx = readLines(log).filter((l) => l.kind === 'session-index');
    const skips = readLines(log).filter((l) => l.kind === 'session-index-skip');
    assert.equal(idx.length, 1, JSON.stringify(readLines(log)));
    assert.equal(idx[0].added, 1);
    assert.ok(skips.some((s) => s.reason === 'unchanged'), JSON.stringify(skips));
    rmSync(dir, { recursive: true, force: true });
  });
  t('索引：失败后不停滞（不快路跳过；统一背压限定重报）', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-sesplug-'));
    const log = join(dir, 'hooks.jsonl');
    const sessionsRoot = join(dir, 'sessions');
    const sDir = join(sessionsRoot, '--W--', 'session-abc12345');
    mkdirSync(sDir, { recursive: true });
    const mk = (seqs) => Buffer.from(seqs.map((seq) => JSON.stringify({ seq, time: 1791312000000 + seq * 1000, type: 'user/message', data: { content: [{ type: 'text', text: '第' + seq + '条' }] } })).join('\n') + '\n');
    writeFileSync(join(sDir, 'session.v4.jsonl.zstd'), zstdCompressSync(mk([1])));
    const { ctx, handlers } = makeCtx();
    mod.apply(ctx, { akashaDir: CORE, log, sessionsRoot, metaFile: join(dir, 'meta.json'), storeFile: join(dir, 'no-such-dir', 'store.jsonl'), minIndexIntervalMs: 0 });
    const fire = () => (handlers['session/event'] ?? []).forEach((fn) => fn({ id: 'abc12345' }, { type: 'turn/end', data: { turn: 1 } }));
    fire();
    fire();
    const lines = readLines(log);
    assert.equal(lines.filter((l) => l.kind === 'session-index-error').length, 1, '统一背压：' + JSON.stringify(lines));
    assert.ok(!lines.some((l) => l.kind === 'session-index-skip' && l.reason === 'unchanged'), '失败不得被 unchanged 快路掩盖（stat 只记成功）：' + JSON.stringify(lines));
    rmSync(dir, { recursive: true, force: true });
  });
  t('会话 id 前缀归一（session- 前缀可解析；记账用裸 id）', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-sesplug-'));
    const log = join(dir, 'hooks.jsonl');
    const sessionsRoot = join(dir, 'sessions');
    const sDir = join(sessionsRoot, '--W--', 'session-abc12345');
    mkdirSync(sDir, { recursive: true });
    const mk = (seqs) => Buffer.from(seqs.map((seq) => JSON.stringify({ seq, time: 1791312000000 + seq * 1000, type: 'user/message', data: { content: [{ type: 'text', text: '第' + seq + '条' }] } })).join('\n') + '\n');
    writeFileSync(join(sDir, 'session.v4.jsonl.zstd'), zstdCompressSync(mk([1])));
    const { ctx, handlers } = makeCtx();
    mod.apply(ctx, { akashaDir: CORE, log, sessionsRoot, metaFile: join(dir, 'meta.json'), storeFile: join(dir, 'store.jsonl'), minIndexIntervalMs: 0 });
    (handlers['session/event'] ?? []).forEach((fn) => fn({ id: 'session-abc12345' }, { type: 'turn/end', data: { turn: 1 } }));
    const idx = readLines(log).filter((l) => l.kind === 'session-index');
    assert.equal(idx.length, 1, JSON.stringify(readLines(log)));
    assert.equal(idx[0].session, 'abc12345', '记账应用裸 id');
    assert.equal(idx[0].added, 1);
    rmSync(dir, { recursive: true, force: true });
  });
  t('循环观测：classifyChunk 四类 + shouldCheckStream 边界 + summarizeWatch 去重/截断', () => {
    assert.equal(mod.classifyChunk({ type: 'reasoning-delta', text: 'x' }).stream, 'reasoning');
    assert.equal(mod.classifyChunk({ type: 'text-delta', text: 'x' }).stream, 'text');
    assert.equal(mod.classifyChunk({ type: 'tool-call-delta', name: 'read' }).stream, 'tool');
    assert.equal(mod.classifyChunk({ type: 'usage' }), null);
    assert.equal(mod.shouldCheckStream(260, 0, 480, 200), false, '未到节流点');
    assert.equal(mod.shouldCheckStream(500, 0, 480, 200), true);
    assert.equal(mod.shouldCheckStream(500, 480, 480, 200), false);
    assert.equal(mod.shouldCheckStream(150, 0, 480, 200), false, '未到最小字符');
    const hitSet = new Set();
    const res = { exact: [{ count: 3, excerpt: 'x'.repeat(90) }], variant: [], punctRuns: [] };
    const s1 = mod.summarizeWatch(res, 'reasoning', 1234, hitSet);
    assert.ok(s1 && s1.hit.type === 'exact' && s1.hit.excerpt.length <= 60 && s1.atChars === 1234, JSON.stringify(s1));
    assert.equal(mod.summarizeWatch(res, 'reasoning', 1300, hitSet), null, '同类已报过 → 去重为 null');
  });
  t('循环观测：流环命中 → loop-watch（stream）；干跑（只写观测线）', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-sesplug-'));
    const log = join(dir, 'hooks.jsonl');
    const { ctx, handlers } = makeCtx();
    mod.apply(ctx, { akashaDir: CORE, log, sessionsRoot: join(dir, 'sessions'), metaFile: join(dir, 'meta.json'), storeFile: join(dir, 'store.jsonl'), loopWatch: true, watchMinChars: 10, watchCheckEvery: 20 });
    const fire = (chunk) => (handlers['session/event'] ?? []).forEach((fn) => fn({ id: 'wx1' }, { type: 'assistant/chunk', data: { turn: 1, step: 1, chunk } }));
    const seg = '这是一段用于测试的重复分析文本，反复重算同一件事。';
    for (let i = 0; i < 16; i += 1) fire({ type: 'reasoning-delta', index: 0, text: seg });
    const lines = readLines(log).filter((l) => l.kind === 'loop-watch');
    assert.ok(lines.length >= 1, '应记 loop-watch：' + JSON.stringify(readLines(log)));
    assert.equal(lines[0].phase, 'stream');
    assert.equal(lines.filter((l) => l.phase === 'stream').length, 1, '同 (turn, stream, type) 去重一次：' + JSON.stringify(lines));
    rmSync(dir, { recursive: true, force: true });
  });
  t('循环观测：turn 环（事件流缓存取数；turn-stopping 与 turn/end 双路径）', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-sesplug-'));
    const log = join(dir, 'hooks.jsonl');
    const { ctx, handlers } = makeCtx();
    mod.apply(ctx, { akashaDir: CORE, log, sessionsRoot: join(dir, 'sessions'), metaFile: join(dir, 'meta.json'), storeFile: join(dir, 'store.jsonl'), loopWatch: true });
    const rep = ('我们需要重新核对这个路径下的文件内容与之前分析保持一致。').repeat(6);
    const fire = (session, event) => (handlers['session/event'] ?? []).forEach((fn) => fn(session, event));
    // 2026-10-07 复查：官方 Session 无 .events 属性（同步读者已弃用，宿主改事件驱动）→ 缓存取自 session/event 事件流
    fire({ id: 't9' }, { type: 'assistant/message', data: { turn: 2, step: 1, message: { content: [{ type: 'reasoning', text: rep }, { type: 'text', text: '正常收尾。' }] } } });
    (handlers['agent/turn-stopping'] ?? []).forEach((fn) => fn({ agent: { id: 'ag1', session: { id: 't9' } }, turn: 2 }));
    let lines = readLines(log).filter((l) => l.kind === 'loop-watch' && l.phase === 'turn');
    assert.ok(lines.some((l) => l.stream === 'reasoning' && l.turn === 2), 'turn-stopping 路径应命中：' + JSON.stringify(readLines(log)).slice(0, 400));
    // 路径 B：turn/end 兜底（新回合，经缓存）
    fire({ id: 't9' }, { type: 'assistant/message', data: { turn: 3, step: 1, message: { content: [{ type: 'reasoning', text: rep }] } } });
    fire({ id: 't9' }, { type: 'turn/end', data: { turn: 3 } });
    lines = readLines(log).filter((l) => l.kind === 'loop-watch' && l.phase === 'turn');
    assert.ok(lines.some((l) => l.turn === 3), 'turn/end 兜底路径应命中：' + JSON.stringify(lines));
    rmSync(dir, { recursive: true, force: true });
  });
  t('循环观测：assistant-stream 帧（现役格式）→ loop-watch（stream）', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-sesplug-'));
    const log = join(dir, 'hooks.jsonl');
    const { ctx, handlers } = makeCtx();
    mod.apply(ctx, { akashaDir: CORE, log, sessionsRoot: join(dir, 'sessions'), metaFile: join(dir, 'meta.json'), storeFile: join(dir, 'store.jsonl'), loopWatch: true, watchMinChars: 10, watchCheckEvery: 20 });
    const fire = (frame) => (handlers['agent/assistant-stream'] ?? []).forEach((fn) => fn({ agent: { id: 'ag2', session: { id: 's9' } }, frame }));
    fire({ type: 'start', attemptId: 's9:1', turn: 5, step: 1 });
    const seg = '这是一段用于测试的重复分析文本，反复重算同一件事。';
    for (let i = 0; i < 16; i += 1) fire({ type: 'chunk', attemptId: 's9:1', index: i, chunk: { type: 'reasoning-delta', index: 0, text: seg } }); // 真实宿主 chunk 帧不带 turn/step（补齐靠 start 缓存）
    const lines = readLines(log).filter((l) => l.kind === 'loop-watch');
    assert.ok(lines.some((l) => l.phase === 'stream'), '应记 loop-watch（stream）：' + JSON.stringify(readLines(log)).slice(0, 400));
    assert.equal(lines[0].turn, 5, 'chunk 帧无 turn/step → 应从 start 帧缓存补全：' + JSON.stringify(lines[0]));
    assert.ok(readLines(log).some((l) => l.kind === 'loop-watch-probe' && String(l.type).includes('chunk')), '探针应记录帧/chunk 类型');
    rmSync(dir, { recursive: true, force: true });
  });
  t('循环观测：缓冲饱和（>20K）后仍继续检查（seen 单调计数）', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-sesplug-'));
    const log = join(dir, 'hooks.jsonl');
    const { ctx, handlers } = makeCtx();
    mod.apply(ctx, { akashaDir: CORE, log, sessionsRoot: join(dir, 'sessions'), metaFile: join(dir, 'meta.json'), storeFile: join(dir, 'store.jsonl'), loopWatch: true, watchMinChars: 21000, watchCheckEvery: 480 });
    const fire = (text) => (handlers['session/event'] ?? []).forEach((fn) => fn({ id: 'wbig' }, { type: 'assistant/chunk', data: { turn: 3, step: 1, chunk: { type: 'reasoning-delta', index: 0, text } } }));
    const seg = '这是一段用于测试的重复分析文本，反复重算同一件事。';
    for (let i = 0; i < 900; i += 1) fire(seg);
    const lines = readLines(log).filter((l) => l.kind === 'loop-watch');
    assert.ok(lines.length >= 1, '饱和后仍应命中（F1 修复）');
    assert.ok(lines[0].atChars >= 21000, 'atChars 应为单调累计：' + JSON.stringify(lines[0]));
    rmSync(dir, { recursive: true, force: true });
  });
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('失败清单：');
  for (const [name, e] of failures) console.log(' -', name, ':', e.message);
  process.exit(1);
}
