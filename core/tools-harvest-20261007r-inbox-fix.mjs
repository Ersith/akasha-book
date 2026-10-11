// akasha/tools/harvest-20261007r-inbox-fix.mjs
// 2026-10-07 留痕：orphan-muxr1cs2 → r2（inbox 消费记账修复完成）。幂等。
import { loadStore, currentRecords, revise } from '../lib.mjs';

const cur = currentRecords(loadStore('orphan').records).find(r => r.id.startsWith('orphan-muxr1cs2'));
if (!cur) console.log('找不到 orphan-muxr1cs2（current）');
else if (String(cur.observed).includes('已修复（2026-10-07')) console.log('已修过，跳过：' + cur.id);
else {
  const r = revise('orphan', cur.id, {
    observed: String(cur.observed) + ' ｜ **已修复（2026-10-07，用户裁定「这种明显bug还是得处理下」）**：lib.mjs 两处——① `promoteInbox` 处理过候选（转正或跳过）后追加 `kind:"consumed"` 行（含 `upTo`＝处理时读入的行数、`count` / `skipped`）；② `kit` 的待办计数只统计最后一条 `consumed.upTo` 之后的批次（`batches` 同步改为「未消费批次数」）。验证：新增测试「inbox 消费记账」（消费→归零→新批次重新计入→再消费归零）——主库 **58/58**、staging（开源包）**58/58**、三插件 selftest 全绿；**真库实测**：promote（跳过 4）后 `kit` 从「inbox：2 批 / 4 条」→「**0 批 / 0 条**」。唤醒条条件（`totalItems > 0`）随之闭环——休眠中的插件进程待下次重启载入新 `lib`（与 v1.5/v1.1 插件同批）。SCHEMA.md（主库 + 开源包）已同步「消费记账」说明。'
  });
  console.log('已修订：' + cur.id + ' → ' + r.id + '（修复记录）');
}
