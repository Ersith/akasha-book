// akasha/tools/harvest-20261007z18-fake-session-guard.mjs
// 2026-10-07 留痕：压缩后复检——「路径造伪会话」缺陷修复 → session-usage 链。幂等。
import { loadStore, revise, currentRecords } from './lib.mjs';

const APPENDIX =
  ' **防伪会话守卫（2026-10-07 晚·压缩后复检）**：`session index` 对非规范路径**不再回退「整条路径当会话键」**——旧回退在「冻结副本幂等测试」中静默造出 **2434 条路径键记录 = 第 4 个伪会话**（复检当场抓出）；修复＝严格 `session-<hex…>` 路径段匹配 + 拒绝提示（可用 `--session <id>` 显式指定）；**回归哨兵**入双套件（源 **78/78** / OSS **78/78**）；本机数据已清理（6550→4116 行；备份 `_scratch\\session-cleanup-backup-2026-10-07T13-06-09-963Z.jsonl`）；修复已推送 `Ersith/akasha-book`（R7）。**同批复检结论**：f362b992 的 (session,seq) 多版本 1021 组＝设计内指纹留档；树节点 id 重复 15 组（×2）＝代际留档；压缩事件线 `session-compact` 13:00:40Z 落线；压缩摘要段（seq 4541）已入索引；树为手动构建（本次重建 9 节点、覆盖至 13:00）；循环观测 16 命中全为修复前残留、零新增；红线核验通过（源码零 steer/cancel/注入调用）。';

const tips = currentRecords(loadStore('canon').records);
const tip = tips.find((r) => r.id.startsWith('canon-session-layer-usage-20261007'));
if (!tip) { console.log('未找到 session-usage 链尾'); process.exit(1); }
if (tip.claim.includes('防伪会话守卫')) { console.log('已含守卫段，跳过：' + tip.id); process.exit(0); }
const r = revise('canon', tip.id, { claim: tip.claim + APPENDIX });
console.log('已修订：' + tip.id + ' → ' + r.id);
