// akasha/tools/harvest-20261010z73-a1fix2-live-accept.mjs
// 2026-10-10：A1 豁免+root-id 修正的 MCP 面活体验收（重启后）。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const rec = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-a1-id-convention-gap'));
if (!rec) { console.log('未找到条目'); process.exit(0); }
const marker = 'MCP 面活体验收（2026-10-10 重启后）';
if (rec.claim.includes(marker)) { console.log('已记录，跳过：' + rec.id); process.exit(0); }
const add = ' **' + marker + '**：`loadBalance:true` 经 MCP 实测——协议条 `canon-akasha-usage-r25` count **8** + `protocol-exempt`；自我层三条 count **7 / 5 / 2** + `self-layer-exempt`（`root` 字段已暴露，便于审计根 id 归一）；非豁免条 `canon-rank-a1-loadbalance-20261010-r4` count 2 → **over-quota 校正 0.8203**（真吃罚）；默认（不带参数）行为不变；gate/sleep/session/worker 武装在位、零错误线。';
const next = revise('canon', rec.id, { claim: rec.claim + add, last_reviewed: '2026-10-10' });
console.log('已记录：' + rec.id + ' → ' + next.id);
