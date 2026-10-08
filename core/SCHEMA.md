# 阿卡夏之书 · 数据规范（v0）

六个存储，全部 JSONL（每行一个对象）、append-only。
`id` 规则：`<前缀>-<slug>`（`canon-` / `mirror-` / `orphan-` / `price-` / `lex-`），按存储内查重。
`check` 会逐行校验：坏 JSON 行只报告不抛；缺字段 / 枚举越界 / 重复 id 均报错。

## canon（稳定库）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 必填 |
| claim | string | 一条可引用的事实断言 |
| source.type | enum | 复现 / 官方 / 他人 / 共识 |
| source.ref | string | 出处（文档名 / RFC / 复现记录） |
| source.version | string | 可选；版本（如 v24、RFC 9110） |
| last_reviewed | string | 上次复核 YYYY-MM-DD（慢周期复核的锚） |
| tags | string[] | 可选 |

> **快照类条目**（版本清单 / 依赖拓扑 / 生态现状等会随时间漂移的观察）：id 带日期后缀（`canon-<主题>-YYYYMMDD`）、`claim` 里写明观测时点与适用的版本坐标、`last_reviewed` = 快照日；更新一律走 `revise` 追加新版，不改原文。**不要写成无日期的常青断言**——过期后会误导下一个会话（用户 2026-10-07 裁定）。示例：`canon-dsh-plugin-inventory-20261007`、`canon-harness-reparse-topology-20261007`。

## mirror（镜像库，五元组）

| 字段 | 说明 |
|---|---|
| id / story | 条目 id；故事出处（如「伊索寓言·狼来了」） |
| situation | 情境模式（结构，不按字面） |
| behavior | 行为 |
| outcome | 结果 |
| social_reaction | 社会反应 |
| emotion | 对应情绪词（可含过渡，如「骄傲转悔恨」） |

## orphan（孤案）

id；summary / observed / hypothesis / would_confirm / would_refute（string）；severity（高 / 中 / 低）；created（YYYY-MM-DD）。
零权重留档；热载三通道见设计稿 §2.8。

## pricing（定价表）

id；behavior（string）；valence（-1..1 数字）；severity_default（1..5 整数）；note（可选）。
- 粒度（2026-10-07，见 canon-pricing-granularity-20261007）：定价对象＝**具体行为**（情绪标签贴行为本身）；机制状态 / 类别（如「触红线」）不是定价对象。记录级 `valence`/`arousal` ＝该记录所载行为之价的实例化；判断 / 召回以行为级定价为依据。

## lexicon（情绪词表）

id；term / trigger / behavior / resolution / source 全部必填（string）。

## frontier（前沿层 · 文献基石）

| 字段 | 说明 |
|---|---|
| id / title / url | 条目 id；标题；链接（须 http(s)） |
| year | 可选（次要链接留空） |
| topic | 主题（记忆系统 / 离线巩固 / 情绪与价值 / 知识边界 / 推理控制 …） |
| status | 已实践 / 已复现 / 高引用 / 待验证（排序：已实践 > 已复现 > 高引用；新文献先「待验证」） |
| last_checked / next_review | 上次核对 / 下次复审（待验证 +90 天，高引用 +180 天；到期用 `frontier due` 列出） |
| supports | 对应设计稿条目（如 §2.7 离线层） |
| note | 一句话（可空） |

基石随 `node init-example.mjs` 从 `data-example/frontier.jsonl` 拷入（仓库里没有 `tools/import-frontier.mjs`）。手工增补走 `add --store frontier --data '<json>'`。

## 时间字段（双时态，2026-10-07 起）

| 字段 | 谁写 | 说明 |
|---|---|---|
| `event_time` | 条目作者（可选） | **事件时间**：所描述之事发生的时间（建议 YYYY-MM-DD，可 ISO）。写 canon / orphan 时尽量带；不强制、不回填历史。 |
| `logged_at` | 写入路径（自动） | **记录时间**：appendRecord 家族（CLI / MCP / 脚本 / revise 修订行）自动盖 ISO 8601 UTC 戳；自带不覆盖。 |

