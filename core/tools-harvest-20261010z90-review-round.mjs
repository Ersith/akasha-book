// akasha/tools/harvest-20261010z90-review-round.mjs
// 2026-10-10：用户裁定「不要依赖脚本，逐项排查」→ 人读复查的结果与教训。幂等。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';

const canon = currentRecords(loadStore('canon').records);
if (canon.some((r) => r.id.startsWith('canon-review-manual-20261010'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('canon', {
  id: 'canon-review-manual-20261010',
  claim:
    '**「不要依赖脚本，逐项排查」——人读复查轮（2026-10-10，用户两次裁定：先对 mcp 篇、再对阿卡夏整体）**。' +
    '**用户原话**：「不要过于信赖自己搞得检测脚本，逐项排查看看」「阿卡夏整体这次检查的时候最好也不要依赖脚本，说不好也有同样的问题」。' +
    '**为什么对（当场验证）**：我自己写的 grep 式扫描**误报 + 漏报并存**——① 对 akasha-session 的 Worker 接线给出"触发点 3 处 / error 处理 1 处"的**误报**（人读后确认：`message`/`error`/`exit` 三个监听 + spawn try + 失败 3 次降级 inline 全都在）；② 对 `mcp.mjs` 的 stdout EPIPE **完全漏报**（我的模式表里没有 stream error 这一类）。' +
    '**人读复查抓到的真 bug（全部已修 + 已加回归）**：' +
    '① **核心 `mcp.mjs` 形状校验缺失**：`handle(msg)` 直接 `const { id, method, params } = msg` ⇒ 合法 JSON 但形状不对（`null`/数字/字符串/数组）**解构抛 TypeError → 整台 MCP 服务器死**；' +
    '② **核心 `mcp.mjs` stdout 无 error 处理**：客户端先退 ⇒ 写 stdout 的**异步 EPIPE** ⇒ 崩（与 mcp-akasha 桥同族、方向相反）；' +
    '③ **桥侧注册中途失败残留**（半注册 + 日志说谎）；④ **桥侧软失败不杀子进程**（泄漏）；⑤ **桥侧忽略取消信号**。' +
    '**修法与验证**：`mcp.mjs` 加形状校验（回 `-32600`）、`handle` 外层兜底（`-32603`）、非法 JSON 回 `-32700`、三条标准流 error → 安静退出（exit 0）；实测：畸形六形状 **6/6 回错误且服务器存活**（存活探针 `tools/list` 仍 18 工具）、**EPIPE 实测 exit=0 无崩溃栈**；桥侧三修 + 四条回归（回滚/取消/软失败/硬失败）；核心套件 **137/137**（OSS）+ **138/138**（活树）；E3 全矩阵 **15/15**（5 插件 × 3 版）。OSS `9d166d4`（CHECKS R28）。' +
    '**人读覆盖（诚实边界）**：逐行读完 `plugins/mcp-akasha/index.js`(257)/`mcp.mjs`(133)/`akasha-sleep/lib/index.js` 改动区/两份 selftest 的契约与加固段/`lib.mjs` 的锁+parseJsonl+loadStore+appendRecord（约 60 行）/`akasha.mjs` 收尾（562 行末尾）；**未逐行读**：`lib.mjs` 其余 ~2000 行、`session.mjs` 全量、`sleep.mjs` 全量、`session-tree` 相关——只做了定点检索 + 现有测试对照（核心测试已覆盖：坏行容错、损坏帧、幂等、锁）。' +
    '**方法论沉淀**：① 扫描脚本只能**提示**，不能**结论**（误报漏报都出过）；② 高危面优先人读：**子进程/子线程/流/网络**（异步 error 事件）、**资源生命周期**（dispose 路径）、**失败路径**（降级是否留痕、是否回滚）、**协议边界**（畸形输入）；③ 每修一处必须**加回归**（否则下次仍靠人眼）；④ 复盘时**反向验证**：拿"故意注入的漂移/畸形"证明断言真的会红（本轮对 sleep 契约测试做过键集合漂移注入）。',
  source: { type: '复现', ref: '本机实测 2026-10-10（_scratch/verify-mcp-hardening.mjs；_scratch/precheck/*.zip；OSS 9d166d4 + CHECKS R28）' },
  event_time: '2026-10-10',
  last_reviewed: '2026-10-10',
  tags: ['复查', '人读', 'EPIPE', 'MCP', '方法论', '脚本不可靠'],
});
console.log('已入 canon：' + rec.id);
