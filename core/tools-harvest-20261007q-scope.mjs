// akasha/tools/harvest-20261007q-scope.mjs
// 2026-10-07 留痕：① canon-oss-package → 再修订（scope 已定）② orphan-muxr1cs2 → r1（复核结论）。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

// ① canon oss 条
{
  const cur = currentRecords(loadStore('canon').records).find(r => r.id.startsWith('canon-oss-package-20261007'));
  if (!cur) { console.log('找不到 oss 条'); }
  else if (cur.claim.includes('scope 已定')) { console.log('oss 已修订过，跳过：' + cur.id); }
  else {
    const r = revise('canon', cur.id, {
      claim: cur.claim + ' **再更新（2026-10-07）**：⑤ **发布 scope 已定：`@akasha-book/{gate,hooks,sleep,mcp}`**（用户裁定「发布时加 scope（如 @akasha-book/gate）」）——标识已全改（4 package.json + 3 cordis.patch.yml + 4 README 标题品牌行 + 根 README / deps.md / CHECKS.md）；⑥ orphan-muxr1cs2 来源查明：另一个会话（session-4bcb1073，06:51Z，经 MCP：3×revise + 1×orphan_add）在 promote 转正 3 条后的复查所写——内容经本会话复核**成立**（见该孤案 r1）。'
    });
    console.log('已修订：' + cur.id + ' → ' + r.id);
  }
}

// ② orphan-muxr1cs2 → r1（复核结论）
{
  const cur = currentRecords(loadStore('orphan').records).find(r => r.id === 'orphan-muxr1cs2');
  if (!cur) { console.log('找不到 orphan-muxr1cs2'); }
  else if (String(cur.observed).includes('复核（2026-10-07，本会话）')) { console.log('已复核过，跳过：' + cur.id); }
  else {
    const r = revise('orphan', cur.id, {
      observed: String(cur.observed) + ' ｜ 复核（2026-10-07，本会话）：**缺陷成立**——lib.mjs:535（totalItems 全批次累加、无消费概念）与 sleep 插件 isWakeNoteworthy（totalItems > 0）同源；promoteInbox（lib.mjs:585+）不回写消费标记。修复方向（待裁）：promote 落 promoted 标记，或 kit 只计未消费批次；修复前症状=待办计数与唤醒条永不退场。',
      hypothesis: '转正后落 promoted 标记（或 kit 只计未消费项、wake 条件随之收敛）；修复前症状=待办计数与提醒永不退场。［复核补充：两处同源确认——修一处即可闭环（kit 口径 + wake 条件都读 totalItems）。］'
    });
    console.log('已修订：' + cur.id + ' → ' + r.id + '（复核结论）');
  }
}
