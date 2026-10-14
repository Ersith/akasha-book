// 2026-10-14：更正记录——sidebar_open 旧版失败为用户一手实测（早于阿卡夏之书，库内无档）。幂等：判据＝单一常量。
import { loadStore, currentRecords, revise } from './lib.mjs';
const MARK = 'USER-TESTED-OLDVER-CORRECTION-20261014';
const rec = currentRecords(loadStore('canon').records).find((r) => String(r.id).startsWith('canon-upgrade-sweep-20261014'));
if (!rec) { console.log('未找到条目'); process.exit(1); }
if (String(rec.claim).includes(MARK)) console.log('= 更正已存在');
else {
  const tail = ' **【更正·[' + MARK + ']**：上条生效确认里写的「本机未实测过旧版行为」**不准确、收回**——sidebar_open 在 0.24.1（旧版）上的失败是**用户一手实测过的**（发生在阿卡夏之书立库之前，故本库无档；本会话前段我据库内检索得出过窄结论）。缺陷认定因此从「代码层对照」升为「代码层对照 ＋ 用户一手实测」双证。教训（同族）：**早于书库的历史事实检索不到 ≠ 未发生**——用户一手记忆优先级高于「库里没查着」。';
  const r = revise('canon', rec.id, { claim: String(rec.claim) + tail, last_reviewed: '2026-10-14' });
  console.log('已更正：' + rec.id + ' → ' + r.id);
}
