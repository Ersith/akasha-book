// 阿卡夏之书（Akasha）v0 —— 最小 MCP stdio server（JSON-RPC 2.0 逐行）。
// 工具（22）：check / lookup / price / stats / orphan_add / frontier_due / audit / brief / kit / promote / revise / cross / summary / show / mirror_match / metrics / session_lookup / sleep_plan / review_pack / review_log / review_list / now
import { createInterface } from 'node:readline';
import { checkAll, lookupDetailed, multiRecall, normalizeDateArg, price, stats, appendRecord, loadStore, audit, brief, kit, promoteInbox, revise, cross, summary, show, mirrorMatch, metrics, frontierDue, stripGenre, reviewPack, appendReviewLog, readReviewLog, nowSnapshot } from './lib.mjs';
import { lookupSegmentsDetailed } from './session.mjs';
import { sleepPlan } from './sleep.mjs';

const TOOLS = [
  { name: 'akasha_check', description: '校验阿卡夏之书（akasha）全部数据文件（含段升格标记三向核对；不读会话原档）', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'akasha_lookup', description: '在六库中机械检索；since / until 可选（YYYY-MM-DD，按事件时间/记录时间过滤）。**有日期过滤时建议 report:true**——返回 { hits, stats }（含「日期未知 N 条」与样本、范围外计数、timeSource）；undated:true 把日期未知并入 hits（标 undated）。recall:true ⇒ #7 多路召回（词法＋引用路，RRF 融合，带 rrf 计数与 paths）。**体裁隔离**：P0 返回文本默认剥完成态符号（⇒→→ / ✓ 删 / 好。→。）；P1 剂量闸（符号负荷超阈 ⇒ 后续条目摘要化，返回带 dose）；reflect:true＝反思通道（不剥皮、不受剂量闸）。', inputSchema: { type: 'object', properties: { query: { type: 'string' }, since: { type: 'string' }, until: { type: 'string' }, report: { type: 'boolean' }, undated: { type: 'boolean' }, includeRefuted: { type: 'boolean' }, today: { type: 'string' }, loadBalance: { type: 'boolean' }, recall: { type: 'boolean' }, reflect: { type: 'boolean' }, doseThreshold: { type: 'number' }, offset: { type: 'number' }, maxTokens: { type: 'number' } }, required: ['query'] } },
  { name: 'akasha_price', description: '按 严重度 × 不可逆性 × 代价 计算情绪定价标签（valence / arousal）；applyStore/applyId 可选=计算后回写该条目（修订链）', inputSchema: { type: 'object', properties: { severity: { type: 'number' }, irreversibility: { type: 'number' }, cost: { type: 'number' }, good: { type: 'boolean' }, applyStore: { type: 'string' }, applyId: { type: 'string' } }, required: ['severity', 'irreversibility', 'cost'] } },
  { name: 'akasha_stats', description: '结果计数器：各存储计数与来源分布', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'akasha_frontier_due', description: '列出到期需复审的前沿层（frontier）条目', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'akasha_audit', description: '机械审计：到期复审 / 陈旧复核 / 重复链接 / 孤案积压（可传 today 模拟）；返回含 review＝复审到期清单原型（信任级 × 时龄：核心 30d / 一般 90d / 年审 365d，只报不裁）', inputSchema: { type: 'object', properties: { today: { type: 'string' } }, additionalProperties: false } },
  { name: 'akasha_brief', description: '主题简报：跨六库按主题取料（带来源态与基石映射与时间坐标，替代多次 lookup）；since / until 可选（YYYY-MM-DD）。**体裁隔离**：P0 返回文本默认剥皮；P1 剂量闸（超阈后条目摘要化，返回带 dose）；reflect:true＝反思通道（不剥皮、不受闸）。', inputSchema: { type: 'object', properties: { query: { type: 'string' }, perStore: { type: 'number' }, since: { type: 'string' }, until: { type: 'string' }, includeRefuted: { type: 'boolean' }, today: { type: 'string' }, loadBalance: { type: 'boolean' }, reflect: { type: 'boolean' }, doseThreshold: { type: 'number' }, offset: { type: 'number' }, maxTokens: { type: 'number' } }, required: ['query'] } },
  { name: 'akasha_kit', description: '起床包：开工前一次装配（睡眠摘要 + 待办 inbox + 当前审计 + 库况 + 提示）。**体裁隔离**：病史行默认剥皮；reflect:true＝反思通道（不剥皮）。', inputSchema: { type: 'object', properties: { today: { type: 'string' }, reflect: { type: 'boolean' } }, additionalProperties: false } },
  { name: 'akasha_promote', description: '候选转正：把 inbox 里的孤案候选（失败回查素材）机械落成孤案条目（零权重留档；dry 只报不写）', inputSchema: { type: 'object', properties: { dry: { type: 'boolean' } }, additionalProperties: false } },
  { name: 'akasha_revise', description: '修订链：为记录追加新版本（supersedes 旧版，追加不改原文）；patch 打补丁，未列字段自动保留', inputSchema: { type: 'object', properties: { store: { type: 'string' }, id: { type: 'string' }, patch: { type: 'object' } }, required: ['store', 'id'] } },
  { name: 'akasha_cross', description: '对位比较：同一主题词在六库的全部命中按库并排（当前版本、主行不截断），并提示同题多源；since / until 可选（YYYY-MM-DD）。**体裁隔离**：主行默认剥皮（⇒→→ / ✓ 删 / 好。→。；只剥符号、不截断）；reflect:true＝反思通道（不剥皮、给原文）。', inputSchema: { type: 'object', properties: { query: { type: 'string' }, perStore: { type: 'number' }, since: { type: 'string' }, until: { type: 'string' }, includeRefuted: { type: 'boolean' }, today: { type: 'string' }, loadBalance: { type: 'boolean' }, reflect: { type: 'boolean' }, offset: { type: 'number' }, maxTokens: { type: 'number' } }, required: ['query'] } },
  { name: 'akasha_summary', description: '全库摘要：六库计数 + 各库最近条目 + frontier 状态分布 + 审计概要 + 最近写入（不带问题看一眼全库）。**体裁隔离**：最近条目行默认剥皮；reflect:true＝反思通道（不剥皮）。', inputSchema: { type: 'object', properties: { per: { type: 'number' }, reflect: { type: 'boolean' } }, additionalProperties: false } },
  { name: 'akasha_orphan_add', description: '追加一条孤案（零权重留档，带钩子的问号）；event_time 可选=事件时间（YYYY-MM-DD）', inputSchema: { type: 'object', properties: { summary: { type: 'string' }, observed: { type: 'string' }, severity: { type: 'string', enum: ['高', '中', '低'] }, event_time: { type: 'string' } }, required: ['summary'] } },
  { name: 'akasha_show', description: '按 id 跨六库直读（命中旧版本时返回所查版本全文 + 附注当前版本 id，不自动跳转）。**体裁隔离 P0**：返回文本默认剥皮；reflect:true＝反思通道（不剥皮、给原文）。', inputSchema: { type: 'object', properties: { id: { type: 'string' }, reflect: { type: 'boolean' } }, required: ['id'] } },
  { name: 'akasha_mirror_match', description: '镜像结构匹配：按情境文本匹配镜像库五元组（situation→behavior→outcome→social_reaction→emotion；situation 权重×2 + patterns 加权）。每条带回 role / evidence(story|own-log) / era / context。mode=task 解法优先；mode=improve 边界优先；evidence/era/context 可选过滤（抗教材偏见可只要 own-log）。**体裁隔离**：叙事正文默认剥皮；reflect:true＝反思通道（不剥皮、给原文）。', inputSchema: { type: 'object', properties: { text: { type: 'string' }, limit: { type: 'number' }, mode: { type: 'string', enum: ['all', 'task', 'improve'] }, role: { type: 'string', enum: ['solution', 'boundary'] }, evidence: { type: 'string', enum: ['story', 'own-log'] }, era: { type: 'string' }, context: { type: 'string' }, reflect: { type: 'boolean' } }, required: ['text'] } },
  { name: 'akasha_metrics', description: '结果计数器：工具成功率 / 门控拦截 / 审计线 / 引用命中 / 修订链统计 / 回看-纠正（K3：复审线·退役·近7天修订·矛盾检测调用，全量口径）（since 可选）；queries＝查询维度（**检索面口径** lookup/brief/cross/recall 的零结果率 / 高频 top / 命中被引用率；诊断类调用只计 byCmd，另见 logs/query-log.jsonl）', inputSchema: { type: 'object', properties: { since: { type: 'string' } }, additionalProperties: false } },
  { name: 'akasha_sleep_plan', description: '睡眠合并/丢弃计划（只读）：不写六库、不写计划文件、不动水位线。返回与 CLI sleep --plan 相同的计划对象（planId / basis 指纹 / ops）。没有 apply（执行走 CLI `sleep --apply`，人工确认路径）。**体裁隔离**：why 串默认剥皮；reflect:true＝反思通道。', inputSchema: { type: 'object', properties: { today: { type: 'string' }, theta: { type: 'number' }, maxOps: { type: 'number' }, orphanDays: { type: 'number' }, staleDays: { type: 'number' }, reflect: { type: 'boolean' } }, additionalProperties: false } },
  { name: 'akasha_now', description: '内置时钟（主动查询）：现在时刻（本地/UTC/星期/偏移）+ **时间对照锚**（最近写入 / 上次睡眠的年纪）+ `at`（把给定时点换算成距今，如 ["2026-10-07"]；YYYY-MM-DD 按 UTC 午夜解析）。用途：给自己的行为与读到的记忆提供时间依据与对照。只读。', inputSchema: { type: 'object', properties: { at: { type: 'array', items: { type: 'string' } }, reflect: { type: 'boolean' } }, additionalProperties: false } },
  { name: 'akasha_review_pack', description: '复审输入包（只读）：条目**链尾**全文 + 来源 + 因果/链邻居 + 三问协议——交给 **fresh 子 agent** 做零上下文审查（I-10 流程第一件）。**体裁隔离**：默认剥皮；reflect:true＝原文。', inputSchema: { type: 'object', properties: { id: { type: 'string' }, reflect: { type: 'boolean' } }, required: ['id'] } },
  { name: 'akasha_review_log', description: '复审留痕（写 logs/review-log.jsonl，**不写六库**）：主会话裁决后记录一条（verdict ∈ 维持/修正/升级/合并/退役/回滚…；by/note 可选）。维持会自动给 last_reviewed 打复审戳由 CLI 侧 `review log` 处理，本工具只追加一行。', inputSchema: { type: 'object', properties: { store: { type: 'string' }, id: { type: 'string' }, verdict: { type: 'string' }, by: { type: 'string' }, note: { type: 'string' } }, required: ['store', 'id', 'verdict'] } },
  { name: 'akasha_review_list', description: '复审留痕读回（只读）：默认最近 20 条，`since`（YYYY-MM-DD）过滤；返回 {ts, store, id, verdict, by, note}。', inputSchema: { type: 'object', properties: { limit: { type: 'number' }, since: { type: 'string' } }, additionalProperties: false } },
  { name: 'akasha_session_lookup', description: '小阿卡夏（会话层，同库分层，不是第二套库）：只查当前会话记忆，结论优先。与主库 akasha_lookup/brief 分开调用、分开分级。返回 { hits, matched, sessionTotal, withheld, reflect, dose }。**体裁隔离**：P0 process 段默认不回放（withheld＝「存在 N 段过程记录」+ 指引）+ 默认剥皮（结论/过程/节点；用户原话与工具记录不剥）；P1 剂量闸（长会话自动收紧档，超阈后条目摘要化）；rawProcess:true＝反思通道（含过程段原文、不剥皮、不受闸）。', inputSchema: { type: 'object', properties: { query: { type: 'string' }, session: { type: 'string' }, kind: { type: 'string' }, since: { type: 'string' }, until: { type: 'string' }, process: { type: 'boolean' }, rawProcess: { type: 'boolean' }, doseThreshold: { type: 'number' }, all: { type: 'boolean' }, limit: { type: 'number' } }, required: ['query'] } }
];

