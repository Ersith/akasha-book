// akasha/tools/harvest-20261007o-oss.mjs
// 2026-10-07 开源包留痕：canon-oss-package-20261007（开源包装 v0：产出、扫描、状态）。幂等。
import { appendRecord, loadStore } from './lib.mjs';

const rec = {
  id: 'canon-oss-package-20261007',
  claim: '开源包装 v0（2026-10-07，用户睡前指令「做成可开源的插件包……排除我们自己的记忆、隐私、api……反复检查……标注依赖」）：本地 staging `dist\\akasha-oss\\`（39 文件）——`core/`（lib/sleep/akasha/mcp/test + init-example 示例库初始化器 + SCHEMA/PROTOCOL/README + tools/verify-frontier-urls + data（中性示例）+ data-example（frontier 基石 89 条，脱敏 1 处））+ `plugins/`（gate/hooks/sleep/mcp 四件：全部去硬编码——默认 `~/.akasha`、去 @akasha-book/ 包名、去本机路径；**三插件 selftest 在开源形态全绿**）+ `paper/`（v0.3）+ 根 README/deps.md/License 占位/CHECKS.md。**核心验证**：staging `test.mjs` 57/57（示例库全绿——「拿来即用」闭环）。**隐私扫描四轮**（R1 源→R2 全量→R3 字节/文件名→R4 终扫）：零本机路径/零用户名/零密钥/零个人记忆；残余判定 2 处（论文「用户裁定」=方法论术语，保留）；过程事故两起（扫描器漏检双反斜杠写法→修正；复制命令被本门控按设计拦截→走只读通道）均已留痕 CHECKS.md。**状态**：未发布（用户醒来验收）；开放项：LICENSE 选择 / npm 名可用性 / `<AKASHA_DIR>` 占位。**注**：主库（<AKASHA_DIR>）全程只读、数据零改动（check 64/64/9/9/7/7/8/8/100/100 验证）。',
  source: { type: '复现', ref: 'dist/akasha-oss/（CHECKS.md 四轮扫描记录；test 57/57；三插件 selftest 全绿）；计划 docs/superpowers/plans/2026-10-07-oss-package.md' },
  last_reviewed: '2026-10-07',
  tags: ['开源包装', 'staging', '隐私扫描', '待发布']
};

const existing = new Set(loadStore('canon').records.map(r => r.id));
if (existing.has(rec.id)) console.log('已存在，跳过：' + rec.id);
else { appendRecord('canon', rec); console.log('已追加 [canon] ' + rec.id); }