- 两轴分开：`event_time` 回答「何时发生的」；`logged_at` 回答「何时记下的」——修订链每行都有 `logged_at` ⇒「某条何时被改」可查。
- 校验：两字段若存在须为非空字符串。
- 检索过滤口径：`--since / --until` 按「`event_time` 优先、`logged_at` 回退」的日期级字符串比较（UTC）；无时间戳条目在带过滤时被排除（**2026-10-07 起：输出默认提示「另有 N 条日期未知」——未知≠该时段没有；`--undated` 并入、`--report` 出完整报告**）。

## 退役与删除（2026-10-08，用户裁定）

基石分层要求「教程/工具类资料不进 frontier」，而 append-only 只支持追加 ⇒ 需要显式的**移出**原语（CLI；脚本可调 `retireRecord`）：

- `node akasha.mjs retire <store> <id> [--reason '...']` —— **软退役（默认）**：在链尾之后追加一条**墓碑**记录（`id: <链尾 id>-retired`，字段 `retires: <链尾 id>` + `retired_at` + `retired_reason`；其余字段克隆链尾，以便照常通过该校验）。被退役记录**连同其全部修订版本与墓碑本身**都不进「当前集」（`currentRecords`）——因此 `lookup` / `brief` / `cross` / `summary` / `audit` / `stats` / `frontier list` / `orphan list` 全部不再看见它；历史仍在文件里可追溯。
- `node akasha.mjs retire <store> <id> --hard` —— **删除**：把该 id 的整条修订链与墓碑**行**从存储文件移除；移前先把被删行备份到 `data/_trash/<日期>-<store>.jsonl`（保留 append-only 精神：先留副本，再删）。
- 幂等：已退役者重复调用返回 `already: true`。
- 校验：`retires` 必须指向存在的 id（悬空指针由 `check` 报错）；`check` 的每库报告新增 `retired` 计数。
- 不变式：退役/删除只作用于该 id 的链，不影响其它记录。
- **幂等判重纪律（2026-10-08 事故后立）**：脚本按 id 判重必须用**历史 id 集合**（`allIds`），**不得用 `currentRecords`** —— 已退役 id 不在当前集，拿它判重会把退役条目当新条目重放（当晚真实事故：4 条被复活并出现重复 id，`check` 报 duplicate）。写入侧另设硬闸：`appendRecord` 拒绝追加已退役 id，确需重加须显式传 `{ allowResurrect: true }`。
- 硬删的「已退役短路只对软退役生效」：对已退役条目执行 `--hard` 必须继续删（否则复活出来的重复行清不掉）。

## 校验命令

```
node akasha.mjs check        # 人类可读
node akasha.mjs check --json # 机器可读（退出码 1 = 有错）
```

## 审计（可机检的抽样审计）

`node akasha.mjs audit`（可 `--today YYYY-MM-DD` 模拟将来）检查：

- 前沿层到期复审（warn）；canon 复核超期 > 365 天（warn）；
- 重复 URL（info）；孤案积压 > 90 天（info）。

退出码恒 0；结果以 `findings` 数组见 `--json`。

## 主题简报（brief）

`node akasha.mjs brief <主题> [--per N]`（MCP：`akasha_brief`）——把「先查再答」从逐条 lookup 升级为按主题取料：

- 主题词按空格/逗号切分，对六库 `LOOKUP_FIELDS` 计分：整词命中 ×1；含中文且 ≥3 字的词追加相邻二字（bigram）回退 ×0.25（2026-10-07 起）——词组未原样出现也能召回；**回退分 <1 = 弱命中（疑似相关），整词级 ≥1 = 强命中**。`brief` 在强命中为零时明确写「确定不知道」（弱命中仍列出，但不算证据）。孤案 `zeroWeight`：可见、不加权、不算强命中。
- `--since / --until`（YYYY-MM-DD，lookup / brief / cross 通用）：按 `event_time`（优先）|| `logged_at` 的日期级比较过滤（UTC 口径）；无时间戳条目被排除（**默认提示「另有 N 条日期未知」；`--undated` 并入、`--report` 完整报告；非法日期即拒**）；brief 每条命中带 `time` 坐标；
- frontier 命中附加状态权重（已实践 3 > 已复现 2 > 高引用 1 > 待验证 0），每库默认 top 3（`--per` 可调）；
- 输出带来源态提示：库内引用标注「记得·库内」；无命中时明确「确定不知道，不要编」。

