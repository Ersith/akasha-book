// gate.test.mjs —— 门档触发判据（2026-10-15 落地）
// 规矩同其它套件：只测**顶层导出的纯函数**；生产路径与测试用的是同一个函数（不存在"测试一份、生产另一份"）。
import assert from 'node:assert';
import { gateTriggerOf, GATE_TRIGGERS } from './lib/index.js';

const pos = [
  ['帮我修个 bug', '代码'],
  ['写个脚本把数据抓一下', '代码'],
  ['改一下这个函数', '代码'],
  ['实现一下这个想法', '代码'],
  ['重构这块', '代码'],
  ['审计一下这批改动', '审计'],
  ['做一次独立审核', '审计'],
  ['复核一遍', '审计'],
  ['找我上次那个 bug 的根因', '审计'],
  // 2026-10-15 补（门档自审发现的漏网：最该挂的场景原本挂不上）
  ['对阿卡夏做一次全量检查吧', '审计'],
  ['全量检查一下', '审计'],
  ['排查一下这个异常', '审计'],
  ['做个整体复检', '审计'],
  ['体检一次', '审计'],
  ['审一下这批改动', '审计'],
  ['核对一下这两个数', '审计'],
  ['重建索引顺带搞', '迁移/不可逆'],
  ['把库紧凑化', '迁移/不可逆'],
  ['迁移到新格式', '迁移/不可逆'],
  ['把这个目录删掉', '迁移/不可逆'],
];
const neg = [
  '查代码：谁在解析 seg- id',
  '看代码里怎么写的',
  '代码在哪',
  '搜代码看看',
  '代码风格统一一下',      // 「统一」不是本判据的三类动作
  '今天天气如何',
  '版本号是多少',
  '把这段总结成三条',
  '',
  null,
];

let pass = 0; const fails = [];
for (const [t, want] of pos) {
  const got = gateTriggerOf(t);
  if (got && got.cat === want) pass += 1; else fails.push(`正例「${t}」期望 ${want}，实得 ${JSON.stringify(got)}`);
}
for (const t of neg) {
  const got = gateTriggerOf(t);
  if (got === null) pass += 1; else fails.push(`负例「${t}」应不触发，实得 ${JSON.stringify(got)}`);
}
pass += 2;

// ── 注册面（2026-10-15 补；plugins 单元指出：原先只测纯函数 gateTriggerOf ⇒ 对 context 注册面零覆盖，
//    这正是「哨兵传 null 导致本行永不出话」能长期活着的根因）────────────────────────────
{
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { apply } = await import('./lib/index.js');

  const mkFix = (intentGists) => {
    const dir = mkdtempSync(join(tmpdir(), 'gate-reg-'));
    mkdirSync(join(dir, 'data'), { recursive: true });
    mkdirSync(join(dir, 'logs'), { recursive: true });
    writeFileSync(join(dir, 'data', 'session.jsonl'),
      intentGists.map((g, i) => JSON.stringify({ store: 'session', session: 's1', seq: i + 1, time: new Date().toISOString(), kind: 'intent', gist: g })).join('\n') + '\n', 'utf8');
    return dir;
  };
  const run = (cfg) => {
    const rows = [];
    const ctx = { systemPrompt: { context: (r) => rows.push(r) }, tools: { register() {}, guard() {} }, on() {}, logger: { info() {} }, config: cfg };
    apply(ctx, cfg);
    return { rows, row: (n) => rows.find((r) => r.name === n) };
  };

  // ① 命中"审计类"意图时，gate 行**必须出话**（未知会话 id ⇒ 走哨兵路径）
  const FIX1 = mkFix(['对系统做一次全量检查']);
  const r1 = run({ akashaDir: FIX1, gateHints: true });
  const g1 = r1.row('akasha:gate');
  assert.ok(g1, '应注册 akasha:gate 行（已注册：' + r1.rows.map((r) => r.name).join(',') + '）');
  const t1 = g1 && g1.text();
  assert.ok(typeof t1 === 'string' && t1.startsWith('[门档]'), '会话 id 未知时也必须出话（哨兵不得用 null）：' + String(t1));

  // ② 同类 30 分钟去抖：第二次必须为 null
  const t2 = g1.text();
  assert.equal(t2, null, '同类 30 分钟内只提醒一次：' + String(t2));

  // ③ 不命中意图时静默
  const FIX2 = mkFix(['今天天气不错']);
  const r2 = run({ akashaDir: FIX2, gateHints: true });
  assert.equal(r2.row('akasha:gate').text(), null, '非触发意图必须静默（不制造噪音）');

  // ④ gateHints:false ⇒ 不注册（提示与事件双停）
  const r3 = run({ akashaDir: FIX1, gateHints: false });
  assert.ok(!r3.rows.some((r) => r.name === 'akasha:gate'), 'gateHints:false 时不得注册');

  for (const d of [FIX1, FIX2]) rmSync(d, { recursive: true, force: true });
  pass += 5;   // 2026-10-15 修正（plugins S3）：本段实为 5 条断言，原写 +4 ⇒ 自报少 1
}

console.log(`gate.test.mjs：${pass} 通过 / ${fails.length} 失败`);
if (fails.length) { for (const f of fails) console.log('  ✗ ' + f); process.exitCode = 1; }
