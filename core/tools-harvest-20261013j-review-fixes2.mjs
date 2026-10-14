// akasha/tools/harvest-20261013j-review-fixes2.mjs
// 2026-10-13 深夜：复查补齐②（mirror_match 叙事剥皮）追加进 P0 修订链（r1 → r2）。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const cur = () => currentRecords(loadStore('canon').records);
const p0 = cur().find((r) => String(r.id).startsWith('canon-genre-p0-20261013'));
if (!p0) { console.log('未找到 canon-genre-p0-20261013'); process.exit(1); }
if (String(p0.claim).includes('复查补齐②')) console.log('= 已含复查补齐②，跳过：' + p0.id);
else {
  const r = revise('canon', p0.id, {
    claim: String(p0.claim) +
      ' **【r2 · 复查补齐②：mirror_match 纳入剥皮面】**——`mirror` 五元组（situation/behavior/outcome/social_reaction/emotion）＋ `story` / `patterns` ＝**叙事正文**（文体回声最直接的面之一）⇒ `lib.mirrorMatch()` 默认剥皮（`opts.reflect` 反思通道给原文）；CLI `mirror match` 加 `--reflect`；MCP `akasha_mirror_match` 入剥皮面 + `reflect` 参数。**真库活体**：mirror 现状 `卡住 --limit 1` 默认/反思均 **0** 符号（现库条目本就无完成态符号 ⇒ **零误伤**实证）。测试 **218/218**。**同类边界（仍未剥，登记在案）**：`summary`（各库最近 3 条主行 ×160 字）· `kit.history`（≤3×100 字）· `conflict` / `diff`（诊断对照视图）——待需要时再议（都有体量上限，另有 `--reflect` 通道可对照）。',
    last_reviewed: '2026-10-13'
  });
  console.log('已修订：' + p0.id + ' → ' + r.id);
}
