// akasha/tools/harvest-20261007z-session-tree.mjs
// 2026-10-07 留痕：会话层 v0.2 抽象层——canon 新条 + usage/session-usage 两条修订（追加不改原文）。幂等。
import { appendRecord, loadStore, revise, currentRecords } from './lib.mjs';

const TREE_CANON = {
  id: 'canon-session-tree-v02-20261007',
  claim:
    '会话层 v0.2「弧线树」（抽象层）落地（2026-10-07，纯 additive——六库/插件/段层零改动）：机械递归摘要树（按回合切块→L1 弧→L2 幕；gist 结论优先 400 展示 + extra 1200 评分扩面 + 指纹幂等 + treegen 代际、旧代留档沉默）+ 导航面（`session tree [--build]` / `session node <id>` / `--level nodes|segs` 跨层检索）。**度量**：① 保真——顶 3 结论 token **100%** / 块级提及 **62%**（巨块 488 孩子掉至 40%，记候选）/ 段层 token **60%**（全保真唯一保证＝ptr 回原档）；② A/B 对照——**树 19/20 vs 平铺 14/20**（结构题树独占：平铺 11 组词零命中诚实弃权；差距集中于结构感知+证据密度；平铺内容题 14 分打底⇒**树是加层非救场**）；③ MemoryAgentBench 四能力（准确检索/测试时学习/长程理解/选择性遗忘）题型对齐（HF 服务本机不可达，「非直跑」如实标注；选择性遗忘＝有意不选，降噪由纪律+计分承担）。测试 70→**72/72**；真库建树 f362b992→8 节点 / 7fe8ec84→7 节点。报告：`research\\session-tree-v02-fidelity.md` / `research\\session-tree-v02-ab-report.md`（+ sheet/run-A/run-B）；计划+账本 `docs\\superpowers\\plans\\2026-10-07-session-tree-v0.md(.ledger.md)`。候选改进（不急）：结论标题行入 extra（提及率）、巨块再平衡、截断标注；插件自动建树留 v0.3。旁证：并行会话写入 `orphan-thinking-junk-loop-r4`——用户两轮实测：会话层使用后空转显著减少但未消失；短决策链几乎无空转 ⇒ 假说升级 f(决策不确定性 × 搜索深度)。',
  source: { type: '复现', ref: 'research\\session-tree-v02-ab-report.md + -fidelity.md（含数据与边界）' },
  last_reviewed: '2026-10-07',
  event_time: '2026-10-07',
  tags: ['会话层', '抽象层', '树', 'RAPTOR', 'MemWalker', '对照实验', 'v0.2']
};

const USAGE_APPENDIX =
  '\n**㉑·抽象层（2026-10-07 v0.2）**：弧线树——`node akasha.mjs session tree [--build] --session ID`（L1 弧 / L2 幕；gist 展示 + extra 检索扩面）；`session node <id>` 停靠下钻；lookup `--level nodes|segs` 跨层。导航纪律：树＝入口 → 停靠 → 段/ptr 下钻（顶结论保真 100% / 块提及 62% / 段 60%；全保真＝ptr 回原档）。自动建树留 v0.3。';

const SESSION_USAGE_APPENDIX =
  '\n\n**v0.2 抽象层（2026-10-07）**：弧线树——`node akasha.mjs session tree [--build] --session ID`（按回合切块→L1 弧→L2 幕；机械、无 LLM；gist 400 展示 + extra 1200 评分扩面 + treegen 代际）；`session node <id>`（停靠 + children 下钻）；`session lookup --level nodes|segs`（跨层；节点只取当前代）。**导航纪律**：树＝入口 → 停靠 → 段/ptr 下钻；**保真口径**：顶结论 100% / 块级提及 62% / 段层 60%——全保真唯一保证＝ptr 回原档。A/B 实测：树 19/20 vs 平铺 14/20（结构题树独占）。';

let added = 0, skipped = 0;
// 1) 新 canon
const cAll = new Set(loadStore('canon').records.map((r) => r.id));
if (cAll.has(TREE_CANON.id)) { skipped++; console.log('已存在，跳过：' + TREE_CANON.id); }
else { appendRecord('canon', TREE_CANON); added++; console.log('已追加 [canon] ' + TREE_CANON.id); }

// 2) 修订两条用法
const tips = currentRecords(loadStore('canon').records);
for (const [anchor, appendix, guard] of [
  ['canon-akasha-usage', USAGE_APPENDIX, '㉑·抽象层'],
  ['canon-session-layer-usage-20261007', SESSION_USAGE_APPENDIX, 'v0.2 抽象层']
]) {
  const tip = tips.find((r) => r.id === anchor || r.id.startsWith(anchor + '-r'));
  if (!tip) { skipped++; console.log('未找到链尾：' + anchor); continue; }
  if (tip.claim.includes(guard)) { skipped++; console.log('已含 ' + guard + ' 段，跳过：' + tip.id); continue; }
  const r = revise('canon', tip.id, { claim: tip.claim + appendix });
  added++; console.log('已修订：[canon] ' + tip.id + ' → ' + r.id);
}
console.log(`完成：新增/修订 ${added}，跳过 ${skipped}。`);
