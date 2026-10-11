// akasha/tools/harvest-20261007aa-spin-frontier.mjs
// 2026-10-07 留痕：空转/循环前沿文献 + 工程先例 —— frontier 新增 7 条 + canon 1 条。幂等。
import { appendRecord, loadStore } from '../lib.mjs';

const FRONTIER = [
  {
    id: 'front-reasoning-goes-astray-radar',
    title: 'When Reasoning Goes Astray: Attention Dynamics of Uncontrolled Reasoning（RADAR）',
    url: 'https://arxiv.org/abs/2609.38817',
    year: 2026,
    topic: '推理控制',
    status: '待验证',
    last_checked: '2026-10-07',
    next_review: '2027-01-04',
    supports: ['§7 形态（纪律注入）', '§2.10 评价'],
    note: '失控推理四态 + 注意力动态：异常先于重复出现；重对齐降环保留良性性能（2026-09-30）——「重复前可检」机制证据'
  },
  {
    id: 'front-circular-reasoning-self-reinforcing-loops',
    title: 'Circular Reasoning: Understanding Self-Reinforcing Loops in Large Reasoning Models',
    url: 'https://arxiv.org/abs/2601.05693',
    year: 2026,
    topic: '推理控制',
    status: '待验证',
    last_checked: '2026-10-07',
    next_review: '2027-01-04',
    supports: ['§2.10 评价', '§7 形态（纪律注入）'],
    note: '命名 Circular Reasoning + LoopBench；语义重复先于文本重复；推理僵局触发；CUSUM 早期预测（2026-01）'
  },
  {
    id: 'front-thinkbrake-margin-guided-decoding',
    title: 'ThinkBrake: Efficient Reasoning via Log-Probability Margin Guided Decoding',
    url: 'https://aclanthology.org/2026.findings-acl.1095/',
    year: 2026,
    topic: '推理控制',
    status: '待验证',
    last_checked: '2026-10-07',
    next_review: '2027-01-04',
    supports: ['§7 形态（纪律注入）'],
    note: '解码期刹车：log-prob margin 引导提前收敛（ACL 2026 Findings；模型侧路线）'
  },
  {
    id: 'front-when-more-thinking-hurts-overthinking',
    title: 'When More Thinking Hurts: Overthinking in LLM Test-Time Compute Scaling',
    url: 'https://aclanthology.org/2026.findings-acl.1199/',
    year: 2026,
    topic: '推理控制',
    status: '待验证',
    last_checked: '2026-10-07',
    next_review: '2027-01-04',
    supports: ['§2.10 评价'],
    note: '过度思考的成本量化（ACL 2026 Findings）'
  },
  {
    id: 'front-dynamic-early-exit-reasoning-models',
    title: 'Dynamic Early Exit in Reasoning Models（DEER）',
    url: 'https://arxiv.org/abs/2504.15895',
    year: 2025,
    topic: '推理控制',
    status: '高引用',
    last_checked: '2026-10-07',
    next_review: '2027-04-05',
    supports: ['§7 形态（纪律注入）'],
    note: '答案稳定性判据 → 提前退出思考（2025-04；模型侧路线）'
  },
  {
    id: 'front-dsh-thinking-loop-guard',
    title: 'dsh-thinking-loop-guard（DSH 思考环守卫插件）',
    url: 'https://github.com/unknowbug/dsh-thinking-loop-guard',
    year: 2026,
    topic: '推理控制',
    status: '待验证',
    last_checked: '2026-10-07',
    next_review: '2027-01-04',
    supports: ['§7 形态（纪律注入）'],
    note: 'turn 边界检测并打断 DSH 思考链环（无代理；自 ollama-loop-guard 移植；2026-08，非官方、5★）——最直接工程对照'
  },
  {
    id: 'front-ollama-loop-guard',
    title: 'ollama-loop-guard（Ollama 死循环代理）',
    url: 'https://github.com/dustinmoon78/ollama-loop-guard',
    year: 2026,
    topic: '推理控制',
    status: '待验证',
    last_checked: '2026-10-07',
    next_review: '2027-01-04',
    supports: ['§7 形态（纪律注入）'],
    note: '轻量 HTTP 代理：打断 Ollama 死循环思考 + 空响应/截断续写（MIT；2026-08）'
  }
];

const CANON = {
  id: 'canon-spin-loop-frontier-20261007',
  claim:
    '空转/思考环：文献前沿与工程先例扫描（2026-10-07，用户裁定「补足文献（最新往旧排）+ 查除 opencode 外可读源码案例 + 核 opencode 时间线 + 完备 a/b」）。**文献（新→旧）**：RADAR（2609.38817，2026-09-30：失控推理四态、**异常注意力先于重复**、重对齐降环）→ **Circular Reasoning + LoopBench**（2601.05693，2026-01：**语义重复先于文本重复**、僵局触发、CUSUM 早检）→ ThinkBrake / When-More-Thinking-Hurts（ACL 2026）→ DEER 动态早退（2504.15895）→ S-GRPO / NeurIPS「Mirage」。「重复前可检、语义先于文本」＝与本仓 r4 假说同向，且**留出「语义级前置检测」空位**（现有工程实现全是输出流反应式）。**工程案例（含源码）**：DSH 专用 `unknowbug/dsh-thinking-loop-guard`（2026-08，turn 边界、无代理）⭐、`dustinmoon78/ollama-loop-guard`（2026-08，MIT 代理）、QwenLM/qwen-code（已合 commit 94543fa：reasoning 文本纳入重复检测；PR #9668 长块逐字环）、PraisonAI `escalation/doom_loop.py`、koda-core `loop_guard`（Rust）。**opencode 校正**：#15852（2026-03-03 提）2026-04-05 **关闭未合并**；#21112（2026-04-05 提）**至今 open、未合并**（nudge→compact→abort 三级）——**本体没有该能力**，非官方能力。模式共性：输出流阈值检测（10–2000 字 × 2–5 次）+ 三级升级；**无一台做语义级前置检测**。**a/b 完备化**：a＝「工具面优先」——速查表（痛点→一步命令）+ 轻查动作率指标（现成 usage/metrics 线）+ 纪律句「未定先问哪条命令一步回答」；b＝现场协议 v2（任务类型 × 距压缩步数两个标签）+ `session-scan` 语义重复检测器候选。全文：`research\\spin-loop-frontier-20261007.md`；关联 `orphan-thinking-junk-loop-r4`。',
  source: { type: '复现', ref: 'research\\spin-loop-frontier-20261007.md（含全部 URL）' },
  last_reviewed: '2026-10-07',
  event_time: '2026-10-07',
  tags: ['空转', '思维链', '死循环', '推理控制', '前沿', 'a/b', 'opencode']
};

let added = 0; let skipped = 0;
const fAll = new Set(loadStore('frontier').records.map((r) => r.id));
for (const e of FRONTIER) {
  if (fAll.has(e.id)) { skipped++; console.log('已存在，跳过：' + e.id); continue; }
  try { appendRecord('frontier', e); fAll.add(e.id); added++; console.log('已追加 [frontier] ' + e.id); }
  catch (err) { skipped++; console.log('跳过（校验未过）：' + e.id + ' — ' + String(err?.message ?? err).slice(0, 160)); }
}
const cAll = new Set(loadStore('canon').records.map((r) => r.id));
if (cAll.has(CANON.id)) { skipped++; console.log('已存在，跳过：' + CANON.id); }
else { appendRecord('canon', CANON); added++; console.log('已追加 [canon] ' + CANON.id); }
console.log(`完成：新增 ${added}，跳过 ${skipped}。`);
