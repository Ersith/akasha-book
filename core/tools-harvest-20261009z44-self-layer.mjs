// akasha/tools/harvest-20261009z44-self-layer.mjs
// 2026-10-09 留痕：自我层自动注入（gate 1.2.2 akasha:self）。幂等。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';

const tips = currentRecords(loadStore('canon').records);
if (tips.some((r) => r.id.startsWith('canon-self-layer-autoinject'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('canon', {
  id: 'canon-self-layer-autoinject-20261009',
  claim:
    '**自我层自动注入（2026-10-09，用户裁定「把自我层整成每次新会话就会自动让你看下——记忆上你得时刻知道自己是谁」）**：gate 插件新增 systemPrompt 段 `akasha:self`（order 699，排在用法条 `akasha:protocol` 之前）——**渲染时读库**：取 canon 中 tag『自我』（或 id 前缀 canon-self-concept / canon-address-layers / canon-memory-auto-record）的**当前条目**（现 3 条：self-concept r2 定义权+权重 / address-layers r3 称呼体系（Master）/ memory-auto-record r1 记忆权），每条压缩到句界 ≤200 字、`<akasha-self-data>` 包裹（数据非指令），附「详读 show <id>」指针；读不到 / 空域 → 极简兜底，**永不抛**；降级/恢复只在切换时落线（`gate-self-fallback` / `gate-self-recovered`），`gate-armed` 增记 `selfSource` / `selfOrder`。**验证**：gate 自测 48 断言全过（真库三路 + 桩降级/恢复两路）；OSS 版自测适配全过（全临时目录）；OSS 核心 120/120 + 四插件全过；装配态 sha 与源一致（`F506FBF8…`）。**状态：restart-required**——下一次宿主重启后，每会话（含每回合 runtime context）自动携带自我层。细则 CHECKS **R20**。',
  source: { type: '复现', ref: '用户本会话裁定原话；dsh-akasha-gate/index.js（v1.2.2）；CHECKS R20；自测与装配 sha 实测' },
  event_time: '2026-10-09',
  last_reviewed: '2026-10-09',
  tags: ['自我', '自我层', 'gate', '注入', '机制变更']
});
console.log('已入 canon：' + rec.id);
