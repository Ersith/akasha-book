// akasha/tools/harvest-20261007w-show-wording.mjs
// 2026-10-07 留痕：F3 文案修正——usage ⑯「show 旧版本语义」措辞消歧（修订链）。幂等。
import { loadStore, revise } from '../lib.mjs';

const records = loadStore('canon').records;
const tip = (() => {
  const byId = new Map(records.map((r) => [r.id, r]));
  let cur = byId.get('canon-akasha-usage');
  if (!cur) return null;
  for (;;) {
    const next = records.find((r) => r.supersedes === cur.id);
    if (!next) break;
    cur = next;
  }
  return cur;
})();
if (!tip) {
  console.log('未找到 canon-akasha-usage');
  process.exit(1);
}
if (tip.claim.includes('不会自动跳转')) {
  console.log('已含修正后措辞，跳过：' + tip.id);
  process.exit(0);
}
const m = tip.claim.match(/（跨六库[^）]*）/);
if (!m) {
  console.log('未找到 ⑯ 括号段，人工检查。');
  process.exit(1);
}
const NEW = '（跨六库）。命中**旧版本**时：返回的是**所查版本全文**，并附注「当前版本：<新 id>」——要读新版，用附注里的 id 再 show 一次（**不会自动跳转**）';
console.log('替换前：' + m[0]);
const r = revise('canon', tip.id, { claim: tip.claim.replace(m[0], NEW) });
console.log('已修订：' + tip.id + ' → ' + r.id);
