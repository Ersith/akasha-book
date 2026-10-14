// akasha/tools/oss-sync-20261010f.mjs
// 2026-10-10：在 10-10e 之上补 core/PROTOCOL.md 的同步（README 引用了它，仓里那份停在旧版）。
// 结构：① 原样跑 10-10e（含 10-08d 全套 + worker + 隐私终扫）；② 复制+脱敏 PROTOCOL.md；③ 复扫隐私。幂等。
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = '<LOCAL_PATH>';
const OSS = join(SRC, 'dist', 'akasha-oss');
const report = [];
const read = (p) => readFileSync(p, 'utf8');

// ① 既有同步链
try {
  const out = execFileSync(process.execPath, [join(SRC, 'akasha', 'tools', 'oss-sync-20261010e.mjs')], { encoding: 'utf8' });
  console.log(out.trim().split('\n').slice(-6).join('\n'));
} catch (e) { console.log('10-10e 执行失败：' + String(e?.message ?? e).slice(0, 200)); }

// ② PROTOCOL.md：复制 + 脱敏（规则与 10-08d 一致）
function sanitize(text) {
  return String(text)
    .replace(/H:[\\/]{1,4}Harness[\\/]{1,4}official-home[\\/]{1,4}sessions/g, '~/.dsh/sessions')
    .replace(/H:[\\/]{1,4}Harness[\\/]{1,4}akasha/g, '~/.akasha')
    .replace(/H:[\\/]{1,4}Harness[\\/]{1,4}_scratch/g, '<scratch>')
    .replace(/H:[\\/]{1,4}Harness/g, '~')
    .replace(/@local\/akasha-(gate|hooks|sleep|session)/g, '@akasha-book/$1')
    .replace(/@local\/mcp-akasha/g, '@akasha-book/mcp')
    .replace(/@local\//g, '@akasha-book/')
    .replace(/阿巴阿巴/g, '试运行');
}
{
  const src = join(SRC, 'akasha', 'PROTOCOL.md');
  const dst = join(OSS, 'core', 'PROTOCOL.md');
  const text = existsSync(src) ? sanitize(read(src)) : null;
  if (!text) report.push(['miss', 'core/PROTOCOL.md（源不存在）']);
  else if (existsSync(dst) && read(dst) === text) report.push(['same', 'core/PROTOCOL.md']);
  else { writeFileSync(dst, text, 'utf8'); report.push(['updated', 'core/PROTOCOL.md']); }
}

// ③ 复扫（与 10-08d 同规则）
const SCAN = [
  /H:[\\/]{1,4}Harness/g, /C:\\Users/gi, /AppData/gi, /sk-[A-Za-z0-9]{8,}/g, /ghp_[A-Za-z0-9]{10,}/g,
  /xox[baprs]-/g, /AKIA[0-9A-Z]{8,}/g, /@local\//g, /api[_-]?key\s*[:=]/gi, /Bearer\s+[A-Za-z0-9._-]{12,}/g,
  /127\.0\.0\.1:\d+/g, /F:[\\/]{1,4}h[\\/]/gi, /阿巴阿巴/g,
];
const { readdirSync, statSync } = await import('node:fs');
function walk(p, out = []) { for (const e of readdirSync(p)) { const q = join(p, e); if (statSync(q).isDirectory()) walk(q, out); else out.push(q); } return out; }
const hits = [];
for (const f of walk(OSS)) {
  if (!/\.(md|mjs|js|json|yml|jsonl|txt)$/i.test(f)) continue;
  let t; try { t = read(f); } catch { continue; }
  for (const re of SCAN) { const m = t.match(re); if (m) hits.push([f.replace(OSS + '\\', ''), String(re), m.slice(0, 3).join(',')]); }
}
console.log('\n=== 10-10f 增量报告 ===');
for (const [s, p] of report) console.log(`[${s}] ${p}`);
console.log('\n=== 隐私终扫（复扫）===');
if (!hits.length) console.log('零命中 ✓');
else for (const [f, re, m] of hits) console.log('-', f, '|', re, '|', m);
