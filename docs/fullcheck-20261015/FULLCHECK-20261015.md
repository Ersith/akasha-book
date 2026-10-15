# 阿卡夏全量检查报告（2026-10-15 · 门档 C 档端到端首跑）

> **本文档供外部独立审计**：请沿"证据/falsifier"字段自行复跑；本报告刻意保留**被证伪**与**降档**的条目——机器判绿不等于真绿，人工裁决也会错，双向都留痕。

## 0. 怎么跑的（可复现）
```bash
cd <akasha>
node tools/gate.mjs p0 --task full-check-20261015 --out ./gate-out          # ① 零模型机检（13 项）
node tools/gate.mjs briefs --task full-check-20261015 --units core,cli-mcp,session-tools,plugins --out ./gate-out   # ② 生成派单文本
node tools/gate.mjs escalate --slices gate-out/full-check-20261015/slices/*.jsonl --task full-check-20261015 --out ./gate-out   # ③ 机检升级裁决
node tools/gate.mjs close --task full-check-20261015 --out ./gate-out      # ④ 收口
```
分层：**P0 机检（零模型）→ P1 快层（4 个正交单元并联，各 ≤8 分钟，只出"切片=可证伪指控"）→ 机检升级判据 A1/A2 → P2 慢层（仅升级项，两路独立裁决）→ P3 独立审核**。
铁律：只读被审对象；脚本只写自己的 `runs/`；**每条结论必须自造输入跑出来**；每条切片带 `falsifier`（什么最小实验能让它挂掉）。

## 1. 结果计数（全部可从产物复算）
- **P0 机检：13 项，0 FAIL**（主套件 / 库校验 / 体检 / 全家扫描 / 语法 / 六库快照）——**而下面 29 个升级点全部逃过了这些脚本**。
- 切片：**61 条**（5 个文件）· 升级：**29 点**（A1 28 / A2 1）· 自证包：完整=true（带证伪器 61/61）
- 升级按 risk_class：silent-skip 16 · false-fix 2 · coverage-gap 2 · false-green 7 · dataloss 1 · false-fix/crash（实证） 1
- 机检裁决：**needs-slow**（含闭词表零容忍校验：非法取值当场判 `invalid-input` 并**拒绝报绿**）

## 2. 修复清单（12 项，全部有验证证据）

| # | 问题 | 改动点 | 验证证据 | 性质 |
|---|---|---|---|---|
| 1 | **会话层读面被切成两半** | session.mjs（`!== sess` 族 4 处 + `sessionMatches` 只归一一边） | 真库两种写法"作用域内" 2028/1089 → **3211**（统一）；test.mjs I-18 | 本轮最重 |
| 2 | **门档触发行在生产里永不出话** | dsh-akasha-sleep/lib/index.js（哨兵 `null` → `undefined`） | 全历史 hooks.jsonl `gate-reminder` 计数 **0** → 修 + 注册面用例（回退哨兵即红）；gate.test 37/0 | 物证级 |
| 3 | **`today` 校验只在 MCP 面** | lib.mjs（`dayArg` 下沉）+ akasha.mjs（读工具族 4 处 + 顶层兜底 catch） | CLI `audit --today bogus` exit 0/判 2027 到期 → **exit 1 + 单行报错**；test.mjs I-19 | 两端口径 |
| 4 | **`audit/summary/stats` 声称吃注入却真读真库** | lib.mjs（三函数 loadStore 接 `opts.files`；`stats()` 补形参；`audit` 内部 `stats()` 转发） | 探针 `auditSummaryCanon` **432 → 0** | 最高级假绿 |
| 5 | **`stripGenre` 吃掉词尾「好」** | lib.mjs（带左边界锚）+ `skeletonCount` 同锚 | 真库 18 处"偏好。→偏。" → "偏好。"回来了；test.mjs 三条回归门 | 读侧篡改 |
| 6 | **门档触发词表漏高频表达** | dsh-akasha-sleep/lib/index.js（词表扩宽） | 6 条原漏网全部触发 `审计`；负例仍不触发；gate.test 32→37 | 自指缺陷 |
| 7 | **数字入参无上下界** | lib.mjs（`summary.per` 钳 20）+ session.mjs（`limit/offset` 钳） | `--per 1e9` 185051 → **19831** 字节 | 剂量闸绕过 |
| 8 | **MCP `review_log` 任意值照收** | mcp.mjs（store 白名单 + verdict 词表 + id 存在性） | 三种非法输入全被拒（原回 ok:true） | 两端不一致 |
| 9 | **CLI `orphan add --event-time` 零校验** | akasha.mjs（`dayArg`） | `15/10/2026`/`9999-13-45` 原样落库 → 现被拒；**I-19 补 CLI 侧对等用例** | 唯一无保护项 |
| 10 | **session 定时器降级无观测线** | dsh-akasha-session/lib/index.js（两处补 `session-degraded` 行） | 探针重跑：原"无降级观测线"→ 有行 | 静默降级 |
| 11 | **紧凑化工具不认 `AKASHA_ROOT`** | tools/migrate-20261015-compact-session.mjs | 指向沙箱跑不再真读真库（原会） | 安全相关 |
| 12 | **family-sweep 漂移面漏 `lib/index-worker.mjs`** | tools/family-sweep.mjs | 该文件现纳入漂移比对 | 覆盖缺口 |

