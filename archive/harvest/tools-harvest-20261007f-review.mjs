// akasha/tools/harvest-20261007f-review.mjs
// 2026-10-07 第四批留痕：① canon 复查纪律 ② canon 用法同步纪律 ③ canon 时间过滤规格
// ④ canon 本轮大复查记录 ⑤ canon-akasha-usage → r10（⑱⑲） ⑥ canon-akasha-memory-coexist → r2（十二→十三工具）。
// 幂等：已有/已修订的跳过；只追加。
import { appendRecord, loadStore, currentRecords, revise } from './lib.mjs';

let added = 0; let revised = 0; let skipped = 0;

const ADDS = [
  {
    id: 'canon-review-discipline-20261007',
    claim: '重大变更复查纪律（2026-10-07 立条；用户裁定：「重大的项目需要整体复查两次，发现问题要举一反三再进行两次检查」）：凡功能性重大变更（跨文件 / 动数据格式 / 新增或改变命令与工具面 / 插件升级）收尾前——① 整体复查两遍：第一遍常规全量（test / check / selftest / CLI smoke / 幂等复跑），第二遍必须换角度（残渣 / 引用完整性 / 最少复查件 / 新脚本幂等）；② 发现问题 → 举一反三：同类扫描（「写死断言」「文档漂移」「行为变更未同步」类）；③ 再检查两轮（修复后复验 + 换角度复扫）。立条背景：该纪律此前只以事件记录存在（canon-akasha-sweep / sweep2、MEMORY-TEST、v0 计划「符合重要项目两轮排查的预期签名」），未作为规则入库 → 检索不到 → 未被自动执行（2026-10-07 用户指出）；本条即补上的触发式规则。检查清单与执行范例：canon-akasha-sweep2-20261007 / canon-akasha-review-round-20261007。',
    source: { type: '共识', ref: '用户裁定 2026-10-07（原话「重大的项目需要整体复查俩次？发现问题要举一反三再进行俩次检查」）；执行记录见 canon-akasha-review-round-20261007' },
    last_reviewed: '2026-10-07',
    tags: ['纪律', '复查', '重大变更']
  },
  {
    id: 'canon-usage-sync-20261007',
    claim: '工具/行为更新 → 用法同步纪律（2026-10-07 立条；用户裁定：「工具更新了就得知道新用法是什么」）：凡新增或改变命令 / MCP 工具 / 参数 / 行为契约，必须在同一次变更内同步——① `canon-akasha-usage`（revise，注入文本随之更新）② `SCHEMA.md`（字段与命令规格）③ `README`（工具面与快速开始）④ `test.mjs`（回归断言）⑤（涉及外部文档时）AGENTS.md §6 / 桥 README。判定：更新后做「引用完整性」复审——全库检索旧数字 / 旧清单（如「十二工具」「35 项」）应零残留。',
    source: { type: '共识', ref: '用户裁定 2026-10-07；执行例：同日 time-filter 更新（usage r10 / SCHEMA / README / AGENTS §6 同批）' },
    last_reviewed: '2026-10-07',
    tags: ['纪律', '用法同步', '工具更新']
  },
  {
    id: 'canon-time-filter-20261007',
    claim: '检索时间过滤 + brief 时间坐标（2026-10-07 落地）：lookup / brief / cross 支持 `--since / --until`（YYYY-MM-DD）——时间戳取 `event_time`（优先）|| `logged_at`（回退），日期级字符串比较（UTC 口径），带过滤时无时间戳条目被排除；brief 每条命中带 `time` 坐标（CLI 前置显示、MCP JSON 自带）；MCP 三工具 schema 同步扩参。测试：test.mjs 时间过滤用例（下界 / 排除语义自洽断言）。',
    source: { type: '复现', ref: 'akasha/lib.mjs（tsOf / inRange）；test.mjs 50/50；SCHEMA.md 时间字段节；对位 letta-code recall 子代理的 --start-date/--end-date' },
    last_reviewed: '2026-10-07',
    tags: ['时间过滤', '检索', '行为规格']
  },
  {
    id: 'canon-akasha-review-round-20261007',
    claim: '大复查记录（2026-10-07，两轮 + 举一反三补执行）：发现与修复——① selftest 跨会话污染：dsh-akasha-sleep/selftest.mjs §6 ctxLive（真库 akashaDir）在桩 state 缺失时 boot 触发 activate、把空报告写进真库 logs（历史物证 4 份，含 18:00:44Z 一份来自上一会话；本会话 2 份）→ 修复：§4 末不再删主 dir（桩 state 保持可读）+ process.on(exit) 兜底清理（失败中断不留残渣）；修复后实证：跑 selftest 报告数不增（1→1）、残渣 0。② 污染物证归档：_scratch\\akasha-pollution-20261007\\（4 项 + README，只搬不删）。③ 文档漂移一批：akasha README 全面更新（12→13 工具、35→50 测试、命令与工具列表抗漂移化）、AGENTS.md §6（十二→十三 + 手动 sleep）、SCHEMA 时间过滤节、canon-akasha-memory-coexist → r2（十二→十三工具）。④ 纪律立条：canon-review-discipline-20261007（两轮复查 + 举一反三再两轮）/ canon-usage-sync-20261007。',
    source: { type: '复现', ref: '本轮复查执行（2026-10-07：test 50/50、check、双 selftest、CLI smoke 16 命令全 exit 0、5 个留痕脚本幂等复跑全跳过）' },
    last_reviewed: '2026-10-07',
    tags: ['复查记录', 'selftest', '文档漂移']
  }
];

