// 2026-10-14：C3 近场纪律半句落地 + require 缓存探针发现。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-c3-pulse-hint-'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**C3 落地：库脉搏行近场纪律半句「 · 相关主题先 brief」（2026-10-14 用户裁定选项 A；受控解冻）**。',
  '**实现**：`renderPulseLine`（核心 sleep.mjs）行尾固定附半句；**两路关断**——`opts.hint=false` 与环境变量 `AKASHA_PULSE_HINT=off`（与 AKASHA_QUERY_LOG=off 同款）；缺省开。理由：远场 usage 条同句不落手 ⇒ 挂每回合必经的执行点（近场版）；第 2/3 轮测它。',
  '**⚠ 探针发现（更正一条文档级信念）**：Node v24.19 `require()`（含 require(esm)）**模块有缓存**——实测「require 后改文件、再 require」仍得旧值（`live:false`）。⇒ **改核心（akasha/*.mjs）不会即时反映到插件渲染面，需重启宿主**；AGENTS §6「核心库由插件 require 现场读 ⇒ 改核心即时生效」的表述**只对 CLI / 新进程成立**，对长驻插件进程不成立（原依据 canon-h4-norestart 实为「空跑重打包」个例，被过度推广）。**修正落点**：AGENTS 表述更正（配 pre 快照）已并入「重启后核验」板条。',
  '**验证**：sleep selftest 新断言（缺省带半句 + 两路关断）全过；主套件 **233/233**。**生效时点＝下次重启**（与 MCP 复审三件同批）；重启后核验＝库脉搏行应含「 · 相关主题先 brief」。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-c3-pulse-hint-20261014',
  claim,
  source: { type: '复现', ref: 'sleep.mjs renderPulseLine + AKASHA_PULSE_HINT 开关 · tmp/require-esm-cache-probe.mjs（live:false）· sleep selftest · test 233/233' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['C3', '近场', '纪律半句', 'require缓存', '更正'],
});
console.log('已入 canon：' + r.id);
