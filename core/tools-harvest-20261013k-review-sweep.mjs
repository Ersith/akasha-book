// akasha/tools/harvest-20261013k-review-sweep.mjs
// 2026-10-13 深夜：举一反三收尾——用法条同步（剥皮面清单 + 阈值标定）。受控路径。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const cur = () => currentRecords(loadStore('canon').records);
const usage = cur().find((r) => r.id === 'canon-akasha-usage' || r.id.startsWith('canon-akasha-usage-r'));
if (!usage) { console.log('未找到用法条'); process.exit(1); }
if (usage.claim.includes('㉔ 体裁隔离 P0（2026-10-13，批次 2 首项）· 修订 r31')) console.log('= 已同步，跳过');
else {
  const r = revise('canon', usage.id, {
    claim: usage.claim +
      '\n**㉔ 体裁隔离 P0（2026-10-13，批次 2 首项）· 修订 r31（举一反三收尾）**：**读侧剥皮面＝CLI `lookup`/`brief`/`show`/`cross`/`mirror match` ＋ MCP `akasha_lookup`/`brief`/`show`/`session_lookup`/`cross`/`mirror_match`（六读工具）**；**过程段默认不回放**（只报「存在 N 段」+ 指引）；**反思通道**：CLI `--reflect`（各读命令）与 `session lookup --raw-process`；MCP `reflect:true` / `rawProcess:true`。**仍未剥（登记在案）**：`summary`（≤6×160 字）· `kit.history`（≤3×100 字）· `frontier_due`（题名/主题，短）· `conflict`/`diff`（诊断对照）· `sleep_plan`（why 串）。**剂量闸标定**：长会话自判阈值 **2000 段**（案发会话 2179 段须被覆盖——原 3000 会漏）。库内原文一字不动。',
    last_reviewed: '2026-10-13'
  }, { allowProtocol: true });
  console.log('已修订：' + usage.id + ' → ' + r.id);
}
