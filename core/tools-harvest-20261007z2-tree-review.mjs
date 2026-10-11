// akasha/tools/harvest-20261007z2-tree-review.mjs
// 2026-10-07 留痕：会话层 v0.2 终局复核结论 → 追加进 canon-session-tree-v02 条（修订链）。幂等。
import { loadStore, revise, currentRecords } from '../lib.mjs';

const APPENDIX =
  ' **终局复核（2026-10-07，fork 只读换角度）**：0 严重 / 1 重要 / 5 次要+提示——F1【重要】跨会话节点检索被「全局最新代」遮挡（无 --session 时旧代会话节点静默全丢，主路径中招）→ 红（["sB"]）→绿（genBy 按会话分代）→真库复验（苦力怕 → node-f362b992-L1-1817 命中 13.9）、套件 73/73；F2 kind×level 交互未明示 / F3 巨块节点 ~16KB / F4 全 null-turn 单块无测试 / F5 同毫秒并发重建竞态 / F6 保真报告口径注（已补）——前四项记账延后。复核确认：红→绿真证据、文档同步五处口径一致、插件零改动（mtime 佐证）、六库 check 全绿。';

const tips = currentRecords(loadStore('canon').records);
const tip = tips.find((r) => r.id.startsWith('canon-session-tree-v02-20261007'));
if (!tip) { console.log('未找到 canon-session-tree-v02 链尾'); process.exit(1); }
if (tip.claim.includes('终局复核（2026-10-07')) { console.log('已含复核段，跳过：' + tip.id); process.exit(0); }
const r = revise('canon', tip.id, { claim: tip.claim + APPENDIX });
console.log('已修订：' + tip.id + ' → ' + r.id);
