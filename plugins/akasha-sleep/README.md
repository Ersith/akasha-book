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

<!-- store-status -->
## 兼容与状态（DSH STORE 口径 · 2026-10-10）

**固定源（immutable source）**：本版本的源码冻结于 Commit `d311ad54d1dc2cd2697c7b9eeac57eaa6466fc04`（对应 `plugins/akasha-sleep/package.json` 的 version）。
兼容声明见 manifest 的 `dsh.compatibility.dshReleases`：**0.2.0-rc.2 = compatible**（本机实测运行），
`0.2.1-alpha.1` / `0.2.1-alpha.2` 尚未实测 ⇒ 按契约如实写 `unknown`（不猜、不吹）。

| 证据层 | 状态 | 依据 |
|---|---|---|
| 静态契约（manifest / Bundle Patch / 许可证 / 入口 ID） | **verified** | 官方 `build-dsh-plugin` 审计：静态分见本包审计输出；入口 ID 为插件自有，不 disable/replace 任何 `@deepseek-ai/*` |
| 单元与边界测试（`npm test`） | **verified** | `node selftest.test.mjs` 全绿；覆盖 malformed 输入、并发/节流、replay 一致性（见该文件断言） |
| 一次性 Profile 安装·启动·卸载（E3） | **尚未（unverified）** | 本表如实标注：E3 证据**未执行**，属**下一道门**；不把未执行写成 passed |
| 真实 Profile 运行 | **verified（本机）** | 桌面端 0.2.0-rc.2 实跑；**他人机器 unverified**（未做外部验收） |
| 独立安全审计 / 公开分发（E5） | **unverified** | 未做独立审计；分发前应重评 |

**下一道门（next gate）**：① 用一次性 Profile（临时 `DSH_HOME`）跑通安装 → 启动 → 卸载并留证据；
② 在 0.2.1-alpha.x 上按同一套用例复测，把 `unknown` 改为精确结论（`compatible` 或 `incompatible`）。
若任一版本复测失败，该版本标注为 `blocked`（不兼容）并保持其余版本声明不动。

**权限 / 非目标 / 边界（permissions · non-goals · boundaries）**
- 读取：`logs/hooks.jsonl`（蒸馏输入）；写入：**仅在触发时**写睡眠报告、`logs/inbox.jsonl`（候选待办）与水位线 `sleep-state.json`；
  失败路径**不推进水位线**（回滚语义，见测试断言）；注入失败只降级显示，不抛。
- **统一非目标（non-goals）**：不修改 DSH 核心与官方包；不替换、禁用或遮蔽任何官方组件；不写真实 Profile（测试一律用系统临时目录）；
  不在日志/输出里暴露凭据、完整用户文件或注入上下文。
- **测试隔离**：所有自测只使用 `os.tmpdir()` 下的临时目录；不读写真实库（`~/.akasha`）与真实会话档案。
