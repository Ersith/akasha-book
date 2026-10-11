// akasha/tools/harvest-20261010z85-store-hold.mjs
// 2026-10-10：STORE 上架挂起（用户裁定）。幂等。
import { loadStore, currentRecords, revise } from '../lib.mjs';

const rec = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-dsh-store-remediation'));
if (!rec) { console.log('未找到条目'); process.exit(0); }
const marker = '**挂起裁定（2026-10-10）**';
if (rec.claim.includes(marker)) { console.log('已记录，跳过：' + rec.id); process.exit(0); }
const add = ' ' + marker + '：用户原话「先不提交——本地 100/100 挂着，等 alpha 复测完再说」⇒ **上架提交挂起**（不催、不代提交）；本地保持 100/100 与 `EVIDENCE.json` 在架。**挂起后的执行顺序（已写入 `docs\\memo-20261010.md` 五节）**：① 用 `0.2.1-alpha.1` / `0.2.1-alpha.2` 的 DSH CLI（一次性 DSH_HOME）重跑 `akasha/tools/store-e3-20261010.mjs --cli <该版本 bin.js>`；② 按结果把两份 alpha 从 `unknown` 改精确值并复评推送；③ 授权后再提 5 条 `tree/main/plugins/<name>` 子路径。⚠ 记住：STORE 的「同一人全局只联系一次」名额已用掉，后续只能自己提交。';
const next = revise('canon', rec.id, { claim: rec.claim + add, last_reviewed: '2026-10-10' });
console.log('已记录：' + rec.id + ' → ' + next.id);
