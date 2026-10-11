// akasha/tools/harvest-20261007z6-loop-watch-fix.mjs
// 2026-10-07 留痕：P0 收口点复核与 F1 修复 → canon spin 链 r3。幂等。
import { loadStore, revise, currentRecords } from '../lib.mjs';

const APPENDIX =
  ' **复核与修复（收口点，2026-10-07）**：0 严重 / **1 重要** —— F1＝流环缓冲饱和（20K 截尾）后节流失明（尾段恰是最该观测区）→ 修：**单调 seen 计数**（物理缓冲与节流解耦）+ 缓冲淘汰优先收工项（F2）+ 计划/CLI 口径回填（F3/F4）；selftest **16→17/17**（新增「饱和后仍检查」用例，红→绿）；重打包 **0.2.1**（restart-required，替换待激活的 0.2.0）。复核确认：干跑红线代码级可证（无 steer/cancel/inject 导入与调用）；记录链六处一致；旁生红（并行会话 frameTruncated 用例跨 node 漂移，v24.21 下静默只回第一帧）已由复核探针精化机制并归其原生线（提示 `orphan-muy0owas`）。';

const tips = currentRecords(loadStore('canon').records);
const tip = tips.find((r) => r.id.startsWith('canon-spin-loop-frontier-20261007'));
if (!tip) { console.log('未找到 canon-spin-loop-frontier 链尾'); process.exit(1); }
if (tip.claim.includes('复核与修复（收口点')) { console.log('已含修复段，跳过：' + tip.id); process.exit(0); }
const r = revise('canon', tip.id, { claim: tip.claim + APPENDIX });
console.log('已修订：' + tip.id + ' → ' + r.id);
