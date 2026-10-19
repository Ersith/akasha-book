// akasha/tools/harvest-20261013b-usage-batch1.mjs
// 2026-10-13：用法条同步——批次 1 首批新面（复审到期清单 + 查询监控）（受控路径 allowProtocol；行为更新→同批同步用法）。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const tips = currentRecords(loadStore('canon').records);
const usage = tips.find((r) => r.id === 'canon-akasha-usage' || r.id.startsWith('canon-akasha-usage-r'));
if (!usage) { console.log('未找到用法条'); process.exit(1); }
if (usage.claim.includes('批次 1 首批新面')) { console.log('已含，跳过：' + usage.id); process.exit(0); }

const r = revise('canon', usage.id, {
  claim: usage.claim +
    '\n**㉒ 批次 1 首批新面（2026-10-13）**：`audit --due` ＝ **复审到期清单**（I-01 原型：信任级×时龄——核心 30d（T1/T2 与渲染条）/ 一般 90d / 年审 365d；只报不裁，`--today` 可模拟）；' +
    '**查询监控侧线** `logs/query-log.jsonl`（I-02：ts / via / cmd / query / hits / zero / ms / session / genre_render / ids；`metrics` 出「查询维度」——零结果率 / 高频 top / 命中被引用率，样本 <5 ⇒ null 不冒充；`AKASHA_QUERY_LOG=off` 关断——自测/批量脚本防污染真日志）。见 canon-akasha-batch1-i01i02-20261013 与总案 v1.1 §6。',
  last_reviewed: '2026-10-13'
}, { allowProtocol: true });
console.log('已修订：' + usage.id + ' → ' + r.id);
