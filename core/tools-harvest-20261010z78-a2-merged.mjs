// akasha/tools/harvest-20261010z78-a2-merged.mjs
// 2026-10-10：A2 上下文预算分配并入活树的交付记录。幂等。
import { loadStore, currentRecords, appendRecord } from '../lib.mjs';

const canon = currentRecords(loadStore('canon').records);
if (canon.some((r) => r.id.startsWith('canon-a2-context-budget-20261010'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('canon', {
  id: 'canon-a2-context-budget-20261010',
  claim:
    '**A2 上下文预算分配并入活树（2026-10-10，用户裁定「并」；外援三补丁、经我方两轮复核改版）**。' +
    '**背景（基石对齐）**：目标模型 **DeepSeek-V4.1-Flash 的 KV 压缩步长 S=2**（arXiv 2609.36322 §2 / Table 7 正文级核实：其相位落差 **6.09pp**，偶数残差簇 ~95% vs 奇数簇 ~89.5%）⇒ **A2 改额度＝改前缀长度＝挪相位** ⇒ 验收必须相位抽样；且**客户端无法对齐 provider 压缩相位**（论文亦无对齐式缓解）⇒ 主手段只能「冗余＋就近」。' +
    '**机制**：`CONTEXT_BUDGET_SOURCES = [self, usage, kit, session, retrieval]`（baseShare 0.15/0.15/0.15/0.25/0.30，total 默认 2048）；误差驱动微调（救场→加额、空转→减额、近平衡小步、恶化刹车）；**`exemptShrink:[self, usage]`**（缩额被阻断并记 `self-layer-exempt`/`protocol-exempt`，与 A1 同词汇）；**主手段 `placeWithRedundancy()`**（关键段 ≥2 份、**奇数 token 偏移翻转 residue** → 至少一份落好相位）+ **`nearestFetch()`**（按距离升序）；`alignTokenCount`/`padBlockToStride` **降级为实验对照并显式标注「非生产修复」**；`phaseResidueSample()`＝多长度前缀扰动 ×14 + 残差采样 + **best−worst gap 主指标**（scoreFn 可注入真评测；缺省为论文形态代理）。**默认关**；CLI `budget [--enable] [--phase-check <文本>]`；**只分配注入额度，不改排序/存储**。' +
    '**验证（我方独立）**：三补丁 `git am` 干净（`b4f0a01`/`c1f4ab0`/`0a23a04`）；**双路树哈希全等** `6a2736a1a6050ed68fae07c4a456161633f571da`；核心 **137/137**（OSS）/ **138/138**（活树）、N20 **132→133 +5 SKIP**、四插件全绿；CLI 冒烟三态（默认关文案 / `--enable` 分配视图含 `[exempt]` 与相位策略行 / `--phase-check` 残差验收）。' +
    '**落地**：活树已并（快照 `_rollback-20261010-a2\\`）；OSS `92c5e47`（CHECKS R27）；MEMORY-TEST 第二十二次受控解冻。' +
    '**诚实提醒**：`--phase-check` 缺省 scoreFn 为**代理形态**（偶 0.95 / 奇 0.895，照论文表造），其 gap=0.055 **不代表本系统真实相位落差**——真验收须注入真 scoreFn（真实问答）。' +
    '**方法论沉淀**：凡「改前缀长度/注入额度」的实验，都属**相位扰动源** ⇒ 单配置 A/B 会把相位噪声当收益；验收一律「多长度扰动 + 残差抽样 + best−worst」。',
  source: { type: '复现', ref: '本机实测 2026-10-10（_scratch/akasha-a2-review-20261010：三补丁 am + 双路树哈希 + 三层测试 + CLI 三态冒烟）；文献依据 research/papers/2609.36322.txt' },
  event_time: '2026-10-10',
  last_reviewed: '2026-10-10',
  tags: ['A2', '预算分配', '相位', '冗余落点', '解冻', '外援验证'],
});
console.log('已入 canon：' + rec.id);
