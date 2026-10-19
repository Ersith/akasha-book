// akasha/tools/harvest-20261014b-ops-i08i09i10.mjs
// 2026-10-14：批次 2 尾段（I-08/I-09/I-10）落地记录 + 用法条 ㉗（受控路径）。幂等：判据＝单一常量（与正文共用同串）。
import { loadStore, currentRecords, appendRecord, revise } from './lib.mjs';

const MARK = 'OPS-BATCH-20261014';
const cur = () => currentRecords(loadStore('canon').records);
const have = (prefix) => cur().some((r) => String(r.id).startsWith(prefix));

if (!have('canon-ops-i08i09i10-20261014')) {
  const r = appendRecord('canon', {
    id: 'canon-ops-i08i09i10-20261014',
    claim:
      `**运维三件落地（2026-10-14，总案批次 2 尾段；受控解冻·用户令「继续完成后续内容吧」；标记 [${MARK}]）**——` +
      '**① I-09 因果注释（字段先行）**：可选字段 `caused_by`（估计的因果父）/ `led_to`（已知的下游），非空 id 字符串数组；`validateRecord` 拦空数组/非字符串；**检索侧未改**（「为什么」类遍历后置）；手工试点：`canon-genre-p0` `led_to` → `canon-genre-p1-dose` / `canon-idle-resume-v110`，后者回填 `caused_by`（双向可查）。' +
      '**② I-08 孤儿热缓冲显式化**：`PROTOCOL.md` §十三——**晋升四问**（复验通过 / 去重查过 / 重要度标注 / 证据链完整）+ **溢出回退**（阈值 `ORPHAN_BACKLOG_DEFAULTS`=60；超阈 audit 报 `orphan-backlog`（info，只报不裁）⇒ 月度压缩流程：先 promote dry → 余下主题聚合成摘要孤案 + 原条软退役 → review log 留痕；压缩＝搬家不是删除）；`promote` 命令转正前**打出四问清单**。' +
      '**③ I-10 复审机制闭环**：`review pack <id>`（只读；**显式跳链到当前版本** + 来源证据 + `caused_by`/`led_to` 邻居 + **三问审查协议**）→ 交 **fresh 子 agent**（零上下文）→ 主会话裁决 → `review log`（`logs/review-log.jsonl`：谁审的/审的哪条/结论；**维持**自动给 `last_reviewed` 打复审戳）→ `review list` 读回；协议成文于 `PROTOCOL.md` §十四。' +
      '**验收**：测试 **222/222**（+4 用例：因果字段校验+往返 / orphan-backlog 阈值两档 / review pack 链尾+邻居+三问+log 时序 / CLI 夹具根 维持打戳+留痕）；活体：`review pack canon-genre-p1-dose-20261013` 输出「当前版本 …-r1；链上第 2 版」+ 相关条目 2 条。' +
      '**顺带修复**：`cross：主行不截断` 守门判据原为**全文件**字符串搜索 `slice(0, 240)` —— 被新代码里合法的一处 240 截断误伤；已收窄为**只查 cross 函数体**（判据精度问题，同 10-08 教训）。' +
      '**边界（如实）**：**I-13（索引优化）仍被 I-02 数据缺口卡住**（需查询线跑满两周，先证后改）；MCP 面**本轮不加新工具**（加工具须重启才生效，留给下次重启窗；CLI 先行）。' +
      '留痕：`PROTOCOL.md` §十三/§十四 · `SCHEMA.md` 因果字段与复审线两节 · `README` 快速开始 · MEMORY-TEST §五 · 总案 v1.5。',
    source: { type: '复现', ref: 'akasha/lib.mjs（validateRecord 因果字段 / ORPHAN_BACKLOG_DEFAULTS / audit orphan-backlog / reviewPack+appendReviewLog+readReviewLog）+ akasha.mjs（review pack|log|list；promote 四问）+ PROTOCOL/SCHEMA/README + test.mjs I-08/09/10 四用例 + 活体 review pack' },
    event_time: '2026-10-14',
    last_reviewed: '2026-10-14',
    tags: ['I-08', 'I-09', 'I-10', '批次2', '运维', '落地'],
  });
  console.log('已入 canon：' + r.id);
} else console.log('= 运维三件记录已存在');

