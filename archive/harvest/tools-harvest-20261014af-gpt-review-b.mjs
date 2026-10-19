// akasha/tools/harvest-20261014af-gpt-review-b.mjs —— GPT 审查修复批 B 留痕（幂等：单一常量）
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-gpt-review-20261014-b'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  "**GPT 审查修复批 B（宿主稳定/管道/数据完整性）（2026-10-14）**。",
  "**已修 8 项**：**F06** sleep 插件动态 context 出口（约定/指代/处境）全部 safeInject 包裹——库原文含 {{unknown}} 类合法模板示例不再炸宿主渲染（真宿主纯渲染函数复跑 ✓）；**F07** mcp 桥 execute 取消路径重写（成功/失败分支都接在 call 本体，不再派生未处理拒绝）——隔离 Node 复跑输出 survived、exit 0 ✓；**F12** 桥子进程 stdout/stderr setEncoding 转 utf8——分块 UTF-8 复跑正确还原「记忆原文」✓；**F13** hooks expandHome 定义前置于使用（TDZ 修复）——非空 AKASHA_DIR 导入复跑 loaded、exit 0 ✓；**F04** 合并资格**计划/执行共用同一检查**（canon/mirror 的 source.type、pricing 的 behavior+valence、lexicon 定义字段；不一致不入并、证据记 refused）；**F05** 回执**并集累计** + filtered 条目带稳定标识——only=A→only=B(force)→revoke 两批全部恢复；**F11** inbox 持久化成功才提交水位（失败停原处、下一轮重读；返回值如实带 inboxWritten）。**F04/F05/F11 均带守卫测试**（跨来源拒/正负定价拒/两批 revoke/水位后置）。",
  "**验证**：主套件 **237→238** 全绿 · **她们的原脚本七组复现（插件三组+插值）全部转绿** · family-sweep 全绿 · check 736/736 · health-check 全绿。**三插件（sleep 1.10.3-h1 / hooks 1.2.6-h1 / mcp 1.1.3-h2）已重打包安装——restart-required，待重启生效**（family-sweep 的代码漂移红即由此而来，安装后已转绿）。**过程教训（如实）**：长命令用 && 串联时被 family-sweep 的非零退出短路，留痕脚本首版又踩引号族（setEncoding('utf8') 的单引号截断字符串）——均已修正补跑。",
  "**剩**：F09/F10（sleep 插件会话状态按 session 分桶 + C3 每回合复位）——下一回合首件；F08（token，**性能优先**：先修预算约束完整响应/字段漏计/maxTokens·offset 直通 + 可续取分页，保原文可达）与 Claude 清单（show 胖/pretty JSON/usage 条 2.9k/文档 2000 漂移/gate 2> /dev/null/fail-open 观测线 等）随 C 批。",
].join('');
const r = appendRecord('canon', {
  id: 'canon-gpt-review-20261014-b',
  claim,
  source: { type: '复现', ref: 'dsh-akasha-sleep/lib/index.js · dsh-mcp-akasha/index.js · dsh-akasha-hooks/index.js · akasha/sleep.mjs（F04/F05/F11）· test 238/238 · 原脚本复跑（my-plugin-results2/my-interp-results2）' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['外部审查', 'GPT', '修复', 'F04', 'F05', 'F06', 'F07', 'F11', 'F12', 'F13'],
});
console.log('已入 canon：' + r.id);
