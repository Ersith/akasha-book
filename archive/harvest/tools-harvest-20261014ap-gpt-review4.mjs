// akasha/tools/harvest-20261014ap-gpt-review4.mjs —— GPT 第四轮（Q01–Q06）留痕
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-gpt-review4-20261014'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  "**GPT 第四轮独立复核 · 6 项全清（2026-10-14）**——基线 `23ac052` 上新增 6 项（2 P1/4 P2，Q01–Q06）**先复现后修复**；N01–N14 原反例经其独立重跑确认仍然通过。",
  "**P1 两件**：**Q01** 链式合并**来源传递**——absorbSrc 取「逐条 `[source, ...sources]` 并集」（B←C 后再 A←B：A 的 sources 现含 **A/B/C 全链**；复跑 nestedProvenance 确认）；**Q02** `mergedText` 改写**拒绝**（A 档守「keep 一字不动」——`refused-merged-text`；正文改写走独立 revise 通道，B 档未开）。",
  "**P2 四件**：**Q03** 占位致 CLI 崩溃——`akasha.mjs` 渲染加**占位统一分支**（id+摘要+fullHint）+ frontier `supports` 防御；复跑 cli-placeholder **四路全 exit 0**（brief/json/full/cross）；**Q04** 脱敏改**纯文本规则**（弃 JSON.parse 往返——大整数/高精度小数不再被 JS Number 改写；`request_id:9007199254740993` 与 `1.0000000000000001` **原样保留**，同对象含假凭据时照遮）；**Q05** **回执与重建共用核验**（成员/身份/豁免三查 + 目标一致；不存在引用保留为如实 `missing`）——注入协议条墓碑的攻击回执**被拒**、合法回执与丢回执重建均可恢复；**Q06** 会话 ID **完整保留**（索引器四处剥前缀全移除——`session-session-1` 不再逐层归一；sleep 读端**精确优先 + 单前缀差兜底**（旧数据兼容））。",
  "**验收**：r4 七脚本全量复跑（core-boundaries / core-targeted / cli-placeholder / token-boundaries / sleep.changed-boundaries / identity-check / boundaries-repro）**全 exit 0**、判据逐项转绿；核心套件 **248/248**；sleep 自测 ✓、session 自测 **28/28**（含约定演化同步：记账改存完整 id）。**插件**：sleep **1.10.8-h1**（读端）、session **0.3.3-h1**（生产者）打包安装（restart-required）。**边界如实**：① 旧数据（剥前缀时代）的裸 id 在「并存/嵌套前缀」时**无法区分归属**（信息缺失）——新数据起精确可区分（她三项 identity 场景中 collision/nonIdem 属此类边界，未证实生产存在）；② `keeperRevoke`：撤销只回 absorb 墓碑，keep 侧 `sources`（审计记录）保留——如需回退来源史另议；③ 50% 级指针机械精简、omitted 逐 ID 标注、诊断字段按需分离——**登记待办**（与其「先开哪些销」顺序一致）。",
].join('');
const r = appendRecord('canon', {
  id: 'canon-gpt-review4-20261014',
  claim,
  source: { type: '复现', ref: 'tmp/r4-verify（她七脚本复跑：R4-*.json）· tmp/q03-repro.mjs · tmp/q04-q03-verify.mjs · test 248/248 · session selftest 28/28' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['外部审查', 'GPT', '第四轮', 'Q01', 'Q06', '复检'],
});
console.log('已入 canon：' + r.id);
