// 上传前总同步（2026-10-15）：① 跑既有 core 同步器 ② 跑插件同步器 ③ 补新件（gate/shape/文档）
// ④ 隐私扫描（零本机路径/用户名/密钥/内网端口/@local）⑤ 报结果（不 commit）
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const H = '<LOCAL_PATH>';
const OSS = join(H, 'dist/akasha-oss');
const NODE = process.execPath;

const run = (args, cwd = join(H, 'akasha')) => {
  try { return { ok: true, out: execFileSync(NODE, args, { cwd, encoding: 'utf8', maxBuffer: 1 << 26 }) }; }
  catch (e) { return { ok: false, out: String(e.stdout ?? '') + String(e.stderr ?? '') }; }
};

console.log('① core 同步器：');
const core = run(['tools/sync-core-to-oss.mjs']);
console.log((core.out || '').trim().split('\n').slice(-6).join('\n'));

console.log('\n② 插件同步器：');
const plug = run(['tools/oss-sync.mjs']);
console.log((plug.out || '').trim().split('\n').slice(-8).join('\n'));

// ③ 新件：tools/gate.mjs / tools/akasha-shape.mjs（OSS 侧扁平命名 core/tools-*.mjs）+ 两份文档
const MAP = [
  [/\.\.\/dsh-akasha-([a-z]+)\//g, '../plugins/akasha-$1/'],
  [/'dsh-mcp-akasha\//g, "'plugins/mcp-akasha/"],
  [/\.\.\/akasha\//g, '../../core/'],
  [/@local\//g, '@akasha-book/'],
  [/<AKASHA_DIR>/g, '<akasha>'],
  [/<AKASHA_DIR>/g, '<akasha>'],
  [/<LOCAL_PATH>/g, '<workspace>'],
  [/<LOCAL_PATH>/g, '<workspace>'],
  [/'H:'\+'\\Harness'/g, "'<workspace>'"],
];
const mapText = (t) => MAP.reduce((s, [re, to]) => s.replace(re, to), t);
const copied = [];
for (const [src, dst] of [
  ['tools/gate.mjs', 'core/tools-gate.mjs'],
  ['tools/akasha-shape.mjs', 'core/tools-akasha-shape.mjs'],
  ['tools/family-sweep.mjs', 'core/tools-family-sweep.mjs'],
  ['GATE.md', 'docs/GATE.md'],
  ['FULLCHECK-20261015.md', 'docs/FULLCHECK-20261015.md'],
]) {
  const s = join(H, 'akasha', src);
  const d = join(OSS, dst);
  if (!existsSync(s)) { console.log(`  · 缺源：${src}（跳过）`); continue; }
  mkdirSync(join(d, '..'), { recursive: true });
  writeFileSync(d, mapText(readFileSync(s, 'utf8')), 'utf8');
  copied.push(dst);
}
console.log(`\n③ 新件（映射后写入）：${copied.join(' · ') || '（无）'}`);

// ④ 隐私扫描（CHECKS 铁律面）
const PATTERNS = [
  [/[Hh]:[\\/](Harness|Users)/g, '本机路径'],
  [/@local\//g, '@local 包名'],
  [/sk-[A-Za-z0-9]{16,}/g, '疑似密钥'],
  [/AKIA[0-9A-Z]{12,}/g, 'AWS 密钥前缀'],
  [/127\.0\.0\.1:\d{4,5}/g, '环回端口'],
  [/罪爹的power|Administrator|Users\\[A-Za-z]{3,}/g, '用户名面'],
];
const { execFileSync: ex } = await import('node:child_process');
const files = ex('git', ['ls-files'], { cwd: OSS, encoding: 'utf8', maxBuffer: 1 << 26 }).split('\n').filter(Boolean);
const hits = [];
for (const f of files) {
  let t = '';
  try { t = readFileSync(join(OSS, f), 'utf8'); } catch { continue; }
  if (/\.(png|jpg|jpeg|webm|zip|gz|pdf)$/i.test(f)) continue;
  for (const [re, label] of PATTERNS) {
    const m = t.match(re);
    if (m) hits.push(`${f}  ← ${label}（${m.length} 处，例：${String(m[0]).slice(0, 40)}）`);
  }
}
console.log(`\n④ 隐私扫描（扫 ${files.length} 个受控文件）：${hits.length ? '⚠ 命中 ' + hits.length + ' 处\n' + hits.slice(0, 12).join('\n') : '干净 ✓'}`);
console.log('\n⑤ 未提交（等人工确认后再 commit/push）');
