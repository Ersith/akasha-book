// akasha/tools/harvest-20261007m-paper-v03.mjs
// 2026-10-07 论文 v0.3 留痕：canon-paper-v01 → 下一次修订（补 v0.3 说明）。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const cur = currentRecords(loadStore('canon').records).find(r => r.id.startsWith('canon-paper-v01-20261007'));
if (!cur) { console.log('找不到 canon-paper 条'); }
else if (cur.claim.includes('v0.3')) { console.log('已修订过，跳过：' + cur.id); }
else {
  const r = revise('canon', cur.id, {
    claim: cur.claim + ' **v0.3（2026-10-07 深夜）**：依**原始讨论存档**（OpenViking events 10-06「AI 记忆架构共识达成」）重写 §1.4——补入起点事件「GPT-MC-苦力怕 → 狂写防御条规进 md → 撑爆上下文 → 疯狂种土豆」、「驳回→修正」真实往返（库尺寸 vs 装载尺寸 / 时间标尺 / 定价机）、「冲突不许合并」原文句；来源口径改「原话引用」。配套：canon-akasha-origin-20261006 + mirror-creeper-panic 补录；五源路由（usage r12）。'
  });
  console.log('已修订：' + cur.id + ' → ' + r.id);
}
