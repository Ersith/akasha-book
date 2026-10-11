// 2026-10-07：把「写→可见」通道的教训与实现落成 canon（幂等）。
// 用法：node akasha\tools\harvest-20261007-pulse.mjs
import { appendRecord, loadStore } from '../lib.mjs';

const rec = {
  id: 'canon-akasha-pulse-visibility',
  claim: '阿卡夏「写→可见」通道（v1.3，2026-10-07 立）：库的写入（任何会话 / 脚本经 lib.appendRecord / CLI / MCP）**必须伴随可见性**，否则跨会话知识传递靠运气——实况：并行会话写入 canon 26 条 + frontier +17 条时，本会话直到手动 check 才发现，期间完全「不知道库里有新东西」。实现：`lib.pulse()`（六库当前计数 / 每库最后一条 id / 全库最近写入与相对时间）+ 睡眠器把「阿卡夏·库脉搏：…；最近写入 <store>#<id>（X 分钟前）」注册为每回合 runtime context（akasha:pulse，order 132）——任何活跃会话下一回合即见新写入，可立即 lookup / brief 回忆。设计归类：机械钩子新增「库变更」一类（原四类：回合前后 / 出错 / 空闲）。',
  source: {
    type: '复现',
    ref: 'dsh-akasha-sleep v1.3.0（renderPulseLine + akasha:pulse 注册）+ akasha\\lib.mjs（pulse / ageText）；测试：akasha test.mjs 35/35（含 pulse 断言）、sleep selftest 全绿（含真库渲染一路）；事发现场：2026-10-07 并行会话入库未被本会话即时看到'
  },
  last_reviewed: '2026-10-07',
  tags: ['akasha', '可见性', '机械钩子', '库脉搏']
};

const existing = new Set(loadStore('canon').records.map((r) => r.id));
if (existing.has(rec.id)) {
  console.log('skip  canon ' + rec.id + '（已存在；改内容请用 revise）');
} else {
  appendRecord('canon', rec);
  console.log('added canon ' + rec.id);
}
