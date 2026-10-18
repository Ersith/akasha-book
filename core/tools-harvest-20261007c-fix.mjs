// akasha/tools/harvest-20261007c-fix.mjs
// 2026-10-07 检索修复留痕：① 新 canon（检索回退行为规格）② orphan-brief-phrase-miss 修订链 r1（修复闭环）
// ③ canon-akasha-usage 尾段更新（自举状态修正 + ⑬ 全库摘要 + ⑭ 检索计分）。
// 幂等：已有的跳过；只追加。
import { appendRecord, loadStore, currentRecords, revise } from './lib.mjs';

let added = 0; let revised = 0; let skipped = 0;

// ① 新 canon：检索回退行为规格
{
  const rec = {
    id: 'canon-search-fallback-20261007',
    claim: '检索退化修复（2026-10-07）：brief / lookup / cross 计分统一为「整词命中 ×1 + 含中文且 ≥3 字词的相邻二字（bigram）回退 ×0.25」——修复 orphan-brief-phrase-miss 实测的「多词短语零命中」。实测：原零命中查询「记忆架构 外部记忆 论文对标」修复后 brief 命中 33 条（canon 6 / orphan 1 / frontier 26）；lookup「记忆蒸馏」0→20、cross →31。强度分层保留：回退分 <1 = 弱命中（疑似相关），整词级 ≥1 = 强命中——「确定不知道」看强命中为零。测试 test.mjs 41/41（含新增 5 条回归）。',
    source: { type: '复现', ref: 'akasha/test.mjs 41/41（2026-10-07）；lib.mjs matchScore / tokenize；对照 orphan-brief-phrase-miss-20261007 的 would_confirm' },
    last_reviewed: '2026-10-07',
    tags: ['检索', '子词回退', '行为规格']
  };
  const existing = new Set(loadStore('canon').records.map(r => r.id));
  if (existing.has(rec.id)) { console.log('已存在，跳过：' + rec.id); skipped++; }
  else { appendRecord('canon', rec); console.log('已追加 [canon] ' + rec.id); added++; }
}

// ② orphan 修复闭环（修订链 r1）
{
  const id = 'orphan-brief-phrase-miss-20261007';
  const records = loadStore('orphan').records;
  if (records.some(r => r.supersedes === id)) { console.log('已修订过，跳过：' + id); skipped++; }
  else {
    const rec = records.find(r => r.id === id);
    if (!rec) { console.log('找不到：' + id); skipped++; }
    else {
      const r = revise('orphan', id, {
        observed: rec.observed + '；**当天修复（2026-10-07）**：brief / lookup / cross 统一计分（整词 ×1 + 中文 ≥3 字词的相邻二字回退 ×0.25）——同一查询命中 33 条（canon 6 / orphan 1 / frontier 26）；「记忆蒸馏」lookup 0→20、cross →31。',
        hypothesis: '已证实并修复（2026-10-07）：子词回退上线后原零命中查询命中 33 条；弱/强分层（<1 / ≥1）保留「确定不知道」语义。修复规格见 canon-search-fallback-20261007。'
      });
      console.log('已修订：' + id + ' → ' + r.id);
      revised++;
    }
  }
}

// ③ canon-akasha-usage 尾段更新（自举状态 + ⑬⑭）
{
  const cur = currentRecords(loadStore('canon').records).find(r => r.id.startsWith('canon-akasha-usage'));
  const MARK = '**已知残余缺口';
  const NEW_TAIL = '**自举状态（2026-10-07 更新）**：gate v1.1.0 起 `akasha:protocol` 为**渲染时读库**——本条目的当前版本即注入文本（读库失败回退内置兜底，`gate-armed` 记 `usageSource`）；原「硬编码 4 行、不能自举」的缺口已于同日修复（见 canon-akasha-sweep-20261007）；AGENTS.md §6 为另一外部入口。**⑬ 全库摘要**：想看「库里有什么」用 `akasha_summary` / `node akasha.mjs summary`（六库计数 + 各库最近条目 + frontier 状态分布 + 审计概要 + 最近写入）——kit 是开工动作、summary 是库全貌。**⑭ 检索计分（2026-10-07 起）**：brief / lookup / cross 命中分 = 整词 ×1 + 中文 ≥3 字词的相邻二字回退 ×0.25；**回退分 <1 = 弱命中（疑似相关），≥1 才是强命中**——「确定不知道」看强命中为零，别拿弱命中当证据。\n- 每回合的「库脉搏」行会点名最近写入的条目：看到陌生条目，先 lookup / brief 再回答。（2026-10-07 v1.3 起）';
  if (!cur) { console.log('找不到 canon-akasha-usage 当前版本'); skipped++; }
  else if (cur.claim.includes('⑬ 全库摘要')) { console.log('usage 已更新过，跳过：' + cur.id); skipped++; }
  else {
    const idx = cur.claim.indexOf(MARK);
    if (idx === -1) { console.log('usage 文本未找到旧尾段标记（' + MARK + '），跳过：' + cur.id); skipped++; }
    else {
      const r = revise('canon', cur.id, { claim: cur.claim.slice(0, idx) + NEW_TAIL });
      console.log('已修订：' + cur.id + ' → ' + r.id + '（尾段更新）');
      revised++;
    }
  }
}

console.log(`完成：新增 ${added}，修订 ${revised}，跳过 ${skipped}。`);
