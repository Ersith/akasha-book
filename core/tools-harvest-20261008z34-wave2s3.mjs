// akasha/tools/harvest-20261008z34-wave2s3.mjs
// 2026-10-08 留痕：wave2 §2.2（MCP 只读 plan）+ §3（可信度分档）双落地。幂等。
import { loadStore, currentRecords, revise } from '../lib.mjs';

const tips = currentRecords(loadStore('canon').records);
const oss = tips.find((r) => r.id.startsWith('canon-oss-package-20261007'));
if (!oss) { console.log('未找到 oss 链尾'); process.exit(1); }
if (oss.claim.includes('wave2 §2.2')) { console.log('已含，跳过：' + oss.id); process.exit(0); }
const r = revise('canon', oss.id, {
  claim: oss.claim +
    ' **外援 wave2 §2.2+§3 上线（2026-10-08 晚）**：① MCP 第 18 工具 `akasha_sleep_plan`（只读，零落盘）；② 可信度五档（复现 1.0 / 实验 0.9 / 官方 0.8 / 他人 0.65 / 共识 0.5）+ 链上 `verification` 改层 + `refute` 零权重默认隐藏（`--include-refuted`）；系数只进排序、strong 不变；过期仅降展示档。OSS `d45ee95→ea0379e`（am 血缘 `9c39d12`；all.diff 树 `348d617` 一致）；活树三方合并 6 文件零冲突；两端 **117/117** + 插件全绿。细则 CHECKS **R17**。'
});
console.log('已修订：' + oss.id + ' → ' + r.id);
