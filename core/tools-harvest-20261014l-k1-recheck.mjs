// akasha/tools/harvest-20261014l-k1-recheck.mjs
// 2026-10-14：K1 人工复检报告（发现并修复「单字 token 洪水」缺陷）+ K1 条目补指针 + usage 计分守卫同步。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord, revise } from './lib.mjs';
const MARK = 'K1-RECHECK-20261014';
const cur = () => currentRecords(loadStore('canon').records);

if (!cur().some((r) => String(r.id).startsWith('canon-k1-recheck-'))) {
  const claim = [
    '**K1 人工复检报告（用户令「先复检一下，别太依赖检测脚本」；标记 [' + MARK + ']）**。',
    '**交叉核验（独立于自家判定脚本，全过）**：① 原文逐字对账——`show --reflect` 输出 ⊃ 库内原文两段 60 字切片（无中间层改写）；② **独立客户端复核**——`tools/mcp-probe.mjs`（另一实现）实调 `akasha_show` 得全量 record（保真成立）；③ 默认 `show` ＝剥皮版原文（无 ⇒/✓）、`--reflect` 含符号（通道语义正确）；④ `query-log` 尾无探针污染（`AKASHA_QUERY_LOG=off` 纪律生效）；⑤ 门控在我一条含 data 写模式的命令上**如实拦截**（保护在工作，未绕过）。',
    '**发现 F1（真缺陷，已修）**：**单字 token 洪水**——`TOKEN_SPLIT_RE` 只按空白/顿号切，单字功能词（的/了/是）原样进计分；`matchParts` 整词按**出现次数**计分（设计如此），于是「的」×70 的长条目拿到 70 分——**任何自然中文查询带「的」都会把真命中挤出显示面**。实证：同一查询「也吃桌面端 pnpm」目标孤案 rank 5；尾加「的」→ 目标消失、显示面被「的」最多的条目（70/57/41…）填满；`lookup 的` 直接复现。**修法（最小）**：`matchParts` 中 **<2 字 token 不参整词**（返回 0）。',
    '**修复验收**：新增守卫用例（red→green）——主套件 **226→227**；**影子集回归 8/8**（计分改动不留伤）；活体复验：同一 ±「的」对照目标孤案归位 rank 5、`lookup 的` ＝「确定不知道」。',
    '**发现 F2（K2 线索解除）**：K1 首跑的信息项「orphan-mux08tvj 自取短语未进展示面（`--top 30` 也不露）」＝ **F1 的症状**（不是展示面截断）——修复后该查询正常命中。',
    '**发现 F3（工具改进，出自人工通读）**：k1-strict 覆盖轮转（先每库头 1 再中 1；修前 mirror/pricing/lexicon 会被前几库吃满名额而漏检）＋ 命中行滑窗 24→**32 字**步 4 ＋ 探针词纯化（去真词「nonsense/编造」——此前弱命中属设计行为被误红）⇒ 21→**25 检查项**、全绿。',
    '**纪律**：缺陷属「测试暴露缺陷才修」（冻结期允许）；usage 计分描述已同步（<2 字守卫）。',
  ].join('');
  const r = appendRecord('canon', {
    id: 'canon-k1-recheck-20261014',
    claim,
    source: { type: '复现', ref: 'tmp/k1-manual-recheck.mjs（逐字对账/污染检查）· tools/mcp-probe.mjs（独立客户端）· lookup ±「的」对照实证 · test 227/227 · recall-regression 8/8 · k1-strict 25/25' },
    event_time: '2026-10-14',
    last_reviewed: '2026-10-14',
    tags: ['K1', '复检', '缺陷修复', '计分', '人工复查'],
  });
  console.log('已入 canon：' + r.id);
} else console.log('= 复检条目已存在');

const k1 = cur().find((r) => String(r.id).startsWith('canon-k1-strict-20261014'));
if (k1 && !String(k1.claim).includes('复检补：')) {
  const r = revise('canon', k1.id, {
    claim: String(k1.claim) + ' **复检补：**人工复检（同日）另见 `canon-k1-recheck-20261014`——揪出并修复「单字 token 洪水」计分缺陷（<2 字 token 不参整词）；k1-strict 工具经改进后 25/25。',
    last_reviewed: '2026-10-14',
  });
  console.log('已补 K1 指针：' + k1.id + ' → ' + r.id);
} else console.log('= K1 指针已存在或未找到');

const usage = cur().find((r) => String(r.id).startsWith('canon-akasha-usage'));
if (usage && !String(usage.claim).includes('计分守卫')) {
  const r = revise('canon', usage.id, {
    claim: String(usage.claim) + ' **（2026-10-14 计分守卫）**：<2 字 token 不参整词——单字功能词（的/了/是）按出现次数计分会成**噪声洪水**（实测把真命中挤出显示面）；修复实证见 canon-k1-recheck-20261014。',
    last_reviewed: '2026-10-14',
  }, { allowProtocol: true });
  console.log('已同步 usage：' + usage.id + ' → ' + r.id);
} else console.log('= usage 守卫句已存在或未找到');
