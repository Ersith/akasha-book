// akasha/tools/harvest-20261007u-session-plugin.mjs
// 2026-10-07 留痕：会话层插件落地 → 主用法 ㉑ 段补一行（修订链）。幂等。
import { loadStore, revise } from './lib.mjs';

const records = loadStore('canon').records;
const tip = (() => {
  const byId = new Map(records.map((r) => [r.id, r]));
  let cur = byId.get('canon-akasha-usage');
  if (!cur) return null;
  for (;;) {
    const next = records.find((r) => r.supersedes === cur.id);
    if (!next) break;
    cur = next;
  }
  return cur;
})();
if (!tip) {
  console.log('未找到 canon-akasha-usage');
  process.exit(1);
}
if (tip.claim.includes('akasha-session')) {
  console.log('已含插件行，跳过：' + tip.id);
  process.exit(0);
}
const patch = {
  claim:
    tip.claim +
    '\n**㉑·插件（2026-10-07）**：`@akasha-book/akasha-session` v0.1.1 已装载并热生效——自动增量索引（turn/end 去抖 30s + idle 追平；stat 快路 + >16MB 自适应节流）+ 压缩事件行（「已收入 N 段 · 结论 M 条；查 akasha_session_lookup」）+ 每回合节奏条（order 134）。手动面：`node akasha.mjs session …` / MCP `akasha_session_lookup`。'
};
const r = revise('canon', tip.id, patch);
console.log('已修订：' + tip.id + ' → ' + r.id);
