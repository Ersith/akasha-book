// akasha/tools/harvest-20261008z39-final-dedup.mjs
// 2026-10-08 终修：把 oss 链尾重组为「底文 + 单份深夜说明 + 单条去重注记」。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const MARK_NIGHT = ' **更正（深夜）**';
const MARK_DEDUP = ' **更正（去重）**';
const FINAL_NOTE = ' **更正（去重）**：早前 r16/r17 重复追加同段、r18/r19 追加两条多余说明——以本版为准（单份说明）。';

const tips = currentRecords(loadStore('canon').records);
const oss = tips.find((r) => r.id.startsWith('canon-oss-package-20261007'));
if (!oss) { console.log('未找到链尾'); process.exit(1); }
if (oss.claim.includes('以本版为准（单份说明）')) { console.log('已为单份，跳过：' + oss.id); process.exit(0); }

const claim = oss.claim;
const n1 = claim.indexOf(MARK_NIGHT);
const n2 = claim.indexOf(MARK_NIGHT, n1 + 1);
const d1 = claim.indexOf(MARK_DEDUP);
if (n1 < 0) { console.log('找不到深夜标记，人工处理'); process.exit(1); }
const base = claim.slice(0, n1);
const cutEnd = (n2 >= 0) ? n2 : (d1 >= 0 ? d1 : claim.length);
const appendix = claim.slice(n1, cutEnd);
const next = base + appendix + FINAL_NOTE;
const r = revise('canon', oss.id, { claim: next });
console.log('已修订：' + oss.id + ' → ' + r.id + '（底文 ' + base.length + ' + 说明 ' + appendix.length + ' + 注记）');
