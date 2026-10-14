// akasha/tools/harvest-20261010z83-phase-sweep-final.mjs
// 2026-10-10：相位实测**收官**——二选一 8 步 + 数字形态，全部饱和；结论与成本入账。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const rec = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-phase-sweep-negative'));
if (!rec) { console.log('未找到条目'); process.exit(0); }
const marker = '**收官（2026-10-10 晚）**';
if (rec.claim.includes(marker)) { console.log('已记录，跳过：' + rec.id); process.exit(0); }
const add = ' ' + marker +
  '：追加两轮后**结论钉死**——① **二选一竞争·修正版**（`phase-sweep8.mjs`：正主 `K7Q4132=quokka`（中段）vs **只差末位的近似键** `K7Q4133=azure`（前段），48,186 pt，**8 步/8 调用**）：**8/8 全选正主**，`logP(正主) ≈ −2.4e-7`（概率 1.0），**诱饵从未进 top-20**（差恒为 null）⇒ 连"近似键"都逼不出犹豫；② **数字键值·论文形态**（`phase-numeric-probe.mjs`：唯一 5 位数字键 + 2 位数字值（仅 90 种，可混淆），8,000 行 / **40,078 pt**）：**2 秒**答对（`71`），logP=**0.000**（span）⇒ 仍无头上空间。' +
  ' **七种配置汇总**：857 / 2,752 / 77,362 / 121,654 / 48,186（二选一×8）/ 40,078 pt，覆盖 单词·数字·密集 1.6 万行·近似键二选一 —— **全部满分且 p≈1.0**，**无一例出现可测的奇偶/相位差异**。' +
  ' **最终结论（本条）**：① **装置建成且可复用**（脚本族 `phase-sweep*.mjs` + 探针；未饱和时相位可测，`best−worst`/奇偶差口径比论文的准确率采样省样本）；② **在我们的服务路由（`deepseek-flash`）上，相位效应实测为零到不可测**——因为模型在这些任务上**完全确定（p≈1）**，没有论文那种"89–95% 准确率"的非饱和区；③ 实务含义：**不需要为相位专门加机制**，A2 保持**默认关 + 冗余落点 + 最近取用**（廉价对冲）即为最优；④ 边界（不许过度外推）：这不证明服务栈没有该效应——只证明**用这些任务形态测不出来**；论文效应可能只在"键值都是短 token 且高度同质"的极端 token 空间里显形（我们的键是唯一 5 位数字、行式规整，仍偏易）。' +
  ' **成本记账**：本线合计 ≈ **210 万 prompt token**（含被杀的 v7 一次 121K 未计全）+ 后台 v7 单发曾挂死 25 分钟（无超时）——后续脚本一律带 `AbortSignal.timeout`。';
const next = revise('canon', rec.id, { claim: rec.claim + add, last_reviewed: '2026-10-10' });
console.log('已记录：' + rec.id + ' → ' + next.id);
