// 2026-10-08：把「基石分层规则」立成 canon —— 用户裁定：frontier 只收来源可靠、有学术或前沿背景的组织之论文/文献；
// 教程 / 工具 / 文档属「半年~一年复核」的慢知识，入 canon（last_reviewed 为慢周期锚），不进 frontier。
import { appendRecord, loadStore, currentRecords, allIds } from '../lib.mjs';

const REC = {
  id: 'canon-frontier-tiering-rule-20261008',
  claim: '基石分层规则（2026-10-08 用户裁定，长期适用）：**frontier（基石）只收来源可靠、有学术或前沿背景的组织之论文/文献**（期刊、会议、arXiv、机构技术报告）；**教程、工具文档、第三方仓库、ComfyUI 节点页这类属「半年~一年才需复核」的慢知识，入 canon**（canon 的 `last_reviewed` 就是慢周期复核锚，必要时用 tags 标「工具/指南/文献结论」），不得占用 frontier。判定口径：问「这是组织产出的研究/前沿文献，还是给人照做的说明？」——后者一律 canon。已按此规则把 4 条工具/教程条目从 frontier 退役（`retire` 原语）并转入 canon。镜像到用法条目 ⑦（canon-akasha-usage-r22）。',
  source: { type: '共识', ref: '用户 2026-10-08 裁定原话：「基石的范畴应该是只有来源可靠，有学术背景或者前沿背景的组织的论文或者文献。教程应该算我们之前讨论的那种一年或者半年才需要更新的知识库」+ 实作记录 tools/retire-20261008-non-academic-frontier.mjs' },
  last_reviewed: '2026-10-08',
  event_time: '2026-10-08',
  tags: ['akasha', '基石分层', 'frontier', 'canon', '规则'],
};

const existing = new Set(allIds(loadStore('canon').records));
if (existing.has(REC.id)) console.log('跳过（已存在） ' + REC.id);
else { appendRecord('canon', REC); console.log('已追加 [canon] ' + REC.id); }
