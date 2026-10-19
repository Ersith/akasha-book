// akasha/tools/harvest-20261010z69-a1-dedupe.mjs
// 2026-10-10：z68 幂等串写错导致同一段观察追加两遍 → 去重（保留一份）。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const rec = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-rank-a1-loadbalance'));
if (!rec) { console.log('未找到条目'); process.exit(0); }
const marker = ' **设计观察（开启 A1 前需裁定；2026-10-10 活体读数）**';
const parts = rec.claim.split(marker);
if (parts.length <= 2) { console.log('无需去重（出现 ' + (parts.length - 1) + ' 次）：' + rec.id); process.exit(0); }
const deduped = parts[0] + marker + parts[1];
const next = revise('canon', rec.id, { claim: deduped, last_reviewed: '2026-10-10' });
console.log('已去重：' + rec.id + '（' + (parts.length - 1) + ' 份 → 1 份）→ ' + next.id);
