// 2026-10-07 插件更新窗口执行记录 + 供应链闸新教训（幂等）。
// 用法：node akasha\tools\harvest-20261007-pluginupd.mjs
import { appendRecord, loadStore } from '../lib.mjs';

const rec = {
  id: 'canon-plugin-update-20261007',
  claim: '插件更新窗口执行（2026-10-07，用户裁定由「攒到 10-28」改为立即更新）：四目标核验（npm/GitHub tags/本地管线逐个对账 + peer 全过 + 官方 audit-gate 预检 **37 包 / 0 拦截**，runtime 0.2.0-rc.2 吻合）→ 已装 **dsh-context 0.64.0**、**dshmarket 1.66.9**、**@noob-stupid/dsh-plugin-console 0.5.42**（均 restart-required，待一次重启激活；兼容预检通过）；**dsh-purge v1.1.60 暂卡**（同闸）。**新教训（重要）**：桌面端自带 pnpm 11.7.0（`<DSH_INSTALL>`）的**冻结锁文件供应链校验**会真实拦下 24h 内新发布的条目（console@0.5.42 发布 2026-10-05T19:23:47.897Z），且**实测不认 `pnpm-workspace.yaml` 的 `minimumReleaseAgeExclude` 豁免**；后果=①「启动同款」校验 `install --frozen-lockfile` 直接失败（按 §1.3 语义：该窗口内重启会被拒）②期间**所有 plugin_manager 操作**同样被拒（purge 安装正因此失败）。**自动转绿时刻 = 2026-10-06T19:23:47Z**（过龄 24h，无需人工）。**纪律补丁**：更新前先查候选版本发布年龄（`npm view <pkg> time`），≥24h 再动手；「先装后等」可行但必须把窗口写清楚、窗口内不重启。备份齐：`<LOCAL_PATH>`（5 个目录依赖 27.3MB）+ `<LOCAL_PATH>`（profile package.json + pnpm-lock.yaml 快照）。',
  source: {
    type: '复现',
    ref: '现场证据（2026-10-06T18:00–18:15Z）：plugin_manager install×4（3 成 1 败）；runtime pnpm 冻结校验失败原文（ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION）；audit-gate 37/0；lockfile/package.json 双核对；npm view / GitHub tags API / 本地 tgz 清点'
  },
  last_reviewed: '2026-10-07',
  tags: ['插件', '更新', 'pnpm', '供应链闸', '教训']
};

const existing = new Set(loadStore('canon').records.map((r) => r.id));
if (existing.has(rec.id)) {
  console.log('skip  canon ' + rec.id + '（已存在；改内容请用 revise）');
} else {
  appendRecord('canon', rec);
  console.log('added canon ' + rec.id);
}
