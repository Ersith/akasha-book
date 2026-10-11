// 2026-10-07 自举修复配套：把注入用法的「源真本金」落成 canon 记录 canon-akasha-usage。
// gate v1.1.0 在渲染系统提示时读它的**当前版本**（revise 它 = 改注入内容；本脚本幂等）。
// 用法：node akasha\tools\harvest-20261007-usage.mjs
import { appendRecord, loadStore } from '../lib.mjs';

const USAGE = [
  '## 阿卡夏之书（外置大脑 · v0）',
  '- 事实性断言尽量带来源态：学过 / 接触过 / 记得·库内 / 搜到；未标注按「学过」（未核验）处理。',
  '- 排序钉子：无据的确定 ≪ 有据的不确定；编造比承认不知道更糟。',
  '- 开工先 akasha_kit（起床包：睡眠 + 待办 + 审计 + 库况）；相关主题先 akasha_brief；查库 akasha_lookup；对位 akasha_cross；基石 akasha_frontier_due；自查 akasha_audit。',
  '- 更正走修订链：akasha_revise / frontier recheck（追加不改原文，currentRecords 取当前版本）。',
  '- 数据只经校验写入（akasha CLI / MCP 工具）；直接改 akasha\\data\\*.jsonl 会被门控拒绝。',
  '- 本段文本随库更新：改用法 = revise canon-akasha-usage（当前版本即注入内容）。'
].join('\n');

const rec = {
  id: 'canon-akasha-usage',
  claim: USAGE,
  source: { type: '复现', ref: 'gate v1.1.0 动态注入源（渲染时读当前版本；读库失败回退到插件内置同文兜底）；改用法 = revise 本记录' },
  last_reviewed: '2026-10-07',
  tags: ['akasha', '用法', '注入']
};

const existing = new Set(loadStore('canon').records.map((r) => r.id));
if (existing.has(rec.id)) {
  console.log('skip  canon canon-akasha-usage（已存在；改内容请用 revise）');
} else {
  appendRecord('canon', rec);
  console.log('added canon canon-akasha-usage（' + USAGE.length + ' 字）');
}
