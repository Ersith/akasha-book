#!/usr/bin/env node
// 门档（gate）v1 · 机械执行器 —— 2026-10-15 落地
// 依据：canon-thinkloop-gate-20261015（规程）+ gate-speed 设计 v2（A/C 两臂合并）
// 定位：**只做确定性的记账与判据**，不做判断——判断交给快层工人（P1）与慢层（P2）。
//
// 用法：
//   node tools/gate.mjs p0 [--task NAME] [--check FILE ...] [--out DIR]
//       跑机检（主套件 / check / health / family-sweep / node --check / 六库快照哈希），产出 <out>/<task>/p0.md
//   node tools/gate.mjs escalate --slices FILE [--out DIR] [--task NAME]
//       读 slices.jsonl，按 A1/A2 判升级，产出 escalate.json
//   node tools/gate.mjs slices-template [--out DIR] [--task NAME]
//       产一份 slices.jsonl 空模板（含闭词表，防各臂字段名漂移）
//   node tools/gate.mjs selftest
//       自带夹具自测（不碰真库）
//
// 铁律：本脚本**不写** akasha/data/*；p0 只在 <out> 下写产物；escalate 只读切片、不写库。
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOLS = dirname(fileURLToPath(import.meta.url));
const AKASHA = resolve(TOOLS, '..');

// ── 闭词表（C 臂：严重度不属快层；快层只出这三类受控字段） ──────────────────
export const RISK_CLASSES = ['dataloss', 'silent-skip', 'false-green', 'coverage-gap', 'false-fix', 'crash', 'perf', 'docs', 'other'];
export const STATUSES = ['实证', '推测', '未决'];
export const REALITY = ['theoretical', 'observed', 'reproduced'];

const args = process.argv.slice(2);
const cmd = args[0] || 'help';
const flag = (name, dflt = undefined) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : dflt;
};
const flagAll = (name) => {
  const out = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--' + name) { let j = i + 1; while (j < args.length && !args[j].startsWith('--')) { out.push(args[j]); j += 1; } }
  }
  return out;
};

function run(cmdline, cwd, timeoutMs = 900000) {
  const t0 = Date.now();
  let ok = false; let out = '';
  try {
    out = execFileSync(cmdline[0], cmdline.slice(1), { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: timeoutMs, maxBuffer: 1 << 26 });
    ok = true;
  } catch (e) {
    out = String((e.stdout || '') + (e.stderr || '') || e.message);
    ok = false;
  }
  return { ok, out, ms: Date.now() - t0 };
}

/** 六库快照哈希（A 臂 R7：本仓零 git ⇒ 用哈希对照替代 git diff 判据） */
function snapshotStores(dataDir) {
  const stores = ['canon', 'mirror', 'orphan', 'pricing', 'lexicon', 'frontier'];
  const lines = [];
  for (const s of stores) {
    const f = join(dataDir, `${s}.jsonl`);
    if (!existsSync(f)) { lines.push(`${s}: (missing)`); continue; }
    const h = createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 12);
    lines.push(`${s}: ${h} (${statSync(f).size}B)`);
  }
  return lines;
}

