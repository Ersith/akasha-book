# 依赖标注

## 运行时

- **Node.js ≥ 18**（实测 v24.x）。核心库**零 npm 依赖**（仅 Node stdlib：fs / path / os / readline 等）。

## 平台

- 核心库与 CLI：无平台依赖（Windows / macOS / Linux 均可运行）。
- `plugins/*`：**DeepSeek Harness（DSH）** 宿主插件（实测宿主 0.2.0-rc.2）。插件依赖宿主服务与事件面，矩阵如下：

| 插件 | 依赖的宿主能力 | 依赖的本包件 |
|---|---|---|
| `@akasha-book/gate` | `tools.guard` / `systemPrompt.section` / `system-prompt` 事件 | `core/lib.mjs` |
| `@akasha-book/hooks` | 事件面：`session/event` / `tools/result` / `agent/error` / `agent/status` / `agent/assistant-stream` | `core/lib.mjs`（输出审计） |
| `@akasha-book/sleep` | `systemPrompt.context` / `timer` 混入服务 / `agent/*` 事件 | `core/sleep.mjs` + `core/lib.mjs` |
| `@akasha-book/mcp` | `@deepseek-ai/dsh-mcp-client`（官方 bundle，随宿主提供） | `core/mcp.mjs` |

- 唤醒条（sleep 插件）额外需要宿主应用模块目录（`appModulesDir` 配置项）；未配置时该功能自动跳过并留痕（`wake-note-llm-skip`），其余功能不受影响。

## 第三方 npm 依赖

- **无**。核心库与四个插件均零第三方运行时依赖；`@deepseek-ai/dsh-mcp-client` 为宿主自带 bundle（非本包依赖）。
