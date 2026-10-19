# CompanionPort（配套端口）v1 — 只读契约

> 2026-10-19 立。设计稿：`docs/akasha/companion-successors-20261019.md`。
> 目的：阿卡夏核只依赖端口，不依赖 Hindsight / OpenViking 品牌；未来换自建 Ledger / Persona 时，六库 / MCP / CLI 不动。

## 1. 边界（v1）

- **只读**：`identity / capabilities / skipTags / health` 为静态能力；`recall / read` 在 adapter 未接前返回 `degraded`，**不抛死会话、不假装有数据**。
- **不写**：写入 / 远端同步 / 向量检索全部不在 v1（等上游异步抽取口径定死再开）。
- **不并库**：配套数据不进 `akasha/data/*.jsonl`，阿卡夏也不写配套存储。
- **零依赖**：仅 Node stdlib；不联网。

## 2. 配置

`AKASHA_COMPANIONS` 指向 JSON，或 `AKASHA_DIR/companions.json`：

```json
{
  "companions": {
    "repo":    { "driver": "hindsight" },
    "persona": { "driver": "openviking" }
  }
}
```

`driver: "none"` 或缺失 ⇒ `mode: "absent"`。当前 v1 虽能读配置，但 adapter 未接，配置了 driver 也只会得到 `mode: "degraded"`。

## 3. 接口

| 方法 | 返回 |
|---|---|
| `identity()` | `{ kind: 'repo'\|'persona', driver, mode: 'live'\|'degraded'\|'absent', version: 'v1' }` |
| `capabilities()` | `{ read, write, recall, inject, reason }`（v1 全 false） |
| `skipTags()` | 注入标签数组（默认含 `<hindsight_knowledge` / `<openviking-context` / `<ledger_knowledge` / `<persona_context`） |
| `health()` | `{ ok, mode, detail }` |
| `recall()` | `{ hits: [], via: 'degraded', degraded: true, reason }` |
| `read()` | `{ record: null, depth: 'pointer', degraded: true, reason }` |

`skipTagsFor(ports)` 返回默认标签 ∪ 各端口标签——**默认标签始终在**，避免切主期漏跳异层注入块。阿卡夏会话索引的 `SCAFFOLD_RE` 已改成从这里取标签（不再写死品牌）。

## 3.1 Adapter 注入（宿主提供，核心零依赖）

`resolvePorts({ file, hooks })`：`hooks[driver] = { search(query, opts), read(id, opts), health() }`。
- 注入 `search` ⇒ `mode: live`、`capabilities.recall=true`，`recall()` 直接透传 adapter 结果（不在此层改写/合并）。
- 注入 `read` ⇒ `capabilities.read=true`。
- 注入 `health` ⇒ `health()` 透传；异常记为 `{ok:false, mode:'degraded'}`。
- 未注入 ⇒ 保持 `degraded`（v1 默认）。**核心不 import 任何外部 SDK**；宿主（DSH 插件）负责把 MCP 工具包成 hooks。

宿主侧薄适配在 `adapters.mjs`：`hindsightHooks(callTool)` / `openvikingHooks(callTool)` 把 MCP 工具包成 `{search, read, health}`，只做形状映射、不重试不缓存。核心仍零依赖。

## 4. 切主条件（写死）

1. 连续观察期内端口主路径失败率 ≤ 现配套；
2. 注入 token 均值不升高；
3. 阿卡夏回归全绿（`test.mjs` / `check` / `family-sweep`）；
4. 旧标签继续 skip 一期，切主后至少一个版本再移除。

## 5. 后续（不在 v1）

- `adapters/hindsight.mjs` / `openviking.mjs`：只读 recall/read 的薄封装；
- `health` 接 `doctor` / `kit`（当前 doctor 有独立检查项）；
- 写入语义：等「已接收 / 已持久 / 已可检索」三态与 `expected_revision` 定义完成后再开。
