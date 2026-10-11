// akasha/tools/harvest-20261007z11-live-closure.mjs
// 2026-10-07 留痕：同族修复批的活体闭环验收 → spin 链 r8。幂等。
import { loadStore, revise, currentRecords } from '../lib.mjs';

const APPENDIX =
  ' **活体闭环验收（重启后，2026-10-07 11:57Z）**：① hooks 1.2.0——**usage 首线诞生**（11:58:15，`ids:["canon-akasha-usage-r20"]`，eventType assistant/message）＝「条目级使用计数」自上线以来**第一次真正产出数据**（此前恒 0）；output-audit 真零（无编造引用——死路零已证伪）。② gate 1.2.0——箭头命令活体放行（`gate 1.2.0 live ok`）。③ session 0.2.3——重启后 loop-watch **零新增**（对照：修复前同类输出几分钟内攒 3 条 FP）。④ sleep 1.5.1 armed 在位。待观仅剩 session-compact（等首次压缩，信号已挂真值）。';

const tips = currentRecords(loadStore('canon').records);
const tip = tips.find((r) => r.id.startsWith('canon-spin-loop-frontier-20261007'));
if (!tip) { console.log('未找到 spin 链尾'); process.exit(1); }
if (tip.claim.includes('活体闭环验收（重启后')) { console.log('已含验收段，跳过：' + tip.id); process.exit(0); }
const r = revise('canon', tip.id, { claim: tip.claim + APPENDIX });
console.log('已修订：' + tip.id + ' → ' + r.id);
