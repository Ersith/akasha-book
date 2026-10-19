// 2026-10-14：Master 假设「AI 缺时间认知 → 旧文当现状/复用模板」的评估与实验设计。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-read-time-attribution-'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**「读旧记忆的污染」两通道分解 + 时间归因假设（2026-10-14，Master 提出「AI 是否缺时间认知 → 把旧文当现状、直接复用文本/模板」；我方评估与实验设计）**。',
  '**事实底座（10-13 专案簇，勿重复劳动）**：`canon-idle-mechanism-20261013-r1`＝卡壳形态 B（有思考、无正文、无工具）仅 ed0a1e60 35 例；先兆＝「完成词收尾」（「。」结尾 94%，危险比 ≈11×）；源头＝**08:09–08:20 思考风格相变**（读到「→ 结论」格式旧文后 39 秒启动），相变在前、首例卡壳在 6 小时后。`canon-akasha-thinkchain-audit-20261013`＝**判定为模型自写入风格锁定（self-conditioning）**——需要「高密度样本 ＋ 仿写型任务」两条件；**读而不写（审计会话读同批全文 2.3–3.5/1k）与带全套注入的旧会话均零卡壳**⇒ 单靠「读」不锁。',
  '**Master 假设的评估：一半已被证实、一半是新通道**。① **风格/体裁模仿通道**（10-13 已测）由 self-conditioning 解释，**不依赖时间认知**——新鲜上下文同样会拉走 register（长会话自我复读），故「时间缺失」不是它的主因。② **时间归因通道（Master 补的那半，成立且有今日实物证据）**：context 是**扁平现在时**——旧条目以结论文本进入上下文，与刚得出的结论**同权**，没有自动的「这是过去/条件或已变」折扣；人类回忆自带 source monitoring（「我那时这么想」），我们这条必须**工程化**（来源态四标签即其行为层补丁）。今日实例：AGENTS/SCHEMA 的过期断言（18 工具 / h4 / 改核心即时生效）被当活规则、`canon-h4-norestart` 个例被一般化成规律——**都是「旧文当现状」，不是风格复读**。③ 两通道**叠加**解释「读旧文→复读旧模板」的丝滑：时间归因缺失（当现状）＋体裁模仿（学腔调）。外部旁证：frontier `front-llm-benefit-own-words-20261013`（上下文污染 / 自我输出 / 文体痕迹传播）。',
  '**可检验预测与 2×2 对照设计（登记，不催跑）**：P1 时间锚效应——同批旧文**加显式时间锚**（「写于 YYYY-MM-DD，距今 N 天，条件可能已变」）⇒ 复用率/相变率下降；P2 体裁符号效应——剥符号（⇒/✓/。）降风格复读但不改「旧当现状」。**2×2**（±时间锚 × ±符号）×（读而写 / 读而不写）四格，观测＝相变密度、模板复用率、（可选）卡壳。装置现成：独立会话实验（沿用 199a3828 范式）· loop-watch 密度 · K1-strict · 影子集。',
  '**现有装置里的两味药**：双时态（event_time/logged_at）+ 检索行尾时间坐标 + 来源态四标签（事实层）；**低成本可加（待裁）**：检索/读面统一时间前缀（如「[过去·N 天前]」）或读面头部一句历史声明——**挂渲染点**（同称呼行/脉搏行思路），剂量须过 C 线标准。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-read-time-attribution-20261014',
  claim,
  source: { type: '他人', ref: 'Master 2026-10-14 假设（原话：AI 是否因为没有时间意识，直接读完将其认为现在的，所以复用文本和模板）+ 我方对照 10-13 专案簇（canon-idle-mechanism / thinkchain-audit / thinkchain-lit）与今日过期断言实例复核' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['思维链退化', '时间认知', 'self-conditioning', '假设', '实验设计'],
  caused_by: ['canon-idle-mechanism-20261013-r1', 'canon-akasha-thinkchain-audit-20261013'],
});
console.log('已入 canon：' + r.id);
