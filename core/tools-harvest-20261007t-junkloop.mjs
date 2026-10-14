// akasha/tools/harvest-20261007t-junkloop.mjs
// 2026-10-07 留痕：思考链标点空转循环（模型行为观察，用户当场指出）。幂等。
import { appendRecord, loadStore } from './lib.mjs';

const rec = {
  id: 'orphan-thinking-junk-loop',
  summary: '思考链的标点空转循环：长会话高密度工具循环中，思维链反复出现「——：——：——：」等无信息标点串（模拟「下一步推进」的空转），未进入正式输出',
  observed: '2026-10-07 马拉松会话（论文修订→开源包制作→缺陷修复，数百次工具调用、上下文极长）中多段出现；用户直接指出「思维链里一堆 ——：——：——： 什么情况」。正式回答与工具调用不受影响。',
  hypothesis: '生成长度/密度压力下「停顿填充」退化——把「即将决定但未组织好」的状态重复写为空标点，类似口头语「呃…呃…」卡带；不排除与超长上下文中的注意力稀释有关。',
  would_confirm: '下次超长会话再观察同类空转（可统计出现段落的分布条件：决策停顿点 / 验证等待点）。',
  would_refute: '短会话或新会话不再出现，或仅为本会话一次性偶发。',
  severity: '低',
  created: '2026-10-07',
  event_time: '2026-10-07'
};

const existing = new Set(loadStore('orphan').records.map(r => r.id));
if (existing.has(rec.id)) console.log('已存在，跳过：' + rec.id);
else { appendRecord('orphan', rec); console.log('已追加 [orphan] ' + rec.id); }
