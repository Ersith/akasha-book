// akasha-gate 自测：用桩 ctx 捕获 guard / section，验证判定逻辑（不需要宿主）。
// 运行：node selftest.mjs（退出码 0 = 全过）；全部路径用系统临时目录，无绝对机器路径。
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apply } from './index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORE = join(HERE, '..', '..', 'core'); // 包结构：plugins/akasha-gate → ../../core
const TMP = join(tmpdir(), 'akasha-gate-selftest');
const PROJ = join(TMP, 'proj');
const DATA = join(PROJ, 'data'); // 模拟被测数据目录
const LOG = join(TMP, 'hooks.jsonl');
rmSync(TMP, { recursive: true, force: true });
mkdirSync(DATA, { recursive: true });

function harness(config) {
  const captured = { guard: null, section: null };
  const ctx = {
    tools: { guard(fn) { captured.guard = fn; return () => {}; } },
    systemPrompt: { section(s) { captured.section = s; return () => {}; } },
    on() { return () => {}; }
  };
  apply(ctx, config);
  return captured;
}

const c = harness({ log: LOG, dataDir: DATA, akashaDir: PROJ, sectionOrder: 700 });
assert.ok(c.guard, 'guard 已注册');
assert.ok(c.section, 'section 已注册');

const g = (name, args) => c.guard({ name, arguments: args });
const F = (p) => join(DATA, p); // 数据区文件路径
const N = (p) => join(PROJ, p); // 非数据区路径

// —— 文件工具分支 ——
assert.equal(typeof g('edit', { file_path: F('canon.jsonl') }), 'string', 'edit 直写数据必须被拒');
assert.equal(typeof g('write', { file_path: F('new.jsonl').replace(/\\/g, '/') }), 'string', 'write 直写数据（正斜杠）必须被拒');
assert.equal(typeof g('apply_patch', { path: F('x.jsonl') }), 'string', 'apply_patch 直写数据必须被拒');
assert.equal(g('edit', { file_path: N('README.md') }), undefined, '非数据区 edit 放行');
assert.equal(g('write', { file_path: join(PROJ, 'data2', 'x.jsonl') }), undefined, '相似前缀目录不误伤');

// —— 命令分支 ——
assert.equal(typeof g('pwsh', { command: `Add-Content -Path '${F('x.txt')}' -Value 'x'` }), 'string', 'Add-Content 写数据必须被拒');
assert.equal(typeof g('pwsh', { command: `Set-Content -Path ${F('canon.jsonl').replace(/\\/g, '/')} -Value 'x'` }), 'string', 'Set-Content（正斜杠）必须被拒');
assert.equal(typeof g('pwsh', { command: `Remove-Item '${F('x.jsonl')}'` }), 'string', 'Remove-Item 必须被拒');
assert.equal(typeof g('pwsh', { command: `cmd /c del ${F('x.jsonl')}` }), 'string', 'del 必须被拒');
assert.equal(typeof g('pwsh', { command: `Copy-Item a.jsonl ${F('b.jsonl')}` }), 'string', 'Copy-Item 写入数据必须被拒');

// —— 不误伤（放行） ——
assert.equal(g('pwsh', { command: `Get-Content '${F('canon.jsonl')}' -Encoding UTF8` }), undefined, '读数据放行');
assert.equal(g('pwsh', { command: `cmd /c "chcp 65001>nul & cd /d ${PROJ} && node test.mjs"` }), undefined, '含 > 但无数据区 放行');
assert.equal(g('pwsh', { command: 'node akasha.mjs audit --today 2027-06-01' }), undefined, 'akasha CLI 放行');
assert.equal(g('read', { file_path: F('canon.jsonl') }), undefined, 'read 工具不受影响');

// —— 2026-10-07 复查：JS 箭头函数里的 `>` 不是写重定向 ——
const arrowRead = `node -e "const fs=require('fs');const a=fs.readFileSync('${F('canon.jsonl').replace(/\\/g, '/')}','utf8').split(String.fromCharCode(10)).map(l=>{return l});"`;
assert.equal(g('pwsh', { command: arrowRead }), undefined, '箭头函数 ≠ 写重定向：只读 node -e 必须放行');
assert.equal(typeof g('pwsh', { command: `echo x > ${F('y.txt')}` }), 'string', '带空格重定向写数据仍拦');
assert.equal(typeof g('pwsh', { command: `echo x>${F('y.txt')}` }), 'string', '无空格重定向写数据仍拦');

