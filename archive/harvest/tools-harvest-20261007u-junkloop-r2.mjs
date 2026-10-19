// akasha/tools/harvest-20261007u-junkloop-r2.mjs
// 2026-10-07 留痕：orphan-thinking-junk-loop → r2（用户两轮实测 + 假说收窄）。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const cur = currentRecords(loadStore('orphan').records).find(r => r.id.startsWith('orphan-thinking-junk-loop'));
if (!cur) console.log('找不到 orphan-thinking-junk-loop（current）');
else if (String(cur.observed).includes('分层')) console.log('已修订过，跳过：' + cur.id);
else {
  const r = revise('orphan', cur.id, {
    observed: String(cur.observed) + ' ｜ **观测更新（2026-10-07，用户两轮实测）**：① 使用小阿卡夏（会话层）后「阿巴阿巴」显著减少但未消失——机制假说：空转高发于「下一步不确定」的决策空窗，会话层/起床包让结论与动作更快到手 → 空窗收窄；② 续测：**信息完整、决策链短的回答（如整理已知结论）思考段几乎无空转；而「核对内部状态 / 决策未定」的段落仍复现**——⇒ 假说升级：空转频次 ≈ f(决策不确定性 × 搜索深度)，**应按任务类型分层统计**（对照实验需控制任务类型）。',
    hypothesis: '空转是「未定状态」的填充退化：不确定性高、搜索深时复现；结论在手、任务简单时几乎消失——非单调、任务类型相关。（修订：由「上下文长度相关」收窄为「决策不确定性 × 搜索深度 相关」。）'
  });
  console.log('已修订：' + cur.id + ' → ' + r.id);
}
