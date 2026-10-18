// akasha/tools/harvest-20261014am-gpt-r2-r09.mjs —— R09 收尾（元数据入 reserve + groups 占位回位）
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-gpt-review2-20261014-c'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  "**GPT 复核二轮 · R09 收尾（2026-10-14）**——由**她的 token-probe 在新基线上复跑**揭出的两层残余，均已修：",
  "**① 元数据不进装填判定**（lookup report 夹具：20 条小条目全装后整响应 5414>4096）⇒ `clipByBudget` 的 reserve 改**真实元数据口径**——「除条目本体与 budget 外的一切」（stats/trace/citeAllowlist/query…）先序列化估算为 `metaTokens`，条目裁剪据此收缩；极小 cap 低于元数据体量时以 `overCap:true` **如实标注**（不复读假绿）。复跑：lookupReport **used 4050/4096、itemsAfter 20→12、over=false**；single/mirror 用例保持（1099/1105，占位 floor）。**② floor 占位在 groups 分支被重组丢弃**（单条超大 brief ⇒ itemsAfter=0，「存在但未展开」没兑现）⇒ 占位按「被跳过的第一条所在组」**回位**再走常规重组。复跑：itemsAfter=1（占位在册）。",
  "**验证**：她 token-probe 全键复跑（singleOversizeCanon/mirrorPayloadNotCharged/lookupReportMetadata/crossRequestedBudgetAndOffset/crossDefault/schemas）；core-review 复跑（rollbackIdempotence 三次执行后零新增、rollbackRetired 不复活、reviseAfterRollback）；核心套件 **248/248** 保持全绿。新基线含入仓。",
].join('');
const r = appendRecord('canon', {
  id: 'canon-gpt-review2-20261014-c',
  claim,
  source: { type: '复现', ref: 'tmp/r2-verify（她 core-review.mjs + token-probe.mjs 复跑，指向活 core）· tmp/r04-verify/contracts-repro.mjs · test 248/248' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['外部审查', 'GPT', '复核二轮', 'R09', 'R08', '占位回位'],
});
console.log('已入 canon：' + r.id);
