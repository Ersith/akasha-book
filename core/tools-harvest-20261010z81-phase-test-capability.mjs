// akasha/tools/harvest-20261010z81-phase-test-capability.mjs
// 2026-10-10：宿主侧「奇偶残差实测」可行性探针结果（DeepSeek 平台）。幂等。
import { loadStore, currentRecords, appendRecord } from '../lib.mjs';

const canon = currentRecords(loadStore('canon').records);
if (canon.some((r) => r.id.startsWith('canon-phase-test-capability'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('canon', {
  id: 'canon-phase-test-capability-20261010',
  claim:
    '**宿主侧「关键记忆奇偶残差实测」可行性（2026-10-10 探针实测；用户问「我们能有办法搞吗」→ 能）**。' +
    '**① 模型路由**：账号（platform.deepseek.com，密钥存 `official-home\\.credentials.yaml` 的 `DEEPSEEK_API_KEY`）只有两个模型：**`deepseek-flash`** 与 `deepseek-v4-pro` ⇒ 用户说的「4.1flash」对位 **`deepseek-flash`**（注：id 不能证明服务端就是论文里的 V4.1-Flash 权重，属**假定**）。' +
    '**② usage 完整回传**：`{prompt_tokens, completion_tokens, prompt_cache_hit_tokens/miss_tokens, completion_tokens_details.reasoning_tokens}` ⇒ **相位代理法成立**——把「问题 + needle 之后的尾巴」固定住，**扫 ±1 token 的填充量**（用 `prompt_tokens` 读数校准），needle 的 residue 就随总 token 数翻转；**不需要本地分词器**。' +
    '**③ logprobs 可用（重大）**：`logprobs:true, top_logprobs:3` 实测回传 `choices[0].logprobs.{content, reasoning_content}`，每条含 `token / logprob / bytes / top_logprobs[]`（例：`Paris`=0.0、` Paris`=−17.38、`巴黎`≈−17.6）⇒ **可以照论文口径直接量「正确 token 的概率」**（论文 Figure 1 就是 P(正确) vs P(错误)），比"重复采样数准确率"省一个量级的样本。对照：不带该参数则响应无 logprobs 字段（参数被尊重，非静默忽略）。' +
    '**④ 成本量级**：约 1000 字符填充 ≈ **552 prompt tokens**；一轮最小扫描（8 个连续长度 × 1-3 次 + 校准）≈ **30–40 次调用**，量级可忽略。**注意**：flash 是推理模型（琐碎问题也花 ~20 reasoning tokens），延迟与 completion 成本略增，但不影响 content logprobs。' +
    '**⑤ 边界（如实）**：看不到 provider 内部压缩窗口（起点/分词若偏移，只会**旋转**"偶/奇"标签，**不影响周期 2 的检出**——周期检测不需要绝对对齐）；论文效应在**长距离**最显著（128K 级），我们日常上下文短、需用"远距离 needle"构造才有望复现；null result 不能反证论文（服务栈可能不同）。' +
    '**落点**：探针脚本 `_scratch\\phase-probe.mjs` / `phase-probe2.mjs`；正式实验（`phase-sweep.mjs`：固定骨架 + 变长填充 + needle + 问题，按 prompt_tokens 分奇偶组，用 logprob 作连续分数 + 同奇偶对照）**待做**——属 A2 观察期「真 scoreFn 相位验收」的前置。',
  source: { type: '复现', ref: '本机实测 2026-10-10（_scratch/phase-probe2.mjs：/models 清单、usage 回传、logprobs 形状、填充 token 数；密钥未落日志）' },
  event_time: '2026-10-10',
  last_reviewed: '2026-10-10',
  tags: ['相位', '奇偶残差', 'logprobs', 'A2', '可行性', '探针'],
});
console.log('已入 canon：' + rec.id);