**修复后全量回归**：主套件 270/0 · 体检 51/51 · 库校验 811/811 · gate.test 37/0 · stateful 11/0。

## 3. 被慢层**证伪**的条目（不许照修——审计请重点看这一节）

> `verdict-b.json` 落盘时含断字，无法机读 ⇒ **以下 8 条按 B 路回执逐条转录**（内容未改写）。

| 文件 | id | 判定 | 一句话证据 |
|---|---|---|---|
| session-tools | S1 | **部分确认（原判成立；现态已修）** | 裸/前缀两写法 CLI 同命中「作用域内 3246」；`!== sess` 零残留；test.mjs 有回归 |
| session-tools | S3 | **证伪** | 前缀对不撞、末字符最狠对不撞；极端条件（同 seq+同内容+同子节点 id）现态不撞 / **旧公式会撞** ⇒ sidFp 是承重件 |
| session-tools | S4 | **证伪** | 真库 both=0（620/1340/30120）；沙箱 4 行 craft 精确分离 2/2、0 误判 |
| plugins | S1 | **部分确认（源码已修✓ / 生产未生效✗）** | mock 出话「[门档]…」+ 沙箱实写 gate-reminder 行；回退哨兵即红（exit=1）；**安装副本仍 null** |
| plugins | S3 | **部分确认** | 36/0 但 `pass += 2` 无条件计数、`:98` 欠计 1 条 ⇒ 自报虚 1（已修）；注册面覆盖已补 |
| plugins | S4 | **确认** | 安装副本 01a6d274c140 ≠ 源码 b5a7c4df3777；版本号却同为 1.10.11-h1；安装副本 grep「排查/体检/审一下」=0 |
| plugins | S5 | **确认** | `gate-reminder`=0 vs `stateful-reminder`=21（5.2MB 文件仍在写）；根因=S1 |
| plugins | S6 | **确认** | session lib `:551-556` 外层 catch 无 log ⇒ 降级无观测线（已补） |

- **A 路 cli-mcp.jsonl S2** —— 证伪（对当前 HEAD）；对切片时点为真：切片时点（Lead 亦复核）exit=0 属实。lib.mjs 于 20:32:35 加入 dayArg 下沉（lib.mjs:3836/2182/4004 + akasha.mjs 顶层收口）。我把 falsifier 原样重跑：node akasha.mjs audit --today bogus --json → exit=1，单行 today 必须是 YYYY-MM-DD（或可归一的日期）：bogus；kit --today b

> 其中 `cli-mcp S2`/`S5` 的"证伪"是**"对当前 HEAD 证伪"**：原判与复核在各自时点都属实，是**Lead 在慢层裁决期间并发打补丁**改变了工作树。⇒ 见第 5 节流程教训。

## 4. 降档的条目

