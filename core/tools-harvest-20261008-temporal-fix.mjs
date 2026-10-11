// 2026-10-08：① 更正备忘分流条目（补上"todo-board 是今天 13:49 刚装的"）；② 立一条「时间邻近度检索」纪律。
import { appendRecord, loadStore, currentRecords, revise, allIds } from '../lib.mjs';

const FIX_ID = 'canon-memo-routing-20261008';
const NEW_ID = 'canon-temporal-proximity-retrieval-20261008';

const report = [];
const all = allIds(loadStore('canon').records);

// ① 更正：把"本 profile 现无真正的备忘插件"这句含糊话换掉，并写明安装时点
if (all.has(FIX_ID)) {
  const cur = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith(FIX_ID));
  if (cur && !String(cur.claim).includes('13:49')) {
    const r = revise('canon', FIX_ID, {
      claim: '备忘分流约定（2026-10-08 用户裁定）：**交办/待办类备忘一律登记进 `dsh-todo-board`**——它就是我们那个「全局备忘录」：跨会话、按工作目录分组、每条可写备注（note 里写清验收标准与前置条件）、右上角浮窗常驻。**该插件是 2026-10-08 13:49 当天刚装的**（管理员装完不久即用上；同日 14:42 还装了 better-sidebar）。长文正文另存项目内 `MEMO-<主题>-<日期>.md`，并在 canon 立指针条目（如 canon-scene-lora-resume-20261008）。判定：凡"未来某会话要照着做"→ 板上一条（含 note）；凡"要读的正文/上下文"→ 项目内 .md ＋ canon 指针。',
      last_reviewed: '2026-10-08',
    });
    report.push('已更正 ' + FIX_ID + ' → ' + r.id);
  } else report.push('跳过（已含时点） ' + FIX_ID);
}

// ② 新纪律：模糊指代先按时间线检索
if (all.has(NEW_ID)) report.push('跳过（已存在） ' + NEW_ID);
else {
  appendRecord('canon', {
    id: NEW_ID,
    claim: '检索纪律·时间邻近度（2026-10-08 立，源自一次实际失误）：用户用**模糊指代**（「我们装的那个插件」「刚搞的那个东西」）时，**先按最近事件的时间线找**——最近安装（profile 依赖与 node_modules 的创建时间、_scratch/*-precheck、_rollback-<日期>-* 留痕）、最近决策（canon 里近几日的条目）、最近变更——**再按名字/关键词匹配**。依据：库的排序四因子本就含**时间坐标**（分类 + 严重度 × 可信度 × 复杂度 + 时间），相关性随事件时间邻近而升高。反面样本：2026-10-08 用户说「给到我们安装的全局备忘录插件」时，我只按包名搜 memo/note（自然落空），漏掉了**当天 13:49 刚装**、名字里没有关键词的 `dsh-todo-board`；正确路径是查"最近装了什么"。',
    source: { type: '复现', ref: '证据链：profiles/desktop/node_modules/dsh-todo-board 创建时间 2026-10-08 13:49 + package.json 改动 14:54 + _scratch/todo-board-precheck（13:49）+ 用户 2026-10-08 指正原话「按逻辑来说以时间线越近的相关事件的关联性越高」' },
    last_reviewed: '2026-10-08',
    event_time: '2026-10-08',
    tags: ['检索纪律', '时间邻近度', '排序因子', '模糊指代'],
  });
  report.push('已追加 ' + NEW_ID);
}

console.log(report.join('\n'));
