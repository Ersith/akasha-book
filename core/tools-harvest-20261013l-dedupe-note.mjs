// akasha/tools/harvest-20261013l-dedupe-note.mjs
// 2026-10-13 深夜：去重收口——把 r2/r4 两次重复追加一次性说清（有效文本＝r1 主文 + r3 更正）。幂等（判据＝日期无关短串）。
import { loadStore, currentRecords, revise } from './lib.mjs';

const cur = () => currentRecords(loadStore('canon').records);
const tip = cur().find((r) => String(r.id).startsWith('canon-idle-resume-v110-20261013'));
if (!tip) { console.log('未找到条目'); process.exit(1); }
const claim = String(tip.claim);
if (claim.includes('（再更正·去重收口）')) console.log('= 去重收口已存在，跳过：' + tip.id);
else {
  const r = revise('canon', tip.id, {
    claim: claim +
      ' **（再更正·去重收口·2026-10-13）**：本条的「更正（去重）」段在 **r4** 又被重复追加一次（补正块判据二次写错：框式串被写进了日期）——**有效文本＝ `r1`（主文）＋ `r3`（更正）；`r2` / `r4` 是重复，请忽略**。脚本判据已改为**日期无关短串**并复跑验证：六个收尾脚本 14 条判据**全部跳过**。教训升级（已入复查记录）：**防重复判据只认短、稳、日期无关的片段，且写完必须回读实际入库文本再复跑一次**——凭记忆写整串，两次都会错。',
    last_reviewed: '2026-10-13'
  });
  console.log('已收口：' + tip.id + ' → ' + r.id);
}
