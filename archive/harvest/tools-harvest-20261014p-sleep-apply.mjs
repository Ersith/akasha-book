// akasha/tools/harvest-20261014p-sleep-apply.mjs
// 2026-10-14：睡眠合并 R4 + apply/revoke（A 档）+ revokes 语义落地记录。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-sleep-apply-'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**睡眠合并落地：R4 keep 按代际 + apply/revoke（A 档）+ revokes 语义（2026-10-14；Master 三裁定：A 档先 / B 档保留待启用 / R4 继续 / 骨架共用各自验收）**。',
  '**交付**：① `sleep.mjs` **R4**：merge（含 frontier duplicate-url）组内 keep 按代际重选——同源两代取最新、真重复取最早、判不了 `keep:null+needsHuman`；换 keep 后 absorb 从全组重算、pairs 证据重算。② **`applyPlan`**：A 档零改写（keep 一字不动；absorb 软退役 `merged-into <keep>`；discard 软退役）；闸门＝默认 dry、basis 指纹复核（过期拒、`--force` 强过）、豁免面（协议条/自我层）拒、needsHuman 拒、幂等（已退役 skip）；审计＝review-log（合并/退役）+ `logs/sleep-apply-<planId>.json` 回执。③ **`revokePlan` + revokes 语义**（SCHEMA §P4 实现）：撤销记录 `{id:<墓碑>-revoked, revokes:<墓碑>}`（元数据、不进当前集）；`currentRecords`/`retiredIds` 认撤销；`appendRecord` 护栏（撤销后即便 allowResurrect 也拒重加同 id）；悬空 `revokes` 由 check 报错。④ CLI：`sleep --apply <planId|文件> [--yes] [--only <id>] [--force]` / `sleep --revoke`；`--replay` 与 apply/revoke 互斥。',
  '**过程自捉两 bug（均修）**：**① keep←keep 自吸收**——换 keep 后 absorb 未排除 keep 自身（计划里出现 `v0-4 ← v0-4`）⇒ 改为从全组重算（现：`v0-4 ← v0-3` ✓）。**② review-log 参数位错**——`file` 误塞进条目对象而非 opts ⇒ 测试审计行写进**真库** review-log（8 行夹具污染）⇒ 修调用点 + 备份后清理（真日志恢复 1 行、备份 `tmp/review-log-backup/`）。',
  '**检测脚本同步**：两处陈旧断言按新契约更新（`--apply 未实现即拒` → `无 --yes = 演练 exit 0`；`replay+apply 报「尚未实现」` → 报「互斥」）。新增 4 块守卫：merge 验收 / discard 验收（各自成块） / R4 三代际判例+端到端 / revokes 护栏。**主套件 230→232**。',
  '**验收**：主套件 **232/232** · family-sweep 全绿 · health-check **51/51** · 真库**演练**（`plan-3c1dbadd2a69aa72`：merge keep v0-4 ← absorb v0-3 + discard×3，指纹干净、退役 0/跳过 0/拒绝 0——**未执行，真库零改动**）。',
  '**留办**：首批真实执行（1 merge + 3 discard）待 Master 点头；**B 档（mergedText 合成版）登记保留、待启用**（用户明示「可能也需要」）；`--keep` 人工指定（治 needsHuman）候选后加。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-sleep-apply-20261014',
  claim,
  source: { type: '复现', ref: 'sleep.mjs applyPlan/revokePlan/R4 · lib revokes（currentRecords/retiredIds/appendRecord 护栏/revokeRetire/check）· 主套件 232/232 · 真库演练 plan-3c1dbadd2a69aa72 · SCHEMA §P4 已标实现 · 草案 §6 已记裁定' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['睡眠合并', 'apply', 'revokes', 'R4', '落地'],
});
console.log('已入 canon：' + r.id);
