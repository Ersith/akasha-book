// 2026-10-08：scene_ref 场景 LoRA 主题的文献/教程基石（frontier 层）。
// 全部「待验证」（新文献先待验证，+90 天复审）；URL 均取自当日检索结果，未验证可达性者已在 note 注明。
// 幂等：已存在同 id 跳过。写入走 lib.appendRecord（中文不经命令行参数，见 canon-powershell-native-args-20261008）。
import { appendRecord, loadStore, currentRecords, allIds } from '../lib.mjs';

const CHECK = '2026-10-08';
const NEXT = '2027-01-06';   // 待验证 +90 天
const F = (id, title, url, topic, status, note, supports = []) => ({
  id, title, url, topic, status, last_checked: CHECK, next_review: NEXT,
  supports: Array.isArray(supports) ? supports : (supports ? [supports] : []),
  note,
});

const RECORDS = [
  // —— 数据集与标注 ——
  F('frontier-lora-hparam-ablation-chinaxiv-2026',
    'LoRA 超参数对扩散模型生成质量与效率影响的系统消融研究',
    'https://chinaxiv.org/user/download.htm?uuid=5c08720c435641fdab2c9c29d9eb83bb',
    '图像生成·训练参数', '待验证',
    '中文消融研究；对应我们的 dim/alpha/lr/epoch 选择（v1 dim32 → v2/v3 dim64、lr 1.5e-4）。用于校验下一轮是否该动 rank 或步数。',
    'scene_ref 场景 LoRA 管线'),
  F('frontier-quizzing-vlms-dataset-selection-2025',
    'Selecting Fine-Tuning Examples by Quizzing VLMs',
    'https://arxiv.org/abs/2511.12002',
    '数据集与标注', '待验证',
    '用 VLM 出题筛训练样本——正好对应我们「158 张里只有 82 张可用」的筛选痛点，可替代阈值式启发规则做更聪明的取舍。'),
  F('frontier-synthetic-captions-t2i-2024',
    'Improving Text Generation on Images with Synthetic Captions',
    'https://arxiv.org/abs/2406.00505',
    '数据集与标注', '待验证',
    '合成 caption 的收益与陷阱；对照我们「WD14 标签 + 程序化结构层」的标注路线，评估是否值得引入 VLM 描述句。'),
  F('frontier-joycaption-comfyui-node',
    'JoyCaption（ComfyUI 节点）——自然语言打标',
    'https://comfy.icu/node/JoyCaptioner',
    '工具·标注', '待验证',
    '可直接接进现有 ComfyUI 流程的 captioner；若要给场景图补「结构/材质/光向」自然语言描述，这是最低成本路径（替代纯 WD14 标签堆）。'),
  F('frontier-animalorastudio-anime-lora',
    'AnimaLoraStudio（动漫 LoRA 训练工作台）',
    'https://github.com/WalkingMeatAxolotl/AnimaLoraStudio',
    '工具·训练', '待验证',
    '动漫向 LoRA 的现成数据整理/打标/训练流程；对照我们自建管线（WD14 分类 + 裁边 + 结构标注）看有无可借的环节。'),

  // —— 结构与场景生成 ——
  F('frontier-spatial-consistency-intrinsic-scene-2025',
    'Towards Spatially Consistent Image Generation: On Incorporating Intrinsic Scene Properties into Diffusion Models',
    'https://ojs.aaai.org/index.php/AAAI/article/view/37508',
    '图像生成·空间结构', '待验证',
    '把内蕴场景属性（法线/深度/反照率）注入扩散模型以提升空间一致性——正是「场景不成结构」这一症状的学术对应物，可作为下一阶段的手段储备。'),
  F('frontier-selma-skill-experts-2024',
    'SELMA: Learning and Merging Skill-Specific Text-to-Image Experts with Auto-Generated Data',
    'https://papers.nips.cc/paper_files/paper/2024/hash/43d8e5fc816c692f342493331d5e98fc-Abstract-Conference.html',
    '图像生成·多技能', '待验证',
    '「按技能分别训专家再合并」的路线；对应我们现在的分档思路（纯环境 / 人物在场景 / 人物为主），可评估是否该拆成多管 LoRA 而非一管混训。'),
  F('frontier-2d-animation-background-generation',
    'Exploring the Application of Intelligent Algorithms in Automatic Generation of 2D Animation Backgrounds',
    'https://www.sciencedirect.com/science/article/pii/S1877050926012810',
    '图像生成·动漫背景', '待验证',
    '直接对口「动漫背景自动生成」；未核验可达性与质量（ScienceDirect 反爬），复审时优先确认。'),
  F('frontier-depth-controlnet-tutorial-comfyui',
    'Depth ControlNet 教程（ComfyUI 实践）',
    'https://github.com/Ericsunsk/comfyui-skill/blob/main/references/docs/tutorials/controlnet/depth-controlnet.md',
    '工具·结构控制', '待验证',
    '用深度图约束空间结构的最小实践路径；若「结构不够」的上限是提示词管不住，下一步就是给工作流加 depth 通道。'),

  // —— 训练工程与评测 ——
  F('frontier-kohya-bucket-management-doc',
    'kohya sd-scripts · Bucket Management（官方文档）',
    'https://deepwiki.com/kohya-ss/sd-scripts/10.2-bucket-management',
    '训练工程', '待验证',
    '分桶与 max_bucket_reso 的权威解释；我们为「保住原图细节」讨论的 1536 → 1920 上限、以及宽幅图误杀问题都在这里能找到依据。'),
  F('frontier-ai-image-quality-survey-2026',
    'AI 生成图像质量评价：一个从像素到伦理的分层综述',
    'http://shnu.ijournals.cn/zrkxb/shsfqkszrb/ch/reader/download_pdf.aspx?file_no=20260212&year_id=2026&quarter_id=2&falg=1',
    '评测方法', '待验证',
    '图像质量评价的分层综述；用来给我们的「清晰度指标失灵」（Laplacian 被平滑天空骗）找更稳的替代指标（DISTS/LPIPS/人类偏好）。'),
];

const report = [];
const existing = new Set(allIds(loadStore('frontier').records));
for (const rec of RECORDS) {
  if (existing.has(rec.id)) {
    report.push('跳过（已存在） ' + rec.id);
    continue;
  }
  appendRecord('frontier', rec);
  report.push('已追加 [frontier] ' + rec.id);
}
console.log(report.join('\n'));
