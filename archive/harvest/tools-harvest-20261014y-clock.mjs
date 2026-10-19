// 2026-10-14：内置时钟 v0（被动脉搏前缀 + 主动 now 查询）。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-builtin-clock-'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**内置时钟 v0 落地（2026-10-14；用户令「给大肥鱼搞个内置时钟，工作时可主动查询时间，为自我行为提供时间依据与对照」；受控解冻）**。',
  '**两副面**：**① 被动（每回合执行点）**——库脉搏行加时钟前缀 `[YYYY-MM-DD 周X HH:MM]`（本地时区；关断 `AKASHA_CLOCK=off`，测试可注入 opts.now）；**随下次重启生效**（require 缓存律）。**② 主动（随时可查）**——CLI `node akasha.mjs now [--at t1,t2]` 与 MCP `akasha_now`（工具面 **21→22**）；返回 now（本地/UTC/星期/偏移/unix）+ **时间对照锚**（最近写入的年纪 / 上次睡眠的年纪）+ `at` 换算（含方向与 daysAgo；`YYYY-MM-DD` 按 **UTC 午夜**解析并如实打印口径）。',
  '**设计理据**：补「时间归因」通道（见 canon-read-time-attribution-20261014 两通道分解）——把时间基准挂在**每回合必经的执行点**（同称呼行/脉搏行思路），不靠远处提醒；剂量约 21 字符/回合（远小于 C 线阈值）；对照锚让「这条记忆几天前写的 / 上次睡眠多久前」变成可查事实，而不是靠猜。',
  '**验证**：CLI 活体 `now` 输出正确（含对照锚与 at 换算）；MCP 探针实调通过；守卫测试新增（注入时刻字段/对照锚/at 三例含非法输入/前缀与关断）——主套件 **235→236**；family-sweep 全绿 · health-check **51/51**。',
  '**待重启核验（板条已立）**：脉搏行前缀活体出现 + MCP `akasha_now` 进桥 + README/AGENTS 工具数 21→22 同步（配 pre 快照）。**登记未做**：时间锚 2×2 对照实验（canon-read-time-attribution 里的 P1/P2）——按「不给压力」留待裁。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-builtin-clock-20261014',
  claim,
  source: { type: '复现', ref: 'lib.nowSnapshot + sleep.renderPulseLine 前缀 + CLI now + MCP akasha_now · CLI/探针活体 · test 236/236 · health-check 51/51' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['内置时钟', '时间认知', '工具', '落地'],
  caused_by: ['canon-read-time-attribution-20261014'],
});
console.log('已入 canon：' + r.id);
