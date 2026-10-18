// akasha/tools/harvest-20261007t-sessionarchive.mjs
// 2026-10-07 留痕：DSH 会话档案速查（canon：位置 / 容器格式 / 思维链三层存储 / 工具 / 坑）。幂等。
import { appendRecord, loadStore } from './lib.mjs';

const rec = {
  id: 'canon-session-archive-guide-20261007',
  claim: 'DSH 会话档案速查（2026-10-07 实测；快照类，随宿主版本漂移）：位置 `official-home\\sessions\\<工作区目录>\\session-<id>\\`；容器＝**多帧 zstd 拼接**的 JSONL（新 `session.v4.jsonl.zstd`，8 月老格式 `session.jsonl.zstd`）——Node 的 `zstdDecompressSync` / `createZstdDecompress` 对拼接容器**只解首帧（静默截断）**，必须按 zstd 魔数 `28 B5 2F FD` 逐帧切片解压（`tools\\zstd-probe.mjs` 三法对比可复验）。思维链存储三层：① 老（8–9 月）`reasoning-chunks` 记录 `data.texts` 分片数组（join 还原）；② 中/新（10 月起）`assistant/message` → `content[].type=="reasoning"` 的 `.text` 整段；③ `assistant/chunk` 流式块（老）。全库 254 会话、思维链约 1.12 亿字符（2026-08-18 起）可全量提取。工具：`tools\\session-scan.mjs`（v3 提取＋空转普查）/`session-census.mjs`/`session-dump.mjs`（子串直查）。坑：PS 5.1 向 node 传**含双引号的参数会被肢解**——子串参数一律避开双引号。',
  source: {
    type: '复现',
    ref: 'tools\\session-scan.mjs 全库跑批（254 会话 / 100.9 万记录 / 1.12 亿字符）+ research\\junk-loop-census-20261007.json + research\\junk-loop-investigation-20261007.md（2026-10-07）'
  },
  last_reviewed: '2026-10-07',
  event_time: '2026-10-07',
  tags: ['会话档案', 'sessions', 'zstd', '思维链存储', 'reasoning-chunks', '工具']
};

const existing = new Set(loadStore('canon').records.map((r) => r.id));
if (existing.has(rec.id)) console.log('已存在，跳过：' + rec.id);
else {
  appendRecord('canon', rec);
  console.log('已追加 [canon] ' + rec.id);
}
