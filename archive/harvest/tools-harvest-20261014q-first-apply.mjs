// 2026-10-14：首批睡眠合并执行 + 复检三修留痕（修订 canon-sleep-apply-20261014）。幂等：判据＝单一常量。
import { loadStore, currentRecords, revise } from './lib.mjs';
const MARK = 'FIRST-APPLY-20261014';
const rec = currentRecords(loadStore('canon').records).find((r) => String(r.id).startsWith('canon-sleep-apply-20261014'));
if (!rec) { console.log('未找到条目'); process.exit(1); }
if (String(rec.claim).includes(MARK)) console.log('= 已存在');
else {
  const tail = ' **【复检+首批执行·[FIRST-APPLY-20261014]】**（用户令「先老规矩方式复检，ok 了再首批执行」）：' +
    '**人工复检（不靠套件）又捉 3 洞 + 复跑再掀 2 洞，全修**：① 回执被 `--force` 重跑覆盖会丢墓碑（⇒ `--revoke` 失去依据）→ 改**回执合并**（保墓碑 + firstAppliedAt）；② `revokeRetire` 按原 id 找墓碑会**先命中已撤的那枚** → 改优先活墓碑；③ keep 离当前集仍会退役 absorb → 加 `refused-keep-missing` 拒；④ 豁免判定被新守卫抢先（协议条不在库也须先拒）→ 调序；⑤ **撤销后再退役静默 no-op**（already 判定不看 revokes —— `revoke→再 apply` 循环会断）→ already 判定忽略已撤墓碑 + 再退役落新墓碑 `-retired-2`（不撞 id）。**检测脚本同步**：+1 复检守卫块（回执合并/活墓碑/keep 离集）；主套件 **232→233**。**人工目检**：夹具原始行全程目验（keep 逐字等同、墓碑/撤销元数据形状、当前集往返）。' +
    '**首批执行（真库）**：计划 `plan-cba6876685835731`——**merge keep `paper-v0.4` ← absorb `paper-v0.3`（R4 代际生效）＋ discard×3**（ctx-efficiency-20261008 / handcheck-20261011sr / npm-publish-20261010-r1）；**退役 4 / 跳过 0 / 拒绝 0**；keep 行**逐字等同**；四墓碑形状复核全对（1× merged-into + 3× snapshot-superseded）；review-log 4 行（合并×1、退役×3）；回执 `logs/sleep-apply-plan-cba6876685835731.json`（basisOk）。**指纹守卫活体立功**：首试因计划生成后库又被写（canon 条目）被正确拒 → 重生成计划后执行。' +
    '**执行后核验**：`check` OK（canon 720/720 全行含墓碑）· 检索面效果正确（被并条「已退役 · merged-into … · 历史仍在」）· canon 当前集 **362→358** · K3 行联动（复审线 5：修正1/合并1/退役3；退役 17）· 主套件 **233/233** · family-sweep 全绿 · health-check **51/51** · 快照 `canon:42ec0d8ddc52`。' +
    '**回滚备好未用**：`sleep --revoke plan-cba6876685835731 --yes`（回执在；撤销验收已在夹具完成，真库不做往返以免历史噪声）。';
  const r = revise('canon', rec.id, { claim: String(rec.claim) + tail, last_reviewed: '2026-10-14' });
  console.log('已补：' + rec.id + ' → ' + r.id);
}
