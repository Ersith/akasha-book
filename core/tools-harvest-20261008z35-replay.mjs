// akasha/tools/harvest-20261008z35-replay.mjs
// 2026-10-08 留痕：wave2/replay 历史回放（只读）双落地。幂等。
import { loadStore, currentRecords, revise } from '../lib.mjs';

const tips = currentRecords(loadStore('canon').records);
const oss = tips.find((r) => r.id.startsWith('canon-oss-package-20261007'));
if (!oss) { console.log('未找到 oss 链尾'); process.exit(1); }
if (oss.claim.includes('wave2/replay')) { console.log('已含，跳过：' + oss.id); process.exit(0); }
const r = revise('canon', oss.id, {
  claim: oss.claim +
    ' **外援 wave2/replay 上线（2026-10-08 深夜）**：`sleep --replay`（只读）——复用 plan 规则算拟操作 + 同日志跑 B2 召回统计；验收口径 misses Δ≤0；附「幸存者偏差」对照（adopted:false）把错误口径摆明。OSS `f35edf0→27fafe7`（am 血缘 `f25cfd0`；all.diff 树 `929bb73` 一致）；活树三方合并 5 文件零冲突；两端 **120/120** + 插件全绿；真库冒烟 Δ0 + 默认零落盘。细则 CHECKS **R18**。观察期后第一件 = 排序补齐（严重度/复杂度乘子）。'
});
console.log('已修订：' + oss.id + ' → ' + r.id);
