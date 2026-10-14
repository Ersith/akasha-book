// harvest B（2026-10-07）：收尾。
// ① 修订 ChinaXiv 条目的 note（URL 核对结论：di4s 200 为 JS 外壳 / 主域 403 反爬）；
// ② canon 留痕一条（本次前沿层增补与核对结论）。
// 幂等：revise 前比对链尾 note；canon 按 id 查重。
// 用法：node akasha\tools\harvest-20261007b-meta.mjs
import { appendRecord, loadStore, currentRecords, revise } from './lib.mjs';

const D = '2026-10-07';

// ① 修订 note（append-only：原版保留，新版本带 supersedes）
const wantedNote = '扩散 LoRA 超参系统消融（rank/LR/步数 ↔ 生成质量与推理效率）——对应 v3a 管线调参；2026-10-07 核对：di4s 子域 HTTP 200 但页面为 JS 外壳（标题不可机检，sim=0）、主域 403 反爬；条目按检索索引留档，待人工复核或补替代源。';
const tip = currentRecords(loadStore('frontier').records).find((r) => r.id === 'front-diffusion-lora-hyperparameter-ablation');
if (!tip) { console.log('skip revise（找不到条目）'); }
else if (tip.note === wantedNote) { console.log('skip revise（note 已最新）'); }
else {
  const r = revise('frontier', 'front-diffusion-lora-hyperparameter-ablation', { note: wantedNote, last_checked: D });
  console.log('revised frontier ->', r.id, '（supersedes', r.supersedes + '）');
}

// ② canon 留痕
const canon = {
  id: 'canon-frontier-harvest-20261007',
  claim: '2026-10-07 前沿层增补 16 条应用向文献（LoRA 训练 6 / 3D 资产管线 6 / 角色与引擎 4），经 appendRecord 校验入库、check 全绿（frontier 91/91）；URL 核对：可达 16/16，标题一致性机检通过 14 条，ChinaXiv 与 IEEE 两条因反爬/JS 外壳转人工复核。',
  source: {
    type: '复现',
    ref: 'akasha\\tools\\harvest-20261007-frontier-docs.mjs（入库）+ tools\\verify-frontier-urls.mjs --only（核对）；报告 logs\\frontier-url-audit-2026-10-06-retry.json，首轮全量副本 logs\\frontier-url-audit-harvest-20261007-full16.json'
  },
  last_reviewed: D,
  tags: ['akasha', '前沿层', '文献', 'LoRA', 'Blender', 'Unity']
};
const existing = new Set(loadStore('canon').records.map((r) => r.id));
if (existing.has(canon.id)) { console.log('skip canon（已存在）'); }
else { appendRecord('canon', canon); console.log('added canon', canon.id); }

console.log('\nharvest B 完成。');
