// akasha/tools/harvest-20261007y-bench-code-index.mjs
// 2026-10-07 留痕：外部同构案例的「开源代码与度量索引」——frontier 新增 3 + 补码 2 + canon 升 r1。幂等。
import { appendRecord, loadStore, revise, currentRecords } from './lib.mjs';

const NEW_FRONTIER = [
  {
    id: 'front-memoryagentbench-incremental-multi-turn',
    title: 'MemoryAgentBench: Evaluating Memory in LLM Agents via Incremental Multi-Turn Interactions',
    url: 'https://github.com/HUST-AI-HYZ/MemoryAgentBench',
    year: 2025,
    topic: '评测',
    status: '高引用',
    last_checked: '2026-10-07',
    next_review: '2027-04-05',
    supports: ['§2.10 评价'],
    note: 'ICLR 2026 官方代码（MIT，462★，活跃）＋HF 数据集；增量多轮交互下的 Agent 记忆评测（含 LoCoMo-AR）；论文 arXiv 2507.05257'
  },
  {
    id: 'front-stronger-baselines-rag-long-context',
    title: 'Stronger Baselines for Retrieval-Augmented Generation with Long-Context Language Models',
    url: 'https://aclanthology.org/2025.emnlp-main.1656/',
    year: 2025,
    topic: '评测',
    status: '高引用',
    last_checked: '2026-10-07',
    next_review: '2027-04-05',
    supports: ['§2.10 评价', '§2.4 回忆双通路'],
    note: 'EMNLP 2025：对 ReadAgent 等长上下文 RAG 方法的复核；配套复现环境 github.com/alex-laitenberger/read-agent-eval'
  },
  {
    id: 'front-ctxpact-context-compaction-proxy',
    title: 'ctxpact — 本地 LLM 上下文压缩代理（readagent 策略族）',
    url: 'https://github.com/Manojbhat09/ctxpact',
    year: 2026,
    topic: '记忆系统',
    status: '待验证',
    last_checked: '2026-10-07',
    next_review: '2027-01-04',
    supports: ['§2.2 三层存储'],
    note: 'FastAPI 代理：prunes / summarizes / extracts（readagent + rlm + embeddings）；topics 含 context-compaction、session-management、locomo——工程同构对照（早期项目）'
  }
];

const REVISE_PATCHES = {
  'front-locomo': { note: '超长期对话记忆评测；代码+数据：github.com/snap-research/locomo（1208★）' },
  'front-longmemeval': { note: '长程交互记忆评测（ICLR 2025）；代码+数据：github.com/xiaowu0162/LongMemEval（1131★，MIT）' }
};

const BENCH_APPENDIX =
  '\n\n**⑤ 开源代码与度量索引（2026-10-07 晚补，GitHub API 实核）**：**代码**——RAPTOR 官方 `github.com/parthsarthi03/raptor`（MIT，1.7k★）；RECOMP 官方 `github.com/carriex/recomp`（MIT）；ReadAgent **无官方码**（Google 未放），但有第三方复现与**评测环境** `github.com/alex-laitenberger/read-agent-eval`（挂 EMNLP 2025《Stronger Baselines for RAG with Long-Context LMs》——该路线已被 2025 年强基线复核）；工程同构品 `github.com/Manojbhat09/ctxpact`（本地 LLM 上下文压缩代理，含 session-management / LoCoMo 主题）；MemWalker **无码**（社区无有效复现）。**度量（现成可参照）**——① **MemoryAgentBench**（ICLR 2026 官方码+HF 数据集：增量多轮交互记忆，含 LoCoMo-AR；`github.com/HUST-AI-HYZ/MemoryAgentBench`）② **LoCoMo**（`github.com/snap-research/locomo`）③ **LongMemEval**（ICLR 2025；`github.com/xiaowu0162/LongMemEval`，MIT）④ QuALITY / QMSum（ReadAgent/RAPTOR 题面来源，可选）。**参照计划**：会话层「摘要会失手」题组 → 对 MemoryAgentBench / LongMemEval 子集做小规模对照（延续阶段 3 方法）；RAPTOR 树形与 RECOMP 压缩率 → 作为「弧线节点 / 保真度」两候选的度量参照。';

const fRecords = loadStore('frontier').records;
const fTips = new Set(currentRecords(fRecords).map((r) => r.id));
const fAllIds = new Set(fRecords.map((r) => r.id));
let added = 0; let skipped = 0;

for (const e of NEW_FRONTIER) {
  if (fAllIds.has(e.id)) { skipped++; console.log('已存在，跳过：' + e.id); continue; }
  try { appendRecord('frontier', e); fAllIds.add(e.id); added++; console.log('已追加 [frontier] ' + e.id); }
  catch (err) { skipped++; console.log('跳过（校验未过）：' + e.id + ' — ' + String(err?.message ?? err).slice(0, 160)); }
}

for (const [id, patch] of Object.entries(REVISE_PATCHES)) {
  if (!fTips.has(id)) { skipped++; console.log('非当前版本或不存在，跳过：' + id); continue; }
  const tip = currentRecords(fRecords).find((r) => r.id === id);
  if (tip?.note === patch.note) { skipped++; console.log('note 已是目标值，跳过：' + id); continue; }
  const r = revise('frontier', id, patch);
  added++;
  console.log('已修订：[frontier] ' + id + ' → ' + r.id);
}

// canon 升级：benchmark 条目补 ⑤ 开源代码与度量索引
const cTips = currentRecords(loadStore('canon').records);
const bench = cTips.find((r) => r.id.startsWith('canon-session-layer-benchmark-20261007'));
if (!bench) { console.log('未找到 canon-session-layer-benchmark 链尾'); }
else if (bench.claim.includes('⑤ 开源代码与度量索引')) { console.log('已含 ⑤ 段，跳过：' + bench.id); }
else {
  const r = revise('canon', bench.id, { claim: bench.claim + BENCH_APPENDIX });
  added++;
  console.log('已修订：[canon] ' + bench.id + ' → ' + r.id);
}

console.log(`完成：新增/修订 ${added}，跳过 ${skipped}。`);
