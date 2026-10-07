// 阿卡夏之书（Akasha）v0 —— 最小 MCP stdio server（JSON-RPC 2.0 逐行）。
// 工具（17）：check / lookup / price / stats / orphan_add / frontier_due / audit / brief / kit / promote / revise / cross / summary / show / mirror_match / metrics / session_lookup
import { createInterface } from 'node:readline';
import { checkAll, lookup, price, stats, appendRecord, loadStore, audit, brief, kit, promoteInbox, revise, cross, summary, show, mirrorMatch, metrics } from './lib.mjs';
import { lookupSegments } from './session.mjs';

const TOOLS = [
  { name: 'akasha_check', description: '校验阿卡夏之书（akasha）全部数据文件（可机检门控的雏形）', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'akasha_lookup', description: '在六库中机械检索；since / until 可选（YYYY-MM-DD，按事件时间/记录时间过滤，无戳条目被排除）', inputSchema: { type: 'object', properties: { query: { type: 'string' }, since: { type: 'string' }, until: { type: 'string' } }, required: ['query'] } },
  { name: 'akasha_price', description: '按 严重度 × 不可逆性 × 代价 计算情绪定价标签（valence / arousal）；applyStore/applyId 可选=计算后回写该条目（修订链）', inputSchema: { type: 'object', properties: { severity: { type: 'number' }, irreversibility: { type: 'number' }, cost: { type: 'number' }, good: { type: 'boolean' }, applyStore: { type: 'string' }, applyId: { type: 'string' } }, required: ['severity', 'irreversibility', 'cost'] } },
  { name: 'akasha_stats', description: '结果计数器：各存储计数与来源分布', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'akasha_frontier_due', description: '列出到期需复审的前沿层（frontier）条目', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'akasha_audit', description: '机械审计：到期复审 / 陈旧复核 / 重复链接 / 孤案积压（可传 today 模拟）', inputSchema: { type: 'object', properties: { today: { type: 'string' } }, additionalProperties: false } },
  { name: 'akasha_brief', description: '主题简报：跨六库按主题取料（带来源态与基石映射与时间坐标，替代多次 lookup）；since / until 可选（YYYY-MM-DD）', inputSchema: { type: 'object', properties: { query: { type: 'string' }, perStore: { type: 'number' }, since: { type: 'string' }, until: { type: 'string' } }, required: ['query'] } },
  { name: 'akasha_kit', description: '起床包：开工前一次装配（睡眠摘要 + 待办 inbox + 当前审计 + 库况 + 提示）', inputSchema: { type: 'object', properties: { today: { type: 'string' } }, additionalProperties: false } },
  { name: 'akasha_promote', description: '候选转正：把 inbox 里的孤案候选（失败回查素材）机械落成孤案条目（零权重留档；dry 只报不写）', inputSchema: { type: 'object', properties: { dry: { type: 'boolean' } }, additionalProperties: false } },
  { name: 'akasha_revise', description: '修订链：为记录追加新版本（supersedes 旧版，追加不改原文）；patch 打补丁，未列字段自动保留', inputSchema: { type: 'object', properties: { store: { type: 'string' }, id: { type: 'string' }, patch: { type: 'object' } }, required: ['store', 'id'] } },
  { name: 'akasha_cross', description: '对位比较：同一主题词在六库的全部命中按库并排（当前版本、主行不截断），并提示同题多源；since / until 可选（YYYY-MM-DD）', inputSchema: { type: 'object', properties: { query: { type: 'string' }, perStore: { type: 'number' }, since: { type: 'string' }, until: { type: 'string' } }, required: ['query'] } },
  { name: 'akasha_summary', description: '全库摘要：六库计数 + 各库最近条目 + frontier 状态分布 + 审计概要 + 最近写入（不带问题看一眼全库）', inputSchema: { type: 'object', properties: { per: { type: 'number' } }, additionalProperties: false } },
  { name: 'akasha_orphan_add', description: '追加一条孤案（零权重留档，带钩子的问号）；event_time 可选=事件时间（YYYY-MM-DD）', inputSchema: { type: 'object', properties: { summary: { type: 'string' }, observed: { type: 'string' }, severity: { type: 'string', enum: ['高', '中', '低'] }, event_time: { type: 'string' } }, required: ['summary'] } },
  { name: 'akasha_show', description: '按 id 跨六库直读（命中旧版本时返回所查版本全文 + 附注当前版本 id，不自动跳转）', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'akasha_mirror_match', description: '镜像结构匹配：按情境文本匹配镜像库（五元组 + patterns 加权），返回最接近的结构模式', inputSchema: { type: 'object', properties: { text: { type: 'string' }, limit: { type: 'number' } }, required: ['text'] } },
  { name: 'akasha_metrics', description: '结果计数器：工具成功率 / 门控拦截 / 审计线 / 引用命中 / 修订链统计（since 可选）', inputSchema: { type: 'object', properties: { since: { type: 'string' } }, additionalProperties: false } },
  { name: 'akasha_session_lookup', description: '会话层检索（结论优先；默认不含过程段，process=true 纳入；since/until 可选）', inputSchema: { type: 'object', properties: { query: { type: 'string' }, session: { type: 'string' }, kind: { type: 'string' }, since: { type: 'string' }, until: { type: 'string' }, process: { type: 'boolean' }, limit: { type: 'number' } }, required: ['query'] } }
];

