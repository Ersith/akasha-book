// akasha/tools/harvest-20261010z60-qq-dll-deepdive.mjs
// 2026-10-10：QQ 截图 DLL 深挖（三条链证据）+ REA 的 DLL 限制与绕过。幂等。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';

const canon = currentRecords(loadStore('canon').records);
if (canon.some((r) => r.id.startsWith('canon-qq-dll-deepdive'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('canon', {
  id: 'canon-qq-dll-deepdive-20261010',
  claim:
    '**QQ 截图引擎 DLL 深挖（2026-10-10，Ghidra 12.1.4；三条链均有导入表级证据）**。' +
    '**工具限制（重要）**：REA 的 Windows Ghidra 通道**不接受 DLL**——`rea analyze <dll>` 报 `target_role_unsupported`：\"Windows Ghidra P0 accepts PE applications, not DLL or non-executable images.\"（`executable_role: shared-library`）；**绕过**=直接用本地 Ghidra headless（`support/analyzeHeadless.bat`）+ 两个自写脚本（`DumpSummary.java` 函数/字符串/反编译 · `DumpImports.java` 导入符号），单 DLL 23-102s。' +
    '**① 抓屏链=纯 GDI BitBlt（非 DXGI）**：`BitBlt` 出现在 xImage/xGraphic32/GF 三 DLL 导入表，配套 `GetDC→CreateCompatibleDC→CreateDIBSection→StretchBlt`；**DXGI/D3D11 零命中** ⇒ 与我们的截图 v2 同源（我们也是 GDI BitBlt，实测 110-153ms @7680×1440）。' +
    '**② Overlay 链=分层窗口直推位图+全局钩子**：GF.dll 导入 `CreateWindowExW`+**`UpdateLayeredWindow`**+`SetWindowPos`+`SetCapture/ReleaseCapture`，输入面 `SetWindowsHookExW`+`GetAsyncKeyState`，并用剪贴板（`OpenClipboard/GetClipboardData/RegisterClipboardFormatW`）交接截图结果；依赖 d2d1/dwmapi/DWrite ⇒ \"点一下立刻可截\"=**预合成位图一次上屏**，不逐帧重绘。' +
    '**③ IPC 链=命名管道**：Common.dll 导入 `CreateNamedPipeW/CreatePipe/WaitNamedPipeW/DisconnectNamedPipe/SetNamedPipeHandleState`+句柄/令牌复制（与 child-ipc-core/trpc_client 互相印证）——QQ 需要管道因其截图器是**独立进程**；**我们不需要**（截图守护=宿主内常驻 worker 线程，少一跳跨进程，属我们的设计优势）。' +
    '**规模画像**：xImage 765 / xGraphic32 622 / arkGraphic 2901（`arkCanvas*` 2D 原语）/ Common 14409（CSafeHook/DialogHook 钩子基建）/ GF 21744（CreateCustomPaintDraw/ScreenPoint2ClientPoint/CreateImagePlayer）。' +
    '**差异清单处置**：抓帧一致不改；Overlay 的 UpdateLayeredWindow 属可选升级路径（现效果已验证）；进程模型/输入的差异是场景不同，不改。**限制**：导入表+抽样反编译级，未做跨 DLL 调用图贯通；只读静态分析，未注入运行。' +
    '详见 `research\\\\qq-screenshot-dll-deepdive-20261010.md`，原始日志 `_scratch\\\\ghidra-dll\\\\*.log`。',
  source: { type: '复现', ref: '本机实测 2026-10-10（Ghidra 12.1.4 headless + DumpSummary/DumpImports；产物 _scratch\\ghidra-dll）' },
  event_time: '2026-10-10',
  last_reviewed: '2026-10-10',
  tags: ['QQ逆向', 'Ghidra', 'DLL', '截图器', 'BitBlt', 'UpdateLayeredWindow', '命名管道', 'REA限制'],
});
console.log('已入 canon：' + rec.id);
