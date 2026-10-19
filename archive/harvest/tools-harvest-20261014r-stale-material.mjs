// 2026-10-14：stale×排序折扣裁定材料交付留痕。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-stale-discount-'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**stale×排序折扣裁定材料交付（板条；2026-10-14；只出材料零改动）**：`research/stale-ranking-discount-decision-20261014.md`。',
  '**关键澄清（材料核心，定位到代码）**：「stale 检测＋显示降档」**早已存在**（`credibilityOf`：snapshot 90d / evergreen 180d / frontier next_review；`displayTier=stale?dropTier:tier`＋「待复核」标签），但**排序权重不动**（`rankFactors.weight` 用**原 tier**）；⇒ 真实决策点只有一处：**`weight` 要不要改用 `displayTier`（或另设 stale 乘子）**。',
  '**今日数据（为何无信号）**：`audit --due` 扫描 433 · **到期 0** · 无日期锚 15；I-15 衰减建议 **0**（库龄 <30d ⇒ **结构性 0**，非「一切健康」）。无论选哪项今天都改不了任何一次排序。',
  '**三选项**：A 维持（显示降级已够；stale≠不可信——钉的是「据」不是「龄」）· B 温和折扣（weight 用 displayTier，风险：过期但高频引用者被持续压低）· C 双条件折扣（**stale ∧ 零引用 ∧ 无链验证**，与 I-15 同构，唯一同时有衰减语义与证据条件的形态）。**推荐：A 先 ＋ 立重议判据**——due/decay 首次非零时记录「stale 且被引用」vs「stale 且零引用」两数；后者多 ⇒ 支持 C。若届时采纳 B/C：走既有**排序因子观察期**制度（开关默认关→影子对照→定默认；只进排序、不改可见性与当前集），实现落点与测试预置已写进材料 §6。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-stale-discount-material-20261014',
  claim,
  source: { type: '复现', ref: 'research/stale-ranking-discount-decision-20261014.md · lib.mjs credibilityOf/rankFactors/CRED_DEFAULTS · audit --due（到期 0）· audit（decay 0）' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['排序', 'stale', '裁定材料', '材料'],
});
console.log('已入 canon：' + r.id);