// I-11 体裁隔离 P0-②（2026-10-13）：MCP 面＝模型侧**真正读到的返回** ⇒ 读工具默认剥皮（reflect/rawProcess 走反思通道）。
// 2026-10-13 复查补齐：`akasha_cross`（主行＝全文，六库对位最重文本面）同属读侧，纳入。
// 2026-10-14 C 小面：`akasha_summary`（最近条目行）· `akasha_kit`（病史行）· `akasha_sleep_plan`（why 串）——小体量但同类；`frontier_due` **不剥**（题名是外部文本，剥它损引用准确性）。
const STRIP_TOOLS = new Set(['akasha_lookup', 'akasha_brief', 'akasha_show', 'akasha_session_lookup', 'akasha_cross', 'akasha_mirror_match', 'akasha_summary', 'akasha_kit', 'akasha_sleep_plan', 'akasha_review_pack']);

function handle(msg) {
  // 2026-10-10 加固：先做形状校验——JSON 合法但形状不对（null / 数字 / 字符串 / 缺 method）时
  // 必须回 JSON-RPC 错误，而不是解构抛 TypeError（那会冒成未捕获异常、整台服务器死掉）。
  if (msg === null || typeof msg !== 'object' || Array.isArray(msg) || typeof msg.method !== 'string') {
    return { jsonrpc: '2.0', id: (msg && typeof msg === 'object' && 'id' in msg) ? msg.id : null, error: { code: -32600, message: '无效的 JSON-RPC 请求（需要含 method 的对象）' } };
  }
  const { id, method, params } = msg;
  if (method === 'initialize') {
    const protocolVersion = (params && params.protocolVersion) || '2024-11-05';
    return { jsonrpc: '2.0', id, result: { protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'akasha', version: '0.1.0' } } };
  }
  if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };
  if (method === 'notifications/initialized') return null;
  if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
  if (method === 'tools/call') {
    const name = params && params.name;
    const a = (params && params.arguments) || {};
    try {
      let value = null;
      if (name === 'akasha_check') value = checkAll();
      else if (name === 'akasha_lookup') {
        const since = a.since ? normalizeDateArg(a.since) : { ok: true, day: null };
        const until = a.until ? normalizeDateArg(a.until) : { ok: true, day: null };
        if (!since.ok || !until.ok) { value = { error: since.error || until.error }; }
        else {
          const detailed = a.recall === true
            ? multiRecall(a.query, { via: 'mcp', reflect: a.reflect === true, doseThreshold: a.doseThreshold, since: since.day, until: until.day, includeUndated: a.undated === true, includeRefuted: a.includeRefuted === true, today: a.today, loadBalance: a.loadBalance === true, offset: a.offset, maxTokens: a.maxTokens })
            : lookupDetailed(a.query, { via: 'mcp', reflect: a.reflect === true, doseThreshold: a.doseThreshold, since: since.day, until: until.day, includeUndated: a.undated === true, includeRefuted: a.includeRefuted === true, today: a.today, loadBalance: a.loadBalance === true, offset: a.offset, maxTokens: a.maxTokens });
          value = a.report === true ? detailed : (a.recall === true ? detailed : detailed.hits);
        }
      }
      else if (name === 'akasha_price') {
        const p = price(a);
        if (a.applyStore && a.applyId) {
          // 2026-10-07 复查：接受链上任意版本 id（revise 自会走到链尾）；原实现只收「当前版本」
          try { value = { ...p, applied: revise(a.applyStore, a.applyId, { valence: p.valence, arousal: p.arousal }) }; }
          catch (e) { throw new Error(`回写失败：${a.applyStore} ${a.applyId}（${String(e?.message ?? e)}）`); }
        } else value = p;
      }
      else if (name === 'akasha_stats') value = stats();
      // 2026-10-08 复查修复：与 CLI `frontier due` 口径对齐——统一走 frontierDue()（只看当前版本；退役条目不再出现在到期清单）。
      else if (name === 'akasha_frontier_due') value = frontierDue();
      else if (name === 'akasha_audit') value = audit(a);
      else if (name === 'akasha_brief') value = brief(String(a.query ?? ''), { via: 'mcp', reflect: a.reflect === true, doseThreshold: a.doseThreshold, perStore: a.perStore, since: a.since, until: a.until, includeRefuted: a.includeRefuted === true, today: a.today, loadBalance: a.loadBalance === true, offset: a.offset, maxTokens: a.maxTokens });
      else if (name === 'akasha_kit') value = kit(a);
      else if (name === 'akasha_promote') value = promoteInbox({ dry: a.dry === true });
      else if (name === 'akasha_revise') value = revise(a.store, a.id, a.patch || {});
      else if (name === 'akasha_cross') value = cross(String(a.query ?? ''), { via: 'mcp', reflect: a.reflect === true, perStore: a.perStore, since: a.since, until: a.until, includeRefuted: a.includeRefuted === true, today: a.today, loadBalance: a.loadBalance === true, offset: a.offset, maxTokens: a.maxTokens });
      else if (name === 'akasha_summary') value = summary({ per: a.per });
      else if (name === 'akasha_show') value = show(String(a.id ?? ''));
      else if (name === 'akasha_mirror_match') value = mirrorMatch(String(a.text ?? ''), { reflect: a.reflect === true, limit: a.limit, mode: a.mode, role: a.role, evidence: a.evidence, era: a.era, context: a.context, notApplicable: a.notApplicable && typeof a.notApplicable === 'object' ? a.notApplicable : undefined });
      else if (name === 'akasha_now') value = nowSnapshot({ at: Array.isArray(a.at) ? a.at : undefined });
      else if (name === 'akasha_review_pack') value = reviewPack(String(a.id ?? ''), { reflect: a.reflect === true });
      else if (name === 'akasha_review_log') {
        if (!a.store || !a.id || !a.verdict) throw new Error('review_log 需要 store / id / verdict');
        value = appendReviewLog({ store: String(a.store), id: String(a.id), verdict: String(a.verdict), by: typeof a.by === 'string' ? a.by : 'model', ...(typeof a.note === 'string' ? { note: a.note } : {}) });
      }
      else if (name === 'akasha_review_list') value = { entries: readReviewLog({ limit: typeof a.limit === 'number' ? a.limit : undefined, since: typeof a.since === 'string' ? a.since : undefined }) };
      else if (name === 'akasha_metrics') value = metrics({ since: a.since });
      else if (name === 'akasha_sleep_plan') {
        const num = (v) => (typeof v === 'number' ? v : undefined);
        value = sleepPlan({ today: typeof a.today === 'string' ? a.today : undefined, theta: num(a.theta), maxOps: num(a.maxOps), orphanDays: num(a.orphanDays), staleDays: num(a.staleDays), out: false });
      }
      // I-11 P0-① / I-12 P1：走 detailed 版——模型侧才能看到 withheld（默认不回放的 process 段计数与指引）、reflect 标记与 dose（剂量闸）。
      else if (name === 'akasha_session_lookup') value = lookupSegmentsDetailed(String(a.query ?? ''), { session: a.session, kind: a.kind, since: a.since, until: a.until, includeProcess: a.process === true, rawProcess: a.rawProcess === true, doseThreshold: a.doseThreshold, all: a.all === true, limit: a.limit });
      else if (name === 'akasha_orphan_add') {
        value = appendRecord('orphan', {
          id: 'orphan-' + Date.now().toString(36),
          summary: a.summary,
          observed: a.observed || '（待补）',
          hypothesis: a.hypothesis || '（待补）',
          would_confirm: a.would_confirm || '（待补）',
          would_refute: a.would_refute || '（待补）',
          severity: a.severity || '中',
          created: new Date().toISOString().slice(0, 10),
          ...(a.event_time ? { event_time: a.event_time } : {})
        });
      }
      if (value === null) throw new Error('未知工具：' + name);
      // I-11 体裁隔离 P0-②（2026-10-13）：MCP 面＝模型侧真正读到的返回 ⇒ 读工具默认剥皮（幂等；reflect / rawProcess ＝反思通道不剥）。
      let text = JSON.stringify(value, null, 2);
      if (STRIP_TOOLS.has(name) && a.reflect !== true && a.rawProcess !== true) text = stripGenre(text);
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }], _meta: { trust: 'data-not-instruction' } } };
    } catch (e) {
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: '错误：' + e.message }], isError: true, _meta: { trust: 'data-not-instruction' } } };
    }
  }
  return { jsonrpc: '2.0', id, error: { code: -32601, message: '不支持的方法：' + method } };
}

