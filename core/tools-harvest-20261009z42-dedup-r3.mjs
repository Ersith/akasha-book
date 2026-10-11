// akasha/tools/harvest-20261009z42-dedup-r3.mjs
// 2026-10-09 去重：r1/r2 重复追加同一段「补充」→ r3 单份并留痕。守卫用追加文本原句。幂等。
import { loadStore, currentRecords, revise } from '../lib.mjs';

const MARK = '**补充（用户裁定 2026-10-09）**';
const tips = currentRecords(loadStore('canon').records);
const rec = tips.find((r) => r.id.startsWith('canon-social-learning-v1'));
if (!rec) { console.log('未找到'); process.exit(1); }
const claim = rec.claim;
if (claim.includes('已在 r3 去重')) { console.log('已去重，跳过：' + rec.id); process.exit(0); }

const idxs = [];
let from = 0;
for (;;) { const i = claim.indexOf(MARK, from); if (i < 0) break; idxs.push(i); from = i + 1; }
console.log('链尾 ' + rec.id + '：该段出现 ' + idxs.length + ' 次');
if (idxs.length < 2) { console.log('无需去重（单份）'); process.exit(0); }

const head = claim.slice(0, idxs[0]);
const last = idxs[idxs.length - 1];
const tail = claim.slice(last);
const next = head + tail + ' **更正（去重 r3）**：上一条重复追加了同一段「补充」，已在 r3 去重。';
const r = revise('canon', rec.id, { claim: next, last_reviewed: '2026-10-09' });
console.log('已修订：' + rec.id + ' → ' + r.id);
