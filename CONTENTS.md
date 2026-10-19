# 仓库内容清单（交付面）

本仓同时是「可运行核心」和「我们自己的活库」。为了 clone 的人一眼分清，这里列出**什么算交付面、什么不算**。

## 在交付面内

- `core/` — 零依赖核心：`lib.mjs`（六库/检索/修订/定价）、`akasha.mjs`（CLI）、`mcp.mjs`（stdio MCP）、`session.mjs`、`sleep.mjs`、`init-example.mjs`、`json-redaction.mjs`，以及运维/校验类工具（check / audit / doctor / review / redaction / sync / verify 等）。
- `plugins/` — 5 个 DSH 插件：`akasha-gate`、`akasha-hooks`、`akasha-session`、`akasha-sleep`、`mcp-akasha`。
- `data/` — 演示/快照数据（已脱敏；运行时请用 `AKASHA_ROOT` 指向你自己的数据目录）。
- `docs/`、`PROTOCOL.md`、`SCHEMA.md`、`CHECKS.md`、`MEMORY-TEST.md`、`paper/`、`research/`。
- `.github/workflows/ci.yml` — 最小 CI：核心套件 + `check` + 5 个插件 selftest。

## 不在交付面 / 不保证

- `core/tools-harvest-*` — 我们自己的演进口述工作笔记（历史归档，**接口不保证**，下一步会迁出主树）。
- 运行期产物：`logs/`、`reports/`、`sleep-state.json`、`data/session.jsonl`、会话档案等。
- 真库快照只作演示；不要把公开快照当运行库。
- 任何个人路径、端口、凭据、账号信息。

## 验证方式

```bash
node core/test.mjs
node core/akasha.mjs check
for d in plugins/*/; do
  [ -f "$d/selftest.test.mjs" ] && (cd "$d" && node selftest.test.mjs)
done
```

CI 会在每次 push / PR 上跑同一组命令（`.github/workflows/ci.yml`）。

## 已知限制

- 会话层 / 睡眠的完整功能需要 DSH 宿主与会话档案；无宿主时只跑夹具。
- 公开 `data/` 是脱敏快照，和作者本机活库不完全一致。
- 发布验证绑定（commit / 版本 / 测试结果 / 已知限制）见 `RELEASE.md`。
