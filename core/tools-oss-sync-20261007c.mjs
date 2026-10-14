// akasha/tools/oss-sync-20261007c.mjs
// 2026-10-07：把「阿卡夏本体维护批 + 小阿卡夏」同步进开源包 dist\akasha-oss\（幂等；含脱敏与终扫）。
// 约定（沿用首版 OSS 包）：~/.akasha 家目录默认 / @akasha-book/ scope / 零本机路径 / 零密钥 / <AKASHA_DIR> 占位。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = '<LOCAL_PATH>';
const OSS = join(SRC, 'dist', 'akasha-oss');
const report = [];
const misses = [];

function read(p) { return readFileSync(p, 'utf8'); }
function put(p, text) {
  mkdirSync(dirname(p), { recursive: true });
  if (existsSync(p) && read(p) === text) { report.push(['same', p]); return; }
  writeFileSync(p, text, 'utf8');
  report.push(['updated', p]);
}

// —— 全局脱敏规则（顺序重要）——
function sanitize(text) {
  return String(text)
    .replace(/H:[\\/]{1,4}Harness[\\/]{1,4}official-home[\\/]{1,4}sessions/g, '~/.dsh/sessions')
    .replace(/H:[\\/]{1,4}Harness[\\/]{1,4}akasha/g, '~/.akasha')
    .replace(/~\/\.akasha[\\]{1,2}/g, '~/.akasha/')
    .replace(/H:[\\/]{1,4}Harness[\\/]{1,4}_scratch/g, '<scratch>')
    .replace(/H:[\\/]{1,4}Harness/g, '~')
    .replace(/@local\//g, '@akasha-book/')
    .replace(/阿巴阿巴/g, '试运行')
    .replace(/受控解冻第十六次/g, '受控解冻');
}

function patch(dest, pairs) {
  if (!existsSync(dest)) { misses.push([dest, '文件不存在']); return; }
  let text = read(dest);
  let changed = 0;
  for (const [find, repl] of pairs) {
    if (!text.includes(find)) { misses.push([dest, '锚点未命中：' + find.slice(0, 60).replace(/\n/g, '⏎')]); continue; }
    text = text.replace(find, repl);
    changed += 1;
  }
  put(dest, text);
}

// ========== 1. core/ 同步（复制 + 脱敏 + 特例补丁） ==========
for (const f of ['lib.mjs', 'akasha.mjs', 'mcp.mjs', 'sleep.mjs', 'test.mjs', 'SCHEMA.md']) {
  put(join(OSS, 'core', f), sanitize(read(join(SRC, 'akasha', f))));
}
put(join(OSS, 'core', 'loop-detect.mjs'), sanitize(read(join(SRC, 'akasha', 'loop-detect.mjs'))));

// session.mjs：脱敏 + 家目录风格默认值 + 去内部文档引用
{
  let t = sanitize(read(join(SRC, 'akasha', 'session.mjs')));
  const pairs = [
    ["import { ROOT, loadStore, tokenize, matchScore } from './lib.mjs';",
     "import { homedir } from 'node:os';\nimport { ROOT, loadStore, tokenize, matchScore } from './lib.mjs';"],
    ["// 设计稿：docs\\superpowers\\specs\\2026-10-07-session-akasha-design.md（v0.4）\n// 计划：docs\\superpowers\\plans\\2026-10-07-session-layer-v0.md（阶段 1）\n// 读取器移植自 ..\\tools\\session-scan.mjs（多帧 zstd 容器：按魔数 28 B5 2F FD 逐帧解压）。",
     "// 会话层 v0：会话档案读取 / 段抽取 / 索引 / 检索（单会话记忆）；多帧 zstd 容器按魔数逐帧解压。"],
    ["  sessionsRoot: '~/.dsh/sessions'",
     "  sessionsRoot: join(homedir(), '.dsh', 'sessions')  // 按你的宿主实际会话目录配置"]
  ];
  for (const [find, repl] of pairs) {
    if (!t.includes(find)) { misses.push(['session.mjs', '锚点未命中：' + find.slice(0, 50).replace(/\n/g, '⏎')]); continue; }
    t = t.replace(find, repl);
  }
  put(join(OSS, 'core', 'session.mjs'), t);
}

// ========== 2. plugins/ 既有三件：差分补丁 ==========
patch(join(OSS, 'plugins', 'akasha-gate', 'index.js'), [
  ['// 阿卡夏之书门控 v1.1 —— 三件可机检的事',
   '// 阿卡夏之书门控 v1.2 —— 三件可机检的事'],
  ["const WRITE_IDIOM = /(>>|>\\s*[^\\s|]|Set-Content|Add-Content|Out-File|Remove-Item|Move-Item|Copy-Item|New-Item|Set-Item|tee\\b|sed -i|drop\\b|delete\\b|\\bdel\\b)/i;",
   "// 2026-10-07 复查：重定向判定排除 JS 箭头（`=>`）与 `2>&1`——`(?<![=\\-])` 挡 `=>`/`->`，`(?![&=])` 挡 `>&`；\nconst WRITE_IDIOM = /(>>|(?<![=\\-])>(?![&=])\\s*[^\\s|]|Set-Content|Add-Content|Out-File|Remove-Item|Move-Item|Copy-Item|New-Item|Set-Item|tee\\b|sed -i|drop\\b|delete\\b|\\bdel\\b)/i;"]
]);
patch(join(OSS, 'plugins', 'akasha-gate', 'selftest.mjs'), [
  ["assert.equal(g('read', { file_path: '<AKASHA_DIR>\\\\data\\\\canon.jsonl' }), undefined, 'read 工具不受影响');",
   "assert.equal(g('read', { file_path: '<AKASHA_DIR>\\\\data\\\\canon.jsonl' }), undefined, 'read 工具不受影响');\n\n// —— 2026-10-07 复查：JS 箭头函数里的 `>` 不是写重定向 ——\nconst arrowRead = 'node -e \"const fs=require(\\'fs\\');const a=fs.readFileSync(\\'<AKASHA_DIR>/data/canon.jsonl\\',\\'utf8\\').split(\\'\\\\n\\').map(l=>{return l});\"';\nassert.equal(g('pwsh', { command: arrowRead }), undefined, '箭头函数 ≠ 写重定向：只读 node -e 必须放行');\nassert.equal(typeof g('pwsh', { command: 'echo x > <AKASHA_DIR>\\\\data\\\\y.txt' }), 'string', '带空格重定向写数据仍拦');\nassert.equal(typeof g('pwsh', { command: 'echo x><AKASHA_DIR>\\\\data\\\\y.txt' }), 'string', '无空格重定向写数据仍拦');"],
  ['阿卡夏之书门控 v1.1', '阿卡夏之书门控 v1.2']
]);
patch(join(OSS, 'plugins', 'akasha-gate', 'package.json'), [['"version": "1.1.1"', '"version": "1.2.0"']]);

patch(join(OSS, 'plugins', 'akasha-hooks', 'index.js'), [
  ['// 阿卡夏之书钩子 v1.1 ——', '// 阿卡夏之书钩子 v1.2 ——'],
  ["  // 输出审计（v1.1）：累积 assistant 文本流（按 attemptId + revision），committed 结束时跑核心库 auditText——\n  //   引用不存在的库 id → output-audit 线（编造引用嫌疑）；真实 id → usage 线（条目级使用计数 v0）。",
   "  // 输出审计（v1.1；v1.2 修复累积）：按 attemptId 累积 assistant 文本流，committed 结束时跑核心库 auditText——\n  //   引用不存在的库 id → output-audit 线（编造引用嫌疑）；真实 id → usage 线（条目级使用计数 v0）。\n  //   ⚠ 2026-10-07 复查：宿主 revision **逐帧递增**——不得按 revision 重置累积（否则每 chunk 清空、审计恒空）。"],
  ["      if (frame.type === 'start') {\n        streams.set(key, { revision: frame.revision, text: '' });",
   "      if (frame.type === 'start') {\n        streams.set(key, { text: '' });"],
  ["      if (frame.type === 'chunk') {\n        let st = streams.get(key);\n        if (!st || st.revision !== frame.revision) { st = { revision: frame.revision, text: '' }; streams.set(key, st); }\n        const c = frame.chunk;\n        if (c && c.type === 'text-delta' && typeof c.text === 'string') st.text += c.text;\n        return;\n      }",
   "      if (frame.type === 'chunk') {\n        let st = streams.get(key);\n        if (!st) { st = { text: '' }; streams.set(key, st); }\n        const c = frame.chunk;\n        if (c && c.type === 'text-delta' && typeof c.text === 'string') {\n          st.text += c.text;\n          if (st.text.length > 400000) st.text = st.text.slice(-400000); // 保尾\n        }\n        return;\n      }"]
]);
patch(join(OSS, 'plugins', 'akasha-hooks', 'selftest.mjs'), [
  ['// akasha-hooks 自测（v1.1：记录层 + 输出审计）。', '// akasha-hooks 自测（v1.2：记录层 + 输出审计；夹具＝宿主真值：revision 逐帧递增）。'],
  ["// —— 2. 流累积 + 审计（committed 的 assistant/message）：真 id → usage；假 id → output-audit ——\nconst stream = handlers['agent/assistant-stream'][0];\nstream({ agent: { id: 'sess-1' }, frame: { type: 'start', attemptId: 'a1', revision: 1, turn: 1, step: 1 } });\nstream({ agent: { id: 'sess-1' }, frame: { type: 'chunk', attemptId: 'a1', revision: 1, index: 0, time: 0, chunk: { type: 'text-delta', index: 0, text: '见 canon-test-item-xyz' } } });\nstream({ agent: { id: 'sess-1' }, frame: { type: 'chunk', attemptId: 'a1', revision: 1, index: 1, time: 0, chunk: { type: 'text-delta', index: 1, text: ' 与 canon-nope-abcdef' } } });\nstream({ agent: { id: 'sess-1' }, frame: { type: 'end', attemptId: 'a1', revision: 1, index: 2, outcome: { kind: 'committed', eventType: 'assistant/message', seq: 9 } } });\ntext = readFileSync(logPath, 'utf8');\nassert.ok(text.includes('\"kind\":\"usage\"') && text.includes('canon-test-item-xyz'), 'usage 线（真 id）');\nassert.ok(text.includes('\"kind\":\"output-audit\"') && text.includes('canon-nope-abcdef'), 'output-audit 线（假 id）');",
   "// —— 2. 流累积 + 审计（committed 的 assistant/message）——\n//    宿主真值＝每帧 revision 递增；id 可能被切分在不同 chunk。累积必须跨 revision 连续。\nconst stream = handlers['agent/assistant-stream'][0];\nstream({ agent: { id: 'sess-1' }, frame: { type: 'start', attemptId: 'a1', revision: 1, turn: 1, step: 1 } });\nstream({ agent: { id: 'sess-1' }, frame: { type: 'chunk', attemptId: 'a1', revision: 2, index: 0, time: 0, chunk: { type: 'text-delta', index: 0, text: '见 canon-test-' } } });\nstream({ agent: { id: 'sess-1' }, frame: { type: 'chunk', attemptId: 'a1', revision: 3, index: 1, time: 0, chunk: { type: 'text-delta', index: 1, text: 'item-xyz 与 canon-nope-abcdef' } } });\nstream({ agent: { id: 'sess-1' }, frame: { type: 'end', attemptId: 'a1', revision: 4, index: 2, outcome: { kind: 'committed', eventType: 'assistant/message', seq: 9 } } });\ntext = readFileSync(logPath, 'utf8');\nassert.ok(text.includes('\"kind\":\"usage\"') && text.includes('canon-test-item-xyz'), 'usage 线（真 id，跨帧切分也必须还原）');\nassert.ok(text.includes('\"kind\":\"output-audit\"') && text.includes('canon-nope-abcdef'), 'output-audit 线（假 id）');"],
  ["// —— 4. revision 提升 → 旧累积丢弃（重新累积；旧 id 不进审计） ——\nstream({ agent: { id: 's' }, frame: { type: 'start', attemptId: 'a3', revision: 1, turn: 3, step: 1 } });\nstream({ agent: { id: 's' }, frame: { type: 'chunk', attemptId: 'a3', revision: 1, index: 0, time: 0, chunk: { type: 'text-delta', index: 0, text: 'canon-old-xxxxxx' } } });\nstream({ agent: { id: 's' }, frame: { type: 'chunk', attemptId: 'a3', revision: 2, index: 0, time: 0, chunk: { type: 'text-delta', index: 0, text: 'canon-test-item-xyz 重来' } } });\nstream({ agent: { id: 's' }, frame: { type: 'end', attemptId: 'a3', revision: 2, index: 1, outcome: { kind: 'committed', eventType: 'assistant/attempt', seq: 10 } } });\ntext = readFileSync(logPath, 'utf8');\nassert.ok(!text.includes('canon-old-xxxxxx'), 'revision 提升后旧累积被丢弃');\nassert.ok(text.includes('\"eventType\":\"assistant/attempt\"'), 'attempt 线带 eventType');",
   "// —— 4. 逐帧递增 revision 为宿主真值：累积不得重置（修复回归哨兵） ——\nstream({ agent: { id: 's' }, frame: { type: 'start', attemptId: 'a3', revision: 1, turn: 3, step: 1 } });\nstream({ agent: { id: 's' }, frame: { type: 'chunk', attemptId: 'a3', revision: 2, index: 0, time: 0, chunk: { type: 'text-delta', index: 0, text: 'canon-ghost-yyyyy' } } });\nstream({ agent: { id: 's' }, frame: { type: 'chunk', attemptId: 'a3', revision: 3, index: 1, time: 0, chunk: { type: 'text-delta', index: 1, text: ' 收尾' } } });\nstream({ agent: { id: 's' }, frame: { type: 'end', attemptId: 'a3', revision: 4, index: 2, outcome: { kind: 'committed', eventType: 'assistant/attempt', seq: 10 } } });\ntext = readFileSync(logPath, 'utf8');\nassert.ok(text.includes('\"eventType\":\"assistant/attempt\"'), 'attempt 线带 eventType');\nassert.ok(text.includes('canon-ghost-yyyyy'), '早帧内容必须保留到 end（跨 revision 累积）');"]
]);
patch(join(OSS, 'plugins', 'akasha-hooks', 'package.json'), [['"version": "1.1.0"', '"version": "1.2.0"']]);
patch(join(OSS, 'plugins', 'akasha-hooks', 'README.md'), [
  ['阿卡夏之书钩子 **v1.1** ——', '阿卡夏之书钩子 **v1.2** ——'],
  ['（记录文件行）', '（记录文件行）\n\n- **v1.2（2026-10-07 复查修复）**：输出审计按 `attemptId` **连续累积**——宿主 revision 逐帧递增，修复前按 revision 重置会导致审计恒空；id 跨帧切分现已可还原。']
]);

patch(join(OSS, 'plugins', 'akasha-sleep', 'lib', 'index.js'), [
  ['// 阿卡夏之书睡眠器 v1.5 ——', '// 阿卡夏之书睡眠器 v1.5.1 ——'],
  ["      if (payload?.source === 'compact') return;\n      const agent = payload?.agent;",
   "      // 2026-10-07 复查：官方 agent/created 的 source 只有 startup/resume；子代理守卫沿用 header.origin / delegationDepth。\n      const agent = payload?.agent;"]
]);
patch(join(OSS, 'plugins', 'akasha-sleep', 'package.json'), [['"version": "1.5.0"', '"version": "1.5.1"']]);
patch(join(OSS, 'plugins', 'akasha-sleep', 'README.md'), [['阿卡夏之书睡眠器 v1.5 ——', '阿卡夏之书睡眠器 v1.5.1 ——']]);

// ========== 3. plugins/ 新增：akasha-session（小阿卡夏） ==========
{
  const dir = join(OSS, 'plugins', 'akasha-session');
  // lib/index.js：复制 + 脱敏 + 家目录默认值
  let idx = sanitize(read(join(SRC, 'dsh-akasha-session', 'lib', 'index.js')));
  const pairs = [
    ["import { createRequire } from 'node:module';\nimport { dirname, join } from 'node:path';",
     "import { createRequire } from 'node:module';\nimport { homedir } from 'node:os';\nimport { dirname, join } from 'node:path';"],
    ["const DEFAULTS = {\n  log: '~/.akasha/logs/hooks.jsonl',\n  akashaDir: '~/.akasha',\n  sessionsRoot: '~/.dsh/sessions',\n  storeFile: '~/.akasha/data/session.jsonl',\n  metaFile: '~/.akasha/data/session-meta.json',",
     "// 默认值：家目录（~/.akasha）；sessionsRoot 按你的宿主实际会话档案目录配置。\nconst AKASHA_HOME = join(homedir(), '.akasha');\nconst DEFAULTS = {\n  log: join(AKASHA_HOME, 'logs', 'hooks.jsonl'),\n  akashaDir: AKASHA_HOME,\n  sessionsRoot: join(homedir(), '.dsh', 'sessions'),\n  storeFile: join(AKASHA_HOME, 'data', 'session.jsonl'),\n  metaFile: join(AKASHA_HOME, 'data', 'session-meta.json'),"]
  ];
  for (const [find, repl] of pairs) {
    if (!idx.includes(find)) { misses.push([dir + '/lib/index.js', '锚点未命中：' + find.slice(0, 60).replace(/\n/g, '⏎')]); continue; }
    idx = idx.replace(find, repl);
  }
  idx = idx.replace(/~\/\.akasha[\\]{1,2}(?!\\)/g, (m) => m); // 保形（注释里的 ~/.akasha\ 已由全局规则处理为 /）
  put(join(dir, 'lib', 'index.js'), idx);

  // selftest：相对 core + tmpdir + 注入 akashaDir
  let st = read(join(SRC, 'dsh-akasha-session', 'selftest.mjs'));
  const stpairs = [
    ["import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';\nimport { join } from 'node:path';\n\nconst SCRATCH = '<LOCAL_PATH>\\\\_scratch';",
     "import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';\nimport { tmpdir } from 'node:os';\nimport { dirname, join } from 'node:path';\nimport { fileURLToPath } from 'node:url';\n\nconst CORE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'core');\nconst SCRATCH = join(tmpdir(), 'akasha-session-selftest');"],
    ['// @akasha-book/akasha-session 自检', '// @akasha-book/session 自检']
  ];
  for (const [find, repl] of stpairs) {
    if (!st.includes(find)) { misses.push([dir + '/selftest.mjs', '锚点未命中：' + find.slice(0, 50).replace(/\n/g, '⏎')]); continue; }
    st = st.replace(find, repl);
  }
  st = st.replaceAll("mod.apply(ctx, { log", "mod.apply(ctx, { akashaDir: CORE, log");
  put(join(dir, 'selftest.mjs'), st);

  put(join(dir, 'package.json'), JSON.stringify({
    name: '@akasha-book/session',
    version: '0.2.3',
    private: true,
    license: 'MIT',
    type: 'module',
    description: '小阿卡夏：会话层插件 —— 自动增量索引（turn/end 去抖）+ 压缩事件行 + 每回合节奏条 + 循环观测 P0（dry 干跑，只观测不干预）',
    exports: { '.': './lib/index.js' },
    files: ['lib/index.js', 'cordis.patch.yml', 'README.md'],
    dsh: { bundle: { patch: './cordis.patch.yml' } }
  }, null, 2) + '\n');

  put(join(dir, 'cordis.patch.yml'), [
    '- insert:',
    '    - id: akasha-session',
    "      name: '@akasha-book/session'",
    '      config:',
    '        # sessionsRoot 指向你的宿主会话档案目录（默认 ~/.dsh/sessions）',
    '        contextOrder: 134',
    '        minIndexIntervalMs: 30000',
    ''
  ].join('\n'));

  put(join(dir, 'README.md'), [
    '# @akasha-book/session（小阿卡夏）',
    '',
    '阿卡夏之书**会话层**插件 —— **自动增量索引 + 压缩事件行 + 节奏条 + 循环观测 P0（dry 干跑）**。',
    '核心逻辑归 `core/session.mjs` 与 `core/loop-detect.mjs`（本插件只做调度与注入；降级只留痕，不炸宿主）。',
    '',
    '- **触发**：`session/event → turn/end`（按会话去抖 `minIndexIntervalMs`，默认 30s）→ 增量索引（水位 + 指纹双幂等）；`agent/status → idle` 追平；`ctx.interval` 兜底。',
    '- **压缩事件行**：`session/event → compaction/end`（成功压缩）→ 观测线 + 节奏条点名（被折叠历史的细节优先查会话层）。',
    '- **循环观测 P0**：**dry 干跑——只观测、只写观测线；绝不干预**。流环＝`agent/assistant-stream` 帧按 attemptId 累积（每 480 字符对尾 8K 跑 `detectLoops`）；turn 环＝事件流缓存全文兜底；命中与帧类型探针写 `logs/hooks.jsonl`。汇总 CLI：`node akasha.mjs session loopwatch`。',
    '- **节奏条**：`systemPrompt.context`（`akasha:session`，order 134）——段数 / 会话数 + 回看提示；无数据静默。',
    '- 配置：`akashaDir`（核心库位置）/ `sessionsRoot`（宿主会话档案目录）/ `storeFile` / `metaFile` / `log`；默认见 `lib/index.js` 的 DEFAULTS。',
    '- 自测：`node selftest.mjs`（桩 ctx 端到端；临时目录，不碰真实数据；需与本包 `core/` 并列）。',
    ''
  ].join('\n'));
}

// ========== 4. 终扫：隐私模式 ==========
const SCAN = [
  /H:[\\/]{1,4}Harness/g, /C:\\Users/gi, /AppData/gi, /sk-[A-Za-z0-9]{8,}/g, /ghp_[A-Za-z0-9]{10,}/g,
  /xox[bp]-/g, /AKIA[0-9A-Z]{8,}/g, /@local\//g, /api[_-]?key\s*[:=]/gi, /Bearer\s+[A-Za-z0-9._-]{12,}/g,
  /127\.0\.0\.1:\d+/g, /F:[\\/]{1,4}h[\\/]/gi, /阿巴阿巴/g, /苦力怕/g
];
const { readdirSync, statSync } = await import('node:fs');
function walk(p, out = []) { for (const e of readdirSync(p)) { const q = join(p, e); if (statSync(q).isDirectory()) walk(q, out); else out.push(q); } return out; }
const hits = [];
for (const f of walk(OSS)) {
  if (!/\.(md|mjs|js|json|yml|jsonl|txt)$/i.test(f)) continue;
  let t; try { t = read(f); } catch { continue; }
  for (const re of SCAN) { const m = t.match(re); if (m) hits.push([f.replace(OSS + '\\', ''), String(re), m.slice(0, 3).join(',')]); }
}

console.log('=== 同步报告 ===');
for (const [s, p] of report) console.log(`[${s}] ${p.replace(OSS + '\\', '')}`);
if (misses.length) { console.log('\n=== 锚点未命中（需人工核对）==='); for (const [p, m] of misses) console.log('-', p.replace(OSS + '\\', ''), '|', m); }
console.log('\n=== 隐私终扫 ===');
if (!hits.length) console.log('零命中 ✓');
else for (const [f, re, m] of hits) console.log('-', f, '|', re, '|', m);