## 起床包（kit）

`node akasha.mjs kit`（MCP：`akasha_kit`）——开工前一次装配：

- 睡眠摘要（`logs\sleep-state.json`：上次运行/触发/待办数/审计结论/报告名）；
- 待办（`logs\inbox.jsonl`：批次、条数、最新条目摘要）；
- 当前审计（实时 `audit()`：到期/陈旧/重复/积压）；
- 库况（六库计数 + frontier 状态分布）；
- 提示（hints）：待办处理建议、审计警告、开工姿势（先 brief、带来源态）。
- `stateFile` / `inboxFile` 可注入（测试与多实例用）；「开工先 kit」是软协议约定。

## 对位比较（cross）

`node akasha.mjs cross <词> [--per N]`（MCP：`akasha_cross`）——同一主题词在六库的**全部**命中按库并排：

- 当前版本、按命中数排序、**主行不截断**（`cross()` 不再 `slice(0, 240)`；canon=claim；mirror=境况→反应；orphan=摘要；pricing=行为；lexicon=词条：行为；frontier=题名）；
- 「同题多源」提示 + 处置姿势：**矛盾不合并**——留档用孤案（orphan add），定论用修订链（revise）；
- 与 `brief` 的分工：brief 是「按相关度取前 N 条」（快速了解），cross 是「全摆出来对位」（裁决用）；两者与 lookup 均支持 `--since / --until` 时间过滤。

## 全库摘要（summary）

`node akasha.mjs summary [--per N]`（MCP：`akasha_summary`）——「不带问题看一眼全库」：

- 六库计数 + 各库最近 N 条（`--per` 默认 3；主行截 160 字）+ frontier 状态分布；
- 审计概要（OK / 警告计数）+ 最近写入（与库脉搏同源）；
- 与 kit 的分工：kit 是开工动作装配（睡眠 / inbox / hints），summary 是库自身全貌陈列。

## 直读（show）

`node akasha.mjs show <id>`——按 id 跨六库取**当前版本**全文（JSON 原样）；命中被修订的旧版本时，提示链尾 id 并回显旧版原文。配合 lookup / brief 构成「先搜后读」。

## 候选转正（promote）

`node akasha.mjs promote [--dry]`（MCP：`akasha_promote`）——把 sleep 写入 `logs\inbox.jsonl` 的孤案候选（`kind: orphan-candidate`）机械落成孤案条目：

- id = `orphan-b<md5(code|样本)前8位>` ⇒ **幂等**（重跑只跳过，不重复追加）；
- 字段映射：`summary` = `[inbox候选] <code> ×N`；`observed` = note / samples；`hypothesis` / `would_confirm` / `would_refute` 留「（待补）」（零权重留档，等待复盘）；
- **消费记账**：每次处理过候选（转正或跳过）后，向 inbox 追加一行 `kind:"consumed"`（含 `upTo` = 处理时读入的行数、`count` / `skipped`）——`kit` 的待办计数只统计 `consumed.upTo` 之后的批次（2026-10-07 修：转正后计数与唤醒条提醒不再只增不减）；
- severity：`agent-error` → 中，其余 → 低；`--dry` 只报不写（默认执行）。
- 闭环：失败/拦截 → hooks 记录 → sleep 蒸馏 → inbox 待办 → promote 入孤案库。

## 修订链（append-only 之上的更正）

「追加式更正不改原文」的正式机制——**任何记录可以带 `supersedes: <被修订 id>`**：

