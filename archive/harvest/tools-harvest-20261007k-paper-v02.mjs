// akasha/tools/harvest-20261007k-paper-v02.mjs
// 2026-10-07 论文 v0.2 留痕：canon-paper-v01 → r1（补 v0.2 说明）。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const cur = currentRecords(loadStore('canon').records).find(r => r.id.startsWith('canon-paper-v01-20261007'));
if (!cur) { console.log('找不到 canon-paper-v01 条'); }
else if (cur.claim.includes('v0.2')) { console.log('已修订过，跳过：' + cur.id); }
else {
  const r = revise('canon', cur.id, {
    claim: cur.claim + ' **v0.2（2026-10-07 深夜）**：新增 §1.4「推演现场：关键讨论切片」（六条讨论切片——读写倒挂 / 写烂写僵 / 必定执行 / 不改原文 / 冻结协议 / 纪律入库，润色呈现逻辑的生成现场）＋文末作者注（用户指定原句：「用户是个大懒比；全文由我总结归纳并写成论文」，署名 Little Code Sauce）。版本行改 v0.2 并注明「英文对照仅摘要一节；正文以中文为准」。'
  });
  console.log('已修订：' + cur.id + ' → ' + r.id);
}
