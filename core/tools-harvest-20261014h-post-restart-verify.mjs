// 2026-10-14：本批（session h5 + better-sidebar 0.25.0）重启生效确认。幂等：判据＝单一常量。
import { loadStore, currentRecords, revise } from './lib.mjs';
const cur = () => currentRecords(loadStore('canon').records);

const M1 = 'POST-RESTART-CONFIRM-BS834-20261014';
const bs = cur().find((r) => String(r.id).startsWith('canon-upgrade-sweep-20261014'));
if (bs && !String(bs.claim).includes(M1)) {
  const tail = ' **【生效确认·[POST-RESTART-CONFIRM-BS834-20261014]】**：重启后验收——better-sidebar **0.25.0 已载**（list_bundles 实读）；**#834 功能复验通过**：sidebar_open 实测投递成功（返回 Opened file … in the sidebar.，即队列消费/ws 通道连通——旧版在该环境下的预期症状是停在 queued / delivered:false）；诚实边界：本机未实测过旧版行为，缺陷认定基于 tgz 解包对照（0.24.1 location.origin×5 / streamBaseUrl×0）＋ 官方 issue 复现记录。文件树实时刷新（fs-watch）同属该修复面，留 Master 目视确认。';
  const r = revise('canon', bs.id, { claim: String(bs.claim) + tail, last_reviewed: '2026-10-14' });
  console.log('已确认 bs834：' + bs.id + ' → ' + r.id);
} else console.log('= bs834 生效确认已存在或未找到条目');

const M2 = 'POST-RESTART-CONFIRM-CTXCHARS-20261014';
const lp = cur().find((r) => String(r.id).startsWith('canon-loop-p1-calibration-20261014'));
if (lp && !String(lp.claim).includes(M2)) {
  const tail = ' **【生效确认·[POST-RESTART-CONFIRM-CTXCHARS-20261014]】**：重启后验收——@akasha-book/akasha-session **0.3.2-h5 已载**；**新探针已带 ctxChars**（重启后首批 8 行带该字段，本会话实测 1951 字符量级）——相位代理线正式开线，P1 阈值标定从此有上下文长度可查。纪律不变：P0 dry、只记录不干预。';
  const r = revise('canon', lp.id, { claim: String(lp.claim) + tail, last_reviewed: '2026-10-14' });
  console.log('已确认 ctxChars：' + lp.id + ' → ' + r.id);
} else console.log('= ctxChars 生效确认已存在或未找到条目');
