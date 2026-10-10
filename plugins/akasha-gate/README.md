# @akasha-book/gate

> 阿卡夏之书（Akasha Book）· 门控插件

阿卡夏之书门控 —— 把「可机检的纪律」做成硬约束（投影律：把不可检的德行，投影成可检的工序）。

- ① `tools.guard`：拒绝 `edit` / `write` / `apply_patch` 对数据目录的直写；拒绝 `pwsh` / `bash` 命令里对数据目录的写操作（Set-Content / Add-Content / Out-File / Remove-Item / Move-Item / Copy-Item / New-Item / `del` / 重定向 等）。数据必须经校验写入：`akasha` CLI / `mcp__akasha__*`。
  - **已知边界**：门控防「顺手直改」，不防刻意绕过（例如 `node -e` 脚本内写文件）——那是安全边界的活，不属于本层承诺。
- ② `systemPrompt.section`（name `akasha:protocol`，order 700）：**渲染时读库**——`text` 传函数，宿主在组装时逐次求值，读 `canon-akasha-usage` 的**当前版本**（`currentRecords` 取链尾）；**改用法 = `revise canon-akasha-usage`，下一次组装即生效**（无需重启/改码）；读库失败回退本文件内置兜底（渲染永不抛）。
- ②b `systemPrompt.section`（name `akasha:self`，order 699，排在用法条之前）：**自我层**——渲染时读 canon 中 tag『自我』（或 id 前缀 `canon-self-concept` / `canon-address-layers` / `canon-memory-auto-record`）的当前条目，每条压缩到句界（≤200 字）后注入；**每会话自动核对「我是谁」**；读不到 / 空域 → 极简兜底，永不抛。
- ③ 观测线（写 `logs/hooks.jsonl`）：`gate-armed`（含 `usageSource` / `selfSource`: library|fallback）/ `gate-denied` / `prompt-change`（只跟结构变更）/ `gate-usage-fallback` / `gate-usage-recovered` / `gate-self-fallback` / `gate-self-recovered`。
- 自测：`node selftest.mjs`（48 断言，桩 ctx + 系统临时目录 + 桩库；不需要宿主）。
- 配置：`akashaDir` / `dataDir` / `log` / `sectionOrder` 均可在插件配置中覆盖；默认 `~/.akasha`。

## 打包 / 安装（DSH 宿主）

```bash
npm pack
# 然后：plugin_manager install_bundle <tgz 绝对路径>（新 bundle 热生效；替换已装包需重启宿主）
```

依赖：DSH 宿主（`tools` / `systemPrompt` 服务）；核心库 `../../core/lib.mjs`（包内自带，或指向你的 akasha 目录）。

<!-- store-status -->
## 兼容与状态（DSH STORE 口径 · 2026-10-10）

**固定源（immutable source）**：本版本的源码冻结于 Commit `d311ad54d1dc2cd2697c7b9eeac57eaa6466fc04`（对应 `plugins/akasha-gate/package.json` 的 version）。
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
- 读取：无（不读库文件）；写入：仅追加门控日志行（
  `logs/hooks.jsonl` 的 `gate-armed` / 降级切换线）。核心职责是**拦**（拒绝未经校验写入数据目录的工具调用），
  自身不写数据文件。系统提示注入段（`akasha:protocol` / `akasha:self`）为**渲染时读库**，读失败回退兜底、不抛。
- **统一非目标（non-goals）**：不修改 DSH 核心与官方包；不替换、禁用或遮蔽任何官方组件；不写真实 Profile（测试一律用系统临时目录）；
  不在日志/输出里暴露凭据、完整用户文件或注入上下文。
- **测试隔离**：所有自测只使用 `os.tmpdir()` 下的临时目录；不读写真实库（`~/.akasha`）与真实会话档案。
