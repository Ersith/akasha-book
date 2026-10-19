// akasha/tools/harvest-20261014aq-token-open.mjs —— token 开刀 ①②③④ + 总表 v2 修正
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-token-open-20261014'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  "**Token 有序开刀（GPT 第四轮建议的执行）——①②③④ 全落地（2026-10-14）**。",
  "**① 有界档总量上界**：`depth=summary|pointer` 时每库 ≤12、全组累计 ≤50（`READ_TIER.boundedPerStore/boundedTotal`）——**默认 full 档完全不动**（裁定保留）；cross summary 实测 29 条（≤50 ✓）、每库 ≤12 ✓。**② 诊断默认分离**：`trace` 只在显式 `trace:true` / CLI `--trace` 返回（citeAllowlist 与 stats 保留——分离的是可审零件、不是纪律）；**实测 meta 2002→788 tok，同 4096 预算条目 11→18**。**③ 最小包标记**：`budgetTooSmall`（cap 连元数据都装不下时如实标注+hint，不塞完整诊断）——cap30 实测 true ✓。**④ 用法条精简**：`canon-akasha-usage` r33→**r34**（8711→2543 字，≈4096→**1318 tok**——**每轮省 ~2778 tok**；操作面 ①–㉘ 全保，历史沿革随修订链回溯；人工通道 `--allow-protocol`）。",
  "**约定同步**：usage 条内新增「诊断默认分离 / 有界档上界」；测试同步 #35（trace 显式）+ golden 排除表（trace 入列）；**总表 v2 修正**（她指出的缺口）——补 N03/N04 行、N07 改指「重建选新墓碑（2/2）」、N05 加「无 refused」、N09 加「字段存在 + 完整 ID」、最终状态检查。**最终验证**：九脚本全量重跑（exits 全 0）+ **总表 v2 26/26 全 PASS**；核心套件 **248/248**。",
].join('');
const r = appendRecord('canon', {
  id: 'canon-token-open-20261014',
  claim,
  source: { type: '复现', ref: 'tmp/final-matrix-v2.mjs（总表 v2 26/26）· R5-* 九脚本 · usage r34 · test 248/248' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['token', '开刀', 'GPT第四轮', 'trace分离', '有界档', 'usage精简'],
});
console.log('已入 canon：' + r.id);
