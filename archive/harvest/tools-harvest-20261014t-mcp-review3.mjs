// 2026-10-14：MCP 复审三件（review pack/log/list）代码落地留痕。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-mcp-review3-'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**MCP 复审三件落地（板条 #15；2026-10-14；代码已备、随下次重启进桥）**。',
  '**交付**：`mcp.mjs` 新增三工具——`akasha_review_pack`（复审输入包：链尾全文 + 来源 + 因果/链邻居 + 三问协议；**入剥皮面**、reflect:true 给原文）· `akasha_review_log`（复审留痕写 `logs/review-log.jsonl`，**不写六库**；store/id/verdict 必填）· `akasha_review_list`（留痕读回，limit/since）。工具面 **18→21**。',
  '**验证**：独立探针（`tools/mcp-probe.mjs`，新进程即新代码）实调通过——review_list 返回现存 6 行（含今日合并/退役行）；review_pack 返回完整输入包。**write 侧不写测试行**（防污染真审计线——沿用今晨教训），只读码核 + 与 CLI 同源（`appendReviewLog`）。',
  '**边界**：桥是宿主启动时 spawn 的长驻子进程 ⇒ **重启前真模型面仍 18 工具**；`akasha_sleep_apply` 类**写库执行不上面**（保留 CLI 人工路径）。**待重启同步**：AGENTS §6「18 工具」→21（重启核验时改，配 pre 快照）。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-mcp-review3-20261014',
  claim,
  source: { type: '复现', ref: 'mcp.mjs（3 工具 + STRIP_TOOLS 扩 review_pack）· tools/mcp-probe.mjs 实调两件 · appendReviewLog 同源' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['MCP', '复审', '工具面', '落地'],
});
console.log('已入 canon：' + r.id);
