// akasha/tools/harvest-20261008z38-dedup-fix.mjs
// 2026-10-08 去重更正：r16/r17 重复追加了同一段「tarball 恢复」说明 → r18 去重并留痕。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const APP_MARK = 'hooks tarball 端点已恢复';
const tips = currentRecords(loadStore('canon').records);
const oss = tips.find((r) => r.id.startsWith('canon-oss-package-20261007'));
if (!oss) { console.log('未找到 oss 链尾'); process.exit(1); }
if (oss.claim.includes('已在 r18 去重')) { console.log('已去重，跳过：' + oss.id); process.exit(0); }

const claim = oss.claim;
const idxs = [];
let from = 0;
for (;;) { const i = claim.indexOf(APP_MARK, from); if (i < 0) break; idxs.push(i); from = i + 1; }
console.log('链尾 ' + oss.id + ' 中该段出现 ' + idxs.length + ' 次');

let next;
if (idxs.length >= 2) {
  // 保留最后一次出现（含其到段尾），删掉之前的所有出现
  const last = idxs[idxs.length - 1];
  const head = claim.slice(0, idxs[0]);
  const tail = claim.slice(last);
  next = head + tail + ' **更正（去重）**：上一条重复追加了同一段说明，已在 r18 去重。';
} else {
  next = claim + ' **更正（去重）**：该段本就只出现一次，无需去重（守卫纠正留痕）。';
}
const r = revise('canon', oss.id, { claim: next });
console.log('已修订：' + oss.id + ' → ' + r.id);
