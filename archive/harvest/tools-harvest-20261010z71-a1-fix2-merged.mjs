// akasha/tools/harvest-20261010z71-a1-fix2-merged.mjs
// 2026-10-10：A1 豁免 + root-id 修正并入活树；把缺陷条目 canon-a1-id-convention-gap 标为已修。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const gap = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-a1-id-convention-gap'));
if (!gap) { console.log('未找到缺陷条目'); process.exit(0); }
if (gap.claim.includes('已修（2026-10-10）')) { console.log('已标已修，跳过：' + gap.id); process.exit(0); }
const add = ' **已修（2026-10-10，外援两批补丁并入）**：① **root-id 口径**——新增 `rootIdOf()`（剥 `-rN`），用量计数与查表两侧统一按根 id；**活数据实证**：`canon-akasha-usage-r25` count 0→**6**、`canon-address-layers-20261008-r4` 0→**6**、`canon-self-concept-20261008-r2` 0→**4**、非豁免修订条 `front-kv-phase-sensitive-20261007` 0→**3** 且**吃到 over-quota 校正 0.5156**（修订条目终于可被计数、可被罚）。② **豁免扩至自我层**——`isSelfLayerRecord`（id 前缀 canon-(self-concept|address-layers|memory-auto-record) ∪ tag『自我』）→ `self-layer-exempt` 校正恒 1；协议条仍 `protocol-exempt`。验证：两批 `git am` 干净；**双路交叉对树**一致（`b7f8a40b5213c3349a8530ab54c930996e039591`）；核心 130/130（OSS）/ **131/131**（活树）、N20 126+5SKIP、四插件全绿。落地：活树已并（快照 `_rollback-20261010-a1fix2\\`）；OSS `bafa86c`+`88358af`+`6ed3f3e`（CHECKS R25）。';
const next = revise('canon', gap.id, { claim: gap.claim + add, last_reviewed: '2026-10-10' });
console.log('已标已修：' + gap.id + ' → ' + next.id);
