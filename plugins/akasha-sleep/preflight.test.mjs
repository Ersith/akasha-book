// preflight.test.mjs —— C1 自测断言：正向 / 去重 / 映射表外 / 关闭双停
// 做法：构造一个 akashaDir 夹具（lib.mjs + logs/hooks.jsonl），用桩 ctx 捕获注册，直接驱动 text()。
import { apply } from './lib/index.js';
import { mkdirSync, writeFileSync, copyFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const REAL = 'H:\\Harness\\akasha';
const FIX = 'H:\\Harness\\_ab\\preflight-fixture';

function makeFixture(hooksLines) {
  rmSync(FIX, { recursive: true, force: true });
  mkdirSync(join(FIX, 'data'), { recursive: true });
  mkdirSync(join(FIX, 'logs'), { recursive: true });
  // 夹具用**桩 lib.mjs**：只导出 RECALL_TRAP_MAP（专测"行逻辑"，不依赖真实库能不能加载）
  writeFileSync(join(FIX, 'lib.mjs'),
    'export const RECALL_TRAP_MAP = { edit: ["canon-trap-edit-context-mismatch"], read: ["canon-trap-read-offset-range"], grep: ["canon-trap-grep-exit2-path"] };\n',
    'utf8');
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
  T('② 同工具二次调用被去重（null）', typeof line === 'string' && row.text() === null);
}

// ③ 映射表外工具 ⇒ 不提示
makeFixture([mk('blender_python', 60_000)]);
({ rows } = captureRows({ akashaDir: FIX, preflightHints: true }, ["blender_python"]));
row = rows.find((r) => r.name === 'akasha:preflight');
T('③ 映射表外工具不渲染', !!row && row.text() === null, String(row && row.text()));

// ④ 关闭开关 ⇒ 不注册该行（也就不会有事件）
makeFixture([mk('edit', 60_000)]);
({ rows } = captureRows({ akashaDir: FIX, preflightHints: false }, ["edit"]));
T('④ 关闭时不注册 akasha:preflight', !rows.some((r) => r.name === 'akasha:preflight'));

// ⑤ 事件：开启时写 preflight 事件，关闭时行数不变
makeFixture([mk('edit', 60_000)]);
({ rows } = captureRows({ akashaDir: FIX, preflightHints: true }, []));
row = rows.find((r) => r.name === 'akasha:preflight');
const before = readFileSync(join(FIX, 'logs', 'hooks.jsonl'), 'utf8').split('\n').filter(Boolean).length;
row.text();
const after = readFileSync(join(FIX, 'logs', 'hooks.jsonl'), 'utf8');
T('⑤ 开启时写了 kind=preflight 事件', after.includes('"kind":"preflight"'), after.split('\n').slice(-1)[0]);
makeFixture([mk('edit', 60_000)]);
captureRows({ akashaDir: FIX, preflightHints: false }, ["edit"]);
const offLater = readFileSync(join(FIX, 'logs', 'hooks.jsonl'), 'utf8');
T('⑤ 关闭时无 preflight 事件（双停）', !offLater.includes('"kind":"preflight"'));

console.log('\n  ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
