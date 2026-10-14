// akasha/tools/harvest-20261015b-degeneration-samples.mjs —— 退化评测素材留痕
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-degeneration-samples-20261015'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  "**退化评测素材采集（2026-10-15 晨，用户令「变成评测素材」）**——思维链失稳（重复噪声）与「回复不出来」现象落为可复算数据；采集脚本 `akasha/tools/degradation-stats.mjs`（hooks.jsonl 实况重算），数据表 `dist/degeneration-eval-20261015.md`。",
  "**三档对照**（轮数/maxTurn/**压缩次数**/**工具次数**/索引段/窗口）：① 超级长会话 `7fe8ec84`——410/418/**17**/3325/15998/5.5d（10-10 起体感退化，压缩保留率 63%→53.7%，末次 44%）；② **本会话 `0fd706f7`**——60/60/**7**/1719/7250(+旧代 4204，已在 Q06 后归一)/1.2d（**明面失稳：3 实例**——思维噪声×2 + 回复不出来×1，均在 07:00 前后、第 7 次压缩后 ~2 轮内）；③ 短会话对照（59 轮/2 压缩、25 轮/1 压缩）——无退化报告。全库 70 会话汇：794 轮/31 压缩/9287 工具。",
  "**候选假设（记录未验证）**：① **每轮压缩率**（压缩/轮）比绝对轮数更相关——17/410=4.1% vs 7/60=11.7%，后者更小样本却更早失稳；② **用户的补充假设（2026-10-15）**：**阿卡夏工具调用密度**（本会话 1719/60 ≈ **28.7 工具/轮**，为全库最高之一）也可能是因素——大量工具往返 + 每轮注入（runtime context / 脉搏行 / 提醒）或构成「上下文高频扰动」；此假设与 ① 并列待验。**环境注记**：本会话期间插件重装/重启 2 次、r34 协议精简上线（每轮省 ~2.8k tok）、上下文被裁紧。",
  "**评测可用性**：四类字段（轮/压缩/工具/段）全部可由 hooks.jsonl 重算（脚本可复跑）；两个采样点属同一退化谱系（不同会话、不同规模）。",
].join('');
const r = appendRecord('canon', {
  id: 'canon-degeneration-samples-20261015',
  claim,
  source: { type: '复现', ref: 'akasha/tools/degradation-stats.mjs · logs/hooks.jsonl 39,594 行 · dist/degeneration-eval-20261015.md' },
  event_time: '2026-10-15',
  last_reviewed: '2026-10-15',
  tags: ['退化', '评测素材', '思维链', '压缩', '长会话', '观测'],
});
console.log('已入 canon：' + r.id);
