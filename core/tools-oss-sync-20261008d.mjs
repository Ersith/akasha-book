// akasha/tools/oss-sync-20261008d.mjs
// 2026-10-08：把「外部评审合并批（Claude fix/review-2026-10 + 活树 retire 等）」同步进 dist\akasha-oss\。
// 与 10-07c 版的差别：
//   1) 不再锚旧版本做差分补丁——插件内容文件按「复制 + 脱敏 + 少量转换」直推（旧锚点会因修复已应用而失配）；
//   2) 不重建已发布插件的 package.json / README / cordis（保住去 private 与已发布版本）——只补 engines；
//   3) 新增 test.mjs 的布局转换（'../plugins/akasha-gate/' → OSS 的 '../plugins/akasha-gate/'）。
// 幂等；末尾跑隐私终扫。
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

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
    // 包名映射（2026-10-08 wave1）：先具体后兜底——@akasha-book/akasha-gate → @akasha-book/gate
    .replace(/@local\/akasha-(gate|hooks|sleep|session)/g, '@akasha-book/$1')
    .replace(/@local\/mcp-akasha/g, '@akasha-book/mcp')
    .replace(/@local\//g, '@akasha-book/')
    .replace(/阿巴阿巴/g, '试运行')
    .replace(/受控解冻第十六次/g, '受控解冻');
}
function transform(text, pairs, where) {
  let t = text;
  for (const [find, repl] of pairs) {
    if (!t.includes(find)) { misses.push([where, '锚点未命中：' + String(find).slice(0, 60).replace(/\n/g, '⏎')]); continue; }
    t = t.replace(find, repl);
  }
  return t;
}

// ========== 1. core/ 同步 ==========
// 注意：core/test.mjs 不做覆盖——OSS 侧用的是「示例库口径」测试（与 live 真实库口径分离），
// 新用例按需人工移植（本轮已把退役族用例并入 dist 版本）。其余文件直推。
for (const f of ['lib.mjs', 'akasha.mjs', 'mcp.mjs', 'sleep.mjs', 'SCHEMA.md', 'loop-detect.mjs']) {
  put(join(OSS, 'core', f), sanitize(read(join(SRC, 'akasha', f))));
}
// session.mjs：脱敏 + 家目录风格默认值 + 去内部文档引用（homedir import 已随合并批就位）
{
  let t = sanitize(read(join(SRC, 'akasha', 'session.mjs')));
  const pairs = [
    ["// 设计稿：docs\\superpowers\\specs\\2026-10-07-session-akasha-design.md（v0.4）\n// 计划：docs\\superpowers\\plans\\2026-10-07-session-layer-v0.md（阶段 1）\n// 读取器移植自 ..\\tools\\session-scan.mjs（多帧 zstd 容器：按魔数 28 B5 2F FD 逐帧解压）。",
     "// 会话层 v0：会话档案读取 / 段抽取 / 索引 / 检索（单会话记忆）；多帧 zstd 容器按魔数逐帧解压。"],
    ["  sessionsRoot: '~/.dsh/sessions'",
     "  sessionsRoot: join(homedir(), '.dsh', 'sessions')  // 按你的宿主实际会话目录配置"]
  ];
  t = transform(t, pairs, 'core/session.mjs');
  put(join(OSS, 'core', 'session.mjs'), t);
}