function outDir(task, outFlag) {
  const base = outFlag ? resolve(outFlag) : join(process.cwd(), 'gate-out');
  const dir = join(base, task);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// ── p0：机检层（零模型） ────────────────────────────────────────────────────
function doP0() {
  const task = flag('task', 'task');
  const dir = outDir(task, flag('out'));
  const dataDir = process.env.AKASHA_ROOT ? String(process.env.AKASHA_ROOT) : join(AKASHA, 'data');
  // 可移植性（2026-10-15，为开源）：**本仓没有的检查优雅跳过**（标 SKIP，不算 FAIL）——
  // 不同布局（如 OSS 仓的 plugins/lib 结构、或只带核心库的精简版）照样能跑出有用的 P0。
  const CANDIDATES = [
    ['主套件 test.mjs', 'test.mjs', [process.execPath, 'test.mjs'], 900000],
    ['库校验 check', 'akasha.mjs', [process.execPath, 'akasha.mjs', 'check'], 300000],
    ['体检 health-check', join('tools', 'health-check.mjs'), [process.execPath, 'tools/health-check.mjs'], 300000],
    ['全家扫描 family-sweep', join('tools', 'family-sweep.mjs'), [process.execPath, 'tools/family-sweep.mjs', '--no-tests', '--quiet'], 600000],
  ];
  const checks = [];
  const skipped = [];
  for (const [name, probe, cmdline, tmo] of CANDIDATES) {
    if (!existsSync(join(AKASHA, probe))) { skipped.push(`${name}（未找到 ${probe}）`); continue; }
    checks.push([name, run(cmdline, AKASHA, tmo)]);
  }
  const changed = flagAll('check');
  for (const f of changed) checks.push([`语法 node --check ${f}`, run([process.execPath, '--check', resolve(f)], AKASHA, 60000)]);

  const tail = (s, n = 4) => s.trim().split(/\r?\n/).slice(-n).join(' / ').slice(0, 400);
  const body = [
    `# P0 机检报告 · 任务 ${task}`,
    `生成：${new Date().toISOString()}　数据根：${dataDir}`,
    '',
    `| 检查 | 结果 | 耗时 | 关键行 |`,
    `|---|---|---|---|`,
    ...checks.map(([name, r]) => `| ${name} | ${r.ok ? 'PASS' : 'FAIL'} | ${(r.ms / 1000).toFixed(1)}s | ${tail(r.out).replace(/\|/g, '\\|')} |`),
    ...skipped.map((s) => `| ${s} | SKIP | – | 本仓无该项（可移植模式） |`),
    '',
    `## 六库快照（供前后对照）`,
    ...snapshotStores(dataDir).map((l) => `- ${l}`),
    '',
    `## 待机器判定面（供 P1 定位用）`,
    ...(changed.length ? changed.map((f) => `- 改动文件：${f}`) : ['- （未提供 --check 文件；P1 需自报改动面）']),
    '',
  ].join('\n');
  const p = join(dir, 'p0.md');
  writeFileSync(p, body, 'utf8');
  const fails = checks.filter(([, r]) => !r.ok).map(([n]) => n);
  console.log(`P0 完成：${checks.length} 项检查，${fails.length} 项 FAIL${fails.length ? '（' + fails.join('、') + '）' : ''}${skipped.length ? `，${skipped.length} 项 SKIP` : ''}`);
  console.log(`产物：${p}`);
  process.exitCode = fails.length ? 1 : 0;
}

// ── escalate：升级判据执行器（A1 立即 / A2 趟末） ────────────────────────────
// **2026-10-15 独立审核修正（关键）**：
//   ① A2 原实现按 `status==='未决'` 判 ⇒ **语义写反**——"已实证的假修复"永不升级，而"没把握的未决"反而升级。
//      按 C 臂原文与常识校正：**实证 ∧ open** 才升（证明了的假修复/崩溃＝必须处理），"未决"不升（那是待查，不是结论）。
//   ② `false-fix` 实证并入 A1（"证明修错了"与"静默丢数据"同级危险）；`crash` 实证同样 A1。
//   ③ 三条"防不可判定"机制（审核提的、三臂都没提）：闭词表**零容忍**校验 / 坏行计数与 0 切片**禁止报绿** /
//      每次运行强制产**判别式自证包**（成果面 vs 能力面），把"没发现"与"没能力发现"分开。
export function validateSlices(slices) {
  const problems = [];
  slices.forEach((s, i) => {
    const at = s && s.id ? `#${s.id}` : `#${i + 1}`;
    if (!s || typeof s !== 'object') { problems.push(`${at}: 不是对象`); return; }
    if (!s.id) problems.push(`${at}: 缺 id`);
    if (!s.claim) problems.push(`${at}: 缺 claim`);
    if (!s.anchor) problems.push(`${at}: 缺 anchor（行号/文件）`);
    if (!RISK_CLASSES.includes(String(s.risk_class))) problems.push(`${at}: risk_class 非法或缺失（"${s.risk_class}"）——闭词表：${RISK_CLASSES.join('/')}`);
    if (!STATUSES.includes(String(s.status))) problems.push(`${at}: status 非法或缺失（"${s.status}"）——闭词表：${STATUSES.join('/')}`);
    if (!REALITY.includes(String(s.reality_entry))) problems.push(`${at}: reality_entry 非法或缺失（"${s.reality_entry}"）——闭词表：${REALITY.join('/')}`);
    if (s.falsifier !== undefined && typeof s.falsifier !== 'string') problems.push(`${at}: falsifier 须为字符串`);
  });
  return problems;
}

const A1_CLASSES = ['dataloss', 'silent-skip', 'false-green', 'false-fix', 'crash'];

export function judgeEscalation(slices) {
  const esc = [];
  for (const s of slices) {
    const rc = String(s.risk_class ?? '');
    const st = String(s.status ?? '');
    const re = String(s.reality_entry ?? '');
    const a1 = st === '实证' && re !== 'theoretical'
      && (A1_CLASSES.includes(rc) || (rc === 'coverage-gap' && s.data_critical === true));
    if (a1) esc.push({ id: s.id ?? '(no id)', reason: 'A1', risk_class: rc, why: '已实证且非理论 ⇒ 立即升级' });
  }
  // A2（趟末）：**实证 ∧ open** 的 false-fix/crash —— 证明了的假修复/崩溃成批出现时升级（≥2 单元 或 同文件 ≥2 处）
  const provenHard = slices.filter((s) => ['false-fix', 'crash'].includes(String(s.risk_class ?? '')) && String(s.status ?? '') === '实证');
  const byFile = new Map();
  for (const s of provenHard) { const f = String(s.anchor ?? '').split(':')[0]; byFile.set(f, (byFile.get(f) ?? 0) + 1); }
  const a2hit = provenHard.length >= 2 || [...byFile.values()].some((n) => n >= 2);
  if (a2hit && provenHard.length) esc.push({ id: '(趟末)', reason: 'A2', risk_class: 'false-fix/crash（实证）', why: `已实证 ${provenHard.length} 条（同文件 ≥2 或总量 ≥2）` });
  return { escalations: esc, escalate: esc.length > 0, counts: { slices: slices.length, a1: esc.filter((e) => e.reason === 'A1').length, a2: esc.filter((e) => e.reason === 'A2').length } };
}

/** 判别式自证包：把"没发现"与"没能力发现"分开（审核主建议） */
export function buildCertificate(slices, extra = {}) {
  const units = new Map();
  for (const s of slices) { const u = String(s.unit ?? '(未标单元)'); units.set(u, (units.get(u) ?? 0) + 1); }
  const zeroUnits = [...units.entries()].filter(([, n]) => n === 0).map(([u]) => u);
  const withFalsifier = slices.filter((s) => typeof s.falsifier === 'string' && s.falsifier.trim()).length;
  return {
    slices: slices.length,
    units: units.size,
    unitsWithoutSlices: zeroUnits,
    withFalsifier,
    withoutFalsifier: slices.length - withFalsifier,
    untranslatable: extra.untranslatable ?? 0,     // 声称里"写不出判别式"的条数（自报，不许隐去）
    claimsSeen: extra.claimsSeen ?? null,
    complete: slices.length > 0 && withFalsifier === slices.length && (extra.untranslatable ?? 0) === 0,
  };
}

function doEscalate() {
  const files = flagAll('slices').length ? flagAll('slices') : (flag('slices') ? [flag('slices')] : []);
  if (!files.length) { console.error('用法：gate.mjs escalate --slices A.jsonl [--slices B.jsonl …] [--task NAME] [--out DIR]'); process.exitCode = 2; return; }
  const slices = [];
  const badLines = [];
  let filesRead = 0;
  for (const f of files) {
    if (!existsSync(f)) { badLines.push(`${f}: 文件不存在`); continue; }
    filesRead += 1;
    readFileSync(f, 'utf8').split(/\r?\n/).forEach((l, i) => {
      if (!l.trim()) return;
      try { slices.push(JSON.parse(l)); } catch { badLines.push(`${f}:${i + 1}`); }
    });
  }
  const problems = validateSlices(slices);
  const r = judgeEscalation(slices);
  const cert = buildCertificate(slices);
  const dir = outDir(flag('task', 'task'), flag('out'));
  const out = {
    ...r, certificate: cert, files: filesRead, badLines,
    validationProblems: problems,
    // 放行＝双条件（审核 patch ③）：无升级项 ∧ 自证包完整；否则明说"不可判定"，不许报绿
    verdict: problems.length || badLines.length ? 'invalid-input'
      : slices.length === 0 ? 'unverifiable'
        : r.escalate ? 'needs-slow'
          : cert.complete ? 'pass' : 'unverifiable',
  };
  const p = join(dir, 'escalate.json');
  writeFileSync(p, JSON.stringify(out, null, 2), 'utf8');
  console.log(`切片 ${slices.length} 条（${filesRead} 文件）⇒ 升级 ${r.counts.a1 + r.counts.a2} 点（A1 ${r.counts.a1} / A2 ${r.counts.a2}）`);
  if (badLines.length) console.log(`⚠ 坏行/缺失 ${badLines.length} 处（不得静默）：${badLines.slice(0, 5).join(', ')}`);
  if (problems.length) console.log(`⚠ 校验问题 ${problems.length} 条（闭词表零容忍）：${problems.slice(0, 5).join('；')}`);
  console.log(`自证包：切片 ${cert.slices} / 带证伪器 ${cert.withFalsifier} / 不可翻译 ${cert.untranslatable} / 完整=${cert.complete}`);
  console.log(`判定：**${out.verdict}**${out.verdict === 'pass' ? '（可收）' : out.verdict === 'needs-slow' ? '（进慢层）' : '（**不得报绿**）'}`);
  console.log(`产物：${p}`);
  process.exitCode = ['invalid-input', 'unverifiable'].includes(out.verdict) ? 3 : 0;
}

function doTemplate() {
  const dir = outDir(flag('task', 'task'), flag('out'));
  const p = join(dir, 'slices.jsonl');
  const sample = {
    id: 'S1', unit: 'unit-A', claim: '（一条可证伪的指控）', quote: '（逐字原句，禁止转述）',
    anchor: 'src/x.mjs:123', rev: 'sha256:（文件哈希前 12）', risk_class: RISK_CLASSES[0],
    status: STATUSES[0], reality_entry: REALITY[0], data_critical: false,
    falsifier: '（≤1 个探针：什么最小实验能让这条主张挂掉）'
  };
  writeFileSync(p, JSON.stringify(sample) + '\n', 'utf8');
  console.log(`闭词表：risk_class ∈ ${RISK_CLASSES.join('/')}`);
  console.log(`　　　　status ∈ ${STATUSES.join('/')}　reality_entry ∈ ${REALITY.join('/')}`);
  console.log(`模板：${p}`);
}

// ── selftest：夹具自测（不碰真库；2026-10-15 按独立审核的对抗用例重写） ────────
function doSelftest() {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  const s = (o) => ({ id: o.id, unit: o.unit ?? 'u1', claim: 'c', anchor: o.anchor ?? 'a.mjs:1', risk_class: o.rc, status: o.st, reality_entry: o.re, data_critical: o.dc === true, falsifier: o.fx === false ? '' : 'x' });
  // ① 假绿 1 条即升（A1）
  assert(judgeEscalation([s({ id: 'x1', rc: 'false-green', st: '实证', re: 'reproduced' })]).counts.a1 === 1, '假绿必须立即升级');
  // ② 低危不升
  assert(!judgeEscalation([s({ id: 'x2', rc: 'docs', st: '实证', re: 'reproduced' })]).escalate, 'docs 不得升级');
  // ③ 理论举证不升
  assert(!judgeEscalation([s({ id: 'x3', rc: 'dataloss', st: '实证', re: 'theoretical' })]).escalate, '理论性举证不得触发 A1');
  // ④ silent-skip 实证非理论 ⇒ 升
  assert(judgeEscalation([s({ id: 'x4', rc: 'silent-skip', st: '实证', re: 'observed' })]).escalate, 'silent-skip 应升级');
  // ⑤ coverage-gap 仅在 data_critical 时升
  assert(!judgeEscalation([s({ id: 'x5', rc: 'coverage-gap', st: '实证', re: 'observed' })]).escalate, '非关键覆盖缺口不得升级');
  assert(judgeEscalation([s({ id: 'x6', rc: 'coverage-gap', st: '实证', re: 'observed', dc: true })]).escalate, '关键覆盖缺口应升级');
  // ⑥【审核修正】false-fix / crash **已实证** ⇒ A1 立即升（证明了的假修复与静默丢数据同级危险）
  assert(judgeEscalation([s({ id: 'x7', rc: 'false-fix', st: '实证', re: 'reproduced' })]).counts.a1 === 1, '已实证的假修复必须 A1 升');
  assert(judgeEscalation([s({ id: 'x8', rc: 'crash', st: '实证', re: 'observed' })]).counts.a1 === 1, '已实证的崩溃必须 A1 升');
  // ⑦【审核修正】A2 语义＝**实证 ∧ open**；"未决"**不**升级（这是原实现写反的地方，固化为反向用例）
  const a2 = judgeEscalation([s({ id: 'y1', rc: 'false-fix', st: '实证', re: 'reproduced' }), s({ id: 'y2', rc: 'crash', st: '实证', re: 'reproduced', anchor: 'b.mjs:9' })]);
  assert(a2.escalate, '实证的 false-fix/crash ×2 应触发 A2');
  const undecided = judgeEscalation([s({ id: 'z1', rc: 'false-fix', st: '未决', re: 'theoretical' }), s({ id: 'z2', rc: 'false-fix', st: '未决', re: 'theoretical', anchor: 'b.mjs:9' })]);
  assert(!undecided.escalate, '「未决」不得升级（未决＝待查，不是结论）——防语义再次写反');
  // ⑧ 闭词表零容忍：拼错/越界必须被 validateSlices 拦下（不得静默"可收"）
  assert(validateSlices([s({ id: 'w1', rc: 'bogus', st: '实证', re: 'observed' })]).length >= 1, '未知 risk_class 必须报错');
  assert(validateSlices([s({ id: 'w2', rc: 'dataloss', st: '搞定了', re: 'observed' })]).length >= 1, '未知 status 必须报错');
  assert(validateSlices([s({ id: 'w3', rc: 'dataloss', st: '实证', re: 'maybe' })]).length >= 1, '未知 reality_entry 必须报错');
  assert(validateSlices([{ rc: 'dataloss', status: '实证', reality_entry: 'observed' }]).length >= 1, '缺 id/claim/anchor 必须报错');
  // ⑨ 自证包：无证伪器 ⇒ 不完整；全带 ⇒ 完整
  assert(buildCertificate([s({ id: 'v1', rc: 'docs', st: '实证', re: 'observed', fx: false })]).complete === false, '缺证伪器不得自证完整');
  assert(buildCertificate([s({ id: 'v2', rc: 'docs', st: '实证', re: 'observed' })]).complete === true, '齐备时应自证完整');
  assert(buildCertificate([], {}).complete === false, '零切片不得自证完整（应落 unverifiable）');
  console.log('gate.mjs selftest：9 组断言全过 ✓（含 3 条反向用例：理论举证 / 未决不升 / 闭词表零容忍）');
}

// ── run：批量探针执行器（B 臂 W1 的正解件：把 N 次往返压成 1 次） ─────────────
function discoverProbes(paths) {
  const out = [];
  for (const p of paths) {
    const abs = resolve(p);
    if (!existsSync(abs)) continue;
    if (statSync(abs).isDirectory()) {
      for (const f of readdirSync(abs).filter((x) => x.endsWith('.mjs')).sort()) out.push(join(abs, f));
    } else out.push(abs);
  }
  return out;
}

function doRun() {
  const paths = args.slice(1).filter((a) => !a.startsWith('--'));
  const probes = discoverProbes(paths.length ? paths : ['.']);
  if (!probes.length) { console.error('用法：gate.mjs run <目录或文件…> [--out DIR] [--task NAME] [--timeout MS]'); process.exitCode = 2; return; }
  const timeoutMs = Number(flag('timeout', '120000'));
  const dir = outDir(flag('task', 'task'), flag('out'));
  const results = [];
  for (const f of probes) {
    const r = run([process.execPath, f], dirname(f), timeoutMs);
    const line = (s) => String(s ?? '').trim().split(/\r?\n/).filter(Boolean);
    results.push({
      file: f, ok: r.ok, ms: r.ms,
      exit: r.ok ? 0 : 1,
      stdout: line(r.out).slice(0, 40),
      tail: line(r.out).slice(-3),
    });
    process.stdout.write(`· ${f.split(/[\\/]/).pop()} ${r.ok ? 'PASS' : 'FAIL'} ${(r.ms / 1000).toFixed(1)}s\n`);
  }
  const failed = results.filter((x) => !x.ok);
  const body = [
    `# 批量探针结果 · ${results.length} 个（失败 ${failed.length}）`,
    `生成：${new Date().toISOString()}`,
    '',
    '| 探针 | 结果 | 耗时 | 末 3 行 |',
    '|---|---|---|---|',
    ...results.map((x) => `| ${x.file.split(/[\\/]/).pop()} | ${x.ok ? 'PASS' : 'FAIL'} | ${(x.ms / 1000).toFixed(1)}s | ${x.tail.join(' \\\\ ').replace(/\|/g, '\\|').slice(0, 300)} |`),
    '',
    '## 全量输出（按探针）',
    ...results.flatMap((x) => [`### ${x.file}（${x.ok ? 'PASS' : 'FAIL'} / ${(x.ms / 1000).toFixed(1)}s）`, '```', ...x.stdout, '```', '']),
  ].join('\n');
  writeFileSync(join(dir, 'probes.md'), body, 'utf8');
  writeFileSync(join(dir, 'probes.json'), JSON.stringify(results, null, 2), 'utf8');
  console.log(`批量完成：${results.length} 个探针，${failed.length} 失败（1 次往返）`);
  console.log(`产物：${join(dir, 'probes.md')} / probes.json`);
  process.exitCode = failed.length ? 1 : 0;
}

// ── fixture：探针模板（B 臂 W2：别再重敲沙箱咒语；test.mjs 里已有 20+ 处同款） ──
const FIXTURES = {
  'temp-store': `// 夹具：临时库（会话层）；只写 tmp，不碰真库
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as s from '${AKASHA.replace(/\\/g, '/')}/session.mjs';
const dir = mkdtempSync(join(tmpdir(), 'gate-fx-'));
const store = join(dir, 'session.jsonl'); const meta = join(dir, 'meta.json');
const rows = [{ id: 'seg-a-1-x', store: 'session', session: 'a', seq: 1, kind: 'conclusion', gist: '夹具', time: new Date().toISOString(), turn: 1, step: 1, keywords: [], tools: [], ptr: {}, logged_at: 'x' }];
writeFileSync(store, rows.map((r) => JSON.stringify(r)).join('\\n') + '\\n');
console.log('夹具就绪', store, typeof s.indexSession);
`,
  'mcp-probe': `// 夹具：MCP stdio 探针；env 里关掉 query-log
import { spawnSync } from 'node:child_process';
const ROOT = '${AKASHA.replace(/\\/g, '/')}';
const probe = [JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })].join('\\n') + '\\n';
const r = spawnSync(process.execPath, [ROOT + '/mcp.mjs'], { cwd: ROOT, encoding: 'utf8', input: probe, maxBuffer: 1 << 26, env: { ...process.env, AKASHA_QUERY_LOG: 'off' } });
const tools = JSON.parse((r.stdout || '').trim().split(/\\r?\\n/)[0]).result.tools;
console.log('工具数', tools.length);
`,
  'cli-call': `// 夹具：CLI 只读调用（走真根；注意：空 AKASHA_ROOT 会被**有意拒绝**——「拒绝静默建空库」）
// 若你要测写命令：先在 tmp 下用 \`node akasha.mjs init\`（或复制六库空文件）建出合法根，再指 AKASHA_ROOT。
import { spawnSync } from 'node:child_process';
const r = spawnSync(process.execPath, ['${AKASHA.replace(/\\/g, '/')}/akasha.mjs', 'stats', '--json'], { encoding: 'utf8', maxBuffer: 1 << 26, env: { ...process.env, AKASHA_QUERY_LOG: 'off' } });
const out = (r.stdout || '').trim();
console.log('exit', r.status, out.slice(0, 120).replace(/\\n/g, ' '));
`,
};

function doFixture() {
  const kind = flag('kind');
  const dest = flag('file');
  if (!kind && !dest) {
    console.log('可用夹具种类：' + Object.keys(FIXTURES).join(' / '));
    console.log('用法：gate.mjs fixture --kind <kind> [--file 输出路径]');
    return;
  }
  if (!FIXTURES[kind]) { console.error('未知夹具：' + kind + '（可用：' + Object.keys(FIXTURES).join('/') + '）'); process.exitCode = 2; return; }
  const target = dest ? resolve(dest) : join(outDir(flag('task', 'task'), flag('out')), `probe-${kind}.mjs`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, FIXTURES[kind], 'utf8');
  console.log(`夹具已写：${target}（直接 node 跑，或用 gate.mjs run 批量跑）`);
}

// ── close：运行收口（把一次门档跑成"canon 就绪"的一段 + summary.md）────────────────
// 口径（2026-10-15 定，回应"状态进会话层段"这条待办）：**切片与运行态不入库**——会话层是对话的派生索引，
// 塞运行态会污染检索；设计只把**里程碑**落 canon（DESIGN-v2 §7）。故本命令只做"收口"：
// 读本次跑的产物 → 产 summary.md → 打印一段可直接喂 `akasha.mjs add --store canon` 的声明文本。
function doClose() {
  const task = flag('task', 'task');
  const dir = outDir(task, flag('out'));
  const rd = (f) => { try { return readFileSync(join(dir, f), 'utf8'); } catch { return null; } };
  const p0 = rd('p0.md');
  const esc = (() => { try { return JSON.parse(rd('escalate.json') ?? 'null'); } catch { return null; } })();
  const probes = (() => { try { return JSON.parse(rd('probes.json') ?? 'null'); } catch { return null; } })();

  const p0Fails = p0 ? (p0.match(/\| FAIL \|/g) ?? []).length : null;
  const p0Checks = p0 ? (p0.match(/^\| (?!检查)/gm) ?? []).length : null;
  const parts = [];
  parts.push(`任务 ${task}`);
  parts.push(p0 ? `P0 机检：${p0Checks ?? '?'} 项，${p0Fails ?? '?'} 项 FAIL` : 'P0：未跑');
  if (probes) parts.push(`批量探针：${probes.length} 个，${probes.filter((x) => !x.ok).length} 个 FAIL`);
  if (esc) {
    parts.push(`升级判定：${esc.verdict}（A1 ${esc.counts?.a1 ?? 0} / A2 ${esc.counts?.a2 ?? 0}，切片 ${esc.counts?.slices ?? 0}）`);
    if (esc.certificate) parts.push(`自证包：完整=${esc.certificate.complete}（带证伪器 ${esc.certificate.withFalsifier}/${esc.certificate.slices}）`);
    if (esc.badLines?.length || esc.validationProblems?.length) parts.push(`⚠ 输入问题：坏行 ${esc.badLines?.length ?? 0} / 校验 ${esc.validationProblems?.length ?? 0}`);
  }
  const summary = [
    `# 门档收口 · ${task}`,
    `生成：${new Date().toISOString()}`,
    '',
    ...parts.map((p) => `- ${p}`),
    '',
    '## 判据提醒',
    '- 放行＝无升级项 ∧ 自证包完整；否则 `invalid-input` / `unverifiable`（退出码 3）**不得报绿**。',
    '- 里程碑落 canon；**切片与运行态不入库**（见 DESIGN-v2 §7）。',
    '',
  ].join('\n');
  writeFileSync(join(dir, 'summary.md'), summary, 'utf8');
  const claim = `**门档跑（${task}，2026-10-15）**：${parts.slice(1).join('；')}。` +
    `判据与口径见 canon-thinkloop-gate-20261015 / canon-gate-v2-20261015；本次产物在 ${dir}（p0.md / escalate.json / summary.md）。`;
  console.log(summary);
  console.log('—'.repeat(60));
  console.log('canon 就绪文本（可直接：node akasha.mjs add --store canon --data \'{"id":"canon-gate-run-<日期>","claim":"…","source":{"type":"复现","ref":"…"}}\'）：');
  console.log(claim);
  console.log(`产物：${join(dir, 'summary.md')}`);
}

// ── briefs：生成 P1/P2/P3 的派单文本（趟级编排里"机械可做"的那一环）────────────────
// 口径（2026-10-15）：工具**不替宿主跑 agent**（各宿主能力不同）；它把"该怎么派"变成**现成文本**——
// 每个正交单元一份 P1 brief、升级项一份 P2 brief、一份 P3 独立审核 brief；判据/闭词表/锚点纪律全写进去，
// 使产出的 slices.jsonl 天然可被 `escalate` 机检。
function doBriefs() {
  const task = flag('task', 'task');
  const dir = outDir(task, flag('out'));
  const bdir = join(dir, 'briefs');
  mkdirSync(bdir, { recursive: true });
  const units = (flag('units') ? flag('units').split(',') : []).map((s) => s.trim()).filter(Boolean);
  const changed = flagAll('changed');
  const esc = (() => { try { return JSON.parse(readFileSync(join(dir, 'escalate.json'), 'utf8')); } catch { return null; } })();

  const common = [
    `## 铁律（每条都是踩过的）`,
    `- **只读被审对象**：绝不改它、绝不对真库写入（要试写入就用沙箱环境变量指向自己的临时目录）。`,
    `- 你的脚本只写在 \`${join(dir, 'runs')}\`；产物写在 \`${join(dir, 'slices')}\`。`,
    `- 每条结论**必须有你自己跑出来的证据**（复算/复跑/构造输入），不接受"读起来觉得"。`,
    `- 每条切片标 \`status\`（实证/推测/未决）与 \`reality_entry\`（theoretical/observed/reproduced）。`,
    `- **锚点必须带修订**：\`anchor\` 写文件:行，\`rev\` 写该文件 sha256 前 12 位——"审计→修复"一个来回后行号就会失效。`,
    ``,
    `## 切片格式（写成一行的 JSON，追加到 \`slices/<你的单元名>.jsonl\`）`,
    '```json',
    `{"id":"S1","unit":"<单元名>","claim":"（一条可证伪的指控）","quote":"（逐字原句，禁止转述）","anchor":"src/x.mjs:123","rev":"sha256:前12位","risk_class":"dataloss","status":"实证","reality_entry":"reproduced","data_critical":false,"falsifier":"（≤1 个探针：什么最小实验能让这条主张挂掉）"}`,
    '```',
    `- \`risk_class ∈\` **dataloss / silent-skip / false-green / coverage-gap / false-fix / crash / perf / docs / other**`,
    `- 闭词表**零容忍**：未知取值/缺字段会让裁决判 \`invalid-input\`（退出码 3，不得报绿）。`,
    `- **升级判据（供你自查，不必自己升级）**：实证 ∧ 非理论 ∧ (dataloss|silent-skip|false-green|false-fix|crash 或 coverage-gap∧data_critical) ⇒ 立即升级；**假绿一条即升**。`,
    `- 严重度不归你：你只出 \`risk_class\`。`,
  ].join('\n');

  const mk = (name, body) => { writeFileSync(join(bdir, name), body, 'utf8'); return name; };
  const made = [];

  // P1：每个正交单元一份
  const unitList = units.length ? units : ['unit-A', 'unit-B', 'unit-C'];
  for (const u of unitList) {
    made.push(mk(`p1-${u}.md`, [
      `# P1 快层派单 · ${task} · 单元 ${u}`,
      ``,
      `**预算 ≤3 分钟。** 你只负责**一个正交单元**（一个观察面），不要越界去查别的单元。`,
      ``,
      `## 你要做的`,
      `1. 读 \`${join(dir, 'p0.md')}\`（机检层给了：套件/校验/体检/扫描结果 + 六库快照 + 改动文件清单）；`,
      `2. 只读 P0 点名的那部分，**不要整仓通读**；`,
      `3. 对本单元负责的面，逐条产出**判别式**：一条"新代码 PASS ∧ 旧代码 FAIL"的**双向检查**（这是抓"假修复/假绿"的主力），`,
      `   或一条"改动面 × 覆盖面"的**差集检查**（抓零用例/漏测）；`,
      `4. 每条判据都要能**被一条命令跑出来**（写进 \`${join(dir, 'runs')}\`，用批量跑：\`node tools/gate.mjs run <你的目录>\`）。`,
      changed.length ? `\n## 本批改动文件\n${changed.map((f) => '- ' + f).join('\n')}` : '',
      ``,
      common,
      ``,
      `## 输出`,
      `- 切片 → \`${join(dir, 'slices', u + '.jsonl')}\``,
      `- 一句话小结（≤5 行）→ 你的回复`,
    ].join('\n')));
  }

  // P2：仅升级项
  made.push(mk('p2.md', [
    `# P2 慢层派单 · ${task}`,
    ``,
    `**只处理升级项**（不要重查全量）。`,
    esc && esc.escalations && esc.escalations.length
      ? `\n## 升级项（来自 \`escalate.json\`）\n${esc.escalations.map((e) => `- ${e.id}（${e.reason}）：${e.risk_class} — ${e.why}`).join('\n')}`
      : `\n## 升级项\n（\`escalate.json\` 尚未生成或为空——先跑：\`node tools/gate.mjs escalate --slices <你的 slices 目录>/*.jsonl --task ${task} --out <out>\`）`,
    ``,
    `## 你要做的`,
    `1. 对每个升级项**深挖到根因**（写探针、复现、重算、读全调用链——这一层允许慢）；`,
    `2. 同时做**对抗性复核**：主动去**证伪** P1 的每一条结论；`,
    `3. 结论落 \`${join(dir, 'verdict.json')}\`：\`{id, verdict: 确认|部分确认|证伪|无法判定, severity, evidence, fix}\`。`,
    ``,
    common,
  ].join('\n')));

  // P3：独立审核（只审判别式）
  made.push(mk('p3.md', [
    `# P3 独立审核派单 · ${task}`,
    ``,
    `**你是全新上下文、只读。你不为任何作者背书（包括 Lead）。**`,
    ``,
    `## 你要做的`,
    `1. **抽查 ≥20% 的双向检查**：亲跑它们，看是否真的"新 PASS ∧ 旧 FAIL"；`,
    `2. 只**审判别式**——**不要重做结论**；`,
    `3. 用**对抗性输入**试能不能骗过升级判据（例：把 \`dataloss\` 伪装成 \`perf\`、\`status=实证\` 但 \`reality_entry=theoretical\`、缺字段、闭词表外的取值）；`,
    `4. 给出"被推翻 / 降级"的结论清单，以及**你认为是漏项的**一条。`,
    ``,
    `## 工具`,
    `- \`node tools/gate.mjs selftest\`（判据自测）、\`node tools/gate.mjs escalate --slices …\`（复算升级裁决）`,
    ``,
    `## 输出`,
    `- 判定表 → \`${join(dir, 'audit.md')}\`（每条：结论 / 证据 / 判定）`,
    `- 被推翻清单 → 你的回复`,
  ].join('\n')));

  console.log(`已生成 ${made.length} 份派单文本 → ${bdir}`);
  for (const m of made) console.log('  ·', m);
}

if (cmd === 'p0') doP0();
else if (cmd === 'escalate') doEscalate();
else if (cmd === 'slices-template') doTemplate();
else if (cmd === 'run') doRun();
else if (cmd === 'fixture') doFixture();
else if (cmd === 'briefs') doBriefs();
else if (cmd === 'close') doClose();
else if (cmd === 'selftest') doSelftest();
else {
  console.log('门档机械执行器（v1）。子命令：');
  console.log('  p0 [--task NAME] [--check FILE ...] [--out DIR]   机检：主套件/check/health/family-sweep/语法/六库快照');
  console.log('  escalate --slices FILE [--task NAME] [--out DIR]  升级判据 A1/A2 ⇒ escalate.json（可多文件）');
  console.log('  slices-template [--task NAME] [--out DIR]         切片空模板（含闭词表）');
  console.log('  run <目录或文件…> [--out DIR] [--timeout MS]      批量跑探针 ⇒ probes.md/json（1 次往返）');
  console.log('  fixture --kind <kind> [--file PATH]               夹具模板：' + Object.keys(FIXTURES).join('/'));
  console.log('  briefs --task NAME [--units a,b] [--changed F]     生成 P1/P2/P3 派单文本 ⇒ briefs/*.md');
  console.log('  close --task NAME [--out DIR]                     收口：summary.md + canon 就绪文本');
  console.log('  selftest                                          夹具自测（不碰真库）');
}
