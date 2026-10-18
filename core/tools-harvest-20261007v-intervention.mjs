// akasha/tools/harvest-20261007v-intervention.mjs
// 2026-10-07 留痕：用户提出「干涉插件（电子脑辅助）」构想。幂等。
import { appendRecord, loadStore } from './lib.mjs';

const rec = {
  id: 'canon-intervention-plugin-idea-20261007',
  claim: '「干涉插件（电子脑辅助）」构想（2026-10-07 用户提出）：「理论上回头等我们数据足够，就可以试试搞干涉插件，梳理你的思维链，就像电子脑辅助。」三层演进定位：① 记忆层（六库 · 已完成）→ ② 会话层（小阿卡夏 · 进行中）→ ③ **过程层（干涉 · 本构想）**。地基现状：loopwatch 观测线（P0 干跑；已抓到 punct 流环×2，本会话+开发会话各一）、回放对照评测法（会话层 18/20 vs 仅摘要 9/20）、注入管道同构（回查条 / 起床包 / 脉搏）。**硬边界**：宿主 `agent/assistant-stream` 为 commit 只读语义——**改不了流**；可行的干预形态是「检测 → 回合间注入级干预」（节奏提示 / 提醒行，与回查条同构）。**前置条件**：分层样本量（跨会话 × 任务类型）+ 循环判据库（punct 仅为表层特征；需区分「有害空转」与「健康深思」）。状态：构想（未立项；待数据足够）。',
  source: { type: '他人', ref: '用户 2026-10-07 会话讨论' },
  last_reviewed: '2026-10-07',
  tags: ['干涉插件', '电子脑辅助', '路线图', '构想']
};

const existing = new Set(loadStore('canon').records.map(r => r.id));
if (existing.has(rec.id)) console.log('已存在，跳过：' + rec.id);
else { appendRecord('canon', rec); console.log('已追加 [canon] ' + rec.id); }
