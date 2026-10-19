// akasha/tools/harvest-20261008z27-ctx-efficiency.mjs
// 2026-10-08 留痕：上下文效率对照观察（用户提出，当场取证）。幂等。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';

const ID = 'canon-ctx-efficiency-20261008';
const existing = currentRecords(loadStore('canon').records).find((r) => r.id === ID || r.id.startsWith(ID + '-r'));
if (existing) { console.log('已存在，跳过：' + existing.id); process.exit(0); }

const claim =
  '上下文效率对照观察（2026-10-08 用户提出，当场取证）：会话 `7fe8ec84`（进行中；85 轮 / 844 步 / 上下文 325k / **官方压缩 5 次** / 档案 10.5MB / 「起床包」注入命中 122）对 `59f3a538`（4.1pro 话题；56 轮 / 490 步 / 607k / **压缩 1 次** / 4.0MB / 19）。每步上下文：≈0.39k vs ≈1.24k（约 3.2×）。**判定：数字方向支持「上下文利用效率提升」，但不能单独归因阿卡夏**——最大的机械杠杆是压缩次数差（5 vs 1；官方 compaction，压力触发），两会话同为 deepseek-flash，任务类型不同（插件运维链 vs 话题讨论），非受控 A/B。阿卡夏的真实助攻三层：① 细节外置（会话层 + 六库，按需检索，ReadAgent 同构 3.5–20× 有效上下文）；② 压缩兜底（压缩掉的历史会话层可回捞——「阿巴阿巴」回放 9/10 对官方摘要 0/10；压缩事件行=观测 compaction/end 真值）；③ 查询纪律（轻查动作率、结论优先，少复述少重读）。**明确否证一条记忆**：「睡眠蒸馏帮了会话再压缩」不成立——睡眠只把日志蒸到库（canon/orphan/inbox），不触会话上下文；直接压缩者=官方 compaction。附：对表条目 canon-compaction-vs-akasha-20261007（同题同解、四轴全异）。探针：`_scratch/ctx-compare-20261008.mjs` / `ctx-compare2-20261008.mjs`（只读）。';

const r = appendRecord('canon', {
  id: ID,
  claim,
  source: { type: '复现', ref: '会话档案实测：session-7fe8ec84（85轮/压缩5次）vs session-59f3a538（56轮/压缩1次）；探针脚本 _scratch/ctx-compare-20261008.mjs、ctx-compare2-20261008.mjs（2026-10-08）' },
  last_reviewed: '2026-10-08',
  event_time: '2026-10-08',
  tags: ['上下文', '压缩', 'compaction', '效率', '观察', '阿卡夏'],
});
console.log('已写入：' + r.id);