- **cli-mcp.jsonl S5** —— 部分确认 + 时间敏感（切片/Lead 时点成立；当前 HEAD 已被并发补丁修掉）：① 20:34（lib 57f7c2b1）：node akasha.mjs summary 3528B vs --per 1000000000 185119B（52×），--per 100000 同为 185119B（无上界）；MCP akasha_summary{per:1e8} 21732B vs 默认 4172B（5.2×）。② 20:35:54 起 lib.mjs:2182 变为 Math
- **core.jsonl S-core-3** —— 部分确认（机制复现；但『非法条件抛错』的适用面被夸大、危害为理论值）：复现：validateCondition({op:bogus}) 不抛、evalCondition 结果 false、filterNotApplicable 的 excluded 为空（该条不排除）；{turnn:3}（字段名打错）、{gte:3} 同类。反面对照：算子对象内的错算子确实抛——validateCondition({turn:{bogus:1}}) 抛 条件非法（$.turn）：未知

## 5. 流程教训（本轮最贵的一条）
**验证必须在冻结的修订上做。** Lead 在 P2 裁决期间并发改了 `lib.mjs`/`akasha.mjs` 4+ 次（20:32–20:36），中间态一度把 CLI 打红（`opts is not defined`）；两条"证伪"实际只是"派单者抢跑"。
⇒ 门档纪律补一条：**P2 期间锁树；要修先记切片，慢层收工再动手。**

## 6. 仍未完成
- `@akasha-book/akasha-sleep` **需重打包 + install + 重启**（词表与哨兵两处修复目前只在源码面生效，生产仍跑旧构建）；
- `core S-core-4`：`OUTPUT_ID_RE` 不认 `frontier-` 前缀 ⇒ 13 条当前 id 在引用统计里"不存在"；
- `core S-core-5`：49 条校验规则里 48 条的期望串不在测试内 ⇒ **规则能红 ≠ 套件在查**（覆盖缺口）；
- `boundedInt` 目前**零调用＝死代码**（慢层点名）；
- 门档自身两个设计缺口：切片 id **跨文件重号**（应带单元前缀）；"**派单者自己也在改代码**"无机制可拦。

## 7. 附：全部切片（含未升级的）

