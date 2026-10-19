// akasha/tools/harvest-20261013d-batch1-diag-docs.mjs
// 2026-10-13：批次 1 第二批——I-03/I-04 落地记录 + I-05/I-06 成文记录 + 用法条 ㉓（受控路径 allowProtocol）。幂等。
import { loadStore, currentRecords, appendRecord, revise } from './lib.mjs';

const cur = () => currentRecords(loadStore('canon').records);
const have = (prefix) => cur().some((r) => String(r.id).startsWith(prefix));

// ① I-03 / I-04 落地
if (have('canon-akasha-batch1-i03i04-20261013')) console.log('= I-03/I-04 记录已存在');
else {
  const r = appendRecord('canon', {
    id: 'canon-akasha-batch1-i03i04-20261013',
    claim:
      '**总案 v1.1 批次 1 第二批落地（2026-10-13 晚；I-03 + I-04）**——两条只读诊断工具，一并补齐「库变了什么」与「哪里有矛盾」两个视图。' +
      '**① I-03 记忆 diff（B 线 P1-①）**：`lib.memoryDiff()` 对比任意两时点（窗口按日、含两端）：分类 **新增（链根）/ 修订（附与前一版的变化字段）/ 退役（墓碑）**；' +
      '轴＝`logged_at`（何时被写/被改），缺戳回退 `event_time`，两无 ⇒ 入 **undated**（如实三分——「未知 ≠ 没变」）；`--store` 可单库。CLI＝`node akasha.mjs diff [--since D] [--until D] [--store S]`。' +
      '验收（活体）：对 2026-10-13 跑出「canon 新增 44 · 修订 8 · 未定年 40」，修订逐条列出变化字段（如 `canon-akasha-usage-r26 ← r25 改：claim、last_reviewed`）。' +
      '**② I-04 矛盾显现（B 线 P1-②）**：`lib.chainView(id)`＝**修订链对比视图**（任意版本 id 或链根 id 均可定位；墓碑进链；逐步标变化字段）；' +
      '`lib.conflictReport(输入)`＝ id 模式（链视图 + 涉该链的冲突候选）/ 主题模式（**全库扫描 detectConflicts → 再按相关性过滤**，避免只在前 20 对里碰运气）；**只提示不裁决、同题多源不合并**（承 #18 口径）。' +
      'CLI＝`node akasha.mjs conflict <id|主题词> [--top N]`。验收（活体）：`conflict canon-akasha-usage` 出 27 版链（逐步变化字段）；`conflict 门控` 出冲突候选 5 对（含「作废侧」标记）；退役链样例 `mirror-ghost-citation-r8` 正确显示墓碑与退役态。' +
      '**③ 口径**：两件都是**只读**（不写库、不裁决）；`0 候選 ≠ 无矛盾`（机械对照只到词法层）写明在输出里。测试 210/210（新增 3 条：diff 分类/窗口/未定年 + 链视图 + 冲突候选两侧）。',
    source: { type: '复现', ref: 'akasha/lib.mjs（memoryDiff / chainView / conflictReport）+ akasha.mjs（diff / conflict 子命令）+ 活体验收输出 + akasha/test.mjs I-03/I-04 用例' },
    event_time: '2026-10-13',
    last_reviewed: '2026-10-13',
    tags: ['I-03', 'I-04', '批次1', '诊断工具', '落地'],
  });
  console.log('已入 canon：' + r.id);
}

