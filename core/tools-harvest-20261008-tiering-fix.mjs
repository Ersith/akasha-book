// 2026-10-08（用户裁定后）：基石分层修正 + 文献阅读结论落库。
//
// 用户裁定：frontier（基石）只收「来源可靠、有学术背景或前沿背景的组织」的论文/文献；
// 教程/工具文档属「半年~一年才需更新」的知识库 => 归 canon（last_reviewed 即慢周期锚）。
//
// 本脚本做三件事：
//   A. 把 4 条非学术条目从 frontier 的「当前集」里标注退役（v0 无删除原语，走 revise 标退役 + 指向 canon）
//   B. 为这 4 条写 canon 条目（工具/指南类慢知识）
//   C. 把已读两篇论文的可操作结论写成 canon（他人来源）
import { appendRecord, loadStore, currentRecords, revise, allIds } from '../lib.mjs';

const CHECK = '2026-10-08';
const report = [];

// ---------- B + C：canon 条目 ----------
const CANON = [
  {
    id: 'canon-tool-joycaption-20261008',
    claim: '打标工具（2026-10-08 登记，半年~一年复核）：JoyCaption 有 ComfyUI 节点，可直接接进现有流程做自然语言 caption——用于给场景图补「结构/材质/光向」描述，补足纯 WD14 标签堆缺少的语义层。入口：https://comfy.icu/node/JoyCaptioner',
    source: { type: '他人', ref: 'https://comfy.icu/node/JoyCaptioner' },
    last_reviewed: CHECK, event_time: CHECK,
    tags: ['工具', '打标', 'comfyui', 'caption'],
  },
  {
    id: 'canon-tool-animalorastudio-20261008',
    claim: '动漫 LoRA 训练工作台（2026-10-08 登记，半年~一年复核）：AnimaLoraStudio 是动漫向 LoRA 的现成数据整理/打标/训练流程，可对照我们自建管线（WD14 分类 + 裁边 + 结构层标注）取长补短。仓库：https://github.com/WalkingMeatAxolotl/AnimaLoraStudio',
    source: { type: '他人', ref: 'https://github.com/WalkingMeatAxolotl/AnimaLoraStudio' },
    last_reviewed: CHECK, event_time: CHECK,
    tags: ['工具', '训练', 'anime', 'lora'],
  },
  {
    id: 'canon-guide-kohya-bucket-20261008',
    claim: '训练工程参考（2026-10-08 登记，半年~一年复核）：kohya sd-scripts 的 Bucket Management 文档是分桶与 max_bucket_reso 的权威解释——我们讨论的「1536 → 1920 提上限以保住原图细节」「宽幅图不该按短边一刀切」都能在此找到依据。文档：https://deepwiki.com/kohya-ss/sd-scripts/10.2-bucket-management',
    source: { type: '官方', ref: 'https://deepwiki.com/kohya-ss/sd-scripts/10.2-bucket-management（kohya-ss/sd-scripts 文档镜像）' },
    last_reviewed: CHECK, event_time: CHECK,
    tags: ['指南', '训练工程', 'kohya', 'bucket'],
  },
  {
    id: 'canon-guide-depth-controlnet-20261008',
    claim: '结构控制参考（2026-10-08 登记，半年~一年复核）：Depth ControlNet 的 ComfyUI 实践教程——若「场景结构不够」的上限是提示词管不住，下一步就是给工作流加 depth 条件通道；本条目记录入口与最小用法。教程：https://github.com/Ericsunsk/comfyui-skill/blob/main/references/docs/tutorials/controlnet/depth-controlnet.md',
    source: { type: '他人', ref: 'https://github.com/Ericsunsk/comfyui-skill/blob/main/references/docs/tutorials/controlnet/depth-controlnet.md' },
    last_reviewed: CHECK, event_time: CHECK,
    tags: ['指南', '结构控制', 'controlnet', 'comfyui'],
  },
  {
    id: 'canon-lora-data-selection-quality-over-quantity-20261008',
    claim: '2026-10-08 读 QZLoRA（arXiv:2511.12002，Ji & Adar）得到的可操作结论：① 选图质量比数量更决定成败——用 QuizRank（让 VLM 做「看图答题」，图像＝对 VLM 的教学干预，答对越多分越高）选出的 top-15 图训练，QuizRank 准确率 54.99%，显著高于随机 15 张的 46.74% 与不微调的 35.37%，甚至只用 top-2（50.03%）也超过随机 15 张；② 输入质量与输出质量正相关且随样本数变稳（k=2 时 r=0.732 → k=15 时 r=0.920）；③ 可用的图片总量与生成质量只有弱相关（r=0.135, p=0.30）⇒ 对我们是「宁可少而准，不要多而杂」的量化依据；④ QuizRank 同时可当客观评测指标（用同一套题给生成图打分）；⑤ 局限：类别视觉特征不鲜明（过宽的概念）或「独一无二的个例」效果差，插画域绝对分更低但趋势一致。',
    source: { type: '他人', ref: 'https://arxiv.org/abs/2511.12002（QZLoRA；底层算法 QuizRank: arXiv:2509.15059）' },
    last_reviewed: CHECK, event_time: CHECK,
    tags: ['文献结论', '数据集', 'lora', '评测', 'vlm'],
  },
  {
    id: 'canon-spatial-consistency-intrinsics-20261008',
    claim: '2026-10-08 读 AAAI-26《Towards Spatially Consistent Image Generation》（Lee 等，DOI 10.1609/aaai.v40i7.37508）得到的结论：扩散模型「空间不一致、布局失真」的根因是缺乏底层结构/布局信息；解法是**共生成 image 与内蕴场景属性**（深度、分割图——由预训练估计器从既有图库抽取，不需 3D 数据），用自编码器把多种 intrinsics 聚成一个隐变量，再让图像域与 intrinsics 域联合去噪、共享互信息，从而在保持底模保真度与文本对齐的同时修正布局。对我们的含义：这是「结构不够」在模型层面的正解；工程上可先退一步用 depth/seg 条件通道（见 canon-guide-depth-controlnet-20261008）。',
    source: { type: '他人', ref: 'https://doi.org/10.1609/aaai.v40i7.37508' },
    last_reviewed: CHECK, event_time: CHECK,
    tags: ['文献结论', '空间一致性', 'intrinsics', '结构'],
  },
];

