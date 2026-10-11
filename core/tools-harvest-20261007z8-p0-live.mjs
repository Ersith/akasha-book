// akasha/tools/harvest-20261007z8-p0-live.mjs
// 2026-10-07 留痕：P0 重启后首验通过（观测面正式存活）→ canon spin 链 r5。幂等。
import { loadStore, revise, currentRecords } from '../lib.mjs';

const APPENDIX =
  ' **重启首验通过（2026-10-07 11:30Z，观测面正式存活）**：0.2.2 激活（pid 33872）；`agent/assistant-stream` 帧序 **8/8 收全**——start、chunk/block-start、chunk/reasoning-delta、chunk/block-end、chunk/text-delta、chunk/tool-call-delta、chunk/usage、chunk/finish（探针满额即停＝设计上限；未来新帧型不再记录属已知边界）；turn 环随 `turn-end` 跑通（turn 36，+70 段）；命中 0（正常——观测期自此开始）。**P0 完成：从「装好了」到「验证活了」。**';

const tips = currentRecords(loadStore('canon').records);
const tip = tips.find((r) => r.id.startsWith('canon-spin-loop-frontier-20261007'));
if (!tip) { console.log('未找到 canon-spin-loop-frontier 链尾'); process.exit(1); }
if (tip.claim.includes('重启首验通过（2026-10-07 11:30Z')) { console.log('已含首验段，跳过：' + tip.id); process.exit(0); }
const r = revise('canon', tip.id, { claim: tip.claim + APPENDIX });
console.log('已修订：' + tip.id + ' → ' + r.id);
