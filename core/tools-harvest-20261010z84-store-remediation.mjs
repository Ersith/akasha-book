// akasha/tools/harvest-20261010z84-store-remediation.mjs
// 2026-10-10：DSH STORE 整改（五插件 60-64 → 100/100，含 E3 证据）。幂等。
import { loadStore, currentRecords, appendRecord } from '../lib.mjs';

const canon = currentRecords(loadStore('canon').records);
if (canon.some((r) => r.id.startsWith('canon-dsh-store-remediation'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('canon', {
  id: 'canon-dsh-store-remediation-20261010',
  claim:
    '**DSH STORE 整改（2026-10-10；上游触发：`AI-Scarlett/DSH-Store` 的固定 Commit 机器人判 `candidate-rejected`）**。' +
    '**上游事实**：STORE 的 registry 契约（`registry/README.md`）要求——`dsh.bundle.patch` + **逐版本** `dsh.compatibility.dshReleases`（官方 npm `@deepseek-ai/dsh` 滚动窗口＝**latest 前三个未弃用版本**，本轮为 `0.2.0-rc.2` / `0.2.1-alpha.1` / `0.2.1-alpha.2`，**approved 条目至少需一个精确 `compatible`**）；monorepo 需按插件提交 `tree/<branch>/<package-path>` 子路径；**禁止 disable/replace/重复安装任何 `@deepseek-ai/*`**。官方预检/审计工具 = GitHub 仓库 **`AI-Scarlett/build-dsh-plugin`**（**不在 npm**，故本机原先没有；已克隆到 `_tools/build-dsh-plugin`）。' +
    '**体检基线**（`audit-plugin.mjs`，满分 100 = 静态 80 + 运行时 20）：gate 62 / hooks 62 / session 64 / sleep 62 / mcp 60，**运行时一律 0/20**。' +
    '**整改四步（全部落地，OSS `d311ad5` → `d14a262` → `fe41fa2`）**：① **manifest**：五份加 `repository{type,url,directory}` + `scripts.test` + `dsh.compatibility.dshReleases`（rc.2=**compatible** 实跑、两个 alpha=**unknown** 未测）；② **测试**：`selftest.mjs` → **`selftest.test.mjs`**（审计只认 `test/`、`tests/`、`*.test.*`、`test-*` 路径；**改名而非搬目录＝零相对路径破坏**），并补**真边界用例**（gate：traversal/malformed/replay/顺序无关；hooks：malformed args→null（fail closed）+replay；session：节流/malformed 时间戳/replay/大会话 ×4；sleep：malformed+**回滚语义**（核心库不可用→不得落地 sleep-state.json）；mcp-akasha：**新建**测试＝Bundle Patch 契约（自有入口 ID、无 remove/disable/patch、`args` 数组无 shell 拼接）+ **malformed JSON-RPC 不得非零退出**的 stdio 实测）；③ **README**：五份补「固定源 SHA + 状态区分（verified/partial/unverified/blocked）+ 下一道门 + 权限/非目标/边界」；④ **E3 一次性 Profile 证据**：自写跑器 `akasha/tools/store-e3-20261010.mjs`——**先把插件源复制到临时目录再 `file:` 安装**（防 pnpm remove 清空源目录，AGENTS §1.11 事故），在临时 `DSH_HOME/AGENTS_HOME/npm-cache` 内 `--from-default-profile web` 建基线 → `plugin add` → **冷启动 host + HTTP 就绪** → SIGTERM → `plugin remove` → **`--dump-config` 逐字回到基线**；五插件全过（dsh 0.2.0-rc.2）→ 生成 `plugins/*/EVIDENCE.json`。' +
    '**结果**：五插件 **static 80/80 + runtime 20/20 = 100/100**，状态 `controlled-real-profile-acceptance-ready`。' +
    '**踩坑（值得复用）**：① DSH CLI 是**启动器**——`--dump-config` 要求 profile 已存在，新 profile 必须 `--from-default-profile <模板>` 创建（直接 `plugin add` 建出的 profile 无 app，boot 会静默不监听）；② 子进程非 TTY 时 stdout 全缓冲 ⇒ 冷启动诊断要看**端口**不是看输出；③ 审计的「40 位固定源」检查只认 README/文本里的 40-hex。' +
    '**未做（下一道门）**：① 在 0.2.1-alpha.x 上复测并把 `unknown` 改精确；② **提交上架申请**（5 条 `tree/main/plugins/<name>` 子路径；需用户授权，且 STORE 规则＝同一人全局只联系一次）。',
  source: { type: '复现', ref: '本机实测 2026-10-10：_tools/build-dsh-plugin（官方审计/工具）+ _scratch/store-e3/e3-run-*.json（五插件 E3 报告）+ OSS d311ad5/d14a262/fe41fa2' },
  event_time: '2026-10-10',
  last_reviewed: '2026-10-10',
  tags: ['DSH-STORE', '上架', 'E3', '审计', '插件', '整改'],
});
console.log('已入 canon：' + rec.id);
