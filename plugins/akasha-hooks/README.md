# @akasha-book/hooks

阿卡夏之书钩子 **v1.2** —— 把宿主的事件流落成 append-only 记录，为「结果计数器 / 失败回查 / 空闲脉冲 / 输出审计」供料。

- **v1.2（2026-10-07 复查修复）**：输出审计按 `attemptId` **连续累积**——官方 revision 逐帧递增（`nextRevision()` 每 emit 一次），修复前按 revision 重置 ⇒ 每 chunk 清空、审计恒空（output-audit/usage **0 条**实证）；id 跨帧切分现已可还原。自检夹具同步改为宿主真值（逐帧递增 revision + 跨帧切分）。

- 记录文件：`<AKASHA_DIR>/logs\hooks.jsonl`（JSONL，一行一事件）
- 监听（全部为 contained 的 emit 事件，失败不打断宿主）：
  - `session/event` → `turn/end`：回合结束（`kind:"turn-end"`）
  - `tools/result` → 每次工具结果（`kind:"tool"`，含 `ok` 与失败 `message`；`logToolResults:false` 可只记失败）
  - `agent/error` → step / turn 出错（`kind:"agent-error"`）
  - `agent/status` → running→idle（`kind:"idle"`，去抖 + 计数器快照）
  - `agent/assistant-stream`（**v1.1 新增**）→ 输出审计：按 attemptId+revision 累积 assistant 文本流，committed 结束时跑核心库 `auditText`——
    - 引用**不存在**的库 id → `kind:"output-audit"` 线（编造引用嫌疑；emit 语义只能审计、不能拦截）；
    - 引用**真实存在**的库 id → `kind:"usage"` 线（条目级使用计数 v0，供 `akasha.mjs metrics` 汇总）。
  - ⚠️ `auditOutput:false` 可关闭输出审计（默认开）。
- 激活即写一行 `kind:"activated"`——可用它验证插件已加载。
- 纪律：只追加、不改行；本插件不注入上下文、不拦截任何调用（v1.1 仍为「记录层」）。
- 自测：`node selftest.mjs`（桩 ctx + 临时假库：usage / output-audit 线、abandoned 不落线、revision 重置、无核心降级；不碰真库）。

## 打包 / 安装

```powershell
cd <LOCAL_PATH>
npm pack
# 然后：plugin_manager install_bundle <tgz 绝对路径>（首次安装会 HMR 热生效；替换需重启）
```


## 源与许可（Source & License）

- 源仓库：https://github.com/Ersith/akasha-book
- 本版本固定提交（pinned commit）：`5a55099586cfae4e7511ba433eaf202455d81c30`
- 许可证：MIT
