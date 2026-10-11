// akasha/tools/harvest-20261007z21-date-pairing.mjs
// 2026-10-07 留痕：日期三分/报告 + 跨批配对修复 → usage 主条 + session-usage 链。幂等。
import { loadStore, revise, currentRecords } from '../lib.mjs';

const MAIN_APPENDIX =
  ' **日期三分与报告（2026-10-07 晚）**：`lookup` / `brief` / `cross` 带 `--since/--until` 时**默认提示**「另有 N 条日期未知（例 ≤3）/ M 条范围外排除」——**未知 ≠ 该时段没有**（143/215 条历史无戳，如实三分、不补「今天」）；`lookup --report/--undated`、MCP `akasha_lookup` 增 `report:true/undated:true`（返回 `{hits, stats}`，含样本与 timeSource 计数）；日期参数非法即拒（ISO 按 UTC 归一；event_time 优先、logged_at 回退）。';

const SESSION_APPENDIX =
  ' **跨批配对与视图归并（2026-10-07 晚）**：`extractSegments` 配对改为**全量记录**维护（`emitFrom` 只控产出）——修复「中途定时索引切批」造成的调用/结果分属两批漏配（真库 8 条已成一案：结果就在 seq+1）；`session index --full` 一次性重建（真库 +61/+1 段，8 条全部补完成版）；默认读取**按 call 归并只回完成版**（`collapseActionVersions`；`--all` 看历史版本）。';

function bump(prefix, appendix, guard) {
  const tip = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith(prefix));
  if (!tip) { console.log('未找到链尾：' + prefix); return; }
  if (tip.claim.includes(guard)) { console.log('已含目标段，跳过：' + tip.id); return; }
  const r = revise('canon', tip.id, { claim: tip.claim + appendix });
  console.log('已修订：' + tip.id + ' → ' + r.id);
}

bump('canon-akasha-usage', MAIN_APPENDIX, '日期三分与报告（2026-10-07 晚）');
bump('canon-session-layer-usage-20261007', SESSION_APPENDIX, '跨批配对与视图归并（2026-10-07 晚）');