- **当前版本** = 没有被任何记录 `supersedes` 的记录（`currentRecords`）；`lookup / brief / stats / audit / kit` 一律按当前版本取数；
- `node akasha.mjs revise <store> <id> --data '<json>'`（或 `--data-file <路径>`，省掉 shell 引号地狱）：从任意链上版本出发都落到**链尾的下一版**；新 id = `<根 id>-r<版本数>`；未打补丁的字段自动保留；记录里自动带 `supersedes`；
- `check` 会报**悬空引用**（`supersedes` 指向不存在的 id）；
- 前沿层复审快捷方式：`node akasha.mjs frontier recheck <id> --status <S> [--next-review D] [--note ...]`——修订 status / last_checked / next_review（默认 +90d 待验证 / +180d 其余）；
- 修订只追加、不改原文；链条可回溯（根 → r1 → r2 …）。
- **mirror 的「改口」就是修订链**：`node akasha.mjs revise mirror mirror-xxx --data-file reword.json`——境况/旧反应（situation/behavior）保留在旧版，新反应/结果/气质写进新版；「人生经验的改口」不覆盖历史，链条本身就是成长记录。

## 镜像结构匹配（mirror match，2026-10-07 起）

`node akasha.mjs mirror match <情境文本> [--limit N]`（MCP：`akasha_mirror_match`）——把现场情境按**结构**匹配到镜像库：五元组字段计分（situation 权重 ×2）+ 可选 `patterns` 标签加权（子串命中 ×2）；返回 top N（含五元组全文，供照镜与引用）。

## 情绪字段（valence / arousal，2026-10-07 起）

- 任意库记录可带**可选** `valence`（[-1,1]）与 `arousal`（[0,1]）；越界拒绝（pricing 库的 `valence` 仍为必填）。
- **回写通道**：`node akasha.mjs price --severity N --irreversibility N --cost N [--good|--bad] --apply-store <store> --apply-id <id>`（MCP `akasha_price` 的 `applyStore/applyId`）——计算后经**修订链**写回该条目（追加新版，不改原文）。
- **用途**：brief 排序 boost（arousal ×0.5 + 负价 +0.25，`emotionBoost` 纯函数可测）；负价条目在 brief 行前加 `⚠`；`kit.history` 输出负价 top3（**病史负价注入**的最小形态）。

## 输出审计与使用计数（v0，2026-10-07 起）

- 钩子插件（`@akasha-book/akasha-hooks` v1.2）监听 `agent/assistant-stream`，对 committed 的 assistant 文本跑 `auditText`（纯函数）：
  - 引用**不存在**的库 id → `output-audit` 观测线（编造引用嫌疑）；
  - 引用**真实**库 id → `usage` 观测线（**条目级使用计数 v0**）。
- **v1.2 修复（2026-10-07 复查）**：官方 revision **逐帧递增**——累积必须按 `attemptId` 连续（修复前按 revision 重置 ⇒ 每 chunk 清空、`output-audit`/`usage` **恒 0 条**）；id 跨帧切分可还原。
- 边界（诚实）：assistant-stream 为 emit 语义——**只审计、不拦截**（「幻觉闸门」的输出改写留待宿主能力）；审计只做可机检硬核（id 存在性），「无据的普通断言」的语义审计留待未来。

## 结果计数器（metrics，2026-10-07 起）

`node akasha.mjs metrics [--since D]`（MCP：`akasha_metrics`）——工具成功率 / 门控拦截 / agent 错误 / 回合 / 睡眠 / 唤醒条 / 审计线 / 引用命中 / 修订链统计（总数与最长链）；数据源＝`logs\hooks.jsonl` + 六库修订链。

## 会话层（session，2026-10-07 起）

单会话记忆层（设计稿 `docs\superpowers\specs\2026-10-07-session-akasha-design.md` v0.4；计划 `docs\superpowers\plans\2026-10-07-session-layer-v0.md`）：会话档案（含官方压缩掉的历史）→ 段级条目 → 结论优先检索。

