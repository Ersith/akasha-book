// akasha/tools/harvest-20261007t-session-usage.mjs
// 2026-10-07 留痕：会话层用法条目（canon-session-layer-usage-20261007）+ 主用法总纲 ㉑ 会话层指针（修订链）。幂等。
import { appendRecord, loadStore, revise } from '../lib.mjs';

const rec = {
  id: 'canon-session-layer-usage-20261007',
  claim:
    '阿卡夏·会话层（session layer）用法总纲（2026-10-07 v0 落地）：会话（含官方压缩掉的历史）→ 段级条目（intent / action / conclusion / process）→ 结论优先检索。命令：`node akasha.mjs session index <sessionId|文件路径> [--full]` / `session lookup <词> [--kind a,b --since D --until D --process --limit N]` / `session context [--session ID --budget N]` / `session stats` / `session help`；MCP：`akasha_session_lookup`。数据：`data\\session.jsonl` + `session-meta.json`（append-only；不在六库 STORES 内，check / audit 不涉；段 id＝`seg-<sid8>-<seq>-<指纹>`，同内容幂等、档案重写漂移追加新版）。**查询纪律**：结论＋动作＝第一入口；过程段仅按需局部调取、绝不整体查阅；官方压缩摘要仅作背景，冲突以带 seq 指针、可回原档的会话层为准。**调用分级**：被动行（脉搏 / 压缩事件行）→ 定向轻查（session lookup；主库 lookup / brief）→ 深取回档（--process / ptr 回原档；主库 cross / show）。**记录分级**：对阿卡夏与会话层自身的调用同样进 action 段、同样标「重要度 / 意图 / 一行结果」，并留痕「查了什么、命中什么、是否够用」。计分：整词 ×1 + 中文 bigram 回退 ×0.25（弱命中显示 <1；结论加成只进排序权重，不进展示分）。覆盖边界（如实）：旧格式（8–9 月 chunk 型会话）仅部分可抽取；读取侧 `frameFails` 记录损坏 / 半写帧。',
  source: {
    type: '复现',
    ref: 'session.mjs + test.mjs（68/68）+ 计划执行记录 docs\\superpowers\\plans\\2026-10-07-session-layer-v0.md（含账本与复核记录）'
  },
  last_reviewed: '2026-10-07',
  event_time: '2026-10-07',
  tags: ['会话层', 'session', '用法', '分级', '结论优先', 'akasha_session_lookup']
};

const existing = new Set(loadStore('canon').records.map((r) => r.id));
if (existing.has(rec.id)) console.log('已存在，跳过：' + rec.id);
else {
  appendRecord('canon', rec);
  console.log('已追加 [canon] ' + rec.id);
}

// 主用法总纲加一行指针（修订链；从链尾继续）
const usageRecords = loadStore('canon').records;
const tip = (() => {
  const byId = new Map(usageRecords.map((r) => [r.id, r]));
  let cur = byId.get('canon-akasha-usage');
  if (!cur) return null;
  for (;;) {
    const next = usageRecords.find((r) => r.supersedes === cur.id);
    if (!next) break;
    cur = next;
  }
  return cur;
})();
if (!tip) {
  console.log('未找到 canon-akasha-usage');
  process.exit(1);
}
if (tip.claim.includes('㉑')) {
  console.log('已含 ㉑ 指针，跳过：' + tip.id);
} else {
  const patch = {
    claim:
      tip.claim +
      '\n**㉑ 会话层（2026-10-07）**：单会话记忆层已落地——命令 `node akasha.mjs session …`（index / lookup / context / stats / help），MCP `akasha_session_lookup`；纪律：结论＋动作＝第一入口、过程段仅按需局部调取（官方压缩摘要仅作背景，冲突以可回原档的会话层为准）；分级见条目自身。详见 canon-session-layer-usage-20261007。'
  };
  const r = revise('canon', tip.id, patch);
  console.log('已修订：' + tip.id + ' → ' + r.id);
}
