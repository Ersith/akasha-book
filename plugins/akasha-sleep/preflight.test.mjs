// preflight.test.mjs —— C1 自测断言：正向 / 去重 / 映射表外 / 关闭双停
// 做法：构造一个 akashaDir 夹具（lib.mjs + logs/hooks.jsonl），用桩 ctx 捕获注册，直接驱动 text()。
import { apply } from './lib/index.js';
import { mkdirSync, writeFileSync, copyFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const REAL = 'H:\\Harness\\akasha';
const FIXBASE = 'H:\\Harness\\_ab\\preflight-fixture';
// ⚠ 每轮夹具必须**换独立目录**：插件用 createRequire 加载 `lib.mjs`，而目标是 .mjs ⇒ Node 走 **ESM 加载器缓存**，
//   `require.cache` 里没有它（清理无效）⇒ 只能换 specifier 才能拿到新桩。
//   2026-10-11 实测：不换目录时 ⑥–⑨ 全挂（拿到上一轮没有 loadStore 的桩）。
let FIX = FIXBASE;
let FIXN = 0;

function makeFixture(hooksLines, canonRecords = null) {
  FIX = FIXBASE + '-c' + (++FIXN);
  rmSync(FIX, { recursive: true, force: true });
  mkdirSync(join(FIX, 'data'), { recursive: true });
  mkdirSync(join(FIX, 'logs'), { recursive: true });
  // 夹具用**桩 lib.mjs**：导出 RECALL_TRAP_MAP（默认测"行逻辑"）；
  // 传了 canonRecords 时再导出 loadStore/currentRecords（测"反射文本随条目走"的 ⑥–⑨）。
  const stub = [
    'export const RECALL_TRAP_MAP = { edit: ["canon-trap-edit-context-mismatch"], read: ["canon-trap-read-offset-range"], grep: ["canon-trap-grep-exit2-path"] };',
  ];
  if (canonRecords) {
    stub.push('const RECORDS = ' + JSON.stringify(canonRecords) + ';');
    stub.push('export const loadStore = () => ({ records: RECORDS });');
    stub.push('export const currentRecords = (recs) => recs;');
  }
  writeFileSync(join(FIX, 'lib.mjs'), stub.join('\n') + '\n', 'utf8');
  writeFileSync(join(FIX, 'logs', 'hooks.jsonl'), hooksLines.join('\n') + '\n', 'utf8');
  for (const f of ['session.mjs', 'sleep.mjs']) { try { copyFileSync(join(REAL, f), join(FIX, f)); } catch { /* 可选 */ } }
}

function captureRows(cfg, failures = []) {
  const rows = [];
  const handlers = {};
  const ctx = {
    systemPrompt: { context: (r) => rows.push(r) },
    tools: { register() {}, guard() {} },
    on(name, fn) { (handlers[name] ||= []).push(fn); },
    logger: { info() {} },
    config: cfg,
  };
  apply(ctx, cfg);
  // 真事件路径种失败（等价执行期发生的工具失败）
  for (const tool of failures) for (const fn of handlers['tools/result'] || []) fn({ name: tool }, { isError: true });
  return { rows, handlers };
}

let pass = 0, fail = 0;
const T = (name, cond, extra = '') => { if (cond) { pass++; console.log('  PASS ' + name); } else { fail++; console.log('  FAIL ' + name + (extra ? '  ' + extra : '')); } };

const now = Date.now();
const mk = (tool, msAgo) => JSON.stringify({ ts: new Date(now - msAgo).toISOString(), kind: 'tool', tool, ok: false, message: 'boom' });

// ① 正向：近 30 分钟有 edit 失败 ⇒ 应渲染提示行
makeFixture([mk('edit', 60_000)]);
let { rows } = captureRows({ akashaDir: FIX, preflightHints: true }, ["edit"]);
let row = rows.find((r) => r.name === 'akasha:preflight');
T('① 注册了 akasha:preflight 行', !!row, JSON.stringify(rows.map((r) => r.name)));
if (row) {
  T('① order = 135', row.order === 135, String(row.order));
  const line = row.text();
  T('① 渲染出提示行', typeof line === 'string' && line.includes('[坑前提示]'), String(line));
  T('① 含工具名与条目 id', !!line && line.includes('edit') && line.includes('canon-trap-edit-context-mismatch'), String(line));
  T('① ≤80 字', !!line && line.length <= 80, String(line && line.length));
  T('② 同工具二次调用不再重复**同一失败线**（去重）', typeof line === 'string' && row.text() !== line);
}

// ③ 映射表外工具 ⇒ 不触发"失败驱动"提示（首用预告若出现，其工具必来自映射表）
makeFixture([mk('blender_python', 60_000)]);
({ rows } = captureRows({ akashaDir: FIX, preflightHints: true }, ["blender_python"]));
row = rows.find((r) => r.name === 'akasha:preflight');
const preflightLines = readFileSync(join(FIX, 'logs', 'hooks.jsonl'), 'utf8').split('\n').filter((l) => l.includes('"kind":"preflight"'));
T('③ 映射表外工具不产生 preflight 事件', !preflightLines.some((l) => l.includes('"tool":"blender_python"')), JSON.stringify(preflightLines.slice(-2)));

// ④ 关闭开关 ⇒ 不注册该行（也就不会有事件）
makeFixture([mk('edit', 60_000)]);
({ rows } = captureRows({ akashaDir: FIX, preflightHints: false }, ["edit"]));
T('④ 关闭时不注册 akasha:preflight', !rows.some((r) => r.name === 'akasha:preflight'));

// ⑤ 事件：开启时写 preflight 事件，关闭时行数不变
makeFixture([mk('edit', 60_000)]);
({ rows } = captureRows({ akashaDir: FIX, preflightHints: true }, ["edit"]));
row = rows.find((r) => r.name === 'akasha:preflight');
const before = readFileSync(join(FIX, 'logs', 'hooks.jsonl'), 'utf8').split('\n').filter(Boolean).length;
row.text();
const after = readFileSync(join(FIX, 'logs', 'hooks.jsonl'), 'utf8');
T('⑤ 开启时写了 kind=preflight 事件', after.includes('"kind":"preflight"'), after.split('\n').slice(-1)[0]);
makeFixture([mk('edit', 60_000)]);
captureRows({ akashaDir: FIX, preflightHints: false }, ["edit"]);
const offLater = readFileSync(join(FIX, 'logs', 'hooks.jsonl'), 'utf8');
T('⑤ 关闭时无 preflight 事件（双停）', !offLater.includes('"kind":"preflight"'));

// ⑥–⑨ 反射文本随条目走（2026-10-11 修复）：条目优先 / 退役不执行 / 有效期过期不执行 / 条目缺失不执行
const REC = (id, extra = {}) => Object.assign({ id, claim: 'c', source: { type: '复现', ref: 't' }, tags: ['陷阱'] }, extra);

// ⑥ 条目带 hint ⇒ 用条目文本（而不是内置兜底），事件里标 hintSource=entry
makeFixture([mk('edit', 60_000)], [REC('canon-trap-edit-context-mismatch', { hint: '条目里的反射文本（应被采用）' })]);
({ rows } = captureRows({ akashaDir: FIX, preflightHints: true }, ['edit']));
row = rows.find((r) => r.name === 'akasha:preflight');
let line6 = row && row.text();
T('⑥ 条目 hint 被采用', typeof line6 === 'string' && line6.includes('条目里的反射文本'), String(line6));
T('⑥ 事件标 hintSource=entry', readFileSync(join(FIX, 'logs', 'hooks.jsonl'), 'utf8').includes('"hintSource":"entry"'));

// ⑦ 条目已退役 ⇒ 不执行过期反射（null）
makeFixture([mk('edit', 60_000)], [REC('canon-trap-edit-context-mismatch', { claim: '此条目已退役（墓碑）', hint: '不该出现的反射' })]);
({ rows } = captureRows({ akashaDir: FIX, preflightHints: true }, ['edit']));
row = rows.find((r) => r.name === 'akasha:preflight');
T('⑦ 已退役 ⇒ 不渲染', row && row.text() === null, String(row && row.text()));

// ⑧ hint_until 过期 ⇒ 不执行（要求复核）
makeFixture([mk('edit', 60_000)], [REC('canon-trap-edit-context-mismatch', { hint: '过期反射', hint_until: '2020-01-01' })]);
({ rows } = captureRows({ akashaDir: FIX, preflightHints: true }, ['edit']));
row = rows.find((r) => r.name === 'akasha:preflight');
T('⑧ hint_until 过期 ⇒ 不渲染', row && row.text() === null, String(row && row.text()));

// ⑨ 库可读但条目在链上不存在 ⇒ **fail closed：不打**（库是唯一来源，缺条目不回落兜底）
makeFixture([mk('read', 60_000)], [REC('canon-trap-edit-context-mismatch')]);
({ rows } = captureRows({ akashaDir: FIX, preflightHints: true }, ['read']));
row = rows.find((r) => r.name === 'akasha:preflight');
T('⑨ 条目缺失 ⇒ fail closed（不打）', row && row.text() === null, String(row && row.text()));

// ⑩ 库不可读（无 loadStore 的桩）⇒ 走内置兜底（过渡期兼容）
makeFixture([mk('edit', 60_000)]);
({ rows } = captureRows({ akashaDir: FIX, preflightHints: true }, ['edit']));
row = rows.find((r) => r.name === 'akasha:preflight');
const line10 = row && row.text();
T('⑩ 库不可读 ⇒ 内置兜底仍可用', typeof line10 === 'string' && line10.includes('[坑前提示]'), String(line10));
T('⑩ 事件标 hintSource=fallback', readFileSync(join(FIX, 'logs', 'hooks.jsonl'), 'utf8').includes('"hintSource":"fallback"'));

// ⑪–⑫ 首用预告（2026-10-11 新增：补"漏召"的结构缺口——动手前预检，不依赖历史失败）
makeFixture([mk('edit', 24 * 60 * 60 * 1000)]);   // 只有一条 24 小时前的失败（在 30 分钟窗口之外）
({ rows } = captureRows({ akashaDir: FIX, preflightHints: true }, []));
row = rows.find((r) => r.name === 'akasha:preflight');
const l11 = row && row.text();
T('⑪ 无近期失败也出"首用预告"', typeof l11 === 'string' && l11.includes('首用'), String(l11));
T('⑪ 事件标 mode=first-use', readFileSync(join(FIX, 'logs', 'hooks.jsonl'), 'utf8').includes('"mode":"first-use"'));
const seen = [];
for (let i = 0; i < 6; i++) { const x = row && row.text(); if (x) seen.push((x.match(/首用\]\s*(\S+)/) || [])[1]); }
T('⑫ 同一工具不重复预告', new Set(seen).size === seen.length, JSON.stringify(seen));
T('⑫ 全部预告完后返回 null', (row && row.text()) === null);

