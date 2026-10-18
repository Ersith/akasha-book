// akasha/tools/harvest-20261009z46-artex-study.mjs
// 2026-10-09 留痕：ARTEX 学习（社会学习 v1 的第一个外部系统研究）。幂等。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';

const tips = currentRecords(loadStore('canon').records);
if (tips.some((r) => r.id.startsWith('canon-artex-study'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('canon', {
  id: 'canon-artex-study-20261009',
  claim:
    '**ARTEX 学习（2026-10-09，社会学习 v1 首个外部系统研究）**：对象＝`mhtsec/ARTEX`（AI 自主渗透测试系统，百度 agent+ 冠军，TSecBench 89.78；Go+Postgres+norma SDK；AGPL-3.0；本快照=最后版本纯源码备份）。三路只读深读（README+CHANGELOG / agent 内核 / 旁问·技能·守卫·流量）落档 `research\\artex-study-20261009.md`（带 文件:行号）。**最值钱的五条**：①**归一化归程序**——域名→子域→服务→端点的父子关系与去重 key 全由代码算，agent 只交原始信息；②**单一路径生产者**——planner 唯一产意图 + 硬底线（无在跑无排队必须产方向）+ 防退化守卫（≤3 次只读探测、见 fact 即禁自探）；③**上下文按生命周期摆位**——意图进 system（永不被压缩压掉，弃缓存换不丢）/ 易变态势进 user（保缓存）；④**冷热分层图记忆**——热=活分支祖先链、冷满 6 轮才折、签名复用不调 LLM、无损展开与复活复检；⑤**人机环三件套**——具名取消原因、最小审查输入、拦截文案写「平台管控·非目标防御」（否则渗透 agent 当 WAF 绕过）。**坑侧高分**：空转回合伪装正常结束→Stop 钩子续跑；冷压缩「从不触发」＝**接线缺失非算法错**；审批解析失败 fail-open→剥围栏+强制 JSON；证据与可再生流量分离（删流量不毁证据）。来源态：官方（直读其源码与文档）。可迁移清单 10 条见研究档 §7。',
  source: { type: '官方', ref: 'github.com/mhtsec/ARTEX（快照 5c0dbd4）；research\\artex-study-20261009.md；三路子代理深读（只读）' },
  event_time: '2026-10-09',
  last_reviewed: '2026-10-09',
  tags: ['学习', 'ARTEX', 'agent架构', '上下文工程', '社会学习']
});
console.log('已入 canon：' + rec.id);
