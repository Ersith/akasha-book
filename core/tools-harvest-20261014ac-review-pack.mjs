// 2026-10-14：评审包构建留痕。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-review-pack-20261014'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**评审包交付（2026-10-14；用户令「打个包给 gpt/Claude 看」）**：`dist/akasha-review-pack-20261014.zip`（132 KB / 19 条）＝仓库外补充材料：**AGENTS.md**（工作区总纲）＋ **research 17 份**（专案簇 11：总案 / 复审运维设计 / 思维链审计 / 体裁隔离三件 / 记忆与算法优化 / 工具链审计 / 设计稿源头 / 首次评审记录；旁证文献簇 6：记忆全景 / MemGPT 记要 / LoRA-CoT 退化调查 / Letta 拆解 / OpenViking 拆解 / 现实通信补充）＋ **REVIEW-GUIDE.md**（导览：仓库入口 + 六个建议评审问题）。',
  '**清洗**：与 `oss-scrub-paths.mjs` 同口径（路径族/@akasha-book/端口族拼接构造/用户名）——清洗命中 6 份、独立硬扫描 **0 命中**；原文件未改动（构建于 staging 副本）。**明确排除**：session.jsonl（对话 L0）、official-home、tmp/_scratch/archive、AGENTS 快照群。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-review-pack-20261014',
  claim,
  source: { type: '复现', ref: 'tmp/build-review-pack.mjs · dist/akasha-review-pack-20261014.zip（19 条 / 132 KB）· 硬扫描 0' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['评审包', '交付', '清洗'],
});
console.log('已入 canon：' + r.id);
