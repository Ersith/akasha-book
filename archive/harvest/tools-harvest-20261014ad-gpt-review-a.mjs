// 2026-10-14：GPT 审查（15 项）验证 + 第一批修复留痕。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-gpt-review-'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**GPT 外部审查（15 项：8 P1 + 7 P2）独立验证 + 第一批（核心完整性）修复（2026-10-14）**。',
  '**验证（作者不自证；我方逐条复现）**：证据包五组复现脚本（core/plugins/sleep/token/interpolation）**全部由我重跑**；六个核心文件与活树**逐字节同源**；15/15 **全部属实**——F01 协议可被普通修订夹带 `retires` 抹掉（check 零报错）、F03 二次修订+回滚出两个当前版本、F02 引号/JSON/对象脱敏全漏且落库、F04 跨来源/反价合并、F05 分批回执覆盖、F06 真宿主渲染抛 `unknown prompt variable`、F07 未处理拒绝 exit 1、F08 预算不约束（cross `budget:null` 且 maxTokens/offset 不透传）、F09–F15 全中。',
  '**第一批已修（A 档·核心完整性；均带守卫测试）**：**F01** 普通修订拒写状态字段（supersedes/retires/revokes/rollback_of/retired_at/retired_reason）+ 协议链回滚标 `refused:protocol`；**F03** 回滚按**链聚合**（从当前链尾一次恢复、候选=窗口内未回滚修订）——消灭分叉；**F14** 退役链普通修订默认拒（revoke 后放行）；**F15** 硬删闭包含**全部墓碑+撤销行**（无残留、check 干净）；**F02** 脱敏补引号/JSON 形态 + **按键遮蔽**（redactDeep 键名判定）；**附带**：`revise` 文件参数由 `opts.storeFile` 统一为 `opts.file || storeStore…`（与其他函数一致）。**验证**：主套件 **236→237** 全过 · family-sweep 全绿 · check **734/734** · **用她们原脚本对补丁后代码复跑：F01/F03/F14/F15/F02 全部转绿**（间接修订已拒、协议回滚 refused、回滚单一当前版本、硬删零残留、三形态全遮且不落库）。',
  '**待办批次**：**B**＝F05（回执历史）/F11（水位后置）/F04（合并资格共用检查）/F06/F07/F12/F13（插件四处）/F09/F10（会话状态隔离）；**C**＝F08（token：按 Master 口径**性能优先**——先修「预算不约束完整响应/字段漏计/maxTokens·offset 不透传」并加**可续取分页**，保完整原文可达，再做削减）；另并入 Claude 审查要点（genre_render 侧线恒 false、长会话阈值文档漂移 2000/3000、回执文件丢失无法 revoke 等，待其明细文件入工作区后合并排期）。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-gpt-review-20261014-a',
  claim,
  source: { type: '复现', ref: 'tmp/gpt-review/（GPT 报告+证据包原件）· 五组复现脚本重跑 · fixcheck 复跑（她们脚本×补丁后代码）· test 237/237 · check 734/734' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['外部审查', 'GPT', '修复', 'F01', 'F02', 'F03', 'F14', 'F15'],
});
console.log('已入 canon：' + r.id);
