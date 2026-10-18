// akasha/tools/harvest-20261010z75-mirror-layer-live-accept.mjs
// 2026-10-10：镜像元数据 + 知识分层的 MCP 面活体验收（重启后）。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const rec = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-mirror-layer-knowledge'));
if (!rec) { console.log('未找到条目'); process.exit(0); }
const marker = 'MCP 面活体验收（2026-10-10 重启后）';
if (rec.claim.includes(marker)) { console.log('已记录，跳过：' + rec.id); process.exit(0); }
const add = ' **' + marker + '**：`akasha_lookup(report:true)` 返回 `knowledge` 块——`stance=known`（强命中）· `layer=library` · 四层定义齐（模型内建/技能/本地大图馆/外网，外网标 `host:true` 且注明"回灌只许 append/annotate，不覆盖原文"）；`akasha_mirror_match` 命中回带 `story/evidence/era/context/patterns`（实测 6.1 分命中 `mirror-ghost-citation-r1`）；CLI `brief` 末尾打出「· 认知态：记得·库内（known · 层 library）」；插件武装（gate/sleep/session/worker v24.18.1）在位、零错误线；默认 A1 仍关（balance.enabled=false）。';
const next = revise('canon', rec.id, { claim: rec.claim + add, last_reviewed: '2026-10-10' });
console.log('已记录：' + rec.id + ' → ' + next.id);
