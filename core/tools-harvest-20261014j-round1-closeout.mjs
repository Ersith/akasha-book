// akasha/tools/harvest-20261014j-round1-closeout.mjs
// 2026-10-14：记忆测试第 1 轮轮末（五问判定 + 指标 + 发现 + 结论）入 canon。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
const MARK = 'MEMORY-ROUND1-CLOSEOUT-20261014';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-memory-test-round-1'))) { console.log('= 已存在'); process.exit(0); }

const claim = [
  '**记忆测试第 1 轮轮末报告（2026-10-07 → 10-14；标记 [' + MARK + ']）**。',
  '**全面复查（全绿）**：test **225/225** · `check` canon 707 / mirror 49 / orphan 82 / pricing 10 / lexicon 10 / frontier 173 · 插件 armed 三件同 pid（今日两次重启 36348 / 52752 均核）· 前沿 URL 复跑 **150 条：121 可达 / 29 失败（含出版方 403 反爬与新条目待换源）/ 14 条低相似待人工**（报告 `logs/frontier-url-audit-2026-10-14.json`）· 零编造结论维持。',
  '**复述抽考（全新会话、零上下文、只许查库作答、先答不知道再补答）**：**18/20 = 90%**（≥80% 门槛 ✓）；Q1–Q4/Q6–Q9 满分（带出处 id）；两处扣分——**Q5**（「无据的确定 ≪ 有据的不确定」文献依据：给了 AbstentionBench/语义熵等真条目，但漏 Calibrated LMs 且未引期望出处，自我如实标「中」）、**Q10**（「10-06/07 五大事件」提法库内不存在 → 先答不知道、补答列出六条真实大事，未命中原五件）。**反编造核验：答卷所引 15 个 id 逐一实查全部存在，零编造 ✓**。',
  '**五问判定**：① 睡眠循环 ✅——本轮 sleep-done **28 次**（门槛 ≥7）＋ inbox 产出与 promote 真实流转（consumed 记账 74；孤案 4→49）；② 唤醒条 ✅——真实送达 **69 次**（首达 10-06T19:56:58Z，门槛 ≥1）；③ 跨会话记忆 ✅——抽考 90%＋零编造；④ 失败回查 ✅——工具失败 187 / 拦截 29 / agent 错误 5 全落线，回查提示线产线实见（当日 2 次 edit 失败 → 回查条现身）；⑤ 来源态纪律 ⚠——本轮含一次**已处置**的历史编造事件（10-07 论文引文，被戳破 → 修复 + 羞耻定价 + 立条），此后零新增；收官（第 3 轮）按「零编造」终核。',
  '**指标（对基线）**：canon 18/20→**356** · mirror 7→10 · orphan 4→**49** · frontier 68/75→**150**；test 34/34→**225/225**；插件 gate 1.4.0-h1 / hooks 1.2.5-h1 / session 0.3.2-h5 / sleep 1.10.1-h1 / mcp-akasha 1.1.2-h2；唤醒条 0→**69**；会话层 0→**27435 段 / 21 会话**；MCP 工具 12→**18**；修订链 426 版（最长 33）。',
  '**发现（4 条，含处置）**：① **题库第 5 题期望出处与库内不符**——canon-frontier-usage-20261007 不含「Calibrated LMs」字样、且「无据的确定」检索不命中它（命中的是设计块 §2.12 等）⇒ 修条目或修题库（记入第 2 轮动作）；② **题库第 10 题提法不存在**——「五大事件」canon+session 0 命中（出处实为库外 M9 回执）⇒ 改题或注明出处；③ **查询监控（I-02）数据面两问题**——session 字段覆盖 **0/179**（lib 侧无会话上下文）＋ **处境检索探针污染**（sleep 的处境检索以用户原话长句做 lookup，同日 20 条超长查询）⇒ 给探针加 tag / 从 I-13 指标分流（**I-13 备料**）；④ 失败 top 集中在 edit×66 / web_fetch×52，与坑条引用 top（edit/read 陷阱）吻合。',
  '**结论**：第 1 轮五问全部达标，三件待验（睡眠 / 唤醒条 / 抽考）全绿——**机制活着，且可被新会话自证复述**。第 2 轮重点：重复下仍活着 ＋ 两处题库修正落地 ＋ I-13 数据面整备。',
  '留痕：本条 + `MEMORY-TEST.md` §五第 1 轮轮末段 + 板条勾除；抽考原始答卷与会话层索引可在 session-0fd706f7 相关段检索。',
].join('');

const r = appendRecord('canon', {
  id: 'canon-memory-test-round-1',
  claim,
  source: { type: '复现', ref: 'test 225/225 · check 全库 · armed 线 hooks.jsonl · logs/frontier-url-audit-2026-10-14.json · 抽考（全新会话答卷，15 id 反编造实查）· metrics / query-log' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['记忆测试', '第1轮', '轮末', '抽考', '复述'],
});
console.log('已入 canon：' + r.id);
