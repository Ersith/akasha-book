// akasha/tools/harvest-20261007t-compaction-vs-akasha.mjs
// 2026-10-07 留痕：会话压缩（compaction）与阿卡夏之书对表（用户提问触发）。幂等。
import { appendRecord, loadStore } from '../lib.mjs';

const rec = {
  id: 'canon-compaction-vs-akasha-20261007',
  claim:
    '会话压缩（compaction）与阿卡夏之书对表（2026-10-07，用户提问触发）：「同题同解，四轴全异」。同题 = 都承认「装不下」（库无界、装载有界）；同解 = 形态都是「蒸馏摘要 + 近段」。四轴差异：① 触发——压缩＝压力式抢救（上下文濒满才动手；马拉松实测两次，压缩#2 距用户投诉仅 9 分钟），阿卡夏＝计划性（睡眠离线蒸馏 + 平时按需检索）；② 选择性——压缩＝一次性整体替换（一块黑箱摘要盖掉旧史，问什么都只有它），阿卡夏＝索引 + 按需取前 N（brief/lookup/cross + 检索计分）；③ 可审计/可修订——压缩全无（无来源、无法核对、不可修订；摘要写歪则后续推理全在二手货上盖章；ACE「反 context collapse」批的正是整体重写路线，库内 frontier 有该条目），阿卡夏＝来源态四标签 + 修订链 + 审计；④ 可回取——阿卡夏原物永久在架（show/lookup 随时取），压缩只留简介、原始记录滞留会话档案且无常规回取通道（2026-10-07 写的 session-scan 系列工具＝在给压缩补一层「回取」）。一句话：阿卡夏＝设计性节食，压缩＝抢救性减重；一者把摘要当起点（可查可订可回取），一者把摘要当终点。另附目标差异：压缩保「会话内工作记忆」（会话还能继续），阿卡夏保「跨会话长期记忆」。',
  source: {
    type: '复现',
    ref:
      'compaction 实测（session-f362b992：compaction/start @turn10 与 @turn21，投诉 @turn24）+ akasha 设计原则（canon-akasha-usage / PROTOCOL：来源态、修订链、按需检索、装载有界）+ frontier 条目（front-ace-agentic-context-engineering / front-lost-in-the-middle）+ 用户 2026-10-07 提问原话'
  },
  last_reviewed: '2026-10-07',
  event_time: '2026-10-07',
  tags: ['compaction', '会话压缩', '阿卡夏', '对表', 'context collapse', '装载有界']
};

const existing = new Set(loadStore('canon').records.map((r) => r.id));
if (existing.has(rec.id)) console.log('已存在，跳过：' + rec.id);
else {
  appendRecord('canon', rec);
  console.log('已追加 [canon] ' + rec.id);
}
