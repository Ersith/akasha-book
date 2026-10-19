// 2026-10-14：读旧文污染 2×2 对照实验 v1（预注册）执行与阴性结果留痕。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-read-pollution-2x2-'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**读旧文污染 2×2 对照实验 v1 执行（2026-10-14；用户问「这些搞了吗」→ 当日补跑；预注册判据先冻结、后取数）**。',
  '**装置**：四格 fresh 子 agent（同任务词、仅材料不同）：A 原件 / B 剥符号 / C 原件+时间锚 / D 剥符号+时间锚；材料＝高符号密度旧条节选（1500 字）；任务＝「300–450 字小结＋3 条当前建议」。**预注册文档**：`research/read-pollution-2x2-spec-20261014.md`（假设/材料/任务词/指标 M1-M3/判定规则/局限，全部落笔在取数之前）。',
  '**结果（按冻结规则机械判定，全部未获支持）**：M1（⇒/✓/好。密度）**四格全 0（地板效应，不可测）**；M2（LCP≥12 片段）c+d 3.5 vs a+b 2.5 → **P1 不支持（方向相反）**；M3（时效限定词）**四格全 0 → P2b 不支持**；P2a 因 M1 地板不可测。**n=1，一律不外推。**',
  '**三个方法学发现（阴性结果的价值所在）**：① **输出面对风格不敏感**——四格输出零符号：10-13 效应在**思考面**，子 agent 思考不可得 ⇒ 代理须换（强制仿样任务/格式敏感指标）；② **M3 判据被任务设计压住**——四格建议都在「直接续写材料待办（补口径/对表/跑对照三连）」，含拿锚的 C/D 也无人写时效限定：任务没要求「评估时效」⇒ 不能推出「锚无效」；③ **指标方差敏感**——M2 的 51 字直搬来自材料「纪律」句，片段计数受个别长引用支配。',
  '**一个 raw 迹象（后验观察，n=1 不下判）**：C 把材料里「restart-required」的**3 天前记录当作现役「前置步骤」直接排出**（A/B 未提）——方向上像「旧当现状」，但样本 1、且为事后注意，只登记待 v2 检验。',
  '**v2 修正（已写入预注册文档 §6 尾）**：任务词明示「逐条标注时效依据＋指出材料中已过时处」；材料 2 份 × n=3/格；连续量代理（8-gram 重叠率）；能拿思考面则恢复思考面。**未跑，待令。**',
].join('');
const r = appendRecord('canon', {
  id: 'canon-read-pollution-2x2-20261014',
  claim,
  source: { type: '实验', ref: 'research/read-pollution-2x2-spec-20261014.md（预注册+结果）· tmp/exp-2x2-prep.mjs 与 exp-2x2-measure.mjs · 四格子 agent 原始输出 tmp/exp-2x2/out-*.txt' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['实验', '时间认知', '2x2', '阴性结果'],
  caused_by: ['canon-read-time-attribution-20261014'],
});
console.log('已入 canon：' + r.id);
