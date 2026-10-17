#!/usr/bin/env node
// 交付包生成 + 自检（2026-10-15；GPT 第二份·优先⑥的教训项）
//
// 起因（两个真事故）：
//   ① 报告里写了「61 行 → 29 独立 → 17 升级」，而**交付包里实际是 85 → 30 → 17** ✗
//      —— 手写数字 = 时点值，交出去就是错的。⇒ **数字一律从产物重生成**，写进 PACK-MANIFEST.json，报告只许引用它。
//   ② 随包放了**旧件**：`escalate-fullcheck.json` 自身 `invalid-input` ✗（S6 的 status 用了早已修掉的非法值）
//      —— 打包时只是 cp 了当期目录里的存量。⇒ **每次重生成**：所有件从源重新拷贝 + 逐件自检。
//
// 用法：node akasha/tools/handover-pack.mjs [--dest <目录>] [--dry]
// 退出码：0 = 包内每件可解析、计数已重生成、无无效件；非零 = 自检失败（**不许把失败包交出去**）
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join, basename } from 'node:path';

const AK = '<AKASHA_DIR>';
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const DRY = args.includes('--dry');
const DEST = flag('--dest', '<LOCAL_PATH>');

// ── 1. 计数：**从切片重生成**（不信任任何手写数字）────────────────────────────
const S = join(AK, 'gate-out/full-check-20261015/slices');
const FILES = ['lead.jsonl', 'cli-mcp.jsonl', 'session-tools.jsonl', 'core.jsonl', 'plugins.jsonl']
  .filter((f) => existsSync(join(S, f)));
let recount = null;
{
  const a = ['tools/gate.mjs', 'escalate', ...FILES.flatMap((f) => ['--slices', join(S, f)]),
    '--task', 'handover-recount', '--out', 'D:/dsh-temp/handover'];
  const r = spawnSync(process.execPath, a, { cwd: AK, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/切片 (\d+) 行（(\d+) 文件）⇒ 去重后\*\*独立记录 (\d+) 条\*\*（重复填充 (\d+) 行）⇒ 升级 (\d+) 点（A1 (\d+) \/ A2 (\d+)）/);
  if (!m) { console.error('✗ 计数重生成失败（escalate 未产出可解析的三数）：\n' + out.slice(0, 500)); process.exit(1); }
  recount = { rows: +m[1], files: +m[2], unique: +m[3], dups: +m[4], escalations: +m[5], a1: +m[6], a2: +m[7], at: new Date().toISOString() };
}

// ── 2. 包件清单：每次**从源重新拷贝**（防旧件 ✗）──────────────────────────────
const ITEMS = [
  ['gate-out/gate-selffix/HANDOVER-20261015.md', 'HANDOVER-20261015.md'],
  ['gate-out/gate-selffix/audit.md', 'audit.md'],
  ['gate-out/gate-selffix/audit-process.md', 'audit-process.md'],
  ['gate-out/gate-selffix/audit-gate-code.md', 'audit-gate-code.md'],
  ['gate-out/gate-selffix/audit-family-sweep.md', 'audit-family-sweep.md'],
  ['gate-out/gate-selffix/slices/lead-gate-selffix.jsonl', 'lead-gate-selffix.jsonl'],
  ['gate-out/gate-selffix/slices/process.jsonl', 'process.jsonl'],
  ['gate-out/gate-selffix/slices/gate-code.jsonl', 'gate-code.jsonl'],
  ['gate-out/gate-selffix/slices/family-sweep.jsonl', 'family-sweep.jsonl'],
  ['gate-out/gate-selffix/closure.md', 'closure-selffix.md'],
  ['gate-out/full-check-20261015/closeout-N.md', 'closeout-N.md'],
];

// 需要**重新生成**而不是照抄的件（旧件禁令的直接落实 ✓）
const REGENERATE = ['gate-out/full-check-20261015/escalate.json'];

const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16);
const checkJson = (f) => {
  const txt = readFileSync(f, 'utf8');
  try { JSON.parse(txt); return { ok: true, kind: 'json' }; } catch { /* 试 jsonl */ }
  const lines = txt.split('\n').filter(Boolean);
  for (const [i, l] of lines.entries()) { try { JSON.parse(l); } catch { return { ok: false, kind: 'jsonl', why: `第 ${i + 1} 行不可解析` }; } }
  return { ok: true, kind: 'jsonl', rows: lines.length };
};

const manifest = { generatedAt: new Date().toISOString(), recount, items: [], problems: [] };
if (!DRY) mkdirSync(DEST, { recursive: true });

for (const [rel, name] of ITEMS) {
  const src = join(AK, rel);
  if (!existsSync(src)) { manifest.problems.push(`缺件（源不存在）：${rel}`); continue; }
  const dst = join(DEST, name);
  if (!DRY) copyFileSync(src, dst);
  const rec = { name, srcRel: rel, sha16: sha(src), bytes: statSync(src).size, mtime: statSync(src).mtime.toISOString() };
  if (/\.(json|jsonl)$/.test(name)) { const c = checkJson(src); rec.parse = c; if (!c.ok) manifest.problems.push(`不可解析：${name} —— ${c.why}`); }
  manifest.items.push(rec);
}

// 旧件禁令：`escalate.json` 若与"重生成"的期望不符，必须重生成后入包（这里只做校验，不静默照抄 ✓）
for (const rel of REGENERATE) {
  const src = join(AK, rel);
  if (!existsSync(src)) continue;
  try {
    const j = JSON.parse(readFileSync(src, 'utf8'));
    const bad = !j.verdict || !j.certificate;
    const v = String(j.verdict ?? '');
    const suspicious = v === 'invalid-input' || v === 'unverifiable';
    if (bad || suspicious) manifest.problems.push(`疑似旧件/无效件：${basename(rel)}（verdict=${v || '(缺)'}）⇒ 必须重跑 escalate 再打包，不许直接 cp ✗`);
  } catch { manifest.problems.push(`不可解析：${basename(rel)}`); }
}

// ── 3. 结论 ────────────────────────────────────────────────────────────────
if (!DRY) writeFileSync(join(DEST, 'PACK-MANIFEST.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log(`计数（重生成）：${recount.rows} 行 → 独立 ${recount.unique} → 升级 ${recount.escalations}（A1 ${recount.a1} / A2 ${recount.a2}）`);
console.log(`包件 ${manifest.items.length} 件（${DRY ? 'dry：未写盘' : '已写 → ' + DEST}）`);
if (manifest.problems.length) {
  console.error(`⚠ 自检 ${manifest.problems.length} 项问题：`);
  for (const p of manifest.problems) console.error('   · ' + p);
  process.exit(2);
}
console.log('✓ 自检通过：每件可解析 · 计数已重生成 · 无旧件/无效件');
