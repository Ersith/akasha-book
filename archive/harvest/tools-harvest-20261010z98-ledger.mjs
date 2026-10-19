// akasha/tools/harvest-20261010z98-ledger.mjs —— 五项观察期产出入库（台账 + 结论）
import { loadStore, currentRecords, appendRecord } from './lib.mjs';

const canon = currentRecords(loadStore('canon').records);
if (canon.some((r) => r.id.startsWith('canon-observation-ledger-20261010'))) { console.log('= 已记录'); process.exit(0); }
const r = appendRecord('canon', {
  id: 'canon-observation-ledger-20261010',
  claim:
    '**观察台账落地（2026-10-10，用户令「这五项先做」）**：新增 **`docs/observation-ledger.md`（仓内一页）**，把观察期的事实与判据集中管理（此后新的观察数字进这一页，不再散记）。四块结论：' +
    '**① 漏召率复盘**（基线：失败回合 59、失败前未查库 50＝**84.7%**、事后补查 7）：分三层——**结构层**（过半失败本不可防：web_fetch/edit 失配＝工具与环境的账）、' +
    '**可预防层（真问题）**（`edit`×29/`pwsh`×13 里有相当比例是库里已写过的坑，只是动手前没被调用 ⇒ **与"称呼漂移"同族：规则在库里、执行点没接线**）、**观察层**（回查提示有 12% 事后补救效力，但**太晚**）。' +
    '候选对策三条（**不实现**，登记待评估）：C1 易错点前置提示（按 tool 名注入已知坑）、**C2 分层统计（把分母换成"本可预防的失败回合"；度量修正，优先级高于 C1）**、C3 脉冲行固定半句"相关主题先 brief"。' +
    '**② 候选池五项评估**：**留 3**——`promoted_to`（补 promote 断链）、`mirror role`（先看 mode 使用率再扩）、`回放`（先定用途以免成第二真相源）；**缓 2**——`credibility`（避免与 A1/A2 同时动排序变量）、`睡眠合并`（红线近旁：必须"合并只许追加 supersedes 版"）。' +
    '**③ 排序因子观察期基线**：工具 5781（98%）/ 拦截 14 / 回合 343 / 审计线 23 / 引用命中 124 / 修订链 167 版；轻查率 3.7%（每回合 0.62）；引用 top=address-layers·qwen-id-balancing·kv-phase-sensitive。判据写死：rank 违和个案 ≥3 才复核；引用命中未降即良性。' +
    '**④ A1/A2/arousal 判据**：A1 默认关（需"顺序伤有用性"实证才开）；A2 默认关（**须真 scoreFn（logprob 偶/奇）出正结果**，代理 scoreFn 不作依据）；`arousal:0` 暂维持（sev 0.5 降权 vs 不写=中性 1.0），待 SCHEMA 写清两记法语义差。' +
    '**收尾**：sleep README/EVIDENCE 记入 1.5.4 称呼行；OSS `01005e3`（7 文件）；本条目＋台账构成"代码＋文档＋记忆＋canon"闭环。**与冻结的关系**：本批全为登记/度量/文档类，C1/C3 与候选池实现属功能类，须解冻后另行排期。',
  source: { type: '复现', ref: 'akasha.mjs metrics 快照（2026-10-10）+ docs/observation-ledger.md + OSS 01005e3' },
  event_time: '2026-10-10',
  last_reviewed: '2026-10-10',
  tags: ['观察期', '台账', '漏召率', '候选池', '判据'],
});
console.log('已入 canon：' + r.id);