// ② I-05 排障四分法
if (have('canon-protocol-fourway-triage-20261013')) console.log('= 四分法已存在');
else {
  const r = appendRecord('canon', {
    id: 'canon-protocol-fourway-triage-20261013',
    claim:
      '**排障四分法成文（2026-10-13，批次 1 / I-05；源自综述 §7.7「答错先分四类」）**——落成 `akasha/PROTOCOL.md` §十一。' +
      '**核心判据**：「答不对 / 答不上」先**立事实**（哪句错、期望是什么），再把失败分到四条通路之一（**可并存**），四类依次为：' +
      '**① 检索错**（强命中为零 / 只走弱回退 / 该换词别名 / 被日期窗口排除——用 blindmap、lookup --trace、三分提示检定）；' +
      '**② 写漏**（committed=false 被吞 / 被校验拒 / 被睡眠退役移出当前集——用 negative 线、diff、conflict 检定）；' +
      '**③ 压缩丢**（会话层 ptr 回原档与压缩事件行检定；官方摘要是背景不是真源）；' +
      '**④ 推理错**（citeAllowlist 外 id＝无据＝零编造红线；计数/权重/前提自洽性检定）。' +
      '**纪律**：先查库、后定类；先证伪再前进；每次排障留痕「哪类 + 证据 + 处置」——这份留痕同时是「失败回查」的数据源（喂 C2 可预防口径与观察台账）。',
    source: { type: '复现', ref: 'akasha/PROTOCOL.md §十一（2026-10-13 立；批次 1 / I-05）+ research/akasha-memory-optimization-20261013.md P1-④' },
    event_time: '2026-10-13',
    last_reviewed: '2026-10-13',
    tags: ['纪律', '排障', '方法论', 'I-05', '批次1'],
  });
  console.log('已入 canon：' + r.id);
}

// ③ I-06 写路径自检清单
if (have('canon-writepath-checklist-20261013')) console.log('= 写路径清单已存在');
else {
  const r = appendRecord('canon', {
    id: 'canon-writepath-checklist-20261013',
    claim:
      '**写路径自检清单成文（2026-10-13，批次 1 / I-06；手动版）**——落成 `akasha/PROTOCOL.md` §十二。四步：' +
      '**① 规范化**（日期 YYYY-MM-DD、id kebab、同名统一写法）；' +
      '**② 先查后写去重**（同条 ⇒ revise 追加不改原文，不写第二条；有意多源 ⇒ 保持多源 + relates_to 挂钩且目标须存在）；' +
      '**③ 来源态与优先级**（source.type 标对 + ref 写清；tags/severity/情绪按需）；' +
      '**④ 落笔后**（看 committed；跑 check；新链补 last_reviewed——复审到期清单要用）。' +
      '**与 I-17 的分工**：I-06 管「写入操作卫生」，I-17 管「文体体裁」（符号密度/分段/禁汇报体）；蒸馏与手动写入前各过一遍。**试行**：自本批起蒸馏与手动写入按此过一遍（试行中再修）。',
    source: { type: '复现', ref: 'akasha/PROTOCOL.md §十二（2026-10-13 立；批次 1 / I-06）+ research/akasha-memory-optimization-20261013.md P1-⑤' },
    event_time: '2026-10-13',
    last_reviewed: '2026-10-13',
    tags: ['纪律', '写路径', '清单', 'I-06', '批次1'],
  });
  console.log('已入 canon：' + r.id);
}

// ④ 用法条同步（受控路径）
const usage = cur().find((r) => r.id === 'canon-akasha-usage' || r.id.startsWith('canon-akasha-usage-r'));
if (!usage) { console.log('未找到用法条'); process.exit(1); }
if (usage.claim.includes('㉓ 批次 1 诊断与纪律')) console.log('= 用法条已含 ㉓，跳过：' + usage.id);
else {
  const r = revise('canon', usage.id, {
    claim: usage.claim +
      '\n**㉓ 批次 1 诊断与纪律（2026-10-13）**：`diff [--since D] [--until D] [--store S]` ＝ **记忆 diff**（I-03：新增 / 修订 / 退役 + 每步变化字段；未定年如实三分——「未知 ≠ 没变」）；' +
      '`conflict <id|主题词> [--top N]` ＝ **修订链对比视图 + 冲突候选**（I-04：任意版本 id 或链根 id 可查；机械对照、只提示不裁决、同题多源不合并）。' +
      '**排障四分法**（I-05）与**写路径自检清单**（I-06）已成文并入 `PROTOCOL.md` §十一 / §十二——答错先分「检索错 / 写漏 / 压缩丢 / 推理错」，写入前过四步卫生。',
    last_reviewed: '2026-10-13'
  }, { allowProtocol: true });
  console.log('已修订：' + usage.id + ' → ' + r.id);
}
