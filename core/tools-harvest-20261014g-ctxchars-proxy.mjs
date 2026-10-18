// akasha/tools/harvest-20261014g-ctxchars-proxy.mjs
// 2026-10-14：loop-watch 加 ctxChars 上下文长度代理（session 0.3.2-h5）入 canon。幂等：判据＝单一常量。
import { loadStore, currentRecords, revise } from './lib.mjs';

const MARK = 'CTXCHARS-PROXY-20261014';
const rec = currentRecords(loadStore('canon').records).find((r) => String(r.id).startsWith('canon-loop-p1-calibration-20261014'));
if (!rec) { console.log('未找到标定条目'); process.exit(1); }
if (String(rec.claim).includes(MARK)) console.log('= ctxChars 追加已存在');
else {
  const tail = ' **【追加·[CTXCHARS-PROXY-20261014]】**：' +
    '**上下文长度代理 ctxChars 落地**（用户令「这个要加」；纯观测、不开干预）。' +
    '**场**：dsh-akasha-session 壳（loop-watch 写入点）——探针与命中各带 ctxChars＝**自上次压缩完成以来**本会话累计流字符（非工具流；压缩事件归零；无压缩记录＝自会话开始累计）；只记录，真实 KV 相位仍不可由宿主观测（推断留离线分析）。' +
    '**版本**：@akasha-book/akasha-session 0.3.2-h4 → **0.3.2-h5**（restart-required；tgz 装机、备份在案）。' +
    '**验收**：插件自测 **28/28**（+1 用例：探针必带数值 ctxChars ＋ 压缩归零语义）· family-sweep 全绿；标定脚本已加 ctxChars 分布段（当前 0 条带该字段 = 待重启生效后才有新数据）。' +
    '**纪律**：仍为 P0 dry——不加任何干预路径；P1 维持「先不动手、再攒数据」裁定。';
  const r = revise('canon', rec.id, { claim: String(rec.claim) + tail, last_reviewed: '2026-10-14' });
  console.log('已追加 ctxChars：' + rec.id + ' → ' + r.id);
}
