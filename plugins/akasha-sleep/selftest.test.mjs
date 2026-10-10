// akasha-sleep 自测（v1.5：调度插件 + 核心库 sleep.mjs 双层）。
// 纯函数直接测 ../../core/sleep.mjs；端到端用桩 ctx + 系统临时目录（不碰真实库水位线）。
// 运行：node selftest.mjs（退出码 0 = 全过）
import assert from 'node:assert/strict';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apply, buildWakeNote, isWakeNoteworthy } from './lib/index.js';
import { buildTodos, distillHooks, renderContextLine, renderPulseLine, renderRecallLine, shouldSleep } from '../../core/sleep.mjs';

const CORE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'core');
/** 把核心（sleep.mjs + lib.mjs）拷进桩目录——插件通过 akashaDir 动态加载它们。 */
const seedCore = (dir) => {
  copyFileSync(join(CORE, 'sleep.mjs'), join(dir, 'sleep.mjs'));
  copyFileSync(join(CORE, 'lib.mjs'), join(dir, 'lib.mjs'));
};

// —— 1. distillHooks 纯函数 ——
const lines = [
  JSON.stringify({ kind: 'tool', tool: 'pwsh', ok: true }),
  JSON.stringify({ kind: 'tool', tool: 'pwsh', ok: false, message: 'boom' }),
  JSON.stringify({ kind: 'turn-end', turn: 1 }),
  JSON.stringify({ kind: 'gate-denied', tool: 'edit' }),
  JSON.stringify({ kind: 'agent-error', message: 'x' }),
  'not json'
];
const { counters, notes } = distillHooks(lines);
assert.equal(counters.lines, 5, 'lines 只数可解析记录');
assert.equal(counters.tools, 2);
assert.equal(counters.toolErrors, 1);
assert.equal(counters.turns, 1);
assert.equal(counters.denials, 1);
assert.equal(counters.agentErrors, 1);
assert.equal(counters.byTool.pwsh, 2);
assert.equal(notes.length, 1);

// —— 2. buildTodos 纯函数 ——
const todos = buildTodos(
  { toolErrors: 1, denials: 1, agentErrors: 0 },
  ['工具失败 edit: x'],
  { ok: false, findings: [{ level: 'warn', code: 'frontier-due', count: 68 }] }
);
assert.equal(todos.length, 3, JSON.stringify(todos));
assert.equal(todos[0].kind, 'review');
assert.equal(todos[0].code, 'frontier-due');
assert.equal(todos[1].code, 'tool-error');
assert.equal(todos[2].code, 'gate-denied');
assert.deepEqual(buildTodos({ toolErrors: 0, denials: 0, agentErrors: 0 }, [], { ok: true, findings: [] }), []);
// wave1.1：召回漏进待办（review / recall-miss；排在最后，不改变前面各项的位置）
const withRecall = buildTodos({ toolErrors: 1, denials: 0, agentErrors: 0, failureTurns: 2, recallMisses: 1, lateRecall: 1 }, ['x'],
  { ok: true, findings: [] }, { samples: [{ what: 'bash', session: 'sess-aaaa', ts: '2026-01-01T00:00:00Z' }] });
assert.equal(withRecall.length, 2, JSON.stringify(withRecall));
assert.equal(withRecall[1].kind, 'review');
assert.equal(withRecall[1].code, 'recall-miss');
assert.equal(withRecall[1].count, 1);
assert.ok(withRecall[1].note.includes('1/2 回合') && withRecall[1].note.includes('事后才查 1'), withRecall[1].note);
assert.deepEqual(withRecall[1].samples, ['bash @sess-aaaa 2026-01-01T00:00']);
assert.equal(buildTodos({ recallMisses: 0, failureTurns: 3 }, [], { ok: true, findings: [] }).length, 0, '没有漏召 → 不出待办');

