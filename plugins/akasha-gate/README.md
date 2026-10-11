# @akasha-book/gate

阿卡夏之书门控 v1.2 —— 把「可机检的纪律」做成硬约束（设计稿 §10 投影律）。

- **v1.2.2（2026-10-09）**：新增**自我层注入** `akasha:self`（order 699，排在用法条之前）——每会话自动核对「我是谁」：渲染时读 canon 中 tag『自我』的当前条目（canon-self-concept / canon-address-layers / canon-memory-auto-record…），每条截到句界（≤200 字）压缩注入；读不到 / 空域 → 极简兜底，永不抛；降级/恢复切换落线 `gate-self-fallback` / `gate-self-recovered`，`gate-armed` 增记 `selfSource` / `selfOrder`。
- **v1.2（2026-10-07 复查修复）**：重定向判定排除 JS 箭头（`=>`）与 `2>&1`（`(?<![=\-])>(?![&=])`）——修复前只读 `node -e` 探针（含 `=>{`）被误拦；带/无空格真重定向仍拦（自检哨兵）。

- ① `tools.guard`：拒绝 `edit` / `write` / `apply_patch` 对 `akasha\data\` 的直写；拒绝 `pwsh` / `bash` 命令里对 `akasha\data` 的写操作（Set-Content / Add-Content / Out-File / Remove-Item / Copy-Item / `del` / 重定向 等）。数据必须经校验写入：`akasha` CLI / `mcp__akasha__*`。
  - **已知边界（v0 有意为之）**：门控防「顺手直改」，不防刻意绕过（例如 `node -e` 脚本内写文件）——那是安全边界的活，不属于本层承诺。见设计稿 §10「只对可机检项承诺必定」。
- ② `systemPrompt.section`（name `akasha:protocol`，order 700）：**渲染时读库**——`text` 传函数，官方 `dsh-system-prompt` 在组装时求值（`lib/index.js:342`），读 `canon-akasha-usage` 的**当前版本**（`currentRecords` 取链尾，含 `-rN`）；**改用法 = `revise canon-akasha-usage`，下一次组装即生效**（无需重启/改码）；读库失败回退本文件内置同文兜底（渲染永不抛）。
- 记录：`<AKASHA_DIR>/logs\hooks.jsonl`（`gate-armed`〔含 `usageSource` / `selfSource`: library|fallback〕/ `gate-denied` / `prompt-change`〔只跟结构变更〕/ `gate-usage-fallback` / `gate-usage-recovered` / `gate-self-fallback` / `gate-self-recovered`）。
- 自测：`node selftest.mjs`（48 断言，桩 ctx + 真库文本 + 不存在目录回退 + 自我层三路，不需要宿主）。
- 绕过：`plugin_manager set_bundle` → `@akasha-book/gate` → `enabled:false`（或改本包 config）。
- 版本纪律：**替换已安装包需要重启才载入新 JS 代**（官方语义）。v1.0.1 修复命令分支路径判定（`startsWith` → `includes`）；**v1.1.0 起注入改为库驱动**（自举缺口修复，2026-10-07）；**v1.1.1**：库驱动降级/恢复的切换观测线（`gate-usage-fallback` / `gate-usage-recovered`，仅切换时落一行）+ `prompt-change` 语义注记（**只跟结构变更**，文本漂移不触发）。

## 打包 / 安装

```powershell
cd <LOCAL_PATH>
F:\h\all\Nodejs\npm.cmd pack
# 然后：plugin_manager install_bundle <tgz 绝对路径>（新 bundle 会 HMR 热生效）
```
