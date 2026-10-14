// akasha/tools/family-sweep.mjs —— 阿卡夏全族「一次跑完」的检查器（2026-10-13，举一反三批）
//
// 起因：现有各检查是散的（plugin-src-drift 只管 5 个 @local 包的代码漂移），有三个盲区：
//   ① 只对比**代码文件**，不扫**发布件里的机器路径**（本次 S6 清掉的 <LOCAL_PATH> 写死就属于这类）；
//   ② 不检查**环境变量契约**（插件读 AKASHA_DIR / 核心读 AKASHA_ROOT+AKASHA_LOGS，两套并存）；
//   ③ 不检查**README 里的版本漂移**（P3 的那类，靠人眼看不出来）。
//
// 用法：
//   node akasha/tools/family-sweep.mjs            # 全量（含自测）
//   node akasha/tools/family-sweep.mjs --quiet    # 只报 ✗ 与结论行（静音过程）
//   node akasha/tools/family-sweep.mjs --no-tests # 跳过子套件（快）
// 退出码：0 = 全绿；1 = 有必须动作项。
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const H = '<LOCAL_PATH>';
const PROFILE = join(H, 'official-home/profiles/desktop/node_modules');
const quiet = process.argv.includes('--quiet');
const noTests = process.argv.includes('--no-tests');
const say = (...a) => { if (!quiet) console.log(...a); };
// 2026-10-13 修：--quiet 曾把 ✗ 一并吞掉 ⇒ 静默退出码 1，无从看因（与文档「只报结论行」不符）。
// 口径：静音「过程」，**失败行与结论行永远出声**。
const loud = (...a) => console.log(...a);
let actions = 0;

// ── 1. 包清单（含 bundle 目录：cordis.patch.yml 与 mcp.mjs 这类也纳入代码对比）──
const PKGS = [
  { name: '@akasha-book/akasha-gate', src: join(H, 'dsh-akasha-gate'), code: ['index.js', 'prompt-safety.js', 'cordis.patch.yml'] },
  { name: '@akasha-book/akasha-sleep', src: join(H, 'dsh-akasha-sleep'), code: ['lib/index.js', 'lib/prompt-safety.js'] },
  { name: '@akasha-book/akasha-session', src: join(H, 'dsh-akasha-session'), code: ['lib/index.js'] },
  { name: '@akasha-book/akasha-hooks', src: join(H, 'dsh-akasha-hooks'), code: ['index.js'] },
  { name: '@akasha-book/mcp-akasha', src: join(H, 'dsh-mcp-akasha'), code: ['index.js', 'cordis.patch.yml'] },
  { name: '@akasha-book/mcp-rea', src: join(H, 'dsh-mcp-rea'), code: ['server.mjs', 'cordis.patch.yml'] },
];
// 核心库（不在 profile 里：以「发行件是否含机器路径」与「自测」间接把关）

say('══ 1. 代码 / 版本漂移（src ↔ profile 安装副本）══');
let codeDrift = 0, verDrift = 0;
for (const p of PKGS) {
  const dst = join(PROFILE, p.name);
  if (!existsSync(dst)) { loud('  ⚠ ' + p.name + '：profile 里不在'); continue; }
  const diffs = [];
  for (const f of p.code) {
    const a = join(p.src, f), b = join(dst, f);
    if (!existsSync(a)) continue;
    if (!existsSync(b)) { diffs.push(f + '(缺)'); continue; }
    if (!readFileSync(a).equals(readFileSync(b))) diffs.push(f);
  }
  let vSrc = '?', vDst = '?';
  try { vSrc = JSON.parse(readFileSync(join(p.src, 'package.json'), 'utf8')).version; } catch { /* 无包 */ }
  try { vDst = JSON.parse(readFileSync(join(dst, 'package.json'), 'utf8')).version; } catch { /* 无包 */ }
  if (diffs.length) { codeDrift += 1; loud('  ✗ ' + p.name + ' —— **代码**漂移（必须动作）：' + diffs.join(', ') + ' ⇒ 重打包 → install_bundle → 重启'); }
  else if (vSrc !== vDst) { verDrift += 1; say('  · ' + p.name + ' —— 仅版本号超前（' + vSrc + ' vs ' + vDst + '）· 代码一致 ⇒ 无需动作 ✓'); }
  else say('  ✓ ' + p.name + '（代码与版本都一致）');
}
if (codeDrift) actions += codeDrift;
say('  → ' + (codeDrift ? codeDrift + ' 个代码漂移 ✗' : '无代码漂移 ✓') + (verDrift ? '（' + verDrift + ' 个仅版本号超前）' : ''));

// ── 2. 发布件机器路径（注释行豁免；本机路径只许出现在注释/README/宿主 patch 配置里）──
say('');
say('══ 2. 发布件机器路径（JS 代码行不许写死 <LOCAL_PATH> / D:\\ 等）══');
const MACHINE_RE = /(H:[\\/]Harness|D:[\\/](ServerPackCreator|DSHHarness))/i;
// 只扫 **JS 代码**：`cordis.patch.yml` 是「每台机器自己的 profile 配置」（按设计就是本机路径），
// 扫它等于对着宿主的合法配置报警——**不是缺陷**（2026-10-13 首跑即踩：17 处全在 patch 里）。
const SCAN_FILES = PKGS.flatMap((p) => ['index.js', 'server.mjs', 'mcp.mjs', 'lib/index.js', 'lib/prompt-safety.js', 'prompt-safety.js', 'lib/index-worker.mjs'].map((f) => join(p.src, f)));
let pathHits = 0;
for (const f of SCAN_FILES) {
  if (!existsSync(f)) continue;
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (!MACHINE_RE.test(l)) return;
    const t = l.trim();
    const commentish = t.startsWith('//') || t.startsWith('#') || t.startsWith('*') || t.startsWith('/*');
    if (commentish) return;                                  // 注释里的示例路径豁免
    pathHits += 1;
    loud('  ✗ ' + f.replace(H + '/', '') + ':' + (i + 1) + ' —— ' + t.slice(0, 90));
  });
}
if (pathHits) actions += pathHits;
say('  → ' + (pathHits ? pathHits + ' 处代码行机器路径 ✗（改为 env 优先 + 相对候选）' : 'JS 代码行无机器路径 ✓') + '（`cordis.patch.yml` 按设计含本机路径，故意不扫）');

