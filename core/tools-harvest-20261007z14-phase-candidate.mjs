// akasha/tools/harvest-20261007z14-phase-candidate.mjs
// 2026-10-07 留痕：相位维度入 P1 评估清单 → spin 链 r9。幂等。
import { loadStore, revise, currentRecords } from '../lib.mjs';

const APPENDIX =
  ' **候选扩展记录（2026-10-07）**：**C1 相位维度**入 P1 评估清单——依据 KV 压缩相位盲区论文（arXiv 2609.36322，二手转述待核；frontier `front-kv-phase-sensitive-20261007`）：P0 数据面拟加「上下文长度」代理变量，事后做「循环命中率 × 上下文长度」相关性；**只记录、不干预**，且如实标注「代理变量不能直接验证相位机制」。落点：P0 计划/账本 + 综合设计稿候选节。';

const tips = currentRecords(loadStore('canon').records);
const tip = tips.find((r) => r.id.startsWith('canon-spin-loop-frontier-20261007'));
if (!tip) { console.log('未找到 spin 链尾'); process.exit(1); }
if (tip.claim.includes('候选扩展记录（2026-10-07）')) { console.log('已含候选段，跳过：' + tip.id); process.exit(0); }
const r = revise('canon', tip.id, { claim: tip.claim + APPENDIX });
console.log('已修订：' + tip.id + ' → ' + r.id);