// ========== 2. plugins/ 内容文件：复制 + 脱敏 + 少量转换 ==========
{
  let t = read(join(SRC, 'dsh-akasha-gate', 'index.js'));
  // 默认值 homedir 化（2026-10 wave1）：活树=绝对路径；OSS=join(homedir())——防字面量 `~` 回归
  // （回归事故：2026-10 合并批把默认值写成 '~/.akasha/...'，门控默认失效、日志落 cwd 的 `~` 目录）。
  t = t.replace(/\/\/ 默认值：本机绝对路径（活树）。\nconst DEFAULT_LOG = '[^']*';\nconst DEFAULT_DATA_DIR = '[^']*';\nconst DEFAULT_AKASHA_DIR = '[^']*';/,
    "// 默认值：家目录下的 .akasha（可用 config.akashaDir / dataDir / log 覆盖）。\n// ⚠ 2026-10 wave1：合并批曾把默认值写成字面量 '~/.akasha/...'——Node 不展开 `~`，\n//   isDataPath 永远比不中真实库路径（门控默认失效），日志落进 cwd 下名为 `~` 的目录。\n//   默认值必须用 homedir()；配置值以 `~` 开头的也在这里展开。\nconst DEFAULT_AKASHA_DIR = join(homedir(), '.akasha');\nconst DEFAULT_DATA_DIR = join(DEFAULT_AKASHA_DIR, 'data');\nconst DEFAULT_LOG = join(DEFAULT_AKASHA_DIR, 'logs', 'hooks.jsonl');");
  if (!t.includes("const DEFAULT_LOG = join(DEFAULT_AKASHA_DIR")) misses.push(['plugins/akasha-gate/index.js', '默认值 homedir 化未命中']);
  t = t.replace('其余原样（配置值里的 `~` 由此展开；2026-10 wave1）', '其余原样');
  t = sanitize(t);
  t = transform(t, [['// 阿卡夏之书门控 v1.1 ——', '// 阿卡夏之书门控 v1.2 ——']], 'plugins/akasha-gate/index.js');
  put(join(OSS, 'plugins', 'akasha-gate', 'index.js'), t);
}
{
  let t = read(join(SRC, 'dsh-akasha-hooks', 'index.js'));
  // 同上：默认值 homedir 化——防字面量 `~` 回归。
  t = t.replace(/\/\/ 默认值：本机绝对路径（活树）。\nconst DEFAULT_LOG = '[^']*';\nconst DEFAULT_AKASHA = '[^']*';/,
    "// 默认值：家目录下的 .akasha（可用 config.akashaDir / log 覆盖）。\n// ⚠ 2026-10 wave1：不得写成字面量 '~/...'——Node 不展开 `~`（会在 cwd 下建出名为 `~` 的目录）。\nconst DEFAULT_AKASHA = join(homedir(), '.akasha');\nconst DEFAULT_LOG = join(DEFAULT_AKASHA, 'logs', 'hooks.jsonl');");
  if (!t.includes("const DEFAULT_AKASHA = join(homedir(), '.akasha')")) misses.push(['plugins/akasha-hooks/index.js', '默认值 homedir 化未命中']);
  t = sanitize(t);
  t = transform(t, [['// 阿卡夏之书钩子 v1.1 ——', '// 阿卡夏之书钩子 v1.2 ——']], 'plugins/akasha-hooks/index.js');
  put(join(OSS, 'plugins', 'akasha-hooks', 'index.js'), t);
}
{
  let t = sanitize(read(join(SRC, 'dsh-akasha-session', 'lib', 'index.js')));
  // DEFAULTS 块内的分隔符统一成正斜杠（源码里是双反斜杠转义；sanitize 只修了段首）
  const mDefaults = t.match(/const DEFAULTS = \{[\s\S]*?\n\};/);
  if (mDefaults) t = t.replace(mDefaults[0], mDefaults[0].replace(/\\\\/g, '/'));
  // homedir 接线（DEFAULTS 用了 join(homedir(), …)）
  const impBefore = "import { createRequire } from 'node:module';\nimport { dirname, join } from 'node:path';";
  if (t.includes(impBefore)) t = t.replace(impBefore, "import { createRequire } from 'node:module';\nimport { homedir } from 'node:os';\nimport { dirname, join } from 'node:path';");
  else misses.push(['plugins/akasha-session/lib/index.js', 'homedir 导入锚点未命中']);
  const pairs = [
    ["const DEFAULTS = {\n  log: '~/.akasha/logs/hooks.jsonl',\n  akashaDir: '~/.akasha',\n  sessionsRoot: '~/.dsh/sessions',\n  storeFile: '~/.akasha/data/session.jsonl',\n  metaFile: '~/.akasha/data/session-meta.json',",
     "// 默认值：家目录（~/.akasha）；sessionsRoot 按你的宿主实际会话档案目录配置。\nconst AKASHA_HOME = join(homedir(), '.akasha');\nconst DEFAULTS = {\n  log: join(AKASHA_HOME, 'logs', 'hooks.jsonl'),\n  akashaDir: AKASHA_HOME,\n  sessionsRoot: join(homedir(), '.dsh', 'sessions'),\n  storeFile: join(AKASHA_HOME, 'data', 'session.jsonl'),\n  metaFile: join(AKASHA_HOME, 'data', 'session-meta.json'),"]
  ];
  t = transform(t, pairs, 'plugins/akasha-session/lib/index.js');
  put(join(OSS, 'plugins', 'akasha-session', 'lib', 'index.js'), t);
}
// session 自检：相对 core + tmpdir + 注入 akashaDir（分步转换，容忍源码里的双反斜杠转义）
{
  let st = read(join(SRC, 'dsh-akasha-session', 'selftest.test.mjs'));
  st = st.replace("import { join } from 'node:path';",
    "import { tmpdir } from 'node:os';\nimport { dirname, join } from 'node:path';\nimport { fileURLToPath } from 'node:url';");
  st = st.replace(/const CORE = '[^']*';/, "const CORE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'core');");
  st = st.replace(/const SCRATCH = '[^']*';/, "const SCRATCH = join(tmpdir(), 'akasha-session-selftest');");
  st = st.replace('// @akasha-book/akasha-session 自检', '// @akasha-book/session 自检');
  st = st.replace(/mod\.apply\((ctx\d*), \{ log/g, 'mod.apply($1, { akashaDir: CORE, log');
  for (const [tag, cond] of [['CORE', /const CORE = join\(/], ['SCRATCH', /const SCRATCH = join\(tmpdir\(\)/], ['apply.inject', /mod\.apply\(ctx\d*, \{ akashaDir: CORE/], ['header', /@akasha-book\/session 自检/]]) {
    if (!cond.test(st)) misses.push(['plugins/akasha-session/selftest.test.mjs', '转换缺失：' + tag]);
  }
  put(join(OSS, 'plugins', 'akasha-session', 'selftest.test.mjs'), st);
}

// ========== 3. engines 补齐（只动这一处；不碰版本 / private / 其余字段）==========
for (const [pkgPath, range] of [
  [join(OSS, 'plugins', 'akasha-gate', 'package.json'), '>=18'],
  [join(OSS, 'plugins', 'akasha-hooks', 'package.json'), '>=18'],
  [join(OSS, 'plugins', 'akasha-sleep', 'package.json'), '>=18'],
  [join(OSS, 'plugins', 'akasha-session', 'package.json'), '>=22.15.0'],
  [join(OSS, 'plugins', 'mcp-akasha', 'package.json'), '>=22.15.0']
]) {
  if (!existsSync(pkgPath)) { misses.push([pkgPath, '不存在']); continue; }
  let t = read(pkgPath);
  if (t.includes('"engines"')) { report.push(['same', pkgPath + ' (engines 已在)']); continue; }
  const line = `  "engines": { "node": "${range}" },\n`;
  const m = t.match(/^(\s*"version":\s*"[^"]+",\n)/m);
  if (m) {
    t = t.replace(m[0], m[0] + line);
    writeFileSync(pkgPath, t, 'utf8');
    report.push(['updated', pkgPath + ' (engines)']);
  } else { misses.push([pkgPath, '找不到 version 行以插入 engines']); }
}

// ========== 4. 隐私终扫 ==========
const SCAN = [
  /H:[\\/]{1,4}Harness/g, /C:\\Users/gi, /AppData/gi, /sk-[A-Za-z0-9]{8,}/g, /ghp_[A-Za-z0-9]{10,}/g,
  /xox[baprs]-/g, /AKIA[0-9A-Z]{8,}/g, /@local\//g, /api[_-]?key\s*[:=]/gi, /Bearer\s+[A-Za-z0-9._-]{12,}/g,
  /127\.0\.0\.1:\d+/g, /F:[\\/]{1,4}h[\\/]/gi, /阿巴阿巴/g
];
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
