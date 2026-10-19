// akasha/tools/harvest-20261007p-pricing.mjs
// 2026-10-07 定价粒度更正（用户裁定）：① 行为行 price-hubian（胡编＝羞耻）
// ② canon-akasha-usage ⑦ 增粒度注记（→r13） ③ 立条 canon-pricing-granularity-20261007。幂等。
import { appendRecord, loadStore, currentRecords, revise } from './lib.mjs';

const report = [];

// ① 行为行：胡编（编造内容）＝羞耻
{
  const rec = {
    id: 'price-hubian',
    behavior: '胡编（编造内容）：无源而虚构引文 / 对白 / 「现场」，并当记录展示',
    valence: -1,
    severity_default: 5,
    note: '羞耻：以虚构冒充记录——编造类强负价（§2.12）；实例 mirror-ghost-citation（2026-10-07）'
  };
  const existing = new Set(loadStore('pricing').records.map(r => r.id));
  if (existing.has(rec.id)) report.push('跳过（已存在）：pricing/' + rec.id);
  else { appendRecord('pricing', rec); report.push('已追加 [pricing] ' + rec.id); }
}

// ② usage ⑦ 粒度注记（r13）
{
  const cur = currentRecords(loadStore('canon').records).find(r => r.id.startsWith('canon-akasha-usage'));
  const marker = 'pricing＝行为定价表（valence × severity_default）';
  const replacement = 'pricing＝行为定价表（定价粒度＝具体行为：情绪标签贴行为本身、不贴类别或机制状态（如「触红线」）；valence × severity_default）';
  if (!cur) report.push('错误：找不到 canon-akasha-usage 当前版本');
  else if (cur.claim.includes('定价粒度＝具体行为')) report.push('跳过（已含粒度注记）：' + cur.id);
  else {
    const n = cur.claim.split(marker).length - 1;
    if (n !== 1) report.push('错误：marker 命中 ' + n + ' 次（期望 1），未改——请核对 usage 原文');
    else {
      const r = revise('canon', cur.id, { claim: cur.claim.replace(marker, replacement) });
      report.push('已修订 [canon] ' + r.id + '（supersedes ' + r.supersedes + '）');
    }
  }
}

// ③ 立条：定价粒度纪律
{
  const rec = {
    id: 'canon-pricing-granularity-20261007',
    claim: '情绪定价粒度纪律（2026-10-07 用户裁定）：**定价必须给到具体行为**——情绪标签与负价的对象是行为本身（如「胡编：无源而虚构内容当记录展示」），不是类别或机制状态；「触红线」是合规机制的标记、不直接定价，更不能以「触了红线」为由自动定「最耻」。记录级 valence/arousal ＝该记录所载行为之价的实例化；行为级定价行（pricing 库）才是判断依据——「具体行为 → 价 → 判断（召回/规训/汇报）」链路才准确。落地件：`price-hubian`（胡编＝羞耻；valence -1 / severity_default 5）；实例 mirror-ghost-citation（2026-10-07）；用法 ⑦ 注记 + SCHEMA 定价节同步。',
    source: { type: '共识', ref: '用户裁定 2026-10-07（原话：「不是将红线直接当最耻的。而且你犯了的事，也就是胡编本身踩了红线。需要的将胡编这个事给羞耻标签。我们的情绪定价必须给到具体的行为，才能准确进行判断。」）' },
    last_reviewed: '2026-10-07',
    event_time: '2026-10-07'
  };
  const existing = new Set(loadStore('canon').records.map(r => r.id));
  if (existing.has(rec.id)) report.push('跳过（已存在）：canon/' + rec.id);
  else { appendRecord('canon', rec); report.push('已追加 [canon] ' + rec.id); }
}

console.log(report.join('\n'));