for (const rec of ADDS) {
  const existing = new Set(loadStore('canon').records.map(r => r.id));
  if (existing.has(rec.id)) { console.log('已存在，跳过：' + rec.id); skipped++; continue; }
  appendRecord('canon', rec);
  console.log('已追加 [canon] ' + rec.id);
  added++;
}

// ⑤ usage → r10（补 ⑱⑲）
{
  const cur = currentRecords(loadStore('canon').records).find(r => r.id.startsWith('canon-akasha-usage'));
  const MARK = '\n- 每回合的「库脉搏」行';
  const ADD = '**⑱ 检索时间过滤（2026-10-07）**：lookup / brief / cross 可加 `--since YYYY-MM-DD --until YYYY-MM-DD`（时间戳＝event_time 优先、logged_at 回退；UTC 日口径；无戳条目被排除）；brief 每条命中带 `time` 坐标。**⑲ 重大变更复查纪律**：重大变更收尾前**整体复查两遍**（第二遍换角度：残渣 / 引用完整性 / 最少复查件 / 新脚本幂等），发现问题**举一反三**（同类扫描）**再两轮检查**；**工具 / 行为更新 → 同批同步用法**（usage / SCHEMA / README / 测试）——见 canon-review-discipline-20261007 / canon-usage-sync-20261007。\n';
  if (!cur) { console.log('找不到 canon-akasha-usage'); skipped++; }
  else if (cur.claim.includes('⑱ 检索时间过滤')) { console.log('usage 已更新过，跳过：' + cur.id); skipped++; }
  else {
    const idx = cur.claim.indexOf(MARK);
    if (idx === -1) { console.log('usage 未找到插入标记，跳过：' + cur.id); skipped++; }
    else {
      const r = revise('canon', cur.id, { claim: cur.claim.slice(0, idx) + ADD + cur.claim.slice(idx) });
      console.log('已修订：' + cur.id + ' → ' + r.id + '（补 ⑱⑲）');
      revised++;
    }
  }
}

// ⑥ coexist → r2（十二→十三工具）
{
  const co = currentRecords(loadStore('canon').records).find(r => r.id.startsWith('canon-akasha-memory-coexist'));
  if (!co) { console.log('找不到 coexist 条'); skipped++; }
  else if (!co.claim.includes('十二 MCP 工具')) { console.log('coexist 无过时工具数，跳过：' + co.id); skipped++; }
  else {
    const r = revise('canon', co.id, { claim: co.claim.replace('十二 MCP 工具', '十三 MCP 工具（2026-10-07 增 akasha_summary）') });
    console.log('已修订：' + co.id + ' → ' + r.id + '（十二→十三）');
    revised++;
  }
}

console.log(`完成：新增 ${added}，修订 ${revised}，跳过 ${skipped}。`);
