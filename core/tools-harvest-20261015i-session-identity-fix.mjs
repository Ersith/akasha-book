// akasha/tools/harvest-20261015i-session-identity-fix.mjs —— 会话认定更正 + 密度监测首验留痕
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-session-identity-20261015'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**会话认定纪律 + 格式密度监测首次生效验收（2026-10-15 08:20，重启后检查）**——两条：① 一个操作坑入册；② 监测上线即抓到"活样本"。',
  '**① 坑（2026-10-15 自踩）：会话 id 认定必须用运行证据，不能靠 `ls -t` 猜**——当天早上自查"本会话密度"时，用目录 mtime 挑了一个会话（a249aa71）并报出"3.3/千字、很干净"；**实际本会话是 `session-fe1b1af1`**（判定证据：重启后新进程的流帧/probe 时间与我的回合吻合 + `turn-end` 轮号 1-6 与注入行"轮=7"吻合 + a249aa71 最后活动停在重启前）。⇒ **纪律**：认"哪个会话是我"必须三条对得上——运行中的 probe/流帧时间、turn-end 轮号、档案末活动时刻；`ls -t` 只能当候选。',
  '**② 本会话（fe1b1af1）真实密度曲线（自证实例）**：轮1 2.3 → **轮2 8.2（失衡 0.5）→ 轮3 23.6** → 轮4 25.6 → 轮5 11.3 → 轮6 16.9 → 轮7 22.8；全期密度 11.2-11.9、峰值 23（黄区）、失衡 **0.14**（全库第三高，仅次于两个爆会话）。**解读**：本会话（密集数据分析任务 + 长思考）在 **2 轮内就离开基线**、6 轮到达黄区波动——比 0fd706f7（41-50 轮才 0.025）快得多；**任务类型确认为漂移速度的重要因素**（此前 r3 的"任务结构代理全灭"是对"文件数/工具种"而言；"长思考 × 密集分析"显然有效）。**若不监测，我对此毫无感觉**——这正是密度监测的价值。',
  '**③ 监测生效验收（重启后）**：安装副本 `0.3.5-h2`（version + 修正版 dedupKey 含 turn + density 三函数逐一核过）；三插件新进程 armed（pid 16704，08:18:32）；CLI 可用（文案已修：不再写死版本号）；**density 线/节奏条行待"首个 turn 结束"出现**（本 turn 进行中，下一回合自然可见）。',
  '**④ 附带**：本会话即「降格式负载」的第一个实践场（当前黄区）；作为"尝试非指标"，从本轮起在长任务中主动用分段/编号替代部分加粗（不做实验设计、不做承诺）。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-session-identity-20261015',
  claim,
  source: { type: '复现', ref: 'hooks.jsonl（probe/turn-end 运行证据）· session-fe1b1af1 档案 r2g 曲线 · 安装副本核验（0.3.5-h2）' },
  event_time: '2026-10-15',
  last_reviewed: '2026-10-15',
  tags: ['会话', '认定', '坑', '密度', '监测', '健康'],
});
console.log('已入 canon：' + r.id);
