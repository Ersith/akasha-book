// akasha/tools/harvest-20261009z45-usage-self-note.mjs
// 2026-10-09：用法条同步——注入面增 akasha:self（受控路径 allowProtocol；行为更新→同批同步用法）。幂等。
import { loadStore, currentRecords, revise } from '../lib.mjs';

const tips = currentRecords(loadStore('canon').records);
const usage = tips.find((r) => r.id === 'canon-akasha-usage' || r.id.startsWith('canon-akasha-usage-r'));
if (!usage) { console.log('未找到用法条'); process.exit(1); }
if (usage.claim.includes('自我层批')) { console.log('已含，跳过：' + usage.id); process.exit(0); }

const r = revise('canon', usage.id, {
  claim: usage.claim +
    '\n**（2026-10-09 自我层批）**：系统提示注入现为**两段**——`akasha:self`（order 699，**自我层**：渲染时读 canon 中 tag『自我』的当前条目（self-concept 定义权/权重、address-layers 称呼体系、memory-auto-record 记忆权），每条压缩到句界 injected；**每会话自动核对「我是谁」**）与 `akasha:protocol`（order 700，用法条＝本条）。读不到/空域 → 极简兜底，永不抛；切换落线 `gate-self-fallback` / `gate-self-recovered`。见 canon-self-layer-autoinject-20261009 / CHECKS R20。',
  last_reviewed: '2026-10-09'
}, { allowProtocol: true });
console.log('已修订：' + usage.id + ' → ' + r.id);
