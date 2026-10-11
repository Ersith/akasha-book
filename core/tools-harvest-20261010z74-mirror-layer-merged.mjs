// akasha/tools/harvest-20261010z74-mirror-layer-merged.mjs
// 2026-10-10：镜像五元组元数据 + 知识分层/认知态并入活树的交付记录。幂等。
import { loadStore, currentRecords, appendRecord } from '../lib.mjs';

const canon = currentRecords(loadStore('canon').records);
if (canon.some((r) => r.id.startsWith('canon-mirror-layer-knowledge-20261010'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('canon', {
  id: 'canon-mirror-layer-knowledge-20261010',
  claim:
    '**镜像五元组元数据 + 知识分层/认知态并入活树（2026-10-10，用户裁定「并」；外援补丁、我方独立验证）**。' +
    '**① 镜像元数据**：`MIRROR_EVIDENCE`（`story`＝典故/教材 ｜ `own-log`＝本人日志，抗教材偏见）；mirror 校验**必填新增 `story`**（活库 10 条全有 → 零破坏）；`LOOKUP_FIELDS.mirror` 扩到 9 字段（+story/era/context/patterns）；`patterns` 可选字符串数组，**命中每项 +2 权重**；`mirrorMatch` 新增 `evidence`/`era`/`context` 过滤并回带这些字段；CLI `mirror match … [--evidence S --era S --context S]`；MCP 同步扩参。' +
    '**② 知识分层与认知态**：`KNOWLEDGE_LAYERS`（模型内建 / 技能 / 本地大书库 / 外网）+ `EPISTEMIC_STANCES`（known / uncertain / confirmed-unknown）；`knowledgeRoute()` → **强命中=known（记得·库内）· 仅弱命中=uncertain（不确定）+cites · 无证据=confirmed-unknown（确定不知道）+search 契约**；`webSearchRequest()` 暴露宿主外网检索契约 `akasha.hostWebSearch`（rankBy = citation × credibility，对齐 T1..T5）——**core 只声明不实现（无网络代码）**。CLI/MCP 的 lookup/brief 输出增「认知态」行。**弱命中措辞由「确定不知道」改为「不确定」**（对齐排序钉子：有据的不确定 ≫ 无据的确定）。' +
    '**验证（我方独立）**：两批 `git am` 干净（OSS `a6b9025` + `9f003ad`）；**双路树哈希全等** `9b239f042054f60affa76a357fcfaca6f9c935a9`；核心 **134/134**（OSS）/ **135/135**（活树）、N20 **129→130 + 5 SKIP**、四插件全绿；**活数据冒烟**：`mirror match` 命中 `mirror-ghost-citation-r1`（8.1 分）· 三态逐一走通（记得·库内 / 不确定 + 8 cites / 确定不知道 + 外网契约）。' +
    '**落地**：活树已并（快照 `_rollback-20261010-mirror-layer\\`）；OSS `24e698a`（CHECKS R26）；MEMORY-TEST 第二十一次受控解冻。' +
    '**遗留**：活库 10 条镜像尚无 `era/context/evidence/patterns` 标注（新过滤器待数据，已入板子）；外网检索器仅宿主侧实现。' +
    '**用法提示**：`mirrorMatch` 的活库参数是 **`opts.file`（单文件路径）**，不是 `files` 映射——复查脚本时别再传错（我首轮即因此得 0 命中）。',
  source: { type: '复现', ref: '本机实测 2026-10-10（_scratch/akasha-mirror-layer-review-20261010：双路树哈希 + 三层测试 + 活数据冒烟 + 老数据兼容性核查）' },
  event_time: '2026-10-10',
  last_reviewed: '2026-10-10',
  tags: ['镜像', '五元组', '知识分层', '认知态', '解冻', '外援验证'],
});
console.log('已入 canon：' + rec.id);
