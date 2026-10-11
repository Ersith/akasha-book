// 2026-10-08：把「场景 LoRA 备忘录」登记进 canon —— 下一个会话要能检索到"从哪儿接着干"。
import { appendRecord, loadStore, allIds } from '../lib.mjs';

const REC = {
  id: 'canon-scene-lora-resume-20261008',
  claim: '场景 LoRA（scene_ref）交接备忘（2026-10-08 立；正文 D:\\ClaudeWorkspace\\sekali-lab\\MEMO-场景LoRA-20261008.md）：① 当前最佳出图配置＝工作流 `expG` 默认（场景 LoRA `scene_v3_r64-000012` @0.8 ＋ 背景精修 0.55），室内清晰度 513 首次超过底模 312，街景/自然结构明显改善；② 短板＝纯自然场景（动漫素材天然缺自然），等用户往 `data\\nature-inbox` 攒 80–150 张自然向概念/厚涂/3D 图（不限风格、要前中后景、不要照片）；③ 下一步＝v4（自然子集提权 ×3，同探针 + 清晰度对照）与 depth 通道可行性验证（用现有 41 张自然向图即可先做）；④ 数据集/配置/评测资产路径与复现命令、六条踩坑（人物判定用 WD14 词、收图判据短边≥768 或≥1.2MP、低 denoise 只有损失、强杀进程锁日志、PS 传中文进 node 会截断、风格配比不可互相替代）全部写在备忘里。',
  source: { type: '复现', ref: 'D:\\ClaudeWorkspace\\sekali-lab\\MEMO-场景LoRA-20261008.md + canon-scene-lora-pipeline-20261008-r1 + output/r64scene_v3' },
  last_reviewed: '2026-10-08',
  event_time: '2026-10-08',
  tags: ['scene-lora', 'sekali-lab', '交接备忘', 'comfyui', '下一步'],
};

const existing = allIds(loadStore('canon').records);
if (existing.has(REC.id)) console.log('跳过（已存在） ' + REC.id);
else { appendRecord('canon', REC); console.log('已追加 [canon] ' + REC.id); }
