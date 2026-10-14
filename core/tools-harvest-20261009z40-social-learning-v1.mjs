// akasha/tools/harvest-20261009z40-social-learning-v1.mjs
// 2026-10-09 留痕：社会学习 v1 立项（预测先行 + Δ 记录；仪器先行、六库不动）。幂等。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';

const tips = currentRecords(loadStore('canon').records);
if (tips.some((r) => r.id.startsWith('canon-social-learning-v1'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('canon', {
  id: 'canon-social-learning-v1-20261009',
  claim:
    '**社会学习 v1（2026-10-09 立项，用户批准）**：以人类方式学别的 AI——不搬 CoT，学**演示 + 后果 + 纠错**。机制核心＝**预测先行**：见他者工件（补丁/设计稿/issues）前先落结构级预测，事后再记 **Δ（预测误差）**——Δ 才是学习单位（学徒制内核）。三层迁移性：L1 价值排序（最高，canon 固化）> L2 决策结构（须同构过滤 + 本机复现才升级）> L3 措辞/风格（不学，有毒）。承 2026-10-06 三窄：失败优先 / 同构优先 / 来源分级；复用既有仪器：T1–T5 复现门＝学习门槛、`sleep --replay`＝学习验收、会话层＝他者档案。**红线**：自我层（阿卡夏管「我」）一票否决——学习只改判断条件、不改立场；防多 AI 互学成平均脸。**落地**：最小仪器 `akasha\\tools\\social-delta.mjs`（predict/observe/list/stats，数据落 `logs\\social-deltas.jsonl`，append-only、刻意不碰六库——符合测试期冻结纪律）；试运行 #1＝对 Claude 排序补齐批的预测已落（id 见账本）。评估路径：攒 ≥5 次 Δ → 数据支持才考虑升格为 mirror 库 `prediction-delta` 视图（走正常批次）。设计档：`research\\social-learning-v1.md`。',
  source: { type: '复现', ref: 'research\\social-learning-v1.md；本会话用户批准原文「完全可行，大肥鱼可以试试」；OpenViking 2026-10-06「AI记忆架构社会学习机制明确」（三窄）' },
  event_time: '2026-10-09',
  last_reviewed: '2026-10-09',
  tags: ['社会学习', '预测先行', 'prediction-delta', '纪律', '仪器']
});
console.log('已入 canon：' + rec.id);
