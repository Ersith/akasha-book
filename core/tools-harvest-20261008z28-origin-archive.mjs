// akasha/tools/harvest-20261008z28-origin-archive.mjs
// 2026-10-08 留痕：立项讨论存档出炉 → canon 用法条目追加指针。幂等。
import { loadStore, currentRecords, revise } from '../lib.mjs';

const APPENDIX =
  ' **立项讨论存档（2026-10-08）**：`research\\session-layer-origin-discussion-20261008.md`——时间线＋用户原话（#368 立项 / #414 同库修正 / #435 不白搞 / #456 用法分级 / f362b992 #2754、#2778 验证）＋seg 指针清单；素材＝会话档案原文＋会话层回捞（复核脚本在 `_scratch`）。';

const tips = currentRecords(loadStore('canon').records);
const tip = tips.find((r) => r.id.startsWith('canon-session-layer-usage-20261007'));
if (!tip) { console.log('未找到 session-layer-usage 链尾'); process.exit(1); }
if (tip.claim.includes('立项讨论存档（2026-10-08）')) { console.log('已含，跳过：' + tip.id); process.exit(0); }
const r = revise('canon', tip.id, { claim: tip.claim + APPENDIX });
console.log('已修订：' + tip.id + ' → ' + r.id);
