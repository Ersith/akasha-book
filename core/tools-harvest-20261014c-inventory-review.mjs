// akasha/tools/harvest-20261014c-inventory-review.mjs
// 2026-10-14：I-10 复审闭环首跑产物——插件装载快照 2026-10-14 复核版（r1；不改旧版）。幂等：判据＝单一常量。
import { loadStore, currentRecords, revise } from './lib.mjs';

const MARK = 'INVENTORY-REVIEW-20261014';
const cur = () => currentRecords(loadStore('canon').records);
const rec = cur().find((r) => String(r.id).startsWith('canon-dsh-plugin-inventory-20261007'));
if (!rec) { console.log('未找到快照条目'); process.exit(1); }
if (String(rec.claim).includes(MARK)) console.log('= 复核版已存在：' + rec.id);
else {
  const r = revise('canon', rec.id, {
    claim:
      `**桌面 profile 插件生态快照（2026-10-14 复核版；[${MARK}]；宿主 DSH 0.2.0-rc.2）**——上版＝2026-10-07。` +
      '**本版为复审闭环（I-10）首跑产物**：fresh 子 agent 独立审查（零上下文）＋ 主会话逐项复核裁决。' +
      '**① 计数漂移**：package.json 依赖 28→**32**；`dsh.profile.bundles` 33→**37**；`plugin_manager list_bundles` 38→**42**（官方未启用/optional 仍 5 项：acp-app / experimental-schedule-bundle / headless / sdk-app / sdk-minimal）。' +
      '**② 社区来源 5→6**：新增 `dsh-ops@0.2.6`（registry 裸版本；peer = `@deepseek-ai/cordis ^4.0.4` ＋ `@deepseek-ai/dsh ^0.2.0-rc.2`）；其余仍为自产 file:/link: tgz。' +
      '**③ 上游一周内「全体前进」**（2026-10-14 实取 registry dist-tags / GitHub tags）：dshmarket 已装 1.66.9 → latest **1.66.21**；dsh-context 已装 0.64.0 → latest **0.70.0**；@noob-stupid/dsh-plugin-console 已装 0.5.42 → latest **0.5.48**；@vectorize-io/hindsight-coding-agents 已装 0.8.0 → latest **0.8.1**（上版「0.8.0 = latest 无新版」**已失效**）；dsh-purge 已装 v1.1.46 → 最新 tag **v1.1.71**（**差 25 版**，缺口比上版记录的更大）；dsh-ops 已装 0.2.6 → latest **0.3.0**。' +
      '**④ peer 面**：上版四条 peer 预判经复核**仍成立**（dshmarket `^0.2.0-rc.1` ✓；dsh-context 全 `>=0.1.5-rc.1` 型 ✓ 且 `dsh.compatibility.dshReleases` 三版 compatible 仍在；console / hindsight 均未声明 `peerDependencies` ✓）；**补录上版漏项**：dsh-purge peer = `@deepseek-ai/cordis ^4.0.1`（已装 manifest 实读）。**升级动作前先跑** `plugin-upgrade-20260929\\scripts\\audit-gate.mjs`（官方 `evaluatePluginCompatibility()` 全量预检）——比人工读 peer 可靠。' +
      '**⑤ 历史通道结论仍成立**：dshmarket beta=1.19.0-beta.4 / dev=1.16.0-dev.*；console beta=0.3.24-beta.2（均旧于 latest）。' +
      '**未核（如实）**：上述新版（1.66.21 / 0.70.0 / 0.5.48 / 0.8.1 / v1.1.71 / 0.3.0）的 **peer 区间**——只读了已装 manifest，未读各新版 manifest。' +
      '⚠️ 版本快照纪律不变：**不改旧版**（原文见本链根版）；下次复核仍用 revise 追加。',
    last_reviewed: '2026-10-14'
  });
  console.log('已追加复核版：' + rec.id + ' → ' + r.id);
}
