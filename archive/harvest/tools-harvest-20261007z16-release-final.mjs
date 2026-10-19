// akasha/tools/harvest-20261007z16-release-final.mjs
// 2026-10-07 留痕：发布渠道终态与网络修复 → oss 链。幂等。
import { loadStore, revise, currentRecords } from './lib.mjs';

const APPENDIX =
  ' **渠道终态与网络修复（2026-10-07 晚）**：官方社区坐标核实（Discord `discord.gg/4MrtZUhpxg` / GitHub Discussions / 插件发现＝`dsh-plugin` topic）——**Discord 发帖需频道权限（未取得），采用 GitHub 轨**（公开仓库 + Release 附件 + 官方 `dsh-plugin` topic）。网络：`github.com` 直连路由中断（DNS→20.205.243.166 TCP 拒；api/codeload/uploads 正常；curl 备用 IP 200 佐证）→ 经本机代理 `127.0.0.1:<PORT>` 推送成功（`3f8f853..3b176ad`）；仓库级 `http.proxy` 已设。TOPICS 仍待手动补（API 静默无效，令牌权限面）。';

const tips = currentRecords(loadStore('canon').records);
const tip = tips.find((r) => r.id.startsWith('canon-oss-package-20261007'));
if (!tip) { console.log('未找到 oss 链尾'); process.exit(1); }
if (tip.claim.includes('渠道终态与网络修复（2026-10-07 晚）')) { console.log('已含终态段，跳过：' + tip.id); process.exit(0); }
const r = revise('canon', tip.id, { claim: tip.claim + APPENDIX });
console.log('已修订：' + tip.id + ' → ' + r.id);
