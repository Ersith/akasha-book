# @akasha-book/sleep

阿卡夏之书睡眠器 —— **调度与注入**（蒸馏逻辑归核心库 `<AKASHA_DIR>/sleep.mjs`；手动触发 `node akasha.mjs sleep [--dry]` 与之共用同一水位线）。

> **版本（单一真值）**：以本包 `package.json` 的 `version` 为准；本 README **不再复述版本号**（2026-10-13 审计 P3：此处曾停在 v1.5.5 而实际已到 1.7.x-h 线）。当前装载版本用 `plugin_manager list_bundles` 查；装载态与源的逐字节一致性核查方法见 `akasha/MEMORY-TEST.md`（prompt-safety 双侧 `diff -q` 先例）。

- **会话身份隔离（第五轮 · V02）**：C3 与指代检索仅按完整宿主 ID 精确匹配；当前会话无 intent 时保持静默。`session-1`、`1`、`session-session-1` 不互作别名。此前的单前缀兜底也会误读新版完整 ID 记录，现已移除。33037b3 中无身份格式标记但保留完整 ID 的记录仍可精确读取；更早被剥前缀的记录需要人工核对原会话档案后重索引，不自动猜归属或迁移生产库。
- **v1.10.7-h1（2026-10-14，GPT 第三轮批收尾）**：**normSid 上移模块级**（此前误放 apply 内 ⇒ latestIntentGist 的 N09 过滤运行时 ReferenceError 被 catch 吞、C3 全哑——复跑捉出）。
- **v1.10.6-h1（2026-10-14，GPT 第三轮批 · N08–N11）**：**指代召回按身份过滤**（`recentIntentGist` 经规范化 id 过滤；unknown 不读共享最后一条——N08）；**会话身份归一**（`session-1` ≡ `1`，与索引器剥前缀口径对齐——N09）；**失败压缩不计成功**（`data.error` 非空另计，不再触发多余补查提醒——N10）；**工具执行参数读 `exec.arguments`**（宿主 ToolExecution 真实契约优先，修「查过库仍显示未查」——N11）。
- **v1.10.5-h1（2026-10-14，GPT 复核二轮批 B3）**：**渲染/事件全程显式会话身份**——text 回调带 `context`（按 `context.agent` 选桶）；`session/event` 按宿主真实 **(session, event)** 两参契约消费（压缩计数/用户消息触发路由回归）；回合真值补 `turn/start`（取消/异常回合后 C3 当轮标记正常失效 ⇒ C1 恢复）；**无身份输入归 unknown 桶（不继承上一会话）**；preflight 去抖与 `latestIntentGist` 均按会话隔离（A 的冷却/intent 不再串到 B）。**她方合约复跑**：A/B 渲染各归其位、两参契约下压缩+触发恢复、aborted 后 C1 恢复、unknown 不继承 ✓。
- **v1.10.3-h1（2026-10-14，外部审查修复批 B）**：动态 context 出口（约定/指代/处境三处）全部 `safeInject` 包裹——库原文含合法模板示例（如 `{{unknown}}`）时不再炸宿主渲染（真宿主纯渲染函数复跑 ✓）。
- **v1.8.0-h1（2026-10-13，空转补救）**：新增 **空转检测 + 续跑注入**——监听 `agent/assistant-stream`，**committed 且整轮正文为空**即判为「空转」（用户侧表现就是"卡住"）；落观测线 `idle-turn`，并 **`agent.inject` 一条续跑指令**（`idle-resume`）。**关键设计依据**（来源＝ARTEX 深读笔记的「Stop 钩子」）：这类失效**没有报错、没有异常、没有失败的调用**，所以**普通重试层够不着它**——必须挂在**回合结束**这一层才看得见；且**刻意不"原样重发"**上一轮输入（那只会复现同一种失效）。护栏：30 秒防抖（同一次失效期内不反复注入）、**未提交的回合（用户打断等）不算空转**。自测 +7 断言（有正文不注入 / 空转注入 / 防抖 / 未提交不算 / 观测线两条）。
- **v1.7.2-h1（2026-10-13，举一反三 S4）**：**状态条（`akasha:stateful`）取 intent 改尾部窗口读**——原先每次渲染 `readFileSync` **整读 `session.jsonl`**（当时 21 MB）再 `.slice(-200)`；现只读**尾部 256 KB**，实测真库 **19.5 MB → 262 KB、57 ms → 0.9 ms**，gist 结果逐字相同。两个纯函数（`tailReadText` / `latestIntentGist`）提升为**顶层导出**（生产与自测同一份实现），自测新增回归：真库「尾读 vs 整读」gist 一致 + 单行无换行 / 注入段跳过 / 窗口起点切在行中三边界。
  - 口径差异（如实）：旧口径按 **200 行**回看、新口径按 **256 KB** —— 记录变长/变密时两者覆盖并不等价（哪个更远取决于行密度）；本机实测真库两者取到同一条 gist ✓。

