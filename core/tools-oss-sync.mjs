// oss-sync.mjs v2 —— 开源同步（**逐处映射**，替代 v1 的"整包覆盖 + 通配清洗"）。
// v1 的教训（2026-10-11 实测）：活树 ≠ 仓可直覆 —— ① 包名不同（活树 @local/* ↔ 仓 @akasha-book/*）；
//   ② 命令/路径不同（活树写本机 node.exe 与绝对路径，仓写 'node' 与 <AKASHA_DIR>/…）；
//   ③ 通配清洗会改坏**代码里的字符串字面量**（夹具路径被洗成 <LOCAL_PATH> ⇒ 测试直接崩）。
// v2 口径：先映射再复制；只对**注释/文档**做路径清洗；代码里的路径按"逐处映射表"改写。
// 用法：node tools/oss-sync.mjs [--dry]
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const DRY = process.argv.includes('--dry');
const SRC_ROOT = 'H:\\Harness';
const REPO = '<LOCAL_PATH>';
const DST_ROOT = join(REPO, 'plugins');

const PACKS = [
  { src: 'dsh-akasha-gate',    dst: 'akasha-gate',    name: '@akasha-book/gate',    ver: '1.3.0' },
  { src: 'dsh-akasha-hooks',   dst: 'akasha-hooks',   name: '@akasha-book/hooks',   ver: '1.2.4' },
  { src: 'dsh-akasha-session', dst: 'akasha-session', name: '@akasha-book/session', ver: '0.3.2' },
  { src: 'dsh-akasha-sleep',   dst: 'akasha-sleep',   name: '@akasha-book/sleep',   ver: '1.6.5' },
  { src: 'dsh-mcp-akasha',     dst: 'mcp-akasha',     name: '@akasha-book/mcp',     ver: '1.1.2' },
];

const SKIP_DIRS = new Set(['node_modules', '.git', 'logs', '_ab']);
const SKIP_EXT = new Set(['.tgz', '.log', '.zip']);
const SKIP_FILES = /^(probe|tmp-|_scratch)/i;
const TEXT_EXT = new Set(['.js', '.mjs', '.cjs', '.json', '.yml', '.yaml', '.md', '.txt']);

