// akasha/tools/harvest-20261010z99-dossier.mjs —— 卷宗指针入 canon
import { loadStore, currentRecords, revise } from '../lib.mjs';

const recs = currentRecords(loadStore('canon').records);
const hit = recs.filter((r) => String(r.id).startsWith('canon-observation-ledger')).pop();
if (!hit) { console.log('未找到台账条目'); process.exit(0); }
if (String(hit.claim).includes('外部评审卷宗')) { console.log('= 已记录'); process.exit(0); }
const add = ' **外部评审卷宗（2026-10-10，用户令「给个整理文档，发给 Claude 评估」）**：`docs/akasha-dossier-20261010.md`（192 行 / 16 KB，自包含）——十节结构：速览 → 设计立场 → 三套记忆分工 → 架构 → 10 项关键机制（逐条带证据态）→ 运行实况与证据 → 自己踩过的坑 → 观察台账要点 → **诚实弱点清单** → **给评审者的 10 个具体问题** + 术语表 / 命令速查 / 公开材料；全文用 `[已复现]/[已核]/[未验]/[设计]` 标注证据态，并主动写明「记忆有效性无对照实验证明」「门控是劝告层不是安全边界」「他人机器未验证」。OSS `68fcd79`。';
const next = revise('canon', hit.id, { claim: hit.claim + add, last_reviewed: '2026-10-10' });
console.log('已记录：' + hit.id + ' → ' + next.id);
