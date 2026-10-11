// akasha/tools/harvest-20261007j-paper-v01.mjs
// 2026-10-07 论文 v0.1 留痕。幂等。
import { appendRecord, loadStore } from '../lib.mjs';

const rec = {
  id: 'canon-paper-v01-20261007',
  claim: '论文 v0.1 修订（2026-10-07 深夜）：《阿卡夏之书：面向语言模型智能体的可审计外置记忆层》通读修正 16 处（工具面 13→16 全点 / 测试 50/50→57/57 / canon 37→40 / 条子口径「三条 runtime 条子」→「两条条子+唤醒条」 / CLI 17→16 / 用法链 r10→r11 / 治理循环一次→两轮 / 计分口径加封顶表述 / §3 补六项新机制【情绪回写·镜像匹配·输出审计·回查条·不变式】/ §6.3 路线图 / 附录 B 命令与工具数），并新增 §1.3「缘起：一条推演链」——三类起点问题（跨会话遗忘 / 记忆不可审计 / 格式与主权）× 8 步推导表（每步＝真实事件 → 推演 → 公理/机制）→ 结论：外置大脑是约束推出来的解而非产品偏好。论文状态：v0.1（299 行），待开源包装（清单见设计稿 §11.6）；旧值残留扫描零。',
  source: { type: '复现', ref: 'research/akasha-paper-20261007.md（v0.1）；终验 test 57/57 + check canon 56/56 + 双 selftest；修订记录见 MEMORY-TEST 第七次' },
  last_reviewed: '2026-10-07',
  tags: ['论文', 'v0.1', '缘起', '开源准备']
};

const existing = new Set(loadStore('canon').records.map(r => r.id));
if (existing.has(rec.id)) console.log('已存在，跳过：' + rec.id);
else { appendRecord('canon', rec); console.log('已追加 [canon] ' + rec.id); }
