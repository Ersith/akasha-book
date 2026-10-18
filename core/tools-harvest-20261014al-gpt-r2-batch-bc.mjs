// akasha/tools/harvest-20261014al-gpt-r2-batch-bc.mjs —— GPT 复核二轮·批 B/C（13 项）留痕
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-gpt-review2-20261014-b'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  "**GPT 复核二轮 · 批 B/C 完成——16 项清单全清（2026-10-14）**。背景：GPT 对 v2 复核包出 16 项待修（6 P1/10 P2，含代码位置与最小复现）；先批已修 R06/R07/R08部分/R09；本轮在**合并后基线**上再修 **13 项**（全部先复现验真）。",
  "**B1（lib 层）**：**R01** 合并决定性字段扩到语义层（mirror `outcome`、pricing `severity_default`、lexicon `behavior/resolution`——成功经验 vs 失败边界不再互并）；**R08** 地板从「首条全文突破 cap」改为**短占位**（前 N 字摘要+`oversizeOmitted`+show/--full 指引；N 随 cap 收缩）——严格上限成立；**R10** 占位豁免改「**整个值等于占位词**」才放过（`FalseSYNTHETIC_…` 不再漏遮）；**R11** 脱敏键从任意子串收窄为「**完整键或敏感词结尾**」（tokenizer/password_policy/secretary 保真，access_token/client_secret 照遮）；**R12** rollback 重跑零新增（链尾已为本窗口回滚产物即跳过，修「r2r1r1r1…」）；**R13** 内容修订不再继承 `rollback_of`（修「回滚后编辑无法再次回滚」）。**B2（睡眠层）**：**R02** 回执执行证据按 absorb 合并（filtered/skipped 场景从旧回执继承 detail+tombstone——双 merge 分批撤销 4/4 恢复）；**R03** 墓碑写入即带 ` · plan <planId>`，revoke **以库内墓碑为一级依据**（回执丢失/失败仍可重建撤销）；**R14** 水位/去重账本/交付**整体提交**（inbox 失败时 aggregates 冻结，重试候选必进 inbox）。**B3（交互/插件）**：**R04/R05** sleep 插件渲染与事件**全程显式会话身份**——text 回调带 context 按 `context.agent` 选桶、`session/event` 按宿主真实 **(session, event)** 两参契约消费、回合真值补 `turn/start`；**无身份归 unknown 桶不继承**；preflight 冷却与 latestIntentGist 按会话隔离；**R15** MCP lookup 显式分页返回信封（含 budget.nextOffset）；**R16** cross CLI `--full` 覆盖显式预算。",
  "**验收**：核心套件 **248/248** 全绿（含 B1/B2 新守则）；**她的 contracts-repro 复跑（指向活插件）**——A/B 渲染各归其位、两参契约下压缩+触发路由恢复、unknown 不继承、冷却分桶、intent 不串、aborted 后 C1 恢复——关键项全部翻转 ✓；B1/B2 复现脚本逐项转绿（占位≤cap、前缀不漏遮、键保真、回滚幂等/可再编辑、双 merge 撤销、无回执重建、账本冻结）；sleep 插件 **1.10.5-h1** 已打包安装（restart-required，下次重启激活）。**边界（如实）**：GPT 五项语义答复待回（原始序号游标已按「不漏」修正；账实残差=budget 自身；cross 默认全量保留为显式审计能力、summary 档为日常有界入口）；legacy 旧单参形状下触发词路由因 30 分钟去重显示 null（非缺陷，已解释）。",
].join('');
const r = appendRecord('canon', {
  id: 'canon-gpt-review2-20261014-b',
  claim,
  source: { type: '复现', ref: 'tmp/gpt-r2-b1-verify.mjs · tmp/gpt-r2-b2-verify.mjs · tmp/r04-verify/contracts-repro.mjs（她方脚本复跑）· 清单 D:/…/Akasha_v2_给DS的复核清单_20261014.txt · test 248/248' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['外部审查', 'GPT', '复核二轮', 'R01', 'R02', 'R03', 'R04', 'R05', 'R08', 'R10', 'R11', 'R12', 'R13', 'R14', 'R15', 'R16'],
});
console.log('已入 canon：' + r.id);
