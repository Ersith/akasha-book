// akasha/tools/harvest-20261007z23-plugin024-live.mjs
// 2026-10-07 留痕：0.2.4 活体落线（lagMs 首线）→ session-usage 链。幂等。
import { loadStore, revise, currentRecords } from '../lib.mjs';

const APPENDIX =
  ' **0.2.4 活体落线（2026-10-07 14:13:51Z）**：重启后首个 turn-end 索引线即带新字段——`{"trigger":"turn-end","turn":58,"added":22,"ms":827,"lagMs":7}`：**lagMs=7ms**（事件循环延迟极小）、827ms < 1500ms 阈值（无慢线）。预测-验证闭环（上轮预告「本回合结束后首个索引线即带 lagMs」精确命中），0.2.4 观测面全绿；loop-watch 仍 16 / 零新增。';

const tips = currentRecords(loadStore('canon').records);
const tip = tips.find((r) => r.id.startsWith('canon-session-layer-usage-20261007'));
if (!tip) { console.log('未找到 session-usage 链尾'); process.exit(1); }
if (tip.claim.includes('0.2.4 活体落线')) { console.log('已含落线段，跳过：' + tip.id); process.exit(0); }
const r = revise('canon', tip.id, { claim: tip.claim + APPENDIX });
console.log('已修订：' + tip.id + ' → ' + r.id);
