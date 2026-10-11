// akasha/tools/harvest-20261007d-time-refs.mjs
// 2026-10-07 第三批留痕：① canon 双时态字段规格 ② canon 外部代码深读结论（Letta/ACE）
// ③ canon-akasha-usage → r8：补 ⑮ 时间字段 / ⑯ 直读。幂等：已有跳过。
import { appendRecord, loadStore, currentRecords, revise } from '../lib.mjs';

let added = 0; let revised = 0; let skipped = 0;

// ① canon 双时态字段
{
  const rec = {
    id: 'canon-bitemporal-fields-20261007',
    claim: '双时态字段（2026-10-07 落地；对位 Graphiti 的 valid-time / transaction-time 与 Letta 检索的日期过滤）：① `event_time`（可选，作者写）＝事件时间，所描述之事发生的时间（建议 YYYY-MM-DD）；② `logged_at`（自动，写入路径盖戳）＝记录时间，appendRecord 家族（CLI / MCP / 脚本 / revise 修订行）缺则自动盖 ISO 8601 UTC、自带保留。两轴分开：修订链每行带 logged_at ⇒「某条何时被改」可查；事件坐标用 event_time。校验：两字段若存在须非空字符串。不强制、不回填历史（存量条目无此字段属正常）。',
    source: { type: '复现', ref: 'akasha/lib.mjs（validateRecord / appendRecord）；test.mjs 双时态用例；对照 letta-code recall_subagent_local.md 的 --start-date/--end-date 与 Graphiti 双时态设计（frontier）' },
    last_reviewed: '2026-10-07',
    tags: ['双时态', '时间字段', '行为规格']
  };
  const existing = new Set(loadStore('canon').records.map(r => r.id));
  if (existing.has(rec.id)) { console.log('已存在，跳过：' + rec.id); skipped++; }
  else { appendRecord('canon', rec); console.log('已追加 [canon] ' + rec.id); added++; }
}

// ② canon 外部代码深读结论
{
  const rec = {
    id: 'canon-external-code-review-20261007',
    claim: '外部代码深读（2026-10-07，源码级；GitHub git 直连被网络阻断，经 api.github.com / raw.githubusercontent.com 拉取）：【ACE（ace-agent/ace，Apache-2.0）】①官方实现只支持 ADD——_add_operations_only 明确丢弃 UPDATE/MERGE/DELETE（TODO 未实现），prompt 声明 only ADD ⇒「增量」的实现口径＝纯追加；②每条 playbook 条目带使用计数（[id] helpful=X harmful=Y :: content），stats 分 high_performing（helpful>5 且 harmful<2）/ problematic（harmful≥helpful）/ unused（计数 0）⇒「被用没有仪表」的现成形态；③失败全留痕（json 解析失败 / 空响应 / 操作错误）；④并行提议 + reducer 聚合（ComBEE 式）。【Letta（letta-ai/letta → 现源码在 letta-ai/letta-code，Apache-2.0）】①记忆形态＝memory filesystem（memfs，local/root/no 三套主提示）＋ memory blocks（persona/human，带只读标记）；②独立 recall 子代理（全文检索 + --start-date/--end-date 时间过滤 + needle→expand cursor 展开；输出模板含「When discussed」时间戳）；③/dream 显式反思命令（/reflect 同义；无模型回合的 side-channel 任务、作用域 agent+conversation+user；云/本地按 localMemfs 能力分叉）＝「做梦」被做成一等命令。对照结论：我们的 append-only+修订链比 ACE 多出更正机制；「被用没有」可借其双计数形态；「显式 dream 触发」「按时间过滤检索」列为候选；「检索命中后直读展开」已落地为 show。',
    source: { type: '复现', ref: '源码：ace-agent/ace@main（ace/core/curator.py、ace/prompts/curator.py、playbook_utils.py）；letta-ai/letta-code@main（src/agent/reflection-runs.ts、src/agent/memory.ts、src/agent/prompts/recall_subagent_local.md、仓库树）；2026-10-07 深读' },
    last_reviewed: '2026-10-07',
    tags: ['外部对照', '源码深读', 'Letta', 'ACE']
  };
  const existing = new Set(loadStore('canon').records.map(r => r.id));
  if (existing.has(rec.id)) { console.log('已存在，跳过：' + rec.id); skipped++; }
  else { appendRecord('canon', rec); console.log('已追加 [canon] ' + rec.id); added++; }
}

// ③ usage → r8（补 ⑮ ⑯）
{
  const cur = currentRecords(loadStore('canon').records).find(r => r.id.startsWith('canon-akasha-usage'));
  const MARK = '\n- 每回合的「库脉搏」行';
  const ADD = '\n**⑮ 时间字段（2026-10-07 起）**：写入自动带 `logged_at`（记录时间，ISO UTC）；「事件时间」用可选 `event_time`（YYYY-MM-DD，写 canon / orphan 时尽量带）——「何时发生的」与「何时记下的」两轴分开。**⑯ 直读**：拿到 id 想读全文用 `node akasha.mjs show <id>`（跨六库取当前版本；旧版本自动指向链尾）。';
  if (!cur) { console.log('找不到 canon-akasha-usage 当前版本'); skipped++; }
  else if (cur.claim.includes('⑮ 时间字段')) { console.log('usage 已更新过，跳过：' + cur.id); skipped++; }
  else {
    const idx = cur.claim.indexOf(MARK);
    if (idx === -1) { console.log('usage 未找到插入标记（' + JSON.stringify(MARK) + '），跳过：' + cur.id); skipped++; }
    else {
      const r = revise('canon', cur.id, { claim: cur.claim.slice(0, idx) + ADD + cur.claim.slice(idx) });
      console.log('已修订：' + cur.id + ' → ' + r.id + '（补 ⑮⑯）');
      revised++;
    }
  }
}

console.log(`完成：新增 ${added}，修订 ${revised}，跳过 ${skipped}。`);
