// akasha/tools/harvest-20261007z13-kv-phase.mjs
// 2026-10-07 留痕：KV 压缩相位盲区论文（arXiv 2609.36322）入 frontier 基石。幂等。
import { loadStore, appendRecord, currentRecords } from '../lib.mjs';

const ID = 'front-kv-phase-sensitive-20261007';
const exists = loadStore('frontier').records.some((r) => r.id === ID);
if (exists) { console.log('已存在，跳过：' + ID); process.exit(0); }

const r = appendRecord('frontier', {
  id: ID,
  title: 'Periodic Weak Spots: Phase Sensitivity from Chunked KV-Cache Compression',
  url: 'https://arxiv.org/abs/2609.36322',
  year: 2026,
  topic: '长上下文 / KV 压缩 / 退化输出',
  status: '待验证',
  last_checked: '2026-10-07',
  next_review: '2026-11-07',
  supports: [
    '小阿卡夏·循环观测：退化/重复输出可能存在架构层周期根因（周期 ≈ 压缩步长），非纯语义波动',
    '评测纪律候选：长文评测若不扫「压缩窗口相位」，单点分数可能系统性虚高（转述，细节待核原文）'
  ],
  event_time: '2026-09-30'
});
console.log('已入库：[frontier] ' + r.id);
