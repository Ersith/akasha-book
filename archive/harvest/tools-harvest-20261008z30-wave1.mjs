// akasha/tools/harvest-20261008z30-wave1.mjs
// 2026-10-08 留痕：外援 wave1 合并上线（OSS 91f3e8a + 活树移植）→ oss-package 链。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const tips = currentRecords(loadStore('canon').records);
const oss = tips.find((r) => r.id.startsWith('canon-oss-package-20261007'));
if (!oss) { console.log('未找到 oss 链尾'); process.exit(1); }
if (oss.claim.includes('外援 wave1 上线')) { console.log('已含，跳过：' + oss.id); process.exit(0); }
const r = revise('canon', oss.id, {
  claim: oss.claim +
    ' **外援 wave1 上线（2026-10-08）**：Claude 分支 `wave1/recall-mirror` 九补丁双落地——OSS `git am` 后推送 `91f3e8a`（同批同步器加固：默认值 homedir 化 + 包名映射 `@akasha-book/{gate,hooks,sleep,session,mcp}`；幂等复验零残差）；活树三方合并 14 文件后核心 **111/111**、四插件全绿（session 20/20）。修掉：门控默认路径 `~` 字面量失效、`retire --hard` 事务性、B1 压缩假宣称「已收入」、B2 召回漏计数按会话分区、镜像 role（解法/边界）。细则见 CHECKS **R13**。'
});
console.log('已修订：' + oss.id + ' → ' + r.id);
