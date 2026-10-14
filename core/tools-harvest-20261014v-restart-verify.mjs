// 2026-10-14：重启核验（MCP 三件 + C3 半句 + AGENTS 同步）。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-restart-verify-20261014b'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**重启核验（2026-10-14 第三轮；「重启了检查下」；三件待重启全清）**。',
  '**① MCP 复审三件进桥 ✓**——桥面（真·`mcp__akasha__*`）实调 `akasha_review_list` 返回 entries（工具面 **21**）。② **C3 近场半句活体 ✓**——本回合 runtime context 库脉搏行含「 · 相关主题先 brief」。③ **AGENTS §6 三处同步 ✓**——工具数 18→21 · 装载态 session `0.3.2-h5`/sleep `1.10.2-h1`（已活体核验）· 「改核心即时生效」表述更正（require 缓存实测）；pre 快照 `docs/history/AGENTS-2026-10-14-pre-mcp21.md` 已存、§7 清单已补。',
  '**机械面**：armed 三件同 pid **36784**（gate/session/sleep）；test **233/233** · check **725/725** · family-sweep 全绿 · health-check **51/51** · 快照 `canon:33a0e7b400cd`。',
  '**口径一致性**：sleep 插件包版本未变（1.10.2-h1，C3 是核心侧改动）——与「壳换才需重打包」判据一致；本轮把昨日「重启后核验」板条整条清空。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-restart-verify-20261014b',
  claim,
  source: { type: '复现', ref: '桥面实调 review_list · 本回合脉搏行（C3）· AGENTS diff（pre 快照）· armed 线 · test/check/health-check/family-sweep' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['重启核验', 'MCP', 'C3', 'AGENTS'],
});
console.log('已入 canon：' + r.id);
