// akasha/tools/harvest-20261010z59-screenshot-regression.mjs
// 2026-10-10：截图插件被 pnpm 回收导致启动崩溃（回归）的定案 + 修复口径 + 规则。幂等。
import { loadStore, currentRecords, appendRecord } from '../lib.mjs';

const canon = currentRecords(loadStore('canon').records);
if (canon.some((r) => r.id.startsWith('canon-screenshot-regression'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('canon', {
  id: 'canon-screenshot-regression-20261010',
  claim:
    '**截图插件启动崩溃回归（2026-10-10）：根因是我自己的 pnpm 操作 × 一个坏 tgz**。' +
    '**链条**：profile 的依赖 `@haven/session-screenshot → file:<LOCAL_PATH>`，而**那个 tgz 本身是坏的**——`lib/client.js` 是 405KB 的 ESM 构建（含 `import`、无 `__ModuleLoader__`），且 `lib/index.js` 是"纯客户端空壳"（没有截图路由）。历史上 node_modules 里那份可用版本是**手工改出来的**（8.4KB classic client + capture-host 路由），从未写回 tgz。' +
    '**触发**：本会话两次 `pnpm install`（换 akasha-session 0.3.0、装 mcp-rea）→ pnpm 从该坏 tgz **重新展开**插件 → node_modules 被覆盖 → 重启报 `Cannot use import statement outside a module`；连带**我的截图 v2.1 宿主文件（capture-host/daemon/overlay）全被冲掉**。' +
    '**修复（根因级）**：① 把 v2.1 回流到真源 `haven-plugins\\session-screenshot\\src\\`（capture-host.js v2 / capture-daemon.js / capture-overlay.ps1），`scripts/build.mjs` 补上新文件的复制步骤；② 正规构建（esbuild，client 经 `__ModuleLoader__` classic 壳包裹，`vm.Script` 解析通过）；③ 打包 `haven-session-screenshot-0.2.1.tgz`（14.1 KB，含全部宿主+客户端文件）；④ `plugin_manager install_bundle` 装入，profile 依赖改指新 tgz；⑤ 逐文件哈希比对：installed vs dev **6/6 一致**，version 0.2.1，宿主路由在位。' +
    '**规则（新增，防复发）**：① **永不手改 node_modules**——改动必须回流真源并重新打包（包管理器随时会回收手改）；② **profile 依赖指向的 tgz 必须是"可构建、自洽"的产物**（含 `lib` 全部文件与 classic client），历史坏包 `_probe/pkg/haven-session-screenshot-0.1.0.tgz` 保留在盘但**不再被引用**；③ 任何 profile 级 `pnpm install` 之后，**必须抽查关键插件文件**（截图、akasha-session 之类手改过的），确认没被回收。' +
    '**旁证**：GPT 的抢救（把 client 转成 classic）**只修了崩溃、没修功能**——它留下的包缺宿主截图路由，所以按钮不出现；本次修复同时恢复崩溃前与功能面。',
  source: { type: '复现', ref: '本机实测 2026-10-10（pnpm 重展开现场、haven-plugins 真源重建、npm pack 内容清单、install_bundle 返回 restart-required、installed↔dev 逐文件 sha256 比对）' },
  event_time: '2026-10-10',
  last_reviewed: '2026-10-10',
  tags: ['截图插件', '回归', 'pnpm', '打包纪律', '教训', 'node_modules'],
});
console.log('已入 canon：' + rec.id);
