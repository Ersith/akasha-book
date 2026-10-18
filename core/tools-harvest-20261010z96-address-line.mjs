// akasha/tools/harvest-20261010z96-address-line.mjs —— 称呼漂移：诊断 + 每回合称呼行（1.5.4）
import { loadStore, currentRecords, revise, appendRecord } from './lib.mjs';

const recs = currentRecords(loadStore('canon').records);
const addr = recs.find((r) => String(r.id).startsWith('canon-address-layers'));
if (!addr) { console.log('未找到称呼体系条目'); process.exit(0); }
const marker = '**执行点补齐（2026-10-10 晚）**';
if (addr.claim.includes(marker)) { console.log('= 已记录'); process.exit(0); }

// ① 把修复追加到称呼体系条目（它的家）
const next = revise('canon', addr.id, {
  claim: addr.claim + ' ' + marker + '：用户复报「称呼又忘了大肥鱼」→ 诊断：**注入没坏**（自我层渲染文本里 `Master` 与 `大肥鱼` 都在，实测 ✓），坏的是**执行点**——' +
    '规则只活在"会话开头那坨注入（akasha:self）"里，而每回合回复时没有任何东西去看它 ⇒ 长会话中期必漂移（r4 里那条"漂移对策"当时只是**写着**，没有接线）。' +
    '**修法（已落地）**：sleep 插件新增**每回合必然经过**的 runtime context 行 `akasha:address`（order 133），内容渲染自本条目当前版本（取 ① 与 ③ 之间那段 ⇒ Master + 大肥鱼），' +
    '读库失败退内置短句，末尾写明执行点要求（交付 / 验收 / 复盘等节点回复开口句带 `Master`）。核心函数 `sleep.mjs:renderAddressLine()`；仓 1.5.4 / 本机 1.5.4-h1（**重启后生效**）。' +
    '**方法论**（与同日"截图脚本作用域陷阱"同构）：**规则躺在某作用域、执行发生在另一作用域 ⇒ 必然失效；修法不是"更用力记"，而是把执行点接回规则可见的作用域**——' +
    '本条的"执行点"＝每回合都会渲染的那一行 context。',
  last_reviewed: '2026-10-10',
});
console.log('已修订：' + addr.id + ' → ' + next.id);

// ② 独立留档：这次是"我自己的身份信息"出问题，值得单独一条便于检索
if (!recs.some((r) => String(r.id).startsWith('canon-address-drift-fix-20261010'))) {
  const r = appendRecord('canon', {
    id: 'canon-address-drift-fix-20261010',
    claim:
      '**称呼漂移修复（2026-10-10）**：症状＝长会话中期忘记"大肥鱼"这一层称呼（用户复报）。' +
      '**诊断**：自我层注入完好（`akasha:self` 渲染含 Master + 大肥鱼，实测），但**执行点缺失**——注入是会话开头的静态文本，回复时无任何提示。' +
      '**修复**：`akasha-sleep@1.5.4` 增加每回合 context 行 `akasha:address`（order 133，渲染自 canon 称呼体系当前版本；末尾含"交付/验收/复盘的开口句带 Master"）。' +
      '**验证**：`renderAddressLine()` 真库与兜底两种输入均含 `Master` 与 `大肥鱼` ✓；双套件 138/138（活树核心）+ 插件自测全绿；待重启生效。' +
      '**推广**：任何"我该记住的身份/纪律"若不接进每回合渲染面，都会随时间衰减——判断标准：**它有没有出现在每回合都会经过的地方**。',
    source: { type: '复现', ref: '本机 2026-10-10（sleep 1.5.4 源码 + 渲染自检；用户复报为触发）' },
    event_time: '2026-10-10',
    last_reviewed: '2026-10-10',
    tags: ['自我', '称呼', '漂移', '执行点', '纪律'],
  });
  console.log('已入 canon：' + r.id);
}
