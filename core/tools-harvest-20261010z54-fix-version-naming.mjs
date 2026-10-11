// akasha/tools/harvest-20261010z54-fix-version-naming.mjs
// 2026-10-10：修正 z53 条目里的版本命名（插件实际 0.3.0；"v0.4" 是会话层计划队列编号）。幂等，走修订链。
import { loadStore, currentRecords, revise } from '../lib.mjs';

const canon = currentRecords(loadStore('canon').records);
const rec = canon.find((r) => r.id.startsWith('canon-session-worker-v04'));
if (!rec) { console.log('未找到条目，跳过'); process.exit(0); }
if (rec.claim.includes('插件版本 0.3.0') || rec.claim.includes('（插件 @local/akasha-session 0.3.0）')) {
  console.log('命名已修正，跳过：' + rec.id);
  process.exit(0);
}
const claim = rec.claim
  .replace('**小阿卡夏 v0.4：索引 worker 化', '**小阿卡夏索引 worker 化（会话层计划队列 v0.4 项；插件 `@local/akasha-session` **0.3.0**）')
  .replace('**v0.4.0', '**0.3.0');
const tags = [...new Set((rec.tags ?? []).map((t) => (t === '插件v0.4' ? '插件v0.3.0' : t)))];
const next = revise('canon', rec.id, { claim, tags, last_reviewed: '2026-10-10' });
console.log('已修订：' + rec.id + ' → ' + next.id);
