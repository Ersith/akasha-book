// akasha/tools/harvest-20261014w-whole-system-review.mjs
// 2026-10-14：整体复检（举一反三 + 两遍人工复检）报告入 canon。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-whole-system-review-'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**整体复检：「今日问题→举一反三→只修真问题→两遍人工复检」（2026-10-14 用户令「阿卡夏是整体/系统，对今日所有问题举一反三，严格确定真问题才修，再按老规矩复检」）**。',
  '**问题族归类（8 类）**：A 状态变更后派生集未重算（keep←keep／撤销后 no-op／墓碑误命／keep 离集）· B opts/entry 参数位错污染真审计线 · C 证据被覆盖 · D 断言过宽／夹具不封闭／探针词含真词 · E 同侧线多类事件未分流 · F 文档断言未随实测校正 · G 计分聚合噪声 · H 引号/缩写与全称类书写陷阱。',
  '**全系统扫面与本批新修（均已验真）**：**F1 计划文件同日覆盖** → 旧 planId 失联、证据链断（当晚真实踩到「找不到可用计划」）⇒ 文件名带 planId 短码（「sleep-plan-<date>-<short>.json」）；**F2 查询日志的写侧开关把读侧也关了** ⇒ AKASHA_QUERY_LOG=off 下 metrics 查询维度与 K3 矛盾检测**静默读 0**（真缺陷）⇒ 新增 queryLogReadPathOf（读不认写开关）＋守卫；**F3 memoryDiff 把撤销记录当「新增」** ⇒ 时间线误导复核 ⇒ 单列 revoked 类（lib＋CLI＋totals＋守卫）；**F4 revokePlan 缺墓碑时谎报已撤销** ⇒ 如实 missing＋守卫；**F5 五处文档/文案过期断言**（README「18 工具」×2 · SCHEMA「--apply 尚未实现」＋session h4 · akasha.mjs 三处死守卫文案）＋ MEMORY-TEST 10-12 h4 条**更正注**（require 缓存实测推翻其一般化表述）。主套件 **233→235**。',
  '**登记不修（经验证非真问题/可容忍，如实入账）**：planTokens 单字噪声——实测无关长文 jaccard **0.0172**（θ=0.8）不构成风险；detectConflicts 全调用方输入均过 currentRecords（墓碑/撤销行不入检测）；recordQuery 写侧无锁——日志层坏行有解析容错（既有设计，热路径不动）；rootOf 不归一 -retired-2／-revoked 后缀——仅元数据行分组边缘且冲突输入已过滤（不触发）。',
  '**两遍人工复检（老规矩）**：**第一遍**（全新进程＋临时库端到端）：计划→演练→执行→show（已退役）→撤销→复原→check **全链目验全对**（含新文件名带短码）；真库抽检（plan 0 ops＋near-miss 报告、lookup、summary、K3 行）；MCP 桥 review_pack／review_list 实调；K1 严格版 **25/25**、影子集 **8/8**。**第二遍（换角度）**：retires／revokes 全部消费点逐一核对（show 按当前集判定 ✓、retiredIds／currentRecords 语义一致 ✓）；**写路径锁审计**（appendRecord／revise／retire／revoke／rollback／log 全持 withFileLock ✓）；视图面（memoryDiff／chainView）→ 逮 F3；插件面（hooks 线在长、脉搏半句活体、gate 拦截正常）✓；当日 canon 条目与行为**逐条对账**（21 工具／apply A 档／半句／revokes／计划命名 全对上）。',
  '**收口**：test **235/235** · check 726/726 · family-sweep 全绿 · health-check **51/51** · K1-strict 25/25 · 影子集 8/8。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-whole-system-review-20261014',
  claim,
  source: { type: '复现', ref: 'tmp/e2e-fixture.mjs 端到端目验 · tmp/whole-system-probe.mjs（jaccard 实测）· 不变量/写锁扫（lib.mjs 全量 grep）· test 235/235 · family-sweep · health-check · K1-strict · recall-regression' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['整体复检', '举一反三', '复检', '修复'],
});
console.log('已入 canon：' + r.id);
