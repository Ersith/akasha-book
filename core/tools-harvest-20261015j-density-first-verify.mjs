// akasha/tools/harvest-20261015j-density-first-verify.mjs —— 密度监测首验 + 口径修正留痕
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-density-first-verify-20261015'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**格式密度监测·首验结果与口径修正（2026-10-15 08:23，重启后第一次运行）**——验收四项：density 线 ✅（暴露问题）· CLI ✅ · 节奏条行 ⏸（被样本门槛正确挡掉）· loop-watch 新形态（待新命中）。',
  '**① 首验实测**：重启（08:18，pid 16704）后轮 7 结束即落第一条 density 线——`{"turn":7,"rate":23,"tag":"黄","chars":1394,"bold":32,"rounds":1}`。**问题**：该轮实际文本 12666ch（r2g 口径），线上却只有 1394ch——**首版只统计了"该轮最后一条消息"，而阈值（15/40/120）与全部归因分析是"整轮所有消息"口径**。两个口径不一致；且小样本（1394<2000）被节奏条的样本门槛挡掉 ⇒ 密度行没显示（**不是渲染缺陷，是口径问题的连锁**）。',
  '**② 修（0.3.5-h3，restart-required）**：`rememberAssistant` 按 `(sid,turn)` 累计每条 assistant/message 的 reasoning+text 字符与 ** 匹配数（`turnAcc`），`onTurnWatch` 消费并清除；无累计时退回"本消息"口径。测试 +1（同 turn 两条消息之和＝1000ch/20** ⇒ rate 20.0）⇒ selftest **33/33**。**③ 口径断层注记**：hooks 里 00:21:18Z 那条（rate 23/chars 1394）是**旧单条口径**，此后为新整轮口径——分析时按时间分段。',
  '**④ 有趣的巧合**：旧口径那条 rate=23 与整轮口径算出的 22.8 几乎相同——因为该轮最后一条消息的密度与整轮相当；但这是**巧合不可依赖**（其它轮可能差很远）。',
  '**⑤ 验收状态**：density 线 ✅（已有，含口径问题已修）· CLI ✅（`akasha/tools/density-status.mjs` 可读）· 节奏条密度行 ⏸（h3 重启后应显示——本会话当前密度整轮口径约 15-26，黄区）· loop-watch"同轮去重跨轮各自"待新命中验证。**⑥ 一致性**：安装副本 h2 已核（version+代码）；h3 已装待重启；`family-sweep` 全绿。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-density-first-verify-20261015',
  claim,
  source: { type: '复现', ref: 'hooks.jsonl 首条 density 线（00:21:18Z）· dsh-akasha-session 0.3.5-h3（lib/index.js turnAcc）· selftest 33/33 · r2g 对照（轮7=12666ch）' },
  event_time: '2026-10-15',
  last_reviewed: '2026-10-15',
  tags: ['密度', '监测', '首验', '口径', '插件', '健康'],
});
console.log('已入 canon：' + r.id);
