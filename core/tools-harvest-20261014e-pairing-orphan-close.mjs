// 2026-10-14：结转载「配对满配」备料孤案——修复已由吸收窗口 1 落地（emit 门修复），孤案补结转说明。幂等：判据＝单一常量。
import { loadStore, currentRecords, revise } from './lib.mjs';
const MARK = 'ABSORBED-INTO-WINDOW1-20261012-CLOSED-20261014';
const rec = currentRecords(loadStore('orphan').records).find((r) => String(r.id).startsWith('orphan-mv4rtl7m'));
if (!rec) { console.log('未找到孤案'); process.exit(1); }
if (String(rec.summary).includes(MARK)) console.log('= 结转说明已存在');
else {
  const r = revise('orphan', rec.id, {
    summary: String(rec.summary) + ' 【结转·' + MARK + '】备料已被吸收：同日「吸收窗口 1」（第二十三次受控解冻）按本备料落地修复——extractSegments 增 completedCallSeqs（配对成功且无完成版 ⇒ 强制 emit，不受 emitFrom 门限）+ recordedUnpaired 加固；真库回填 13 会话 +141 完成版，残余「无结果」为结果确未到达之真残渣。证据：canon-absorption-window1-20261012-r1；代码核对（2026-10-14）：session.mjs L191-203 在位。板条 #1 据此可结。',
  });
  console.log('已结转：' + rec.id + ' → ' + r.id);
}
