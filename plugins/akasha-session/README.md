# @akasha-book/session

阿卡夏之书会话层插件 v0.2.3 —— **自动增量索引 + 压缩事件行 + 节奏条 + 循环观测 P0（dry 干跑）**（核心逻辑归 `<AKASHA_DIR>/session.mjs` 与 `akasha\loop-detect.mjs`；手动用法 `node akasha.mjs session …` 与 `node akasha.mjs session loopwatch`）。

- **触发**：`session/event → turn/end`（按会话去抖 `minIndexIntervalMs`，默认 30s）→ `indexSession` 增量（水位 + 指纹双幂等）；`agent/status → idle` 追平；`ctx.interval` 兜底（`timerCheckMs`，默认 4 分钟——timer 属混入服务，必须 `inject:['timer']`，否则 apply 整段失败且零日志）。
- **压缩事件行**：`session/event → compaction/end`（**成功**压缩，`data.error` 空才记；2026-10-07 复查：旧写法 `agent/created source==='compact'` 是错的——该事件的 source 只有 startup/resume）→ `session-compact` 线 + 节奏条点名（「被折叠历史的细节优先查会话层」）。
- **循环观测 P0（2026-10-07 起，受控解冻第十六次）**：**dry 干跑——只观测、只写观测线；绝不 steer / cancel / 注入**。流环：**现役格式＝`agent/assistant-stream` 帧**（`{type:'start'|'chunk'|'end', attemptId, revision, index, chunk}`——真值对 `dsh-agent-loop` 的 `AssistantStreamAttempt` 与 `dsh-headless` 消费口径三方核实；**chunk 帧不带 turn/step，由 start 帧缓存补全**；`assistant/chunk` 为 **V0 遗物**，仅兼容保留），按 `${sid}:{attemptId}:{index}:{stream}` 累积 delta（`reasoning-delta`/`text-delta`），每 `watchCheckEvery`（480）字符对尾 8K 跑 `loop-detect.detectLoops`；turn 环：`agent/turn-stopping` + `turn/end` 兜底，取数＝**事件流缓存的最新 assistant/message**（2026-10-07 复查：官方 Session 无 `.events` 属性、同步读者已被弃用——插件不得伸手进日志）。命中 → `loop-watch{phase:'stream'|'turn', hit:{type:exact|variant|punct, excerpt≤60}}`；每会话前 8 个新帧/chunk 类型记 `loop-watch-probe`（防真值漂移；**满 8 即停为设计上限**）。汇总：`node akasha.mjs session loopwatch`。
- **节奏条**：`systemPrompt.context`（`akasha:session`，order 134）——段数 / 会话数 + 回看提示；无数据静默（`null`，不说话）。
- **降级**：核心库不可用 / 日志不可写 / 档案缺失 / 空会话 id（静默跳过）→ 只留痕（`session-index-error`），不炸、不失活（sleep v1.5 同款范式）。背压：**统一失败窗口 5 分钟**（未命中 / 链接 / 执行失败均静默退避；链接类错误附加「疑似宿主模块代缓存」提示——重启桌面端恢复）；stat 快照只在**成功**索引后记账（失败可重试）。
- **性能边界（诚实注记）**：正常触发为全量重读（重解压 + 重解析 + 扫 `sessionsRoot`），基线约 0.32s / 4.7MB；两道减负：档案 size+mtime 未变 → stat 快路跳过；>16MB → 节流 ×4。30s 去抖 + 空闲 / 定时触发下当前规模可接受，再大（>40MB 常态）需改成增量帧读取。循环观测的流式检测为节流检查（每 480 字符一次 8K 尾窗），实测开销可忽略。
- 观测线：`session-armed` / `session-index`（added / skipped / parseFails / ms / lagMs）/ `session-index-skip` / `session-index-error` / `session-index-slow`（>1.5s 告警，含事件循环延迟）/ `session-compact` / `loop-watch` / `loop-watch-probe`，全部写 `akasha\logs\hooks.jsonl`。
- 自测：`node selftest.mjs`（桩 ctx 端到端；临时目录，不碰真库；当前 **18/18**）。节流以**单调 seen 计数**（缓冲 20K 截尾不影响——复核 F1 修复：饱和后尾段仍继续检查）。

## 打包 / 安装

```powershell
cd <LOCAL_PATH>
npm pack
# 然后：plugin_manager install_bundle <tgz 绝对路径>（本 profile 为启动型：装载/替换以重启生效，以安装返回为准）
```

## v0.3.0（2026-10-10）—— 索引 worker 化（会话层计划里的 v0.4 队列项）

- **架构**：宿主回调只投递（`postMessage`，µs 级返回）；常驻 worker 线程 `lib/index-worker.mjs`（apply 即预热）串行执行索引、同会话排队去重；重活不再占用宿主事件循环。
- **观测语义**：`session-index` 新增 `via`（worker/inline）与 `hostMs`（宿主投递耗时）；**`session-index-slow` 此后表示「后台耗时 >1.5s」——宿主卡顿请看 `hostMs` / `lagMs`**。
- **降级链**：`indexMode: 'worker' | 'inline'`（默认 worker）；worker **连续** 3 次失败（任何成功即回零）自动降级 inline，落 `session-worker degraded-inline` 线。
- **跨进程锁**：`indexSession` 以 `session-meta.json.lock` 串行化「读水位 → 追加 → 记账」（复用 `lib.withFileLock`；陈锁 30s 夺取、等待上限 5s）——worker 与 CLI `session index` 互斥。
- **退出协议**：dispose → `{type:'quit'}` → drain → 关闭；5s 未退强杀。
- **实测**：热路径 `hostMs=0`；2.1MB 档案 inline 宿主阻塞 161ms → 投递 0.06ms；真实 17.53MB 档案 1267ms → 0.37ms；部署后首个真活 `via=worker ms=840 hostMs=0 lagMs=10`。
- **测试**：`node selftest.mjs` **22/22**（含 2 条 worker 用例）；OSS 版同套 22/22。
- 回滚：备份 `_rollback-20261010-session-v04\`；或 `indexMode: 'inline'` 即回旧路径。

## 源与许可（Source & License）

- 源仓库：https://github.com/Ersith/akasha-book
- 本版本固定提交（pinned commit）：`5a55099586cfae4e7511ba433eaf202455d81c30`
- 许可证：MIT
