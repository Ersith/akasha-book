// akasha/tools/harvest-20261007h-completion.mjs
// 2026-10-07 第五批留痕：① canon 六项补齐总条 ② canon 输出审计与使用计数 ③ usage → r11（⑳）。
// 幂等：已有/已修订的跳过。
import { appendRecord, loadStore, currentRecords, revise } from '../lib.mjs';

let added = 0; let revised = 0; let skipped = 0;

const ADDS = [
  {
    id: 'canon-six-completion-20261007',
    claim: '核心六项补齐（2026-10-07，设计稿 §8-C 剩余缺口全数落地）：① 情绪回写——条目可选 valence [-1,1] / arousal [0,1]，`price --apply-store/--apply-id`（MCP applyStore/applyId）经修订链写回；检索 boost = arousal×0.5 + 负价 0.25（emotionBoost 纯函数）。② 病史负价注入——`kit.history` 输出负价 top3（按 arousal 排序）。③ 镜像结构匹配——`mirror match <情境>`（五元组计分 situation×2 + patterns 加权；MCP akasha_mirror_match）。④ 输出后置审计——hooks v1.1 监听 agent/assistant-stream → auditText：假 id → output-audit 线、真 id → usage 线（条目级使用计数 v0）；边界：emit 语义只审计不拦截。⑤ 结果计数器——`metrics`（工具成功率/拦截/审计线/引用命中/修订链；MCP akasha_metrics）。⑥ 回查条——sleep v1.5：失败窗口（30 分钟）→ 脉搏条追一行回查提示（错误钩子注入级）。MCP 工具面 13→16（+show/mirror_match/metrics）；测试 50→57/57；插件 v1.5.0 / v1.1.0 已打包安装（restart-required，待重启激活）。',
    source: { type: '复现', ref: 'akasha/lib.mjs（emotionBoost/mirrorMatch/auditText/metrics）；akasha.mjs（mirror/metrics/price --apply）；mcp.mjs（16 工具）；dsh-akasha-hooks v1.1.0；dsh-akasha-sleep v1.5.0；test.mjs 57/57 + 双插件 selftest 全过' },
    last_reviewed: '2026-10-07',
    tags: ['核心补齐', 'M10', '六项']
  },
  {
    id: 'canon-output-audit-20261007',
    claim: '输出审计与使用计数 v0（2026-10-07）：auditText（纯函数）抽取输出中疑似库 id（regex：canon|front|orphan|mirror|price|lex 前缀）→ 与六库 id 全量核对；hooks v1.1 监听 agent/assistant-stream（按 attemptId+revision 累积 text-delta；committed 时审计）→ 引用不存在的 id 记 output-audit 线（编造引用嫌疑）、真实 id 记 usage 线（条目级使用计数）。诚实边界：emit 语义（不能改写输出）故「幻觉闸门」暂为「审计线」；只做 id 存在性硬核，「无据的普通断言」的语义审计留待未来 LLM 审计。',
    source: { type: '复现', ref: 'akasha/lib.mjs auditText；dsh-akasha-hooks/index.js v1.1.0；hooks selftest（激活/监听面/usage/output-audit/abandoned/revision 重置/降级 五节）' },
    last_reviewed: '2026-10-07',
    tags: ['输出审计', '使用计数', '幻觉闸门']
  }
];

for (const rec of ADDS) {
  const existing = new Set(loadStore('canon').records.map(r => r.id));
  if (existing.has(rec.id)) { console.log('已存在，跳过：' + rec.id); skipped++; continue; }
  appendRecord('canon', rec);
  console.log('已追加 [canon] ' + rec.id);
  added++;
}

// usage → r11（补 ⑳）
{
  const cur = currentRecords(loadStore('canon').records).find(r => r.id.startsWith('canon-akasha-usage'));
  const MARK = '\n- 每回合的「库脉搏」行';
  const ADD = '**⑳ 核心补齐（2026-10-07）**：库条目可带 `valence/arousal`（回写：`price … --apply-store S --apply-id ID`；brief 负价带 ⚠、检索含情绪 boost；`kit` 带「病史」负价 top3）；镜像匹配 `mirror match <情境>`（MCP `akasha_mirror_match`）；结果计数器 `metrics [--since D]`（MCP `akasha_metrics`）；`show <id>` 亦有 MCP `akasha_show`（工具面十六）；输出审计与使用计数由 hooks 插件自动落线（`output-audit` / `usage`）。\n';
  if (!cur) { console.log('找不到 canon-akasha-usage'); skipped++; }
  else if (cur.claim.includes('⑳ 核心补齐')) { console.log('usage 已更新过，跳过：' + cur.id); skipped++; }
  else {
    const idx = cur.claim.indexOf(MARK);
    if (idx === -1) { console.log('usage 未找到插入标记，跳过：' + cur.id); skipped++; }
    else {
      const r = revise('canon', cur.id, { claim: cur.claim.slice(0, idx) + ADD + cur.claim.slice(idx) });
      console.log('已修订：' + cur.id + ' → ' + r.id + '（补 ⑳）');
      revised++;
    }
  }
}

console.log(`完成：新增 ${added}，修订 ${revised}，跳过 ${skipped}。`);
