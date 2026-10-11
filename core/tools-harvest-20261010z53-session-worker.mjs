// akasha/tools/harvest-20261010z53-session-worker.mjs
// 2026-10-10：会话层索引 worker 化（v0.4）入库。幂等。
import { loadStore, currentRecords, appendRecord } from '../lib.mjs';

const canon = currentRecords(loadStore('canon').records);
if (canon.some((r) => r.id.startsWith('canon-session-worker-v04'))) {
  console.log('已存在，跳过');
} else {
  const rec = appendRecord('canon', {
    id: 'canon-session-worker-v04-20261010',
    claim:
      '**小阿卡夏 v0.4：索引 worker 化（2026-10-10，用户指令「结合最近的所学，试试小阿卡夏 worker 化」）**。' +
      '**基线（先看数据）**：hooks.jsonl 318 条索引中单次 770-1565ms（slow 线 5 条、最坏 2802ms），宿主事件循环 lagMs p50=8/p90=15/max=225。' +
      '**架构**：宿主回调只投递（`postMessage`，µs 级返回）+ 常驻 worker 线程（apply 即预热）串行执行、同会话排队去重；`indexSession` 以 `session-meta.json.lock` 串行化（复用 lib.withFileLock；锁 meta 而非 store——避开与 appendSegments 的 store 锁嵌套死等）；退出协议 quit→drain→close（5s 兜底强杀）；降级链 `indexMode: worker|inline`（**连续** 3 次失败降级，任何成功回零）。' +
      '**实测**：部署后首活 `session-worker queued` → `session-index via=worker ms=840 hostMs=0 lagMs=10 added=33`；大档案对照 2.1MB：inline 宿主阻塞 161ms → 投递 0.06ms；真档案（17.53MB 本会话）1267ms → 0.37ms。' +
      '**观测语义变更**：`session-index` 新增 `via`/`hostMs`；**slow 线此后表示"后台耗时>1.5s"，宿主卡顿看 hostMs/lagMs**。' +
      '**测试**：插件自测 22/22（新增 worker 投递 + inline 降级两条）、mock 6/6、核心套件 120/120（锁回归）、OSS 版 selftest 22/22。' +
      '**过程中踩到并修掉的真问题**：① "连续失败"实现成"累计"（成功不回零）→ 已修；② OSS 同步脚本只认 lib/index.js、不含 index-worker.mjs → 已补同步 + package.json files 白名单（否则 OSS 版插件"宿主投递、worker 文件不存在"）；③ selftest 用同步语义断言 → 5 条老用例切 inline 模式保语义、新增异步 worker 用例；④ worker 线程让事件循环不归零 → "全绿但进程挂着" → 收尾显式 exit。' +
      '**未覆盖面（如实）**：worker 崩溃丢 pending 后靠下轮重跑（未直接测）；同会话排队去重未单测（时序敏感）；锁等待上限 5s（lib.withFileLock 固定口径）。备份 `_rollback-20261010-session-v04\\`；回退 = `indexMode:"inline"` 或还原备份。',
    source: { type: '复现', ref: '本机实测 2026-10-10（hooks.jsonl 部署前后对照、_scratch\\session-worker-v04 测试与 bench、selftest 22/22、OSS 同步与 OSS selftest 22/22）' },
    event_time: '2026-10-10',
    last_reviewed: '2026-10-10',
    tags: ['会话层', 'worker', '性能', '插件v0.4', 'OSS', '教训'],
  });
  console.log('已入 canon：' + rec.id);
}
