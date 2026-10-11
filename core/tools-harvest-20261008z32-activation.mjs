// akasha/tools/harvest-20261008z32-activation.mjs
// 2026-10-08 留痕：插件换装（wave1/§1 运行时激活批）。幂等。
import { loadStore, currentRecords, revise } from '../lib.mjs';

const tips = currentRecords(loadStore('canon').records);
const oss = tips.find((r) => r.id.startsWith('canon-oss-package-20261007'));
if (!oss) { console.log('未找到 oss 链尾'); process.exit(1); }
if (oss.claim.includes('插件换装')) { console.log('已含，跳过：' + oss.id); process.exit(0); }
const r = revise('canon', oss.id, {
  claim: oss.claim +
    ' **插件换装（2026-10-08 晚）**：gate/hooks → `1.2.1`、session → `0.2.5`；npm pack + install_bundle ×3 完成（restart-required），安装副本 sha 核验一致——**待下次重启生效**（门控命令展开 / hooks 会话分区 / B1 诚实横幅）。npm registry 重发待择时。细则 CHECKS **R15**。'
});
console.log('已修订：' + oss.id + ' → ' + r.id);
