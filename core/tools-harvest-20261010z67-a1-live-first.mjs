// akasha/tools/harvest-20261010z67-a1-live-first.mjs
// 2026-10-10：A1 首次活体生效记录（修正"现库休眠"表述）。幂等。
import { loadStore, currentRecords, revise } from '../lib.mjs';

const rec = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-rank-a1-loadbalance'));
if (!rec) { console.log('未找到条目'); process.exit(0); }
if (rec.claim.includes('首次活体生效')) { console.log('已记录，跳过：' + rec.id); process.exit(0); }
const add = ' **首次活体生效（2026-10-10 重启后复验，修正上文"现库休眠"的表述）**：同一次检查里 `front-qwen-id-balancing-2026` 被判 **over-quota** —— 7 天窗口内引用 2 次 > 配额 1.2609（error 0.7391）→ 校正 **0.6304**（damp 公式命中），rank 由 score 2.9 降到 **1.8282**。即：上述"校正全为 1.000"只是**当时那一刻**的读数（用量未过阈值），机制本身**随即在真实检索里生效**。孤案侧口径同步确认：`factorApplied:false` 且 `balance{enabled:false, correction:1}`（一眼可辨"未乘"）。';
const next = revise('canon', rec.id, { claim: rec.claim + add, last_reviewed: '2026-10-10' });
console.log('已修订：' + rec.id + ' → ' + next.id);
