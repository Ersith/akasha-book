// akasha/tools/harvest-20261015h-recheck-session.mjs —— 本会话产出复检留痕
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-recheck-20261015-density-p1'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**复检留痕（2026-10-15 08:15；用户令「复检下，确保没有问题」）**——范围＝本会话全部产出（P1 判据收紧 · 插件 0.3.4-h2/0.3.5-h1/h2 · CLI · 报告 3 份 · canon 7 条）；报告 `dist/recheck-20261015-session-work.md`；三遍法（逐段读码 / 全链跑 / 换角度）。',
  '**① 真缺陷 ×1（已修·D1）**：h1 引入的观测线去重键写成 `${sid}:{stream}`（**会话级一刀切**）——比设计意图（同 turn 多帧去重）严苛得多，**会让 P1 标定样本量被砍掉大半**（案发会话 125 命中→只剩零星）。修：键改 `${sid}:{stream}:{turn}`（同轮去重、跨轮各自落）；测试改双断言（同 turn 两 attempt⇒1 条 + 跨 turn⇒2 条）；h2 包内代码逐字确认。',
  '**② 措辞不精确 ×2（已修·W1/W2）**：r3 报告的 akasha 分组口径（写"0% / >1%"，实际分桶 <1% / 1-5%（空档）/ ≥5%）已改为与代码一致；事实结论不变（两桶覆盖全样本）。',
  '**③ 如实登记 ×3（不改）**：N1 核心 `loop-detect.mjs` 判据收紧在**插件进程内有 require 缓存**（重启前"CLI 新、插件旧"混搭窗口；重启后一致）——已登记 README v0.3.5-h2 节；N2 旧残渣 `package.json.bak-h2`（10-12 历史备份，保留不删）；N3 `sleep-plan-*.json` 为 sleep 调度自动产物（非人工，无碍）。',
  '**④ 复检后全链读数**：核心 **249/249** · 插件 **32/32** · `family-sweep` 全绿 · `health-check` **51/51** · `akasha.mjs check` OK（canon 775/775 等）· h2 装包 restart-required · tgz 内容核验通过。**⑤ 待重启验收（板条在案）**：density 线出现 / 节奏条密度行 / CLI 有数据 / loop-watch 命中恢复"同轮去重跨轮各自"形态。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-recheck-20261015-density-p1',
  claim,
  source: { type: '复现', ref: 'dist/recheck-20261015-session-work.md · selftest 32/32 · akasha/test.mjs 249/249 · family-sweep 全绿 · health-check 51/51 · tar -xzOf 包内容核验' },
  event_time: '2026-10-15',
  last_reviewed: '2026-10-15',
  tags: ['复检', '质量', '密度', '插件', '观测'],
});
console.log('已入 canon：' + r.id);
