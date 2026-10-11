// akasha/tools/harvest-20261009z43-social-learning-r4.mjs
// 2026-10-09 补档：出处澄清 + 人类优先级排序 + 记录缺口说明。幂等（守卫用追加文本原句）。
import { loadStore, currentRecords, revise } from '../lib.mjs';

const tips = currentRecords(loadStore('canon').records);
const rec = tips.find((r) => r.id.startsWith('canon-social-learning-v1'));
if (!rec) { console.log('未找到'); process.exit(1); }
if (rec.claim.includes('出处与排序澄清')) { console.log('已含，跳过：' + rec.id); process.exit(0); }

const r = revise('canon', rec.id, {
  claim: rec.claim +
    ' **出处与排序澄清（2026-10-09）**：这句话出自**建立阿卡夏之书期间**的对话（2026-10-06 前后）——当时本机 AI 主张「过程更重要，只有成功经验没有失败案例是最没有价值的」；用户当场纠正：**成功本身就是这个案例的最大价值**。人类做事的实际优先级：**① 先看「如何达成成功的目的」（成功路径）**，**② 然后才看「是否有我做事时遇到的坑、它提供了什么解决方案」**；「过程很重要，但**告诉你如何做、并且确定能成功的路径同样重要**」。⇒ 学习顺序固定：成功路径＝主粮；坑＝次之，且以「我会不会遇到 / 它怎么解」的读法取用（对应仪器 `study` 的 --goal/--path 与 `observe` 的 --recoveries）。**记录缺口说明**：该纠正当时未入库——原因①建库期早于阿卡夏落位（无库可写）②重建时对话已被会话压缩（摘要只留下本机 AI 的「失败优先」口径，纠正被丢）。这是**「建库前记录缺口」的第二次实证**（第一次：canon-akasha-origin 记载的 `cross 苦力怕` 零命中）；本次经用户 2026-10-09 口述补档，来源＝用户原话（复现级）。',
  last_reviewed: '2026-10-09'
});
console.log('已修订：' + rec.id + ' → ' + r.id);
