// akasha/tools/harvest-20261009z47-artex-lessons.mjs
// 2026-10-09：ARTEX 学习——启示条款回灌（简报三件套/拦截文案候选/验收绑实物/负结论写回）。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const tips = currentRecords(loadStore('canon').records);
const rec = tips.find((r) => r.id.startsWith('canon-artex-study'));
if (!rec) { console.log('未找到 canon-artex-study'); process.exit(1); }
if (rec.claim.includes('启示条款')) { console.log('已含，跳过：' + rec.id); process.exit(0); }

const r = revise('canon', rec.id, {
  claim: rec.claim +
    ' **启示条款（2026-10-09 转录精读后回灌）**：①**简报三件套**——给我们 subagent/worker 简报加句式：「发散写进书面产出（fact/报告）；动作权限不变、别越界；联想线索宁可多报、别咽下去」；②**拦截文案措辞候选**——「平台管控·非目标防御」经 ARTEX 活体验证有效（模型不当 WAF 去绕）；我们 gate 下次版本化时把拒绝语补同款澄清（本轮不改：测试期冻结纪律）；③**交付物类验收必须绑产物实物**（ARTEX planner 在无报告文件时用总结性事实放行报告目标——反面教材，已观察）；④**负结论也写回**（"不是 SQLi"进事实库，免后来者重测）与我们的 orphan 留痕同源。转录精读与工序细节见 `research\\artex-study-20261009.md` §9。',
  last_reviewed: '2026-10-09'
});
console.log('已修订：' + rec.id + ' → ' + r.id);
