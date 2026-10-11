// akasha/tools/harvest-20261007z24-evening-close.mjs
// 2026-10-07 留痕：当晚「外部评估 → 三档修复」里程碑收口（代码+文档+记忆+canon）。幂等。
import { loadStore, appendRecord } from '../lib.mjs';

const CID = 'canon-external-eval-delivery-20261007';
if (loadStore('canon').records.some((r) => r.id === CID)) { console.log('已存在，跳过：' + CID); }
else {
  appendRecord('canon', {
    id: CID,
    claim: '**外部评估落地批（2026-10-07 晚）**：用户引入 GPT 对阿卡夏之外部评审（评估 4 组事实：日期覆盖 143/215 双缺精确、性能峰值 3.64s 命中、8 条无结果动作精确、计分笔误被抓）×2；经核对后按三档裁定执行——**①日期三分报告**（默认提示「另有 N 条日期未知/M 条范围外」+ `--report/--undated` + MCP `report:true` + 非法日期即拒）与**②跨批配对最小修复**（真因＝中途定时索引切批；配对改全量记录维护 + 完成版追加 + 读取视图归并 `--all`；真库 `--full` 补 8 条漏配）均已落地并推送 OSS（含 R7–R9）；**③worker 化与配对满配挂 v0.4 队列**（前置观测已上线：`lagMs` 采样 + `session-index-slow`>1.5s 告警，0.2.4 活体落线 lagMs=7ms）。**顺带修正两处计分笔误**（回放 A 8/20；树平铺 S2 撤销扣分→15/20；结论不变）。验证：双套件 82/82；canon 链 r21/r6/r8；check 113/113。**收尾＝代码＋文档＋记忆＋canon 条目**（本条目）。',
    source: { type: '复现', ref: 'research\\session-family-review-20261007.md + CHECKS R7-R9 + OSS commits f25aed9/8fbf946/c966992/36533e6/d554c21' },
    last_reviewed: '2026-10-07',
    event_time: '2026-10-07'
  });
  console.log('canon：已新增 ' + CID);
}
