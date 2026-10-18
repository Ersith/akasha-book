// akasha/tools/harvest-20261010z77-kv-paper-verified.mjs
// 2026-10-10：KV 相位论文的正文级核实（数字落地）+ 对 A2 的判定。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const rec = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-kv-phase-memory-judgment'));
if (!rec) { console.log('未找到条目'); process.exit(0); }
const marker = '正文级核实（2026-10-10，本地 PDF 提取）';
if (rec.claim.includes(marker)) { console.log('已记录，跳过：' + rec.id); process.exit(0); }
const add =
  ' **' + marker + '**：把 `research/papers/2609.36322-periodic-weak-spots.pdf`（65 页）提取为文本逐条核对——' +
  '① 第 2 节标题即「**Stride-Periodic Behavior in DeepSeek-V4 and DeepSeek-V4.1**」；' +
  '② 压缩步长原文确证：**DeepSeek-V4-Flash-0731 S=4，DeepSeek-V4.1-Flash S=2**（对照 **V3.1-Base 无 chunked KV 压缩 → 无相位效应**）；' +
  '③ **Table 7（p.40）各模型 best–worst residue gap（Δres，pp）**：V4-Flash-Base **40.23**（均值 52.6%）· V4-Flash-0731 **19.14**（91.4%）· V4-Pro-Base **34.77**（72.1%）· V4-Pro-0813 **14.84**（84.4%）· **V4.1-Flash 6.09**（均值 92.38%，2560 prompts/残差组）；' +
  '④ **V4.1-Flash 的逐残差（r=0..7）＝95.00 / 89.22 / 95.12 / 89.69 / 94.69 / 90.31 / 95.31 / 89.73** ⇒ **偶数簇（~95）系统性高于奇数簇（~89.5），周期 2 = 步长**；原文措辞「all four of its even residue groups remain above all four odd ones」；' +
  '⑤ 周期跟随步长（W=8 时 S∈{4,6,8} → 周期≈4/6/8）；效应在两种 padding 协议下都出现（非 padding 假象）；' +
  '⑥ **论文是评测纪律论文，未给「对齐步长的缓解方案」**——Prefix/In-sequence Padding 是它的实验对照手段，不是可用的修法。' +
  ' **对 A2（上下文预算分配，装载有界闭环）的判定**：A2 属外置装载、不引入压缩相位（层级判断正确）；但目标模型 V4.1-Flash 本身带 S=2 压缩，**A2 改额度＝改前缀长度＝挪相位** ⇒ ① 验收必须做**奇偶/残差相位抽样**（论文同款：按位置模步长分组比 best–worst，不看单点均值）；②「装载长度对齐步长」**不可执行**——相位取决于 provider 内部压缩边界与全 prompt 分词，客户端既观测不到也设不了（除非 provider 暴露该信息）；③ 真正的抗相位手段是**冗余放置**（关键事实在「使用点附近 + 原始段」各出现一次，至少一份落好相位）与**就近取用**（缩短距离）；④ 量级感：6.09pp 出自 **128K 上下文 / 1.6 万 KV 对 / 单针**极限场景，我们日常上下文短得多，**别被吓住，也别做单点验收**。' +
  ' 存档：论文文本 `research/papers/2609.36322.txt`（pypdf 提取，204,002 字符）。';
const next = revise('canon', rec.id, { claim: rec.claim + add, last_reviewed: '2026-10-10' });
console.log('已记录：' + rec.id + ' → ' + next.id);