// ---------- A：frontier 里 4 条非学术条目 → 标退役 ----------
const RETIRE = [
  ['frontier-joycaption-comfyui-node', 'canon-tool-joycaption-20261008', '工具'],
  ['frontier-animalorastudio-anime-lora', 'canon-tool-animalorastudio-20261008', '工具'],
  ['frontier-kohya-bucket-management-doc', 'canon-guide-kohya-bucket-20261008', '文档'],
  ['frontier-depth-controlnet-tutorial-comfyui', 'canon-guide-depth-controlnet-20261008', '教程'],
];

// —— B/C 写入 ——
const canonExisting = new Set(allIds(loadStore('canon').records));
for (const rec of CANON) {
  if (canonExisting.has(rec.id)) { report.push('跳过（已存在） ' + rec.id); continue; }
  appendRecord('canon', rec);
  report.push('已追加 [canon] ' + rec.id);
}

// —— A 标注退役（v0 无删除原语：改 note 明示非基石 + 指向 canon，并把复审推到很远避免噪音）——
const fRecs = loadStore('frontier').records;
const fCurrent = new Map(currentRecords(fRecs).map((r) => [r.id, r]));
for (const [fid, cid, kind] of RETIRE) {
  const rec = fCurrent.get(fid);
  if (!rec) { report.push('跳过（frontier 无当前版本） ' + fid); continue; }
  const r = revise('frontier', fid, {
    note: `【非基石·已退役】这是${kind}类资料，不是学术/前沿来源——按 2026-10-08 用户裁定，frontier 只收来源可靠且有学术或前沿背景的论文文献；本条内容已转 canon（${cid}）。保留记录仅为追溯，复审时不再计入基石。`,
    next_review: '2099-12-31',
  });
  report.push(`已标注退役 [frontier] ${fid} → ${r.id}（转 ${cid}）`);
}

console.log(report.join('\n'));
