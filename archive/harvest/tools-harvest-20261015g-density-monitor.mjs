// akasha/tools/harvest-20261015g-density-monitor.mjs —— 格式密度监测落地留痕
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-density-monitor-20261015'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**格式密度监测落地（2026-10-15；用户令「可以。搞吧」）**——把三轮归因的产物做成常驻观测：密度先行指标从"离线分析"变成"每轮可见"。',
  '**① 用户裁定（同日）**：**治本方法先记着**（不立即做行为层实验）；先把**监测**落地。**② 实装**：`@akasha-book/akasha-session` **0.3.4-h2 → 0.3.5-h1**（restart-required）——每 turn 结束累计本回合 reasoning+text 的字符与 `**` 匹配数，推进**近 10 轮滚动窗口**；**节奏条**（`akasha:session` 注入行）追加一行：`📊 格式密度 X/千字（档区 · 近 N 轮）｜分级：黄≥15 橙≥40 红≥120｜高位时降格式负载：少用加粗、多用分段与编号`；hooks 落 `density` 线（rate/tag/chars/bold/rounds）。',
  '**③ 分档（初值，可校准）**：绿 <15 · 黄 15-40 · 橙 40-120 · 红 >120（依据＝全库 70 会话归因：峰值>190 的两个会话是唯二失稳会话；>40 失衡出现）。**④ 自指防护（关键设计）**：密度观测行**自身不含任何加粗标记**（selftest 有哨兵断言）——观测行不得喂密度；窗口 <2000 字符静默（样本不足不显示）。',
  '**⑤ 查询**：`node akasha/tools/density-status.mjs`（读 hooks 的 density 线；显示最近条目 + 各会话最新档 + 峰值；无数据时明确提示"重启后才有"并给出历史口径脚本）。**⑥ 验收**：selftest **32/32**（新增 3 组断言：densityTag 四档边界 14.9/15/39.9/40/119.9/120 · 渲染行含档位与样本门槛 · 端到端 rate=20.0 落线）；`node --check` 通过；`npm pack` 5 文件；`install_bundle` 返回 **restart-required**；`family-sweep --quiet` **全绿**。',
  '**⑦ 语义**：这是**观测**不是**干预**——不改变任何行为、不自动动作；它是"我每轮能看见自己的密度档位"的窗口（黄区自我提醒降格式负载，橙红区考虑交接）。**与 P0/P1 的关系**：与循环观测并行（loop-watch 看"重复"，density 看"格式负载"），互不依赖。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-density-monitor-20261015',
  claim,
  source: { type: '复现', ref: 'dsh-akasha-session 0.3.5-h1（lib/index.js densityTag/updateDensity/renderSessionLine）· selftest 32/32 · akasha/tools/density-status.mjs · npm pack + install_bundle 实录' },
  event_time: '2026-10-15',
  last_reviewed: '2026-10-15',
  tags: ['退化', '密度', '监测', '插件', '观测', '健康'],
});
console.log('已入 canon：' + r.id);
