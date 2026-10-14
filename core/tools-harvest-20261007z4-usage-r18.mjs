// akasha/tools/harvest-20261007z4-usage-r18.mjs
// 2026-10-07 留痕：a/b 实现 → usage r18 + session-usage r2（速查表/纪律句/轻查动作率/检测器）。幂等。
import { loadStore, revise, currentRecords } from './lib.mjs';

const USAGE_APPENDIX =
  '\n**㉒ 空转对策 a/b（2026-10-07）**：**a 工具面优先**——`session help` 增「痛点 → 一步命令」速查表；纪律句「未定时刻先问：哪条命令能一步回答；能一步回答的，先查再做」；`metrics` 增「轻查动作率」段（记忆工具·MCP 面：调用量 / 占比 / 每回合）。**b 检测**——`akasha\\loop-detect.mjs`（归一化滑窗块重复 + bigram Jaccard 变体近重复 + 标点串；方法论＝Circular Reasoning「语义先于文本」× RADAR「前置信号」）；扫描工具 `node akasha.mjs` 不含此命令，用 `node tools\\semantic-loop-scan.mjs`（基线报告 `research\\semantic-loop-baseline-20261007.md`）。现场协议 v2：目击时记「任务类型 × 距压缩步数」。';

const SESSION_APPENDIX =
  '\n\n**a/b 对策（2026-10-07）**：`session help` 速查表 + 未定时刻纪律；`metrics` 轻查动作率；空转检测器 `loop-detect.mjs` + `tools\\semantic-loop-scan.mjs`（存档基线：块重复 0、变体全系重述、严格标点仅引用位）。';

let added = 0; let skipped = 0;
const tips = currentRecords(loadStore('canon').records);
for (const [anchor, appendix, guard] of [
  ['canon-akasha-usage', USAGE_APPENDIX, '㉒ 空转对策'],
  ['canon-session-layer-usage-20261007', SESSION_APPENDIX, 'a/b 对策（2026-10-07）']
]) {
  const tip = tips.find((r) => r.id === anchor || r.id.startsWith(anchor + '-r'));
  if (!tip) { skipped++; console.log('未找到链尾：' + anchor); continue; }
  if (tip.claim.includes(guard)) { skipped++; console.log('已含目标段，跳过：' + tip.id); continue; }
  const r = revise('canon', tip.id, { claim: tip.claim + appendix });
  added++; console.log('已修订：[canon] ' + tip.id + ' → ' + r.id);
}
console.log(`完成：修订 ${added}，跳过 ${skipped}。`);