- 数据：`data/session.jsonl` + `data/session-meta.json`。这是**同库分层**（v0.1→v0.2，独立库方案已撤回），不是第二套产品：同一 CLI / 同一数据目录 / 同一 MCP 进程。段不进六库 `STORES`，因此 `check` / `audit` 不扫它，避免污染 canon。升格进六库还没有入口。
- 段字段：`id`（`seg-<sid8>-<seq>-<指纹>`，同内容幂等、档案重写漂移追加新版）/ `store:"session"` / `session` / `seq` / `time` / `turn` / `step` / `kind`（intent / action / conclusion / process）/ `gist`（截断 200–400 字）/ `why`（可选）/ `keywords`（≤12）/ `tools` / `ptr`（原档指针：`seq`；action 另带 `callSeq`）/ `logged_at`。
- 命令：`node akasha.mjs session index <sessionId|文件路径> [--full]` / `session lookup <词> [--kind a,b --level nodes|segs --since D --until D --process --limit N]` / `session context [--session ID --budget N]` / `session tree [--build] --session ID` / `session node <id>` / `session loopwatch [--since D] [--json]` / `session stats` / `session help`；MCP：`akasha_session_lookup`。
- **抽象层 v0.2（2026-10-07）**：段之上加**节点**（`kind:"node"`，id `node-<sid8>-L<n>-…`）——机械树：按回合切块 → L1 弧 → L2 幕（>2 块递归、≤3 层）；节点含 `children` / 时间范围 / `gist`（400 字·展示）/ `extra`（1200 字·评分扩面，不渲染）/ `treegen` 代际（重建＝新代，旧代留档不参与检索）。**检索跨层**：lookup 默认纳入节点（只取当前代）；`--level nodes|segs` 分面。**导航纪律**：树＝入口 → 节点停靠 → 段 / ptr 下钻；保真实测（`research\session-tree-v02-fidelity.md`）：顶结论 token 100% / 块级提及 62% / 段层 token 60%——**全保真唯一保证＝ptr 回原档**。
- **查询纪律**：结论＋动作＝第一入口；过程段仅按需局部调取、绝不整体查阅；官方压缩摘要仅作背景，冲突以可回原档的会话层为准。
- **调用分级**：被动行 → 定向轻查（session lookup / 主库 lookup·brief）→ 停靠与导航（session tree / node）→ 深取回档（--process / ptr 回原档 / 主库 cross·show）。
- 计分：与主库同一 `scoreTokens`（整词 ×1 + min(Σ回退, 0.9)；结论 +1.0 只进排序权重）。`strong` 表示至少一次整词命中。
- 覆盖边界：旧格式（8–9 月 chunk 型）仅部分可抽取；读取侧 `frameFails` 记录损坏 / 半写帧；会话层条目**免复审**（天然带时间，非知识断言）。
- 插件（`@akasha-book/akasha-session` v0.2.3，2026-10-07 起）：`turn/end` 去抖（30s/会话）自动增量索引 + 压缩事件行（`compaction/end` 真值；成功才记；**wave1 起压缩先强制补索引（绕过去抖/背压），`session-compact` 线带 `indexed`/`reason`——仅 `indexed:true` 时节奏条说「已收入」，否则提示「可能未进会话层」与回退路径；同会话后续索引成功即改口**）+ 每回合节奏条（`systemPrompt.context`，order 134）；**v0.2 起含循环观测 P0（dry 干跑——只观测不干预）**：流环（**现役格式＝`agent/assistant-stream` 帧**：reasoning/text-delta 累积，480 字符节流 + 8K 尾窗；`assistant/chunk` 系 V0 遗物仅兼容保留；chunk 帧的 turn/step 由 start 帧缓存补全）+ turn 环（turn-stopping/`turn/end` 兜底，取数＝事件流缓存全文）+ 帧/类型探针 → `loop-watch` / `loop-watch-probe` 观测线（写 `logs\hooks.jsonl`；汇总 `session loopwatch`）。观测线 `session-armed` / `session-index` / `session-index-skip` / `session-index-error` / `session-compact`。
