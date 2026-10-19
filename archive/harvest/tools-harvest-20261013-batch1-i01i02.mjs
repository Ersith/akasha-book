// akasha/tools/harvest-20261013-batch1-i01i02.mjs —— 总案 v1.1 批次 1 首批（I-01 + I-02）落地记录 + 两个检查批教训（幂等）
import { loadStore, currentRecords, appendRecord } from './lib.mjs';

const have = (prefix) => currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith(prefix));

if (have('canon-akasha-batch1-i01i02-20261013')) console.log('= 批次 1 记录已存在');
else {
  const r = appendRecord('canon', {
    id: 'canon-akasha-batch1-i01i02-20261013',
    claim:
      '**总案 v1.1 批次 1 首批落地（2026-10-13 晚；I-01 + I-02）**——按「先起数据、零风险」开工序执行。' +
      '**① I-01 复审到期清单原型（C 线 A.2）**：`lib.reviewDue()`＝把 `frontier due` 泛化到全库——口径「信任级 × 时龄」：' +
      '核心（T1 复现 / T2 实验，及渲染进提示的条目＝用法条 + 自我层）30 天；一般（T3–T5）90 天；其余兜底年审 365 天；' +
      '时龄锚 = last_reviewed → event_time → logged_at → created，无锚进 undated（如实三分，不静默）；只读、**只报不裁**（audit 里为 info 级）。' +
      'CLI＝`node akasha.mjs audit --due`（`--today` 可模拟）。验收：真库首跑＝扫描 415 · 到期 0（库龄 7 天未越档）· 无日期锚 15；' +
      '模拟 `--today 2026-11-20` ⇒ 到期 289、清单可人工核。' +
      '**② I-02 查询监控采集（C 线 B.1）**：侧线 `logs/query-log.jsonl`（字段：ts / via / cmd / query / hits / zero / ms / session / genre_render / ids）——' +
      '`recordQuery()` 任何失败静默（ok:false 回执，**绝不碰主流程**）；四入口接线（lookup / recall / brief / cross；multiRecall 内层防双记；' +
      '盲区地图与渐进检索＝批量探测不落线）；环境变量 `AKASHA_QUERY_LOG=off` 关断（自测防污染真日志）。' +
      '`metrics.queries`＝零结果率 / 高频 top / 平均耗时 / 命中被引用率 / 会话号覆盖；**样本 < 5 或 usage 线为空 ⇒ null（不冒充）**。' +
      '**字段口径（吸收 Claude 复审第 3 条）**：session 尽力而记（宿主当前不给子进程传会话号——bash 环境实测无 DSH_*，先记 null、用 ts 对 hooks 工具线归因）；' +
      'genre_render 恒 false 至 I-11 落地（为「召回差 vs 剥皮过度」留分辨位）。' +
      '**③ 附带**：总案升 v1.1（§6 吸收 Claude 五条微调：I-11 验收加「反思路径仍可取原文」/ I-12 自动续行单独开关默认关 / I-07 先 5–8 对影子集 / I-09 字段先只写）；' +
      'README 与用法同步；测试 207/207（新增 5 条：I-01×2 + I-02×3，含「能红」与「不误伤」两侧）。' +
      '**边界**：MCP 面（mcp.mjs）是宿主启动期 spawn 的子进程 ⇒ 新代码要等下一次桌面端重启才带；CLI 面即时生效。',
    source: { type: '复现', ref: 'research/akasha-master-plan-v1-20261013.md §6 + akasha/test.mjs I-01/I-02 用例 + 活体验收（audit --due / lookup 门控 / metrics）' },
    event_time: '2026-10-13',
    last_reviewed: '2026-10-13',
    tags: ['I-01', 'I-02', '批次1', '复审', '查询监控', '落地'],
  });
  console.log('已入 canon：' + r.id);
}

if (have('canon-trap-fixture-today-timebomb-20261013')) console.log('= 时间炸弹教训已存在');
else {
  const r = appendRecord('canon', {
    id: 'canon-trap-fixture-today-timebomb-20261013',
    claim:
      '**坑·夹具时间炸弹（2026-10-13 实发；测试卫生）**：`#19 rollback --batch` 用例本月 12 日写、13 日必红——' +
      '夹具把修订版 `logged_at` **写死**成 `2026-10-12T10:00:00Z`（写用例那天），而 `rollbackBatch` 默认 day＝**UTC 当日**；' +
      '次日跑 ⇒ 筛不到「今天新增的修订」⇒ 计划空 → 断言红（库无缺陷，是用例过期）。' +
      '**修法**：夹具取运行时时刻（`new Date().toISOString()`）——被测语义就是「今天」，夹具必须跟着今天走。' +
      '**判据（举一反三）**：凡「默认按当日 / 现在筛」的接口（rollbackBatch 类），其夹具**不得**写死绝对日期；' +
      '要么运行时取刻、要么显式传 `today/since`。同类扫描结论：本库其余用例均显式传 today/now（`audit({today})`、`frontierDue(\'2026-10-08\')`、' +
      '`sleepPlan({now})` 等）⇒ 独苗已清。**代价提醒**：时间炸弹潜伏期 1 天、表现为检查器假红 ⇒ 狼来了风险，发现即修。',
    source: { type: '复现', ref: 'akasha/test.mjs #19（修复前红/修复后绿）+ akasha/lib.mjs rollbackBatch 默认 day 语义' },
    event_time: '2026-10-13',
    last_reviewed: '2026-10-13',
    tags: ['坑', '测试', '夹具', '时间', '能红'],
  });
  console.log('已入 canon：' + r.id);
}

if (have('canon-checker-quiet-must-not-swallow-20261013')) console.log('= 静音口径已存在');
else {
  const r = appendRecord('canon', {
    id: 'canon-checker-quiet-must-not-swallow-20261013',
    claim:
      '**坑·检查器静音不得吞失败（2026-10-13，family-sweep --quiet）**：该工具头注写「--quiet＝只报结论行」，' +
      '实现却是所有输出走同一个 `say()`（quiet 时全部静默）⇒ 实跑只得到**裸退出码 1**、零信息，得整份重跑才看见哪项红（当晚实测）。' +
      '**修法**：拆 `loud()`——静音「过程」，**失败行（✗/⚠）与结论行永远出声**。' +
      '**原则**：检查器可以安静，**不能失聪**；静默失败的检查＝没检查（与「检测器要两侧自证」同族：可观测性就是检查器的一半）。',
    source: { type: '复现', ref: 'akasha/tools/family-sweep.mjs（--quiet 修复前后对照：裸退码 → 结论行 + ✗ 行）' },
    event_time: '2026-10-13',
    last_reviewed: '2026-10-13',
    tags: ['坑', '工具', '检查器', '可观测'],
  });
  console.log('已入 canon：' + r.id);
}
