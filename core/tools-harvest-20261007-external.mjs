// akasha/tools/harvest-20261007-external.mjs
// 2026-10-07 手工补录（用户批准）：外部记忆系统对标 —— 4 条 frontier + 1 条 canon 盘点 + 1 条 orphan 观察。
// 幂等：已存在 id 一律跳过；只追加，不覆盖、不改写。
import { appendRecord, loadStore } from './lib.mjs';

const RECORDS = [
  ['frontier', {
    id: 'front-openai-chatgpt-memory-dreaming-v3',
    title: 'OpenAI ChatGPT Memory「Dreaming V3」记忆系统升级',
    url: 'https://openai.com/index/chatgpt-memory-dreaming/',
    year: 2026,
    topic: '离线巩固',
    status: '已实践',
    last_checked: '2026-10-07',
    next_review: '2027-04-05',
    supports: ['§2.7 离线层', '§2.3 写入与整理分离'],
    note: '后台「做梦」= 离线蒸馏进产品基建（2024-04 saved memories → 2025-04 初版 dreaming → 2026-06 V3）；指标 82.8%/71.3%/75.1%；算力降约 5x。官方页 403 未直读，细节为多源转述'
  }],
  ['frontier', {
    id: 'front-mirix-multi-agent-memory-system-for-llm-based-agents',
    title: 'MIRIX: Multi-Agent Memory System for LLM-Based Agents',
    url: 'https://arxiv.org/abs/2507.07957',
    year: 2025,
    topic: '记忆系统',
    status: '待验证',
    last_checked: '2026-10-07',
    next_review: '2027-01-05',
    supports: ['§2.2 三层存储', '§2.4 回忆双通路'],
    note: '六组件记忆（Core/Episodic/Semantic/Procedural/Resource/Knowledge Vault）+ 八 agent 分工；Active Retrieval 先出 topic 再按来源标签注入；LOCOMO 85.4%'
  }],
  ['frontier', {
    id: 'front-ace-agentic-context-engineering',
    title: 'Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models',
    url: 'https://arxiv.org/abs/2510.04618',
    year: 2025,
    topic: '记忆系统',
    status: '待验证',
    last_checked: '2026-10-07',
    next_review: '2027-01-05',
    supports: ['§2.11① 稳定库', '§2.7 离线层'],
    note: '反 context collapse：结构化增量更新（累积不重写）优于整体改写与压缩；context 视作 evolving playbook；ICLR 2026'
  }],
  ['frontier', {
    id: 'front-nested-learning-the-illusion-of-deep-learning-architectures',
    title: 'Nested Learning: The Illusion of Deep Learning Architectures',
    url: 'https://arxiv.org/abs/2512.24695',
    year: 2025,
    topic: '持续学习',
    status: '待验证',
    last_checked: '2026-10-07',
    next_review: '2027-01-05',
    supports: ['§2.7 离线层', '§7 形态（模型无关性）'],
    note: 'NeurIPS 2025；continuum memory system 多速度更新（推广长/短期记忆二分）、Hope 自改记忆模块——「模型内生记忆」路线的对照物'
  }],
  ['canon', {
    id: 'canon-external-memory-benchmark-20261007',
    claim: '外部记忆系统对标盘点（2026-10-07 快照）：与阿卡夏之书可对位的四组外部系统已补入 frontier——① OpenAI ChatGPT「Dreaming V3」记忆系统（2026-06 上线，后台离线「做梦」蒸馏，事实召回 82.8% / 偏好遵循 71.3% / 时间感知 75.1%，算力降约 5 倍；官方技术细节未公开）② MIRIX（六组件记忆 + 八 agent，LOCOMO 85.4%）③ ACE（反 context collapse：结构化增量更新优于整体重写，ICLR 2026）④ Nested Learning / Hope（NeurIPS 2025，continuum memory 多速度更新，模型内生路线）。对照结论：单件同构多、整机同构无；阿卡夏独有件 = 定价×情绪字段、孤案档案、来源态输出纪律、门控分层。借鉴候选：Dreaming 的「记忆摘要页」（全库人类可读摘要输出）、MIRIX 的 Active Retrieval（先出 topic 再查）、ACE 的增量蒸馏纪律（防 brevity bias）。',
    source: { type: '他人', ref: 'frontier 4 条（front-openai-chatgpt-memory-dreaming-v3 / front-mirix-multi-agent-memory-system-for-llm-based-agents / front-ace-agentic-context-engineering / front-nested-learning-the-illusion-of-deep-learning-architectures）+ 2026-10-07 会话多源核验（arXiv 2507.07957 / 2510.04618 / 2512.24695；c114 转凤凰网·新智元 2026-06-07 报道）' },
    last_reviewed: '2026-10-07',
    tags: ['对标', '外部系统', '记忆架构', '快照']
  }],
  ['orphan', {
    id: 'orphan-brief-phrase-miss-20261007',
    summary: 'brief 多词短语零命中 vs 单字全命中——主题检索在「词组未原样出现」时记 0 分（连续子串匹配）',
    observed: '2026-10-07 实测：akasha_brief「记忆架构 外部记忆 论文对标」= 0 命中（token 按空格切分为三个短语，逐个在条目文本里 indexOf 计分）；同主题 akasha_cross「记忆」= 21 条命中（canon×3、frontier×18）。',
    hypothesis: '检索退化缺陷候选：应支持子词/退化匹配（拆词、n-gram 回退等），或协议层改为「先出单一主题词再查」（与 MIRIX Active Retrieval 同源思路）。',
    would_confirm: '给 brief 加子词回退后，同一查询命中 > 0；且对一组真实短语查询的命中率显著提升（可做 A/B 对照）。',
    would_refute: '若定稿为「查询约定」（协议明文要求用单主题词查询）且按约定测试全部命中，则降级为文档缺口而非机制缺陷。',
    severity: '中',
    created: '2026-10-07'
  }]
];

let added = 0; let skipped = 0;
for (const [store, rec] of RECORDS) {
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
console.log(`合并完成：新增 ${added}，已存在跳过 ${skipped}。`);
