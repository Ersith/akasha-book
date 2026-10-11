// akasha/tools/harvest-20261010z62-kv-phase-memory-judgment.mjs
// 2026-10-10：KV 相位灵敏对「三层记忆」的影响判定（依据 arXiv 2609.36322 + 本仓系统事实）。幂等。
import { loadStore, currentRecords, appendRecord } from '../lib.mjs';

const canon = currentRecords(loadStore('canon').records);
if (canon.some((r) => r.id.startsWith('canon-kv-phase-memory-judgment'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('canon', {
  id: 'canon-kv-phase-memory-judgment-20261010',
  claim:
    '**KV 相位灵敏（arXiv 2609.36322）对「记忆」的影响判定（2026-10-10，用户提问触发；依据论文摘要级核实 + 本仓系统事实）**。' +
    '**论文事实（摘要级已核）**：分块 KV 压缩给 token 引入新坐标「相位」（相对压缩窗口边界的位置），同一信息在好/坏相位下可检索性显著不同（大开源权重模型跨相位检索准确率差**最多 40 个百分点**），平均值掩盖周期性弱相点；机理＝**相位专业化**（不同注意力组件对源相位贡献不对称）；评测含义＝**必须跨相位测量**，高平均分可与系统性位置失败共存。' +
    '**三层判定**：①**上下文内记忆（工作记忆＝KV cache）→ 直接受影响**（"它忘了"可能是相位伪遗忘而非理解失败）；②**磁盘外置记忆（本仓六库/会话层/OpenViking/Hindsight）→ 存储层不受影响**（盘上字节精确、与压缩窗口无关）；③**两条渗漏路径**：「写入」——若摘要是模型在上下文里做的，弱相位会让它总结错/漏；「使用」——刚读入的片段后续回忆同样受相位影响。' +
    '**本仓抗性设计（已存在，非新做）**：按需检索（读了立刻用，缩短距离）· ptr 回原档 / `show` 直读（不赌 KV 记忆）· **睡眠蒸馏是机械规则而非模型上下文摘要**（写入路径不经相位雷区）· 官方 compaction 摘要只当二手货（canon-compaction-vs-akasha）· 修订链（错了追加，不靠"我记得"）。' +
    '**暴露点（如实）**：长距离「早读晚用」引用；官方压缩压力触发时的摘要（渗漏路径①原型）；**无法观测/控制 provider 侧压缩步长与相位边界**（论文 stride 属模型内部）——故板子 C1（相位维度）只能做**代理观测**（循环命中率 × 上下文长度），并如实标注"代理不能直接验证相位机制"。' +
    '**可操作习惯**：重要结论就近、显式、结构化（要点化/写进库），不依赖"前面提过"；长文评测单点分不当作绝对值。' +
    '**存档**：frontier `front-kv-phase-sensitive-20261007-r1`（含摘要级核实 + 本地 PDF）；PDF `research\\papers\\2609.36322-periodic-weak-spots.pdf`（2392KB，sha256 EB490456…）；来源截图 `attachments/…/b3e296da…`（2026-10-07 用户所发推文）。推文中 V4/V4.1 步长具体数字（4/2）属正文级、待读 PDF 核。',
  source: { type: '他人', ref: 'arXiv 2609.36322（摘要级核实 2026-10-10）+ 本仓系统事实（canon-session-layer-usage / canon-compaction-vs-akasha / sleep 机械蒸馏实现）' },
  event_time: '2026-10-10',
  last_reviewed: '2026-10-10',
  tags: ['KV压缩', '相位灵敏', '记忆', '判定', '论文'],
});
console.log('已入 canon：' + rec.id);
