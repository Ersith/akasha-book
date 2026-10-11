// akasha/tools/harvest-20261010z64-mcp-rea-repo.mjs
// 2026-10-10：mcp-rea 单开公开仓 + 发布物去本地化口径；npm 重发 session 0.3.0 的收尾留痕。幂等。
import { loadStore, currentRecords, appendRecord, revise } from '../lib.mjs';

const canon = currentRecords(loadStore('canon').records);

// ① 新条目：公开仓
if (!canon.some((r) => r.id.startsWith('canon-mcp-rea-repo'))) {
  const rec = appendRecord('canon', {
    id: 'canon-mcp-rea-repo-20261010',
    claim:
      '**`dsh-mcp-rea` 单开公开仓（2026-10-10，用户裁定「可以单开一个」）**：`https://github.com/Ersith/dsh-mcp-rea`（public，MIT），首个提交 `74e82f0`，7 文件（server.mjs / selftest.mjs / package.json / cordis.patch.yml / README.md / LICENSE / .gitignore）。' +
      '**发布物去本地化口径（可复用清单）**：① 默认值 env 优先——`REA_ENTRY`（rea.mjs 绝对路径，推荐）/ `REA_CLI`（PATH 回退名）/ `REA_NODE` / `REA_WORKSPACE`（默认 cwd）/ `REA_GHIDRA_DIR` / `REA_JAVA_HOME`，**删掉所有本机绝对路径默认值**；② `cordis.patch.yml` 用 `command: node` + `/path/to/...` 占位并注释；③ LICENSE(MIT) + .gitignore（node_modules/*.tgz/*.log）；④ 发布前隐私扫描**工作树 + 提交历史双扫**（本机路径/用户名/token 前缀/回环端口/`_tools` 等 15 类模式）——本次零命中。' +
      '**验证**：重构后 selftest **8/8**（显式给 REA_ENTRY 模拟新装机器）；21 工具 / 6.7 KB schema；`--token-limit` 透传实测 65563B→216B。' +
      '**与活体安装的差异（须知）**：profile 里已装的 `@local/mcp-rea@0.1.2` 仍是**绝对路径版**（`cordis.patch.yml` 写死本机 node 与 server.mjs 路径）——两者功能等价，但**仓版是通用版**：从仓里重新打包安装前必须先填回绝对路径，否则 bundle 起不来。' +
      '**建仓手法**：token 经 `git credential fill`（helper=manager）取用、不落盘不打印；`POST /user/repos` 的 JSON body 必须**走文件**（`--data-binary @file`）——PowerShell 直接传内联 JSON 会被引号规则弄坏（实测 "Problems parsing JSON" 400）。',
    source: { type: '复现', ref: '本机实测 2026-10-10（github API 建仓、推送 74e82f0、双扫隐私、selftest 8/8）' },
    event_time: '2026-10-10',
    last_reviewed: '2026-10-10',
    tags: ['mcp-rea', '开源', '仓库', '去本地化', '发布纪律'],
  });
  console.log('已入 canon：' + rec.id);
} else { console.log('canon-mcp-rea-repo 已存在'); }

// ② 修订 mcp-rea 薄壳条目：补仓库地址
const shim = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-mcp-rea-shim'));
if (shim && !shim.claim.includes('github.com/Ersith/dsh-mcp-rea')) {
  const n = revise('canon', shim.id, {
    claim: shim.claim + ' **公开仓（2026-10-10）**：`https://github.com/Ersith/dsh-mcp-rea`（public / MIT / commit 74e82f0；通用版走 env 配置，见 canon-mcp-rea-repo-20261010）。',
    last_reviewed: '2026-10-10',
  });
  console.log('已修订薄壳条目：' + shim.id + ' → ' + n.id);
} else { console.log('薄壳条目已含仓库地址或未找到'); }
