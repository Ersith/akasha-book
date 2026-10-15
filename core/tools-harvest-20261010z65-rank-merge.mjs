// akasha/tools/harvest-20261010z65-rank-merge.mjs
// 2026-10-10：排序补齐（wave3）并入活树的交付记录 + 两条工程坑归档。幂等。
import { loadStore, currentRecords, appendRecord, revise } from './lib.mjs';

const canon = currentRecords(loadStore('canon').records);

// ① 交付记录
if (!canon.some((r) => r.id.startsWith('canon-rank-wave3-merge'))) {
  const rec = appendRecord('canon', {
    id: 'canon-rank-wave3-merge-20261010',
    claim:
      '**排序补齐（wave3：严重度 × 可信度 × 复杂度）并入活树（2026-10-10，用户裁定「并」；外援早做、我方独立验证）**。' +
      '**机制**：`rank = 词法分 × 可信度 × 严重度′ × 复杂度′`——可信度取既有五档权重（refuted→0）；**严重度用既有字段**（orphan.severity 高/中/低=1/0.75/0.5 · pricing.severity_default÷5 · 否则 arousal→0.5+0.5a · 都缺=1）；**复杂度无独立字段**——仅在「严重度来自显式 severity 且有 arousal」时用 arousal 代理，其余=1（防同一信号双计）；**协议类模板强制 sev/cpx=1**（不让 arousal 抬协议）；**因子恒 ≤1：只降权、绝不放大**；**孤案 rank=score**（零权重约定不变）；**strong 口径不变（仍只看整词）**；时间仍只做门限；**A1 负载均衡仅留默认关闭开关（恒等占位，未启用）**。brief 侧：arousal 移出 base（改用 `valenceTip` 只表负价），`emotionBoost` 保留为公开 API 但不再进 brief base。' +
      '**验证（我方独立，六条全过）**：`git am` 干净（OSS `d17798d`）；**双路树哈希全等** `88649846c28f783cf7c3892eb7665ec89747085e`（`git am` × `all.diff`）；核心 **124/124**（活树 121+3）/ **123/123**（OSS 120+3）；会话 **22/22**（N24）· **15/0/7 skipped**（N20，跳过全为 zstd）；gate/hooks/sleep 全绿；**同库只读实证**（活数据副本）：`strong` 集合与 base **完全一致**、6 查询 4 个顺序不变、2 个仅**同分并列被因子打破**。' +
      '**落地与回滚**：活树已并；快照 `_rollback-20261010-rank\\`；OSS 仓 commit `d17798d` + CHECKS R23；MEMORY-TEST 第十八次受控解冻条目。**MCP 常驻进程需重启才吃到新排序**（CLI / 后续索引调用即时生效）。' +
      '**遗留**：A1 启用时机；`arousal: 0`（显式平静）→ sev 0.5 会被降权，而"不写 arousal"=中性 1.0（语义已确认按现状，留待观察手感）。',
    source: { type: '复现', ref: '本机实测 2026-10-10（_scratch/akasha-rank-review-20261010：git am + 双路树哈希 + 三层测试 + 同库只读对比；活树合并后复跑）' },
    event_time: '2026-10-10',
    last_reviewed: '2026-10-10',
    tags: ['排序', 'wave3', '解冻', '外援验证', 'rank'],
  });
  console.log('已入 canon：' + rec.id);
} else { console.log('canon-rank-wave3-merge 已存在'); }

// ② 工程坑：CRLF 补丁 + 外来 node 的 EPERM
if (!canon.some((r) => r.id.startsWith('canon-patch-portability'))) {
  const rec = appendRecord('canon', {
    id: 'canon-patch-portability-20261010',
    claim:
      '**跨环境补丁落地的两条坑（2026-10-10 实测定案）**。' +
      '**① CRLF × LF：外援补丁落到本仓活树时"每个文件首个 hunk 就失败"**——根因＝对方工作树是 **CRLF**（`git autocrlf=true` 的检出），补丁上下文行带 CR；本仓活树是 **LF**。判别法：比 CRLF 计数与「LF 归一后字节数」（本例 72309−1361=70948 ≈ 活树 70949，仅差 1 字节＝内容其实同源）。**正解三步**：a) 用本地克隆 `git diff <base>..HEAD` 重新导出补丁（仍可能带 CR，需 b）；b) 出**路径映射补丁**（`core/*`→`akasha/*`、`plugins/akasha-session/*`→`dsh-akasha-session/*`，README 类可跳过）；c) **剥掉补丁里的全部回车符**（把 CR 删掉、只留 LF）后 `git apply --check` → `git apply`（在活树的仓库上下文里用 `-p1`）。' +
      '**② 外来 node 的 EPERM**：用非运行时 node（如 `_tools\\node20\\node.exe`）在 `D:\\dsh-temp` 下 `mkdtemp` 报 `EPERM: operation not permitted`，而同目录用运行时 node **正常**——属宿主沙箱的按程序 ACL 放行；**修法＝把 TEMP/TMP 指到工作区目录**（本例改为 `_scratch\\node20-tmp` 后 Node 20 自测 15/0/7SKIP 全通）。' +
      '**顺带**：OSS 仓检出为 CRLF（`git add` 会提示 "LF will be replaced by CRLF"），活树为 LF——**跨仓比对文件前先归一化行尾**，否则会误判"不同源"。',
    source: { type: '复现', ref: '本机实测 2026-10-10（wave3 补丁落地全过程；node20 下载与 EPERM 复现）' },
    event_time: '2026-10-10',
    last_reviewed: '2026-10-10',
    tags: ['工程坑', 'CRLF', 'patch', 'EPERM', '沙箱', '跨环境'],
  });
  console.log('已入 canon：' + rec.id);
} else { console.log('canon-patch-portability 已存在'); }

// ③ 环境事实条目补 TEMP 坑
const env = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-env-network-facts'));
if (env && !env.claim.includes('外来 node')) {
  const n = revise('canon', env.id, {
    claim: env.claim + ' **⑦ 外来 node 的 TEMP 限制（2026-10-10）**：非运行时 node（如 `_tools\\node20`）在 `D:\\dsh-temp` 下写目录报 EPERM（沙箱按程序放行），把 `TEMP/TMP` 指到工作区即可跑通。',
    last_reviewed: '2026-10-10',
  });
  console.log('已修订环境条目：' + env.id + ' → ' + n.id);
} else { console.log('环境条目已含或未找到'); }
