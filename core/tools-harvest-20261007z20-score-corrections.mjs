// akasha/tools/harvest-20261007z20-score-corrections.mjs
// 2026-10-07 留痕：GPT 外部评估触发的两处计分复核更正（回放 A 8/20；树 A 15/20）。幂等。
import { loadStore, revise, currentRecords } from './lib.mjs';

const REPLAY_FIX =
  ' **复核更正（2026-10-07 晚，外部评估触发）**：A 卷总分为**逐题相加＝8/20**（2+2+1+1+2+0+0+0+0+0；此前报告与条文误记 9/20——纯算术录写错误，判分表本身一致）。B 18/20、失手题 9/10 vs 0/10、结论（会话层赢且互补非替代）**均不变**；报告已就地更正。';

const TREE_FIX =
  ' **复核更正（2026-10-07 晚，外部评估触发）**：S2 对平铺卷（A）的扣分**撤销**——A 卷原档实含 pid 级证据（pid 36024 启动 15:12:42/pid 58176 + lib.mjs 改动时刻），盲评在先未知其内容细节；平铺总分 14→**15/20**。树 19/20 不变，结论（树赢在结构感知+证据密度；S5 仍为树独占分）**不变**。报告已就地更正。';

function bump(prefix, appendix, guard) {
  const tip = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith(prefix));
  if (!tip) { console.log('未找到链尾：' + prefix); return; }
  if (tip.claim.includes(guard)) { console.log('已含目标段，跳过：' + tip.id); return; }
  const r = revise('canon', tip.id, { claim: tip.claim + appendix });
  console.log('已修订：' + tip.id + ' → ' + r.id);
}

bump('canon-session-replay-20261007', REPLAY_FIX, '复核更正（2026-10-07 晚，外部评估触发）');
bump('canon-session-tree-v02-20261007', TREE_FIX, '复核更正（2026-10-07 晚，外部评估触发）');
