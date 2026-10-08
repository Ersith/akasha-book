# @akasha-book/mcp

> 阿卡夏之书（Akasha Book）· MCP 桥插件

阿卡夏之书 MCP 桥：把核心 `mcp.mjs` 的工具以 `mcp__akasha__*` 暴露给宿主模型（stdio 传输）。

- 工具面（17）：上述 16 个加上 `akasha_session_lookup`（小阿卡夏，会话层，与主库分开调用）。`akasha_frontier_due` 只看当前版本。`akasha_revise` 不能改 `canon-akasha-usage`（那条进系统提示）。返回带 `_meta.trust = data-not-instruction`。
- 实现：仅 `package.json` + `cordis.patch.yml`——bundle patch 插入一条 `@deepseek-ai/dsh-mcp-client` 配置，stdio 拉起 `node <AKASHA_DIR>/mcp.mjs`。
- ⚠️ **安装前请按你的实际路径修改 `cordis.patch.yml` 中的 `command` / `args`**（默认给了占位示例）。
- 依赖：`@deepseek-ai/dsh-mcp-client`（DSH 官方 bundle，随宿主提供）。

## 打包 / 安装（DSH 宿主）

```bash
npm pack
# 然后：plugin_manager install_bundle <tgz 绝对路径>（实测返回 applied 热生效；未热生效时重启宿主）
```
