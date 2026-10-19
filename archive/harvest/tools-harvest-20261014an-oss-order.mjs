// akasha/tools/harvest-20261014an-oss-order.mjs —— 复检发现：sync→scrub 顺序纪律再实证
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-oss-order-20261014'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  "**OSS 顺序纪律再实证：sync 之后必须 scrub（2026-10-14，复检抓到）**。**事件**：GPT 复核二轮收尾后做两遍复检，第二遍「幂等轴」发现 `git status` 出现 **15 个可疑修改**——`core/tools-*.mjs` 等呈 `<LOCAL_PATH>` → `<LOCAL_PATH>` 的**反 scrub 变化**。**根因**：本轮只跑了 `sync-core/sync-data` 而**漏跑 `oss-scrub-paths.mjs`**——sync 会把**工作区原文**（含 `<LOCAL_PATH>` 等环境事实）拷入发布树，而 scrub 才是把本机路径换成占位符的那一步；未 scrub 直接提交＝**环境事实反渗入公开仓**。**处置**：补跑 scrub ⇒ 15 个伪差收敛为 1 个真改（test.mjs），随后按四步顺序重新提交。**纪律**（再次钉死）：**sync → scrub → scan → commit**，缺一不可；「sync 带回已清痕迹」是同一顺序的**镜像面**（R31 时期首踩）。**教训的教训**：该纪律此前以「sync 会把已清洗痕迹带回」的形态记录，本轮漏步说明**检查面要双向**——复检时既看「是否带回旧痕迹」，也看「是否带出新反渗」。",
].join('');
const r = appendRecord('canon', {
  id: 'canon-oss-order-20261014',
  claim,
  source: { type: '复现', ref: '复检第二遍（幂等轴）· git status 15→1 收敛 · 提交 db92dff' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['OSS', '纪律', 'scrub', '复检', '教训'],
});
console.log('已入 canon：' + r.id);