// —— 3. renderContextLine / renderPulseLine / shouldSleep 纯函数 ——
assert.ok(renderContextLine({}).includes('尚未运行'));
const line = renderContextLine({
  lastRunAt: '2026-10-06T23:00:00.000Z', lastTrigger: 'activate', lastReport: 'sleep-2026-10-06.json',
  lastCounters: { lines: 9, tools: 3, toolErrors: 1, denials: 0 }, lastAudit: 'ok'
});
assert.ok(line.includes('2026-10-06T23:00:00.000Z') && line.includes('审计 OK'), line);
assert.ok(renderContextLine({ lastRunAt: 'x', lastAudit: 2, lastCounters: {} }).includes('审计警告 2 条'));
assert.ok(!renderContextLine({ lastRunAt: 'x', lastAudit: 'ok', lastCounters: {}, lastTodo: 0 }).includes('待办'));
assert.ok(renderContextLine({ lastRunAt: 'x', lastAudit: 'ok', lastCounters: {}, lastTodo: 3 }).includes('待办 3 条'));
assert.equal(shouldSleep({}, Date.now(), 6).due, true, '无记录 → 该睡');
assert.equal(shouldSleep({ lastRunAt: new Date().toISOString() }, Date.now(), 6).due, false, '<6h → 不睡');
assert.equal(shouldSleep({ lastRunAt: new Date(Date.now() - 7 * 3600000).toISOString() }, Date.now(), 6).due, true, '>6h → 该睡');

// —— 4. apply 桩 ctx 端到端（临时目录 + 核心拷贝：审计空库 ok + 有待办 → inbox 落行）——
// 注意：本机 C: 可能满（系统 TEMP 也在 C:）——测试落工作区磁盘（H:），成功后在结尾清理。
const scratchRoot = join(tmpdir(), 'akasha-sleep-selftest');
mkdirSync(scratchRoot, { recursive: true });
// 兜底清理：断言失败中断也清掉临时目录（2026-10-07 复查捕获「失败留残渣」）
const cleanupDirs = [];
process.on('exit', () => {
  for (const d of cleanupDirs) { try { rmSync(d, { recursive: true, force: true }); } catch { /* 兜底失败不遮错误 */ } }
});
const dir = mkdtempSync(join(scratchRoot, 'akasha-sleep-'));
cleanupDirs.push(dir);
seedCore(dir);
const logPath = join(dir, 'hooks.jsonl');
const statePath = join(dir, 'sleep-state.json');
const inboxPath = join(dir, 'inbox.jsonl');
appendFileSync(logPath, [
  JSON.stringify({ kind: 'tool', tool: 'read', ok: true }),
  JSON.stringify({ kind: 'tool', tool: 'edit', ok: false, message: 'denied by gate' }),
  JSON.stringify({ kind: 'gate-denied', tool: 'edit', target: 'x' })
].join('\n') + '\n');

const contexts = [];
const onHandlers = {};
let intervalArgs = null;
let timerOwnerCleanup = null;
const ctx = {
  on(name, fn) { (onHandlers[name] = onHandlers[name] || []).push(fn); return () => {}; },
  effect(cb) { timerOwnerCleanup = cb(); return () => {}; },
  interval(fn, ms) { intervalArgs = [fn, ms]; return () => {}; },
  systemPrompt: { context(c) { contexts.push(c); return () => {}; } }
};
apply(ctx, { log: logPath, stateFile: statePath, inboxFile: inboxPath, akashaDir: dir, minIntervalHours: 6, timerCheckMs: 3600000, contextOrder: 130, pulseOrder: 132 });