| 文件 | id | risk_class | status | reality | 一句话 | 锚点 |
|---|---|---|---|---|---|---|
| cli-mcp | S1 | silent-skip | 实证 | reproduced | CLI 面 `orphan add --event-time` 完全不校验日期格式，非法值直接落进六库（orphan.jsonl），此后被日期过滤静默排除；MCP 面同一功能同一输入已拒——今天那批 event_time 校验只打在 MCP | akasha.mjs:486 |
| cli-mcp | S2 | false-fix | 实证 | reproduced | today 校验只加固在 MCP 面：CLI 的 audit/kit/lookup/brief/cross 仍把 --today 原样透传，audit --today bogus 照常 exit 0 并产出系统性失真的审计结论（'bogus | akasha.mjs:523 |
| cli-mcp | S3 | silent-skip | 实证 | reproduced | MCP `akasha_review_log` 只查三个字段的真值，不校验 store 存在性、id 存在性，也不校验 verdict 值域；可写入不存在的 store/id 与任意 verdict 串（实测落 logs/review-lo | mcp.mjs:120 |
| cli-mcp | S4 | coverage-gap | 实证 | reproduced | 今天新补的四套检测器（I-14 V6 日期 / I-15 G2 until / I-17 F6a today / I-17 F6b event_time）全部只 spawn mcp.mjs 打 MCP 面，CLI 面同一功能零用例——修复面 | test.mjs:5177 |
| cli-mcp | S5 | perf | 实证 | reproduced | MCP 数字型入参无上界/无符号校验：akasha_summary 的 per 只被实现侧折叠（非正整数回落到 3），per=100000000 会让返回从 4.1KB 涨到 203.5KB（48.7×），akasha_session_lo | mcp.mjs:114 |
| core | S-core-1 | false-green | 实证 | reproduced | audit()/summary()/stats() 忽略 opts.files 数据面注入——用「空夹具」调用时仍读真库（实测 canon=432），而 revisabilityStats/memoryDiff 认注入（对照=0）；测试用该 | akasha/lib.mjs:3822 |
| core | S-core-2 | dataloss | 实证 | reproduced | stripGenre 白名单实际含「X好。」→「X。」：把词尾「好」吃掉改语义（真库 18 字段/627 个改动字段中）；且现有幂等用例夹具（完成。好。/好。开始/嗯好。继续）恰好都落在设计模式上，检不出这类误伤 | akasha/lib.mjs:3435 |
| core | S-core-3 | silent-skip | 实证 | reproduced | validateCondition/evalCondition 把「算子名当字段名」的写法静默当等值条件：{op:'bogus'} 不抛、checkAll 报绿、evalCondition 恒 false ⇒ not_applicable  | akasha/lib.mjs:4161 |
| core | S-core-4 | coverage-gap | 实证 | reproduced | 引用统计的 id 正则闭集与库内真实 id 形状不符：只认 canon\|front\|orphan\|mirror\|price\|lex，把 frontier- 前缀（8 条）漏掉；并要求前缀后 ≥5 字符，把 orphan-0001  | akasha/lib.mjs:2422 |
| core | S-core-5 | coverage-gap | 实证 | reproduced | validateRecord 的 49 条规则中 48 条能被外部输入打红，但只有少数在 test.mjs 有对应断言（源码层无「记录不是对象/缺少 id/…」等期望串）；规则「能红」≠「套件在查」——覆盖面无法由套件自身证明 | akasha/lib.mjs:343 |
| lead | L1 | docs | 实证 | reproduced | 注入行的「待办 N」取的是**上次睡眠时刻的快照**，与实时结果会打架（今天实证：inbox 已转正/清零后，睡眠行仍显示「待办 4」） | dsh-akasha-sleep/lib/index.js:73 |
| lead | L2 | coverage-gap | 实证 | reproduced | 召回纪律在实测中**完全没落地**：失败回合 11 个里「失败前先查库」0 次（漏召率 100%）；可预防口径下库内有同类坑的 7 次失败，**7 次都没查库**（可预防漏召率 100%）——而 C1/C3/门档三条注入行都在渲染 | akasha/lib.mjs:3529 |
| lead | L3 | coverage-gap | 实证 | reproduced | 门档触发词表**漏掉高频表达**：7 条实测里 6 条不触发（「对…做一次全量检查」「全量检查」「排查」「整体复检」「体检」「审一下」）——**最该挂门档的场景反而挂不上**（当天那次全量检查就是靠用户明说才走的） | dsh-akasha-sleep/lib/index.js:113 |
| plugins | S1 | silent-skip | 实证 | reproduced | sleep 插件 akasha:gate 这条 context 行在「会话 id 未知」时**永远不可能出话**：哨兵传的是 `null`，而 latestIntentGist 对 null 直接 return null（判据恒假）；同一文 | dsh-akasha-sleep/lib/index.js:523 |
| plugins | S2 | coverage-gap | 实证 | reproduced | family-sweep 的「代码漂移」面漏掉 session 包声明装载件 lib/index-worker.mjs（PKGS.code 只列 lib/index.js）⇒ 该文件在源码与安装副本之间漂移时扫描器照常报绿；同批也未覆盖 s | akasha/tools/family-sweep.mjs:31 |
| plugins | S3 | false-green | 实证 | reproduced | gate.test.mjs 无条件 `pass += 2`（不带任何断言）⇒ 该套件自报通过数比真实断言数多 2；且整套 gate 测试**只覆盖纯函数 gateTriggerOf**，对 gate 在生产里的注册面（context 行：哨 | dsh-akasha-sleep/gate.test.mjs:51 |
| plugins | S4 | false-fix | 实证 | reproduced | 装载副本漂移（活体、有时间缝）：sleep 源码 lib/index.js 于今日 12:24:29Z 被改（GATE_TRIGGERS 审计类正则加宽，补入 检查/排查/体检/复检/核对/审一下 等高频词），而 profile 装的仍是  | dsh-akasha-sleep/lib/index.js:147 |
| plugins | S5 | silent-skip | 实证 | observed | gate-reminder 观测线在全部历史 hooks.jsonl（5.15MB，2026-10-06→10-15 仍在写）里出现 **0 次**，而 gate 插件今天已 armed 6 次、其代码自 10-14 19:16 起就在装载 | akasha/logs/hooks.jsonl（grep -c gate-reminder = 0） |
| plugins | S6 | silent-skip | 实证 | reproduced | session 插件的定时兜底（ctx.interval）注册失败时被 try/catch 静默吞掉且**不落任何观测线**（同文件其它降级路径都会 log）⇒ 定时补索引一旦失效，外部只看到「不再索引」，看不到为什么——与 sleep 的 | dsh-akasha-session/lib/index.js:551 |
| plugins | S7 | docs | 实证 | reproduced | 检测器面已修好（反向对照，防旧结论当现状）：family-sweep 第 5 段按 readdirSync 自动发现 *.test.mjs，sleep 的 stateful/preflight/gate 三套现已进扫描面且全绿（11/0、4 | akasha/tools/family-sweep.mjs:132 |
| plugins | S8 | other | 实证 | reproduced | 装载一致性（逐字节）：四插件声明装载件中，gate/hooks/session 全部 src==安装副本（含 session 的 lib/index-worker.mjs 同哈希），唯一漂移是 sleep/lib/index.js（=S4  | runs/p1-plugins-probe-sleep-drift2.mjs（输出表） |
| session-tools | S1 | silent-skip | 实证 | reproduced | 会话层读面按「裸/前缀」两种会话写法切成两半：检索用严格 `r.session !== sess`（4 处），而写入侧已统一存裸形态 ⇒ 同一会话两种写法的命中集合互不相交（本会话 1982 vs 250 段），且 `[覆盖] 作用域内`  | session.mjs:437 |
| session-tools | S2 | other | 实证 | reproduced | 一次性紧凑化工具不认沙箱环境变量：数据路径硬编码 `const STORE = `${ROOT}/data/session.jsonl``（ROOT 也硬编码 <akasha>，与 akasha-shape.mjs 的 ` | tools/migrate-20261015-compact-session.mjs:9 |
| session-tools | S3 | silent-skip | 实证 | reproduced | `sid.slice(0,N)` 短键只修了段 id 一处，同族漏网两处：节点 id 仍 `const sid8 = sid.slice(0, 8)`（真库 2820 行以 `session-` 前缀形态入库 ⇒ 任意两个前缀会话在此 sl | session.mjs:868 |
| session-tools | S4 | false-green | 实证 | reproduced | 「工具族口径一致性」确有一处不一致（换角度仍成立）：`akasha-shape.mjs` 的段 id 形态分类器把**新方案** id 误判成 `fp4` 过渡（真库 1340 条）——新方案 `seg-<裸前8>-<fp8>-<seq>- | tools/akasha-shape.mjs:42 |
| session-tools | S5 | coverage-gap | 实证 | reproduced | 检测器有"查错地方"的证据：I-13 V2 夹具的会话名是 `session-s1` / `session-s2`（前 8 字符同为 `session-`），而真库 2820 行的真实前缀形态是 `session-<uuid>` ⇒ 同一个 | test.mjs:4972 |
| session-tools | S6 | false-green | 推测 | theoretical | 判据自身不具备判别力的实例：I-15 G1 声称抓「静默丢段」，但其断言 `assert.equal(r2.added, 0)` 对**新旧两种内容键实现都会通过**——而能区分二者的「边界位移」形状（gist 里含 `\|` 使裸拼接键位 | test.mjs:5076 |
| session-tools | S7 | other | 实证 | reproduced | 反向证据（撤控，防"整片怀疑"）：内容键转义、段 id 换形后的去重、node 行排除三处口径**当前是自洽的**——真库 31999 段按内容键分组后「组内多行」= 0（含新老混形 0），shape 与 migrate 的 node 排除 | runs/st-probe5-mixed-form-dupes.mjs:1 |
| session-tools | S8 | other | 实证 | reproduced | 检测器自检（能否真红）：I-13 V2 用**旧公式复算**（不改 test.mjs）即可确认能红——旧 `sid.slice(0,8)` 对 `session-s1`/`session-s2` 恒为 `session-`，段 id 撞号； | runs/st-probe9-detector-canfail.mjs:1 |
| session-tools | S1 | silent-skip | 实证 | reproduced | 会话层读面按「裸/前缀」两种会话写法切成两半：检索用严格 `r.session !== sess`（4 处），而写入侧已统一存裸形态 ⇒ 同一会话两种写法的命中集合互不相交（本会话 1982 vs 250 段），且 `[覆盖] 作用域内`  | session.mjs:437 |
| session-tools | S2 | other | 实证 | reproduced | 一次性紧凑化工具不认沙箱环境变量：数据路径硬编码 `const STORE = `${ROOT}/data/session.jsonl``（ROOT 也硬编码 <akasha>，与 akasha-shape.mjs 的 ` | tools/migrate-20261015-compact-session.mjs:9 |
| session-tools | S3 | silent-skip | 实证 | reproduced | `sid.slice(0,N)` 短键只修了段 id 一处，同族漏网两处：节点 id 仍 `const sid8 = sid.slice(0, 8)`（真库 2820 行以 `session-` 前缀形态入库 ⇒ 任意两个前缀会话在此 sl | session.mjs:868 |
| session-tools | S4 | false-green | 实证 | reproduced | 「工具族口径一致性」确有一处不一致（换角度仍成立）：`akasha-shape.mjs` 的段 id 形态分类器把**新方案** id 误判成 `fp4` 过渡（真库 1340 条）——新方案 `seg-<裸前8>-<fp8>-<seq>- | tools/akasha-shape.mjs:42 |
| session-tools | S5 | coverage-gap | 实证 | reproduced | 检测器有"查错地方"的证据：I-13 V2 夹具的会话名是 `session-s1` / `session-s2`（前 8 字符同为 `session-`），而真库 2820 行的真实前缀形态是 `session-<uuid>` ⇒ 同一个 | test.mjs:4972 |
| session-tools | S6 | false-green | 推测 | theoretical | 判据自身不具备判别力的实例：I-15 G1 声称抓「静默丢段」，但其断言 `assert.equal(r2.added, 0)` 对**新旧两种内容键实现都会通过**——而能区分二者的「边界位移」形状（gist 里含 `\|` 使裸拼接键位 | test.mjs:5076 |
| session-tools | S7 | other | 实证 | reproduced | 反向证据（撤控，防"整片怀疑"）：内容键转义、段 id 换形后的去重、node 行排除三处口径**当前是自洽的**——真库 31999 段按内容键分组后「组内多行」= 0（含新老混形 0），shape 与 migrate 的 node 排除 | runs/st-probe5-mixed-form-dupes.mjs:1 |
| session-tools | S8 | other | 实证 | reproduced | 检测器自检（能否真红）：I-13 V2 用**旧公式复算**（不改 test.mjs）即可确认能红——旧 `sid.slice(0,8)` 对 `session-s1`/`session-s2` 恒为 `session-`，段 id 撞号； | runs/st-probe9-detector-canfail.mjs:1 |
| session-tools | S1 | silent-skip | 实证 | reproduced | 会话层读面按「裸/前缀」两种会话写法切成两半：检索用严格 `r.session !== sess`（4 处），而写入侧已统一存裸形态 ⇒ 同一会话两种写法的命中集合互不相交（本会话 1982 vs 250 段），且 `[覆盖] 作用域内`  | session.mjs:437 |
| session-tools | S2 | other | 实证 | reproduced | 一次性紧凑化工具不认沙箱环境变量：数据路径硬编码 `const STORE = `${ROOT}/data/session.jsonl``（ROOT 也硬编码 <akasha>，与 akasha-shape.mjs 的 ` | tools/migrate-20261015-compact-session.mjs:9 |
| session-tools | S3 | silent-skip | 实证 | reproduced | `sid.slice(0,N)` 短键只修了段 id 一处，同族漏网两处：节点 id 仍 `const sid8 = sid.slice(0, 8)`（真库 2820 行以 `session-` 前缀形态入库 ⇒ 任意两个前缀会话在此 sl | session.mjs:868 |
| session-tools | S4 | false-green | 实证 | reproduced | 「工具族口径一致性」确有一处不一致（换角度仍成立）：`akasha-shape.mjs` 的段 id 形态分类器把**新方案** id 误判成 `fp4` 过渡（真库 1340 条）——新方案 `seg-<裸前8>-<fp8>-<seq>- | tools/akasha-shape.mjs:42 |
| session-tools | S5 | coverage-gap | 实证 | reproduced | 检测器有"查错地方"的证据：I-13 V2 夹具的会话名是 `session-s1` / `session-s2`（前 8 字符同为 `session-`），而真库 2820 行的真实前缀形态是 `session-<uuid>` ⇒ 同一个 | test.mjs:4972 |
| session-tools | S6 | false-green | 推测 | theoretical | 判据自身不具备判别力的实例：I-15 G1 声称抓「静默丢段」，但其断言 `assert.equal(r2.added, 0)` 对**新旧两种内容键实现都会通过**——而能区分二者的「边界位移」形状（gist 里含 `\|` 使裸拼接键位 | test.mjs:5076 |
| session-tools | S7 | other | 实证 | reproduced | 反向证据（撤控，防"整片怀疑"）：内容键转义、段 id 换形后的去重、node 行排除三处口径**当前是自洽的**——真库 31999 段按内容键分组后「组内多行」= 0（含新老混形 0），shape 与 migrate 的 node 排除 | runs/st-probe5-mixed-form-dupes.mjs:1 |
| session-tools | S8 | other | 实证 | reproduced | 检测器自检（能否真红）：I-13 V2 用**旧公式复算**（不改 test.mjs）即可确认能红——旧 `sid.slice(0,8)` 对 `session-s1`/`session-s2` 恒为 `session-`，段 id 撞号； | runs/st-probe9-detector-canfail.mjs:1 |
| session-tools | S1 | silent-skip | 实证 | reproduced | 会话层读面按「裸/前缀」两种会话写法切成两半：检索用严格 `r.session !== sess`（4 处），而写入侧已统一存裸形态 ⇒ 同一会话两种写法的命中集合互不相交（本会话 1982 vs 250 段），且 `[覆盖] 作用域内`  | session.mjs:437 |
| session-tools | S2 | other | 实证 | reproduced | 一次性紧凑化工具不认沙箱环境变量：数据路径硬编码 `const STORE = `${ROOT}/data/session.jsonl``（ROOT 也硬编码 <akasha>，与 akasha-shape.mjs 的 ` | tools/migrate-20261015-compact-session.mjs:9 |
| session-tools | S3 | silent-skip | 实证 | reproduced | `sid.slice(0,N)` 短键只修了段 id 一处，同族漏网两处：节点 id 仍 `const sid8 = sid.slice(0, 8)`（真库 2820 行以 `session-` 前缀形态入库 ⇒ 任意两个前缀会话在此 sl | session.mjs:868 |
| session-tools | S4 | false-green | 实证 | reproduced | 「工具族口径一致性」确有一处不一致（换角度仍成立）：`akasha-shape.mjs` 的段 id 形态分类器把**新方案** id 误判成 `fp4` 过渡（真库 1340 条）——新方案 `seg-<裸前8>-<fp8>-<seq>- | tools/akasha-shape.mjs:42 |
| session-tools | S5 | coverage-gap | 实证 | reproduced | 检测器有"查错地方"的证据：I-13 V2 夹具的会话名是 `session-s1` / `session-s2`（前 8 字符同为 `session-`），而真库 2820 行的真实前缀形态是 `session-<uuid>` ⇒ 同一个 | test.mjs:4972 |
| session-tools | S6 | false-green | 推测 | theoretical | 判据自身不具备判别力的实例：I-15 G1 声称抓「静默丢段」，但其断言 `assert.equal(r2.added, 0)` 对**新旧两种内容键实现都会通过**——而能区分二者的「边界位移」形状（gist 里含 `\|` 使裸拼接键位 | test.mjs:5076 |
| session-tools | S7 | other | 实证 | reproduced | 反向证据（撤控，防"整片怀疑"）：内容键转义、段 id 换形后的去重、node 行排除三处口径**当前是自洽的**——真库 31999 段按内容键分组后「组内多行」= 0（含新老混形 0），shape 与 migrate 的 node 排除 | runs/st-probe5-mixed-form-dupes.mjs:1 |
| session-tools | S8 | other | 实证 | reproduced | 检测器自检（能否真红）：I-13 V2 用**旧公式复算**（不改 test.mjs）即可确认能红——旧 `sid.slice(0,8)` 对 `session-s1`/`session-s2` 恒为 `session-`，段 id 撞号； | runs/st-probe9-detector-canfail.mjs:1 |
| session-tools | S1 | silent-skip | 实证 | reproduced | 会话层读面按「裸/前缀」两种会话写法切成两半：检索用严格 `r.session !== sess`（4 处），而写入侧已统一存裸形态 ⇒ 同一会话两种写法的命中集合互不相交（本会话 1982 vs 250 段），且 `[覆盖] 作用域内`  | session.mjs:437 |
| session-tools | S2 | other | 实证 | reproduced | 一次性紧凑化工具不认沙箱环境变量：数据路径硬编码 `const STORE = `${ROOT}/data/session.jsonl``（ROOT 也硬编码 <akasha>，与 akasha-shape.mjs 的 ` | tools/migrate-20261015-compact-session.mjs:9 |
| session-tools | S3 | silent-skip | 实证 | reproduced | `sid.slice(0,N)` 短键只修了段 id 一处，同族漏网两处：节点 id 仍 `const sid8 = sid.slice(0, 8)`（真库 2820 行以 `session-` 前缀形态入库 ⇒ 任意两个前缀会话在此 sl | session.mjs:868 |
| session-tools | S4 | false-green | 实证 | reproduced | 「工具族口径一致性」确有一处不一致（换角度仍成立）：`akasha-shape.mjs` 的段 id 形态分类器把**新方案** id 误判成 `fp4` 过渡（真库 1340 条）——新方案 `seg-<裸前8>-<fp8>-<seq>- | tools/akasha-shape.mjs:42 |
| session-tools | S5 | coverage-gap | 实证 | reproduced | 检测器有"查错地方"的证据：I-13 V2 夹具的会话名是 `session-s1` / `session-s2`（前 8 字符同为 `session-`），而真库 2820 行的真实前缀形态是 `session-<uuid>` ⇒ 同一个 | test.mjs:4972 |
| session-tools | S6 | false-green | 推测 | theoretical | 判据自身不具备判别力的实例：I-15 G1 声称抓「静默丢段」，但其断言 `assert.equal(r2.added, 0)` 对**新旧两种内容键实现都会通过**——而能区分二者的「边界位移」形状（gist 里含 `\|` 使裸拼接键位 | test.mjs:5076 |
| session-tools | S7 | other | 实证 | reproduced | 反向证据（撤控，防"整片怀疑"）：内容键转义、段 id 换形后的去重、node 行排除三处口径**当前是自洽的**——真库 31999 段按内容键分组后「组内多行」= 0（含新老混形 0），shape 与 migrate 的 node 排除 | runs/st-probe5-mixed-form-dupes.mjs:1 |
| session-tools | S8 | other | 实证 | reproduced | 检测器自检（能否真红）：I-13 V2 用**旧公式复算**（不改 test.mjs）即可确认能红——旧 `sid.slice(0,8)` 对 `session-s1`/`session-s2` 恒为 `session-`，段 id 撞号； | runs/st-probe9-detector-canfail.mjs:1 |

## 8. 产物位置
```
gate-out/full-check-20261015/
├─ p0.md            机检报告（13 项 + 六库快照）
├─ briefs/*.md      P1/P2/P3 派单文本（含闭词表与升级判据）
├─ slices/*.jsonl   61 条切片（每条带 falsifier）
├─ escalate.json    机检升级裁决（29 点 + 自证包完整性）
├─ verdict.json     A 路裁决（cli-mcp + core，10 条）
├─ verdict-b.json   B 路裁决（session-tools + plugins，8 项）
└─ runs/            各单元探针脚本 + 原始输出（可整条复跑）
```
