// 阿卡夏之书（Akasha）CLI。用法：node akasha.mjs <check|stats|lookup|price|orphan|add> [...]
// 例：node akasha.mjs check / node akasha.mjs lookup 狼来了 / node akasha.mjs price --severity 5 --irreversibility 4 --cost 3 --bad
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { checkAll, stats, lookupDetailed, normalizeDateArg, dateCoverageStats, price, appendRecord, loadStore, audit, brief, kit, promoteInbox, revise, cross, summary, show, mirrorMatch, metrics, retireRecord, currentRecords, frontierDue, allocateContextBudget, contextBudgetEnabled, phaseResidueSample, phaseStabilityCheck, placeWithRedundancy, CONTEXT_BUDGET_DEFAULTS } from './lib.mjs';
import { replayHistory, sleepPlan, sleepRun } from './sleep.mjs';
import { indexSession, lookupSegments, renderSessionContext, resolveSessionFile, renderTree, buildTree, appendNodes, loopWatchStats, promoteSegment, SESSION_DEFAULTS } from './session.mjs';

const argv = process.argv.slice(2);
const cmd = argv[0];
const flags = {}; const rest = [];
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    const v = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true;
    flags[k] = v;
  } else rest.push(a);
}
const asJson = !!flags.json;
const print = (obj, human) => console.log(asJson ? JSON.stringify(obj, null, 2) : human);

