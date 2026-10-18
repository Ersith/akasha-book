// akasha/tools/harvest-20261008z26-npm-publish.mjs
// 2026-10-08 留痕：npm 发布轨开通（五件上线）→ 交付链修订。幂等。
import { loadStore, revise, currentRecords } from './lib.mjs';

const APPENDIX =
  ' **npm 发布轨开通（2026-10-08）**：组织 **`akasha-book`** 建立（owner ersith）后，**`@akasha-book/{gate@1.2.0, hooks@1.2.0, sleep@1.5.1, session@0.2.4, mcp@1.0.0}` 五件全部上线**（registry dist-tags.latest + 消费者侧 `npm pack` 拉取双重实证）。过程：首轮发布经 **staged publishing**（公开面短暂 `0.0.0-stage` 占位；重发 409「previously staged version」；`npm stage list` 对该档不透视）→ 放行转正。**token 教训入册**：granular token 必须选「Read and write (publish and stage)」——「stage only」会把发布路由进暂存队列；发布 token 带 Bypass 2FA 免 OTP；首枚 stage-only token 待用户回收。README 已加 npm 安装行；GitHub Release 仍为主渠道之一。';

const tips = currentRecords(loadStore('canon').records);
const tip = tips.find((r) => r.id.startsWith('canon-oss-package-20261007'));
if (!tip) { console.log('未找到 oss 链尾'); process.exit(1); }
if (tip.claim.includes('npm 发布轨开通（2026-10-08）')) { console.log('已含 npm 段，跳过：' + tip.id); process.exit(0); }
const r = revise('canon', tip.id, { claim: tip.claim + APPENDIX });
console.log('已修订：' + tip.id + ' → ' + r.id);
