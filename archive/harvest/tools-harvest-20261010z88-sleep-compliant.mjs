// akasha/tools/harvest-20261010z88-sleep-compliant.mjs
// 2026-10-10：sleep 合规修复（去动态加载 → 本地构造）并复检通过。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const rec = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-dsh-store-remediation'));
if (!rec) { console.log('未找到条目'); process.exit(0); }
const marker = '**sleep 合规修复（2026-10-10，用户问「这俩有办法合规吗」）**';
if (rec.claim.includes(marker)) { console.log('已记录，跳过：' + rec.id); process.exit(0); }
const add = ' ' + marker + '：**有——而且是删掉动态加载本身，不是绕过检测**。查宿主真身后发现 `@deepseek-ai/dsh-llm` 的 `createUserMessage(input)` ＝ `createMessage({...input, role: "user"})`，而 `createMessage` ＝ `deepFreeze(structuredClone({...input, id: brandString(randomUUID())}))` ⇒ **十行即可本地内联**。改法：`plugins/akasha-sleep/lib/index.js` 删除 `appModulesDir` 配置项与整段 `import(pathToFileURL(...))`，改为本地 `newMessageId()/deepFreeze()/createUserMessage()`；配置新增 `wakeNote`（默认 true，显式 false 才跳过并留 `wake-note-llm-skip` 线）；版本升 **1.5.2**；selftest 断言同步更新（默认不再出现跳过留痕）。' +
  ' **验证**：仓内 + **活树**两处同步（顺带发现活树那份本来就引用了未导入的 `pathToFileURL`、动态加载段从未真正跑通——已一并修正）；仓/活树 selftest 均全绿；`import(`/`eval`/`new Function` 命中数 **0**；**三版 E3 复测**（0.2.0-rc.2 / 0.2.1-alpha.1 / 0.2.1-alpha.2）全过；OSS `b7849ef`。' +
  ' **复检结论**：重开 #1367 后其自动预检 **passed**——报告明确写「安全启发式扫描：通过；已扫 3/3；扫描面完整」，固定源 `b7849ef8…`、识别为 `@akasha-book/sleep@1.5.2`、入口 `akasha-sleep`、生命周期脚本「无」。⇒ **上架在途者由三件变四件**（gate / hooks / session / sleep）。' +
  ' **mcp 的合规路（未做，待排期）**：其 patch 必须为官方 MCP 客户端加配置行（触发 `SUBMISSION_PATCH_PROTECTED`），而官方 `dsh-mcp-client` **未导出注册服务**（导出面只有 `Config/apply/createMcpToolDefinition/inject/name`）⇒ 合规形态＝**自研静态注册**：patch 只引用自有包名，包内自己 spawn `core/mcp.mjs`、走 MCP stdio 协议、用 `ctx.tools.register(...)` 注册（工具名保持 `mcp__akasha__*`），定义形状可参照官方 `createMcpToolDefinition` 自写（不抄其代码）。成本约一个文件 + 三版 E3 复测。';
const next = revise('canon', rec.id, { claim: rec.claim + add, last_reviewed: '2026-10-10' });
console.log('已记录：' + rec.id + ' → ' + next.id);
