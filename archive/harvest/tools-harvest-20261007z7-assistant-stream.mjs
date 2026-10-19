// akasha/tools/harvest-20261007z7-assistant-stream.mjs
// 2026-10-07 留痕：流环格式真值修正（assistant-stream）→ canon spin 链 r4。幂等。
import { loadStore, revise, currentRecords } from './lib.mjs';

const APPENDIX =
  ' **格式真值修正（2026-10-07 晚，重启后首验触发）**：实测重启后 **零 `loop-watch`/探针** → 根因＝`assistant/chunk` 是 **V0 遗物**（官方 `KNOWN_SESSION_EVENT_TYPES` 无此事件；v1→v2 已「released」）；现役 v4 唯一实时面＝**`agent/assistant-stream` 帧**（`AssistantStreamAttempt`：start/chunk/end；`{attemptId,turn,step,chunk}`；对 dsh-agent-loop + dsh-headless/官方消费口径三方核实）。修：流环改挂该帧（`assistant/chunk` 仅兼容保留）→ **0.2.2**；selftest **18/18**（新增「assistant-stream 帧」用例，红→绿）。**附加发现（守卫对照）**：`dsh-thinking-loop-guard` 的流式半同样只收 `assistant/chunk` ⇒ 在现役 DSH 上其「实时内容检测」实为死路——「借法不装」再获一证。';

const tips = currentRecords(loadStore('canon').records);
const tip = tips.find((r) => r.id.startsWith('canon-spin-loop-frontier-20261007'));
if (!tip) { console.log('未找到 canon-spin-loop-frontier 链尾'); process.exit(1); }
if (tip.claim.includes('格式真值修正（2026-10-07 晚')) { console.log('已含修正段，跳过：' + tip.id); process.exit(0); }
const r = revise('canon', tip.id, { claim: tip.claim + APPENDIX });
console.log('已修订：' + tip.id + ' → ' + r.id);
