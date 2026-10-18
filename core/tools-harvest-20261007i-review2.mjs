// akasha/tools/harvest-20261007i-review2.mjs
// 2026-10-07 第六批留痕：复查第二轮记录——把「六项补齐后复查」的捕获并入 canon-akasha-review-round-20261007（追加 r2）。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const cur = currentRecords(loadStore('canon').records).find(r => r.id.startsWith('canon-akasha-review-round-20261007'));
const MARK = '**第二轮复查（六项补齐后，2026-10-07 晚）**';
if (!cur) { console.log('找不到 review-round 条'); }
else if (cur.claim.includes(MARK)) { console.log('已并入过，跳过：' + cur.id); }
else {
  const add = ' **第二轮复查（六项补齐后，2026-10-07 晚）**：捕获 ① `matchScore` 子词回退可累计 ≥1——「≥1 ⟺ 整词命中」的口径承诺被静默突破（同一 bigram 出现 4+ 次即越线）→ **封顶 0.9 修复** + 不变式断言入测试（治本：测试不再依赖「库里没有某词」）；② akasha README 两处工具面残留（十三→十六，L13/L63）→ 修复并复扫为零。举一反三类别新增：**「口径承诺必须被实现强制」**（文档承诺的 ≤ / ⟺ / 一律，须有实现层保证 + 回归断言）。';
  const r = revise('canon', cur.id, { claim: cur.claim + add });
  console.log('已修订：' + cur.id + ' → ' + r.id);
}
