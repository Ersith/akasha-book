// 2026-10-14：题库两处修正（第 5 题全称口径 + 第 10 题库内可核）+ 轮报判词更正。幂等：判据＝单一常量。
import { loadStore, currentRecords, revise } from './lib.mjs';
const MARK = 'QUIZ-FIX-20261014';
const rec = currentRecords(loadStore('canon').records).find((r) => String(r.id).startsWith('canon-memory-test-round-1'));
if (!rec) { console.log('未找到轮报条目'); process.exit(1); }
if (String(rec.claim).includes(MARK)) console.log('= 已存在');
else {
  const tail = ' **【题库修正批·[QUIZ-FIX-20261014]】**（用户令「你看着来」后按序清账）：**① 更正本报告发现①（判错，如实翻案）**——「题库第 5 题期望出处与库内不符」**不成立**：canon-frontier-usage-20261007 **确含**两篇文献，但以**全称**出现（Calibrated **Language** Models Must Hallucinate / AbstentionBench）；原判系我方按缩写「Calibrated LMs」grep 所致 ⇒ **题库本身没错**，真实教训＝**缩写/全称检索不对齐**（抽考扣分仍成立：那是漏读/漏检，不是题错）。**② Q10 改口径**：「五大事件」原出处含库外 M9 回执 → 改为**答案均在库内可核**版本（换盘 canon-dsh-workspace-changes-temp-r1 · kit canon-akasha-kit · promote canon-akasha-promote · 修订链 canon-akasha-revise-supersedes · 静默失活 mirror-silent-deactivate-r3 ＋源头链 canon-akasha-origin-20261006-r1）。**③ 题库第 5 题**加注全称/缩写差（防再踩）。修正落 `MEMORY-TEST.md §三`（两行）＋本报更正段；第 2 轮抽考按新口径。';
  const r = revise('canon', rec.id, { claim: String(rec.claim) + tail, last_reviewed: '2026-10-14' });
  console.log('已更正：' + rec.id + ' → ' + r.id);
}
