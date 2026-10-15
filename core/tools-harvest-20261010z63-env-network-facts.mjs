// akasha/tools/harvest-20261010z63-env-network-facts.mjs
// 2026-10-10：环境/网络事实入库（代理、下载姿势、双 node、npx 位置）。幂等。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';

const canon = currentRecords(loadStore('canon').records);
if (canon.some((r) => r.id.startsWith('canon-env-network-facts'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('canon', {
  id: 'canon-env-network-facts-20261010',
  claim:
    '**本机环境与网络事实（2026-10-10 实测归档；写下来省得每次重摸）**。' +
    '**① 大文件下载走代理**：GitHub 直连不稳（实测 `curl exit 56 Recv failure: Connection was reset`）；本机有开放代理 **`http://127.0.0.1:7897`**（Clash 类混合端口；`HTTP_PROXY/HTTPS_PROXY` 环境变量为空，需显式指定）。**推荐姿势**：`curl.exe -L --proxy http://127.0.0.1:7897 --retry 3 --retry-all-errors --continue-at - -o <out> <url>`（配合「循环重试直到完整」的外层脚本）——实测下载 Ghidra 543.3MB 成功且 sha256 与官方一致。' +
    '**② 双 node**：系统 node `F:\\h\\all\\Nodejs\\node.exe` = **v24.19.0**（npx/npm 同目录，`npx.cmd` 在 `F:\\h\\all\\Nodejs\\npx.cmd`）；运行时 node `<DSH_INSTALL>` = **v24.21.0**（跑本仓脚本/测试用它）。' +
    '**③ 运行时 pnpm** = `<DSH_INSTALL>`（v11.7.0，必须用 node 调：`& $node $pnpm <args>`）；profile 内做 install 后要跑一次 `--frozen-lockfile` 验证。' +
    '**④ arxiv / 网页抓取直连可用**：web_fetch（内置）与 `curl` 直连 arxiv.org 正常（2026-10-10 抓 abs 页与 PDF 2392KB 均成功）；**只有 GitHub Releases 这类大文件对象需要走代理**。' +
    '**⑤ 本机 Python**：PATH 上是 3.14（无 opencv/scipy wheel）；dsh-blender venv 用 3.12（`official-home\\profiles\\desktop\\node_modules\\dsh-blender\\venv`）。' +
    '**⑥ JAVA**：`C:\\Program Files\\Java\\jdk-17.0.4` 与 **`D:\\ServerPackCreator\\jre`（JDK 21.0.4，含 javac，被 REA/Ghidra 接受）**、系统默认 java 是 1.8（旧）。',
  source: { type: '复现', ref: '本机实测 2026-10-10（Ghidra 543MB 代理断点续传 + sha256 一致；node/pnpm/java 版本探测；arxiv 直连抓取）' },
  event_time: '2026-10-10',
  last_reviewed: '2026-10-10',
  tags: ['环境', '网络', '代理', 'node', 'pnpm', 'java', '速查'],
});
console.log('已入 canon：' + rec.id);
