// akasha/tools/harvest-20261010z57-ghidra-provider.mjs
// 2026-10-10：Ghidra 提供方落地（REA 原生分析解锁）+ 工具面扩到 20 + QQScreenshot.exe 首次真拆。幂等。
import { loadStore, currentRecords, appendRecord, revise } from './lib.mjs';

const canon = currentRecords(loadStore('canon').records);
const has = (pfx) => canon.some((r) => r.id.startsWith(pfx));

if (!has('canon-rea-ghidra-provider')) {
  const rec = appendRecord('canon', {
    id: 'canon-rea-ghidra-provider-20261010',
    claim:
      '**REA 原生分析解锁：Ghidra 12.1.4 提供方落地（2026-10-10）**。' +
      '**REA 的确切要求**（读源码 `dist/ghidra/GhidraInstallationPolicy.js`）：`SUPPORTED_GHIDRA_VERSION="12.1.4"`（同线小版本兼容）、`SUPPORTED_GHIDRA_JAVA_MAJOR=21`、`GHIDRA_INSTALL_DIR` 必须绝对路径。' +
      '**安装**：GitHub 官方发行 `ghidra_12.1.4_PUBLIC_20260921.zip`（543.3 MB，sha256 `ddac49f9…` 校验一致；经本机代理 127.0.0.1:7897 断点续传下载——直连被墙重置）→ 解压 `<LOCAL_PATH>\\_tools\\ghidra\\ghidra_12.1.4_PUBLIC`；JDK 21 复用本机已有 `D:\\ServerPackCreator\\jre`（含 javac，被 REA 判为 "accepted a 64-bit full JDK 21 or newer"）。' +
      '**验证**：`rea doctor` 全绿——ghidra / ghidra-platform / ghidra-architecture / ghidra-installation / ghidra-version(12.1.4) / ghidra-headless / ghidra-native_decompiler / ghidra-java / **ghidra-native_authority**（Windows Job Object + 私有 DACL + reparse-safe，本机 NTFS 通过）；provider `ghidra` configured=true **available=true**。' +
      '**环境注入设计**：宿主进程重启前已启动，用户级环境变量对它无效——所以把 `GHIDRA_INSTALL_DIR`/`JAVA_HOME` **写进薄壳 spawn 子进程的 env**（`dsh-mcp-rea/server.mjs` 的 PROVIDER_ENV），立即生效且不污染全局 JAVA_HOME；CLI 直用则临时导出同名变量。' +
      '**不可用（如实）**：Hopper（macOS 专有，REA 只有 Mac/Linux 适配）、IDA（商业授权 + 需上游 IDA MCP 注册 `REA_IDA_MCP_CONFIG`）——Windows 上这两条路本就关着。',
    source: { type: '复现', ref: '本机实测 2026-10-10（rea doctor 全绿；QQScreenshot.exe 首次原生分析成功）' },
    event_time: '2026-10-10',
    last_reviewed: '2026-10-10',
    tags: ['REA', 'Ghidra', '原生分析', '提供方', '环境'],
  });
  console.log('已入 canon：' + rec.id);
} else console.log('跳过：ghidra 条目已存在');

if (!has('canon-qqscreenshot-first-decompile')) {
  const rec = appendRecord('canon', {
    id: 'canon-qqscreenshot-first-decompile-20261010',
    claim:
      '**QQ 截图器首次真拆（2026-10-10，Ghidra 后端）**——澄清早期"只画像未拆解"。' +
      '当年（10-10 上午）REA 无提供方，只有**手工 PE 画像**：文件形态 + 字符串（`ScreenCapture.cpp`、开发机路径 `D:\\devops\\workspace\\ScreenShot\\...QQScreenshot.pdb`）+ 架构推断；当时结论（原生自绘 overlay、不调系统截图工具、IPC 与主进程通信）**是推断不是拆解**。' +
      '**现在（Ghidra 12.1.4）**：`rea analyze` 成功——PE x86_64、`ev_d24d0299…`、299 procedures / 171 strings / 10 段（.text 12800B 等）。**关键发现（修正认知）**：`QQScreenshot.exe` 只有 **40KB，是个壳**——其导入表仅 `Common.dll` / `GF.dll` / KERNEL32 / USER32 / ole32 / COMCTL32 / VCRUNTIME140 + CRT；`BitBlt`/`DXGI`/`CreateWindowEx` 在壳里**零命中** ⇒ 真正的截图与 overlay 实现全在 **`GF.dll`(4.2MB) / `Common.dll`(3.2MB) / `arkGraphic.dll`(757KB) / `xGraphic32/xImage`** 等 DLL 里；壳里可见 `IPCService` 符号（3 处命中）。' +
      '**对我们的意义**：截图 v2 的架构决策（预抓帧 + 自绘 overlay + 不调系统工具）**不受影响**——它是按行为对照做的，且已实测 150ms 级；DLL 级深挖属"想彻底看懂 QQ 内部"的可选后续，不是我们插件的前置条件。',
    source: { type: '复现', ref: '本机实测 2026-10-10（rea analyze/search on QQScreenshot.exe，Ghidra 12.1.4；产物 _scratch\\qq-exe-analyze.md、qq-search-*.json）' },
    event_time: '2026-10-10',
    last_reviewed: '2026-10-10',
    tags: ['QQ逆向', 'Ghidra', '反汇编', '澄清', '截图器'],
  });
  console.log('已入 canon：' + rec.id);
} else console.log('跳过：QQ 首拆条目已存在');

// 工具面 10→20 的口径修订
const rec = canon.find((r) => r.id.startsWith('canon-mcp-rea-shim'));
if (rec && !rec.claim.includes('不 20 个')) {
  if (rec.claim.includes('**20 个工具**')) console.log('跳过：工具面口径已含');
  else {
    const next = revise('canon', rec.id, { claim: rec.claim + ' **工具面扩到 20（2026-10-10 晚）**：在原 10 个之外新增 `rea_capture_web_shot` / `rea_export_web_scripts` / `rea_observe_js_runtime` / `rea_discover_webmcp` / `rea_compare_versions` / `rea_compare_web` / `rea_evidence_export` / `rea_evidence_import` / `rea_import_reference_source` / `rea_capture_electron`（参数按各命令 `--schema` 实录，余下走 `args` 透传）；**21 个工具 / 6.7 KB schema**，selftest 8/8，已装 0.1.2。', last_reviewed: '2026-10-10' });
    console.log('已修订：' + rec.id + ' → ' + next.id);
  }
}
