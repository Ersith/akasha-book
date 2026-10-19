// 2026-10-14：K3 复检（手数核对 + 两处同类污染修复 + 举一反三）。幂等：判据＝单一常量。
import { loadStore, currentRecords, revise } from './lib.mjs';
const MARK = 'K3-RECHECK-20261014';
const rec = currentRecords(loadStore('canon').records).find((r) => String(r.id).startsWith('canon-k3-stats-20261014'));
if (!rec) { console.log('未找到 K3 条目'); process.exit(1); }
if (String(rec.claim).includes(MARK)) console.log('= 复检段已存在');
else {
  const tail = ' **【复检·[K3-RECHECK-20261014]】**（用户令「复检，别过于信任检测脚本，发现的问题同步改检测脚本并举一反三」）：' +
    '**① 手数四路全对上**（独立于脚本，逐行数文件）：墓碑 13（canon2/mirror1/orphan4/pricing1/lexicon1/frontier4）· 近 7 天修订 391（canon326/mirror37/orphan24/frontier4）· 复审线 1 · conflict 1——与 K3 行逐项一致。' +
    '**② 同类污染 #1（已修）**：K3 接线使诊断调用（conflict）进 query-log ⇒ 会污染**零结果率/高频 top**（conflict 常在 hits=0 记 zero:true）。修：metrics 改**检索面口径**（RETRIEVAL_CMDS=lookup/brief/cross/recall；诊断只计 byCmd），新增 queries.retrieval；CLI/MCP 文案同步。' +
    '**③ 同类污染 #2（举一反三揪出，已修）**：处境/指代检索**机制探针**（sleep 每回合自动跑、查询词＝用户原话/工具名）同样在灌检索面——实测同一长句 ×20 占据高频 top。修：两处调用点带 via:\'probe\'（**sleep 1.10.2-h1**，restart-required）；metrics 分流 queries.probes、不进检索面指标。' +
    '**④ 标注**：K3 行加「全量口径·不受 since」；**历史探针行 via=lib 不可追溯（如实，分流自重启后新行起）**。' +
    '**⑤ 守卫入库**：主套件守卫用例扩至覆盖两类分流（诊断/探针）——**228/228**。**⑥ 举一反三三扫**：query-log 其余消费面仅 metrics 一处；recall 走 hooks、K3 四路各走专线，未发现其他混入。';
  const r = revise('canon', rec.id, { claim: String(rec.claim) + tail, last_reviewed: '2026-10-14' });
  console.log('已补复检段：' + rec.id + ' → ' + r.id);
}
