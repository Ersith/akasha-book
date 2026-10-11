// akasha/tools/harvest-20261009z49-verification-discipline.mjs
// 2026-10-09 立：验证与证据纪律（ARTEX 移植；PROTOCOL §六）。幂等。
import { loadStore, currentRecords, appendRecord } from '../lib.mjs';

const tips = currentRecords(loadStore('canon').records);
if (tips.some((r) => r.id.startsWith('canon-verification-discipline'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('canon', {
  id: 'canon-verification-discipline-20261009',
  claim:
    '**验证与证据纪律（2026-10-09 立 · ARTEX 移植）**：①**三态裁决**——验证类结论只取 `reproduced` / `fixed` / `inconclusive`，达不到证据门槛**默认 inconclusive**，不许口头升格"应该好了"；②**对照纪律**——`fixed` 类结论**必须附正常对照**（修复对象确已失效 + 其余链路仍正常 = 环境可比）；对照跑不起来最多 inconclusive（ARTEX 原话：「一次请求失败或未命中不能证明已修复」）；③**证据可重放**——复现/修复类证据（含 source.ref）优先贴可执行命令 + 原始回显 + 对照输出，不能重放显式标注"转述"；④**写回才算数**——含负结论（"不是 X"）先落库后收尾，预算紧时先落库后总结；⑤**泛化指向**——凡「更好了 / A 生效了」类主张，先追**反例在哪、对照在哪**，找不到就降级 inconclusive。**为什么（思考层）**：无法对照的"修复"与"假修复"不可区分；这条把不可检的"好"投影成可检的"对照"——与我们的投影律同构。**应用点**：复现门/credibility、CHECKS 发布记录、插件复验、sleep 计划证据、orphan 负结论留痕。落点：`akasha\\PROTOCOL.md` §六；派单模板 `docs\\runbook\\delegation-brief.md`（含反面教材：交付物类验收必须绑产物实物）。参照 research\\artex-study-20261009.md §11/§12。',
  source: { type: '复现', ref: 'ARTEX 复测 Agent 实测（reproduced→fixed 翻转，drive11/12）；agent/retester.go 提示词；本会话实验与观察记录' },
  event_time: '2026-10-09',
  last_reviewed: '2026-10-09',
  tags: ['纪律', '验证', '对照', '证据', 'ARTEX移植']
});
console.log('已入 canon：' + rec.id);
