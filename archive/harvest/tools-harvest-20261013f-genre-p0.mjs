// akasha/tools/harvest-20261013f-genre-p0.mjs
// 2026-10-13：批次 2 首项 I-11 体裁隔离 P0 落地记录 + 用法条 ㉔（受控路径 allowProtocol）。幂等。
import { loadStore, currentRecords, appendRecord, revise } from './lib.mjs';

const cur = () => currentRecords(loadStore('canon').records);
const have = (prefix) => cur().some((r) => String(r.id).startsWith(prefix));

if (have('canon-genre-p0-20261013')) console.log('= P0 记录已存在');
else {
  const r = appendRecord('canon', {
    id: 'canon-genre-p0-20261013',
    claim:
      '**体裁隔离 P0 落地（2026-10-13，总案批次 2 首项 I-11；受控解冻·用户令「继续吧」）**——治「读回形态」的第一批（设计源＝`genre-isolation-design-20261013.md` §7；问题实证：案发会话 35 例卡壳、94% 以「好。」结尾、11× 先兆信号）。' +
      '**① 过程段默认不回放（P0-①）**：`session lookup` 默认面只报「存在 N 段过程记录（默认不回放）」+ 调取指引（**给指针、不给原文**）；**反思通道** `--raw-process` / MCP `rawProcess:true`（含过程段、且不剥皮）。' +
      '**② 符号骨架剥皮（P0-②）**：`lib.stripGenre` **单点实现**（CLI / MCP / 会话层共用）——`⇒→→`、`✓`→删除（规整空格）、`好。`→`。`；**白名单**（只剥枚举内完成态符号）、**幂等**；应用面＝CLI `lookup`/`brief`/`show` + MCP 四读工具（lookup/brief/show/session_lookup，模型侧真正读到的返回）+ `session context` 装载面 + `session tree` 节点；**会话 `intent`（用户原话）与 `action`（工具记录）不剥**（误剥哨兵）。' +
      '**③ 反思通道（P0 附）**：CLI `--reflect`（lookup/brief/show）与 `--raw-process`（session）＝高保真显式路径，**不剥皮**（§4.7 原则 3：自我反思不被日常防污染牺牲）。' +
      '**验收（4 断言 + 反思臂）**：① process 默认不含原文（含段数与指引）/ 显式参数含原文；② 剥皮幂等 + 白名单外字符零改动；③ 误剥哨兵（用户原话/工具记录不动）；④ 同查询新旧输出 diff ⊆ {剥皮规则 ∪ 默认不返回}——测试 **213/213**（+3 用例：stripGenre / process 不回放+通道分裂 / CLI 接线）。**MCP 面活体实证**：默认档 ⇒ 与 ✓ 各 0 处、`withheld.process=26`；反思档 ⇒/✓ 15/15 处原文；两档输出均合法 JSON。' +
      '**边界（如实）**：剂量闸 / 任务门控 / 输出侧「好。→自动续行」（P1 与行为层）未做 ＝ **I-12**；行为层按 Claude 复审「单独开关、默认关」；**库内原文一字不动**（append-only 不破；只改「进思考上下文的形态」）；**MCP 桥为宿主子进程 ⇒ 重启后并入工具面**（核心 / CLI 即时生效）。' +
      '留痕：`MEMORY-TEST.md` §五（受控解冻记录）· usage ㉔ · README 快速开始 · 设计稿 §7 状态行。',
    source: { type: '复现', ref: 'akasha/lib.mjs stripGenre + akasha/session.mjs（P0-①/②）+ akasha/akasha.mjs（--reflect/--raw-process）+ akasha/mcp.mjs（四读工具默认剥）+ test.mjs I-11 用例 + MCP 活体对照（tmp/rpc-genre-*.json）' },
    event_time: '2026-10-13',
    last_reviewed: '2026-10-13',
    tags: ['I-11', '批次2', '体裁隔离', '落地', '读写面'],
  });
  console.log('已入 canon：' + r.id);
}

// 用法条同步（受控路径）
const usage = cur().find((r) => r.id === 'canon-akasha-usage' || r.id.startsWith('canon-akasha-usage-r'));
if (!usage) { console.log('未找到用法条'); process.exit(1); }
if (usage.claim.includes('㉔ 体裁隔离 P0')) console.log('= 用法条已含 ㉔，跳过：' + usage.id);
else {
  const r = revise('canon', usage.id, {
    claim: usage.claim +
      '\n**㉔ 体裁隔离 P0（2026-10-13，批次 2 首项）**：日常回读**默认剥完成态符号**（`⇒→→` / `✓` 删 / `好。→。`）——`lookup` / `brief` / `show` / `session lookup` 输出均适用；**过程段默认不回放**（只报「存在 N 段过程记录」+ 指引）。**要原文走反思通道**：CLI `--reflect`（lookup / brief / show）与 `session lookup --raw-process`；MCP 参数 `reflect:true` / `rawProcess:true`。会话用户原话与工具记录不剥；**库内原文一字不动**（只改进上下文的形态）。',
    last_reviewed: '2026-10-13'
  }, { allowProtocol: true });
  console.log('已修订：' + usage.id + ' → ' + r.id);
}
