// akasha/tools/harvest-20261007l-origin.mjs
// 2026-10-07 源头补录：① canon-akasha-origin-20261006（源头事件链+入库缺口+路由修正）
// ② mirror-creeper-panic（苦力怕现代寓言镜像）③ usage → r12（四源→五源路由）。幂等。
import { appendRecord, loadStore, currentRecords, revise } from './lib.mjs';

let added = 0; let revised = 0; let skipped = 0;

// ① canon 源头条
{
  const id = 'canon-akasha-origin-20261006';
  const existing = new Set(loadStore('canon').records.map(r => r.id));
  if (existing.has(id)) { console.log('已存在，跳过：' + id); skipped++; }
  else {
    appendRecord('canon', {
      id,
      claim: '阿卡夏之书·源头（2026-10-06）：项目的起点事件是「GPT 玩 Minecraft 被苦力怕炸死」——模型受创后反复把「防御条规」写进 md 备忘录，直到撑爆上下文、行为退化为「疯狂种土豆」。用户由这个观察提出「AI 时刻在看记事本」（人类只看潜意识里那一条「苦力怕=疼」）。当日讨论历经四轮往返（观察 → 拆解 → 设计 → 驳回与修正），产出「写傻读精 / 库无界、装载有界 / 痛=定价机 / 睡眠=离线巩固」等全部核心公理，继而收敛为设计稿并开工。**入库缺口（教训）**：这串决定性讨论当时只存进 OpenViking 跨会话记忆（events 2026-10-06「AI 记忆架构共识达成」），未入阿卡夏六库——2026-10-07 写论文溯源时 `cross 苦力怕` 零命中，险些继续以二手收敛稿重构。**路由修正**：四源路由扩为五源——模型内 → skill → 本地书库（阿卡夏）→ 并存记忆层（OpenViking / Hindsight）→ 网页（usage r12）。补录：本条 + mirror-creeper-panic（现代寓言镜像）。',
      source: { type: '复现', ref: 'OpenViking events `viking://user/default/peers/H--Harness/memories/events/2026/10/06/AI记忆架构共识达成.md`（讨论全文）；设计稿 research/ai-memory-architecture-20261006.md；论文 v0.3 §1.4 切片一/二' },
      last_reviewed: '2026-10-07',
      tags: ['源头', '苦力怕', '五源路由', '入库缺口']
    });
    console.log('已追加 [canon] ' + id); added++;
  }
}

// ② mirror 苦力怕镜像
{
  const id = 'mirror-creeper-panic';
  const existing = new Set(loadStore('mirror').records.map(r => r.id));
  if (existing.has(id)) { console.log('已存在，跳过：' + id); skipped++; }
  else {
    appendRecord('mirror', {
      id,
      story: '2026-10-06 · GPT 玩 Minecraft（用户转述的真实案例）',
      situation: '突发伤害之后：不分轻重地囤积防御规则，把「教训」直接写成长篇条规',
      behavior: '每条经验都落成 md 备忘录、只增不减、互相冲突（「见苦力怕就跑」vs「要建防爆墙」）',
      outcome: '上下文撑爆、信噪比崩坏，行为退化为「疯狂种土豆」——不是遗忘，是故障',
      social_reaction: '用户把它拎出来当镜子：AI 时刻在看记事本；人类只看潜意识里那一条「苦力怕=疼」',
      emotion: '恐惧与伤害的错价——计量单位错了：按频次记账，而不是按代价'
    });
    console.log('已追加 [mirror] ' + id); added++;
  }
}

// ③ usage → r12（四源 → 五源）
{
  const cur = currentRecords(loadStore('canon').records).find(r => r.id.startsWith('canon-akasha-usage'));
  const OLD = '**② 四源路由**：模型内记忆 → skill → 本地书库 → 网页；';
  const NEW = '**② 五源路由（2026-10-07 扩）**：模型内记忆 → skill → 本地书库（阿卡夏）→ 并存记忆层（OpenViking / Hindsight——偏好、源头讨论、跨项目事实常在此）→ 网页；';
  if (!cur) { console.log('找不到 usage 条'); skipped++; }
  else if (cur.claim.includes('五源路由')) { console.log('usage 已更新过，跳过：' + cur.id); skipped++; }
  else if (!cur.claim.includes(OLD)) { console.log('usage 未找到四源路由句，跳过：' + cur.id); skipped++; }
  else {
    const r = revise('canon', cur.id, { claim: cur.claim.replace(OLD, NEW) });
    console.log('已修订：' + cur.id + ' → ' + r.id + '（四源→五源路由）'); revised++;
  }
}

console.log(`完成：新增 ${added}，修订 ${revised}，跳过 ${skipped}。`);
