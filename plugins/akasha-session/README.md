# @akasha-book/session（小阿卡夏）

阿卡夏之书**会话层**插件 —— **自动增量索引 + 压缩事件行 + 节奏条 + 循环观测 P0（dry 干跑）**。
核心逻辑归 `core/session.mjs` 与 `core/loop-detect.mjs`（本插件只做调度与注入；降级只留痕，不炸宿主）。

- **触发**：`session/event → turn/end`（按会话去抖 `minIndexIntervalMs`，默认 30s）→ 增量索引（水位 + 指纹双幂等）；`agent/status → idle` 追平；`ctx.interval` 兜底。
- **压缩事件行**：`session/event → compaction/end`（成功压缩）→ 先强制补索引（绕过去抖/背压）→ 观测线（带 `indexed`/`reason`）+ 节奏条点名。**只有补索引确认成功才说「已收入」**；失败时改说「可能未进会话层」并给回退（原始会话档案 / `session index`），同会话后续索引成功即改口（wave1 · B1）。
- **循环观测 P0**：**dry 干跑——只观测、只写观测线；绝不干预**。流环＝`agent/assistant-stream` 帧按 attemptId 累积（每 480 字符对尾 8K 跑 `detectLoops`）；turn 环＝事件流缓存全文兜底；命中与帧类型探针写 `logs/hooks.jsonl`。汇总 CLI：`node akasha.mjs session loopwatch`。
- **节奏条**：`systemPrompt.context`（`akasha:session`，order 134）——段数 / 会话数 + 回看提示；无数据静默。
- **索引观测线**：`session-index`（added / skipped / parseFails / ms / **lagMs**＝事件循环延迟采样）/ `session-index-skip` / `session-index-error` / **`session-index-slow`**（单次索引 >1.5s 告警，含 lagMs）。
- 配置：`akashaDir`（核心库位置）/ `sessionsRoot`（宿主会话档案目录）/ `storeFile` / `metaFile` / `log`；默认见 `lib/index.js` 的 DEFAULTS。
- 自测：`node selftest.mjs`（桩 ctx 端到端；临时目录，不碰真实数据；需与本包 `core/` 并列）。
