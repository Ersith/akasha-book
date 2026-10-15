// 生成给外部审计用的全量检查文档（从产物机械生成，避免手抄失真）
// 输入：gate-out/full-check-20261015/{slices/*.jsonl, escalate.json, verdict.json, verdict-b.json}
// 输出：akasha/FULLCHECK-20261015.md
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = '<AKASHA_DIR>';
const G = join(OUT, 'gate-out/full-check-20261015');
const slicesDir = join(G, 'slices');

// ── 读切片（全部）──────────────────────────────────────────────────────────
const slices = [];
for (const f of readdirSync(slicesDir).filter((x) => x.endsWith('.jsonl')).sort()) {
  for (const line of readFileSync(join(slicesDir, f), 'utf8').split('\n').filter(Boolean)) {
    try { const o = JSON.parse(line); slices.push({ ...o, _file: f.replace('.jsonl', '') }); } catch { /* 坏行 */ }
  }
}
const esc = JSON.parse(readFileSync(join(G, 'escalate.json'), 'utf8'));
const verdicts = {};
for (const [tag, file] of [['A', 'verdict.json'], ['B', 'verdict-b.json']]) {
  try {
    const v = JSON.parse(readFileSync(join(G, file), 'utf8'));
    for (const e of (v.entries ?? v.verdicts ?? [])) verdicts[`${tag}:${e.id}`] = e;
  } catch { /* 缺文件不致命 */ }
}
const escIds = new Set(esc.escalations.map((e) => `${e.file ?? ''}#${e.id}`));

// ── 我的修复清单（手工维护：确证后逐条补；只列已修且有验证的）──────────────
const FIXES = [
  ['会话层读面被切成两半', 'session.mjs（`!== sess` 族 4 处 + `sessionMatches` 只归一一边）', '真库两种写法"作用域内" 2028/1089 → **3211**（统一）；test.mjs I-18', '本轮最重'],
  ['门档触发行在生产里永不出话', 'dsh-akasha-sleep/lib/index.js（哨兵 `null` → `undefined`）', '全历史 hooks.jsonl `gate-reminder` 计数 **0** → 修 + 注册面用例（回退哨兵即红）；gate.test 37/0', '物证级'],
  ['`today` 校验只在 MCP 面', 'lib.mjs（`dayArg` 下沉）+ akasha.mjs（读工具族 4 处 + 顶层兜底 catch）', 'CLI `audit --today bogus` exit 0/判 2027 到期 → **exit 1 + 单行报错**；test.mjs I-19', '两端口径'],
  ['`audit/summary/stats` 声称吃注入却真读真库', 'lib.mjs（三函数 loadStore 接 `opts.files`；`stats()` 补形参；`audit` 内部 `stats()` 转发）', '探针 `auditSummaryCanon` **432 → 0**', '最高级假绿'],
  ['`stripGenre` 吃掉词尾「好」', 'lib.mjs（带左边界锚）+ `skeletonCount` 同锚', '真库 18 处"偏好。→偏。" → "偏好。"回来了；test.mjs 三条回归门', '读侧篡改'],
  ['门档触发词表漏高频表达', 'dsh-akasha-sleep/lib/index.js（词表扩宽）', '6 条原漏网全部触发 `审计`；负例仍不触发；gate.test 32→37', '自指缺陷'],
  ['数字入参无上下界', 'lib.mjs（`summary.per` 钳 20）+ session.mjs（`limit/offset` 钳）', '`--per 1e9` 185051 → **19831** 字节', '剂量闸绕过'],
  ['MCP `review_log` 任意值照收', 'mcp.mjs（store 白名单 + verdict 词表 + id 存在性）', '三种非法输入全被拒（原回 ok:true）', '两端不一致'],
  ['CLI `orphan add --event-time` 零校验', 'akasha.mjs（`dayArg`）', '`15/10/2026`/`9999-13-45` 原样落库 → 现被拒；**I-19 补 CLI 侧对等用例**', '唯一无保护项'],
  ['session 定时器降级无观测线', 'dsh-akasha-session/lib/index.js（两处补 `session-degraded` 行）', '探针重跑：原"无降级观测线"→ 有行', '静默降级'],
  ['紧凑化工具不认 `AKASHA_ROOT`', 'tools/migrate-20261015-compact-session.mjs', '指向沙箱跑不再真读真库（原会）', '安全相关'],
  ['family-sweep 漂移面漏 `lib/index-worker.mjs`', 'tools/family-sweep.mjs', '该文件现纳入漂移比对', '覆盖缺口'],
];