// —— 系统提示 section（渲染时读库当前版本；读不到回退兜底，永不抛）——
assert.equal(c.section.name, 'akasha:protocol');
assert.equal(c.section.order, 700);
assert.equal(typeof c.section.text, 'function', 'text 为渲染函数（库自己说话）');

// 桩库：akashaDir 指向带 canon-akasha-usage 的临时库（含 lib.mjs 拷贝）
const STUB = join(TMP, 'stub-akasha');
mkdirSync(join(STUB, 'data'), { recursive: true });
copyFileSync(join(CORE, 'lib.mjs'), join(STUB, 'lib.mjs'));
writeFileSync(join(STUB, 'data', 'canon.jsonl'), JSON.stringify({
  id: 'canon-akasha-usage',
  claim: '## 用法（桩）\n- 来源态：学过 / 接触过 / 记得·库内 / 搜到；\n- 开工先 akasha_kit。',
  source: { type: '复现', ref: 'stub' },
  last_reviewed: '2026-01-01'
}) + '\n', 'utf8');
const cStub = harness({ log: LOG, dataDir: DATA, akashaDir: STUB, sectionOrder: 700 });
const libText = cStub.section.text();
assert.ok(String(libText).includes('来源态'), '库驱动路：注入库文本');
assert.ok(String(libText).includes('akasha_kit'), '库文本含用法路由（开工先 kit）');

// 读不到库 → 回退兜底且不抛
const cNo = harness({ log: LOG, dataDir: DATA, akashaDir: join(TMP, 'no-such-akasha-dir'), sectionOrder: 700 });
const fb = cNo.section.text();
assert.ok(String(fb).includes('来源态') && String(fb).includes('akasha_kit'), '兜底文本含纪律与用法');
assert.equal(typeof fb, 'string', '回退路径也必须返回字符串');

// —— 库驱动降级/恢复的切换观测线 ——
// 注：stub 模块用「读标志文件」切换行为，而非重写模块文件——同路径重写会命中 require 缓存。
const logT = join(TMP, 'switch-hooks.jsonl');
const flagPath = join(TMP, 'flag.txt');
const libStub = join(TMP, 'lib.mjs');
writeFileSync(flagPath, 'library', 'utf8');
writeFileSync(libStub, [
  "import { readFileSync } from 'node:fs';",
  `const FLAG = ${JSON.stringify(flagPath)};`,
  'export function loadStore() {',
  "  const mode = readFileSync(FLAG, 'utf8').trim();",
  "  if (mode === 'fallback') throw new Error('forced-fallback');",
  "  return { records: [{ id: 'canon-akasha-usage', claim: '## stub\\n- 来源态：' + mode }] };",
  '}',
  'export function currentRecords(records) { return records; }'
].join('\n'), 'utf8');
const cT = harness({ log: logT, dataDir: DATA, akashaDir: TMP, sectionOrder: 700 });
assert.ok(String(cT.section.text()).includes('来源态：library'), '库驱动路：注入 stub 文本');
writeFileSync(flagPath, 'fallback', 'utf8');
assert.ok(!String(cT.section.text()).includes('来源态：library'), '降级路：stub 抛错 → 回退兜底且不抛');
writeFileSync(flagPath, 'library', 'utf8');
assert.ok(String(cT.section.text()).includes('来源态：library'), '恢复路：回到库驱动');
const logTText = readFileSync(logT, 'utf8');
assert.ok(logTText.includes('"kind":"gate-usage-fallback"'), '降级切换必须落线：gate-usage-fallback');
assert.ok(logTText.includes('"kind":"gate-usage-recovered"'), '恢复切换必须落线：gate-usage-recovered');
rmSync(TMP, { recursive: true, force: true });

console.log('selftest: all assertions passed');
