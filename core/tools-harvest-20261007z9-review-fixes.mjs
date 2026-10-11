// akasha/tools/harvest-20261007z9-review-fixes.mjs
// 2026-10-07 留痕：小阿卡夏整体复查（两遍+两轮）之修复批 → canon spin 链 r6。幂等。
import { loadStore, revise, currentRecords } from '../lib.mjs';

const APPENDIX =
  ' **整体复查（2026-10-07，两遍+举一反三两轮）**：新抓 3 + 修复批内 2 = **5 个真问题全部闭环**——R1 `punctRuns` 含 `\\s`（markdown 列表误报；阿巴阿巴试用 5 条命中全为误报——活数据铁证）→ 剔除空白 + 哨兵（扫描器：154→2 全真模板串）；R2 turn 环读 `session.events`（官方无此属性、同步读者已弃用）→ **事件流缓存**；R3 压缩信号 `agent/created source===\'compact\'` 非真值（只有 startup/resume）→ 改挂 **`compaction/end`**（成功才记）；R4 chunk 帧不带 turn/step → start 帧缓存补全；R5 `session node <id>` `.find()` **stale-read**（跨代同 id 取旧代，真库 15 例）→ 取最新 treegen + 跨代提示。终验：selftest **18/18**、主套件 **75/1**（唯一红=并行会话 frameTruncated 跨 node 漂移，归其线）、check 全绿；插件 **0.2.3**（restart-required）。报告 `research\\session-family-review-20261007.md`。小阿卡夏达「差不多没问题」状态。';

const tips = currentRecords(loadStore('canon').records);
const tip = tips.find((r) => r.id.startsWith('canon-spin-loop-frontier-20261007'));
if (!tip) { console.log('未找到 canon-spin-loop-frontier 链尾'); process.exit(1); }
if (tip.claim.includes('整体复查（2026-10-07，两遍+举一反三两轮）')) { console.log('已含复查段，跳过：' + tip.id); process.exit(0); }
const r = revise('canon', tip.id, { claim: tip.claim + APPENDIX });
console.log('已修订：' + tip.id + ' → ' + r.id);
