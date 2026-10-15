// akasha/tools/harvest-20261015n-live-compact-obs.mjs —— 本会话压缩活体观察（孤案）
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('orphan').records).some((r) => String(r.id).startsWith('orphan-livecompact-fe1b1af1'))) { console.log('= 已存在'); process.exit(0); }
const r = appendRecord('orphan', {
  id: 'orphan-livecompact-fe1b1af1-20261015',
  summary: [
    '**活体观察：会话 fe1b1af1 发生首次压缩（2026-10-15 16:44 前后，轮 15-16 区段）**——该会话正是「格式密度监测」的研究主场：',
    '密度曲线（r2g/插件线双源）：轮1 2.3 → 轮2 8.2 → 轮3 23.6 → 轮4 25.6 → 轮5 11.3 → 轮6 16.9 → 轮7 22.8 → 轮8-15 升到 27.7（黄区、近 7 轮窗口）——**全程未出黄区上限（40）**，但已在黄区持续 10+ 轮；',
    '**压缩发生在黄区高位段**（与 0fd706f7 的"第 6 次压缩后失衡起步"对照样本）。',
  ].join(''),
  hypothesis: '压缩是放大器：黄区高位会话经压缩注入后，密度在随后数轮加速上行（0fd706f7 模式的活体复现）。',
  would_confirm: '压缩后 3 轮内密度上台阶（近窗口 ≥35 或失衡出现 >0.2）。',
  would_refute: '压缩后密度持平或回落（≤28 且无失衡）——倾向"黄区存在自稳/或压缩非充分条件"。',
  observed: '注入行「⚠ 近期发生压缩（1 次）」+ [极限观测·本进程] 轮=16 压缩=1；密度双源（hooks density 线 + r2g 复算）。钩子：3-5 轮后回看 density-status 或 r2g。',
  severity: '低',
  event_time: '2026-10-15',
  created: '2026-10-15',
});
console.log('已入 orphan：' + r.id);
