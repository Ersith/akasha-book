# @akasha-book/hooks

> 阿卡夏之书（Akasha Book）· 事件钩子插件

阿卡夏之书钩子 v1.2 —— 把宿主的事件流落成 append-only 记录，为「结果计数器 / 失败回查 / 空闲脉冲 / 输出审计」供料。

- **v1.2（2026-10-07 复查修复）**：输出审计按 `attemptId` **连续累积**——宿主 revision 逐帧递增，修复前按 revision 重置会导致审计恒空；id 跨帧切分现已可还原。

- 记录文件：`logs/hooks.jsonl`（默认 `~/.akasha/logs/hooks.jsonl`；JSONL，一行一事件）。
- 监听（全部为 contained 的 emit 事件，失败不打断宿主）：
  - `session/event` → `turn/end`：回合结束（`kind:"turn-end"`）；
  - `tools/result` → 每次工具结果（`kind:"tool"`，含 `ok` 与失败 `message`；shell 工具若是 akasha CLI 查库子命令，追加 `akashaCli:"lookup"` 等子命令名——只记名、不记命令原文，供核心 `metrics` 的召回信号计数，wave1 · B2）；
  - `agent/error` → step / turn 出错（`kind:"agent-error"`）；
  - `agent/status` → running→idle（`kind:"idle"`，去抖 + 计数器快照）；
  - `agent/assistant-stream` → **输出审计**：按 attemptId 连续累积 assistant 文本流（宿主 revision 逐帧递增——不可按 revision 重置），committed 结束时跑核心库 `auditText`——
    - 引用**不存在**的库 id → `output-audit` 线（编造引用嫌疑；emit 语义只能审计、不能拦截）；
    - 引用**真实**库 id → `usage` 线（条目级使用计数 v0，供 `akasha.mjs metrics` 汇总）。
- 配置：`akashaDir` / `log` / `idleDebounceMs` / `logToolResults` / `auditOutput`。
- 激活即写一行 `kind:"activated"`——可用它验证插件已加载。
- 自测：`node selftest.mjs`（桩 ctx + 系统临时假库；不碰真实数据）。

## 打包 / 安装（DSH 宿主）

```bash
npm pack
# 然后：plugin_manager install_bundle <tgz 绝对路径>（新 bundle 热生效；替换已装包需重启宿主）
```

依赖：DSH 宿主事件面（`agent/assistant-stream` / `tools/result` 等）；核心库 `../../core/lib.mjs`（输出审计用）。