const lines = [];
lines.push('# 阿卡夏全量检查报告（2026-10-15 · 门档 C 档端到端首跑）');
lines.push('');
lines.push('> **本文档供外部独立审计**：请沿"证据/falsifier"字段自行复跑；本报告刻意保留**被证伪**与**降档**的条目——机器判绿不等于真绿，人工裁决也会错，双向都留痕。');
lines.push('');
lines.push('## 0. 怎么跑的（可复现）');
lines.push('```bash');
lines.push('cd <AKASHA_DIR>');
lines.push('node tools/gate.mjs p0 --task full-check-20261015 --out ./gate-out          # ① 零模型机检（13 项）');
lines.push('node tools/gate.mjs briefs --task full-check-20261015 --units core,cli-mcp,session-tools,plugins --out ./gate-out   # ② 生成派单文本');
lines.push('node tools/gate.mjs escalate --slices gate-out/full-check-20261015/slices/*.jsonl --task full-check-20261015 --out ./gate-out   # ③ 机检升级裁决');
lines.push('node tools/gate.mjs close --task full-check-20261015 --out ./gate-out      # ④ 收口');
lines.push('```');
lines.push('分层：**P0 机检（零模型）→ P1 快层（4 个正交单元并联，各 ≤8 分钟，只出"切片=可证伪指控"）→ 机检升级判据 A1/A2 → P2 慢层（仅升级项，两路独立裁决）→ P3 独立审核**。');
lines.push('铁律：只读被审对象；脚本只写自己的 `runs/`；**每条结论必须自造输入跑出来**；每条切片带 `falsifier`（什么最小实验能让它挂掉）。');
lines.push('');
lines.push('## 1. 结果计数（全部可从产物复算）');
lines.push(`- **P0 机检：13 项，0 FAIL**（主套件 / 库校验 / 体检 / 全家扫描 / 语法 / 六库快照）——**而下面 29 个升级点全部逃过了这些脚本**。`);
lines.push(`- 切片：**${slices.length} 条**（5 个文件）· 升级：**${esc.escalations.length} 点**（A1 ${esc.counts?.a1 ?? '?'} / A2 ${esc.counts?.a2 ?? '?'}）· 自证包：完整=${esc.certificate?.complete}（带证伪器 ${esc.certificate?.withFalsifier}/${esc.certificate?.slices}）`);
const byClass = {};
for (const e of esc.escalations) byClass[e.risk_class] = (byClass[e.risk_class] ?? 0) + 1;
lines.push(`- 升级按 risk_class：${Object.entries(byClass).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
lines.push(`- 机检裁决：**${esc.verdict}**（含闭词表零容忍校验：非法取值当场判 \`invalid-input\` 并**拒绝报绿**）`);
lines.push('');
lines.push('## 2. 修复清单（12 项，全部有验证证据）');
lines.push('');
lines.push('| # | 问题 | 改动点 | 验证证据 | 性质 |');
lines.push('|---|---|---|---|---|');
FIXES.forEach((f, i) => lines.push(`| ${i + 1} | **${f[0]}** | ${f[1]} | ${f[2]} | ${f[3]} |`));
lines.push('');
lines.push('**修复后全量回归**：主套件 270/0 · 体检 51/51 · 库校验 811/811 · gate.test 37/0 · stateful 11/0。');
lines.push('');
lines.push('## 3. 被慢层**证伪**的条目（不许照修——审计请重点看这一节）');
lines.push('');
for (const [k, v] of Object.entries(verdicts)) {
  if (String(v.verdict ?? '').includes('证伪')) lines.push(`- **${v.file ?? ''} ${v.id}** —— ${v.verdict}：${String(v.evidence ?? '').slice(0, 220)}`);
}
lines.push('');
lines.push('> 其中 `cli-mcp S2`/`S5` 的"证伪"是**"对当前 HEAD 证伪"**：原判与复核在各自时点都属实，是**Lead 在慢层裁决期间并发打补丁**改变了工作树。⇒ 见第 5 节流程教训。');
lines.push('');
lines.push('## 4. 降档的条目');
lines.push('');
for (const [k, v] of Object.entries(verdicts)) {
  if (String(v.verdict ?? '').includes('部分')) lines.push(`- **${v.file ?? ''} ${v.id}** —— ${v.verdict}：${String(v.evidence ?? '').slice(0, 200)}`);
}
lines.push('');
lines.push('## 5. 流程教训（本轮最贵的一条）');
lines.push('**验证必须在冻结的修订上做。** Lead 在 P2 裁决期间并发改了 `lib.mjs`/`akasha.mjs` 4+ 次（20:32–20:36），中间态一度把 CLI 打红（`opts is not defined`）；两条"证伪"实际只是"派单者抢跑"。');
lines.push('⇒ 门档纪律补一条：**P2 期间锁树；要修先记切片，慢层收工再动手。**');
lines.push('');
lines.push('## 6. 仍未完成');
lines.push('- `@akasha-book/akasha-sleep` **需重打包 + install + 重启**（词表与哨兵两处修复目前只在源码面生效，生产仍跑旧构建）；');
lines.push('- `core S-core-4`：`OUTPUT_ID_RE` 不认 `frontier-` 前缀 ⇒ 13 条当前 id 在引用统计里"不存在"；');
lines.push('- `core S-core-5`：49 条校验规则里 48 条的期望串不在测试内 ⇒ **规则能红 ≠ 套件在查**（覆盖缺口）；');
lines.push('- `boundedInt` 目前**零调用＝死代码**（慢层点名）；');
lines.push('- 门档自身两个设计缺口：切片 id **跨文件重号**（应带单元前缀）；"**派单者自己也在改代码**"无机制可拦。');
lines.push('');
lines.push('## 7. 附：全部切片（含未升级的）');
lines.push('');
lines.push('| 文件 | id | risk_class | status | reality | 一句话 | 锚点 |');
lines.push('|---|---|---|---|---|---|---|');
for (const s of slices) {
  lines.push(`| ${s._file} | ${s.id} | ${s.risk_class} | ${s.status} | ${s.reality_entry} | ${String(s.claim ?? '').replace(/\|/g, '\\|').slice(0, 120)} | ${s.anchor} |`);
}
lines.push('');
lines.push('## 8. 产物位置');
lines.push('```');
lines.push('gate-out/full-check-20261015/');
lines.push('├─ p0.md            机检报告（13 项 + 六库快照）');
lines.push('├─ briefs/*.md      P1/P2/P3 派单文本（含闭词表与升级判据）');
lines.push(`├─ slices/*.jsonl   ${slices.length} 条切片（每条带 falsifier）`);
lines.push('├─ escalate.json    机检升级裁决（29 点 + 自证包完整性）');
lines.push('├─ verdict.json     A 路裁决（cli-mcp + core，10 条）');
lines.push('├─ verdict-b.json   B 路裁决（session-tools + plugins，8 项）');
lines.push('└─ runs/            各单元探针脚本 + 原始输出（可整条复跑）');
lines.push('```');

writeFileSync(join(OUT, 'FULLCHECK-20261015.md'), lines.join('\n') + '\n', 'utf8');
console.log(`已生成：${join(OUT, 'FULLCHECK-20261015.md')}`);
console.log(`切片 ${slices.length} 条 · 升级 ${esc.escalations.length} 点 · 裁决记录 ${Object.keys(verdicts).length} 条 · 修复条目 ${FIXES.length}`);
