// 第二轮「举一反三」结论入库（2026-10-07，幂等）。
// 用法：node akasha\tools\harvest-20261007-sweep2.mjs
import { appendRecord, loadStore } from '../lib.mjs';

const rec = {
  id: 'canon-akasha-sweep2-20261007',
  claim: '第二轮「举一反三」（2026-10-07；换角度=残渣 / 引用完整性 / 最少复查件 / 新脚本幂等）：**新捕获并修复**——① 测试残渣类：test.mjs 把 scratch 写进 `logs/_kit_test|_promote_test|_revise_test`（目录从不删除、历次累计），且曾在 `data/` 写过临时文件 → 全部改 `_scratch` mkdtemp + rmSync；② sleep selftest 的 scratch 泄漏（后段 apply 重建已删目录，历次跑各漏一个）→ 终末统一清理；③ 历史残留清除（logs 3 目录 + _scratch 4 目录），复跑后 **logs 目录 0 / _scratch 残留 0** 实证；④ 并行会话两个新采集脚本经审：`harvest-20261007-frontier-docs.mjs`（12→16 条应用向文献）与 `harvest-20261007b-meta.mjs`（note 修订+留痕）**均幂等** ✓，补入 README 工具清单。**复查全净**：data/ 仅六库 6 文件、akasha 根仅 12 标准件、tools/ 无 `_` 野文件、文档引用工具 15/15 实存、hooks 插件全文复核无需变更、MCP 桥活性 ✓、三套自测全绿（akasha 35/35 + gate/sleep selftest）。**边界登记（非缺陷）**：hooks.jsonl 无轮转（当前 135KB；增长慢，届时应归档而非删除）；显示日期用 **UTC**（审计「2026-10-06」= 本地 10-07 凌晨；按 ISO 约定读）。',
  source: {
    type: '复现',
    ref: '本轮实修与验证（2026-10-07）：test.mjs / sleep selftest 残留修复后双跑实证零残留；README 工具清单更新；三套自测全绿；MCP akasha_kit live ✓'
  },
  last_reviewed: '2026-10-07',
  tags: ['akasha', '类扫', '残留', '幂等', '第二轮']
};

const existing = new Set(loadStore('canon').records.map((r) => r.id));
if (existing.has(rec.id)) {
  console.log('skip  canon ' + rec.id + '（已存在；改内容请用 revise）');
} else {
  appendRecord('canon', rec);
  console.log('added canon ' + rec.id);
}
