// akasha/tools/harvest-20261010z58-dedupe-rea-shim-claim.mjs
// 2026-10-10：清理 canon-mcp-rea-shim 链尾的重复段落（z57 双跑所致）。幂等，走修订链。
import { loadStore, currentRecords, revise } from './lib.mjs';

const rec = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-mcp-rea-shim'));
if (!rec) { console.log('未找到条目'); process.exit(0); }
const marker = '**工具面扩到 20';
const first = rec.claim.indexOf(marker);
const second = first >= 0 ? rec.claim.indexOf(marker, first + 1) : -1;
if (second < 0) { console.log('无重复，跳过：' + rec.id); process.exit(0); }
const cleaned = rec.claim.slice(0, second).trimEnd();
const next = revise('canon', rec.id, { claim: cleaned, last_reviewed: '2026-10-10' });
console.log('已清理重复段：' + rec.id + ' → ' + next.id);
