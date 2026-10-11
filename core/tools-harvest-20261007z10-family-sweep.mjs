// akasha/tools/harvest-20261007z10-family-sweep.mjs
// 2026-10-07 留痕：阿卡夏本体「同族举一反三」修复批 → spin 链 r7 + usage 链（注入文本）更新。幂等。
import { loadStore, revise, currentRecords } from '../lib.mjs';

const SPIN_APPENDIX =
  ' **同族举一反三（阿卡夏本体，2026-10-07）**：把小阿卡夏五类错误照向本体，抓出并修复 5 处——① **hooks 输出审计死路**（`revision` 逐帧递增被当重置信号 ⇒ 每 chunk 清空、output-audit/usage **恒 0**——「库引用使用计数」实际从未落线）→ 1.2.0 按 attemptId 连续累积；② **计分聚合漏洞**（多 token 弱回退叠加可越 1，违背「≥1 ⟺ 整词命中」承诺）→ 记录级 min(Σ回退,0.9)；③ **gate 误拦**（`=>{` 命中旧重定向规则——只读探针命令被拒实证）→ 排除箭头/`2>&1`；④ **sleep 死代码**（`source===\'compact\'` 永不成立）；⑤ `price --apply-id` 只收当事版本（与 revise 语义不一致）→ 接受链上任意版本。方法论：五类错误（采样盲区/宿主假设/信号真值/字段补全/stale-read）+ 夹具失真类逐插件核宿主真值。全绿：三插件自检 + 主套件 76/1（唯一红=并行会话跨 node 项）。报告 `research\\akasha-family-review-20261007.md`。';

const USAGE_APPENDIX =
  '\n**2026-10-07 同族复查（阿卡夏本体）**：① hooks **1.2.0**——输出审计改按 `attemptId` 连续累积（官方 revision 逐帧递增；修复前 output-audit/usage 恒 0——「库引用使用计数」此前实际未落线）；② 检索计分改**记录级口径**（Σ整词 ×1 + min(Σ回退, 0.9)）——「命中分 ≥1 ⟺ 至少一次整词命中」对多词查询也恒真；③ `price --apply-id`（CLI/MCP）接受链上任意版本（同 revise 语义）；④ gate **1.2.0**——命令写判定排除 JS 箭头 `=>` 与 `2>&1`（修只读探针误拦）；⑤ sleep **1.5.1**——移除死代码 `source===\'compact\'`。全部 restart-required。';

let changed = 0;
for (const [anchor, appendix, guard, label] of [
  ['canon-spin-loop-frontier-20261007', SPIN_APPENDIX, '同族举一反三（阿卡夏本体', 'spin'],
  ['canon-akasha-usage', USAGE_APPENDIX, '同族复查（阿卡夏本体）', 'usage']
]) {
  const tips = currentRecords(loadStore('canon').records);
  const tip = tips.find((r) => r.id === anchor || r.id.startsWith(anchor + '-r'));
  if (!tip) { console.log('未找到链尾：' + anchor); continue; }
  if (tip.claim.includes(guard)) { console.log('已含目标段，跳过：' + label + ' ' + tip.id); continue; }
  const r = revise('canon', tip.id, { claim: tip.claim + appendix });
  changed += 1;
  console.log('已修订：[' + label + '] ' + tip.id + ' → ' + r.id);
}
console.log('完成：修订 ' + changed + ' 条。');
