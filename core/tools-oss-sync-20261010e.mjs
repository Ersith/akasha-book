// akasha/tools/oss-sync-20261010e.mjs
// 2026-10-10：会话层索引 worker 化（v0.4）的 OSS 同步。
// 结构：① 原样跑 10-08d（全部既有同步步骤 + 其报告）；② 增量补 worker 文件与 package.json files 白名单；③ 复扫隐私。
// 幂等。README / 版本号不在范围内（属「版本 bump + npm 重发」收尾项）。
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SRC = 'H:\\Harness';
const OSS = join(SRC, 'dist', 'akasha-oss');
const report = [];
const misses = [];
const read = (p) => readFileSync(p, 'utf8');

// ① 既有同步（10-08d 自带报告与隐私扫；这里把它的输出原样转发）
try {
  const out = execFileSync(process.execPath, [join(SRC, 'akasha', 'tools', 'oss-sync-20261008d.mjs')], { encoding: 'utf8' });
  console.log(out.trim());
} catch (e) {
  misses.push(['oss-sync-20261008d.mjs', '执行失败：' + String(e?.message ?? e).slice(0, 200)]);
}

// ② 增量 1：同步 worker 文件
{
  const src = join(SRC, 'dsh-akasha-session', 'lib', 'index-worker.mjs');
  const dst = join(OSS, 'plugins', 'akasha-session', 'lib', 'index-worker.mjs');
  if (!existsSync(src)) misses.push(['plugins/akasha-session/lib/index-worker.mjs', '源文件不存在']);
  else {
    const text = read(src);
    mkdirSync(dirname(dst), { recursive: true });
    if (existsSync(dst) && read(dst) === text) report.push(['same', 'plugins/akasha-session/lib/index-worker.mjs']);
    else { writeFileSync(dst, text, 'utf8'); report.push(['updated', 'plugins/akasha-session/lib/index-worker.mjs']); }
  }
}

// ② 增量 2：OSS 版 package.json files 白名单补 worker（不动 version/description/其余字段）
{
  const pkgPath = join(OSS, 'plugins', 'akasha-session', 'package.json');
  if (!existsSync(pkgPath)) misses.push([pkgPath, 'package.json 不存在']);
  else {
    let t = read(pkgPath);
    if (t.includes('index-worker.mjs')) report.push(['same', 'plugins/akasha-session/package.json (files 已含 worker)']);
    else {
      const next = t.replace(/"files":\s*\[\s*"lib\/index\.js",/, '"files": [\n    "lib/index.js",\n    "lib/index-worker.mjs",');
      if (!next.includes('index-worker.mjs')) misses.push([pkgPath, 'files 白名单锚点未命中']);
      else { writeFileSync(pkgPath, next, 'utf8'); report.push(['updated', 'plugins/akasha-session/package.json (files + worker)']); }
    }
  }
}

// ③ 隐私终扫（对整个 OSS 树，含新文件）
const SCAN = [
  /H:[\\/]{1,4}Harness/g, /C:\\Users/gi, /AppData/gi, /sk-[A-Za-z0-9]{8,}/g, /ghp_[A-Za-z0-9]{10,}/g,
  /xox[baprs]-/g, /AKIA[0-9A-Z]{8,}/g, /@local\//g, /api[_-]?key\s*[:=]/gi, /Bearer\s+[A-Za-z0-9._-]{12,}/g,
  /127\.0\.0\.1:\d+/g, /F:[\\/]{1,4}h[\\/]/gi, /阿巴阿巴/g,
];
function walk(p, out = []) { for (const e of readdirSync(p)) { const q = join(p, e); if (statSync(q).isDirectory()) walk(q, out); else out.push(q); } return out; }
const hits = [];
for (const f of walk(OSS)) {
  if (!/\.(md|mjs|js|json|yml|jsonl|txt)$/i.test(f)) continue;
  let t; try { t = read(f); } catch { continue; }
  for (const re of SCAN) { const m = t.match(re); if (m) hits.push([f.replace(OSS + '\\', ''), String(re), m.slice(0, 3).join(',')]); }
}

console.log('\n=== 10-10e 增量报告 ===');
for (const [s, p] of report) console.log(`[${s}] ${p}`);
if (misses.length) { console.log('\n=== 锚点未命中（需人工核对）==='); for (const [p, m] of misses) console.log('-', p, '|', m); }
else console.log('锚点全部命中 ✓');
console.log('\n=== 隐私终扫（复扫）===');
if (!hits.length) console.log('零命中 ✓');
else for (const [f, re, m] of hits) console.log('-', f, '|', re, '|', m);
