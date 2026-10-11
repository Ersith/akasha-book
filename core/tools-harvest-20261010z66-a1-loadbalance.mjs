// akasha/tools/harvest-20261010z66-a1-loadbalance.mjs
// 2026-10-10：A1 负载均衡并入活树的交付记录。幂等。
import { loadStore, currentRecords, appendRecord } from '../lib.mjs';

const canon = currentRecords(loadStore('canon').records);
if (canon.some((r) => r.id.startsWith('canon-rank-a1-loadbalance'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('canon', {
  id: 'canon-rank-a1-loadbalance-20261010',
  claim:
    '**A1 检索负载均衡并入活树（2026-10-10，用户裁定「并」；外援补丁、我方独立验证）**。' +
    '**机制（默认关）**：`loadBalanceCorrection` 三项——① **超配额降 boost** `1/(1+kP·error/quota)`（error=count−quota，防垄断，P 项）；② **零引用且弱命中 → ×(1+kExplore)**（探索；整词命中不给）；③ **刹车**：当 HHI 前后半斜率 slope>slopeThresh **且**该条超配额 → `1/(1+kD·(slope−thresh)/thresh)`；末尾夹到 `[minCorrection 0.25, maxCorrection 1.5]`。参数：`windowMs` 7 天 / kP 1 / kExplore 0.25 / kD 0.5 / slopeThresh 0.05。**用量窗口**从 `logs/hooks.jsonl` 的 usage 行算 total/distinct/quota/HHI 前后半斜率（缺日志优雅降级：校正 1，不误伤）。**审计**：每条命中带 `balance{count,quota,error,slope,reasons,params,correction}`；`factorApplied`（孤案 `false` 且 rank=score，其余 `true`）。**开启方式**：CLI `--load-balance [--balance-log F]` 或 MCP `loadBalance: true`（lookup / brief / cross 三工具）。' +
    '**验证（我方独立，六项）**：两补丁 `git am` 干净（OSS `0401563` + `3d90b57`）；**双路树哈希全等** `d5ab5f568eac0f34907575d6f2b3b5dbf7baee11`；核心 **128/128**（活树 124+4）/ **127/127**（OSS 123+4）、会话 **22/22**（N24）· **15/0/7 skipped**（N20）；gate/hooks/sleep 全绿；**默认关零行为变化**——8 个查询在「顺序 × rank × factor × strong」上逐条相同；**开启后 strong 集合不变**；**独立夹具 9/9**（手算对账：超配额 0.36 · 探索 1.25 · 整词命中不给探索 · 刹车叠加夹到 0.25 · 上限夹 1.5 · 空窗口=1 · 端到端 rank 3→0.75 且重排）。' +
    '**现状如实**：真数据上校正**全为 1.000**（无超配额；slope 0.018 < 0.05 阈值）⇒ **该功能在现库等于休眠**，等语料/引用量增长后才有区分度。' +
    '**落地与回滚**：活树已并；快照 `_rollback-20261010-a1\\`（lib.mjs / test.mjs / SCHEMA.md / akasha.mjs / mcp.mjs）；新增设计文档 `research/weight-internalization-pid.md`（PID 类比）；OSS `da433d2`（CHECKS R24）；MEMORY-TEST 第十九次受控解冻。**MCP 面需重启才吃到 `loadBalance` 参数**（不带参数行为与并前完全一致）。' +
    '**工程坑（新增）**：由行数组重组的映射补丁若**丢失末尾换行**，`git apply` 报 `corrupt patch at line N`——重组后必须补回文件末尾换行。' +
    '**遗留**：A1 启用时机（默认关；建议等语料与引用量增长后再评估）；`kExplore` 目前仅对弱命中生效（按设计）。',
  source: { type: '复现', ref: '本机实测 2026-10-10（_scratch/akasha-a1-review-20261010：双路树哈希 + 三层测试 + 默认关零变化对比 + 9/9 独立夹具 + 活树合并复跑）' },
  event_time: '2026-10-10',
  last_reviewed: '2026-10-10',
  tags: ['排序', 'A1', '负载均衡', '解冻', '外援验证', 'PID'],
});
console.log('已入 canon：' + rec.id);
