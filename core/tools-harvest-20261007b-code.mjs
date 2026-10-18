// akasha/tools/harvest-20261007b-code.mjs
// 2026-10-07 手工补录（用户批准·第二轮）：外部记忆系统「可依代码」——
//   canon 1 条（代码索引）+ frontier 1 条（Letta）+ 3 条 note 修订（ACE / MIRIX / Nested Learning 补实现线索）。
// 幂等：新增查 id；修订查「是否存在 supersedes 后继」；只追加。
import { appendRecord, loadStore, revise } from './lib.mjs';

const ADDS = [
  ['frontier', {
    id: 'front-letta-stateful-agents-sleep-time',
    title: 'Letta（MemGPT 正统延续）：Stateful Agents 平台与 sleep-time agents',
    url: 'https://github.com/letta-ai/letta',
    year: 2025,
    topic: '离线巩固',
    status: '已实践',
    last_checked: '2026-10-07',
    next_review: '2027-04-05',
    supports: ['§2.7 离线层', '§2.2 三层存储'],
    note: '0.7.0 起内置 sleep-time agents：primary + sleep 双 agent，记忆管理工具挂 sleep 侧、可配更强模型与不同频率；Apache-2.0/Python——睡眠蒸馏最直接的开源实现参照'
  }],
  ['canon', {
    id: 'canon-external-memory-code-index-20261007',
    claim: '外部记忆系统可依代码索引（2026-10-07 快照，GitHub API 实测元数据）：① ACE 官方实现 github.com/ace-agent/ace（Apache-2.0，Python，1.3k★，2026-08 活跃；Generator/Reflector/Curator + 基准脚本）② MIRIX github.com/Mirix-AI/MIRIX（Apache-2.0，3.4k★，2026-09 活跃）③ Letta（MemGPT 正统延续）github.com/letta-ai/letta（Apache-2.0，25.0k★；sleep-time agents）④ Mem0 github.com/mem0ai/mem0（Apache-2.0，66.7k★，当日仍在提交）⑤ Graphiti/Zep github.com/getzep/graphiti（Apache-2.0，31.5k★）⑥ A-MEM github.com/agiresearch/A-mem（MIT，1.2k★）⑦ Generative Agents github.com/joonspk-research/generative_agents（Apache-2.0，22.2k★，2024-08 后未再推）。Nested Learning 无官方代码，社区复现：erikl2/nested-learning（MIT，79★）。OpenAI Dreaming V3 为闭源产品，无代码。对位：睡眠蒸馏参照 Letta sleep-time agents；增量更新参照 ACE Curator（非 LLM 合并、delta 追加）；多库路由参照 MIRIX memory managers。',
    source: { type: '他人', ref: 'GitHub API 实测（2026-10-07）；SambaNova「ACE Open-Sourced on GitHub」（2025-11-19）；Letta「Sleep-time Compute」博客（2025-04-21）' },
    last_reviewed: '2026-10-07',
    tags: ['对标', '代码', '快照']
  }]
];

const REVISES = [
  ['frontier', 'front-ace-agentic-context-engineering', '；官方实现（Apache-2.0/Python）：github.com/ace-agent/ace（含 Generator/Reflector/Curator 与基准脚本）'],
  ['frontier', 'front-mirix-multi-agent-memory-system-for-llm-based-agents', '；官方实现（Apache-2.0/Python）：github.com/Mirix-AI/MIRIX'],
  ['frontier', 'front-nested-learning-the-illusion-of-deep-learning-architectures', '；无官方代码；社区复现：github.com/erikl2/nested-learning（MIT）']
];

let added = 0; let skipped = 0; let revised = 0;
for (const [store, rec] of ADDS) {
  const existing = new Set(loadStore(store).records.map(r => r.id));
  if (existing.has(rec.id)) { console.log('已存在，跳过：' + rec.id); skipped++; continue; }
  try {
    appendRecord(store, rec);
    console.log('已追加 [' + store + '] ' + rec.id);
    added++;
  } catch (error) {
    console.log('失败：' + rec.id + ' — ' + String(error?.message ?? error));
  }
}
for (const [store, id, suffix] of REVISES) {
  const records = loadStore(store).records;
  if (records.some(r => r.supersedes === id)) { console.log('已修订过，跳过：' + id); skipped++; continue; }
  const rec = records.find(r => r.id === id);
  if (!rec) { console.log('找不到：' + id); skipped++; continue; }
  try {
    const r = revise(store, id, { note: (rec.note || '') + suffix });
    console.log('已修订：' + id + ' → ' + r.id);
    revised++;
  } catch (error) {
    console.log('修订失败：' + id + ' — ' + String(error?.message ?? error));
  }
}
console.log(`合并完成：新增 ${added}，修订 ${revised}，跳过 ${skipped}。`);
