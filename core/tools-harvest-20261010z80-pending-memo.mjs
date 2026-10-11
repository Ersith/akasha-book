// akasha/tools/harvest-20261010z80-pending-memo.mjs
// 2026-10-10：待办备忘录落盘 + 闭环对账结论入 canon（可发现性）。幂等。
import { loadStore, currentRecords, appendRecord } from '../lib.mjs';

const canon = currentRecords(loadStore('canon').records);
if (canon.some((r) => r.id.startsWith('canon-pending-memo-20261010'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('canon', {
  id: 'canon-pending-memo-20261010',
  claim:
    '**待办备忘录落盘（2026-10-10 夜，用户：「写个备忘录吧」）**：新建 **`docs\\memo-20261010.md`**——跨会话的「未决事项 + 怎么收尾」清单（库里此前**无**同类备忘录文件，已核）。内容四节：① **闭环对账**（见下）·② 未决项 6 条（A4/A3/A1 观察期/A2 观察期/镜像元数据补标/gate 1.2.2 发布与密钥轮换，**每条都写了"怎么做 + 验收标准"**）·③ 会自己到点的（记忆测试轮末 10-14/10-21、总期 10-28；睡眠与循环观测自动跑）·④ 今日六批交付留档。' +
    '**闭环对账结论（PID 设计稿「三处开环→闭环」）**：**A1 检索负载均衡＝已建成（默认关）**；**A2 上下文预算分配＝已建成（默认关）**；**A3 睡眠计划（恶化率纳入候选排序）＝未做（低优先）**；**A4 统一框架（控制器视角重述排序四因子/时间衰减/情绪 boost）＝未做（成本零）**；**A5 指标纪律（辅助目标不污染主目标）＝已内化**（= A1/A2 的默认关 + 只进 rank + 豁免开关）。**⇒ 分配系统闭环 2/3 建成（且都"装好了没开"）**。另有同名闭环：**MEMORY-TEST 验收项 4「失败回查」＝已转起来**（当日 2 次失败→回查→入 canon→修钩子）；**记忆测试 3 轮 × 7 天＝进行中**（至 10-28）。' +
    '**板子同步**：新增两条（A4 `d4c2410d`、A3 `c3472936`）——备忘录与板子互指，别只改一处。**用法**：新会话若要找"还没做完的事"，先 `akasha_brief 待办 备忘录` 或直接读 `docs\\memo-20261010.md`。',
  source: { type: '复现', ref: '本机实测 2026-10-10（查库/查盘确认无现成备忘录 → 新建 docs\\memo-20261010.md → 板子补 A3/A4）' },
  event_time: '2026-10-10',
  last_reviewed: '2026-10-10',
  tags: ['备忘录', '待办', '闭环', '索引', 'A3', 'A4'],
});
console.log('已入 canon：' + rec.id);
