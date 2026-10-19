// akasha/tools/harvest-20261010z87-three-systems.mjs
// 2026-10-10：README 补「三套记忆系统」+ DSH-Store 上架结果（3 过 2 撤）。幂等。
import { loadStore, currentRecords, appendRecord, revise } from './lib.mjs';

const canon = currentRecords(loadStore('canon').records);

// ① 三系统关系文档化
if (!canon.some((r) => r.id.startsWith('canon-three-memory-systems-doc'))) {
  const rec = appendRecord('canon', {
    id: 'canon-three-memory-systems-doc-20261010',
    claim:
      '**README 公开声明「三套记忆系统」的互补关系（2026-10-10，用户裁定：Hindsight 与 OpenViking 是我们必须的，不讲清则阿卡夏之书并不完整）**。' +
      '用户原话：「hindsight 和 openviking 可以说是我们必须要的，不然阿卡夏之书可以说是并不完整的，这点需要写明。」' +
      '**落点**：OSS `README.md` 新增专节「完整的记忆架构：三套系统，各管一域（阿卡夏并不独自完整）」——' +
      '① 分工表：**阿卡夏管「我」**（判断/教训/纪律/定价/观测）· **OpenViking 管「人」**（偏好/身份/跨项目/源头讨论）· **Hindsight 管「仓」**（架构/约定/决策/在办）；' +
      '② 「缺一件会怎样」三条（缺阿卡夏→判断无处沉淀、缺 OV→把通用解当偏好解、缺 Hindsight→反复重开已定问题）；' +
      '③ 协作三条：五源路由 / 写回按归属落库 / 不复制靠引用（交叉引用走 ID 与 URI）；' +
      '④ 接入方式与**架构依赖声明**：本仓不捆绑也不代替二者，**只用本仓则记忆层不完整**；' +
      '⑤ 边界：把偏好塞 canon、把架构决策塞 orphan 都是污染——「三套分工是设计前提，不是可选装饰」。' +
      '**另**：同批在插件安装节补「上架状态（DSH-Store）」。OSS `9814125`。',
    source: { type: '复现', ref: '用户 2026-10-10 裁定 + OSS 9814125（README diff）' },
    event_time: '2026-10-10',
    last_reviewed: '2026-10-10',
    tags: ['记忆架构', '三系统', 'OpenViking', 'Hindsight', 'README', '文档'],
  });
  console.log('已入 canon：' + rec.id);
}

// ② 上架结果（3 过 2 撤）
const rec2 = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-dsh-store-remediation'));
if (rec2 && !rec2.claim.includes('**上架提交结果（2026-10-10）**')) {
  const add = ' **上架提交结果（2026-10-10）**：按契约「每插件一条」提交 5 个 Issue（#1364–#1368）。**自动预检**：`gate` #1364 / `hooks` #1365 / `session` #1366 = **passed**（含安全启发式扫描通过），留在队列等 8 小时 Catalog 复核；' +
    '**`sleep` #1367 撤回**（`SUBMISSION_SCAN_INCOMPLETE`：唤醒条需动态加载宿主 `@deepseek-ai/dsh-llm` 的 `createUserMessage` 构造注入消息，`lib/index.js` L95；该项为功能必需、非可静态化写法，接受其边界）；' +
    '**`mcp` #1368 撤回**（`SUBMISSION_PATCH_PROTECTED`：Bundle Patch 不得以 `name: @deepseek-ai/...` 引用官方包；官方 mcp-client 未导出注册服务，故无法合规配置）。两条均已评论说明原因并 close，改走 GitHub/npm 手工安装。' +
    '**过程细节**：5 条同时提交被其并发组取消（#101–103 cancelled），逐条编辑重新触发后各自跑完；结论只能从 Actions **artifact**（`plugin-submission-<issue>-<runid>`）读取——机器人不会回复我们（`SUBMISSION_CONTACT {sent:false, reason:historical-repository}`，一人在全局只联系一次的名额早已用掉）。';
  const next = revise('canon', rec2.id, { claim: rec2.claim + add, last_reviewed: '2026-10-10' });
  console.log('已修订：' + rec2.id + ' → ' + next.id);
} else console.log('（上架结果已记录或未找到条目）');