// ── 3. 环境变量契约（两套并存：插件 AKASHA_DIR ↔ 核心 AKASHA_ROOT / AKASHA_LOGS）──
say('');
say('══ 3. 环境变量契约 ══');
const ENV_CONTRACT = [
  { file: join(H, 'akasha/lib.mjs'), must: ['AKASHA_ROOT', 'AKASHA_LOGS'], what: '核心：数据根 / 日志根' },
  { file: join(H, 'dsh-akasha-gate/index.js'), must: ['AKASHA_DIR', 'AKASHA_POLICY'], what: '门控：库根 / 策略文件' },
  { file: join(H, 'dsh-akasha-hooks/index.js'), must: ['AKASHA_DIR'], what: '钩子：库根' },
  { file: join(H, 'dsh-akasha-session/lib/index.js'), must: ['AKASHA_DIR'], what: '会话层：库根' },
  { file: join(H, 'dsh-akasha-sleep/lib/index.js'), must: ['AKASHA_DIR'], what: '睡眠：库根' },
];
let envMiss = 0;
for (const c of ENV_CONTRACT) {
  if (!existsSync(c.file)) continue;
  const text = readFileSync(c.file, 'utf8');
  const missing = c.must.filter((v) => !text.includes(v));
  if (missing.length) { envMiss += 1; loud('  ✗ ' + c.file.replace(H + '/', '') + ' 缺 ' + missing.join(' / ') + '（' + c.what + '）'); }
}
if (envMiss) actions += envMiss;
say('  → ' + (envMiss ? envMiss + ' 处契约缺口 ✗' : '五族环境变量契约齐 ✓') + '（口径：插件侧 AKASHA_DIR；核心侧 AKASHA_ROOT + AKASHA_LOGS；默认布局下互不相撞）');

// ── 4. README 版本漂移（豁免：已写「以 package.json 为准」的 README）──
say('');
say('══ 4. 组件 README 的版本陈述 ══');
let readmeDrift = 0;
for (const p of PKGS) {
  const f = join(p.src, 'README.md');
  if (!existsSync(f)) continue;
  const head = readFileSync(f, 'utf8').split('\n').slice(0, 6).join(' ');
  if (head.includes('以本包 `package.json`')) { say('  ✓ ' + p.name + '：指真值（不再复述版本）'); continue; }
  const declared = (head.match(/v?(\d+\.\d+(?:\.\d+)?(?:-h\d+)?)/) || [])[1];
  let real = '?';
  try { real = JSON.parse(readFileSync(join(p.src, 'package.json'), 'utf8')).version; } catch { /* 无包 */ }
  if (!declared) { say('  · ' + p.name + '：README 头未声明版本（可接受）· 实际 ' + real); continue; }
  const norm = (s) => String(s).replace(/^v/, '').replace(/-h\d+$/, '');
  if (norm(declared) === norm(real)) { say('  ✓ ' + p.name + '：' + declared + ' ≈ ' + real + '（仅 h 后缀差异）'); continue; }
  readmeDrift += 1; loud('  ✗ ' + p.name + '：README 头写 ' + declared + '，实际 ' + real + ' ⇒ 改「指真值」或同步');
}
if (readmeDrift) actions += readmeDrift;

// ── 5. 子套件（可选）──
if (!noTests) {
  say('');
  say('══ 5. 子套件实跑 ══');
  const SUITES = [
    ['akasha/test.mjs', join(H, 'akasha/test.mjs')],
    ['gate', join(H, 'dsh-akasha-gate/selftest.test.mjs')],
    ['hooks', join(H, 'dsh-akasha-hooks/selftest.test.mjs')],
    ['session', join(H, 'dsh-akasha-session/selftest.test.mjs')],
    ['sleep', join(H, 'dsh-akasha-sleep/selftest.test.mjs')],
    ['mcp-akasha', join(H, 'plugins/mcp-akasha/selftest.test.mjs')],
    ['mcp-rea', join(H, 'dsh-mcp-rea/selftest.mjs')],
  ];
  for (const [label, file] of SUITES) {
    if (!existsSync(file)) { loud('  ⚠ ' + label + '：找不到 ' + file); continue; }
    const r = spawnSync(process.execPath, [file], { cwd: join(file, '..'), encoding: 'utf8', timeout: 300000, env: { ...process.env, AKASHA_QUERY_LOG: 'off' } });   // 子套件＝机器检查，关查询侧线（防污染真日志）
    const out = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').filter(Boolean).pop() || '';
    const ok = r.status === 0;
    if (!ok) actions += 1;
    (ok ? say : loud)((ok ? '  ✓ ' : '  ✗ ') + label + '：' + out.slice(0, 90));
  }
}

say('');
loud(actions ? '★★ 结论：' + actions + ' 项必须动作（见上方 ✗）' : '★★ 结论：全绿 ✓');
process.exit(actions ? 1 : 0);
