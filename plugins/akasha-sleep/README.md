# @akasha-book/sleep

> 阿卡夏之书（Akasha Book）· 睡眠器插件

阿卡夏之书睡眠器 v1.5.1 —— **调度与注入**（蒸馏逻辑归核心库 `../../core/sleep.mjs`；手动触发 `node akasha.mjs sleep [--dry]` 与之共用同一水位线）。

- **触发**：`agent/status → idle`，去抖 `minIntervalHours`（默认 6）；另一路定时兜底 `ctx.interval`（默认 1h——timer 属混入服务，需 `inject:['timer']`）。跳过也留痕（`sleep-skip`）；首次激活即跑一次（`activate`）。
- **蒸馏**：`hooks.jsonl` 增量（水位线 `processedLines`）→ 统计 + 失败备注 + 待办（审计警告 → review；工具失败 / 拦截 / agent 错误 → 孤案候选；**失败前未查库的回合 → review `recall-miss`（召回复盘，带会话样本；不自动转孤案），wave1.1**）；报告 `sleep-<date>.json`（**同日重复跑加时间戳后缀，不覆盖**）；有待办时追加 `logs/inbox.jsonl`。
- **条子一（每回合）**：`akasha:sleep`（order 130）——最近一次睡眠摘要（含待办数）。
- **条子二（新会话·唤醒条）**：`agent/created` → 经 `agent.inject()` 递「起床包」摘要（不唤醒、不打断；仅当 无睡眠记录 / 有待办 / 审计警告 才发）。
- **条子三（每回合·库脉搏 + 回查）**：`akasha:pulse`（order 132）——六库计数 + 最近写入（**写→可见通道**）；窗口内（默认 30 分钟）有失败时追一行**回查提示**（注入级，不拦截）。
- **配置**：`akashaDir` / `log` / `stateFile` / `inboxFile` / `appModulesDir`（唤醒条用的宿主模块目录；**留空则跳过并留痕 `wake-note-llm-skip`**）/ `minIntervalHours` / `timerCheckMs` / `contextOrder` / `pulseOrder`。
- 观测线：`sleep-armed` / `sleep-done` / `sleep-skip` / `sleep-error` / `wake-note` / `wake-note-error` / `wake-note-llm-error` / `wake-note-llm-skip` / `sleep-report-error` / `sleep-state-error` / `sleep-inbox-error`。
- 自测：`node selftest.mjs`（纯函数 + 桩 ctx 端到端 + 写失败线 + 无核心降级；不碰真实水位线）。

## ⚠️ 版本纪律

替换已安装包的 JS **无法进程内热更**（模块代缓存）——升级后需重启宿主载入。

## 打包 / 安装（DSH 宿主）

```bash
npm pack
# 然后：plugin_manager install_bundle <tgz 绝对路径>（新 bundle 热生效；替换已装包需重启宿主）
```

依赖：DSH 宿主（`systemPrompt` / `timer` 服务与事件面）；核心库 `../../core/sleep.mjs` + `lib.mjs`（经 `akashaDir` 动态加载）。
