// akasha/tools/harvest-20261013i-review-fixes.mjs
// 2026-10-13 深夜：复查修正两条——① P0 补齐 cross 读侧剥皮；② 行为层判定点修正（旧包实证）。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const cur = () => currentRecords(loadStore('canon').records);
const find = (prefix) => cur().find((r) => String(r.id).startsWith(prefix));

const p0 = find('canon-genre-p0-20261013');
if (!p0) console.log('未找到 canon-genre-p0-20261013');
else if (String(p0.claim).includes('复查补齐：cross')) console.log('= P0 条目已含复查补齐');
else {
  const r = revise('canon', p0.id, {
    claim: String(p0.claim) +
      ' **【r1 · 2026-10-13 深夜复查补齐：cross 纳入剥皮面】**——复查发现同族缺口：`cross`（六库对位，**主行＝全文、不截断**）是读侧**最重**文本面，却不在 P0 剥皮清单（设计稿 §7 只点了 show/lookup/brief）。**已补**：`lib.cross()` 默认剥主行（`opts.reflect` 走反思通道不剥）；CLI 加 `--reflect`；MCP `akasha_cross` 入剥皮面 + `reflect` 参数。**实测对比（真库、「裁定」查询）**：默认档符号 **0** 处 vs `--reflect` **570** 处——差距量级印证该面此前确为最大暴露点。**刻意不套剂量闸**：摘要会破 cross 的「主行不截断」契约（仅剥符号、一字不截）。测试 **217/217**（+1 用例：cross 剥皮 + 不截断 + reflect）。**仍留边界（未剥）**：`conflict` / `diff`（诊断对照视图）· `kit.history`（≤3×100 字）· `audit.review.top`（只带元数据与 id，无正文）——记明，待需要时再议。',
    last_reviewed: '2026-10-13'
  });
  console.log('已修订：' + p0.id + ' → ' + r.id);
}

const ir = find('canon-idle-resume-v110-20261013');
if (!ir) console.log('未找到 canon-idle-resume-v110-20261013');
else if (String(ir.claim).includes('attempt end')) console.log('= 重挂条目已含判定点修正（判据＝实际写入串）：' + ir.id);
else {
  const r = revise('canon', ir.id, {
    claim: String(ir.claim) +
      ' **【r1 · 2026-10-13 深夜复查修正：判定点改为 attempt end（物证驱动）】**——复查时翻出**旧实现包 `local-akasha-sleep-1.8.1-h1.tgz`**（被删钩子的最后一版仍完整在库）：其链路＝**流 `end` 帧判定 → `agent.inject(createUserMessage{source.kind:"akasha-resume"})`**，且当年三级降级**全部实测拉回成功**（canon-idle-resume-verified-20261013）⇒ **注入 API 与注入点都是验过有效的**；首版把判定点放在 `agent/turn-stopping` 属我自拟（「形似」），已改为**按 attempt 收帧（start/chunk/end，attemptId 键控、上限 30 条保新）**，end 帧判完即删——**沿用验过的链路，只换判据与护栏**。selftest 同步改为帧序列驱动（start→chunk→end），并补两例：**空流（B/无信号）只观测不动作**、**无状态 end 帧不得抛**。版本 **1.10.0-h1 → 1.10.1-h1**（重打包 + 实装核验：`frameType === "end"` 在场、默认 `idleResume:false`；profile 依赖完整性复扫 **0 缺失**）。**另记复查顺手两项**：① `Packages: +1 -8` 已核实**未伤任何 `link:` 目录依赖**（navigation 868 文件、blender-config/mcp-blender/mcp-unity 各 2 文件、open-in-app-fix 5 文件，与 `_dir-dep-backup-20261002` 对账一致）；② 机制报告 §⑥ 的「尾部『。』弱信号」保留为**可选放宽**（`idleResumeOnWeak`，默认关）。',
    last_reviewed: '2026-10-13'
  });
  console.log('已修订：' + ir.id + ' → ' + r.id);
}

// —— 更正（去重）：本脚本首版防重复判据写错串（`判定点修正` ≠ 实际写入 `复查修正`），幂等复跑时
//    追加了一次重复版（r2）。按库内先例（重复追加 → 加「更正（去重）」版，不删行）补正。判据＝实际写入串。
//    ⚠ 二次踩坑记录：首版补正块的判据也写错（`【更正（去重）】` ≠ 实际写入 `【更正（去重）·2026-10-13】`，落了日期）
//      ⇒ 复跑又追加 r4。现判据改为**日期无关短串** `更正（去重）`（已回读实际入库文本核对）。
const ir2 = find('canon-idle-resume-v110-20261013');
if (!ir2) console.log('（更正块）未找到条目');
else if (String(ir2.claim).includes('更正（去重）')) console.log('= 更正（去重）已存在（判据＝日期无关短串），跳过：' + ir2.id);
else {
  const r = revise('canon', ir2.id, {
    claim: String(ir2.claim) +
      ' **【更正（去重）·2026-10-13】**：本条目 **r2 系重复追加**——复查脚本的防重复判据写错了串（判据 `判定点修正`，实际写入 `复查修正`），幂等复跑时暴露并已修正。**以 r1 为单份有效版本；r2 全文重复，请忽略**。教训（已入复查记录）：**防重复判据必须对着「实际写入串」校验**——写完回读一次，比凭记忆写判据可靠。',
    last_reviewed: '2026-10-13'
  });
  console.log('已补正：' + ir2.id + ' → ' + r.id);
}
