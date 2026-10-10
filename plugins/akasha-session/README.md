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

- **索引 worker 化（2026-10-10 · 计划队列 v0.4 项）**：宿主回调只投递（`postMessage`，µs 级返回），索引在**常驻 worker 线程**（`lib/index-worker.mjs`，插件加载即预热）串行执行、同会话排队去重；`indexSession` 以 `metaFile` 为锁对象串行化整段「读水位 → 追加 → 记账」（`core/lib.mjs` 的 `withFileLock`；**锁 meta 而非 store**——`appendSegments` 内部已持 store 锁，嵌套会死等）。退出协议：dispose → `{"type":"quit"}` → drain → 关闭（5s 兜底强杀）。降级链：`indexMode: 'worker' | 'inline'`（默认 worker；**连续** 3 次失败自动降级，任何成功回零）。
- **观测语义（worker 化后）**：`session-index` 新增 `via`（worker/inline）与 `hostMs`（宿主投递耗时）；**`session-index-slow` 的含义变为「后台耗时 >1.5s」**——宿主卡顿请看 `hostMs` / `lagMs`。

<!-- store-status -->
## 兼容与状态（DSH STORE 口径 · 2026-10-10）

**固定源（immutable source）**：本版本的源码冻结于 Commit `d311ad54d1dc2cd2697c7b9eeac57eaa6466fc04`（对应 `plugins/akasha-session/package.json` 的 version）。
兼容声明见 manifest 的 `dsh.compatibility.dshReleases`：**0.2.0-rc.2 = compatible**（本机实测运行），
`0.2.1-alpha.1` / `0.2.1-alpha.2` 尚未实测 ⇒ 按契约如实写 `unknown`（不猜、不吹）。

| 证据层 | 状态 | 依据 |
|---|---|---|
| 静态契约（manifest / Bundle Patch / 许可证 / 入口 ID） | **verified** | 官方 `build-dsh-plugin` 审计：静态分见本包审计输出；入口 ID 为插件自有，不 disable/replace 任何 `@deepseek-ai/*` |
| 单元与边界测试（`npm test`） | **verified** | `node selftest.test.mjs` 全绿；覆盖 malformed 输入、并发/节流、replay 一致性（见该文件断言） |
| 一次性 Profile 安装·启动·卸载（E3） | **verified** | 2026-10-10 一次性 DSH_HOME 实跑：install → cold start（HTTP 就绪）→ stop → uninstall → `--dump-config` 逐字回到基线；dsh 0.2.0-rc.2；证据见同目录 `EVIDENCE.json` |
| 真实 Profile 运行 | **verified（本机）** | 桌面端 0.2.0-rc.2 实跑；**他人机器 unverified**（未做外部验收） |
| 独立安全审计 / 公开分发（E5） | **unverified** | 未做独立审计；分发前应重评 |

**下一道门（next gate）**：① 在 0.2.1-alpha.x 上按同一套用例复测（一次性 DSH_HOME），把 `unknown` 改为精确结论（`compatible` 或 `incompatible`）；
② 提交 DSH STORE 上架申请（monorepo 子路径：`tree/main/plugins/<name>`）并跟进机器人预检。
若任一版本复测失败，该版本标注为 `blocked`（不兼容）并保持其余版本声明不动。

**权限 / 非目标 / 边界（permissions · non-goals · boundaries）**
- 读取：会话档案目录（默认 `~/.dsh/sessions`，可配置）；写入：只向 `data/session.jsonl` / `session-meta.json`（本插件自有索引）追加段记录；
  索引在 **worker 线程**内跑（`lib/index-worker.mjs`），带单飞与最小间隔节流；**不修改会话档案原文**。
- **统一非目标（non-goals）**：不修改 DSH 核心与官方包；不替换、禁用或遮蔽任何官方组件；不写真实 Profile（测试一律用系统临时目录）；
  不在日志/输出里暴露凭据、完整用户文件或注入上下文。
- **测试隔离**：所有自测只使用 `os.tmpdir()` 下的临时目录；不读写真实库（`~/.akasha`）与真实会话档案。