const sleepCtx = contexts.find((c) => c.name === 'akasha:sleep');
const pulseCtx = contexts.find((c) => c.name === 'akasha:pulse');
assert.ok(sleepCtx, 'systemPrompt.context（akasha:sleep）已注册');
assert.equal(sleepCtx.order, 130);
assert.ok(pulseCtx, 'systemPrompt.context（akasha:pulse）已注册');
assert.equal(pulseCtx.order, 132);
const emptyPulse = pulseCtx.text();
assert.ok(emptyPulse !== null && emptyPulse.includes('canon 0'), '桩空库 → 脉搏渲染全 0 行且不抛：' + emptyPulse);
// v1.5：模拟一次工具失败 → 脉搏条追一行回查提示（错误钩子的注入级动作）
assert.ok((onHandlers['tools/result'] || []).length >= 1, '已监听 tools/result');
assert.ok((onHandlers['agent/error'] || []).length >= 1, '已监听 agent/error');
onHandlers['tools/result'][0]({ name: 'pwsh' }, { isError: true });
const pulseWithRecall = pulseCtx.text();
assert.ok(pulseWithRecall.includes('回查提示') && pulseWithRecall.includes('pwsh'), '失败后脉搏条应追一行回查提示：' + pulseWithRecall);
assert.ok(intervalArgs && intervalArgs[1] === 3600000 && typeof intervalArgs[0] === 'function', '定时兜底已注册（ctx.interval，随 inject:["timer"] 合法）');
assert.equal(typeof timerOwnerCleanup, 'function', 'timer 清理已交给 ctx.effect（插件卸载即停）');

// 防御回归：ctx 上没有 interval 时 apply 也不得抛（v1.1.0 事故的性质是「属性访问本身抛」）
const ctx2 = { on() { return () => {}; }, effect() { return () => {}; }, systemPrompt: { context() { return () => {}; } } };
let threw = null;
try { apply(ctx2, { log: logPath, stateFile: statePath, inboxFile: inboxPath, akashaDir: dir, minIntervalHours: 6, timerCheckMs: 3600000, contextOrder: 130 }); }
catch (e) { threw = e; }
assert.equal(threw, null, 'interval 缺失时 apply 不得抛：' + (threw && threw.message));

const reportPath = join(dir, 'logs', `sleep-${new Date().toISOString().slice(0, 10)}.json`);
assert.ok(existsSync(reportPath), '激活首跑生成报告');
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
// 夹具：edit 失败前没有查库 → 除 tool-error / gate-denied 外，再出一条 recall-miss 复盘待办（wave1.1）
assert.equal(report.todo.length, 3, JSON.stringify(report.todo));
assert.deepEqual(report.todo.map((x) => x.code), ['tool-error', 'gate-denied', 'recall-miss']);
assert.equal(report.counters.recallMisses, 1);
assert.equal(report.counters.toolErrors, 1);

assert.ok(existsSync(inboxPath), '有待办时写 inbox');
const inboxLine = JSON.parse(readFileSync(inboxPath, 'utf8').trim().split(/\r?\n/).pop());
assert.equal(inboxLine.kind, 'todo');
assert.equal(inboxLine.items.length, 3);
assert.ok(inboxLine.items.some((x) => x.kind === 'review' && x.code === 'recall-miss'), '召回漏写进 inbox');

const state = JSON.parse(readFileSync(statePath, 'utf8'));
assert.equal(state.processedLines, 3, '水位线=已处理行数');
assert.equal(state.lastTrigger, 'activate');
assert.equal(state.lastAudit, 'ok', '桩空库上 audit 通过（审计降级路径见第 8 节无核心用例）');
assert.equal(state.lastTodo, 3);

const text = sleepCtx.text();
assert.ok(text.includes('审计 OK') && text.includes('待办 3 条') && text.includes('失败前未查库 1/1 回合'), text);

// 定时回调触发 → 去抖挡住并留痕
intervalArgs[0]();
const logText = readFileSync(logPath, 'utf8');
assert.ok(logText.includes('"kind":"sleep-skip"') && logText.includes('"trigger":"timer"'), '定时回调走去抖留痕');
assert.ok(logText.includes('"kind":"sleep-done"'), 'sleep-done 落观测线');
assert.ok(logText.includes('"kind":"sleep-armed"'), 'sleep-armed 落观测线');
assert.ok(logText.includes('"kind":"wake-note-llm-skip"'), '唤醒条跳过留痕（appModulesDir 未配置）');
assert.ok(logText.includes('"todo":3'), 'sleep-done 带待办数（含 recall-miss）');

