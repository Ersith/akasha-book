// akasha/tools/harvest-20261013e-batch1-i07i17.mjs
// 2026-10-13：批次 1 收尾——I-07 检索回归套件（影子集）落地 + I-17 写侧体裁试行留痕。幂等。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';

const have = (prefix) => currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith(prefix));

if (have('canon-akasha-batch1-i07-20261013')) console.log('= I-07 记录已存在');
else {
  const r = appendRecord('canon', {
    id: 'canon-akasha-batch1-i07-20261013',
    claim:
      '**总案 v1.1 批次 1 收尾：I-07 检索回归套件（影子集版）落地（2026-10-13）**——`akasha/tools/recall-regression.mjs`。' +
      '**口径**：ground-truth 对＝「真实查法 → 该命中的条目」；当前 **影子集 8 对**（源自真实坑与真实事件：edit 上下文失配 / read offset 越界 / pwsh 内联 JS / 引号转义 / WSL 变量前缀 / JSON 双引号 claim / 读取二进制 UTF-16 / 夹具时间炸弹），**正式 20–30 对等 Master 标完后扩**（标数据不阻塞套件）。' +
      '**判定**：命中按**链根**归一（`-rN` 与 `-rNsr` 两态），要求进 top10；`--selftest` **自证「断言可红」**（构造对子必须被判红，否则套件失效——同「检测器两侧自证」纪律）；`--json` 可机读；**queryLog:false——机器检查不落查询侧线**（与 health-check 同口径）。' +
      '**首跑实录（含一处自捉 bug）**：7/8 —— 「引号 转义 shell」报「未命中」，查得**链根归一写窄**（只认 `-r\\d+$`，认不出库里 `-r2sr` 后缀的当前版），实为第 1 位命中 ⇒ 假红；已修 `recall-regression.mjs` 与 `lib.chainView`（同族两处），复跑 **8/8 全过 + 自证可红（exit 0）**。' +
      '**边界（如实）**：影子集为自建（非 Master 标）——先保证「套件可跑、断言可红、不污染侧线」；**未接入 family-sweep**（后置，批次 2 候选）。',
    source: { type: '复现', ref: 'akasha/tools/recall-regression.mjs + 首跑/复跑输出 + akasha/lib.mjs chainView 归一修正' },
    event_time: '2026-10-13',
    last_reviewed: '2026-10-13',
    tags: ['I-07', '批次1', '检索回归', '影子集', '落地'],
  });
  console.log('已入 canon：' + r.id);
}

if (have('canon-genre-writeside-trial-20261013')) console.log('= I-17 试行已存在');
else {
  const r = appendRecord('canon', {
    id: 'canon-genre-writeside-trial-20261013',
    claim:
      '**写侧体裁规范·本批试行留痕（2026-10-13，批次 1 / I-17）**——规范本体＝`genre-write-side-discipline-20261013.md`（A 类高频回读限符号 ≤2/段、结论与叙事分段、禁汇报体；B 类可符号、建议分段；C 类无约束；**不追溯改旧条目**）。' +
      '**本批实测（一次性密度观测，脚本 `tools/genre-density-20261013.mjs`）**：6 条新条目均属 **B 类**（⇒/✓ 0–4 处、无「好。」、按 ①②③ 分段惯例）；**注入面 A 类**＝用法条 r27（15 段 / 符号 1 处）——**未超限**。' +
      '**技术校验（密度自检）按计划留批次 2**（v0 冻结期）；本条是「习惯层执行」的留痕，**蒸馏侧试行随下一次蒸馏观察**（睡眠产出的素材按同规范分级写作）。**边界**：本批条目以叙事/记录型为主，规范的实际压力面（高频回读长条目）尚未出现——留待命中时检验。',
    source: { type: '复现', ref: 'research/genre-write-side-discipline-20261013.md + tools/genre-density-20261013.mjs 输出 + 本批 canon 条目' },
    event_time: '2026-10-13',
    last_reviewed: '2026-10-13',
    tags: ['I-17', '批次1', '写侧体裁', '试行'],
  });
  console.log('已入 canon：' + r.id);
}
