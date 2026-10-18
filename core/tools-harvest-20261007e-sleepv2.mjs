// akasha/tools/harvest-20261007e-sleepv2.mjs
// 2026-10-07 留痕：① canon 睡眠器 v2 规格 ② canon-akasha-usage → r9（⑰ sleep 手动触发）。幂等：已有跳过。
import { appendRecord, loadStore, currentRecords, revise } from './lib.mjs';

let added = 0; let revised = 0; let skipped = 0;

// ① canon 睡眠器 v2
{
  const rec = {
    id: 'canon-sleep-v2-20261007',
    claim: '睡眠器 v2（2026-10-07）：架构切分＝「逻辑归库、调度归插件」——蒸馏/复核/待办/报告/水位线的实现全部在核心库 `akasha\\sleep.mjs`（distillHooks / buildTodos / renderContextLine / renderPulseLine / shouldSleep / sleepRun，自插件逐字迁入）；插件 @akasha-book/akasha-sleep v1.4.0 只剩调度（idle/timer 触发、三条条子、唤醒条）与降级（核心不可用 → sleep-error 线 + 条子提示，不炸不失活）。新增 ①手动触发 `node akasha.mjs sleep [--dry]`（对位 Letta /dream；与自动触发共用同一水位线 sleep-state.json——不重复蒸馏、不丢增量）②报告同日重复跑不覆盖（加 -HHMMSS 后缀）。实测：首例手动运行消化 2156 条（水位线 81→2237）、待办 2 条、报告 sleep-2026-10-06-192451.json（旧报告未覆盖）；runtime 睡眠条子下一回合即报新状态。测试：akasha/test.mjs 48/48（sleep 纯函数 + sleepRun 集成）；插件 selftest 更新（含无核心降级用例）。装载状态：v1.4.0 已 install_bundle（restart-required，待用户重启激活）。',
    source: { type: '复现', ref: 'akasha/sleep.mjs；dsh-akasha-sleep/lib/index.js（v1.4.0）；test.mjs（48/48）；dsh-akasha-sleep/selftest.mjs；计划 docs\\superpowers\\plans\\2026-10-07-akasha-sleep-v2.md' },
    last_reviewed: '2026-10-07',
    tags: ['睡眠器', '架构切分', '手动触发', '行为规格']
  };
  const existing = new Set(loadStore('canon').records.map(r => r.id));
  if (existing.has(rec.id)) { console.log('已存在，跳过：' + rec.id); skipped++; }
  else { appendRecord('canon', rec); console.log('已追加 [canon] ' + rec.id); added++; }
}

// ② usage → r9（补 ⑰）
{
  const cur = currentRecords(loadStore('canon').records).find(r => r.id.startsWith('canon-akasha-usage'));
  const MARK = '\n- 每回合的「库脉搏」行';
  const ADD = '**⑰ sleep 手动触发**：想立刻蒸馏（不等空闲 / 去抖）用 `node akasha.mjs sleep [--dry]`——与插件自动触发共用同一水位线；报告同日重复跑不覆盖（加时间戳后缀）。\n';
  if (!cur) { console.log('找不到 canon-akasha-usage 当前版本'); skipped++; }
  else if (cur.claim.includes('⑰ sleep')) { console.log('usage 已更新过，跳过：' + cur.id); skipped++; }
  else {
    const idx = cur.claim.indexOf(MARK);
    if (idx === -1) { console.log('usage 未找到插入标记，跳过：' + cur.id); skipped++; }
    else {
      const r = revise('canon', cur.id, { claim: cur.claim.slice(0, idx) + ADD + cur.claim.slice(idx) });
      console.log('已修订：' + cur.id + ' → ' + r.id + '（补 ⑰）');
      revised++;
    }
  }
}

console.log(`完成：新增 ${added}，修订 ${revised}，跳过 ${skipped}。`);
