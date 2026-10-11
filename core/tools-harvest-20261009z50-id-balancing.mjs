// akasha/tools/harvest-20261009z50-id-balancing.mjs
// 2026-10-09：frontier 入库——Qwen ID Balancing（arXiv:2609.39137，官方摘要直读核验）。幂等。
import { loadStore, currentRecords, appendRecord } from '../lib.mjs';

const tips = currentRecords(loadStore('frontier').records);
if (tips.some((r) => r.id.startsWith('front-qwen-id-balancing'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('frontier', {
  id: 'front-qwen-id-balancing-2026',
  title: 'ID Balancing：极稀疏 MoE 的 PID 负载控制（Qwen/阿里，arXiv:2609.39137）',
  url: 'https://arxiv.org/abs/2609.39137',
  topic: 'MoE 训练 / 控制论',
  status: '待验证',
  last_checked: '2026-10-09',
  next_review: '2026-12-09',
  supports: [],
  note: '把 MoE 专家负载均衡当闭环控制：统一既有方案——DeepSeek 免辅助 loss 法＝固定步长积分项、Kimi K3 分位均衡＝广义比例项；本文补 ID（积分项随负载误差缩放 + 微分项仅在失衡恶化时触发＝提前刹车）。数字（官方摘要）：768 专家、Top-3 路由——worst-case backbone MaxVio ↓>50%、训练平均 backbone MinVio ↓>12%（相对最佳基线）；18.9B→69.9B（Top-10/768）最坏偏差近不变、比 aux-loss 基线低 ~89.6%；语言建模/下游能力保持、越稀疏优势越大。对我们的用处：①**检索＝专家路由**——热门条目垄断/冷条目饿死，可用「配额+按误差纠偏」的负载均衡（候选）；②**loop P1** 借"微分项"思想——按**变化率**（而非状态）提前触发干预；③模式对照：**闭环纠偏 > 加愿望**（aux loss＝在提示里多写几条纪律；闭环＝仪表+纠偏项）——我们的投影律同构。'
});
console.log('已入 frontier：' + rec.id);
