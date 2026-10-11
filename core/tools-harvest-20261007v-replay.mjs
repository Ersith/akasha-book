// akasha/tools/harvest-20261007v-replay.mjs
// 2026-10-07 留痕：阶段 3「阿巴阿巴回放」实验结果 → canon。幂等。
import { appendRecord, loadStore } from '../lib.mjs';

const rec = {
  id: 'canon-session-replay-20261007',
  claim:
    '阶段 3「阿巴阿巴回放」对照实验（2026-10-07，设计稿 §6）结论：**会话层在「摘要会失手」面上完胜，且零编造**。设计：材料＝马拉松 f362b992 的第二份官方压缩摘要（12,863 字，turn 21 生成）+ 真实后续事件；题组＝10 题（5 常规＋5 失手，逐条验证「摘要缺失 × 会话层可捞」）；执行＝A/B 两个全新子代理（A 仅摘要、禁用工具；B 摘要＋只许 session lookup）；阅卷＝第三子代理盲评。**结果：B 18/20 vs A 9/20；失手题面 B 9/10 vs A 0/10（A 全部诚实弃权）；编造双方均为 0；B 十题全带检索依据（优先路径 100%）；成本 B≈30 次检索＋2.3× 作答体量**。边界（如实）：回放≠现场、单跑 n=2、题面偏细节/原话/指针面（有意）；常规题 A 仅差 1 分——**摘要保叙事层、会话层保细节层，互补非替代**。材料与报告：`research\\session-replay-20261007\\`（question-sheet.md / run-A.md / run-B.md / report.md）。',
  source: {
    type: '复现',
    ref: 'research\\session-replay-20261007\\report.md（含逐题评分与边界说明）'
  },
  last_reviewed: '2026-10-07',
  event_time: '2026-10-07',
  tags: ['会话层', '实验', '回放', '摘要失手', '对照', '阶段3']
};

const existing = new Set(loadStore('canon').records.map((r) => r.id));
if (existing.has(rec.id)) console.log('已存在，跳过：' + rec.id);
else { appendRecord('canon', rec); console.log('已追加 [canon] ' + rec.id); }
