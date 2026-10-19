// akasha/tools/harvest-20261007z19-loopwatch-split-tooling.mjs
// 2026-10-07 留痕：loopwatch 修复前/后分组 + 树刷新 → session-usage 链；venv 重建工具 → world-sim 条。幂等。
import { loadStore, revise, currentRecords } from './lib.mjs';

const SESSION_APPENDIX =
  ' **显示升级（2026-10-07 晚）**：`session loopwatch` 汇总改为**修复前/后分组**显示（`LOOP_WATCH_P0_FIXED_AT = 2026-10-07T11:57:00Z`；早于此的命中＝punct 误报历史残迹）——活体显示「命中 16 条 · **修复前残迹 16 / 修复后新增 0**」，旧留痕自此每次读取自带标注（append-only 保留原行）。同轮：弧线树再刷新（9 节点 / 2524 段），回归断言入双套件（78/78 × 2；OSS `c7ca15f`）。';

const WORLDSIM_APPENDIX =
  ' **重建工具上线（2026-10-07 晚）**：`tools\\dsh-blender-analysis-setup.cmd`——一键/双击重建分析 venv（纯 ASCII 0 字节实测、幂等复跑通过；说明见同名 .md）。重装 dsh-blender 后跑它即可恢复 `analysis.available=true`。';

function bump(prefix, appendix, guard) {
  const tip = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith(prefix));
  if (!tip) { console.log('未找到链尾：' + prefix); return; }
  if (tip.claim.includes(guard)) { console.log('已含目标段，跳过：' + tip.id); return; }
  const r = revise('canon', tip.id, { claim: tip.claim + appendix });
  console.log('已修订：' + tip.id + ' → ' + r.id);
}

bump('canon-session-layer-usage-20261007', SESSION_APPENDIX, '显示升级（2026-10-07 晚）');
bump('canon-world-sim-20261007', WORLDSIM_APPENDIX, '重建工具上线（2026-10-07 晚）');
