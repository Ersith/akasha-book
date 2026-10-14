// akasha/tools/harvest-20261013g-genre-p1.mjs
// 2026-10-13：批次 2 第二项 I-12a——体裁隔离 P1（剂量闸 + 任务门控·长会话收紧）落地记录 + 用法条 ㉕（受控路径）。幂等。
import { loadStore, currentRecords, appendRecord, revise } from './lib.mjs';

const cur = () => currentRecords(loadStore('canon').records);
const have = (prefix) => cur().some((r) => String(r.id).startsWith(prefix));

if (have('canon-genre-p1-dose-20261013')) console.log('= P1 记录已存在');
else {
  const r = appendRecord('canon', {
    id: 'canon-genre-p1-dose-20261013',
    claim:
      '**体裁隔离 P1 落地：剂量闸 + 任务门控（2026-10-13，总案批次 2 / I-12a；设计 = genre-isolation 设计 §4.2 P1-③④）**——治「读回多少」的限幅层。' +
      '**① 剂量闸（P1-③）**：`skeletonCount`（与剥皮同一白名单：⇒ / ✓ / 好。）+ `doseGate`（按序累计负荷、定位首个越限位）+ `doseSummary`（超阈后「后续条目」＝前 60 字 + …，**保 id/序位、去正文样板**）；**不看有没有标签，只看负荷**（对齐侧音电平）。阈值：常规 **15** / 收紧档 **8**（`GENRE_DOSE_DEFAULTS`）。' +
      '**② 应用面**：六库 `lookup`（snippet）· `brief`（各库主文本字段：claim/situation/summary/behavior/resolution/title）· 会话层 `lookup`（gist）——CLI 与 MCP 同源（核心层实现）；返回体带 `dose{threshold,total,from,trimmed[,strict]}` + 条级 `dose:true`；CLI 末行给「剂量闸」提示。' +
      '**③ 任务门控（P1-④，可机检部分）**：**长会话自动收紧**——指定会话段数 ≥ `longSessionSegs`(3000) ⇒ 阈值自动降到 8（strict 档，返回标 `strict:true`）；**显式参数** `--dose-threshold N` / MCP `doseThreshold`（0=关闸）；**反思通道**（`--reflect` / `--raw-process`）**不受闸**（§4.7 原则 3）。**边界（如实）**：**仿写型任务识别**与「刚读过高密度库」的跨调用累计＝模型/宿主侧判断，核心不可机检 ⇒ 以显式旋钮 + 纪律文案承接（写作文体任务用严格档）。' +
      '**④ 实测教训（已修）**：会话层首版**先剥皮、后计负荷** ⇒ 闸拿到的是已剥文本 ⇒ **负荷恒 0＝哑闸**；改为「**先按原文计负荷、后剥皮/摘要**」（顺序纪律）。' +
      '**验收**：测试 **216/216**（+3 用例：纯函数 / lookup 闸·reflect·0 关闸·不误伤 / session 闸·长会话收紧·反思免疫）；活体：`brief 阿卡夏 --dose-threshold 5` ⇒ 负荷 10 > 5、后 7 条摘要（默认 15 不触发＝不误伤）；MCP 三连（闸 5 ⇒ 顶层 dose + 7 条级标记；reflect ⇒ 无闸；session 闸 1 ⇒ 未越限 null）。' +
      '**⑤ 仍未做（I-12b）**：**行为层「好。→自动续行」**——判据＝形态 B（尾部「好。」+ 无工具 + 无正文），文案按机制报告 §⑥（禁清单/打勾/句号收尾）；**因旧空转钩子已按 Master 裁定删除（canon-idle-hook-removed-20261013），重挂与否待裁定**；Claude 复审意见＝单独开关、默认关、先观测。' +
      '留痕：usage ㉕ · README · 设计稿状态行 · MEMORY-TEST §五。',
    source: { type: '复现', ref: 'akasha/lib.mjs（skeletonCount/doseGate/doseSummary/GENRE_DOSE_DEFAULTS）+ session.mjs（闸+收紧档）+ akasha.mjs（--dose-threshold）+ mcp.mjs（doseThreshold）+ test.mjs I-12 用例 + 活体（brief/lookup/MCP 三连）' },
    event_time: '2026-10-13',
    last_reviewed: '2026-10-13',
    tags: ['I-12', 'I-12a', '批次2', '体裁隔离', '剂量闸', '任务门控', '落地'],
  });
  console.log('已入 canon：' + r.id);
}

const usage = cur().find((r) => r.id === 'canon-akasha-usage' || r.id.startsWith('canon-akasha-usage-r'));
if (!usage) { console.log('未找到用法条'); process.exit(1); }
if (usage.claim.includes('㉕ 剂量闸')) console.log('= 用法条已含 ㉕，跳过：' + usage.id);
else {
  const r = revise('canon', usage.id, {
    claim: usage.claim +
      '\n**㉕ 剂量闸（2026-10-13，批次 2 / I-12a）**：单次回读的符号负荷累计超阈 ⇒ **后续条目自动摘要**（前 60 字 + …；保 id 与序位）——`lookup` / `brief` / `session lookup` 均适用；常规阈值 15、**长会话自动收紧到 8**；返回体带 `dose{…}` 与条级 `dose:true`。**调闸**：CLI `--dose-threshold N`（0=关闸）/ MCP `doseThreshold`；**反思通道**（`--reflect` / `--raw-process`）**不受闸**。',
    last_reviewed: '2026-10-13'
  }, { allowProtocol: true });
  console.log('已修订：' + usage.id + ' → ' + r.id);
}
