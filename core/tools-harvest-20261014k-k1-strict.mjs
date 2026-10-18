// akasha/tools/harvest-20261014k-k1-strict.mjs
// 2026-10-14：K1 严格版（逐字保真 + 编造测试，CLI/MCP 两侧）落地记录。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
const MARK = 'K1-STRICT-20261014';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-k1-strict-'))) { console.log('= 已存在'); process.exit(0); }

const claim = [
  '**K1 严格版落地（逐字保真 + 编造测试；板条第 K1 条，2026-10-14；标记 [' + MARK + ']）**。',
  '**交付**：① 工具 `akasha/tools/k1-strict.mjs`——**两侧**（CLI ＋ MCP 行式 JSON-RPC 迷你客户端）共 **21 检查项**：保真＝`show --reflect` 头/尾干净切片（≥30 字、无引号/换行）逐字 + `lookup` 命中行滑窗 24 字 ⊂ 原文∪剥皮原文 + MCP `akasha_show` 逐字；编造＝CLI `lookup`/`brief` 噪声词须「确定不知道」、`show` 不存在 id 须「未找到」且 exit 1、MCP 同款三例（含纯噪声零命中、生僻字词不得强命中）。② 主套件夹具守卫（`test.mjs` +1 用例，**225→226**）：逐字保真（--reflect 含 ⇒/✓、默认剥皮去掉）＋ 编造三断言（lookup/brief 确定不知道、show 未找到 exit 1）。',
  '**判据写死防事后调参**；**纪律**：只读、`AKASHA_QUERY_LOG=off` 防探针污染、取样确定性（每库按 id 排序取头 1 中 1，≤8 条）。',
  '**结果**：真库 **21/21 全绿**；首跑 13/20 的七红**全部是断言自身的瑕疵**（命中行前缀污染 → 改滑窗、短语含首尾标点/截断 → 改净边、MCP 探针词含真词「编造」触发弱命中——那是设计行为「不确定」而非「没有」）——修断言后即绿；**库侧无保真/编造缺陷**。一个信息项：`orphan-mux08tvj` 的 14 字自取短语未进 lookup 展示面（**K2 可达线索**，不计 K1 红；如实列出）。',
  '**未接入自动闸**（family-sweep / health-check）——按需运行（同 `verify-frontier-urls` 的巡检位）；是否接入留作候选。验收：工具 21/21 · 主套件 **226/226** · family-sweep 全绿。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-k1-strict-20261014',
  claim,
  source: { type: '复现', ref: 'akasha/tools/k1-strict.mjs（真库 21/21）· akasha/test.mjs K1 用例（226/226）· 首跑红项明细（断言瑕疵三处）' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['K1', '保真', '编造测试', '工具', '落地'],
});
console.log('已入 canon：' + r.id);
