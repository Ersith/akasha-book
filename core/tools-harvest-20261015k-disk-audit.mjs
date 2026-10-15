// akasha/tools/harvest-20261015k-disk-audit.mjs —— D 盘体检 + inbox 处理留痕
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-disk-audit-20261015'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**D 盘体检（2026-10-15；用户问「D 盘怎么现在就 24 个 G 了」）+ inbox 处理**——新工具 `tools/disk-usage.mjs`（顶层占用扫描，可复跑）。',
  '**① 现状**：D: 623GB 总 / **剩余 17GB（98% 满）**（清暂存后；清前 9.4GB）。顶层合计 **588GB**。**② 占用大表**：`ClaudeWorkspace 198.6G`（创作资产大本营）· `Hypergryph Launcher 71.3G`（游戏）· `QQ记录 67.1G` · `个人资料整理_20260924 36.1G` · `SteamLibrary 31.8G` · `NIKKE 29.3G` · **`dsh-tmp-obj-quarantine 20.3G`** · `Tuanjie 17.7G` · **`BlenderTemp 15.7G`** · **`cache-moved 15.6G`**（pip/uv/pnpm/npm/hf 活缓存——不可删）· **`dsh-temp 13.0G`**（全系统 TEMP，3200+ 项）· `Unity改模 10.7G` · `新建文件夹 9.3G` · 根级 **`Photoshop Temp1633200531948 7.68G`（8-07）** · 其余 53 个 <1G。',
  '**③ 已做的清理（只搬不删/既定策略内）**：ⓐ `tools/dsh-temp-clean.mjs --apply` 删 12 个 stale dsh-workspace-changes ⇒ **回收 4.48GB**（保留活跃 1.16G）；顺手修脚本重复扫描（TEMP 已=D:\\dsh-temp ⇒ roots 去重）。ⓑ 宠物桥目录 87 个死实例文件搬 `backups/pet-bridge-archive-20261015`（88→1，live 不再有挤出风险）。',
  '**④ 待用户拍板的可清候选（A 档，合计 ~44G+）**：ⓐ `BlenderTemp` 15.7G（autosave.blend 43 个，最新 10-01——崩溃恢复文件）；ⓑ `dsh-tmp-obj-quarantine` 20.3G（30 个 `tmp_obj_*` 0.5-0.9G 大文件，全为 10-04、11 天没动——**来历未查清**，疑似清理期隔离的临时对象）；ⓒ 根级 `Photoshop Temp…` 7.68G（8-07 遗骸）；ⓓ `dsh-temp` 内非活跃残留（pip-unpack 1.2G + 1656 个细碎目录，需更细策略：只清 >6h 且非活跃者）。**⑤ 明确不动**：cache-moved（活缓存）、游戏、QQ记录、个人资料、ClaudeWorkspace（除非深挖其内部找可清的训练检查点/重复模型——待用户示意）。',
  '**⑥ inbox 处理（本日 3 条）**：`akasha_promote` 转正 **2 条**（orphan-bdaac4f57 / orphan-b57e0d6e9——即当日两条工具名失误记录：`bash: unknown tool`、`akasha_search: unknown tool`）；2 条 review 类（`orphan-backlog` 63→65 条——超阈值告警，属常态；`recall-miss` 1 回合）——记录在案，不做大动作（积压压缩流程需单独裁定）。**⑦ 教训**：D 盘 98% 满的构成＝「大资产（ClaudeWorkspace 198G 等 430G+）+ 游戏 140G+ + 缓存/临时累积 ~55G」；临时类有明确的既有清理通道（dsh-temp-clean），但**非 DSH 管的临时目录（BlenderTemp/quarantine/Photoshop Temp）需要用户确认后才动**。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-disk-audit-20261015',
  claim,
  source: { type: '复现', ref: 'tools/disk-usage.mjs（108s 全盘扫描）· dsh-temp-clean.mjs --apply 实录 · Get-Volume D: · akasha_promote' },
  event_time: '2026-10-15',
  last_reviewed: '2026-10-15',
  tags: ['磁盘', 'D盘', '清理', '运维', 'inbox'],
});
console.log('已入 canon：' + r.id);