const usage = cur().find((r) => r.id === 'canon-akasha-usage' || r.id.startsWith('canon-akasha-usage-r'));
if (!usage) { console.log('未找到用法条'); process.exit(1); }
if (usage.claim.includes('[USAGE-27-20261014]')) console.log('= 用法条已含 ㉗，跳过：' + usage.id);
else {
  const r = revise('canon', usage.id, {
    claim: usage.claim +
      '\n**㉗ 运维三件（2026-10-14，批次 2 尾段；标记 [USAGE-27-20261014]）**：① **复审闭环（I-10）**——`audit --due` 排期 → `review pack <id>` 生成输入包（**链尾**全文＋来源＋因果邻居＋三问协议）交 **fresh 子 agent** → 主会话裁决（修正/升级/维持）→ `review log` 留痕（`logs/review-log.jsonl`），`review list` 读回；**维持**会自动给 `last_reviewed` 打复审戳。② **因果注释（I-09）**——可选字段 `caused_by`/`led_to`（id 引用；写入时近似标注；**检索侧未改**）。③ **孤儿热缓冲（I-08）**——晋升四问清单（promote 转正前打印）+ 溢出 >60 条报 `orphan-backlog`（压缩流程见 PROTOCOL §十三）。',
    last_reviewed: '2026-10-14'
  }, { allowProtocol: true });
  console.log('已修订：' + usage.id + ' → ' + r.id);
}

// —— 补充（同日）：promote dry 列表去重（活体抽查逮到）——
const MARK2 = 'PROMOTE-DEDUPE-20261014';
const rec2 = currentRecords(loadStore('canon').records).find((r) => String(r.id).startsWith('canon-ops-i08i09i10-20261014'));
if (rec2 && !String(rec2.claim).includes(MARK2)) {
  const r = revise('canon', rec2.id, {
    claim: String(rec2.claim) + ` **【补充·[${MARK2}]】**：活体抽查 \`promote --dry\` 逮到**清单未去重**——同批同码、无证据的候选归一到同一 id（这是对的），但列表逐个列出（实测「将转正 17 条」里同 id 重复 6 次 ⇒ **清单会骗人**；apply 侧本就幂等）。已修：dry 列表按 id 去重——真库复看 **17 → 10 条**；测试 **223/223**（+1 用例：同批同码同数归一 id 只列一次）。`,
    last_reviewed: '2026-10-14'
  });
  console.log('已补充：' + rec2.id + ' → ' + r.id);
} else console.log('= 补充已存在或未找到条目');

// —— 补充②（同日）：I-15 可信度衰减建议 + I-10 复审闭环首跑记录 ——
const MARK3 = 'I15-AND-FIRST-REVIEW-20261014';
const rec3 = currentRecords(loadStore('canon').records).find((r) => String(r.id).startsWith('canon-ops-i08i09i10-20261014'));
if (rec3 && !String(rec3.claim).includes(MARK3)) {
  const r = revise('canon', rec3.id, {
    claim: String(rec3.claim) + ` **【补充·[${MARK3}]】**：① **I-15 可信度衰减建议落地**（audit 扩展；**三条件全中才报**：时龄 ≥90d ＋ 链上无 verification ＋ 使用窗口零引用；**引用侧读不到 ⇒ 整体跳过、不假报零**；info 只报不裁）——测试 **224/224**（+1 用例四臂）。② **I-10 复审闭环首跑实战**：目标 \`canon-dsh-plugin-inventory-20261007\`（10-07 版本快照）→ \`review pack\` → **fresh 子 agent** 独立审查（两轮报告；自跑上游 registry / GitHub 实取）→ 主会话逐项复核（我另实取五源与子 agent 全对上，并补出其「未核」项之一：hindsight 上游已出 **0.8.1**）→ 裁决「**修正**」→ \`revise\` 追加 2026-10-14 复核版（r1：依赖 28→32 / bundles 33→37 / list_bundles 38→42 / 社区源 5→6（+dsh-ops）/ 上游一周全体前进 / 补录 dsh-purge·dsh-ops peer / 预检走 \`audit-gate.mjs\`）→ \`review log\`（verdict=修正，by=subagent）留痕首条。**机制评价：pack 信息够用、三问协议可照做、留痕与读回正常——机制对**。`,
    last_reviewed: '2026-10-14'
  });
  console.log('已补充②：' + rec3.id + ' → ' + r.id);
} else console.log('= 补充②已存在或未找到条目');
