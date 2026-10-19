// akasha/tools/harvest-20261015c-p1-calib-tighten.mjs —— 循环观测 P1 标定巡检 + 判据收紧留痕
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-loop-p1-calib-tighten-20261015'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**循环观测 P1 第三次标定巡检 + P0 判据收紧（2026-10-15 晨；板条第 1 项「循环观测 P1」检查完毕）**——结论：**P1 暂不开**，先修基座（用户拍板 A：修基座两件套）。',
  '**① 标定数据（第三次；脚本 `akasha/tools/loop-p1-calibration.mjs` 可复跑）**：命中 **125**（variant 90 / punct 31 / exact 4）· 探针 **1016** · 18 会话；按日峰在 10-14（34）。',
  '**② 判据反问实验（本次新做；`tmp/p1-punct-criterion-echo.mjs`，产物存 `dist/p1-calib-20261015/criterion-echo-2026-10-15.txt`）**：直接把样本喂 `loop-detect` 核心——**单次出现的标点串即命中**（A 样本：一行 `——：——：——：` → `punctRuns:[「——：——：——：」]`）；纯 Markdown 分隔线/表格行不命中；真「重复块」路径（exact/variant）因 `gate` 阈值未达而极少触发（英文变体×4 才开 letters 门）。**另**：窗口精查（`tmp/p1-aggregation-window.mjs`）显示 60s 窗口内 ≥3 的「聚集」候选 4 个全为良性——3 个是 punct 提取产物（含同一秒多帧快照），1 个（f6a49f95#1）是 19s 内同段正常推理的重述复核。',
  '**③ 结论**：punct 类占命中 25%（31/125）却**全为良性单串** ⇒ P0「环源」口径过宽，掩盖真信号；重报（同一逻辑事件多帧各写一行）进一步稀释样本。**若 P1 阈值建在此数据上，会把良性标点串当真环**（假阳性风险高）。',
  '**④ 已修（用户拍板 A，2026-10-15）**：⑴ **核心库** `akasha/loop-detect.mjs`——`punctRuns` 收窄为**同串出现 ≥2 次才入列**（新增 `punctRepeats` 计数；刻意不做「连续三连」加严——采样计数如每 0.5s 一行 `——：` 是正常用法，会伤合法长任务）；**CLI 即时生效，无需重启**。⑵ **插件壳** `@akasha-book/akasha-session` **0.3.4-h1 → 0.3.4-h2**（restart-required）——流线按 `${sid}:${stream}` **只落首报**；turn 相命中带 `src:\'turn\'`（下游可把「流已报 + 回合复检再报」当同一事件）；**turn 兜底保留**（跨 8K 尾窗重复只有全文复检看得见）。',
  '**⑤ 验收**：核心 `node test.mjs` **249/249**（新增用例：真重复命中 / 单串不误报 / 合法长串零误伤 / 多行重复计数 + 原单串用例改判为 0）；插件 `node selftest.test.mjs` **30/30**（新增：多 attempt 只落首报 + turn 相 `src` 标记）；`family-sweep --quiet` **全绿**；`npm pack` 5 文件、`install_bundle` 返回 **restart-required**。',
  '**⑥ 数据资产**：三份标定产物 `dist/p1-calib-20261015/{calibration,aggregation,criterion-echo}-2026-10-15.txt`；台账 `docs/observation-ledger.md` §3「循环观测 P1」行同步；相关孤案 `orphan-mv8q1d1q`（判据基座疑点原样记录）。**预期**：重启后 P0 命中数显著下降（punct 假阳性剔除），P1 阈值**需在新判据数据上重跑基线**。**纪律不变：P0 dry（只观测不干预）；P1 的启用仍须独立裁定。**',
  '**⑦ 与退化线的关系**：同日晨 `canon-degeneration-samples-20261015`（0fd706f7 会话明面失稳 3 例）与本次标定属同一退化谱系——**两份数据合起来才够谈 P1 阈值**（前者给「什么时候该干预」的外部对照，后者给「检测器报的到底是不是环」的判据质量）。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-loop-p1-calib-tighten-20261015',
  claim,
  source: { type: '复现', ref: 'akasha/tools/loop-p1-calibration.mjs + tmp/p1-{aggregation-window,punct-criterion-echo}.mjs · dist/p1-calib-20261015/ 三份产物 · akasha/test.mjs 249/249 · dsh-akasha-session 30/30 + npm pack/install_bundle 实录' },
  event_time: '2026-10-15',
  last_reviewed: '2026-10-15',
  tags: ['循环观测', 'P1', '标定', '判据', '插件', '观测'],
});
console.log('已入 canon：' + r.id);