// 注意：不在此处删 dir——§6 的 ctxLive 要读到本目录的桩 state（桩 state 缺失会让它 boot 触发
// activate、把空报告写进真库 logs——2026-10-07 复查捕获）；统一由终末清理 + exit 兜底。

// —— 5. 唤醒条纯函数（M6b）——
const kLib = { canon: 1, mirror: 2, orphan: 3, pricing: 4, lexicon: 5, frontier: 6 };
const kQuiet = { sleep: { lastRunAt: 'x', trigger: 'activate', todo: 0 }, inbox: { totalItems: 0 }, review: { findings: [], ok: true }, library: kLib };
assert.equal(isWakeNoteworthy({ ...kQuiet, sleep: null }), true, '未跑过睡眠 → 值得提醒');
assert.equal(isWakeNoteworthy(kQuiet), false, '一切平静 → 不打扰');
assert.equal(isWakeNoteworthy({ ...kQuiet, inbox: { totalItems: 2 } }), true, '有待办 → 提醒');
assert.equal(isWakeNoteworthy({ ...kQuiet, review: { findings: [{ level: 'warn', code: 'frontier-due', count: 3 }], ok: false } }), true, '审计警告 → 提醒');
const note = buildWakeNote({ ...kQuiet, inbox: { totalItems: 2 } });
assert.ok(note.includes('起床包') && note.includes('canon 1') && note.includes('待办 inbox：2 条') && note.includes('akasha_kit'), note);
const noteWarn = buildWakeNote({ ...kQuiet, review: { findings: [{ level: 'warn', code: 'frontier-due', count: 3 }], ok: false } });
assert.ok(noteWarn.includes('审计：frontier-due×3'), noteWarn);

// —— 6. 库脉搏（v1.3）：纯函数两路 + 真库渲染一路 ——
assert.equal(renderPulseLine(null), null);
assert.equal(renderPulseLine({}), null);
const stubPulse = renderPulseLine({
  stores: { canon: { count: 26, current: 24 }, frontier: { count: 92, current: 89 } },
  newest: { store: 'canon', id: 'canon-akasha-usage-r2', ageText: '5 分钟前' }
});
assert.ok(stubPulse.includes('库脉搏') && stubPulse.includes('canon 24') && stubPulse.includes('frontier 89')
  && stubPulse.includes('canon-akasha-usage-r2') && stubPulse.includes('5 分钟前'), stubPulse);

// —— 6b. 回查条（v1.5 纯函数）：窗口内失败 → 提示；窗口外 / 空 → null ——
assert.equal(renderRecallLine([], Date.now()), null);
assert.equal(renderRecallLine(null, Date.now()), null);
assert.equal(renderRecallLine([{ ts: Date.now() - 4000000, tool: 'pwsh' }], Date.now()), null, '窗口外（>30min）不提示');
const recall = renderRecallLine([{ ts: Date.now() - 60000, tool: 'pwsh' }, { ts: Date.now() - 30000, tool: 'edit' }], Date.now());
assert.ok(recall && recall.includes('2 次失败') && recall.includes('pwsh') && recall.includes('edit') && recall.includes('回查'), recall);

// 真库渲染：另起桩 ctx，akashaDir 指向真库 → 脉搏行必须带出当前计数与最近写入
const contexts2 = [];
const ctxLive = {
  on() { return () => {}; },
  effect() { return () => {}; },
  interval() { return () => {}; },
  systemPrompt: { context(c) { contexts2.push(c); return () => {}; } }
};
apply(ctxLive, { log: logPath, stateFile: statePath, inboxFile: inboxPath, akashaDir: CORE, minIntervalHours: 6, timerCheckMs: 3600000, contextOrder: 130, pulseOrder: 132 });
const livePulse = contexts2.find((c) => c.name === 'akasha:pulse').text();
// 空库：全零行（「含最近写入」的格式化断言由上方 stubPulse 覆盖）
assert.ok(livePulse === null || (typeof livePulse === 'string' && livePulse.includes('阿卡夏·库脉搏')), String(livePulse));