- **v1.5.5（2026-10-07 复查修复）**：移除死代码 `source==='compact'` 早退（官方 `agent/created` 的 source 只有 startup/resume；压缩信号是 session 事件 `compaction/*`）；子代理守卫沿用官方 `header.origin/delegationDepth`（已核真实字段）。

- **触发**：`agent/status → idle`，去抖 `minIntervalHours`（默认 6）；另一路定时兜底 `ctx.interval`（`timerCheckMs`，默认 1h——timer 属混入服务，必须 `inject:['timer']` 才能访问 `ctx.interval`）。跳过也留痕（`sleep-skip`）；首次激活即跑一次（`activate`）。
- **蒸馏（v1.4 起在核心库 `akasha\sleep.mjs`）**：`akasha\logs\hooks.jsonl` 增量（水位线 `processedLines`）→ turns / tools / errors / denials 统计 + 失败备注 + 待办（`buildTodos`：审计警告 → review；工具失败 / 门控拦截 / agent 错误 → 孤案候选）；报告 `sleep-<date>.json`（**同日重复跑加时间戳后缀，不覆盖**）；有待办时追加 `akasha\logs\inbox.jsonl`。
- **条子一（每回合）**：`systemPrompt.context`（`akasha:sleep`，order 130）——每个新回合的 runtime context 自动带上「最近一次睡眠」一行（含待办数；渲染自核心库）。
- **条子二（新会话·唤醒条）**：`agent/created` → 经 `agent.inject()` 把「起床包」摘要递进 next-step inbox（**不唤醒、不打断**；仅当 无睡眠记录 / 有待办 / 审计警告 才发；子代理与 compact 不打扰；消息 `source.kind = "akasha-wake"`）。
- **条子三（每回合·库脉搏 + 回查）**：`akasha:pulse`（order 132）——六库当前计数 + 最近写入（**写→可见通道**：任何会话 / 脚本写入库后，活跃会话下一回合即见）；**v1.5 起**，窗口内（默认 30 分钟）有工具 / agent 失败时，追一行「回查提示」（错误钩子的注入级动作——只提示、不拦截；渲染幂等，同窗口重复渲染结果一致）。
- **降级（v1.4 切分）**：核心库不可用 → `sleep-error` 观测线 + 条子提示文案；不炸、不失活（插件不再内置蒸馏逻辑，拒绝双份实现）。
- 观测线：`sleep-armed` / `sleep-done` / `sleep-skip` / `sleep-error` / `wake-note` / `wake-note-error` / `wake-note-llm-error` / `sleep-report-error` / `sleep-state-error` / `sleep-inbox-error` 全部写进 `hooks.jsonl`（报告 / 状态 / inbox 三条由核心库发出）。
- 自测：`node selftest.mjs`（纯函数直测 `../../core/sleep.mjs`——含 v1.5 `renderRecallLine`；桩 ctx 端到端（含失败→回查行）+ 写失败线 + 无核心降级；临时目录，不碰真库水位线）。

## 版本与重启

- v1.1.0 事故：访问 `ctx.setInterval` 未 `inject` → 属性访问本身抛错、**apply 整段失败且零日志**（诊断靠 `plugin_manager` 的返回或 `*-armed` 观测线）。v1.1.2 修复 + 入口改 `lib/index.js`。
- **替换已装包的 JS 无法进程内热更**（toggle / remove+reinstall 都无效）——v1.1.2 / v1.1.1 / v1.2.0 / v1.3.0 / v1.3.1 / v1.4.0 / **v1.5.0** 均需**重启**载入。
- v1.3.0：库脉搏（写→可见通道）；v1.3.1：写路径静默失败补观测线；v1.4.0：逻辑归库（`akasha\sleep.mjs`）+ 手动触发；**v1.5.0：回查提示（失败窗口 → 脉搏条追一行）**。
- ⚠️ 注意：`ctx.on('tools/result')` 与 `ctx.on('agent/error')` 的监听是 v1.5 新增——宿主 Event 名以 `cordis_inspect_query`（host Event 目录）为准，两个事件均为 emit 语义（失败不打断宿主）。

## 打包 / 安装

```powershell
cd <LOCAL_PATH>
npm pack
# 然后：plugin_manager install_bundle <tgz 绝对路径>（首次安装会 HMR 热生效；替换需重启）
```


## 源与许可（Source & License）

- 源仓库：https://github.com/Ersith/akasha-book
- 本版本固定提交（pinned commit）：`5a55099586cfae4e7511ba433eaf202455d81c30`
- 许可证：MIT（见仓库根 LICENSE）