// ── 逐处映射表（按序应用；顺序重要）──────────────────────────────
// 说明：`code:true` 的替换会进入代码（谨慎、逐条列明）；注释/文档类替换走 scrubText。
const CODE_MAP = [
  [/@local\/akasha-gate/g, '@akasha-book/gate'],
  [/@local\/akasha-hooks/g, '@akasha-book/hooks'],
  [/@local\/akasha-session/g, '@akasha-book/session'],
  [/@local\/akasha-sleep/g, '@akasha-book/sleep'],
  [/@local\/mcp-akasha/g, '@akasha-book/mcp'],
  // 布局映射：活树 `dsh-X/` 与 `akasha/` 平级；仓 `plugins/X/` 与 `core/` 平级
  [/\.\.\/akasha\//g, '../../core/'],
  [/'\.\.\\akasha\\/g, "'..\\..\\core\\"],
  // join(dirname(...), '..', 'akasha') —— 断言/夹具里"核心目录"的构造（2026-10-11：仓内必须先映射，否则拷不到 core）
  [/join\(dirname\(fileURLToPath\(import\.meta\.url\)\), '\.\.', 'akasha'\)/g, "join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'core')"],
  // 命令与路径（JS 双反斜杠形态 + YAML/文本单反斜杠形态）
  [/F:\\\\h\\\\all\\\\Nodejs\\\\node\.exe/g, 'node'],
  [/F:\\h\\all\\Nodejs\\node\.exe/g, 'node'],
  [/<AKASHA_DIR>/g, '<AKASHA_DIR>'],
  [/<AKASHA_DIR>/g, '<AKASHA_DIR>'],
  [/'<AKASHA_DIR>'/g, "'<AKASHA_DIR>'"],
  [/"<AKASHA_DIR>"/g, '"<AKASHA_DIR>"'],
  // 宿主应用模块默认目录：仓里不留本机路径（置空字符串 → 契约测试自动 SKIP，可用 AKASHA_DSH_MODULES 指定）
  // ⚠ 必须连**引号一起**替换（2026-10-11 踩过：只换路径会留下 `''''` ⇒ 语法错误）
  [/'<DSH_INSTALL>'/g, "''"],
  // 占位符后的分隔符统一成正斜杠（与仓内既有约定一致）
  [/<AKASHA_DIR>\\\\/g, '<AKASHA_DIR>/'],
  [/<AKASHA_DIR>\\/g, '<AKASHA_DIR>/'],
  // ── core 侧"插件路径"映射（2026-10-11 复检补）：活树布局 → OSS 布局（plugins/ 下）
  //    例：'../plugins/akasha-gate/index.js' → '../plugins/akasha-gate/index.js'
  //    例：join(HERE, '..', 'dsh-akasha-gate') → join(HERE, '..', 'plugins', 'akasha-gate')
  [/'\.\.\/dsh-akasha-([a-z]+)\//g, "'../plugins/akasha-$1/"],
  [/'dsh-mcp-akasha\//g, "'plugins/mcp-akasha/"],
  [/join\(HERE, '\.\.', '\.\.', 'dsh-akasha-([a-z]+)'\)/g, "join(HERE, '..', 'plugins', 'akasha-$1')"],
  [/join\(HERE, '\.\.', 'dsh-akasha-([a-z]+)'\)/g, "join(HERE, '..', 'plugins', 'akasha-$1')"],
];
// 注释/文档类清洗（不碰代码语义：仅用于 .md/.txt 与注释行）
function scrubText(text) {
  return text
    .replace(/[A-Za-z]:[\\/]+DSHHarness[^\s"'`)]*/g, '<DSH_INSTALL>')
    .replace(/[A-Za-z]:[\\/]+个人资料整理_[0-9]+[^\s"'`)]*/g, '<LOCAL_PATH>')
    .replace(/[A-Za-z]:[\\/]+Harness[^\s"'`)]*/g, '<LOCAL_PATH>')
    .replace(/\\\\wsl\$\\[^\s"'`)]*/g, '<LOCAL_PATH>')
    .replace(/(?:C:)?[\\/]+Users[\\/]+[A-Za-z0-9._-]+/g, '<USER_HOME>');
}

function mapText(text, isDoc) {
  let out = text;
  for (const [re, to] of CODE_MAP) out = out.replace(re, to);
  if (isDoc) out = scrubText(out);
  else {
    // 代码：只清洗**整行注释**中的本机路径（保守口径）
    out = out.split('\n').map((line) => (/^\s*(\/\/|\*|\/\*)/.test(line) ? scrubText(line) : line)).join('\n');
  }
  return out;
}

function walk(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name) || SKIP_FILES.test(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full, base));
    else if (!SKIP_EXT.has(extname(name).toLowerCase())) out.push(relative(base, full));
  }
  return out;
}

let copied = 0, mapped = 0;
const lines = [];
for (const p of PACKS) {
  const srcDir = join(SRC_ROOT, p.src);
  if (!existsSync(srcDir)) { lines.push('  ✗ 缺实位目录：' + srcDir); continue; }
  const files = walk(srcDir);
  let n = 0, m = 0;
  for (const rel of files) {
    const text = readFileSync(join(srcDir, rel), 'utf8');
    const isDoc = extname(rel).toLowerCase() !== '.js' && extname(rel).toLowerCase() !== '.mjs';
    const mappedText = mapText(text, isDoc);
    if (mappedText !== text) m++;
    if (!DRY) { const dst = join(DST_ROOT, p.dst, rel); mkdirSync(join(dst, '..'), { recursive: true }); writeFileSync(dst, mappedText, 'utf8'); }
    n++;
  }
  const pkgPath = join(DST_ROOT, p.dst, 'package.json');
  if (existsSync(pkgPath)) {
    // ⚠ **合并语义**（2026-10-11 三次踩坑后定）：仓里的 package.json 是**提交件**——含活树没有的
    //   repository{} / license / scripts.test / dsh.compatibility.dshReleases（商城审计要这些，
    //   整包覆盖会一次掉 5 分）。⇒ 只从活树取 `version`，其余一律保留仓内既有值。
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const before = pkg.version;
    pkg.name = p.name; pkg.version = p.ver;
    if (!pkg.publishConfig) pkg.publishConfig = { access: 'public' };
    if (!DRY) writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    lines.push('  ' + p.name.padEnd(24) + ' 文件 ' + String(n).padStart(2) + '（映射命中 ' + m + '）  ' + before + ' → ' + p.ver + '（保留提交件字段）');
  } else lines.push('  ' + p.name.padEnd(24) + ' 文件 ' + n + '  ⚠ 实位无 package.json');
  copied += n; mapped += m;
}
console.log('同步(v2·逐处映射)' + (DRY ? '（dry）' : '') + '：' + copied + ' 文件，映射命中 ' + mapped + ' 处');
for (const l of lines) console.log(l);
