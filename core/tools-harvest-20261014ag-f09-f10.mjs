import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-gpt-review-20261014-c'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**GPT 审查终批（F09/F10）+ Claude 两小修（#5/#6）（2026-10-14）**。',
  '**F09 会话状态分桶**：sleep 插件原把 观测计数（轮/压缩）/失败列表/首用集合/触发去重/去抖状态 全放进程级 ⇒ 换会话继承（B 会话首轮会收到「本会话已压缩 5 次」与 A 的失败提示）。改造＝**会话桶**（sessionStates，Map ≤8 桶 LRU；事件先 retarget(sidOf(payload)) 切桶；sid 取自 agent.session.id/agent.id/session 等常见形状）——渲染面只取当前桶。**她原脚本复跑：B 会话零继承（newSessionB=null）✓**。',
  '**F10 C3 当轮标记**：C3「已触发」从**永久布尔**（c3Fired，一次触发压制 C1 直至重载）改为**当轮标记**（c3Turn === obs.turn 才让位）。复跑：首轮 C3 触发后，**次轮 C1 恢复渲染** ✓（nextC1 有内容、freshC1 首用提示正常）。',
  '**Claude #5（文档漂移）**：总案 I-12a 行「≥3000 段」→**≥2000 段**（代码 GENRE_DOSE_DEFAULTS.longSessionSegs；2026-10-13 案发 2179 段标定；明注「3000 系笔误」）。**Claude #6（gate 分裂写误拦）**：WRITE_REDIRECT 空目标例外兼容 `2> /dev/null`（`>` 与目标间空格），并把空目标从宽口径 `/dev/` **收窄为精确 `/dev/null`**（真设备写仍拦）；两侧哨兵 +2（只读放行 / 真写+分裂写仍拒）。**gate 自测全绿 · sleep 自测全绿**。',
  '**打包安装**：gate **1.4.1-h1** / sleep **1.10.4-h1** 已打包装入 —— **restart-required，待重启生效**（family-sweep 转绿）。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-gpt-review-20261014-c',
  claim,
  source: { type: '复现', ref: 'dsh-akasha-sleep/lib/index.js 会话桶改造（tmp/sleep-session-bucket-fix.mjs）· 她原脚本复跑 my-sleep-results2 · gate selftest · sleep selftest · research/akasha-master-plan-v1-20261013.md' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['外部审查', 'F09', 'F10', '会话隔离', 'gate', '文档更正'],
});
console.log('已入 canon：' + r.id);
