# @akasha-book/sleep

阿卡夏之书睡眠器 v1.5.5 —— **调度与注入**（蒸馏逻辑归核心库 `<AKASHA_DIR>/sleep.mjs`；手动触发 `node akasha.mjs sleep [--dry]` 与之共用同一水位线）。

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
