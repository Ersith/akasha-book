// akasha/tools/harvest-20261007x-session-benchmark.mjs
// 2026-10-07 留痕：会话层外部同构扫描——frontier 补录 5 条 + canon 评估条目。幂等。
import { appendRecord, loadStore } from '../lib.mjs';

const FRONTIER = [
  {
    id: 'front-readagent-human-inspired-reading-agent-gist-memory',
    title: 'A Human-Inspired Reading Agent with Gist Memory of Very Long Contexts（ReadAgent）',
    url: 'https://arxiv.org/abs/2402.09727',
    year: 2024,
    topic: '检索与线索',
    status: '高引用',
    last_checked: '2026-10-07',
    next_review: '2027-04-05',
    supports: ['§2.4 回忆双通路', '§2.5 排序'],
    note: 'memory episodes → gist 记忆 → 主动 lookup 回读原文；有效上下文 3.5–20×（ICML 2024）。「结论+回原档」的学术先例'
  },
  {
    id: 'front-memwalker-walking-down-the-memory-maze',
    title: 'Walking Down the Memory Maze: Beyond Context Limit through Interactive Reading（MemWalker）',
    url: 'https://arxiv.org/abs/2310.05029',
    year: 2023,
    topic: '记忆系统',
    status: '高引用',
    last_checked: '2026-10-07',
    next_review: '2027-04-05',
    supports: ['§2.4 回忆双通路', '§2.10 评价'],
    note: '摘要树 + 交互式自主导航 + 可解释读取路径（指向相关文本段）。「按需局部调取」与路径可见性先例'
  },
  {
    id: 'front-raptor-recursive-abstractive-processing-tree-retrieval',
    title: 'RAPTOR: Recursive Abstractive Processing for Tree-Organized Retrieval',
    url: 'https://arxiv.org/abs/2401.18059',
    year: 2024,
    topic: '检索与线索',
    status: '高引用',
    last_checked: '2026-10-07',
    next_review: '2027-04-05',
    supports: ['§2.2 三层存储', '§2.5 排序'],
    note: '递归嵌入-聚类-摘要构树、跨抽象层检索（QuALITY +20%，ICLR 2024）。会话层「弧线节点」的借鉴来源'
  },
  {
    id: 'front-recomp-retrieval-compression-selective-augmentation',
    title: 'RECOMP: Improving Retrieval-Augmented LMs with Compression and Selective Augmentation',
    url: 'https://arxiv.org/abs/2310.04408',
    year: 2023,
    topic: '检索与线索',
    status: '高引用',
    last_checked: '2026-10-07',
    next_review: '2027-04-05',
    supports: ['§2.4 回忆双通路'],
    note: '训练式压缩器（抽取/生成）+ 选择性注入（无关则空串）；压缩率至 6%。压缩保真度/压缩率评测参照'
  },
  {
    id: 'front-cline-memory-bank',
    title: 'Cline Memory Bank（跨会话项目记忆模式）',
    url: 'https://docs.cline.bot/best-practices/memory-bank',
    topic: '记忆系统',
    status: '已实践',
    last_checked: '2026-10-07',
    next_review: '2027-01-04',
    supports: ['§2.2 三层存储'],
    note: 'memory-bank/ 下结构化 markdown（projectbrief/activeContext/progress…）跨会话续接——手工文档式实践对照'
  }
];

const CANON = {
  id: 'canon-session-layer-benchmark-20261007',
  claim:
    '小阿卡夏（会话层）外部同构扫描与整体评估（2026-10-07）——**没有全同构者**。① 机制最近邻＝**ReadAgent**（ICML 2024，gist 记忆＋主动 lookup 回读原文；3.5–20× 有效上下文）——「结论+回原档」先例；**MemWalker**（摘要树＋自主导航＋可解释路径）与 **RAPTOR**（递归摘要树/多层抽象检索，QuALITY +20%）＝「结构/抽象层」先例；**RECOMP**（压缩器+选择性注入，6% 压缩率）＝压缩质量参照；业界对照＝auto-compact（压力式，无索引/指针/审计）与 **Cline Memory Bank**（markdown 持久文档模式）。② 已有基石交叉：MemGPT/Letta、Zep、Mem0、A-MEM、MIRIX、Dreaming V3、ACE、Nested Learning、LongMemEval、LoCoMo、自判检索（Self-RAG）等均在库；本轮补录 5 条 frontier（ReadAgent/RAPTOR/MemWalker/RECOMP/Cline Memory Bank）。③ 评估：差异化＝**压缩事件化＋段级指针＋审计治理＋工程闭环（回放实测 18/20 vs 9/20）**；缺口按借鉴价值＝a.抽象层（弧线节点）b.导航路径显式化 c.压缩保真度指标 d.评测接轨；自评＝机制新颖度中（组合+事件化+治理为新）、工程完成度高、证据强度中（n=2 回放）。两件候选（弧线节点 / 保真抽查）属「加一层」不急。全文与全部 URL：`research\\session-layer-benchmark-20261007.md`。',
  source: {
    type: '复现',
    ref: 'research\\session-layer-benchmark-20261007.md（扫描方法、对照矩阵、URL 全列、评估）'
  },
  last_reviewed: '2026-10-07',
  event_time: '2026-10-07',
  tags: ['会话层', '对标', '评估', 'ReadAgent', 'RAPTOR', 'MemWalker', 'RECOMP', '前沿']
};

let added = 0; let skipped = 0;
const fExisting = new Set(loadStore('frontier').records.map((r) => r.id));
for (const e of FRONTIER) {
  if (fExisting.has(e.id)) { skipped++; continue; }
  try { appendRecord('frontier', e); fExisting.add(e.id); added++; console.log('已追加 [frontier] ' + e.id); }
  catch (err) { skipped++; console.log('跳过（校验未过）：' + e.id + ' — ' + String(err?.message ?? err).slice(0, 160)); }
}
const cExisting = new Set(loadStore('canon').records.map((r) => r.id));
if (cExisting.has(CANON.id)) { console.log('已存在，跳过：' + CANON.id); }
else { appendRecord('canon', CANON); added++; console.log('已追加 [canon] ' + CANON.id); }
console.log(`完成：新增 ${added}，跳过 ${skipped}。`);