// ⑬–⑭ 极限观测行（2026-10-11）：轮次真值 / 召回刷新 / 压缩计数 / 未知轮次静默
makeFixture([mk('edit', 24 * 60 * 60 * 1000)]);
const cap13 = captureRows({ akashaDir: FIX, preflightHints: false }, []);
const extRow = cap13.rows.find((r) => r.name === 'akasha:extreme');
T('⑬ 注册了 akasha:extreme 行', !!extRow, JSON.stringify(cap13.rows.map((r) => r.name)));
T('⑬ 未知轮次 ⇒ 静默（不伪造）', !!extRow && extRow.text() === null, String(extRow && extRow.text()));
for (const fn of cap13.handlers['agent/turn-stopping'] || []) fn({ turn: 312 });
T('⑬ 有轮次真值 ⇒ 渲染（并标本进程口径）', typeof (extRow && extRow.text()) === 'string' && extRow.text().includes('轮=312') && extRow.text().includes('本进程'), String(extRow && extRow.text()));
for (const fn of cap13.handlers['tools/result'] || []) fn({ name: 'mcp__akasha__akasha_lookup' }, { isError: false });   // 312 轮查库
for (const fn of cap13.handlers['agent/turn-stopping'] || []) fn({ turn: 320 });
T('⑭ 距上次查库随轮次增长（312 查过 ⇒ 8 轮）', !!extRow && extRow.text().includes('距今 8 轮'), String(extRow && extRow.text()));
for (const fn of cap13.handlers['tools/result'] || []) fn({ name: 'mcp__akasha__akasha_lookup' }, { isError: false });   // 320 轮再查
T('⑭ 召回后「距上次查库」归零', !!extRow && extRow.text().includes('距今 0 轮'), String(extRow && extRow.text()));
for (const fn of cap13.handlers['session/event'] || []) fn({ type: 'compaction/end' });
T('⑭ 压缩事件计数入行', !!extRow && extRow.text().includes('压缩=1'), String(extRow && extRow.text()));
for (const fn of cap13.handlers['tools/result'] || []) fn({ name: 'pwsh', args: { command: 'node H:/Harness/akasha/akasha.mjs check' } }, { isError: false });
T('⑭ CLI 查库也计召回', !!extRow && extRow.text().includes('距今 0 轮'), String(extRow && extRow.text()));
T('⑭ ≤80 字', (extRow.text() || '').length <= 80);

