// akasha/tools/harvest-20261013c-query-log-hygiene.mjs
// 2026-10-13：I-02 侧线卫生补记——机器检查（health-check / family-sweep 子套件）不得混进真查询日志（幂等）。
import { loadStore, currentRecords, revise } from './lib.mjs';

const cur = currentRecords(loadStore('canon').records);
const rec = cur.find((r) => String(r.id).startsWith('canon-akasha-batch1-i01i02-20261013'));
if (!rec) { console.log('未找到批次 1 条目'); process.exit(1); }
if (rec.claim.includes('侧线卫生补记')) { console.log('已含，跳过：' + rec.id); process.exit(0); }
const r = revise('canon', rec.id, {
  claim: rec.claim +
    ' **（侧线卫生补记，2026-10-13 晚）**：首跑体检即实测到机器探测混入真侧线——health-check 的只读探询 3 条落进 logs/query-log.jsonl。' +
    '已修根因：health-check 读面 spawn、MCP 夹具 spawn、family-sweep 子套件 spawn 一律带 `AKASHA_QUERY_LOG=off`（自测 / 机器检查不落真侧线）；' +
    '已污染的 3 条依「先备份后清理」移除（原档留 `logs/_trash/2026-10-13-query-log-before-prune.jsonl`）。' +
    '判据：**侧线只收真实使用**（机器探测与真使用必须可区分——同族纪律见 canon-akasha-toolchain-audit-20261013 的沙箱段教训）。',
  last_reviewed: '2026-10-13'
});
console.log('已修订：' + rec.id + ' → ' + r.id);
