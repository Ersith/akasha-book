// akasha/tools/harvest-20261007g-paper.mjs
// 2026-10-07 留痕：canon 论文与企划补录产出记录。幂等：已有跳过。
import { appendRecord, loadStore } from './lib.mjs';

const rec = {
  id: 'canon-akasha-paper-20261007',
  claim: '阿卡夏论文与企划补录（2026-10-07）：产出一份系统与方法论论文《阿卡夏之书：面向语言模型智能体的可审计外置记忆层——设计、实现与初步运营报告》（research\\akasha-paper-20261007.md；中文正文 + 英文摘要 + 22 条参考文献 + 三个附录），并对企划书追加 §11「落地实录与治理纪律」（research\\ai-memory-architecture-20261006.md：设计块→实现映射 / 新增机制 / 治理纪律 / 外部对照 / 运行数据 / 未竟事项）。论文定位：开源的「论文 + 实现」双件之一；开源包装清单（去本机硬编码 / LICENSE / 双语 README / 仓库结构）列于 §11.6。状态：文档完成，开源动作待启动。',
  source: { type: '复现', ref: 'research/akasha-paper-20261007.md；research/ai-memory-architecture-20261006.md §11；数值口径：test 50/50、canon 37、frontier 89、sleep 消化 2156、检索修复 0→33' },
  last_reviewed: '2026-10-07',
  tags: ['论文', '企划补录', '开源准备']
};

const existing = new Set(loadStore('canon').records.map(r => r.id));
if (existing.has(rec.id)) { console.log('已存在，跳过：' + rec.id); }
else { appendRecord('canon', rec); console.log('已追加 [canon] ' + rec.id); }
