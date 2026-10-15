// akasha/tools/harvest-20261015a-review5-merge.mjs —— 第五轮（V01–V07）**经审查合入**留痕
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-review5-merge-20261015'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  "**GPT 第五轮（V01–V07）补丁 · 由本代理独立审查后合入（2026-10-15）**——基线 `33037b3` → **`6db4d6a`**；19 文件（核心 4 + 新模块 `json-redaction.mjs` + 5 插件 + tests/ 5 件）。",
  "**审查过程（作者不自证）**：① 隔离沙箱 `D:/dsh-temp/apply-sandbox-v5` 复现 `git apply --check/apply` 全净；② 其 61 条新回归 **60 通过 1 跳过**（缺宿主）；③ 我方核心套件 **248/248（+1 跳过）**；④ 五插件自测全过；⑤ **她的第五轮原反例 11 脚本**指到补丁后代码全量复跑——其中「证 bug 存在」型断言（limited 脚本 32–34/49）按验收口径**翻转为修后行为断言**后全绿（该翻转本身就是修复生效的证据）；⑥ 逐文件读 diff（含 222 行新模块全文）。",
  "**审读结论（要点）**：`json-redaction` 为**无损扫描器**（数字 lexeme 从不进 JSON.parse——保真；转义键/数组继承/嵌套 JSON/裸键值片段全遮；损坏敏感片段保守遮蔽 `[redacted-invalid-json]`；depth/nodes/chars 上限 + cycle/`__proto__` 防护）；V03/V04 有界档重构为「**全量候选 → cursor 定位 → 每页限额**」（perStore=0 回退 12、不再绕过）；V05 trace 在 MCP/CLI（含 recall 路径）全接线；V06 来源仅取**实际成功退役**项；V07 回执与重建**共用核验**（结构化优先、旧墓碑要求完整 reason 全等）+ 自吸收整组预检。",
  "**两处行为变化（已确认，合入说明内）**：① **V02**：读端删除「单前缀差兜底」——**旧短 ID 记录不再被完整 ID 命中**（不猜别名；核对原档后另行重索引，README 已写明）；② 有界档（summary/pointer）默认=**条数主控**（12/库、50 总），token 裁仅显式 `maxTokens` 时生效。",
  "**部署**：五插件重打包安装（gate 1.4.2-h1 / hooks 1.2.7-h1 / session 0.3.4-h1 / sleep **1.10.9-h1** / mcp **1.1.4-h1**，restart-required）；`core/json-redaction.mjs` 随 lib 同步（oss + 工作源）；**待第二天重启激活**。",
].join('');
const r = appendRecord('canon', {
  id: 'canon-review5-merge-20261015',
  claim,
  source: { type: '复现', ref: 'tmp/v5-verify/verify/out-*.json（11 脚本复跑）· dsh-temp 沙箱 apply · 248/248 · 61 回归 · 6db4d6a' },
  event_time: '2026-10-15',
  last_reviewed: '2026-10-15',
  tags: ['外部审查', 'GPT', '第五轮', 'V01', 'V07', '合入', '审查'],
});
console.log('已入 canon：' + r.id);
