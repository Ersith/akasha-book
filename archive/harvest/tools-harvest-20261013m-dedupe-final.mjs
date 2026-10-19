// akasha/tools/harvest-20261013m-dedupe-final.mjs
// 2026-10-13 深夜：去重收口（最终版）。**机械修法**：标记＝单一常量 MARK，判据与正文共用同一串——
//   前三次失手全因「判据凭记忆写整串」（括式/日期对不上）。另加**写完回读断言**：写入后重读链尾，标记必须在。
import { loadStore, currentRecords, revise } from './lib.mjs';

const MARK = 'DEDUPE-FINAL-20261013';   // 唯一标记：不带括号、不带日期、判据与正文同源
const cur = () => currentRecords(loadStore('canon').records);
const tip = cur().find((r) => String(r.id).startsWith('canon-idle-resume-v110-20261013'));
if (!tip) { console.log('未找到条目'); process.exit(1); }
if (String(tip.claim).includes(MARK)) console.log('= 已收口（标记命中 ' + MARK + '），跳过：' + tip.id);
else {
  const r = revise('canon', tip.id, {
    claim: String(tip.claim) +
      ` **（去重收口·终版·[${MARK}]）**：本条 r2 / r4 / r6 均为**判据失误导致的重复追加**（同一手法连错三次：判据串凭记忆写，与正文的括式/日期对不上；这是本会话复查最实的一课）。**有效文本＝ r1（主文）＋ r3（更正）＋ r5（收口）；r2 / r4 / r6 是重复，请忽略**。修法已机械化：标记＝单一常量（判据与正文共用同一串）＋**写完回读断言**（脚本内校验链尾含标记）＋复跑必须跳过。`,
    last_reviewed: '2026-10-13'
  });
  // 写完回读断言（不靠记忆）：链尾必须含 MARK
  const after = currentRecords(loadStore('canon').records).find((x) => String(x.id).startsWith('canon-idle-resume-v110-20261013'));
  const ok = after && String(after.claim).includes(MARK);
  console.log((ok ? '✓ 已收口且回读断言通过：' : '✗ 回读断言失败！') + r.id);
  if (!ok) process.exit(1);
}
