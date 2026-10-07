# @akasha-book/mcp

> 阿卡夏之书（Akasha Book）· MCP 桥插件

阿卡夏之书 MCP 桥：把核心 `mcp.mjs` 的工具以 `mcp__akasha__*` 暴露给宿主模型（stdio 传输）。

- 工具面（16）：`akasha_check` / `akasha_lookup` / `akasha_price` / `akasha_stats` / `akasha_orphan_add` / `akasha_frontier_due` / `akasha_audit` / `akasha_brief` / `akasha_kit` / `akasha_promote` / `akasha_revise` / `akasha_cross` / `akasha_summary` / `akasha_show` / `akasha_mirror_match` / `akasha_metrics`。
- 实现：仅 `package.json` + `cordis.patch.yml`——bundle patch 插入一条 `@deepseek-ai/dsh-mcp-client` 配置，stdio 拉起 `node <AKASHA_DIR>/mcp.mjs`。
- ⚠️ **安装前请按你的实际路径修改 `cordis.patch.yml` 中的 `command` / `args`**（默认给了占位示例）。
- 依赖：`@deepseek-ai/dsh-mcp-client`（DSH 官方 bundle，随宿主提供）。

## 打包 / 安装（DSH 宿主）

```bash
npm pack
# 然后：plugin_manager install_bundle <tgz 绝对路径>（实测返回 applied 热生效；未热生效时重启宿主）
```
