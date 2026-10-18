// 2026-10-14：睡眠合并规则草案（只出草案，不动实现）入 canon。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
const MARK = 'SLEEP-MERGE-DRAFT-20261014';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-sleep-merge-draft-'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**睡眠合并规则草案 v0.1 交付（板条「睡眠合并」；2026-10-14；标记 [' + MARK + ']；只出草案、未动实现）**。',
  '**交付**：`research/sleep-merge-rules-draft-20261014.md`。',
  '**现状盘点（关键发现：一半早已建成）**：**merge 候选生成器已在 `sleep.mjs`**（同库当前集；reason near-duplicate；frontier 走 duplicate-url；带 evidence.jaccard 与近失报告 nearMiss 只读采样）；**卡点＝`--apply`/回滚/`revokes` 未实现**（SCHEMA §P4 已设计，原文「待本计划评审」）——本草案即那份评审依据。真库现状（今日计划）：merge×1 · discard×3。',
  '**规则草案 R1–R8 要点**：R1 候选域（同库＋同 source.type＋当前集；**豁免面**＝协议条/自我层/pricing/lexicon）；R2 θ=0.8 校准只能引用 nearMiss；**R3 执行两档**——A 档（默认）＝保留者**一字不动**＋吸收者**软退役墓碑**（`retired_reason: merged-into <keep>`），**不写 mergedText**、完全可逆；B 档（登记默认关）＝合成版＋`merged_from`＋逐条人工；**R4 keep 按代际**；R5 幂等＋`sleep-merge` 观测线；R6 审计落 review-log（verdict 合并）；R7 六条禁令；R8 入口 `sleep --apply/--revoke`（默认关、首批逐条确认、**当前集不逐行**比对验收）。',
  '**首例案例（真库唯一候选）揪出规则级必改点**：`canon-source-akasha-paper-v0-3-20261007` ← `…-v0-4-20261007`（jaccard 0.858）——人工判读＝**同一论文源头材料的两个代际**（属可合并类）；**但现管线 keep 恒取"最老"（v0.3）⇒ 会把现稿骨架埋掉** ⇒ R4（代际取最新、真重复取最早、不确定交人工）**必须先修再执行**。',
  '**三问留裁（给 Master）**：① A 档默认、B 档登记不启用？② R4 落实现（第一步）？③ 首批只处理机器可判代际的子集（本次 1 条）＋discard 三件是否同批？',
  '**边界**：纯文档，六库零改动、实现零改动；实现清单 8 条验收已随草案（fixture：keep 逐字不动/墓碑形状/当前集/幂等/回滚/豁免面拒执行/指纹过期拒执行/审计）。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-sleep-merge-draft-20261014',
  claim,
  source: { type: '复现', ref: 'research/sleep-merge-rules-draft-20261014.md · sleep.mjs（L353/472/524/557/598）· 计划 plan-d9aa98b74e7b3aa9 · SCHEMA §P4 revokes · 首例 v0.3/v0.4 人工判读' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['睡眠合并', '草案', '留裁', '合并'],
});
console.log('已入 canon：' + r.id);
