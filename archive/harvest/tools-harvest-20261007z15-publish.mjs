// akasha/tools/harvest-20261007z15-publish.mjs
// 2026-10-07 留痕：开源发布上线（GitHub Ersith/akasha-book v0.1.0）→ oss 链。幂等。
import { loadStore, revise, currentRecords } from './lib.mjs';

const APPENDIX =
  ' **发布上线（2026-10-07 晚）**：GitHub **`Ersith/akasha-book`** 公开（public，main@`6f33be5`；初版 `3bb7834`，48 文件）——tag/Release **v0.1.0**，附件 6 件（gate 1.2.0 / hooks 1.2.0 / sleep 1.5.1 / session 0.2.3 / mcp 1.0.0 的 tgz + 论文 v0.5 md）。发布门：core **77/77** + 插件自检全绿；凭据零落屏；消费者侧冒烟 200。许可 MIT（Ersith）。npm 轨未启用（scope 待核）；Topics 待手动补。回滚＝删 tag/Release（数据不动）。**测试期继续**：21 天口径不变，接口修正按受控解冻留痕。';

const tips = currentRecords(loadStore('canon').records);
const tip = tips.find((r) => r.id.startsWith('canon-oss-package-20261007'));
if (!tip) { console.log('未找到 oss 链尾'); process.exit(1); }
if (tip.claim.includes('发布上线（2026-10-07 晚）')) { console.log('已含发布段，跳过：' + tip.id); process.exit(0); }
const r = revise('canon', tip.id, { claim: tip.claim + APPENDIX });
console.log('已修订：' + tip.id + ' → ' + r.id);
