// akasha/tools/harvest-20261014ao-gpt-review3.mjs —— GPT 第三轮（N01–N14）留痕
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-gpt-review3-20261014'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  "**GPT 第三轮独立复核 · 14 项全清（2026-10-14）**——基线 `3522bd7` 上 14 项（4 P1/10 P2，N01–N14）**先复现后修复**，全部经她原脚本复跑验收。",
  "**P1 四件**：**N01/N02** 脱敏改**结构化优先**（整串 JSON 解析后按键递归；文本规则补 authorization、值模式支持转义序列——`False` 前缀漏遮与 `\\\"` 转义引号半截泄漏同批根治）；**N03** 计划归属**结构化**（墓碑写 `sleep_plan_id/sleep_op_id`；重建只认**精确字段**或**锚定结尾** ` · plan <id>`；须为**计划成员**；**回执 planId 校验**——`plan-` 前缀、说明文字提及、错配回执全部拒绝）；**N04** 合并**证据不丢**（decisive 扩 `evidence/role/era/context`；真重复合并**保留来源集合** `sources`，同 ref 不触发修订——守「keep 一字不动」A 档约定）。",
  "**P2 十件**：**N05** 有效退役状态统一（rollback 的 tombstoned 排除已 revoke 墓碑）；**N06** rollback **覆盖范围** `rolled_back`（重跑零新增与**扩窗恢复**同时成立；日期短路退役）；**N07** 回执重建按**墓碑 ID** 去重、排除已撤墓碑（新旧两枚各算事件）；**N08** 指代召回按身份过滤（unknown 不读共享最后一条）；**N09** 会话身份**归一** `normSid`（`session-1` ≡ `1`，与索引器剥前缀对齐；**教训**：首版误放 apply 内 ⇒ 模块函数 ReferenceError 被 catch 吞、C3 全哑——复跑捉出，上移模块级）；**N10** 失败压缩不计成功（`data.error` 另计）；**N11** 工具参数读 `exec.arguments`；**N12** 占位改**固定白名单**（summary/resolution/story/ref 全文一律剔除，仅留短摘要与来源 type——四库夹具全文均消）；**N13** **计量口径统一**（agePrefix/depth 装配前移，used=«除 budget 外整响应»同算法复算 **diff=0**）；**N14** reflect/depth **有效档位同源**（`readTierActive` 按 readDepthOf；pointer+reflect ⇒ full 标签+全文，不再 81 字）。",
  "**复跑验收**：她的 `core-boundaries`（N01/N02/N05/N06 全翻转）· `boundaries-repro`（N08/N09/N10/N11 全翻转）· `token-boundaries`（N07/N12/N13/N14 全翻转；**注**：其脚本 import `snapshot/akasha` ⇒ 复跑前须以活代码覆盖该目录，否则跑的是旧快照）；核心套件 **248/248**、插件自测过、三组 FINAL 输出留档 `tmp/r3-verify/`。sleep 插件 **1.10.7-h1** 已打包安装（restart-required）。**统一四规则落地**：JSON 解析式脱敏 · 结构化 plan/op/tombstone 身份 · 有效退役状态 · 规范化 session 身份——「每个入口各补一条近似规则」的模式就此收束。**已知边界（如实）**：hint 文案已同步「仅示摘要」；BUDGET 自身仍不计入 used（公开软上限语义未变，元数据计入 reserve）。",
].join('');
const r = appendRecord('canon', {
  id: 'canon-gpt-review3-20261014',
  claim,
  source: { type: '复现', ref: 'tmp/r3-verify（她三脚本复跑：FINAL-core-boundaries/boundaries/token）· tmp/gpt-r3-batch1/2/3.mjs · test 248/248 · sleep 1.10.7-h1' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['外部审查', 'GPT', '第三轮', 'N01', 'N14', '复检'],
});
console.log('已入 canon：' + r.id);
