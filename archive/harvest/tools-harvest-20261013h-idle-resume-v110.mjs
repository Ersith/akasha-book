// akasha/tools/harvest-20261013h-idle-resume-v110.mjs
// 2026-10-13 深夜：行为层重挂记录（I-12b）+ 旧「删除」条目的重挂指针 + 用法条 ㉖（受控路径）。幂等。
import { loadStore, currentRecords, appendRecord, revise } from './lib.mjs';

const cur = () => currentRecords(loadStore('canon').records);
const have = (prefix) => cur().some((r) => String(r.id).startsWith(prefix));

if (have('canon-idle-resume-v110-20261013')) console.log('= 重挂记录已存在');
else {
  const r = appendRecord('canon', {
    id: 'canon-idle-resume-v110-20261013',
    claim:
      '**行为层重挂（2026-10-13 深夜；Master 裁定「重挂吧」；sleep v1.10.0-h1 · 默认关 · 待重启激活）**——旧钩子（1.8.x「流无正文」判据）同夜被删（canon-idle-hook-removed-20261013：形态 A 误报 + 扰动循环）；本版按机制报告 §⑥ 与 Claude 复审（单独开关 / 默认关 / 先观测）重写。' +
      '**判据收窄**：**形态 B ＝ 无正文 + 无工具**（A 形态＝有工具的正常中间步骤，**绝不报**）；先兆信号＝思维链尾部「好。」（强，11× 危险比）/「。」（弱，默认不动手，`idleResumeOnWeak` 可放宽）。' +
      '**三条防线**：① **干预默认关**（`idleResume:false`——观测线 `idle-shape` 无论开关都落，先收数据）；② **防扰动循环**（冷却 5 分钟 + 单会话限次 3）；③ **注入文案按 §⑥**（禁列清单 / 禁打勾 / 禁「。」收尾；想一条做一条）。' +
      '**实现（dsh-akasha-sleep v1.10.0-h1）**：纯函数 `judgeIdleTurn`（导出、可测）+ `agent/assistant-stream` 收帧（text-delta / tool-call-delta / reasoning-delta 尾窗 32 字）+ `agent/turn-stopping` 判定与重置；注入＝`agent.inject(createUserMessage{ source.kind: "akasha-idle-resume" })`；子代理跳过；全路径 try/catch（观测不拖垮宿主）。' +
      '**验证**：selftest 全过（新测试组：三形态 / 两信号 / 默认关只观测 / 开闸限次 3 / source 标记 / A·正文·子代理不注入）；`npm pack` 5 文件、profile **实装 1.10.0-h1（application: restart-required）**——**因 LoRA 会话在跑，本轮不重启；下次桌面端重启时激活**。' +
      '**激活后待验（观测项）**：`idle-shape` 线开始落（形态分布 A/B）、开闸后是否有效拉回且**不复发扰动循环**（对照旧案：抢险注入被写进思考链）。',
    source: { type: '复现', ref: 'dsh-akasha-sleep v1.10.0-h1（lib/index.js judgeIdleTurn/IDLE_RESUME_TEXT + selftest 新组）+ plugin_manager 安装记录 + canon-idle-mechanism-20261013-r1 / canon-idle-hook-removed-20261013' },
    event_time: '2026-10-13',
    last_reviewed: '2026-10-13',
    tags: ['I-12b', '行为层', '重挂', '形态B', 'sleep插件', '待重启'],
  });
  console.log('已入 canon：' + r.id);
}

// 旧「删除」条目的重挂指针（修订链追加）
const removed = cur().find((r) => String(r.id).startsWith('canon-idle-hook-removed-20261013'));
if (!removed) console.log('未找到 canon-idle-hook-removed-20261013');
else if (String(removed.claim).includes('重挂为 sleep')) console.log('= 删除条目已含重挂指针');
else {
  const r = revise('canon', removed.id, {
    claim: removed.claim +
      ' **（2026-10-13 深夜更新）**：经 Master 裁定「重挂吧」，已按**收窄判据**（形态 B + 强信号「好。」+ 默认关 + 冷却/限次）重挂为 sleep **v1.10.0-h1**（待重启激活）——见 `canon-idle-resume-v110-20261013`。本条「删除」记录的是**旧实现（1.8.x 判据）**的历史：重挂件与其属**不同判据的独立实现**，不可混读。',
    last_reviewed: '2026-10-13'
  });
  console.log('已修订：' + removed.id + ' → ' + r.id);
}

// 用法条同步（受控路径）
const usage = cur().find((r) => r.id === 'canon-akasha-usage' || r.id.startsWith('canon-akasha-usage-r'));
if (!usage) { console.log('未找到用法条'); process.exit(1); }
if (usage.claim.includes('㉖ 行为层')) console.log('= 用法条已含 ㉖，跳过');
else {
  const r = revise('canon', usage.id, {
    claim: usage.claim +
      '\n**㉖ 行为层（2026-10-13 重挂；默认关）**：宿主侧检测「**形态 B**」（无正文 + 无工具）落 `idle-shape` 观测线；若开启 `idleResume` 且思维链尾为「好。」，会注入一条 user 消息「**【自动续行】**…」（`source.kind=akasha-idle-resume`；冷却 5 分钟 / 单会话限 3 次）——**看到该消息属正常机制，不是用户发言**。留档 `canon-idle-resume-v110-20261013`。',
    last_reviewed: '2026-10-13'
  }, { allowProtocol: true });
  console.log('已修订：' + usage.id + ' → ' + r.id);
}
