// akasha/tools/harvest-20261014ah-f08-token.mjs —— F08（token 批）留痕（幂等：单一常量）
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-gpt-review-20261014-d'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  "**F08 token 批（性能优先）（2026-10-14）**——GPT 报告最后一项。**修的是「账实 + 直通 + 分页」，不是削量**。",
  "**① 账实**：`clipByBudget` 的计费从「只估主文本一个字段」改为**整条 JSON**（同一 estimateTokens；旧口径漏计 mirror 五字段=0/4096、lookup report 元数据 2060 vs 6213）+ 外围（query/hint/结构）预留（query+75 tok——初版 200 误伤 #29「后续补齐」，校准 75，检测脚本同步纪律再实发一次）；地板只给**全局第一条**（多组时每组各自保底会打穿预算）。**② 直通**：CLI lookup/brief/cross 新增 `--max-tokens N` / `--offset N`（lookup 原有 --offset）；MCP 三工具 schema 各加 `maxTokens`/`offset` 并透传（她 probe 的 schemas 项对照 ✓）。**③ 分页**：`nextOffset` 改**原始序号口径**（已翻过的条目数）——「大条目自跳」列表上旧口径 `offset+已装条数` 会**原地打转**（复现实测：cross 页2==页1）；groups 的 offset 改**全局序**（原逐组独立 slice ⇒ offset 完全失效）。**④ cross 豁免保留**：默认仍全量不裁（性能优先——削减只在调用方显式给 maxTokens/offset 时发生）；显式时预算生效且可续取。**⑤ 预算不超卖**：装载时含预留 ⇒ used ≤ cap（修前复现 324/300 超卖）。",
  "**验收**：主套件 **238→239** 全绿（+F08 守卫：账实/整条上账/两页不重叠/cross 默认豁免）；**她的 token-probe 复跑（live 覆盖进其副本后）：mirror 0→10156、report 2060→3439、cross 请求预算 null→生效（cap200→地板保底+offset 11→next 12/exhausted）、schemas 含 offset/maxTokens、cross 默认仍 null**；CLI 冒烟 157/300、194/400、续取 123。",
  "**边界（如实）**：usedTokens 与「整响应估算」仍有小差（budget 自身/结构符未计——个位到百位 tok）；超 cap 的**单条大条目永远不可在定额内显示**（`--full`/更大 maxTokens 可取，原文不丢）——分页只翻「可装下」的条目。",
].join('');
const r = appendRecord('canon', {
  id: 'canon-gpt-review-20261014-d',
  claim,
  source: { type: '复现', ref: 'akasha/lib.mjs clipByBudget（整条口径/预留/全局地板/原始序号分页）· akasha.mjs + mcp.mjs 直通 · test 239/239 · 她 token-probe 复跑 my-token-results3' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['外部审查', 'F08', 'token', '预算', '分页', '直通'],
});
console.log('已入 canon：' + r.id);
