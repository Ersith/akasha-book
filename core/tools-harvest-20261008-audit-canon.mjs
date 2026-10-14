// 2026-10-08：全库体检结论 + 不变式常驻门 —— 留痕入户（用户要求「保险起见整个阿卡夏之书再看看」）。
import { appendRecord, loadStore, allIds } from './lib.mjs';

const REC = {
  id: 'canon-akasha-wholelib-audit-20261008',
  claim: '全库体检（2026-10-08，用户要求「保险起见整个阿卡夏之书再看看」；起因＝退役原语引入后自查发现「复活」事故）：六库 **硬问题 0**——无库内重复 id、无跨库同名、无悬空 supersedes/retires、无环、无「退役者仍在当前集」、无日期/前缀/枚举违规、无可达性异常；frontier 无过期未复审项。周边：`_trash` 备份（canon 16 行 / frontier 25 行）均可解析，hooks 近期仅 1 条 agent-error（本会话自有工具失败），睡眠报告可解析。**会话层澄清**：22 个「同 id 不同内容」的弧线节点经核为**跨代**（id 不含代、由 `treegen` 区分代际，各代互异；`latestNodes()` 取最新代）——属设计，非缺陷；同 id 同代真重复 0 个。**常驻门**：`test.mjs` 新增「全库不变式」用例（重复 id / 悬空引用 / 退役者入当前集 / 跨库同名四项，逐库遍历），此后该类问题由套件拦截而非靠临时探针（当时 90/90 绿）。体检脚本 `tools/audit-20261008-whole-library.mjs`（只读、可复跑、有硬问题则退出码 1）。',
  source: { type: '复现', ref: 'akasha/tools/audit-20261008-whole-library.mjs 输出 + test.mjs「全库不变式」用例 + _scratch/probe-session-dup2.mjs 跨代核实' },
  last_reviewed: '2026-10-08',
  event_time: '2026-10-08',
  tags: ['akasha', '体检', '不变式', '会话层', '门禁'],
};

const existing = allIds(loadStore('canon').records);
if (existing.has(REC.id)) console.log('跳过（已存在） ' + REC.id);
else { appendRecord('canon', REC); console.log('已追加 [canon] ' + REC.id); }
