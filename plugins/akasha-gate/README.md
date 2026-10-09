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
