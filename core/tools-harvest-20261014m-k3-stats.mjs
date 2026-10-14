// akasha/tools/harvest-20261014m-k3-stats.mjs
// 2026-10-14：K3 可复查/可修订·实际使用计数落地。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
const MARK = 'K3-STATS-20261014';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-k3-stats-'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**K3 落地：可复查/可修订·实际使用计数（板条 K3，2026-10-14；标记 [' + MARK + ']）**。',
  '**交付**：① `lib.revisabilityStats(opts)`（只读、只报数、不裁决）——四路：**复审线**（review-log 行数/按结论分类/最近一次）· **退役墓碑**（retiredIds 计数，附分库）· **近 7 天修订版**（supersedes 记录按 logged_at 计）· **矛盾检测实际调用**（query-log 侧线 cmd=conflict）。② **metrics 集成**（返回体加 `revisability`，`opts.files/reviewLog/queryLog/today` 可注入③）；③ **CLI 一行**：「回看-纠正（K3）：复审线 … · 退役 … · 近 7 天修订 … · 矛盾检测调用 …（窗口注）」。',
  '**接线**：`conflictReport` 起计 `recordQuery({cmd:\'conflict\'})`——实证：跑一次 conflict → query-log 落线 → K3 行「调用 1 次」。',
  '**活体读数（2026-10-14）**：复审线 **1**（修正×1）· 退役 **13** · 近 7 天修订 **391 版**（库龄短，近乎全量在窗内——窗口数要按此读）· 矛盾检测 **自接线起计**。',
  '**边界（如实）**：矛盾检测计数**只自接线起**（2026-10-13 侧线启用前的历史调用无处可查）；复审线历史完整（review-log 自 10-14 首条起）；**MCP 侧 `akasha_metrics` 带出新字段须下次重启**（桥为宿主子进程）。',
  '**验收**：主套件 **227→228**（+1 用例：四路计数夹具注入 + metrics 集成断言；首跑即抓出「未注入的库回落真库数据」的夹具疏漏——已改六库全注入）。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-k3-stats-20261014',
  claim,
  source: { type: '复现', ref: 'lib.revisabilityStats + metrics 集成 + CLI 行 + conflict 接线（query-log 实证）· test 228/228 · 活体 metrics 读数' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['K3', '可复查', '计数', 'metrics', '落地'],
});
console.log('已入 canon：' + r.id);
