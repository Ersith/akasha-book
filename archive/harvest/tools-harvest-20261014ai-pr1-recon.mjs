// akasha/tools/harvest-20261014ai-pr1-recon.mjs —— PR#1 侦察与两裁定留痕（幂等：单一常量）
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-pr1-recon-20261014'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  "**Claude PR #1 侦察与两条裁定（2026-10-14）**。**实况**：交付包 `akasha-full-deliverable-20261014.tar.gz` 基于 `61c38cc`（=F09/F10 批），与 main（F08+描述批）冲突点＝双方同改 akasha.mjs/lib.mjs/mcp.mjs/test.mjs；**非版本过旧，是 fork 后 main 前进**。且它不止评审——**GitHub 真 PR #1**（分支 `cursor/read-tier-maturity-1471`，+586/−78 · 11 文件）：读档三档（pointer/summary/full）、读侧 `agePrefix`（[过去·N天]）、L4 引用核对（citeAllowlist+checkCitations）、**genre_render 翻真**、生产 `--force` 闸（productionForceRejected）、MCP 紧凑 JSON（pretty 才缩进）、复审小样本协议（reviewSample）、三份文档更新、+216 行测试。",
  "**裁定（Master，2026-10-14 19:49）**：① **默认档＝保持全文**（`readDepthOf` 默认 `'full'`，三档为显式 opt-in `--depth summary|pointer`；brief perStore 默认回 3；show 硬顶/cross 行宽 300 默认不生效；文档措辞同步「默认全文」）——「性能优先」口径：削减不突袭默认，默认档零差异为验收判据（golden 对照）。② **由 Claude 云端 agent 先 rebase**（两边都留：depth × maxTokens/offset；F08 的 clipByBudget 不得被覆盖），rebase 后 **不 merge**，留 PR #1 交接收侧复核。指令件：`research/pr1-rebase-instruction-20261014.md`（可直接转发）。**流程**：rebase 完成 → 接收侧 fetch 审 diff → 本地合并 → 全量绿测 → push main。",
].join('');
const r = appendRecord('canon', {
  id: 'canon-pr1-recon-20261014',
  claim,
  source: { type: '复现', ref: 'tmp/claude-deliv2（PR1-REVIEW-20261014.md / PR1-a30c1f0.diff / DELIVERABLE-README.md）· GitHub PR#1 · Master 裁问答（ask_user_question 2026-10-14 19:49）' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['Claude', 'PR', '读档三档', '裁定', 'rebase'],
});
console.log('已入 canon：' + r.id);
