// akasha/tools/harvest-20261014aj-pr1-merged.mjs —— PR#1 合并落地留痕（幂等：单一常量）
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-pr1-merged-20261014'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  "**Claude PR #1 合并落地（2026-10-14）**。**流程**：Claude 侧按裁定 rebase（「默认恢复全文」独立成 commit `bd496de`；golden 零差通过；自测 241 绿）→ 接收侧 `git fetch refs/pull/1/head` → 增量审查（11 文件 +722/−78；`^-.*maxTokens` 逐行核对**无 F08 误删**；scrub 占位符 0）→ **仓外沙盒法**落地（**教训**：`git apply` 在 <LOCAL_PATH> 仓内路径解析失灵、静默不写文件（exit 0）——两次空跑被「零差实测」揭穿；改在 `D:/dsh-temp` 无仓沙盒：拷工作区 9 文件→打补丁→拷回；MEMORY-TEST 1 行（3000→2000 笔误第二处）手工同步）→ 全量 **247/247** 绿 → oss `merge --ff-only origin/pr1`（`19d1923 → bd496de`）→ 收尾 commit **`4dd3cc3`**（golden 对照钉住 `de5144c` + 工作区树回退 oss 取对象；本留痕脚本）→ push main。",
  "**成果**：读档三档（pointer/summary/full，**显式 opt-in**）、读侧 `agePrefix`（活体见「[过去·4天]」）、L4 引用核对（citeAllowlist+checkCitations）、`genre_render` 翻真、生产 `--force` 闸、MCP 紧凑 JSON（pretty 才缩进）、复审小样本协议（上限 10）。**默认档零差实测**：hits20/2925、cross 155/null、brief 6/10/3939 与基线**逐项一致** ✓。**电池**：check 740/740 · family-sweep 全绿 · health-check 51/51。**PR #1 页尾**：两提交已含于 main（可 close）。",
].join('');
const r = appendRecord('canon', {
  id: 'canon-pr1-merged-20261014',
  claim,
  source: { type: '复现', ref: 'origin/pr1（bd496de/782b744）→ main 4dd3cc3 · 247/247 · 默认零差 f08-recheck · 沙盒落盘法（D:/dsh-temp/apply-sandbox）' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['Claude', 'PR', '合并', '读档三档', 'agePrefix', 'L4'],
});
console.log('已入 canon：' + r.id);
