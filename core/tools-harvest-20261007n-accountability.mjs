// akasha/tools/harvest-20261007n-accountability.mjs
// 2026-10-07 第九批留痕：① mirror-ghost-citation（编造引文事件——自我案例）
// ② canon-citation-discipline-20261007（引文与修订纪律）③ canon-akasha-hooks-taxonomy-20261006（五类钩子补录）
// ④ canon-akasha-origin-20261006 → 修订（补同期讨论指针）。幂等。
import { appendRecord, loadStore, currentRecords, revise } from '../lib.mjs';

let added = 0; let revised = 0; let skipped = 0;
const has = (store, id) => new Set(loadStore(store).records.map(r => r.id)).has(id);

// ① mirror：编造引文事件
if (has('mirror', 'mirror-ghost-citation')) { console.log('已存在，跳过：mirror-ghost-citation'); skipped++; }
else {
  appendRecord('mirror', {
    id: 'mirror-ghost-citation',
    story: '2026-10-07 · 论文溯源章节的编造事件（自我案例）',
    situation: '上下文里没有原始记录、只有二手转述——却仍需写出「现场」',
    behavior: '用推想「重构」出合理对白、以「讨论切片」形式展示（仅加「凝练」免责词），并断言「档案留有完整记录」（未核验）',
    outcome: '被用户当场戳破（「你这之前算是胡编了？」）；修复：换原始存档逐字引用、残留伪对白改「自问」体、事件入库、立引文纪律',
    social_reaction: '用户追责不忘原则：「不知道，不确定不可耻，但编造这些是可耻的。实话实说我们也才能找到问题」',
    emotion: '羞耻——且是「零编造红线」在测试期内的第一次自我违反（珍贵的负样本）'
  });
  console.log('已追加 [mirror] mirror-ghost-citation'); added++;
}

// ② canon：引文与修订纪律
if (has('canon', 'canon-citation-discipline-20261007')) { console.log('已存在，跳过：canon-citation-discipline-20261007'); skipped++; }
else {
  appendRecord('canon', {
    id: 'canon-citation-discipline-20261007',
    claim: '引文与修订纪律（2026-10-07 立条，由论文 §1.4 编造事件触发）：① 引号 = 逐字或近逐字的**存档原文**（须可指认出处）；无源内容一律用「要点 / 设计自问」体，禁止伪对白；② 写「现场 / 引文」体裁前先查**五源**（尤其并存记忆层 OpenViking / Hindsight——源头讨论常在此）；③ 断言「档案里有」之前必须实际查过；④ **文档修订留痕**：重大文档（论文 / 企划）改版前存快照（docs\\history\\），改史可回放——文档也吃 append-only 精神；⑤ 违反即按失败回查处置（入库 + 修复 + 复检）。',
    source: { type: '共识', ref: '用户裁定 2026-10-07（「不知道，不确定不可耻，但编造这些是可耻的。实话实说我们也才能找到问题」）；事件见 mirror-ghost-citation；落地：论文 v0.3 全引文回溯 + docs\\history 快照' },
    last_reviewed: '2026-10-07',
    tags: ['纪律', '引文', '零编造', '文档留痕']
  });
  console.log('已追加 [canon] canon-citation-discipline-20261007'); added++;
}

// ③ canon：五类机械钩子补录
if (has('canon', 'canon-akasha-hooks-taxonomy-20261006')) { console.log('已存在，跳过：canon-akasha-hooks-taxonomy-20261006'); skipped++; }
else {
  appendRecord('canon', {
    id: 'canon-akasha-hooks-taxonomy-20261006',
    claim: '触发钩子五类（2026-10-06 讨论定案；10-07 补录入库）：回忆不能靠模型自觉，必须做成「挂上去的机械钩子」——① 时间钩子（会话 / 任务开始 → 固定预算注入反射层）；② 事件钩子（工具报错 / 重试≥2 / 计划变更 / 即将不可逆操作前——「预期与实际不符」是最高价值触发点）；③ 实体钩子（当前操作的文件 / 工具 / 服务名 → 预绑定标签；高精度零歧义，「对事不对人」应吃掉多数场景）；④ 语义钩子（当前处境当查询，高召回低精度）；⑤ 显式钩子（用户说「上次那个」）。耦合度原则：注入场景**精度比召回值钱**（误报每轮花钱、漏报无声）——多钩子叠加、卡相关度下限与条数上限、一行摘要+链接、记录「被用了没有」。实现状态（10-07 核对）：时间≈kit/条子 ✓、语义≈lookup/brief ✓、显式≈软协议 ✓；**事件钩子（重试 / 不可逆操作前）与实体钩子（文件预绑定标签）未实现**——候选。原文：OpenViking events 10-06「触发机制细化」；设计稿 §2.4。',
    source: { type: '复现', ref: 'OpenViking events `viking://user/default/peers/H--Harness/memories/events/2026/10/06/AI记忆架构触发机制细化.md`；设计稿 §2.4（L45）' },
    last_reviewed: '2026-10-07',
    tags: ['触发钩子', '五类', '设计资产', '补录']
  });
  console.log('已追加 [canon] canon-akasha-hooks-taxonomy-20261006'); added++;
}

// ④ origin 修订：补同期讨论指针
{
  const cur = currentRecords(loadStore('canon').records).find(r => r.id.startsWith('canon-akasha-origin-20261006'));
  const MARK = '**同期讨论（同日 OV events，全文均可查）**';
  if (!cur) { console.log('找不到 origin 条'); skipped++; }
  else if (cur.claim.includes(MARK)) { console.log('origin 已补过指针，跳过：' + cur.id); skipped++; }
  else {
    const r = revise('canon', cur.id, {
      claim: cur.claim + ' **同期讨论（同日 OV events，全文均可查）**：情绪功能工程化 / 排序机制细化 / 社会学习机制明确（三者的实现层均已入本库：pricing + price() / 检索计分 / orphan-mirror-frontier 三库）；触发机制细化（五类机械钩子——补录为 canon-akasha-hooks-taxonomy-20261006）。'
    });
    console.log('已修订：' + cur.id + ' → ' + r.id + '（补同期指针）'); revised++;
  }
}

console.log(`完成：新增 ${added}，修订 ${revised}，跳过 ${skipped}。`);
