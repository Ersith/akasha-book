// 2026-10-14：循环观测 P1 标定分析 + 暂缓裁定 入 canon。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
const MARK = 'LOOP-P1-CALIB-20261014';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-loop-p1-'))) { console.log('= 已存在'); process.exit(0); }
const r = appendRecord('canon', {
  id: 'canon-loop-p1-calibration-20261014',
  claim:
    '**循环观测 P1·标定分析与暂缓裁定（2026-10-14；用户令「先不动手吧，再攒下数据」；标记 [' + MARK + ']）**。' +
    '**背景**：P1 ＝三环设计第二期「温和恢复（live 干预：steer → cancel(keepInbox) → 降档 → 最多 2 次放弃放行）」；设计即要求「阈值从 P0 数据标定（不抄默认值）」＋行为注入需用户逐期裁定。' +
    '**本轮只读标定**（脚本 akasha/tools/loop-p1-calibration.mjs，可重跑）：P0 累计命中 **93**（variant 66 / punct 25 / exact 2；流相 reasoning 91 / text 2；跨 14 会话；10-12 与 10-13 为峰各 ~28-29）＋探针 856。' +
    '**抽查结论**：variant **全为「重述类」**（写代码 / 改文档 / 复述上下文）→ 良性；punct 为 Markdown 列表 / 分隔 / 引用位 → 良性；exact 2 条待判（其一语境疑似合法关键词清单）。' +
    '**真「像环」信号只有一种：同 turn 内秒级同位置聚集**（最强例：c8621203 turn 6 在 **13 秒内同一位置连报 4 次** `——：——：——：`）。' +
    '**最小可开版提案（未启用）**：同 turn ≥3 次命中且落在 ≤60s 窗口（或 exact ≤5min 内 ≥2 次）才算「证实病态」；干预只上最轻 steer、观察两周再议升级；每 turn ≤2 次随后放弃放行；C1 相位防护由聚集判据天然覆盖（单次抖动永不触发）。' +
    '**裁定（2026-10-14）**：**暂不实施，继续攒数据**；复核入口＝本条 + 上述脚本 + `session loopwatch`。**纪律**：**不得**不经再裁定把 P0 改成 live（冻结纪律 + 行为注入逐期裁定）。',
  source: { type: '复现', ref: 'hooks.jsonl loop-watch 93 命中全量分类（tmp/loop-p1-calibration.mjs → 已入 akasha/tools/）+ research/loop-guard-synthesis-20261007.md P1 节 + research/semantic-loop-baseline-20261007.md' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['循环观测', 'P1', '标定', '裁定', '暂缓'],
});
console.log('已入 canon：' + r.id);
