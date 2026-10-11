// akasha/tools/harvest-20261010z68-a1-protocol-question.mjs
// 2026-10-10：A1 的"协议/自我层条目也会被降权"设计观察（开启前需裁定）。幂等。
import { loadStore, currentRecords, revise } from '../lib.mjs';

const rec = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-rank-a1-loadbalance'));
if (!rec) { console.log('未找到条目'); process.exit(0); }
if (rec.claim.includes('协议/自我层豁免')) { console.log('已记录，跳过：' + rec.id); process.exit(0); }
const add = ' **设计观察（开启 A1 前需裁定；2026-10-10 活体读数）**：用量窗口（7 天、quota 1.2754、total 88 / distinct 69）显示 **6 个条目超配额**，其中包含**协议/自我层类**条目——`canon-address-layers-20261008`（×4）· `canon-self-concept-20261008`（×3）· `canon-akasha-usage-r20`（×2）· `canon-akasha-usage`（协议条）等。而 A1 的校正对**所有非孤案条目**生效（含 `cls==="protocol"`）⇒ 一旦全局开启，**"每会话必读/必引"的协议与自我层条目会被降权**（它们是设计上的高频对象，不是检索热度垄断）。**候选处置**：① 对 `cls==="protocol"` 豁免平衡（改一行判断）；② 或对 tag『自我』/协议条给更高配额；③ 或接受（视作"引用税"）。**未裁定前保持默认关**。';
const next = revise('canon', rec.id, { claim: rec.claim + add, last_reviewed: '2026-10-10' });
console.log('已修订：' + rec.id + ' → ' + next.id);
