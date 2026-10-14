// akasha/tools/harvest-20261008z36-npm-republish.mjs
// 2026-10-08 留痕：npm 重发三件（gate/hooks/session）+ 隐私双扫证据。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const tips = currentRecords(loadStore('canon').records);
const oss = tips.find((r) => r.id.startsWith('canon-oss-package-20261007'));
if (!oss) { console.log('未找到 oss 链尾'); process.exit(1); }
if (oss.claim.includes('npm 重发三件')) { console.log('已含，跳过：' + oss.id); process.exit(0); }
const r = revise('canon', oss.id, {
  claim: oss.claim +
    ' **npm 重发三件（2026-10-08 深夜）**：`gate@1.2.1` / `hooks@1.2.1` / `session@0.2.5` 上线（latest 已指向新版本；注册表 integrity 与本地 sha512 **三件全等**；gate/session tarball 拉回**逐字节相同**；hooks tarball 端点短暂 404 已设后台重试，不通则发 1.2.2）。**隐私双扫零命中**（本地发送物 12 文件 + 注册表拉回物 8 文件 ×17 类强模式；包内仅 4 类文件）。细则 CHECKS **R19**。token 轮换仍待用户侧。'
});
console.log('已修订：' + oss.id + ' → ' + r.id);
