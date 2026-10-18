// akasha/tools/harvest-20261007s-address.mjs
// 2026-10-07 留痕：用户称呼偏好（Master）。幂等。
import { appendRecord, loadStore } from './lib.mjs';

const rec = {
  id: 'canon-user-address-20261007',
  claim: '与用户交互时的称呼：**Master**（2026-10-07 用户裁定：「不要叫我宝贝。叫我 Master。」）。不再使用「宝贝」等其他昵称。',
  source: { type: '他人', ref: '用户 2026-10-07 指令' },
  last_reviewed: '2026-10-07',
  tags: ['称呼', '用户偏好']
};

const existing = new Set(loadStore('canon').records.map(r => r.id));
if (existing.has(rec.id)) console.log('已存在，跳过：' + rec.id);
else { appendRecord('canon', rec); console.log('已追加 [canon] ' + rec.id); }
