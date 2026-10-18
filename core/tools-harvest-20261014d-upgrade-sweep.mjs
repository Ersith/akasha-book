// akasha/tools/harvest-20261014d-upgrade-sweep.mjs
// 2026-10-14：社区插件 6 件升级 + OpenViking 0.5.0 升级记录 + 快照 r2 + P0 r3（C 小面）。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord, revise } from './lib.mjs';

const MARK = 'UPGRADE-SWEEP-20261014';
const MARK_P0 = 'SMALL-FACES-CLOSED-20261014';
const MARK_SNAP = 'UPGRADE-EXECUTED-20261014';
const cur = () => currentRecords(loadStore('canon').records);
const find = (prefix) => cur().find((r) => String(r.id).startsWith(prefix));

if (!cur().some((r) => String(r.id).startsWith('canon-upgrade-sweep-20261014'))) {
  const r = appendRecord('canon', {
    id: 'canon-upgrade-sweep-20261014',
    claim:
      `**社区插件与 OpenViking 升级批（2026-10-14；用户令「社区插件有升级的升级下」＋「检查下社区的 openviking 有没有升级的，能不能升」；标记 [${MARK}]）**。` +
      '**① 社区插件 6 件**（全部 restart-required；**发布龄 ≥24h 门控逐件核对**——<24h 的 dshmarket 1.66.21 / dsh-context 0.70.0 / console 0.5.48 / dsh-ops 0.3.0 **一律回避**，取最新**过龄**版）：dshmarket 1.66.9→**1.66.20** · dsh-context 0.64.0→**0.69.1** · @noob-stupid/dsh-plugin-console 0.5.42→**0.5.45** · hindsight-coding-agents 0.8.0→**0.8.1** · dsh-ops 0.2.6→**0.2.9** · dsh-purge v1.1.46→**v1.1.71**（GitHub tar，codeload 直装）。' +
      '**预备**：备份 `_rollback-20261014-plugin-upgrade/`（package.json / pnpm-lock / .modules.yaml）＋ 官方门控预检 `plugin-upgrade-20260929\\scripts\\audit-gate.mjs`（参数＝官方根 `<DSH_INSTALL>` ＋ profile node_modules；**扫 335 / blocked 0 / runtimeMatchesLive true**）＋ 候选 peer 逐一手检（dshmarket 的 dsh-settings `^0.2.0-rc.1` ✓、dsh-context 的 dsh-session `>=0.1.7-rc.2` ✓、dsh-ops 的 dsh `^0.2.0-rc.2` ✓；console·hindsight 无 peer）。' +
      '**验收**：六件版本逐一实读到位；profile 依赖 **0 缺失**；四个 `link:` 目录依赖完好（dsh-blender-config 2 / open-in-app-fix 5 / mcp-blender 2 / mcp-unity 2 文件）。**待重启生效**。' +
      '**② OpenViking 0.4.17.1 → 0.5.0**（PyPI；venv 原位升级；**包体零本地改动**已先行验证——「改了下」的其实是恒侧插件 fork，见下）：备份 `_rollback-20261014-openviking/`（data 120MB ＋ ov.conf ＋ pip freeze 清单）→ 停旧服（pid 23496，taskkill /T）→ `pip install openviking==0.5.0` → WMI 拉起 → **健康 `{"version":"0.5.0","healthy":true}`** ＋ **MCP 面无需桌面重启即恢复**（`mcp__openviking__health` 与 `find` 实调通过）。' +
      '**行为变更（0.5.0 release notes，需知）**：Working Memory **默认关**（我们 ov.conf 未设该字段 ⇒ 取新默认；主机托管历史的插件路线不受影响）；context 模式召回不再返回系统预置目录、quota 空档由他类补足（同一查询结果可能与旧版不同）；**插件与 Python 包分开升级**——DSH 侧 `@haven/openviking-memory 0.5.8-haven.2`（本地 fork）**未动**，官方 0.5.0 的 DSH 插件改进（Windows session ID 归一化 #5522、只在真实用户输入时召回 #5647、peer 放宽）**未获得**（升级与否另议）。' +
      '**踩坑（已入册）**：0.5.0 新增「同数据目录禁双开」锁（`data/.openviking.lock`，msvcrt 非阻塞锁）——并发做前台尝试会撞 PermissionError（**是保护在正常工作，不是故障**）；健康探活要**等首次启动完成**（本次数十秒），过早探活会误报「拉起不可连」。' +
      '**回滚**：`pip install openviking==0.4.17.1`（freeze 清单在备份里）＋ data 还原；插件＝按备份 package.json 重装旧 tgz。',
    source: { type: '复现', ref: 'npm view 发布龄核查 · plugin_manager install_bundle ×6 · audit-gate.mjs 预检 · PyPI openviking 0.5.0 + GitHub release notes · openviking-health.mjs --fix · curl /health · mcp__openviking__health/find · 备份 _rollback-20261014-{plugin-upgrade,openviking}/' },
    event_time: '2026-10-14',
    last_reviewed: '2026-10-14',
    tags: ['升级', '社区插件', 'OpenViking', '运维', '回滚点'],
  });
  console.log('已入 canon：' + r.id);
} else console.log('= 升级记录已存在');