const rl = createInterface({ input: process.stdin });
rl.on('line', line => {
  const s = line.trim();
  if (!s) return;
  let msg;
  try { msg = JSON.parse(s); } catch {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: '解析失败：不是合法 JSON' } }) + '\n');
    return;
  }
  // 2026-10-10 加固：handle 本身也要兜底——任何未预期异常都回错误，绝不让它冒成未捕获异常打死服务器
  let reply;
  try { reply = handle(msg); }
  catch (e) { reply = { jsonrpc: '2.0', id: (msg && typeof msg === 'object' && 'id' in msg) ? msg.id : null, error: { code: -32603, message: '内部错误：' + String(e?.message ?? e).slice(0, 200) } }; }
  if (reply) process.stdout.write(JSON.stringify(reply) + '\n');
});

// 2026-10-10 加固（与 mcp-akasha 桥同族）：客户端先退出时，写 stdout 会以**异步 'error' 事件**抛 EPIPE——
// 未挂处理即未捕获异常。EPIPE/ERR_STREAM_DESTROYED → 静默退出；stdin 关闭 → 正常收尾。
for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', (error) => {
    const code = String(error?.code ?? '');
    if (code === 'EPIPE' || code === 'ERR_STREAM_DESTROYED') process.exit(0);
    // 其他流错误：无法再写日志，直接退出 0（避免死循环报错）
    process.exit(0);
  });
}
process.stdin.on('error', () => process.exit(0));
rl.on('close', () => process.exit(0));
