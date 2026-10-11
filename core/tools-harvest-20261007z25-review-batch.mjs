// akasha/tools/harvest-20261007z25-review-batch.mjs
// 2026-10-07 留痕：当晚变更批「两遍+举一反三」复检记录 → 交付链。幂等。
import { loadStore, revise, currentRecords } from '../lib.mjs';

const APPENDIX =
  ' **复检批（2026-10-07 深夜，「两遍+举一反三」）**：F1 统计口径（`--undated` 并入时 `stats.undated` 归零）→ 修 + 数据无关不变式断言；F2 非 ASCII 外发编码举一反三 → 抓到 **Release v0.1.0 名称/正文同款乱码**并 UTF-8 重写（API 写入面 description/release name/release body 三处全清、零乱码复核）；F3 数据依赖断言（示例库 undated=0 挂测）→ 改 JSON 一致性断言。同类扫描两轮：统计口径无第三例、插件 source==installed sha256 一致、README 77→82 与 SCHEMA 措辞同步、z19–z24 幂等全跳过。终态：双套件 **82/82 × 2**、OSS `b197ca2`。';

const tips = currentRecords(loadStore('canon').records);
const tip = tips.find((r) => r.id.startsWith('canon-external-eval-delivery-20261007'));
if (!tip) { console.log('未找到交付链尾'); process.exit(1); }
if (tip.claim.includes('复检批（2026-10-07 深夜')) { console.log('已含复检段，跳过：' + tip.id); process.exit(0); }
const r = revise('canon', tip.id, { claim: tip.claim + APPENDIX });
console.log('已修订：' + tip.id + ' → ' + r.id);
