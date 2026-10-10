# @akasha-book/hooks

> 阿卡夏之书（Akasha Book）· 事件钩子插件

阿卡夏之书钩子 v1.2 —— 把宿主的事件流落成 append-only 记录，为「结果计数器 / 失败回查 / 空闲脉冲 / 输出审计」供料。

- **v1.2（2026-10-07 复查修复）**：输出审计按 `attemptId` **连续累积**——宿主 revision 逐帧递增，修复前按 revision 重置会导致审计恒空；id 跨帧切分现已可还原。

- 记录文件：`logs/hooks.jsonl`（默认 `~/.akasha/logs/hooks.jsonl`；JSONL，一行一事件）。
- 监听（全部为 contained 的 emit 事件，失败不打断宿主）：
  - `session/event` → `turn/end`：回合结束（`kind:"turn-end"`）；
  - `tools/result` → 每次工具结果（`kind:"tool"`，含 `ok` 与失败 `message`；shell 工具若是 akasha CLI 查库子命令，追加 `akashaCli:"lookup"` 等子命令名——只记名、不记命令原文，供核心 `metrics` 的召回信号计数，wave1 · B2；**wave1.1 起带 `session`＝`exec.agent.id`**（宿主 `Agent.id` 即 `SessionId`，与 turn-end / agent-error 的 `session` 同值；无 agent 的调用不写），召回计数据此按会话分区）；
  - `agent/error` → step / turn 出错（`kind:"agent-error"`）；
  - `agent/status` → running→idle（`kind:"idle"`，去抖 + 计数器快照）；
  - `agent/assistant-stream` → **输出审计**：按 attemptId 连续累积 assistant 文本流（宿主 revision 逐帧递增——不可按 revision 重置），committed 结束时跑核心库 `auditText`——
    - 引用**不存在**的库 id → `output-audit` 线（编造引用嫌疑；emit 语义只能审计、不能拦截）；
    - 引用**真实**库 id → `usage` 线（条目级使用计数 v0，供 `akasha.mjs metrics` 汇总）。
- 配置：`akashaDir` / `log` / `idleDebounceMs` / `logToolResults` / `auditOutput`。
- 激活即写一行 `kind:"activated"`——可用它验证插件已加载。
- 自测：`node selftest.mjs`（桩 ctx + 系统临时假库；不碰真实数据）。

## 打包 / 安装（DSH 宿主）

```bash
npm pack
# 然后：plugin_manager install_bundle <tgz 绝对路径>（新 bundle 热生效；替换已装包需重启宿主）
```

依赖：DSH 宿主事件面（`agent/assistant-stream` / `tools/result` 等）；核心库 `../../core/lib.mjs`（输出审计用）。

<!-- store-status -->
## 兼容与状态（DSH STORE 口径 · 2026-10-10）

**固定源（immutable source）**：本版本的源码冻结于 Commit `d311ad54d1dc2cd2697c7b9eeac57eaa6466fc04`（对应 `plugins/akasha-hooks/package.json` 的 version）。
兼容声明见 manifest 的 `dsh.compatibility.dshReleases`：**0.2.0-rc.2 = compatible**（本机实测运行），
`0.2.1-alpha.1` / `0.2.1-alpha.2` 尚未实测 ⇒ 按契约如实写 `unknown`（不猜、不吹）。

| 证据层 | 状态 | 依据 |
|---|---|---|
| 静态契约（manifest / Bundle Patch / 许可证 / 入口 ID） | **verified** | 官方 `build-dsh-plugin` 审计：静态分见本包审计输出；入口 ID 为插件自有，不 disable/replace 任何 `@deepseek-ai/*` |
| 单元与边界测试（`npm test`） | **verified** | `node selftest.test.mjs` 全绿；覆盖 malformed 输入、并发/节流、replay 一致性（见该文件断言） |
| 一次性 Profile 安装·启动·卸载（E3） | **verified** | 2026-10-10 一次性 DSH_HOME 实跑：install → cold start（HTTP 就绪）→ stop → uninstall → `--dump-config` 逐字回到基线；dsh 0.2.0-rc.2；证据见同目录 `EVIDENCE.json` |
| 真实 Profile 运行 | **verified（本机）** | 桌面端 0.2.0-rc.2 实跑；**他人机器 unverified**（未做外部验收） |
| 独立安全审计 / 公开分发（E5） | **unverified** | 未做独立审计；分发前应重评 |

**下一道门（next gate）**：① 在 0.2.1-alpha.x 上按同一套用例复测（一次性 DSH_HOME），把 `unknown` 改为精确结论（`compatible` 或 `incompatible`）；
② 提交 DSH STORE 上架申请（monorepo 子路径：`tree/main/plugins/<name>`）并跟进机器人预检。
若任一版本复测失败，该版本标注为 `blocked`（不兼容）并保持其余版本声明不动。

**权限 / 非目标 / 边界（permissions · non-goals · boundaries）**
- 读取：宿主事件（回合/工具/流式帧）与库内引用计数所需的最小数据；写入：**append-only** 追加 `logs/hooks.jsonl`（只增不改；不删行、不改历史行）。
- **统一非目标（non-goals）**：不修改 DSH 核心与官方包；不替换、禁用或遮蔽任何官方组件；不写真实 Profile（测试一律用系统临时目录）；
  不在日志/输出里暴露凭据、完整用户文件或注入上下文。
- **测试隔离**：所有自测只使用 `os.tmpdir()` 下的临时目录；不读写真实库（`~/.akasha`）与真实会话档案。
