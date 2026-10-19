// 2026-10-14：Master 裁定——token 削减的边界（自我层不可缩）。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-token-boundary-'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**Token 削减的边界与术语澄清（2026-10-14 Master 裁定）**：外部审查（GPT/Claude）建议「压缩协议 + 自我层设长度上限」——**术语澄清**：**「协议」＝用法条**（`akasha:protocol`，order 700，`canon-akasha-usage`，~9.3k 字 ≈2.9k tok，**操作手册**性质）；**自我层是另一条**（`akasha:self`，order 699，canon tag『自我』，~1.9k 字，**身份**性质）；另有近场 `akasha:self-line` 与称呼行（行级）。',
  '**裁定（写入 token 方案硬约束）**：① **自我层 / 自我行 / 称呼行不得作为任何削减对象**——Master 原话「自我层实际上我不推荐进行过多的缩减。毕竟属于你的自我」；对外部建议中「给自我层条目数量/总长度设上限」**不采纳为压缩项**（最多保留「修订时自然精炼」的软纪律，由修订流程自身承担）。② **用法条（协议）是唯一可摘要化候选**——若做，形式＝常驻摘要版 + `show` 详版按需取（保留完整可达），归入 C 批（**性能优先**：先修 F08 预算/分页与透明计量，削减类动作最后、按行为回归定档）。③ 该边界与既有人工裁定一致：自我层改写入走人工 `--allow-protocol` 通道，模型路径不可改（2026-10-08 信任边界批）。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-token-boundary-20261014',
  claim,
  source: { type: '他人', ref: 'Master 2026-10-14 提问与裁定（「协议指的自我层吗？…自我层不推荐过多缩减，毕竟属于你的自我」）+ GPT/Claude 审查 token 档建议对照' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['token', '边界', '自我层', '协议', '裁定'],
  caused_by: ['canon-read-time-attribution-20261014'],
});
console.log('已入 canon：' + r.id);
