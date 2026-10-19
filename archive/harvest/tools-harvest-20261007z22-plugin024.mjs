// akasha/tools/harvest-20261007z22-plugin024.mjs
// 2026-10-07 留痕：插件 0.2.4（lagMs/slow 线）+「改源码≠装插件」教训 → session-usage 链。幂等。
import { loadStore, revise, currentRecords } from './lib.mjs';

const APPENDIX =
  ' **插件 0.2.4（2026-10-07 深夜）**：索引观测增 `lagMs`（事件循环延迟采样，每秒 tick 偏差）与 `session-index-slow`（>1.5s 告警线）——补4 观测先行落地；宿主已装 0.2.4（**restart-required**，下次重启激活其活体落线）。**教训入册（重启核验当场抓到）**：本次先在**源码目录**改了插件、未重装——重启后 `lagMs` 零落线，复核证实「安装副本仍 0.2.3 无该字段」⇒ 插件改动投产必须走满**三段**：`npm pack` → `plugin_manager install_bundle` → 重启（与「目录依赖会被清」同族的安装流程纪律）。同批复核：armed 新 pid 51012、loop-watch 仍 **16 / 零新增**、索引耗时 522–713ms（观测期无慢线）。';

const tips = currentRecords(loadStore('canon').records);
const tip = tips.find((r) => r.id.startsWith('canon-session-layer-usage-20261007'));
if (!tip) { console.log('未找到 session-usage 链尾'); process.exit(1); }
if (tip.claim.includes('插件 0.2.4（2026-10-07 深夜）')) { console.log('已含 0.2.4 段，跳过：' + tip.id); process.exit(0); }
const r = revise('canon', tip.id, { claim: tip.claim + APPENDIX });
console.log('已修订：' + tip.id + ' → ' + r.id);
