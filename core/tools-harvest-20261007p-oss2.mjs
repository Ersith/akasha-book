// akasha/tools/harvest-20261007p-oss2.mjs
// 2026-10-07 留痕：canon-oss-package-20261007 → 修订（LICENSE 定 MIT / 论文 v0.4 / 暂不发布 / 命名反馈）。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const cur = currentRecords(loadStore('canon').records).find(r => r.id.startsWith('canon-oss-package-20261007'));
if (!cur) { console.log('找不到 oss 条'); }
else if (cur.claim.includes('LICENSE 已定 MIT')) { console.log('已修订过，跳过：' + cur.id); }
else {
  const r = revise('canon', cur.id, {
    claim: cur.claim + ' **更新（2026-10-07 晨·用户验收）**：① **LICENSE 已定 MIT**（查证：`deepseek-ai/deepseek-harness` 官方仓库即 MIT License——社区主流；DeepSeek 全家 V3/R1 亦 MIT）；LICENSE 全文落地 + 四包 `license: MIT` 字段。② **论文 v0.4**（依用户裁定重构 §1.4：「源起完整弧线（五轮对话原文节选）」——观察/拆解/设计/驳回/修正 + 七条公理落点；删去原后四条切片；已同步主库 research + docs\\history 快照）。③ 用户命名反馈：npm 名 `akasha-gate` 可用，但「看起来不是阿卡夏之书」——发布前考虑 scope/别名或强化 README 品牌行。④ **暂不发布**（用户明示）；发布开放项见 CHECKS.md（npm 名可用性 / private 字段移除 / `<AKASHA_DIR>` 占位）。'
  });
  console.log('已修订：' + cur.id + ' → ' + r.id);
}