let code = 0;
switch (cmd) {
  case 'check': {
    const r = checkAll();
    print(r, r.ok
      ? 'OK — ' + Object.entries(r.stores).map(([k, v]) => `${k} ${v.ok}/${v.total}`).join('，')
      : 'FAIL：\n' + r.errors.map(e => '  [' + e.store + '] ' + JSON.stringify(e.errors || e.error)).join('\n'));
    code = r.ok ? 0 : 1;
    break;
  }
  case 'stats': {
    const s = stats();
    print(s, Object.entries(s).map(([k, v]) => `${k}: ${v.total}`).join('\n'));
    break;
  }
  case 'lookup': {
    if (flags.all) { console.error('六库 lookup 没有 --all（那是会话层动作段归并的开关）。被 refute 的记录用 --include-refuted，或 show <id>。'); code = 1; break; }
    const rSel = flags.since ? normalizeDateArg(flags.since) : { ok: true, day: null };
    const rUnt = flags.until ? normalizeDateArg(flags.until) : { ok: true, day: null };
    if (!rSel.ok || !rUnt.ok) { console.error(rSel.error || rUnt.error); code = 1; break; }
    const { hits, stats, knowledge } = lookupDetailed(rest.join(' '), { since: rSel.day, until: rUnt.day, includeUndated: !!flags.undated, includeRefuted: !!flags['include-refuted'], today: typeof flags.today === 'string' ? flags.today : undefined, loadBalance: !!flags['load-balance'], balanceLog: typeof flags['balance-log'] === 'string' ? flags['balance-log'] : undefined });
    const tierOf = (h) => (h.displayTier ? ' ' + h.displayTier : '') + (h.stale ? ' 待复核' : '') + (h.refuted ? ' refuted' : '');
    const lines = hits.length ? hits.map(h => `[${h.store}] ${h.id} (${h.score})${tierOf(h)}${h.undated ? ' [未定年]' : ''} ${h.snippet}`) : ['（无结果）'];
    if (knowledge) {
      const tag = { known: '记得·库内', uncertain: '不确定', 'confirmed-unknown': '确定不知道' }[knowledge.stance] || knowledge.stance;
      lines.push(`· 认知态：${tag}（${knowledge.stance}）`);
      if (knowledge.search) lines.push('· 外网契约：' + knowledge.search.interface);
    }
    if (flags.since || flags.until) {
      const ex = stats.undatedSamples.length ? '（例：' + stats.undatedSamples.map(s => s.id).join('、') + '）' : '';
      lines.push(`· 另有 ${stats.undated} 条日期未知${ex}· ${stats.excluded} 条因日期范围排除。日期未知＝无法参与「该时段发生了什么」的判断，≠该时段没有它。`);
      if (flags.report) lines.push(`· 报告：范围内 ${stats.dated} · 未知 ${stats.undated} · 范围外 ${stats.excluded} · 时间来源 event_time ${stats.timeSource.event_time} / logged_at ${stats.timeSource.logged_at}${flags.undated ? '（--undated 已并入）' : '（--undated 可并入）'}`);
    }
    print(flags.report ? { hits, stats, knowledge } : hits, lines.join('\n'));
    break;
  }
  case 'brief': {
    if (flags.all) { console.error('六库 brief 没有 --all（那是会话层动作段归并的开关）。被 refute 的记录用 --include-refuted，或 show <id>。'); code = 1; break; }
    if (flags.since && !normalizeDateArg(flags.since).ok) { console.error(normalizeDateArg(flags.since).error); code = 1; break; }
    if (flags.until && !normalizeDateArg(flags.until).ok) { console.error(normalizeDateArg(flags.until).error); code = 1; break; }
    const b = brief(rest.join(' '), { perStore: Number(flags.per) || 3, since: flags.since, until: flags.until, includeRefuted: !!flags['include-refuted'], today: typeof flags.today === 'string' ? flags.today : undefined, loadBalance: !!flags['load-balance'], balanceLog: typeof flags['balance-log'] === 'string' ? flags['balance-log'] : undefined });
    const lines = [`主题简报「${b.query}」：` + (b.groups.length ? `命中 ${b.groups.length} 库` : '无命中')];
    for (const g of b.groups) {
      lines.push(`[${g.store} ×${g.total}${g.hits.length < g.total ? ` → top${g.hits.length}` : ''}]`);
      for (const h of g.hits) {
        const t = (h.time ? `[${h.time}] ` : '') + (typeof h.valence === 'number' && h.valence < 0 ? '⚠ ' : '');
        if (g.store === 'frontier') lines.push(`  - ${t}${h.title} [${h.status}] ${h.topic}${h.supports.length ? '  supports=' + h.supports.join(' ') : ''}`);
        else if (g.store === 'canon') lines.push(`  - ${t}${h.displayTier ? h.displayTier + ' ' : ''}${h.stale ? '待复核 ' : ''}${h.id}: ${h.claim}（${h.source} · ${h.ref}）`);
        else if (g.store === 'mirror') lines.push(`  - ${t}${h.id}: ${h.situation} → ${h.outcome}`);
        else if (g.store === 'orphan') lines.push(`  - ${t}[${h.severity}] ${h.id}: ${h.summary}`);
        else if (g.store === 'pricing') lines.push(`  - ${t}${h.id}: ${h.behavior}（valence ${h.valence}）`);
        else if (g.store === 'lexicon') lines.push(`  - ${t}${h.term}: ${h.resolution}`);
        else lines.push(`  - ${t}${h.id}`);
      }
    }
    if (b.knowledge) {
      const k = b.knowledge;
      const tag = { known: '记得·库内', uncertain: '不确定', 'confirmed-unknown': '确定不知道' }[k.stance] || k.stance;
      lines.push(`· 认知态：${tag}（${k.stance} · 层 ${k.layer}）`);
      if (k.cites && k.cites.length) lines.push('· 弱来源：' + k.cites.map((c) => `${c.store}/${c.id}${c.tier ? '[' + c.tier + ']' : ''}`).join('；'));
      if (k.search) lines.push('· 外网契约：' + k.search.interface + '（宿主实现；core 不搜索）');
    }
    if (b.note) lines.push(b.note);
    if (flags.since || flags.until) {
      const cov = dateCoverageStats({ since: flags.since, until: flags.until });
      lines.push(`· 日期说明：全库另有 ${cov.undated} 条日期未知未参与过滤（范围外 ${cov.excluded}）——未知≠该时段没有。`);
    }
    print(b, lines.join('\n'));
    break;
  }
  case 'budget': {
    // A2 上下文预算（默认关；--enable 才按误差分配）。不写库。相位验收可单独跑。
    const enabled = !!flags.enable || !!flags['context-budget'];
    if (flags['phase-check'] != null) {
      const mem = flags['phase-check'] === true ? '中性夹具记忆短语' : String(flags['phase-check']);
      const r = phaseResidueSample(mem, { stride: Number(flags.stride) || 2 });
      const lines = [
        `相位验收 S=${r.stride}（residue 采样 · 前缀扰动 ×${r.samples.length}）`,
        `  主指标 best−worst gap=${r.gap}（best=${r.best} worst=${r.worst}）`,
        `  residueMeans=${JSON.stringify(r.residueMeans)} residueGap=${r.residueGap}`,
        '  （客户端无法对齐 provider 相位；padding 非修复）'
      ];
      print(r, lines.join('\n'));
      break;
    }
    if (!enabled) {
      print({ enabled: false, defaults: CONTEXT_BUDGET_DEFAULTS }, 'A2 上下文预算默认关。加 --enable 查看分配；--phase-check <文本> 做奇偶相位验收。');
      break;
    }
    const alloc = allocateContextBudget({
      contextBudget: true,
      totalTokens: flags.tokens ? Number(flags.tokens) : undefined,
      params: flags.stride ? { stride: Number(flags.stride) } : undefined
    });
    const lines = [`A2 预算（${alloc.model} · S=${alloc.stride} · total=${alloc.totalTokens}）`];
    for (const [name, src] of Object.entries(alloc.sources)) {
      lines.push(`  ${name}: tokens=${src.tokens} share=${src.share} Δ=${src.rawDelta}` + (src.exempt ? ' [exempt]' : '') + (src.reasons.length ? ' ' + src.reasons.map((x) => x.code).join(',') : ''));
    }
    lines.push('· 相位策略：' + alloc.phase.method + '（冗余放置；非 padding 对齐）');
    print(alloc, lines.join('\n'));
    break;
  }
  case 'kit': {
    const k = kit({ today: flags.today, contextBudget: !!flags['context-budget'] || !!flags.enable });
    const lines = [`起床包（${k.at}）`];
    lines.push('· 协议：' + k.protocol);
    lines.push(k.sleep
      ? `· 睡眠：${k.sleep.lastRunAt}（${k.sleep.trigger}）待办 ${k.sleep.todo}；audit=${k.sleep.audit}；报告 ${k.sleep.report}`
      : '· 睡眠：无记录（等待首个空闲/timer 触发）');
    lines.push(`· inbox：${k.inbox.batches} 批 / ${k.inbox.totalItems} 条` + (k.inbox.latest.length ? '；最新：' + k.inbox.latest.map(i => i.code || i.kind || '?').join('、') : ''));
    lines.push(`· 审计（${k.review.today}）：` + (k.review.ok ? 'OK' : k.review.findings.map(f => `${f.code}×${f.count}`).join('，')));
    lines.push('· 库况：' + Object.entries(k.library).filter(([key]) => key !== 'frontier_by_status').map(([key, v]) => `${key} ${v}`).join(' / '));
    for (const h of k.hints) lines.push('· ' + h);
    if (k.history && k.history.length) lines.push('· 病史（负价）：' + k.history.map((x) => `⚠ ${x.id}（${x.valence}）`).join('，'));
    print(k, lines.join('\n'));
    break;
  }
  case 'revise': {
    const store = rest[0]; const id = rest[1];
    const patch = flags['data-file']
      ? JSON.parse(readFileSync(flags['data-file'], 'utf8'))
      : JSON.parse(flags.data || '{}');
    const r = revise(store, id, patch, { allowProtocol: flags['allow-protocol'] === true });
    print(r, `已修订：${id} → ${r.id}（supersedes ${r.supersedes}）`);
    break;
  }
  case 'cross': {
    if (flags.all) { console.error('六库 cross 没有 --all（那是会话层动作段归并的开关）。被 refute 的记录用 --include-refuted，或 show <id>。'); code = 1; break; }
    if (flags.since && !normalizeDateArg(flags.since).ok) { console.error(normalizeDateArg(flags.since).error); code = 1; break; }
    if (flags.until && !normalizeDateArg(flags.until).ok) { console.error(normalizeDateArg(flags.until).error); code = 1; break; }
    const c = cross(rest[0] || '', { perStore: flags.per ? Number(flags.per) : undefined, since: flags.since, until: flags.until, includeRefuted: !!flags['include-refuted'], today: typeof flags.today === 'string' ? flags.today : undefined, loadBalance: !!flags['load-balance'], balanceLog: typeof flags['balance-log'] === 'string' ? flags['balance-log'] : undefined });
    const lines = [];
    const dateNote = () => {
      if (!(flags.since || flags.until)) return;
      const cov = dateCoverageStats({ since: flags.since, until: flags.until });
      lines.push(`· 日期说明：全库另有 ${cov.undated} 条日期未知未参与过滤（范围外 ${cov.excluded}）——未知≠该时段没有。`);
    };
    if (!c.groups.length) {
      lines.push(`对位比较「${c.query || '（空）'}」：无命中。`);
      if (c.hint) lines.push('· ' + c.hint);
      dateNote();
      print(c, lines.join('\n'));
      break;
    }
    lines.push(`对位比较「${c.query}」：命中 ${c.groups.length} 库 / ${c.total} 条（当前版本）`);
    for (const g of c.groups) {
      lines.push(`[${g.store} ×${g.total}]`);
      for (const item of g.items) lines.push(`  ${item.id} | ${item.line}`);
    }
    if (c.hint) lines.push('· ' + c.hint);
    dateNote();
    print(c, lines.join('\n'));
    break;
  }
  case 'mirror': {
    const sub = rest[0];
    if (sub === 'match') {
      const text = rest.slice(1).join(' ');
      let hits;
      try {
        hits = mirrorMatch(text, {
          limit: Number(flags.limit) || 3, mode: flags.mode, role: flags.role,
          evidence: flags.evidence, era: typeof flags.era === 'string' ? flags.era : undefined,
          context: typeof flags.context === 'string' ? flags.context : undefined
        });
      } catch (e) {
        print(null, String(e.message) + '\n用法：node akasha.mjs mirror match <情境文本> [--limit N] [--mode task|improve|all] [--role solution|boundary] [--evidence story|own-log] [--era …] [--context …]');
        code = 1; break;
      }
      const scopeParts = [];
      if (flags.role) scopeParts.push(`只看${flags.role === 'solution' ? '解法' : '边界'}`);
      else if (flags.mode === 'task') scopeParts.push('做任务：解法 + 未分层');
      else if (flags.mode === 'improve') scopeParts.push('改流程：边界 + 未分层');
      if (flags.evidence) scopeParts.push('证据=' + flags.evidence);
      if (typeof flags.era === 'string') scopeParts.push('时代~' + flags.era);
      if (typeof flags.context === 'string') scopeParts.push('语境~' + flags.context);
      const scope = scopeParts.join('；');
      const lines = [`镜像匹配「${text}」${scope ? '（' + scope + '）' : ''}：` + (hits.length ? `命中 ${hits.length} 条` : '（无命中）')];
      const tag = { solution: '[解法] ', boundary: '[边界] ' };
      for (const h of hits) {
        const ev = h.evidence === 'own-log' ? '[实证] ' : h.evidence === 'story' ? '[典故] ' : '';
        lines.push(`  [${h.score}] ${tag[h.role] ?? ''}${ev}${h.id}: ${h.situation} → ${h.outcome}（${h.emotion}）`);
      }
      print(hits, lines.join('\n'));
    } else {
      print(null, '用法：node akasha.mjs mirror match <情境文本> [--limit N] [--mode task|improve|all] [--role solution|boundary] [--evidence story|own-log] [--era …] [--context …]');
      code = 1;
    }
    break;
  }
  case 'summary': {
    const s = summary({ per: Number(flags.per) || 3 });
    const lines = [`全库摘要（${s.today}）——` + Object.entries(s.stores).map(([k, v]) => `${k} ${v.total}`).join(' / ')];
    for (const [name, st] of Object.entries(s.stores)) {
      lines.push(`[${name} ×${st.total}]`);
      for (const r of st.recent) lines.push(`  - ${r.id}${r.event_time ? ' [' + r.event_time + ']' : ''}: ${r.line}`);
      if (st.by_status) lines.push('  status：' + Object.entries(st.by_status).map(([k, v]) => `${k} ${v}`).join('，'));
    }
    lines.push('· 审计：' + (s.audit.ok ? 'OK' : s.audit.findings.map(f => `${f.code}×${f.count}`).join('，')));
    if (s.newest) lines.push(`· 最近写入：${s.newest.store}#${s.newest.id}（${s.newest.ageText}）`);
    print(s, lines.join('\n'));
    break;
  }
  case 'show': {
    const r = show(rest[0] || '');
    if (!r.record) { print(r, '（未找到：' + (r.note || '') + '）'); code = 1; break; }
    const head = r.found ? `[${r.store}] ${r.id}` : `（${r.note}）`;
    const c = r.credibility;
    const credLines = c ? ['可信度：' + (c.label || '（无层级）') + (c.cls ? ' · ' + c.cls : ''), ...c.steps.map((st) => `  ${st.id}  ${st.why} → ${st.tier || '—'}${st.refuted ? ' refuted' : ''}`)] : [];
    print(r, [head, ...credLines, JSON.stringify(r.record, null, 2)].join('\n'));
    break;
  }
  case 'sleep': {
    if (flags.replay) {
      // 历史回放：只读。同一份旧日志再数 recall.misses，并对照计划会移出的 id。不写库。
      if (flags.apply || flags.rollback) { console.error('sleep --apply / --rollback 尚未实现：回放只报告 misses 会不会变，不改库。'); code = 1; break; }
      const pick = (k) => (typeof flags[k] === 'string' ? flags[k] : undefined);
      const out = flags.out === undefined ? false : pick('out');
      if (flags.out !== undefined && out === undefined) { console.error('sleep --replay 的 --out 须为文件路径（省略则只打印，不落盘）。'); code = 1; break; }
      const r = replayHistory({ today: pick('today'), theta: pick('theta'), maxOps: pick('max'), orphanDays: pick('orphan-days'), staleDays: pick('stale-days'), log: pick('log'), out });
      if (!r.ok) { console.error('历史回放失败：' + r.error); code = 1; break; }
      const g = r.report;
      const lines = [
        `历史回放 ${g.replayId}（只读；日志与六库未改）${g.log.missing ? '；日志不存在，按空日志计' : ''}`,
        `  日志 ${g.log.lines} 行${g.log.bad ? `（坏行 ${g.log.bad}）` : ''} · 计划 ${g.plan.planId} · ops ${g.plan.ops} · 将移出 ${g.plan.removed.length} 个 id · 已 refute ${g.layering.refuted}`,
        `  记录口径 misses ${g.recall.asRecorded.misses} / 失败回合 ${g.recall.asRecorded.failureTurns}；原样再算 misses ${g.recall.replayed.misses}（Δ ${g.recall.delta}）`,
        `  结论：${g.verdict}。分层 / 合并 / 丢弃建议不是 B2 的输入。`,
        `  对照（不采用）：若删掉只引用这些 id 的召回行，misses 会变成 ${g.survivorBias.rewritten.misses}（Δ ${g.survivorBias.delta}）${g.survivorBias.wouldRise ? '——这是幸存者偏差，不是漏召变多' : ''}`,
        `  日志里点名将被移出或已 refute 的 id：${g.survivorBias.citationCount} 处`
      ];
      if (r.reportFile) lines.push('  报告 ' + r.reportFile);
      print(g, lines.join('\n'));
      break;
    }
    if (flags.plan) {
      // wave2 §2 第一批：只出计划（只读六库，只写计划文件；不动水位线）。--apply / 回滚尚未实现。
      if (flags.apply || flags.rollback) { console.error('sleep --apply / --rollback 尚未实现：先评审 --plan 的输出（wave2 §2 下一批）。'); code = 1; break; }
      const pick = (k) => (typeof flags[k] === 'string' ? flags[k] : undefined);
      const r = sleepPlan({ today: pick('today'), theta: pick('theta'), maxOps: pick('max'), orphanDays: pick('orphan-days'), staleDays: pick('stale-days'), log: pick('log'), out: pick('out') });
      if (!r.ok) { console.error('睡眠计划失败：' + r.error); code = 1; break; }
      const p = r.plan;
      const lines = [`睡眠计划 ${p.planId}（只读；六库未改）：${p.ops.length} 个操作${p.truncated.dropped ? `（共 ${p.truncated.total}，按上限 ${p.params.maxOps} 截去 ${p.truncated.dropped}）` : ''}；计划文件 ${r.planFile}`];
      for (const o of p.ops) lines.push(o.op === 'merge' ? `  merge   [${o.store}] ${o.keep} ← ${o.absorb.join(', ')}（${o.reason}）` : `  discard [${o.store}] ${o.id}（${o.reason}）`);
      for (const s of p.skipped) lines.push(`  · 跳过规则 ${s.rule}：${s.why}`);
      if (p.ops.length === 0 && p.nearMiss) {
        const nm = p.nearMiss;
        lines.push('  · 近失报告（为何为空）：');
        const o = nm.discard?.['orphan-aging'];
        if (o) lines.push(`    - orphan-aging：检视 ${o.examined} 条，最老 ${o.oldest?.[0]?.ageDays ?? '?'} 天（阈值 ${o.thresholdDays} 天）`);
        const c = nm.discard?.['canon-stale-unused'];
        if (c) lines.push(`    - canon-stale-unused：检视 ${c.examined} 条，最老 ${c.oldest?.[0]?.ageDays ?? '?'} 天（阈值 ${c.thresholdDays} 天${c.note ? '；' + c.note : ''}）`);
        const s2 = nm.discard?.['snapshot-superseded'];
        if (s2) lines.push(`    - snapshot-superseded：同主题多快照 ${s2.stemsWithMultiple} 组（检视 ${s2.stemsExamined} 个主题）`);
        const best = ['canon', 'mirror', 'lexicon', 'pricing']
          .map((st) => ({ st, top: nm.merge?.[st]?.top?.[0], theta: nm.merge?.[st]?.theta, n: nm.merge?.[st]?.candidates }))
          .filter((x) => x.top).sort((a, b) => b.top.jaccard - a.top.jaccard)[0];
        if (best) lines.push(`    - near-duplicate：最高 Jaccard ${best.top.jaccard}（θ ${best.theta}；${best.st} 库 ${best.n} 条里最像的一对：${best.top.a} ↔ ${best.top.b}）`);
      }
      lines.push('  · mergedText 留空待填；--apply 尚未实现（待计划评审）。');
      print({ ...p, planFile: r.planFile }, lines.join('\n'));
      break;
    }
    if (flags.apply || flags.rollback) { console.error('sleep --apply / --rollback 尚未实现：先评审 --plan 的输出（wave2 §2 下一批）。'); code = 1; break; }
    const r = sleepRun({ trigger: 'manual', dry: !!flags.dry });
    if (!r.ok) { print(r, '睡眠失败：' + r.error); code = 1; break; }
    const head = r.dry ? '（dry-run）将蒸馏：' : '已蒸馏：';
    print(r, `${head}新增 ${r.processedTo - r.processedFrom} 条（水位线 ${r.processedFrom} → ${r.processedTo}）；待办 ${r.todo} 条${r.reportFile ? '；报告 ' + r.reportFile : ''}`);
    break;
  }
  case 'promote': {
    const r = promoteInbox({ dry: !!flags.dry });
    print(r, r.dry
      ? `将转正 ${r.wouldPromote.length} 条（dry-run）：${r.wouldPromote.join(', ') || '（无）'}；已存在 ${r.skipped.length}`
      : `已转正 ${r.promoted.length} 条：${r.promoted.join(', ') || '（无）'}；跳过 ${r.skipped.length}`);
    break;
  }
  case 'price': {
    const p = price({
      severity: flags.severity, irreversibility: flags.irreversibility, cost: flags.cost,
      good: flags.good ? true : flags.bad ? false : undefined
    });
    if (flags['apply-store'] && flags['apply-id']) {
      const store = String(flags['apply-store']); const id = String(flags['apply-id']);
      // 2026-10-07 复查：接受链上任意版本 id（revise 自会走到链尾）——原实现要求「当前版本」，与 revise 语义不一致
      try {
        const r = revise(store, id, { valence: p.valence, arousal: p.arousal });
        print({ ...p, applied: r }, `已回写情绪标签：${id} → ${r.id}（valence ${p.valence} / arousal ${p.arousal}）`);
      } catch (e) {
        print(p, `回写失败：${store} ${id}（${String(e?.message ?? e)}）`); code = 1;
      }
      break;
    }
    print(p, JSON.stringify(p));
    break;
  }
  case 'orphan': {
    const sub = rest[0];
    if (sub === 'add') {
      const rec = {
        id: flags.id || 'orphan-' + randomBytes(3).toString('hex'),
        summary: flags.summary, observed: flags.observed,
        hypothesis: flags.hypothesis || '（待补）',
        would_confirm: flags.confirm || '（待补）',
        would_refute: flags.refute || '（待补）',
        severity: flags.severity || '中',
        created: flags.created || new Date().toISOString().slice(0, 10),
        ...(flags['event-time'] ? { event_time: flags['event-time'] } : {})
      };
      const r = appendRecord('orphan', rec);
      print(r, '已追加：' + r.id);
    } else {
      const list = currentRecords(loadStore('orphan').records);
      print(list, list.map(o => `[${o.severity}] ${o.id} ${o.summary}`).join('\n') || '（空）');
    }
    break;
  }
  case 'frontier': {
    const sub = rest[0] || 'list';
    const list = currentRecords(loadStore('frontier').records);
    if (sub === 'due') {
      const today = new Date().toISOString().slice(0, 10);
      const due = frontierDue(today);
      print(due, due.length ? due.map(r => `[${r.status}] ${r.id} 复审≤${r.next_review} ${r.title}`).join('\n') : '（今日无到期）');
    } else if (sub === 'recheck') {
      const id = rest[1];
      const status = flags.status;
      if (!id || !status) { console.log('用法：node akasha.mjs frontier recheck <id> --status <已实践|已复现|高引用|待验证> [--next-review YYYY-MM-DD] [--note ...]'); code = 1; break; }
      const today = new Date().toISOString().slice(0, 10);
      const plusDays = (d, n) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);
      const patch = {
        status,
        last_checked: today,
        next_review: flags['next-review'] || plusDays(today, status === '待验证' ? 90 : 180)
      };
      if (flags.note) patch.note = flags.note;
      const r = revise('frontier', id, patch);
      print(r, `已复审：${id} → ${r.id}（status=${status}，next_review=${patch.next_review}）`);
    } else {
      print(list, list.map(r => `[${r.status}] ${r.id} ${r.title}（${r.topic}）`).join('\n'));
    }
    break;
  }
  case 'audit': {
    const r = audit({ today: flags.today });
    const warns = r.findings.filter(f => f.level === 'warn');
    const lines = [`审计（${r.today}）：` + (r.ok ? 'OK' : `警告 ${warns.length} 条`)];
    for (const f of r.findings) lines.push(`[${f.level}] ${f.code} ×${f.detail.length}`);
    print(r, lines.join('\n'));
    break;
  }
  case 'metrics': {
    const r = metrics({ since: flags.since });
    const c = r.counters;
    const rate = c.tools ? Math.round((1 - c.toolErrors / c.tools) * 100) + '%' : '—';
    const lines = [
      `结果计数器（${r.since ? 'since ' + r.since : '全量'}）——工具 ${c.tools}（失败 ${c.toolErrors}，成功率 ${rate}）/ 拦截 ${c.denials} / agent 错误 ${c.agentErrors} / 回合 ${c.turnEnds} / 睡眠 ${c.sleeps} / 唤醒条 ${c.wakeNotes}`,
      `审计线 ${c.outputAudits} 条 / 引用命中 ${c.usageRefs} 次；修订链 ${r.revisions.count} 版（最长 ${r.revisions.longest}：${r.revisions.longestId ?? '—'}）`
    ];
    if (r.topToolErrors.length) lines.push('工具失败 top：' + r.topToolErrors.map(([t, n]) => `${t}×${n}`).join('，'));
    if (r.topUsage.length) lines.push('引用 top：' + r.topUsage.slice(0, 5).map(([id, n]) => `${id}×${n}`).join('，'));
    const mt = r.memoryTools;
    lines.push(`轻查动作率（记忆工具·MCP 面，2026-10-07 起）：调用 ${mt.calls} 次（占工具 ${(mt.share * 100).toFixed(1)}% / 每回合 ${mt.perTurn} 次）` + (Object.keys(mt.byTool).length ? '；' + Object.entries(mt.byTool).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, n]) => `${t.replace('mcp__akasha__', '')}×${n}`).join('，') : ''));
    const rc = r.recall;
    if (rc) {
          const prev = rc.preventable ?? { fails: 0, missed: 0, missRate: 0 };
          const byTool = Object.entries(rc.byTool ?? {}).sort((a, b) => b[1].fails - a[1].fails).slice(0, 3)
            .map(([t, v]) => `${t}×${v.fails}(未查${v.missed}${v.preventableMisses ? '/可预防漏' + v.preventableMisses : ''})`).join('，');
          lines.push(`召回信号（失败回合 ${rc.failureTurns}）：失败前已查库 ${rc.recalledBefore} / 未查库 ${rc.misses}（其中事后才查 ${rc.lateRecall}）；漏召率 ${rc.failureTurns ? (rc.missRate * 100).toFixed(1) + '%' : '—'}`
            + `；**可预防口径（C2）**：库内有同类坑的失败 ${prev.fails} 次，其中漏召 ${prev.missed} 次（可预防漏召率 ${prev.fails ? (prev.missRate * 100).toFixed(1) + '%' : '—'}）`
            + (byTool ? `；按工具 top3：${byTool}` : '')
            + (rc.samples.length ? '；样本 ' + rc.samples.slice(0, 2).map((x) => `${x.what}@${String(x.ts ?? '?').slice(0, 16)}`).join('，') : ''));
        }
    print(r, lines.join('\n'));
    break;
  }
  case 'add': {
    const obj = JSON.parse(flags.data || '{}');
    const r = appendRecord(flags.store, obj);
    print(r, '已追加：' + r.id);
    break;
  }
  case 'retire': {
    const store = rest[0]; const id = rest[1];
    if (!store || !id) { print(null, "用法：retire <store> <id> [--reason '...'] [--hard]"); code = 1; break; }
    const r = retireRecord(store, id, { reason: flags.reason ? String(flags.reason) : '', hard: flags.hard === true || flags.hard === 'true' });
    print(r, r.already
      ? `已退役过：${store} ${r.retired}`
      : r.hard
        ? `已删除：${store} ${r.retired}（移除 ${r.removed} 行，备份 ${r.trash}）`
        : `已退役：${store} ${r.retired}（墓碑 ${r.tombstone}）`);
    break;
  }
  case 'session': {
    const sub = rest[0];
    const storeFile = flags.store ? String(flags.store) : undefined;
    const metaFile = flags.meta ? String(flags.meta) : undefined;
    const helpLines = [
      '会话层（session layer）用法：',
      '  node akasha.mjs session index <sessionId|文件路径> [--session ID] [--root D] [--store F] [--meta F] [--full]',
      '  node akasha.mjs session lookup <词> [--session ID] [--kind a,b] [--level nodes|segs] [--since D] [--until D] [--process] [--all] [--limit N] [--store F] [--json]',
      '  node akasha.mjs session promote <segId> --to <store> [--data \'<json>\'] [--confirm-replay] [--apply] [--repair] [--store F] [--target F]',
      '    默认只预览；--apply 才写。--to 必填（拿不准就 --to orphan）。复现必须 --confirm-replay（段里没有成败，不能代核）。',
      '  node akasha.mjs session context [--session ID] [--budget N] [--store F]',
      '  node akasha.mjs session stats [--store F] [--json]',
      '  node akasha.mjs session tree [--build] --session ID [--store F]   # 弧线树：--build 重建当前代',
      '  node akasha.mjs session node <节点 id> [--store F]                 # 节点直读（含 children 下钻清单）',
      '  node akasha.mjs session loopwatch [--since D] [--json]             # 循环观测（P0 干跑；源自 logs\\hooks.jsonl）',
      '调用分级：被动行（脉搏/压缩事件行）→ 定向轻查（session lookup；主库 lookup/brief）→ 深取回档（--process / ptr 回原档；主库 cross/show）。',
      '查询纪律：结论＋动作＝第一入口；过程段仅按需局部调取、绝不整体查阅；官方压缩摘要只作背景，冲突以可回原档的会话层为准。',
      '树导航：先 session tree 看弧线 → session node 停靠 → 段/ptr 下钻（树＝入口、段＝提示、原档＝全保真）。',
      '速查（痛点 → 一步命令）：对话/记忆细节 → session lookup <词>；知识/文献 → akasha_lookup / brief <主题>；某条现状 → show <id>；全库近况 → summary / kit；会话结构 → session tree / node <id>。',
      '未定时刻纪律：先问「哪条命令能一步回答」；能一步回答的，先查再做（轻查优先；量化见 metrics 的「轻查动作率」）。'
    ];
    if (!sub || sub === 'help') {
      print(null, helpLines.join('\n'));
      code = sub === 'help' ? 0 : 1;
      break;
    }
    if (sub === 'index') {
      let file = rest[1];
      if (!file) { print(null, '用法：session index <sessionId|文件路径> [--root D] [--full]'); code = 1; break; }
      let sid = flags.session ? String(flags.session) : undefined;
      if (!String(file).endsWith('.zstd')) {
        const root = flags.root ? String(flags.root) : SESSION_DEFAULTS.sessionsRoot;
        const found = resolveSessionFile(root, file);
        if (!found) { print(null, '未找到会话档案：' + file); code = 1; break; }
        file = found;
      }
      if (!sid) {
        // 只认「规范档案路径」里的会话 id：路径段 session-<hex…>（宿主形态 …\session-<id>\session.v4.jsonl.zstd）。
        // 正则失配时**不再回退为整条路径**——那会静默造出「以路径为键」的伪会话（2026-10-07 冻结副本测试实证）。
        const m = /[\\/]session-([0-9a-fA-F][0-9a-fA-F-]{7,})(?=[\\/]|$)/.exec(file);
        if (!m) {
          print(null, '未能在路径中识别会话 id（规范形态：…\\session-<id>\\session.v4.jsonl.zstd）。\n如确需以该文件建段，请显式指定会话：session index <文件> --session <id>');
          code = 1;
          break;
        }
        sid = m[1];
      }
      const r = indexSession({ file, session: sid, storeFile, metaFile, full: !!flags.full });
      print(r, `已索引：${r.session} 新增 ${r.added} 段（跳过 ${r.skipped}，坏行 ${r.parseFails}）；lastSeq ${r.lastSeq}`);
      break;
    }
    if (sub === 'lookup') {
      const q = rest.slice(1).join(' ');
      const hits = lookupSegments(q, {
        storeFile,
        session: flags.session ? String(flags.session) : undefined,
        kind: flags.kind,
        level: flags.level,
        since: flags.since,
        until: flags.until,
        includeProcess: !!flags.process,
        all: !!flags.all,
        limit: Number(flags.limit) || 10
      });
      const lines = hits.length
        ? hits.map((h) => (h.kind === 'node'
          ? `[node L${h.level}] ${h.id}（${h.score}）${(h.children ?? []).length} 孩子 · ${String(h.gist).slice(0, 160)}`
          : `[${h.kind}] ${h.id}（${h.score}）turn ${h.turn ?? '?'} · ${String(h.gist).slice(0, 160)}`))
        : ['（无命中——默认不含过程段；需要时加 --process）'];
      print(hits, lines.join('\n'));
      break;
    }
    if (sub === 'promote') {
      const segId = rest[1];
      const usage = "用法：session promote <segId> --to <store> [--data '<json>'] [--confirm-replay] [--apply] [--repair]\n--to 必填（拿不准就 --to orphan）。默认不写；--apply 才写。source.type=复现 必须 --confirm-replay。";
      if (!segId || !flags.to) { print(null, usage); code = 1; break; }
      let data = {};
      if (flags.data) {
        try { data = JSON.parse(String(flags.data)); }
        catch { print(null, '--data 不是合法 JSON\n' + usage); code = 1; break; }
      }
      const r = promoteSegment(segId, {
        to: String(flags.to), data, confirmReplay: flags['confirm-replay'] === true,
        apply: flags.apply === true, repair: flags.repair === true,
        sessionFile: storeFile, targetFile: flags.target ? String(flags.target) : undefined
      });
      if (!r.ok) { print(r, r.error); code = 1; break; }
      const preview = r.repair ? JSON.stringify(r.marks, null, 2) : JSON.stringify({ record: r.record, mark: r.mark }, null, 2);
      print(r, r.dry ? '预览（未写入；加 --apply 才写）：\n' + preview : (r.repair ? '已补标记：' + r.marks.map((m) => m.id).join('，') : '已升格：' + r.record.id + ' ← ' + segId));
      break;
    }
    if (sub === 'context') {
      const text = renderSessionContext({ storeFile, session: flags.session ? String(flags.session) : undefined, budget: Number(flags.budget) || 600 });
      print(null, text);
      break;
    }
    if (sub === 'stats') {
      const records = loadStore('session', storeFile).records;
      const byKind = {}; const sessions = new Set();
      for (const r of records) { byKind[r.kind] = (byKind[r.kind] ?? 0) + 1; if (r.kind !== 'promotion' && r.session) sessions.add(r.session); }
      const segN = records.filter((r) => r.kind !== 'promotion').length;
      const obj = { segments: segN, sessions: sessions.size, byKind };
      print(obj, [`会话层：${segN} 段 / ${sessions.size} 个会话`, '· 类别：' + Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join(' / ')].join('\n'));
      break;
    }
    if (sub === 'loopwatch') {
      let records = [];
      try {
        const raw = readFileSync(new URL('./logs/hooks.jsonl', import.meta.url), 'utf8');
        records = raw.split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } });
      } catch { /* 无日志 → 空 */ }
      const s = loopWatchStats(records, { since: flags.since });
      const lines = [`循环观测（P0 干跑${flags.since ? ' since ' + flags.since : ''}）：命中 ${s.total} 条（流相 ${s.byPhase.stream ?? 0} / 回合相 ${s.byPhase.turn ?? 0}）· 修复前残迹 ${s.hitsPreFix} / 修复后新增 ${s.hitsPostFix} · 探针 ${s.probes} 条（全量）`];
      if (s.total) {
        lines.push('· 类型：' + Object.entries(s.byType).map(([k, v]) => `${k}×${v}`).join('，'));
        lines.push('· 会话：' + Object.entries(s.bySession).map(([k, v]) => `${String(k).slice(0, 8)}×${v}`).join('，'));
        for (const r of s.recent.slice(-5)) lines.push(`  - [${r.phase}/${r.type}] ${String(r.session).slice(0, 8)} turn ${r.turn ?? '?'}：${r.excerpt}`);
      } else {
        lines.push('（暂无命中——干跑观测中；方法论与基线见 research\\semantic-loop-baseline-20261007.md）');
      }
      print(flags.json ? s : null, lines.join('\n'));
      break;
    }
    if (sub === 'tree') {
      const sid = flags.session ? String(flags.session) : undefined;
      if (!sid) { print(null, '用法：session tree [--build] --session <id> [--store F]'); code = 1; break; }
      if (flags.build) {
        const storeF = storeFile ?? SESSION_DEFAULTS.storeFile;
        const { treegen, nodes } = buildTree({ session: sid, storeFile: storeF, chunkTurns: Number(flags.turns) || 8, fanout: Number(flags.fanout) || 4 });
        appendNodes(storeF, nodes, treegen);
        print({ treegen, nodes: nodes.length }, `已重建：${sid} → ${nodes.length} 节点（treegen ${treegen}）\n` + renderTree(storeF, sid));
        break;
      }
      print(null, renderTree(storeFile ?? SESSION_DEFAULTS.storeFile, sid));
      break;
    }
    if (sub === 'node') {
      const id = rest[1];
      if (!id) { print(null, '用法：session node <节点 id> [--store F]'); code = 1; break; }
      // 跨代同 id 取最新 treegen（2026-10-07 复查：原 .find() 命中旧代留档——同一 id 会随重建多代出现）
      const all = loadStore('session', storeFile).records.filter((r) => r.id === id);
      if (!all.length) { print(null, '未找到节点：' + id); code = 1; break; }
      const rec = all.reduce((a, b) => ((Number(b.treegen) || 0) > (Number(a.treegen) || 0) ? b : a));
      const note = all.length > 1 ? `（共 ${all.length} 代留档，已取最新）` : '';
      print(rec, [`[${rec.kind}${rec.level ? ' L' + rec.level : ''}] ${rec.id} · treegen：${rec.treegen}${note}`, '· children：' + (rec.children ?? []).join(', ')].join('\n'));
      break;
    }
    print(null, '未知子命令：' + sub + '（session help 看用法）');
    code = 1;
    break;
  }
  default:
    console.log('用法：node akasha.mjs <check|stats|budget [--enable] [--phase-check 文本]|lookup <词> [--since D --until D] [--include-refuted] [--today D] [--load-balance] [--balance-log F]|brief <主题> [--per N] [--since D --until D]|cross <词> [--per N] [--since D --until D]|summary [--per N]|show <id>|mirror match <文本> [--limit N] [--mode task|improve] [--role solution|boundary] [--evidence story|own-log] [--era …] [--context …]|sleep [--dry]|sleep --replay [--log F] [--out F] [--today D] [--theta X] [--max K] [--orphan-days N] [--stale-days N]|sleep --plan [--out F] [--today D] [--theta X] [--max K] [--orphan-days N] [--stale-days N] [--log F]|kit|promote [--dry]|revise <store> <id> --data \'<json>\'|price --severity N --irreversibility N --cost N [--good|--bad] [--apply-store S --apply-id ID] [--json]|metrics [--since D]|orphan add --summary ... [--event-time YYYY-MM-DD]|orphan list|frontier list|frontier due|frontier recheck <id> --status <S> [--next-review D]|audit|add --store <s> --data \'<json>\'|retire <store> <id> [--reason \'...\'] [--hard]|session <index|lookup|promote|context|tree|node|loopwatch|stats|help>（细目见 session help）>');
    code = cmd ? 1 : 0;
}
process.exit(code);
