// akasha/tools/harvest-20261010z82-phase-sweep-results.mjs
// 2026-10-10：宿主侧相位实测第一轮结果（负结果，如实）。幂等。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';

const canon = currentRecords(loadStore('canon').records);
if (canon.some((r) => r.id.startsWith('canon-phase-sweep-negative'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('canon', {
  id: 'canon-phase-sweep-negative-20261010',
  claim:
    '**宿主侧相位实测第一轮：未检出周期（负结果，2026-10-10）**。**装置**：`_scratch\\phase-sweep2.mjs`（固定骨架＝前言 + 变长填充 + 〔干扰块〕+ NEEDLE(`K7Q4132: quokka`) + 后缀 + 问题；填充按 " a"…" z" 原子逐个加，**parity 由响应实测的 `prompt_tokens` 标注**；分数＝正确词所在 token 跨度的 logprob 之和，`temperature 0`、`max_tokens 512`）。' +
    '**三档剂量**：① 857 pt（12 干扰）② 2,752 pt（12 干扰）③ **77,362 pt**（200 干扰、needle 距问题 ≈7 万 token）——**每档 8 个连续长度、8/8 全部答对，正确 token 的 logprob ≈ 0.000（概率 ≈ 1.0）**；奇偶差 **< 0.001 nats**（概率比 1.00×），**奇偶分离被组内离散盖住** ⇒ 判定「未见明显周期」。' +
    '**解读（如实）**：① 属**天花板效应**——模型在此任务上毫无犹豫，而论文 V4.1-Flash 的落差是 **6.09pp（89–95% 高位）**；我们的 logprob 装置精度约 0.001 nats，若存在同量级的概率下降**本该被看见**；② 因此三种可能：**(a) 该服务栈/模型版本没有这条效应**（id 只是"对位"，不等于论文开源权重）· **(b) 需要论文级极端密度与长度**（128K / 1.6 万 KV 对 / needle 居中）· **(c) 相位代理与 provider 内部窗口错位**——但注意：**任何固定偏移只会旋转"偶/奇"标签，不会掩盖周期 2 的锯齿**（我们已覆盖两种 parity 各多次），故 (c) 只能解释"标签不对"，解释不了"完全无差"。' +
    '**工程价值**：装置可复用（A2 的"真 scoreFn 相位验收"就用它）；本轮成本 ≈ **125 万 prompt token**（8×857 + 8×2752 + 16×77362）。' +
    '**下一步候选（未做）**：① **二选一竞争版**（提问"是 quokka 还是 azure"，把概率逼到中间区、灵敏度最高——首次尝试因脚本替换未生效而退化回 v2，需重写）· ② **密度拉满**（干扰块 2K–16K 条，照论文形态）· ③ **代码补全法**（论文 Figure 1 形态：让模型在两个 token 间摇摆）· ④ 接受当前负结论（对本项目而言：日常上下文远短于 77K，**相位风险实测很低**，支持 A2 保持默认关 + 冗余落点作为廉价对冲）。',
  source: { type: '复现', ref: '本机实测 2026-10-10（_scratch/phase-sweep/sweep-*.json 三份原始记录；phase-probe2.mjs 先期探针）' },
  event_time: '2026-10-10',
  last_reviewed: '2026-10-10',
  tags: ['相位', '奇偶残差', '负结果', 'logprobs', 'A2', '实测'],
});
console.log('已入 canon：' + rec.id);
