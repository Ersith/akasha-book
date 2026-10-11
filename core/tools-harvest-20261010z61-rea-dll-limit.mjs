// akasha/tools/harvest-20261010z61-rea-dll-limit.mjs
// 2026-10-10：把「REA 的 Windows DLL 限制 + 绕过」补进 mcp-rea 条目尾部。幂等。
import { loadStore, currentRecords, revise } from '../lib.mjs';

const rec = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-mcp-rea-shim'));
if (!rec) { console.log('未找到条目'); process.exit(0); }
if (rec.claim.includes('Windows DLL 限制')) { console.log('已含，跳过：' + rec.id); process.exit(0); }
const add = ' **Windows DLL 限制（2026-10-10 深挖时发现）**：`rea analyze <dll>` 报 `provider_unavailable`，拒绝项 `{provider_id: "ghidra", code: "target_role_unsupported", reason: "Windows Ghidra P0 accepts PE applications, not DLL or non-executable images."}`（`executable_role: shared-library`）⇒ REA 在本机只能拆 PE 应用，不能拆 DLL；**绕过 = 直接 Ghidra headless**（`support/analyzeHeadless.bat` + 自写 `DumpSummary.java`/`DumpImports.java`），见 canon-qq-dll-deepdive-20261010。';
const next = revise('canon', rec.id, { claim: rec.claim + add, last_reviewed: '2026-10-10' });
console.log('已修订：' + rec.id + ' → ' + next.id);