function handle(msg) {
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
      else if (name === 'akasha_lookup') value = lookup(a.query, { since: a.since, until: a.until });
      else if (name === 'akasha_price') {
        const p = price(a);
        if (a.applyStore && a.applyId) {
          // 2026-10-07 复查：接受链上任意版本 id（revise 自会走到链尾）；原实现只收「当前版本」
          try { value = { ...p, applied: revise(a.applyStore, a.applyId, { valence: p.valence, arousal: p.arousal }) }; }
          catch (e) { throw new Error(`回写失败：${a.applyStore} ${a.applyId}（${String(e?.message ?? e)}）`); }
        } else value = p;
      }
      else if (name === 'akasha_stats') value = stats();
      else if (name === 'akasha_frontier_due') value = loadStore('frontier').records.filter(r => r.next_review <= new Date().toISOString().slice(0, 10));
      else if (name === 'akasha_audit') value = audit(a);
      else if (name === 'akasha_brief') value = brief(String(a.query ?? ''), { perStore: a.perStore, since: a.since, until: a.until });
      else if (name === 'akasha_kit') value = kit(a);
      else if (name === 'akasha_promote') value = promoteInbox({ dry: a.dry === true });
      else if (name === 'akasha_revise') value = revise(a.store, a.id, a.patch || {});
      else if (name === 'akasha_cross') value = cross(String(a.query ?? ''), { perStore: a.perStore, since: a.since, until: a.until });
      else if (name === 'akasha_summary') value = summary({ per: a.per });
      else if (name === 'akasha_show') value = show(String(a.id ?? ''));
      else if (name === 'akasha_mirror_match') value = mirrorMatch(String(a.text ?? ''), { limit: a.limit });
      else if (name === 'akasha_metrics') value = metrics({ since: a.since });
      else if (name === 'akasha_session_lookup') value = lookupSegments(String(a.query ?? ''), { session: a.session, kind: a.kind, since: a.since, until: a.until, includeProcess: a.process === true, limit: a.limit });
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
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] } };
    } catch (e) {
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: '错误：' + e.message }], isError: true } };
    }
  }
  return { jsonrpc: '2.0', id, error: { code: -32601, message: '不支持的方法：' + method } };
}

const rl = createInterface({ input: process.stdin });
rl.on('line', line => {
  const s = line.trim();
  if (!s) return;
  let msg;
  try { msg = JSON.parse(s); } catch { return; }
  const reply = handle(msg);
  if (reply) process.stdout.write(JSON.stringify(reply) + '\n');
});
