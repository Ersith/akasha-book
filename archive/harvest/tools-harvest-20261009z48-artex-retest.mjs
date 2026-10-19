// akasha/tools/harvest-20261009z48-artex-retest.mjs
// 2026-10-09：ARTEX 复测机制实验吸收（对照纪律/三态裁决/证据版本化）。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const tips = currentRecords(loadStore('canon').records);
const rec = tips.find((r) => r.id.startsWith('canon-artex-study'));
if (!rec) { console.log('未找到'); process.exit(1); }
if (rec.claim.includes('复测机制实验')) { console.log('已含，跳过：' + rec.id); process.exit(0); }

const r = revise('canon', rec.id, {
  claim: rec.claim +
    ' **复测机制实验（2026-10-09 晚，吸收）**：对 SSRF finding 实测其「漏洞复测 Agent」（独立会话 + retester 种子提示词 + 两个专用工具）：① 原样复测 → `verdict=reproduced`（约 45 秒，证据 Markdown 含登录绕过取 cookie→SSRF→FLAG 全链）；② **关闭接口（fetch→403）后复测 → `verdict=fixed`**，且复测报告**主动跑正常对照**（登录绕过、内部服务 9000 均正常）以证明「环境可比、修复生效」。**吸收条款**：**修复类结论必须伴随正常对照**（对照不可用最多 inconclusive——"一次请求失败不能证明已修复"），与我们的复现门同构；复测报告格式（结论/步骤/与原始证据差异/依据）与其三态裁决（reproduced/fixed/inconclusive）为现成模板；`evidence_version`/`report_stale` 证据版本化机制后续继续对照。细则 research\\artex-study-20261009.md §11（脚本 drive11/drive12）。',
  last_reviewed: '2026-10-09'
});
console.log('已修订：' + rec.id + ' → ' + r.id);
