// akasha/tools/harvest-20261014ak-gpt-r2-batch-a.mjs —— GPT 复核二轮·第一批修复留痕（R6/R7/R8）
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-gpt-review2-20261014-a'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  "**GPT 复核二轮（对合并前快照 `19d1923`）· 第一批修复（2026-10-14）**。**背景**：GPT 对 v2 复核包独立复检——主套件 239/239 与插件自测全过、但边界用例确认 16 项待修（6 项优先）；其采样为**合并前**快照，本轮在**合并后基线**（`b56f551`）上逐项**独立复现**（作者不自证——外部结论同样需自证）。",
  "**已修 3 项（均先复现确认为真）**：**R7 分页漏普通记录**（原实现「剩余不足即跳过、继续装后面」⇒ 页 1 出 A/C、游标越过 B，B 在续取里**永远拿不到**；修法：`trim` 区分「单条≥整页可用额度⇒跳过（--full 可取）」与「装得下但本页剩余不足⇒**停**（留续取页）」——不漏优先；复现夹具机械搜索 B 尺寸（独页可装、首页剩余不足）→ 修后页 1=[A]、next=1、页 2=[B] ✓）。**R8 账实对齐整响应**（used 改为「**除 budget 自身外整响应**序列化」口径——大 stats/report 场景此前差 ~850 tok（她复算 9178 vs 8328）；修后残差=budget 本体（hint ~78 tok，自指极限）✓）。**R6 退役链拒 rollback 复活**（复现：revise→retire→rollback ⇒ current 出现 `…-r1r1`、墓碑形同虚设；修法：rollbackBatch 候选链若被墓碑 `retires` 命中（根或任意版本）⇒ `refused:'retired'`——恢复须走**明确操作** revokeRetire ✓）。**三项均入守卫测试**（+1 块，机械搜索夹具 + 计划断言 + current 断言）。",
  "**验证**：套件 **247→248** 全绿（含把 golden 的「budget 账面」从「内容零差」剥离——账面数值随预算算法演进，单列「预算须启用」断言）；**待续**：R1 合并语义（成功经验 vs 失败边界仍可并）、R2 分批 merge 撤销不完整、R3 回执写失败后的恢复、R4 会话交错提示串扰、R5 宿主事件参数（session, event）两参签名——下批逐个复现修。",
].join('');
const r = appendRecord('canon', {
  id: 'canon-gpt-review2-20261014-a',
  claim,
  source: { type: '复现', ref: 'tmp/gpt-r2-repro*.mjs（R6/R7/R8 复现与修复复跑）· akasha/lib.mjs（trim 停语义/账实整响应/退役链 guard）· test 248/248' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['外部审查', 'GPT', '复核二轮', 'R6', 'R7', 'R8', '修复'],
});
console.log('已入 canon：' + r.id);
