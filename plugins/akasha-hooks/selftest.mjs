// akasha-hooks 自测（v1.2：记录层 + 输出审计；夹具＝宿主真值：revision 逐帧递增）。
// 桩 ctx 收集监听；临时 akashaDir（拷贝核心 lib.mjs + 假 data/canon.jsonl）验证 usage / output-audit 线。
// 运行：node selftest.mjs（退出码 0 = 全过）
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apply } from './index.js';

const CORE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'core');
const scratchRoot = join(tmpdir(), 'akasha-hooks-selftest');
mkdirSync(scratchRoot, { recursive: true });
const cleanupDirs = [];
process.on('exit', () => {
  for (const d of cleanupDirs) { try { rmSync(d, { recursive: true, force: true }); } catch { /* 兜底失败不遮错误 */ } }
});

const dir = mkdtempSync(join(scratchRoot, 'akasha-hooks-'));
cleanupDirs.push(dir);
copyFileSync(join(CORE, 'lib.mjs'), join(dir, 'lib.mjs'));
mkdirSync(join(dir, 'data'), { recursive: true });
writeFileSync(join(dir, 'data', 'canon.jsonl'), JSON.stringify({
  id: 'canon-test-item-xyz', claim: '测试条目', source: { type: '复现', ref: 'selftest' }, last_reviewed: '2026-10-07'
}) + '\n', 'utf8');

const logPath = join(dir, 'hooks.jsonl');
const handlers = {};
const ctx = { on(name, fn) { (handlers[name] = handlers[name] || []).push(fn); return () => {}; } };
apply(ctx, { log: logPath, akashaDir: dir, idleDebounceMs: 1 });

// —— 1. 激活线 + 监听面 ——
let text = readFileSync(logPath, 'utf8');
assert.ok(text.includes('"kind":"activated"'), '激活线');
for (const ev of ['session/event', 'tools/result', 'agent/error', 'agent/status', 'agent/assistant-stream']) {
  assert.ok((handlers[ev] || []).length >= 1, '已监听 ' + ev);
}

// —— 2. 流累积 + 审计（committed 的 assistant/message）——
//    宿主真值＝每帧 revision 递增；id 可能被切分在不同 chunk。累积必须跨 revision 连续。
const stream = handlers['agent/assistant-stream'][0];
stream({ agent: { id: 'sess-1' }, frame: { type: 'start', attemptId: 'a1', revision: 1, turn: 1, step: 1 } });
stream({ agent: { id: 'sess-1' }, frame: { type: 'chunk', attemptId: 'a1', revision: 2, index: 0, time: 0, chunk: { type: 'text-delta', index: 0, text: '见 canon-test-' } } });
stream({ agent: { id: 'sess-1' }, frame: { type: 'chunk', attemptId: 'a1', revision: 3, index: 1, time: 0, chunk: { type: 'text-delta', index: 1, text: 'item-xyz 与 canon-nope-abcdef' } } });
stream({ agent: { id: 'sess-1' }, frame: { type: 'end', attemptId: 'a1', revision: 4, index: 2, outcome: { kind: 'committed', eventType: 'assistant/message', seq: 9 } } });
text = readFileSync(logPath, 'utf8');
assert.ok(text.includes('"kind":"usage"') && text.includes('canon-test-item-xyz'), 'usage 线（真 id，跨帧切分也必须还原）');
assert.ok(text.includes('"kind":"output-audit"') && text.includes('canon-nope-abcdef'), 'output-audit 线（假 id）');

// —— 3. abandoned 流不落线 ——
const before = readFileSync(logPath, 'utf8').length;
stream({ agent: { id: 's' }, frame: { type: 'start', attemptId: 'a2', revision: 1, turn: 2, step: 1 } });
stream({ agent: { id: 's' }, frame: { type: 'chunk', attemptId: 'a2', revision: 1, index: 0, time: 0, chunk: { type: 'text-delta', index: 0, text: 'canon-ghost-xxxxxx' } } });
stream({ agent: { id: 's' }, frame: { type: 'end', attemptId: 'a2', revision: 1, index: 1, outcome: { kind: 'abandoned' } } });
assert.equal(readFileSync(logPath, 'utf8').length, before, 'abandoned 流不落线');

// —— 4. 逐帧递增 revision 为宿主真值：累积不得重置（修复回归哨兵） ——
stream({ agent: { id: 's' }, frame: { type: 'start', attemptId: 'a3', revision: 1, turn: 3, step: 1 } });
stream({ agent: { id: 's' }, frame: { type: 'chunk', attemptId: 'a3', revision: 2, index: 0, time: 0, chunk: { type: 'text-delta', index: 0, text: 'canon-ghost-yyyyy' } } });
stream({ agent: { id: 's' }, frame: { type: 'chunk', attemptId: 'a3', revision: 3, index: 1, time: 0, chunk: { type: 'text-delta', index: 1, text: ' 收尾' } } });
stream({ agent: { id: 's' }, frame: { type: 'end', attemptId: 'a3', revision: 4, index: 2, outcome: { kind: 'committed', eventType: 'assistant/attempt', seq: 10 } } });
text = readFileSync(logPath, 'utf8');
assert.ok(text.includes('"eventType":"assistant/attempt"'), 'attempt 线带 eventType');
assert.ok(text.includes('canon-ghost-yyyyy'), '早帧内容必须保留到 end（跨 revision 累积）');

// —— 5. 无核心降级：akashaDir 指向空目录 → apply 不炸、审计静默跳过、激活线仍在 ——
const dirC = mkdtempSync(join(scratchRoot, 'akasha-hooks-c-'));
cleanupDirs.push(dirC);
const logC = join(dirC, 'hooks.jsonl');
const ctxC = { on() { return () => {}; } };
let threw = null;
try { apply(ctxC, { log: logC, akashaDir: dirC }); } catch (e) { threw = e; }
assert.equal(threw, null, '无核心时 apply 不得抛：' + (threw && threw.message));
assert.ok(readFileSync(logC, 'utf8').includes('"kind":"activated"'), '降级时激活线仍在');

console.log('selftest: all assertions passed');
