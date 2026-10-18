// 2026-10-08：把「备忘分流约定」立成 canon —— 用户裁定：这类整理好的备忘应交给已安装的「全局备忘录」面板，
// 而不是只落在项目内的 .md 文件里（"既然我们有就可以用"）。
import { appendRecord, loadStore, allIds } from './lib.mjs';

const REC = {
  id: 'canon-memo-routing-20261008',
  claim: '备忘分流约定（2026-10-08 用户裁定）：**交办/待办类备忘一律登记进 `dsh-todo-board`（跨会话 TODO 板——本机唯一"全局可见 + 跨会话 + 每条带备注"的面板插件；条目可按工作目录分组，支持 note 写清验收标准与前置条件）**；长文正文另存项目内 `MEMO-<主题>-<日期>.md`，并在 canon 里立一条指针条目（如 canon-scene-lora-resume-20261008）。判定：凡"未来某会话要照着做"的事 → 板上一条（含 note）；凡"要读的正文/上下文" → 项目内 .md + canon 指针。注意：本 profile 已装插件里**没有**名字叫 memo/note 的包（33 个 deps 逐个核过），dsh-todo-board 就是那个"全局备忘录"位；若日后装了真正的备忘插件，本条应改为指向它。',
  source: { type: '共识', ref: '用户 2026-10-08 原话「这种你应该整理了以后给到我们安装的全局备忘录插件。既然我们有就可以用。」+ 实作：todo_board add 三条（86d00259 / b3e03ee3 / 70a82108，目录 D:\\ClaudeWorkspace\\sekali-lab）' },
  last_reviewed: '2026-10-08',
  event_time: '2026-10-08',
  tags: ['备忘分流', 'todo-board', '约定', '交接'],
};

const existing = allIds(loadStore('canon').records);
if (existing.has(REC.id)) console.log('跳过（已存在） ' + REC.id);
else { appendRecord('canon', REC); console.log('已追加 [canon] ' + REC.id); }
