// akasha/tools/harvest-20261008z31-wave2s1.mjs
// 2026-10-08 留痕：外援 wave2 §1（段升格）双落地。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const tips = currentRecords(loadStore('canon').records);
const oss = tips.find((r) => r.id.startsWith('canon-oss-package-20261007'));
if (!oss) { console.log('未找到 oss 链尾'); process.exit(1); }
if (oss.claim.includes('wave2 §1')) { console.log('已含，跳过：' + oss.id); process.exit(0); }
const r = revise('canon', oss.id, {
  claim: oss.claim +
    ' **外援 wave2 §1 段升格上线（2026-10-08）**：`session promote <segId> --to <store>`（`--to` 必填；默认演练、`--apply` 才写——先六库后标记；仅 `conclusion`/`action`；canon+复现须 `--confirm-replay`；`check` 三向核验且不读 zstd 原档；MCP 无写入口）——OSS `6112951→18e772d`（am 血缘 `941395e`），活树三方合并 6 文件**零冲突**落装；两端 **108/108** + 插件全绿。数字对账：Claude 报 115 系未去重基数（111）+4；本仓复检去重后 = 104+4 = **108**（README/CHECKS 已订正）。细则 CHECKS **R14**。'
});
console.log('已修订：' + oss.id + ' → ' + r.id);