makeFixture([mk('edit', 24 * 60 * 60 * 1000)]);
const cap15 = captureRows({ akashaDir: FIX, preflightHints: false }, []);
const cmpRow = cap15.rows.find((r) => r.name === 'akasha:compensate');
T('⑮ 注册了 akasha:compensate 行', !!cmpRow, JSON.stringify(cap15.rows.map((r) => r.name)));
for (const fn of cap15.handlers['agent/turn-stopping'] || []) fn({ turn: 100 });
T('⑮ 未压缩过 ⇒ 静默', !!cmpRow && cmpRow.text() === null, String(cmpRow && cmpRow.text()));
for (const fn of cap15.handlers['session/event'] || []) fn({ type: 'compaction/end' });
for (const fn of cap15.handlers['agent/turn-stopping'] || []) fn({ turn: 105 });
T('⑮ 压缩后 5 轮（≤15）⇒ 脆弱窗提示', !!cmpRow && /脆弱窗/.test(cmpRow.text() || ''), String(cmpRow && cmpRow.text()));
for (const fn of cap15.handlers['session/event'] || []) fn({ type: 'compaction/end' });
for (const fn of cap15.handlers['session/event'] || []) fn({ type: 'compaction/end' });
for (const fn of cap15.handlers['agent/turn-stopping'] || []) fn({ turn: 130 });
T('⑯ 压缩 ≥3 且未查库 ⇒ 提示先查', !!cmpRow && /先查库再答/.test(cmpRow.text() || ''), String(cmpRow && cmpRow.text()));
for (const fn of cap15.handlers['tools/result'] || []) fn({ name: 'mcp__akasha__akasha_lookup' }, { isError: false });
for (const fn of cap15.handlers['agent/turn-stopping'] || []) fn({ turn: 131 });
T('⑰ 刚查过库 ⇒ 不再催（闭环）', !!cmpRow && !/先查库再答|强制/.test(cmpRow.text() || ''), String(cmpRow && cmpRow.text()));
console.log('\n  ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