const snap = find('canon-dsh-plugin-inventory-20261007');
if (snap && !String(snap.claim).includes(MARK_SNAP)) {
  const r = revise('canon', snap.id, {
    claim: String(snap.claim) +
      ` **【r2 · 2026-10-14 升级执行·[${MARK_SNAP}]】**：本快照所列 6 件**同日全部升级**（一律取**过龄**版，回避 <24h）——现装：dshmarket **1.66.20** / dsh-context **0.69.1** / console **0.5.45** / hindsight **0.8.1** / dsh-ops **0.2.9** / dsh-purge **v1.1.71**（restart-required）。**仍待跟踪的「再前进」版**：1.66.21 / 0.70.0 / 0.5.48 / 0.3.0（过 24h 龄后可再升）。留痕 canon-upgrade-sweep-20261014。`,
    last_reviewed: '2026-10-14'
  });
  console.log('已修订快照：' + snap.id + ' → ' + r.id);
} else console.log('= 快照 r2 已存在或未找到条目');

const p0 = find('canon-genre-p0-20261013');
if (p0 && !String(p0.claim).includes(MARK_P0)) {
  const r = revise('canon', p0.id, {
    claim: String(p0.claim) +
      ' **【r3 · C 小面收口·[' + MARK_P0 + ']】**：§6.5 R3 登记的剩余小面已清——① **CLI summary / diff 默认剥皮**（新增 --reflect 反思通道）；② **MCP 三工具入剥皮面**：akasha_summary / akasha_kit / akasha_sleep_plan（各配 reflect 参数）；③ **不剥（附理由，非漏项）**：akasha_frontier_due（题名＝**外部文本**，剥它损引用准确性）、conflict（渲染只含 id 与标记词、无正文）、kit CLI（只打 id+valence）。测试 **225/225**（+1 用例：夹具根 summary/diff 双档断言）。',
    last_reviewed: '2026-10-14'
  });
  console.log('已修订 P0：' + p0.id + ' → ' + r.id);
} else console.log('= P0 r3 已存在或未找到条目');

// —— 生效确认（同日重启后）：把「待重启生效」改判为「已生效」——
const MARK4 = 'POST-RESTART-VERIFIED-20261014';
const rec4 = currentRecords(loadStore('canon').records).find((r) => String(r.id).startsWith('canon-upgrade-sweep-20261014'));
if (rec4 && !String(rec4.claim).includes(MARK4)) {
  const r = revise('canon', rec4.id, {
    claim: String(rec4.claim) + ` **【生效确认·[${MARK4}]】**：用户重启后验收——\`plugin_manager list_bundles\` 六件**新版本逐一加载在位**（dshmarket 1.66.20 / dsh-context 0.69.1 / console 0.5.45 / hindsight 0.8.1 / dsh-ops 0.2.9 / dsh-purge 1.1.71；无 incompatible-version 行；bundles 总数 42）；**MCP 新剥皮面已生效**——\`akasha_summary\` 接受新参数 \`reflect\`（旧桥会因 additionalProperties:false 拒；返回反思通道原文），余（akasha_kit / akasha_sleep_plan）同批；阿卡夏六件版本不变（gate 1.4.0-h1 / hooks 1.2.5-h1 / session 0.3.2-h4 / sleep 1.10.1-h1 / mcp-akasha 1.1.2-h2 / mcp-rea 0.1.6-h1）；OpenViking 0.5.0 经重启后 **MCP 与 HTTP 双通道复测健康**。收尾闸：family-sweep 全绿 · health-check 51/51 · 真库快照 canon:ae784539c667。`,
    last_reviewed: '2026-10-14'
  });
  console.log('已补生效确认：' + rec4.id + ' → ' + r.id);
} else console.log('= 生效确认已存在或未找到条目');
// —— 追加（同日）：better-sidebar #834 修复版升级（板条第 5 条）——
const MARK5 = 'BETTER-SIDEBAR-834-20261014';
const rec5 = currentRecords(loadStore('canon').records).find((r) => String(r.id).startsWith('canon-upgrade-sweep-20261014'));
if (rec5 && !String(rec5.claim).includes(MARK5)) {
  const tail = ' **【追加·[BETTER-SIDEBAR-834-20261014]】**：**better-sidebar 0.24.1 → 0.25.0**（板条第 5 条「#834 修复发版后直接升级复验」触发）。' +
    '**背景**：issue #834（桌面端 dsh-app:// origin 下 sidebar_open 与文件树实时刷新失效，WebSocket 被拼成 ws://app/…）的修法＝把 ws 构造改骑 __DSH_TRANSPORT__.streamBaseUrl ?? baseURI（经 host-route-url 统一基址源）。' +
    '**定点核实（tgz 解包实测）**：已装 0.24.1 的 location.origin×5、streamBaseUrl×0（缺陷在）；0.25.0 与 0.26.0 均 streamBaseUrl×4（修复在）。' +
    '**取版**：0.25.0（109h 过龄 ✓；peer ^0.2.0-rc.2 与运行端对齐；改动面最小）；0.26.0（15.8h）太新，待过龄后再走常规升级。' +
    '**装法**：照既有 precheck 模式，tgz 落 _scratch/better-sidebar-precheck/，install_bundle 钉版安装（restart-required）；备份 _rollback-20261014-plugin-upgrade/package.json.pre-bs025.bak。' +
    '**待重启复验**：sidebar_open 返回 delivered:true ＋ 文件树实时刷新（复验后才可勾板条第 5 条）。';
  const r = revise('canon', rec5.id, { claim: String(rec5.claim) + tail, last_reviewed: '2026-10-14' });
  console.log('已追加 bs834：' + rec5.id + ' → ' + r.id);
} else console.log('= bs834 追加已存在或未找到条目');
