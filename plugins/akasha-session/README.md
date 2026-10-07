# @akasha-book/session（小阿卡夏）

阿卡夏之书**会话层**插件 —— **自动增量索引 + 压缩事件行 + 节奏条 + 循环观测 P0（dry 干跑）**。
核心逻辑归 `core/session.mjs` 与 `core/loop-detect.mjs`（本插件只做调度与注入；降级只留痕，不炸宿主）。

- **触发**：`session/event → turn/end`（按会话去抖 `minIndexIntervalMs`，默认 30s）→ 增量索引（水位 + 指纹双幂等）；`agent/status → idle` 追平；`ctx.interval` 兜底。
- **压缩事件行**：`session/event → compaction/end`（成功压缩）→ 观测线 + 节奏条点名（被折叠历史的细节优先查会话层）。
- **循环观测 P0**：**dry 干跑——只观测、只写观测线；绝不干预**。流环＝`agent/assistant-stream` 帧按 attemptId 累积（每 480 字符对尾 8K 跑 `detectLoops`）；turn 环＝事件流缓存全文兜底；命中与帧类型探针写 `logs/hooks.jsonl`。汇总 CLI：`node akasha.mjs session loopwatch`。
- **节奏条**：`systemPrompt.context`（`akasha:session`，order 134）——段数 / 会话数 + 回看提示；无数据静默。
- 配置：`akashaDir`（核心库位置）/ `sessionsRoot`（宿主会话档案目录）/ `storeFile` / `metaFile` / `log`；默认见 `lib/index.js` 的 DEFAULTS。
- 自测：`node selftest.mjs`（桩 ctx 端到端；临时目录，不碰真实数据；需与本包 `core/` 并列）。
