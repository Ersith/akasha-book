// akasha/tools/harvest-20261010z91-riskscan.mjs —— 风险扫描器 + 同族第二波（幂等）
import { loadStore, currentRecords, revise } from '../lib.mjs';

const rec = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-review-manual-20261010'));
if (!rec) { console.log('未找到主条目，跳过'); process.exit(0); }
const marker = '**第二波（同日，用户追加裁定「完善检查脚本」）**';
if (rec.claim.includes(marker)) { console.log('已记录，跳过'); process.exit(0); }
const add = ' ' + marker + '：用户原话「**你得完善检查脚本了。如果检查不出问题，但自己手检发现了问题，那么就说明现在的检查不完善**」。' +
  '**产物**：`<LOCAL_PATH>`（+ `risk-scan.selftest.mjs`）——把当日手检发现的族类固化为 5 条可机检规则：' +
  '`RISK-ASYNC-ERR`（spawn/Worker/子进程 stdio/标准流缺 error 处理＝异步 EPIPE 族）、`RISK-PROTO-SHAPE`（JSON.parse→解构缺 try 或形状校验）、' +
  '`RISK-SWALLOW`（无代码也无注释的空 catch）、`RISK-LEAK`（spawn 无 kill / Worker 无 terminate / setInterval 无 clear/unref）、`RISK-DYNAMIC`（非字面量 import、eval、new Function）。' +
  '**关键设计（防"自欺工具"）**：自测不是"跑通就行"，而是**用修复前的真实代码做变异回归**——① fixtures 正/负样本；② 逐字嵌入的修复前片段（core/mcp.mjs、rea/server.mjs、capture-daemon.js）；③ `git show 9d166d4^:core/mcp.mjs` 真·历史文件回放；④ **现版本必须 0 命中**（防"改了代码而规则没跟上"）。最终 **13/13**。' +
  '**第二波又抓到 2 个真 bug（同族）**：⑤ `dsh-mcp-rea/server.mjs`：`const { id, method, params } = req` 在 **try 之外**（async handler ⇒ 未处理拒绝 ⇒ 桥死）+ stdout 无 error 处理（EPIPE）+ 非法 JSON **静默丢弃**——全部已修（回 `-32600`/`-32700`），实测：畸形 6 形状 6/6 回错误且存活（`tools/list` 21 工具）、EPIPE exit=0；自测加两条回归 + 环境缺失时 **SKIP**（不再伪装失败）。' +
  '⑥ `haven-plugins/session-screenshot`（**今天刚修过的插件**）：`capture-daemon.js` 缺 `child.on(\'error\')` ⇒ spawn 失败（脚本缺失/无权限）时 **未捕获异常会打死宿主**；且写子进程 stdin 只有 try/catch（异步 EPIPE 抓不到）。已改**源文件** + 重建（源/产物 3/3 一致），实测假 PowerShell 路径 → 返回 `{status:\'error\', message:\'... ENOENT\'}` 并留痕；插件升 **0.2.2** + 打包 `haven-session-screenshot-0.2.2.tgz`（待安装）。' +
  '**校准教训（重要）**：扫描器第一版**误报漏报并存**——漏：`JSON.parse` 裸赋值（无 const）、空 catch 同行写法、跨函数解构；误：`this.#spawn()` 被当成 node spawn、`ctx.subprocess.spawn`（宿主托管）被当成裸 spawn、写 stdout 的多种合法写法（`for (const s of [stdout, stderr]) s.on(\'error\')`）、**字符串正文里的 `import(`**（文案）、**字面量 import 被打码后误判**。逐条人读判定后修规则，最终：**207 文件 / 0 命中**，且自测仍 13/13 ⇒ **放宽规则没有让它变瞎**（这就是"用已知坏代码做变异回归"的价值）。' +
  '**用法**：`node tools/risk-scan.mjs <目录或文件> [...] [--json] [--include-tests]`，退出码 1＝有命中（可接 CI）；测试文件默认跳过。';
const next = revise('canon', rec.id, { claim: rec.claim + add, last_reviewed: '2026-10-10' });
console.log('已记录：' + rec.id + ' → ' + next.id);
