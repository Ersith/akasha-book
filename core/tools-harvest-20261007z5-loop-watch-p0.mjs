// akasha/tools/harvest-20261007z5-loop-watch-p0.mjs
// 2026-10-07 留痕：循环观测 P0 上线 → canon（spin 链）+ usage r19 + session-usage r3。幂等。
import { loadStore, revise, currentRecords } from '../lib.mjs';

const SPIN_APPENDIX =
  '\n\n**P0 干跑上线（2026-10-07，受控解冻第十六次）**：三环架构之 P0 并入小阿卡夏（`@local/akasha-session` **v0.2.0**，restart-required）——**流环**（`assistant/chunk` 的 reasoning/text-delta 累积，480 字符节流 + 8K 尾窗；真值对官方 `dsh-llm` StreamChunk 核实）+ **turn 环**（`agent/turn-stopping`/`turn/end` 全文）+ 类型探针；命中只写 `loop-watch`/`loop-watch-probe` 观测线，**绝不干预**（干跑红线）。汇总 CLI：`node akasha.mjs session loopwatch`。检测器修正：**step 2→1**（奇周期循环盲区——turn 环自检首跑踩中）+ 尾优先收集；selftest **16/16**。基线 v2.1：f362b992 块重复 1（seq 1245，代码重述，良性）/ 变体 10+8 / 第三会话 6696bbf1 全零。P1（温和恢复：steer → cancel(keepInbox) → 降档）待 P0 数据 + 另裁定。';

const USAGE_APPENDIX =
  '\n**㉓ 循环观测 P0（2026-10-07）**：`node akasha.mjs session loopwatch [--since D] [--json]`——小阿卡夏子功能；数据源自插件 v0.2 的 **dry 干跑**观测线（`loop-watch`/`loop-watch-probe`；只观测、绝不干预）。方法见 research\\loop-guard-synthesis-20261007.md；基线 research\\semantic-loop-baseline-20261007.md。';

const SESSION_APPENDIX =
  '\n\n**循环观测（P0 干跑，2026-10-07）**：`session loopwatch` 汇总 `loop-watch`（流环 + turn 环；插件 0.2.0，只观测不干预）；检测器 `loop-detect.mjs` step=1 修正（奇周期盲区）。';

let added = 0; let skipped = 0;
for (const [anchor, appendix, guard] of [
  ['canon-spin-loop-frontier-20261007', SPIN_APPENDIX, 'P0 干跑上线'],
  ['canon-akasha-usage', USAGE_APPENDIX, '㉓ 循环观测'],
  ['canon-session-layer-usage-20261007', SESSION_APPENDIX, '循环观测（P0 干跑']
]) {
  const tips = currentRecords(loadStore('canon').records);
  const tip = tips.find((r) => r.id === anchor || r.id.startsWith(anchor + '-r'));
  if (!tip) { skipped++; console.log('未找到链尾：' + anchor); continue; }
  if (tip.claim.includes(guard)) { skipped++; console.log('已含目标段，跳过：' + tip.id); continue; }
  const r = revise('canon', tip.id, { claim: tip.claim + appendix });
  added++; console.log('已修订：[canon] ' + tip.id + ' → ' + r.id);
}
console.log(`完成：修订 ${added}，跳过 ${skipped}。`);