// —— 7. 写路径静默失败 → 观测线（v1.3.1：静默失败类清剿；v1.4 后由核心 sleep.mjs 发线）——
const dirB = mkdtempSync(join(scratchRoot, 'akasha-sleep-b-'));
cleanupDirs.push(dirB);
seedCore(dirB);
const blocker = join(dirB, 'blocker');
writeFileSync(blocker, 'x', 'utf8'); // 用文件冒充目录 → state / inbox 写必失败
const logB = join(dirB, 'hooks.jsonl');
appendFileSync(logB, JSON.stringify({ kind: 'tool', tool: 'edit', ok: false, message: 'x' }) + '\n', 'utf8');
const ctxB = {
  on() { return () => {}; },
  effect() { return () => {}; },
  interval() { return () => {}; },
  systemPrompt: { context() { return () => {}; } }
};
apply(ctxB, { log: logB, stateFile: join(blocker, 'state.json'), inboxFile: join(blocker, 'inbox.jsonl'), akashaDir: dirB, minIntervalHours: 6, timerCheckMs: 3600000, contextOrder: 130, pulseOrder: 132 });
const logBText = readFileSync(logB, 'utf8');
assert.ok(logBText.includes('"kind":"sleep-state-error"'), '状态写失败 → sleep-state-error 落线');
assert.ok(logBText.includes('"kind":"sleep-inbox-error"'), 'inbox 写失败（待办不丢得无声无息）→ sleep-inbox-error 落线');
rmSync(dirB, { recursive: true, force: true });

// —— 8. 无核心降级（v1.4 切分）：apply 不炸 + sleep-error 留痕 + 条子提示 ——
const dirC = mkdtempSync(join(scratchRoot, 'akasha-sleep-c-'));
cleanupDirs.push(dirC);
const logC = join(dirC, 'hooks.jsonl');
const contextsC = [];
const ctxC = {
  on() { return () => {}; },
  effect() { return () => {}; },
  interval() { return () => {}; },
  systemPrompt: { context(c) { contextsC.push(c); return () => {}; } }
};
let threwC = null;
try { apply(ctxC, { log: logC, stateFile: join(dirC, 'state.json'), inboxFile: join(dirC, 'inbox.jsonl'), akashaDir: dirC, minIntervalHours: 6, timerCheckMs: 3600000, contextOrder: 130, pulseOrder: 132 }); }
catch (e) { threwC = e; }
assert.equal(threwC, null, '无核心时 apply 不得抛');
const logCText = existsSync(logC) ? readFileSync(logC, 'utf8') : '';
assert.ok(logCText.includes('"kind":"sleep-error"'), '无核心 → sleep-error 留痕');
const sleepLineC = contextsC.find((c) => c.name === 'akasha:sleep').text();
assert.ok(String(sleepLineC).includes('核心库不可用'), sleepLineC);
rmSync(dirC, { recursive: true, force: true });

// —— STORE 审计边界用例：malformed / 回滚（rollback）语义 / 并发节流 ——
{
  const { isWakeNoteworthy, buildWakeNote } = await import('./lib/index.js');
  assert.doesNotThrow(() => isWakeNoteworthy({}), 'malformed：空状态对象不得抛');
  assert.equal(typeof buildWakeNote({ library: { canon: 0, mirror: 0, orphan: 0, pricing: 0, lexicon: 0, frontier: 0 } }), 'string', 'malformed 输入仍产出字符串（不抛、不静默吞）');
  // 回滚（rollback）语义：核心库不可用（上面 dirC 场景）→ 不得落地任何状态，水位线不得推进
  assert.ok(!existsSync(join(dirC, 'logs', 'sleep-state.json')), '回滚：核心库不可用 → sleep-state.json 不得存在（失败不推进水位线）');
}

// —— 终末清理 ——
rmSync(dir, { recursive: true, force: true });

console.log('selftest: all assertions passed');
