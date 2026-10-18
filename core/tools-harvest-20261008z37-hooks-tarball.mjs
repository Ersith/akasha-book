// akasha/tools/harvest-20261008z37-hooks-tarball.mjs
// 2026-10-08 留痕更正：hooks tarball 端点恢复（传播时差），三件拉回物齐。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const tips = currentRecords(loadStore('canon').records);
const oss = tips.find((r) => r.id.startsWith('canon-oss-package-20261007'));
if (!oss) { console.log('未找到 oss 链尾'); process.exit(1); }
if (oss.claim.includes('hooks tarball 已恢复')) { console.log('已含，跳过：' + oss.id); process.exit(0); }
const r = revise('canon', oss.id, {
  claim: oss.claim +
    ' **更正（深夜）**：`hooks` tarball 端点已恢复（HTTP 200 / 5091B / 哈希与本地全等）——三件注册表拉回物**全部逐字节等同本地**，隐私双扫（本地 12 + 拉回 8 文件，17 类强模式）零命中。'
});
console.log('已修订：' + oss.id + ' → ' + r.id);
