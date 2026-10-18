// akasha/tools/harvest-20261008z29-review-merge.mjs
// 2026-10-08 留痕：外部评审合并批上线（OSS cddc9d6）→ oss-package 链 + usage 条机制变更注记。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const tips = currentRecords(loadStore('canon').records);

const oss = tips.find((r) => r.id.startsWith('canon-oss-package-20261007'));
if (!oss) { console.log('未找到 oss 链尾'); process.exit(1); }
if (oss.claim.includes('外部评审合并批上线')) { console.log('oss 链已含，跳过：' + oss.id); }
else {
  const r = revise('canon', oss.id, {
    claim: oss.claim +
      ' **外部评审合并批上线（2026-10-08）**：Claude 评审修复批（本地分支 fix/review-2026-10）与活树经**三方合并**落装——OSS 推送 `cddc9d6`（22 文件 +704/−120；含 trust-boundary 围栏与修订保护、写入锁/查重/原子写、字节水位、redact 增补 `npm_`/`hf_`/`glpat_`、engines、retire 补步、frontierDue/cross/计分对齐）。验证：活树核心 **97/97**；dist 示例库口径 **104/104**；四插件自检全绿（session 18/18）；同步器升级 `oss-sync-20261008d`（内容级复制＋转换；OSS 测试套件与 live 解耦）**隐私终扫零命中**。过程另抓修 3 个"合并缝"缺陷（opts 透传 / 查重×复活豁免 / 自检注入法）。细则：CHECKS **R12**。'
  });
  console.log('已修订：' + oss.id + ' → ' + r.id);
}

const usage = tips.find((r) => r.id.startsWith('canon-akasha-usage'));
if (usage && !usage.claim.includes('2026-10-08 机制变更')) {
  const r2 = revise('canon', usage.id, {
    claim: usage.claim +
      '\n**（2026-10-08 机制变更·信任边界批）**：本条的修订默认被拒——模型路径（MCP/常规工具）一律不可改；改用法 = 人工经 CLI（`node akasha.mjs … revise` 加 `--allow-protocol`）或受控脚本以 `{ allowProtocol: true }` 调用。背景与验证见 CHECKS R12。'
  }, { allowProtocol: true });
  console.log('已修订 usage：' + usage.id + ' → ' + r2.id);
} else { console.log('usage 条已含机制变更注记（或未找到）'); }
