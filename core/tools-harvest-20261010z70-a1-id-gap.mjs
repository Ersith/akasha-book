// akasha/tools/harvest-20261010z70-a1-id-gap.mjs
// 2026-10-10：A1 的两条待修发现（id 口径不一致 + 自我层未被豁免）。幂等。
import { loadStore, currentRecords, appendRecord } from '../lib.mjs';

const canon = currentRecords(loadStore('canon').records);
if (canon.some((r) => r.id.startsWith('canon-a1-id-convention-gap'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('canon', {
  id: 'canon-a1-id-convention-gap-20261010',
  claim:
    '**A1 负载均衡的两条待修发现（2026-10-10 复核协议类豁免补丁时实测）**。' +
    '**① id 口径不一致（缺陷，影响面最大）**：用量窗口按 **hooks.jsonl 里被引用的 id 原文**计数，而 `applyRank` 用 **命中条目的当前版本 id**（`r.id`，形如 `canon-x-20261008-r4`）去 `win.byId.get(id)`。实测日志：**79 例引用写根 id、15 例写带版本 id** ⇒ **凡被修订过的条目（当前 id 带 `-rN`）几乎永远命中不到计数** → 校正恒 1；反之无修订的条目（如 `front-qwen-id-balancing-2026`）才吃得到校正（这正是 2026-10-10 活体上唯一生效的案例）。**建议修法**：两侧统一按**根 id**（去掉末尾的 `-rN` 版本后缀）归一后再查/计数（或同时累计两种形式），并加一条「修订条目也能被计数」的用例。' +
    '**② 自我层未被豁免（设计缺口）**：已落地的豁免判据是 `credibilityOf.cls === "protocol"`，而 `isProtocolId()` 只认 `canon-akasha-usage*`；**自我层三条**（`canon-self-concept*` / `canon-address-layers*` / `canon-memory-auto-record*`）不是 protocol 类 ⇒ 一旦 ① 修好（计数生效），这些"每会话注入/必引"的条目**会吃垄断罚**，与"常驻提示条不应被 usage 漂移"的既定理由相悖。**建议修法**：把豁免判据扩为"常驻注入类"（protocol ∪ 自我层 tag/id 前缀），或在分类器里把自我层并入 `protocol` 类。' +
    '**现状**：两条都不阻塞——A1 默认关；豁免补丁本身按其声明工作正常（`protocol-exempt` 恒 1，测试 128/128）。**待外援修**。',
  source: { type: '复现', ref: '本机实测 2026-10-10（_scratch/akasha-a1exempt-review-20261010/check-exempt-scope.mjs + hooks.jsonl 口径统计）' },
  event_time: '2026-10-10',
  last_reviewed: '2026-10-10',
  tags: ['A1', '缺陷', '待修', 'id口径', '豁免范围'],
});
console.log('已入 canon：' + rec.id);
