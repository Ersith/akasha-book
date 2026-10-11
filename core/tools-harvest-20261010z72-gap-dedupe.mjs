// akasha/tools/harvest-20261010z72-gap-dedupe.mjs
// 2026-10-10：z71 幂等串不匹配导致"已修"段追加两遍 → 去重。幂等。
import { loadStore, currentRecords, revise } from '../lib.mjs';

const rec = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-a1-id-convention-gap'));
if (!rec) { console.log('未找到条目'); process.exit(0); }
const marker = ' **已修（2026-10-10，外援两批补丁并入）**';
const parts = rec.claim.split(marker);
if (parts.length <= 2) { console.log('无需去重（出现 ' + (parts.length - 1) + ' 次）：' + rec.id); process.exit(0); }
const next = revise('canon', rec.id, { claim: parts[0] + marker + parts[1], last_reviewed: '2026-10-10' });
console.log('已去重：' + rec.id + '（' + (parts.length - 1) + ' 份 → 1 份）→ ' + next.id);
