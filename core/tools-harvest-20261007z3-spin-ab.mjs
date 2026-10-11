// akasha/tools/harvest-20261007z3-spin-ab.mjs
// 2026-10-07 留痕：a/b 实现落点 → 修 canon-spin-loop-frontier（r1）。幂等。
import { loadStore, revise, currentRecords } from '../lib.mjs';

const APPENDIX =
  '\n\n**a/b 落地（2026-10-07，受控解冻第十五次）**：a——`session help` 增「痛点→一步命令」速查表 + 未定时刻纪律句；`metrics` 增「轻查动作率」段（记忆工具·MCP 面调用数/占比/每回合；实测 96 次 / 3.8% / 0.83 每回合）。b——`loop-detect.mjs` 检测器（归一化+滑窗块重复 / bigram Jaccard 变体近重复 / 标点串三级；词汇多样性+CJK 占比过滤；红→绿 4 用例，套件 74/74）+ `tools\\semantic-loop-scan.mjs` 基线扫描：双会话存档 **块重复 0 / 变体 12+10（全系文档/代码重述，非病态）/ 严格标点口径仅剩引用位**（马拉松 seq 2728/2740、本会话 seq 38/46/57）——与「原发不落盘」一致并补精确锚点；报告 `research\\semantic-loop-baseline-20261007.md`（+JSON）。插件对照：`unknowbug/dsh-thinking-loop-guard` 评价＝MIT、规则表完备、含长程块重复增强与真实样本测试，但 5★/0 issue/5 周未更新——**借法不装**。';

const tips = currentRecords(loadStore('canon').records);
const tip = tips.find((r) => r.id.startsWith('canon-spin-loop-frontier-20261007'));
if (!tip) { console.log('未找到 canon-spin-loop-frontier 链尾'); process.exit(1); }
if (tip.claim.includes('a/b 落地（2026-10-07')) { console.log('已含 a/b 段，跳过：' + tip.id); process.exit(0); }
const r = revise('canon', tip.id, { claim: tip.claim + APPENDIX });
console.log('已修订：' + tip.id + ' → ' + r.id);
