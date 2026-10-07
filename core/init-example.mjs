// init-example.mjs —— 初始化「示例库」：把中性示例写入 data/（可安全提交与分发；不含任何个人记忆）。
// 用法：node init-example.mjs [--reset]   （--reset：先清空六库再重种）
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendRecord, loadStore, currentRecords, revise } from './lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, 'data');
const EXAMPLE_FRONTIER = join(HERE, 'data-example', 'frontier.jsonl');
mkdirSync(DATA, { recursive: true });

if (process.argv.includes('--reset')) {
  for (const s of ['canon', 'mirror', 'orphan', 'pricing', 'lexicon', 'frontier']) {
    const f = join(DATA, s + '.jsonl');
    if (existsSync(f)) writeFileSync(f, '', 'utf8');
  }
  console.log('已清空六库（--reset）。');
}

let added = 0; let skipped = 0;
const has = (store, id) => new Set(loadStore(store).records.map(r => r.id)).has(id);

const CANON = [
  {
    id: 'canon-akasha-usage',
    claim: '## 阿卡夏之书（示例用法）\n- 事实性断言尽量带来源态：学过 / 接触过 / 记得·库内 / 搜到；未标注按「学过」（未核验）处理。\n- 排序钉子：无据的确定 ≪ 有据的不确定；编造比承认不知道更糟。\n- 开工先 akasha_kit；相关主题先 akasha_brief；查库 akasha_lookup；更正走修订链 akasha_revise。\n- 数据只经校验写入（akasha CLI / MCP 工具）；本段文本随库更新（改用法 = revise 本条）。',
    source: { type: '复现', ref: 'init-example.mjs（示例）' },
    last_reviewed: '2026-10-07'
  },
  {
    id: 'canon-revise-supersedes',
    claim: '修订链（supersedes）：更正 = 追加新版本（新 id 以根 id 加 -rN），原文永久保留；「当前版本」= 未被 supersede 的记录；悬空引用由 check 拦截。',
    source: { type: '复现', ref: '本项目 lib.mjs currentRecords / revise' },
    last_reviewed: '2026-10-07'
  },
  {
    id: 'canon-akasha-self',
    claim: '阿卡夏之书（Akasha）是一个模型无关、文件式、可审计的外置记忆层：六库（canon / mirror / orphan / pricing / lexicon / frontier）× append-only JSONL × 修订链 × 双时态 × 层层纪律（软协议 → 机检 → 审计）。',
    source: { type: '复现', ref: 'README' },
    last_reviewed: '2026-10-07'
  }
];
for (const rec of CANON) { if (has('canon', rec.id)) skipped++; else { appendRecord('canon', rec); added++; } }

// 演示修订链：对 canon-akasha-self 追加一版（幂等：已有 -r1 则跳过）
{
  const cur = currentRecords(loadStore('canon').records).find(r => r.id === 'canon-akasha-self');
  const anyR1 = loadStore('canon').records.some(r => r.id === 'canon-akasha-self-r1');
  if (cur && !anyR1) { revise('canon', 'canon-akasha-self', { tags: ['示例', '修订链演示'] }); added++; } else skipped++;
}

const MIRROR = [
  { id: 'mirror-langlaile', story: '伊索寓言·狼来了', situation: '反复虚构危险、消耗他人信任', behavior: '说谎取乐', outcome: '真危险降临时无人相信', social_reaction: '信任破裂、众人不再响应', emotion: '羞耻' },
  { id: 'mirror-guitu', story: '伊索寓言·龟兔赛跑', situation: '领先者中途轻敌', behavior: '懈怠与停顿', outcome: '被持续行进者反超', social_reaction: '旁观者惋惜与称许', emotion: '骄傲转悔恨' }
];
for (const rec of MIRROR) { if (has('mirror', rec.id)) skipped++; else { appendRecord('mirror', rec); added++; } }

const PRICING = [
  { id: 'price-unverified-claim', behavior: '未核验的确定断言（编造风险）', valence: -1, severity_default: 5, note: '示例：无据的确定 ≪ 有据的不确定' }
];
for (const rec of PRICING) { if (has('pricing', rec.id)) skipped++; else { appendRecord('pricing', rec); added++; } }

const LEXICON = [
  { id: 'lex-overconfidence', term: '过度自信', trigger: '掌握的信息不足以支撑断言强度', behavior: '把「学过」当「记得·库内」使用', resolution: '强制标注来源态；不确定处明说', source: '示例' }
];
for (const rec of LEXICON) { if (has('lexicon', rec.id)) skipped++; else { appendRecord('lexicon', rec); added++; } }

const ORPHAN = [
  { id: 'orphan-example-open-question', summary: '示例孤案：一个尚无同类可比的观察（零权重留档）', observed: '某现象只见过一次，无法归类', hypothesis: '（待补）', would_confirm: '再次观察到同类现象并复盘', would_refute: '发现属于已知类别的变体', severity: '低', created: '2026-10-07' }
];
for (const rec of ORPHAN) { if (has('orphan', rec.id)) skipped++; else { appendRecord('orphan', rec); added++; } }

// frontier 基石：从 data-example 拷入（公开文献；若无则跳过）
{
  const target = join(DATA, 'frontier.jsonl');
  if (!existsSync(target) || readFileSync(target, 'utf8').trim() === '') {
    if (existsSync(EXAMPLE_FRONTIER)) { copyFileSync(EXAMPLE_FRONTIER, target); console.log('已拷入 frontier 基石（公开文献）。'); }
    else console.log('（data-example/frontier.jsonl 不存在，跳过基石）');
  } else skipped++;
}

console.log(`示例库就绪：新增 ${added}，跳过 ${skipped}。运行：node test.mjs / node akasha.mjs stats`);
