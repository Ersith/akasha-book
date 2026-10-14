// 阿卡夏之书（Akasha）CLI。用法：node akasha.mjs <check|stats|lookup|price|orphan|add> [...]
// 例：node akasha.mjs check / node akasha.mjs lookup 狼来了 / node akasha.mjs price --severity 5 --irreversibility 4 --cost 3 --bad
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { checkAll, detectConflicts, multiRecall, rollbackBatch, memoryDiff, conflictReport, stripGenre, autonomyReadings, expandRecord, assertDataRoot, recordRejected, listRejected, blindspotsFor, progressiveRecall, calibrationOf, generationInfo, committedOf, blindspotMap, renderDiscipline, verifyDiscipline, STORES, stats, lookupDetailed, normalizeDateArg, dateCoverageStats, price, appendRecord, loadStore, audit, mirrorCompare, mirrorOutcome, mirrorImportDraft, brief, kit, promoteInbox, revise, cross, summary, show, mirrorMatch, metrics, retireRecord, currentRecords, frontierDue, allocateContextBudget, contextBudgetEnabled, phaseResidueSample, phaseStabilityCheck, placeWithRedundancy, CONTEXT_BUDGET_DEFAULTS, reviewPack, appendReviewLog, readReviewLog, nowSnapshot } from './lib.mjs';
import { applyPlan, replayHistory, revokePlan, sleepPlan, sleepRun, productionForceRejected } from './sleep.mjs';
import { indexSession, autoBuildTree, lookupSegments, lookupSegmentsDetailed, sessionClusters, sessionThemes, buildTopics, lookupTopics, appendSegments, renderSessionContext, resolveSessionFile, renderTree, buildTree, appendNodes, loopWatchStats, promoteSegment, SESSION_DEFAULTS } from './session.mjs';

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
// #36 fail-loud（2026-10-12 窗口 5）：启动即验数据根；读命令不得在坏根上「装健康」。
// 例外：init/doctor 类自举命令不验（它们就是用来修根的）；其余在读库前先验。
if (!['init', 'doctor'].includes(cmd)) {
  try { assertDataRoot(); }
  catch (e) { console.error('阿卡夏：' + e.message); process.exit(2); }
}

switch (cmd) {
  case 'check': {
    const r = checkAll();
    // #18 冲突检测（2026-10-12）：`check --conflicts` 附加「同题并存候选」——只提示不裁决。
    if (flags.conflicts) {
      const recs = {};
      for (const s of STORES) recs[s] = currentRecords(loadStore(s).records);
      const pairs = detectConflicts(recs);
      console.log('冲突候选（只提示不裁决）：' + pairs.length + ' 对');
      for (const p of pairs.slice(0, Number(flags.conflicts) > 0 ? Number(flags.conflicts) : 12)) {
        console.log('  [' + p.store + '] ' + (p.a ?? '（截断占位）') + ' × ' + (p.b ?? '') + (p.ratio ? '  ratio ' + p.ratio + ' · 共享 ' + JSON.stringify(p.common) : '') + (p.note ? '  — ' + p.note : ''));
      }
      if (pairs.length > 12) console.log('  …（按质量排序，只显示前 12 对；全文用 --conflicts N 或 --json）');
    }
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
    if (flags.all) { console.error('六库 lookup 没有 --all（那是会话层动作段并的开关）。被 refute 的记录用 --include-refuted，或 show <id>。'); code = 1; break; }
    const rSel = flags.since ? normalizeDateArg(flags.since) : { ok: true, day: null };
    const rUnt = flags.until ? normalizeDateArg(flags.until) : { ok: true, day: null };
    if (!rSel.ok || !rUnt.ok) { console.error(rSel.error || rUnt.error); code = 1; break; }
    const __paging = { offset: Number(flags.offset) || 0, contextBudget: flags.full ? false : undefined, maxTokens: Number.isFinite(Number(flags['max-tokens'])) ? Number(flags['max-tokens']) : undefined };
    const recallMode = !!flags.recall;   // #7 多路召回 + RRF（2026-10-12 窗口 3；默认关，行为与并前一致）
    const perspective = flags.perspective ? String(flags.perspective) : undefined;   // #37（窗口 5）：world|experience
    if (perspective && !['world', 'experience'].includes(perspective)) { console.error('--perspective 须为 world|experience'); code = 1; break; }
    const __doseTh = Number.isFinite(Number(flags['dose-threshold'])) ? Number(flags['dose-threshold']) : undefined;   // I-12 P1-③：0=关闸
    const { hits, stats, knowledge, budget, rrf, trace, dose } = recallMode
      ? multiRecall(rest.join(' '), { via: 'cli', reflect: !!flags.reflect, depth: typeof flags.depth === 'string' ? flags.depth : undefined, doseThreshold: __doseTh, since: rSel.day, until: rUnt.day, includeUndated: !!flags.undated, includeRefuted: !!flags['include-refuted'], today: typeof flags.today === 'string' ? flags.today : undefined, loadBalance: !!flags['load-balance'], balanceLog: typeof flags['balance-log'] === 'string' ? flags['balance-log'] : undefined, tag: flags.tag ? String(flags.tag) : undefined, ...__paging })
      : lookupDetailed(rest.join(' '), { via: 'cli', reflect: !!flags.reflect, depth: typeof flags.depth === 'string' ? flags.depth : undefined, doseThreshold: __doseTh, since: rSel.day, until: rUnt.day, includeUndated: !!flags.undated, includeRefuted: !!flags['include-refuted'], today: typeof flags.today === 'string' ? flags.today : undefined, loadBalance: !!flags['load-balance'], balanceLog: typeof flags['balance-log'] === 'string' ? flags['balance-log'] : undefined, tag: flags.tag ? String(flags.tag) : undefined, perspective, ...__paging });
    const tierOf = (h) => (h.displayTier ? ' ' + h.displayTier : '') + (h.stale ? ' 待复核' : '') + (h.refuted ? ' refuted' : '');
    // #35 --trace（2026-10-12 窗口 5）：逐条列出计分零件（可审、可复核、可 A/B）。
    const renderTrace = (t) => [
      `${t.strong ? '强' : '弱'} ${t.store} ${t.id}`,
      `  score=${t.score} rank=${t.rank} tier=${t.tier ?? '—'}${t.displayTier && t.displayTier !== t.tier ? '（展示 ' + t.displayTier + '）' : ''}${t.stale ? ' 待复核' : ''}${t.zeroWeight ? ' 零权重' : ''}`,
      `  severity=${t.severity ?? '—'} complexity=${t.complexity ?? '—'} factor=${t.factor ?? '—'}${t.factorApplied ? '' : '（未乘：孤案/零权重）'} balance=${t.balance?.enabled ? 'on ' + JSON.stringify(t.balance) : 'off'}`
    ].join('\n');
    if (flags.trace && Array.isArray(trace)) {
      print(trace, ['命中 ' + hits.length + ' 条（trace 视图）', ...trace.map(renderTrace)].join('\n'));
      break;
    }
    const G = (t) => (flags.reflect || flags.depth === 'full') ? String(t ?? '') : stripGenre(String(t ?? ''));   // I-11 P0-②：读侧剥皮（--reflect / --depth full＝全文，不剥）
    const lines = hits.length ? hits.map(h => `${h.agePrefix ? h.agePrefix + ' ' : ''}[${h.store}] ${h.id} (${h.score})${tierOf(h)}${h.undated ? ' [未定年]' : ''} ${G(h.snippet)}`) : ['（无结果）'];
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
    if (dose) lines.push(`· 剂量闸：符号负荷 ${dose.total} > 阈值 ${dose.threshold} ⇒ 后 ${dose.trimmed} 条已摘要（--dose-threshold N 调闸、--reflect 不受限）`);
    if (budget && (budget.trimmed > 0 || budget.offset > 0)) lines.push('[装载] ' + budget.hint);
    print(flags.report ? { hits, stats, knowledge, budget } : hits, lines.join('\n'));
    break;
  }
  case 'brief': {
    if (flags.all) { console.error('六库 brief 没有 --all（那是会话层动作段归并的开关）。被 refute 的记录用 --include-refuted，或 show <id>。'); code = 1; break; }
    if (flags.since && !normalizeDateArg(flags.since).ok) { console.error(normalizeDateArg(flags.since).error); code = 1; break; }
    if (flags.until && !normalizeDateArg(flags.until).ok) { console.error(normalizeDateArg(flags.until).error); code = 1; break; }
    const __doseThB = Number.isFinite(Number(flags['dose-threshold'])) ? Number(flags['dose-threshold']) : undefined;   // I-12 P1-③：0=关闸
    const b = brief(rest.join(' '), { via: 'cli', reflect: !!flags.reflect, depth: typeof flags.depth === 'string' ? flags.depth : undefined, doseThreshold: __doseThB, perStore: Number(flags.per) || 3, since: flags.since, until: flags.until, includeRefuted: !!flags['include-refuted'], today: typeof flags.today === 'string' ? flags.today : undefined, loadBalance: !!flags['load-balance'], balanceLog: typeof flags['balance-log'] === 'string' ? flags['balance-log'] : undefined, offset: Number(flags.offset) || 0, contextBudget: flags.full ? false : undefined, maxTokens: Number.isFinite(Number(flags['max-tokens'])) ? Number(flags['max-tokens']) : undefined });
    const lines = [`主题简报「${b.query}」：` + (b.groups.length ? `命中 ${b.groups.length} 库` : '无命中')];
    // #31 --ladder（2026-10-12 窗口 5）：先亮「停在哪一层、为何没下钻」。
    if (flags.ladder && Array.isArray(b.ladder)) {
      lines.push('检索梯：');
      for (const x of b.ladder) lines.push(`  ${x.stopped ? '★' : '·'} ${x.layer} ×${x.hit}  — ${x.why}`);
    }
    const G = (t) => (flags.reflect || flags.depth === 'full') ? String(t ?? '') : stripGenre(String(t ?? ''));   // I-11 P0-②：读侧剥皮（--reflect / --depth full＝全文，不剥）
    for (const g of b.groups) {
      lines.push(`[${g.store} ×${g.total}${g.hits.length < g.total ? ` → top${g.hits.length}` : ''}]`);
      for (const h of g.hits) {
        const t = (h.agePrefix ? h.agePrefix + ' ' : '') + (h.time ? `[${h.time}] ` : '') + (typeof h.valence === 'number' && h.valence < 0 ? '⚠ ' : '');
        if (g.store === 'frontier') lines.push(`  - ${t}${G(h.title)} [${h.status}] ${h.topic}${h.supports.length ? '  supports=' + h.supports.join(' ') : ''}`);
        else if (g.store === 'canon') lines.push(`  - ${t}${h.displayTier ? h.displayTier + ' ' : ''}${h.stale ? '待复核 ' : ''}${h.id}: ${G(h.claim)}（${h.source} · ${h.ref}）`);
        else if (g.store === 'mirror') lines.push(`  - ${t}${h.id}: ${G(h.situation)} → ${G(h.outcome)}`);
        else if (g.store === 'orphan') lines.push(`  - ${t}[${h.severity}] ${h.id}: ${G(h.summary)}`);
        else if (g.store === 'pricing') lines.push(`  - ${t}${h.id}: ${G(h.behavior)}（valence ${h.valence}）`);
        else if (g.store === 'lexicon') lines.push(`  - ${t}${h.term}: ${G(h.resolution)}`);
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
    if (b.dose) lines.push(`· 剂量闸：符号负荷 ${b.dose.total} > 阈值 ${b.dose.threshold} ⇒ 后 ${b.dose.trimmed} 条已摘要（--dose-threshold N 调闸、--reflect 不受限）`);
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
    const c = cross(rest[0] || '', { via: 'cli', reflect: !!flags.reflect, depth: typeof flags.depth === 'string' ? flags.depth : undefined, perStore: flags.per ? Number(flags.per) : undefined, since: flags.since, until: flags.until, includeRefuted: !!flags['include-refuted'], today: typeof flags.today === 'string' ? flags.today : undefined, loadBalance: !!flags['load-balance'], balanceLog: typeof flags['balance-log'] === 'string' ? flags['balance-log'] : undefined, offset: Number(flags.offset) || 0, contextBudget: flags.full ? false : undefined, maxTokens: Number.isFinite(Number(flags['max-tokens'])) ? Number(flags['max-tokens']) : undefined });
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
    if (c.budget) lines.push('· ' + c.budget.hint);
    lines.push(`对位比较「${c.query}」：命中 ${c.groups.length} 库 / ${c.total} 条（当前版本）`);
    for (const g of c.groups) {
      lines.push(`[${g.store} ×${g.total}]`);
      for (const item of g.items) lines.push(`  ${item.agePrefix ? item.agePrefix + ' ' : ''}${item.id} | ${item.line}`);
    }
    if (c.hint) lines.push('· ' + c.hint);
    dateNote();
    print(c, lines.join('\n'));
    break;
  }
  case 'mirror': {
    const sub = rest[0];
    // 2026-10-11：mirror 新增 compare / outcome / import 三子命令（内层 dispatch 见下方）；match 走原路径
    if (sub === 'match' || sub === 'compare' || sub === 'outcome' || sub === 'import') {
      const text = rest.slice(1).join(' ');
      let hits;
      try {
        // (a)(b) 2026-10-11：mirror 新增三子命令 —— compare（两镜分组）/ outcome（记可判定结果）/ import（范式镜导入校验+骨架）
      const msub = rest[0];
      if (msub === 'compare') {
        const q = rest.slice(1).join(' ');
        const c = mirrorCompare(q, { limit: Number(flags.limit) || 12 });
        const lines = [];
        lines.push('两镜对比（基线镜＝我们的经验 / 范式镜＝典籍·寓言·史例）：基线 ' + c.summary.baseline + ' 条 · 范式 ' + c.summary.paradigm + ' 条');
        lines.push('· ' + c.summary.note);
        if (c.baseline.length) { lines.push('  ── 基线镜'); for (const r of c.baseline) lines.push('   · ' + r.id + ' ｜ ' + String(r.situation || '').slice(0, 46) + ' ｜ 结果=' + String(r.outcome || '').slice(0, 30) + ' ｜ verdict=' + (r.verdict || '（未记录）')); }
        if (c.paradigm.length) { lines.push('  ── 范式镜'); for (const r of c.paradigm) lines.push('   · ' + r.id + ' ｜ ' + String(r.story || '').slice(0, 34) + ' ｜ era=' + (r.era || '-') + ' ｜ 结果=' + String(r.outcome || '').slice(0, 30)); }
        print(c, lines.join('\n'));
        break;
      }
      if (msub === 'outcome') {
        const id = rest[1];
        if (!id) { print(null, '用法：mirror outcome <id> --verdict 成功|部分|失败 [--rework N] [--note 文本]'); code = 1; break; }
        const r = mirrorOutcome(id, { verdict: flags.verdict, rework: flags.rework != null ? Number(flags.rework) : null, note: flags.note ? String(flags.note) : null });
        print(r, '已记录结果：' + id + ' → ' + r.id + '（verdict=' + flags.verdict + (flags.rework != null ? ' rework=' + flags.rework : '') + '）');
        break;
      }
      if (msub === 'import') {
        const f = rest[1];
        if (!f) { print(null, '用法：mirror import <文本文件> --source <出处> --era <时代> --context <语境> [--story <名>]（只产出草稿，不写库）'); code = 1; break; }
        try {
          const d = mirrorImportDraft(readFileSync(f, 'utf8'), { source: flags.source, era: flags.era, context: flags.context, story: flags.story ? String(flags.story) : null });
          print(d, '范式镜导入草稿（未写库）： ' + JSON.stringify(d));
        } catch (e) { print(null, String(e.message)); code = 1; }
        break;
      }
      // --na '<json>'：当前处境的事实对象（#3 not_applicable 条件求值；不传=不过滤）
      let naCtx;
      if (flags.na !== undefined && flags.na !== true) {
        try { naCtx = JSON.parse(String(flags.na)); }
        catch (e) { print(null, '--na 须为 JSON 对象，如 \'{"context":"创作虚构"}\'（' + e.message + '）'); code = 1; break; }
      }
      hits = mirrorMatch(text, {
          reflect: !!flags.reflect,   // I-11 复查补齐②：mirror 叙事默认剥皮；--reflect 给原文
          limit: Number(flags.limit) || 3, mode: flags.mode, role: flags.role,
          evidence: flags.evidence, era: typeof flags.era === 'string' ? flags.era : undefined,
          context: typeof flags.context === 'string' ? flags.context : undefined,
          notApplicable: naCtx
        });
      } catch (e) {
        print(null, String(e.message) + '\n用法：node akasha.mjs mirror compare <情境> | mirror outcome <id> --verdict 成功|部分|失败 [--rework N] | mirror import <文件> --source <出处> --era <时代> --context <语境> | mirror match <情境文本> [--limit N] [--mode task|improve|all] [--role solution|boundary] [--evidence story|own-log] [--era …] [--context …] [--na \'{"field":"值"}\']');
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
      print(null, '用法：node akasha.mjs mirror compare <情境> | mirror outcome <id> --verdict 成功|部分|失败 [--rework N] | mirror import <文件> --source <出处> --era <时代> --context <语境> | mirror match <情境文本> [--limit N] [--mode task|improve|all] [--role solution|boundary] [--evidence story|own-log] [--era …] [--context …]');
      code = 1;
    }
    break;
  }
  case 'summary': {
    const s = summary({ per: Number(flags.per) || 3 });
    const G = (t) => flags.reflect ? String(t ?? '') : stripGenre(String(t ?? ''));   // C 小面（2026-10-14）：摘要最近条目行默认剥皮
    const lines = [`全库摘要（${s.today}）——` + Object.entries(s.stores).map(([k, v]) => `${k} ${v.total}`).join(' / ')];
    for (const [name, st] of Object.entries(s.stores)) {
      lines.push(`[${name} ×${st.total}]`);
      for (const r of st.recent) lines.push(`  - ${r.id}${r.event_time ? ' [' + r.event_time + ']' : ''}: ${G(r.line)}`);
      if (st.by_status) lines.push('  status：' + Object.entries(st.by_status).map(([k, v]) => `${k} ${v}`).join('，'));
    }
    lines.push('· 审计：' + (s.audit.ok ? 'OK' : s.audit.findings.map(f => `${f.code}×${f.count}`).join('，')));
    if (s.newest) lines.push(`· 最近写入：${s.newest.store}#${s.newest.id}（${s.newest.ageText}）`);
    print(s, lines.join('\n'));
    break;
  }
  case 'show': {
    // #33 --expand（2026-10-12 窗口 5）：沿 promoted_from 回溯源头（只读）；id 会逐库查找。
    if (flags.expand) {
      const idArg = rest[0] || '';
      let e = { found: false, id: idArg, origin: null, chain: [], note: '未找到该 id（六库当前集都没有）' };
      for (const s of ['canon', 'mirror', 'orphan', 'pricing', 'lexicon', 'frontier']) {
        try { const x = expandRecord(s, idArg, {}); if (x.found) { e = x; break; } } catch { /* 单库读失败不致命 */ }
      }
      print(e, e.found
        ? [`[${e.store}] ${e.id}`, e.origin ? `源：${e.origin.store} ${e.origin.id}（session ${e.origin.session ?? '?'} · seq ${e.origin.seq ?? '?'}）${e.origin.dangling ? ' ⚠ 悬空' : ''}` : '源：无（原生条目）', e.note].join('\n')
        : '未找到：' + (e.note || ''));
      if (!e.found) code = 1;
      break;
    }
    const r = show(rest[0] || '', { reflect: !!flags.reflect, depth: typeof flags.depth === 'string' ? flags.depth : undefined });
    if (!r.record) { print(r, '（未找到：' + (r.note || '') + '）'); code = 1; break; }
    const head = (r.agePrefix ? r.agePrefix + ' ' : '') + (r.found ? `[${r.store}] ${r.id}` : `（${r.note}）`);
    const c = r.credibility;
    const credLines = c ? ['可信度：' + (c.label || '（无层级）') + (c.cls ? ' · ' + c.cls : ''), ...c.steps.map((st) => `  ${st.id}  ${st.why} → ${st.tier || '—'}${st.refuted ? ' refuted' : ''}`)] : [];
    // I-11 P0-②（2026-10-13）：读侧剥皮（--reflect＝反思通道，不剥）——⇒/✓/好。 非 JSON 结构字符，序列化后整段剥安全。
    const recText = JSON.stringify(r.record, null, 2);
    const tierNote = r.truncated ? `· 读档 ${r.depth}（已截断）；去掉 --depth 即全文` : '';
    const fullText = flags.reflect || flags.depth === 'full';
    print(r, [head, ...credLines, tierNote, fullText ? recText : stripGenre(recText)].filter((x) => x !== '').join('\n'));
    break;
  }
  case 'sleep': {
    if (flags.replay && (flags.apply || flags.revoke)) { console.error('--replay 与 --apply/--revoke 互斥：回放只读（报告 misses 会不会变），不改库。'); code = 1; break; }
    if (flags.apply || flags.revoke) {
      const pick = (k) => (typeof flags[k] === 'string' ? flags[k] : undefined);
      if (flags.apply) {
        const ref = pick('apply');
        if (!ref) { console.error('用法：sleep --apply <planId|计划文件> [--yes] [--only <id>] [--force]'); code = 1; break; }
        const dry = flags.yes !== true;
        const blocked = productionForceRejected({ dry, force: flags.force === true });
        if (blocked) { console.error(blocked); code = 1; break; }
        const r = applyPlan(ref, { dry, force: flags.force === true, only: pick('only'), production: true });
        if (!r.ok) { console.error('执行失败：' + r.error); code = 1; break; }
        const rc = r.receipt;
        const lines = [(r.dry ? '演练（未写库；确认后加 --yes 执行）' : '已执行') + '：' + rc.planId + ' · 退役 ' + rc.summary.retired + ' / 跳过 ' + rc.summary.skipped + ' / 拒绝 ' + rc.summary.refused + (rc.basisOk ? '' : ' · ⚠ 指纹过期（--force 强行）')];
        for (const op of rc.ops) {
          if (op.status === 'filtered') continue;
          if (op.op === 'merge') lines.push('  merge [' + op.store + '] keep ' + (op.keep ?? '（待人工指定）') + ' ← ' + (op.absorb || []).join(', ') + ' · ' + op.status + (op.why ? '（' + op.why + '）' : ''));
          else lines.push('  ' + op.op + ' [' + op.store + '] ' + (op.id ?? '?') + ' · ' + op.status + (op.why ? '（' + op.why + '）' : ''));
          for (const d of op.detail || []) lines.push('    - ' + d.id + ' ' + d.status + (d.reason ? '（' + d.reason + '）' : '') + (d.tombstone ? ' → ' + d.tombstone : ''));
        }
        if (r.receiptFile) lines.push('  回执：' + r.receiptFile);
        print(r, lines.join('\n'));
        break;
      }
      const ref = pick('revoke');
      if (!ref) { console.error('用法：sleep --revoke <planId|计划文件> [--yes]'); code = 1; break; }
      const r = revokePlan(ref, { dry: flags.yes !== true });
      if (!r.ok) { console.error('撤销失败：' + r.error); code = 1; break; }
      const rv = r.revoke;
      const lines = [(r.dry ? '演练（未写库；确认后加 --yes 执行）' : '已撤销') + '：' + rv.planId + ' · 墓碑 ' + rv.count + ' 个'];
      for (const x of rv.results) lines.push('  ' + x.id + ' ' + x.status + (x.record ? ' → ' + x.record : ''));
      if (r.outFile) lines.push('  回执：' + r.outFile);
      print(r, lines.join('\n'));
      break;
    }
    if (flags.replay) {
      // 历史回放：只读。同一份旧日志再数 recall.misses，并对照计划会移出的 id。不写库。
      if (flags.rollback) { console.error('sleep --rollback 无此实现——回滚请用 `sleep --revoke <planId>`。'); code = 1; break; }
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
      // wave2 §2 第一批：只出计划（只读六库，只写计划文件；不动水位线）。**--apply / --revoke 已实现（2026-10-14，A 档）**，在 case 顶部处理。
      if (flags.rollback) { console.error('sleep --rollback 无此实现——回滚请用 `sleep --revoke <planId>`。'); code = 1; break; }
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
      lines.push('  · mergedText 留空待填；--apply（A 档：keep 不动＋absorb 软退役）/ --revoke 已实现（2026-10-14）。');
      print({ ...p, planFile: r.planFile }, lines.join('\n'));
      break;
    }
    if (flags.rollback) { console.error('sleep --rollback 无此实现——回滚请用 `sleep --revoke <planId>`。'); code = 1; break; }
    const r = sleepRun({ trigger: 'manual', dry: !!flags.dry });
    if (!r.ok) { print(r, '睡眠失败：' + r.error); code = 1; break; }
    const head = r.dry ? '（dry-run）将蒸馏：' : '已蒸馏：';
    print(r, `${head}新增 ${r.processedTo - r.processedFrom} 条（水位线 ${r.processedFrom} → ${r.processedTo}）；待办 ${r.todo} 条${r.reportFile ? '；报告 ' + r.reportFile : ''}`);
    break;
  }
  case 'promote': {
    // I-08（2026-10-14）：转正前先过「晋升标准清单」（复验通过 / 去重查过 / 重要度标注 / 来源证据链完整）——打出来，人工过目。
    console.log('晋升标准清单（I-08·转正前逐条自检）：① 复验通过？ ② 去重查过（同 code 不重复）？ ③ 重要度标注（severity）？ ④ 来源证据链完整（observed/hypothesis/would_confirm/would_refute 有实词）？');
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
    // I-01（2026-10-13 批次 1）：--due 打印复审到期清单（信任级 × 时龄）——原型，供人工核。
    if (flags.due) {
      const rv = r.review;
      lines.push(`复审到期清单（核心 ${rv.policy.coreDays}d / 一般 ${rv.policy.generalDays}d / 年审 ${rv.policy.annualDays}d）——扫描 ${rv.counts.scanned} · 到期 ${rv.counts.due} · 无日期锚 ${rv.counts.undated}：`);
      if (!rv.counts.due) lines.push('  （本日无到期）');
      for (const x of rv.top) lines.push(`  [${x.store}] ${x.id}  ${x.tier ?? '—'}${x.cls === 'rendered' ? '（渲染条）' : ''}  龄 ${x.ageDays}d > ${x.intervalDays}d · 超 ${x.overdueDays} 天（锚 ${x.anchor}）`);
      if (rv.counts.undated) lines.push(`  · 无日期锚 ${rv.counts.undated} 条（例：${rv.undated.slice(0, 3).map((x) => x.store + '/' + x.id).join('、')}）——未知 ≠ 刚审过`);
    }
    print(r, lines.join('\n'));
    break;
  }
  case 'now': {
    // 内置时钟（2026-10-14）：主动查询「现在几点 + 时间对照锚」——为自我行为提供时间依据。
    const r = nowSnapshot({ at: typeof flags.at === 'string' ? flags.at.split(',') : undefined });
    const lines = [`现在：${r.now.local} ${r.now.weekday}（${r.now.tzOffset} · UTC ${r.now.utc} · unix ${r.now.unix}）`];
    if (r.refs.lastWrite) lines.push(`对照·最近写入：${r.refs.lastWrite.store}#${r.refs.lastWrite.id}（${r.refs.lastWrite.age ?? '?'}）`);
    if (r.refs.lastSleep) lines.push(`对照·上次睡眠：${r.refs.lastSleep.at ?? '?'}（距今 ${r.refs.lastSleep.age ?? '?'}）`);
    for (const x of r.at) lines.push(x.error ? `对照·${x.input}：${x.error}` : `对照·${x.input} → ${x.direction} ${x.age}（${x.daysAgo} 天）`);
    lines.push('口径：本地时区 ' + r.now.tzOffset + '；`--at` 的 YYYY-MM-DD 按 UTC 午夜解析。');
    print(r, lines.join('\n'));
    break;
  }
  case 'diff': {
    // I-03（2026-10-13 批次 1）：两时点「库变了什么」——只读。
    const rSel = flags.since ? normalizeDateArg(flags.since) : { ok: true, day: new Date().toISOString().slice(0, 10) };
    const rUnt = flags.until ? normalizeDateArg(flags.until) : { ok: true, day: new Date().toISOString().slice(0, 10) };
    if (!rSel.ok || !rUnt.ok) { console.error(rSel.error || rUnt.error); code = 1; break; }
    let d;
    try { d = memoryDiff({ since: rSel.day, until: rUnt.day, stores: flags.store ? [String(flags.store)] : undefined }); }
    catch (e) { console.error(e.message); code = 1; break; }
    const lines = [`库变化（${d.since} → ${d.until}）${flags.store ? '（仅 ' + flags.store + '）' : ''}：`];
    const G = (t) => flags.reflect ? String(t ?? '') : stripGenre(String(t ?? ''));   // C 小面（2026-10-14）：新增条目的行默认剥皮
    let anyChange = false;
    for (const [name, b] of Object.entries(d.stores)) {
      const n = b.added.length + b.revised.length + b.retired.length + (b.revoked?.length ?? 0);
      if (!n && !b.undated.count) continue;
      anyChange = true;
      lines.push(`[${name}] 新增 ${b.added.length} · 修订 ${b.revised.length} · 退役 ${b.retired.length}${b.revoked?.length ? ' · 撤销 ' + b.revoked.length : ''}` + (b.undated.count ? `（另有未定年 ${b.undated.count} 条不入窗——未知 ≠ 没变）` : ''));
      for (const x of b.added.slice(0, 8)) lines.push(`  + ${x.id}  ${G(x.line)}`);
      for (const x of b.revised.slice(0, 8)) lines.push(`  ~ ${x.id} ← ${x.supersedes}` + (x.changed ? (x.changed.length ? `  改：${x.changed.join('、')}` : '  （无字段变化）') : ''));
      for (const x of b.retired.slice(0, 8)) lines.push(`  - ${x.target}（墓碑 ${x.id}）` + (x.reason ? `：${x.reason}` : ''));
      for (const x of (b.revoked ?? []).slice(0, 8)) lines.push(`  ↩ ${x.target}（撤销 ${x.id}）` + (x.reason ? `：${x.reason}` : ''));
    }
    if (!anyChange) lines.push('（该窗口无变化）');
    lines.push(`合计：新增 ${d.totals.added} / 修订 ${d.totals.revised} / 退役 ${d.totals.retired} / 撤销 ${d.totals.revoked ?? 0} / 未定年 ${d.totals.undated}`);
    print(d, lines.join('\n'));
    break;
  }
  case 'conflict': {
    // I-04（2026-10-13 批次 1）：修订链对比视图 + 冲突候选——只读、只提示不裁决。
    const q = rest.join(' ');
    if (!q) { print(null, '用法：node akasha.mjs conflict <id | 主题词> [--top N]'); code = 1; break; }
    const cr = conflictReport(q, { top: Number(flags.top) || undefined });
    const lines = [];
    if (cr.chain) {
      lines.push(`修订链「${cr.chain.root}」（${cr.chain.store}）：${cr.chain.retired ? '已退役（不在当前集）' : '当前版本 ' + (cr.chain.currentId ?? '—')}，共 ${cr.chain.versions.length} 版`);
      for (const v of cr.chain.versions) lines.push(`  ${v.id}${v.day ? ' [' + v.day + ']' : ''}${v.tombstone ? '（墓碑 → ' + v.tombstone + '）' : ''}${v.changed ? '  改：' + (v.changed.length ? v.changed.join('、') : '（无字段变化）') : ''}`);
    }
    if (cr.pairs.length) {
      lines.push(`冲突候选（只提示不裁决）${cr.pairs.length} 对：`);
      for (const p of cr.pairs) lines.push(`  [${p.store}] ${p.a ?? '（截断占位）'} × ${p.b ?? ''}  ratio ${p.ratio}  共享 ${JSON.stringify(p.common)}` + (p.markers && p.markers.a && p.markers.a.length ? `  作废侧 ${JSON.stringify(p.markers.a)}` : ''));
    } else {
      lines.push(cr.chain ? '冲突候选：无（该链周边无机械候选）。' : `「${cr.query}」：无冲突候选——0 候选 ≠ 无矛盾（机械对照只到词法层）。`);
    }
    print(cr, lines.join('\n'));
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
    // I-02（2026-10-13 批次 1）：查询维度（侧线 logs/query-log.jsonl）——先起数据，不改索引。
    const qy = r.queries;
    if (qy) {
      const cmds = Object.entries(qy.byCmd).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}×${n}`).join('，');
      lines.push(`查询监控（${qy.total} 次：${cmds || '—'}）：**检索面**（lookup/brief/cross/recall）零结果率 ${qy.zeroRate === null ? '—' : (qy.zeroRate * 100).toFixed(1) + '%'} / 平均 ${qy.avgMs ?? '—'} ms（诊断类调用与机制探针只计 byCmd/${qy.probes ?? 0}，不进检索面指标）`
        + (qy.topQueries.length ? `；高频 top：${qy.topQueries.slice(0, 3).map(([t, n]) => `${t}×${n}`).join('，')}` : '')
        + (qy.referenced.rate === null ? `；命中被引用率：数据不足（${qy.referenced.n}/${qy.referenced.of}，样本 < ${qy.referenced.minSample}）` : `；命中被引用率 ${(qy.referenced.rate * 100).toFixed(1)}%（${qy.referenced.n}/${qy.referenced.of}）`)
        + `；会话号覆盖 ${qy.sessionCoverage.known}/${qy.sessionCoverage.total}`);
    }
    const rc = r.recall;
    const kv = r.revisability;
    if (kv) {
      const rv = kv.review;
      const byV = Object.entries(rv.byVerdict).map(([k, n]) => `${k}×${n}`).join('，') || '—';
      lines.push(`回看-纠正（K3，全量口径·不受 since）：复审线 ${rv.total}（${byV}${rv.lastAt ? `；最近 ${String(rv.lastAt).slice(0, 16)} ${rv.lastVerdict ?? ''}` : ''}）· 退役 ${kv.retired} · 近 7 天修订 ${kv.revised7d} 版（最近 ${kv.lastRevisedAt ? String(kv.lastRevisedAt).slice(0, 16) : '—'}）· 矛盾检测调用 ${kv.calls.conflict} 次（${kv.calls.windowNote}）`);
    }
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
    try {
      const obj = JSON.parse(flags.data || '{}');
      const r = appendRecord(flags.store, obj);
      const c = committedOf(r);   // #23：写入回执统一（committed=true 才说「已追加」）
      print(c, '已追加：' + c.id + '（committed=' + c.committed + '）');
    } catch (e) { print(null, '未落盘：' + e.message + '（committed=false）'); code = 1; }
    break;
  }
  case 'readings': {
    const r = autonomyReadings({ since: typeof flags.since === 'string' ? flags.since : undefined });
    print(r, '自治读数（只读·如实；样本不足 ⇒ null，不冒充 PASS）' + (r.ok === null ? ' — ok=null（缺：' + r.missing.join('/') + '）' : ' — ok=true')
      + '\n' + Object.entries(r.readings).map(([k, v]) => '  ' + k + ' = ' + String(v.value) + (v.num !== null ? '  [' + v.num + '/' + v.den + ']' : '') + '  — ' + v.note).join('\n'));
    break;
  }
  case 'negative': {
    // #2 负记忆两层（2026-10-12 窗口 6）：list 查档；add 手工记一条（kind 限 rejected-write/undecided）。
    if (rest[0] === 'add') {
      try {
        const r = recordRejected({ kind: flags.kind ? String(flags.kind) : 'undecided', reason: flags.reason ? String(flags.reason) : '（未填 reason）', what: flags.what ? String(flags.what) : '', ref: flags.ref ? String(flags.ref) : '' });
        print(r, '已记负记忆：' + r.id + ' [' + r.kind + '] ' + r.reason);
      } catch (e) { print(null, String(e.message)); code = 1; }
      break;
    }
    const list = listRejected({ kind: flags.kind ? String(flags.kind) : undefined });
    print(list, list.length ? '负记忆 ' + list.length + ' 条：\n' + list.map((x) => '  ' + x.ts.slice(0, 10) + ' [' + x.kind + '] ' + x.reason + (x.what ? ' — ' + x.what : '')).join('\n') : '负记忆为空（没有已归档的「被拒 / 未决」）');
    break;
  }
  case 'blindspots': {
    // #4 BLINDSPOT（2026-10-12 窗口 6）：把「这次没检的面」摊开（与 lookup/brief 返回体同源）。
    const bs = blindspotsFor({ perspective: flags.perspective ? String(flags.perspective) : undefined });
    print(bs, '盲区清单（本入口没检的面）：\n' + bs.map((b) => '  · ' + b.what + ' — ' + b.why + '；动作：' + b.action).join('\n'));
    break;
  }
  case 'blindmap': {
    // #16 盲区地图（2026-10-12 窗口 9）：给一批查询词 ⇒ 盲区/薄弱/覆盖 分级（法定输出，不静默）。
    const qs = rest.length ? rest : ['会话层', '量子计算'];
    const m = blindspotMap(qs, {});
    print(m, ['盲区地图：' + m.summary.note, ...m.blind.map((x) => `  [${x.level}] 「${x.query}」 命中 ${x.hits}（强 ${x.strong}）— ${x.reason}`)].join('\n'));
    break;
  }
  case 'discipline': {
    // #27 纪律单源渲染（2026-10-12 窗口 9）：默认出渲染产物；--check 校验给定文件是否漂移。
    if (flags.check !== undefined && flags.check !== true) {
      let text = '';
      try { text = readFileSync(String(flags.check), 'utf8'); }
      catch (e) { print(null, '读不到文件：' + String(flags.check) + '（' + e.message + '）'); code = 1; break; }
      const v = verifyDiscipline(text);
      print(v, v.ok ? '纪律产物与单源一致 ✓（' + v.version + '）' : '⚠ 漂移：' + v.reason + '\n' + (v.diffs || []).map((d) => '  行 ' + d.line + '：期望 «' + d.expected + '» 实得 «' + d.actual + '»').join('\n'));
      if (!v.ok) code = 1;
      break;
    }
    const md = renderDiscipline();
    process.stdout.write(md + '\n');
    break;
  }
  case 'generation': {
    // #24 代际指纹（2026-10-12 窗口 8）：「跑的是不是盘上的代码」一眼可辨。
    const g = generationInfo();
    print(g, g.restart_required
      ? '⚠ 代际不一致：code=' + g.code_generation + ' ≠ disk=' + g.disk_generation + ' ⇒ ' + g.note
      : '代际一致：' + g.code_generation + '（' + g.note + '）');
    break;
  }
  case 'recall': {
    // #26 渐进式检索（2026-10-12 窗口 7）：宽 → 收窄分步；DEFER ≠ 失败。
    const r = progressiveRecall(rest.join(' '), { since: flags.since, until: flags.until });
    print(r, r.deferred
      ? 'DEFER：' + r.note
      : ['渐进式检索「' + r.query + '」' + (r.converged ? '（已收敛）' : '（仍偏宽）'),
        ...r.steps.map((s, i) => `  ${i + 1}. 「${s.query}」 ×${s.tokens}词 ⇒ 命中 ${s.hits}（强 ${s.strong}）· ${s.stance ?? '—'}`),
        '  ' + r.note].join('\n'));
    break;
  }
  case 'calibration': {
    // #15 来源态校准（2026-10-12 窗口 7）：从 output-audit/usage 线能拿到的最接近数据 = 引用命中率。
    //   真正的 gap/ECE 需要「自报把握 × 实测对错」的样本；当前库**无此采样** ⇒ 如实 null（不冒充）。
    const c = calibrationOf([], { minN: 10 });
    print(c, '校准读数：' + (c.ok === null ? 'ok=null（' + c.note + '）' : 'ok=true · gap=' + c.gap + ' · ECE=' + c.ece));
    break;
  }
  case 'rollback': {
    const store = rest[0];
    if (!store) { print(null, "用法：node akasha.mjs rollback <store> [--since YYYY-MM-DD] [--apply]（默认 dry：只出计划）"); code = 1; break; }
    try {
      const r = rollbackBatch(store, { since: typeof flags.since === 'string' ? flags.since : undefined, apply: flags.apply === true || flags.apply === 'true' });
      const dry = !(flags.apply === true || flags.apply === 'true');
      print(r, dry
        ? (r.length ? '计划回滚 ' + r.length + ' 条（dry；加 --apply 执行）：\n' + r.map((x) => '  ' + x.id + ' → 还原自 ' + x.restores).join('\n') : '无可回滚项（该日期起没有新增修订）')
        : (r.length ? '已回滚 ' + r.length + ' 条（追加反向修订）：\n' + r.map((x) => '  ' + x.id + '（rollback_of ' + x.rollback_of + '）').join('\n') : '无可回滚项（已幂等）'));
    } catch (e) { print(null, String(e.message)); code = 1; }
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
  case 'review': {
    // I-10 记忆复审机制（2026-10-14）：pack ＝ 交给 fresh 子 agent 的输入包；log ＝ `review-cycle` 留痕；list ＝ 读留痕线。
    const sub = rest[0];
    if (sub === 'pack') {
      const id = rest[1];
      if (!id) { console.error('用法：review pack <id> [--json]'); code = 1; break; }
      const r = reviewPack(id);
      if (!r.found) { print(r, `（未找到：${r.note}）`); code = 1; break; }
      if (flags.json) { print(r, JSON.stringify(r, null, 2)); break; }
      const lines = [`复审输入包：${r.store}/${r.id}（当前版本 ${r.current}${r.chain && r.chain.versions > 1 ? `；链上第 ${r.chain.versions} 版` : ''}）`, '', '【条目全文】', String(r.record.claim ?? r.record.summary ?? '').slice(0, 1200)];
      if (r.source) lines.push('', `【来源证据】${r.source.type ?? '—'} · ${String(r.source.ref ?? '（无 ref）').slice(0, 200)}`);
      lines.push('', `【必要上下文】相关条目 ${r.related.length} 条${r.related.length ? '：' : '（无因果/链邻居）'}`);
      for (const x of r.related) lines.push(`  - ${x.id}${x.store ? ` [${x.store}]` : ''}${x.missing ? '（缺失）' : '：' + String(x.line).slice(0, 120)}`);
      lines.push('', '【审查协议】（fresh 子 agent·零上下文）');
      for (const q of r.protocol.questions) lines.push('  · ' + q);
      lines.push(`  输出：${r.protocol.output}`, `  落法：${r.protocol.landing}`);
      print(r, lines.join('\n'));
      break;
    }
    if (sub === 'log') {
      const id = rest[1];
      if (!id) { console.error('用法：review log <id> --verdict 维持|修正|升级 [--by self|subagent] [--note "…"]'); code = 1; break; }
      const verdict = String(flags.verdict ?? '');
      if (!['维持', '修正', '升级'].includes(verdict)) { console.error('--verdict 须为 维持/修正/升级（修正/升级的正文改动另走 revise；本命令只留痕＋维持时打复审戳）'); code = 1; break; }
      const by = flags.by === 'subagent' ? 'subagent' : 'self';
      let touched = null;
      let store = null;
      const s = show(id);
      if (!s.record) { print(null, `（未找到：${s.note || ''}）`); code = 1; break; }
      store = s.store;
      if (verdict === '维持') {
        const rec = revise(s.store, s.id, { last_reviewed: new Date().toISOString().slice(0, 10) });
        touched = rec.id;
      }
      const entry = { store, id: s.id, verdict, by, note: typeof flags.note === 'string' ? flags.note : null, touched };
      appendReviewLog(entry);
      print(entry, `已留痕 review-cycle：${s.store}/${s.id} · ${verdict} · ${by}${touched ? ` → ${touched}` : ''}`);
      break;
    }
    if (sub === 'list') {
      const items = readReviewLog({ limit: Number(flags.limit) || 20, since: typeof flags.since === 'string' ? flags.since : undefined });
      print(items, items.length
        ? items.map(x => `${String(x.ts).slice(0, 16)}  ${x.verdict}  ${x.by}  ${x.id}${x.note ? ' · ' + x.note : ''}`).join('\n')
        : '（复审线暂无记录；用 review log 留痕）');
      break;
    }
    console.error('用法：review pack <id> [--json] | review log <id> --verdict 维持|修正|升级 [--by self|subagent] [--note …] | review list [--limit N] [--since D]');
    code = 1;
    break;
  }
  case 'session': {
    const sub = rest[0];
    const storeFile = flags.store ? String(flags.store) : undefined;
    const metaFile = flags.meta ? String(flags.meta) : undefined;
    const helpLines = [
      '会话层（session layer）用法：',
      '  node akasha.mjs session index <sessionId|文件路径> [--session ID] [--root D] [--store F] [--meta F] [--full]',
      '  node akasha.mjs session themes [--session ID] [--limit N]      # ★会话主题表（主题＝本会话窗口内新增的库条目 + tags 建议词）',
      '  node akasha.mjs session topics [--build] [--term X] [--session SID] [--since D] [--until D]   # ★话题簇（跨会话持久＋增量修缮＋双时态＋会话归属；--build 更新一代）',
      '  node akasha.mjs session clusters [--session ID] [--top N]      # ⚠实验件：词频/种子簇四轮迭代未达标，结果仅作词频参考，导航请用 themes',
      '  node akasha.mjs session lookup <词> [--session ID] [--kind a,b] [--level nodes|segs] [--since D] [--until D] [--offset N] [--process] [--raw-process] [--all] [--limit N] [--store F] [--json]',
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
      // (a) 2026-10-11：走 detailed 版 ⇒ 返回覆盖度（主题命中 M / 作用域内 X 段 / 本页 N / 续取 offset）
      const d = lookupSegmentsDetailed(q, {
        storeFile,
        session: flags.session ? String(flags.session) : undefined,
        // (1) 2026-10-11：默认只查「结论 + 意图 + 节点」；动作段 gist 是工具调用参数，
        //                混进来会把"调过什么"误读成"想过什么" ⇒ 看动作面请显式 --actions。
        kind: flags.kind ? flags.kind : (flags.actions ? 'intent,action,conclusion' : undefined),
        level: flags.level,
        since: flags.since,
        until: flags.until,
        includeProcess: !!flags.process,
        rawProcess: !!flags['raw-process'],   // I-11 体裁隔离 P0：反思通道（含过程段、不剥皮）
        reflect: !!flags.reflect,
        depth: typeof flags.depth === 'string' ? flags.depth : undefined,
        via: 'cli',
        doseThreshold: Number.isFinite(Number(flags['dose-threshold'])) ? Number(flags['dose-threshold']) : undefined,   // I-12 P1-③：剂量闸（0=关闸）
        all: !!flags.all,
        offset: Number(flags.offset) || 0,
        limit: Number(flags.limit) || 10
      });
      const hits = d.hits;
      const lines = hits.length
        ? hits.map((h) => (h.kind === 'node'
          ? `${h.agePrefix ? h.agePrefix + ' ' : ''}[node L${h.level}] ${h.id}（${h.score}）${(h.children ?? []).length} 孩子 · ${String(h.gist).slice(0, 160)}`
          : `${h.agePrefix ? h.agePrefix + ' ' : ''}[${h.kind}] ${h.id}（${h.score}）turn ${h.turn ?? '?'} · ${h.kind === 'action' ? '[动作·工具调用，非结论] ' : ''}${String(h.gist).slice(0, 160)}`))
        : ['（无命中——默认不含过程段；需要时加 --process（剥皮）或 --raw-process（反思通道，不剥皮））'];
      if (d.withheld) lines.push('· ' + d.withheld.hint);
      if (d.dose) lines.push(`· 剂量闸：符号负荷 ${d.dose.total} > 阈值 ${d.dose.threshold}${d.dose.strict ? '（长会话·收紧档）' : ''} ⇒ 后 ${d.dose.trimmed} 条已摘要（--dose-threshold N 调闸、--raw-process 不受限）`);
      if (d.reflect) lines.push('· 反思通道：本通道不剥皮（过程段原文直出）');
      lines.push('[覆盖] 主题命中 ' + d.matched + ' 段 / 作用域内 ' + d.sessionTotal + ' 段 · 本页 ' + hits.length + ' 段'
        + (d.exhausted ? ' · 已到末尾（拿全）' : ' · 未拿全，续取 --offset ' + d.nextOffset));
      print(flags.json ? d : hits, lines.join('\n'));
      break;
    }
    if (sub === 'topics') {
      // (b'') 话题簇：跨会话持久 + 增量修缮 + 双时态 + 会话归属（2026-10-11 用户口径）
      let built = null;
      let writeNote = '';
      if (flags.build) {
        built = buildTopics({ storeFile });
        // 幂等 + 防膨胀（2026-10-11 复检）：同 fingerprint ⇒ 跳过；否则写新代并在 retires 里标记旧代退役（追加不改旧行）
        const prev = loadStore('session', storeFile).records.filter((r) => r.kind === 'topic');
        const latest = prev.reduce((a, r) => ((Number(r.treegen) || 0) > (Number(a && a.treegen) || 0) ? r : a), null);
        if (latest && latest.fingerprint === built.fingerprint) {
          writeNote = '（与最新代相同 → 跳过写入，防膨胀）';
        } else {
          const rec = {
            kind: 'topic',
            treegen: (latest ? (Number(latest.treegen) || 0) : 0) + 1,
            fingerprint: built.fingerprint,
            clusters: built.list,
            retires: prev.map((r) => Number(r.treegen) || 0),
            logged_at: new Date().toISOString(),
          };
          appendSegments(storeFile ?? SESSION_DEFAULTS.storeFile, [rec]);
          writeNote = '（已写第 ' + rec.treegen + ' 代；旧代 ' + rec.retires.length + ' 个标记退役）';
        }
      }
      const list = lookupTopics({ storeFile, term: flags.term ? String(flags.term) : undefined, session: flags.session ? String(flags.session) : undefined, since: flags.since, until: flags.until });
      const lines = [];
      lines.push('话题簇（跨会话持久 · 双时态 = 事件轴/记录轴 · 会话归属）：' + list.length + ' 簇' + (built ? '（本代 ' + built.list.length + ' 簇，覆盖 ' + built.sessions + ' 个会话）' : ''));
      for (const c of list.slice(0, 40)) {
        lines.push('  ' + String(c.term).padEnd(12) + '×' + String(c.count).padStart(3) + ' · 跨 ' + Object.keys(c.sessions || {}).length + ' 会话'
          + ' · 事件 ' + (c.firstEvent || '?') + '~' + (c.lastEvent || '?') + ' · 记录 ' + (c.firstLogged || '?') + '~' + (c.lastLogged || '?')
          + (c.entries && c.entries.length ? ' · 例 ' + c.entries[0] : ''));
      }
      print(list, lines.join('\n'));
      break;
    }
    if (sub === 'themes') {
      // (b') 会话主题表：主题＝本会话窗口内新增的六库条目（2026-10-11 定案，替代词频簇）
      const t = sessionThemes({ storeFile, session: flags.session ? String(flags.session) : undefined, limit: Number(flags.limit) || 60 });
      const lines = [];
      lines.push('会话主题表（主题＝本会话窗口内新增的库条目）：窗口 ' + (t.window ? t.window.lo + ' ~ ' + t.window.hi : '?')
        + ' · 共 ' + t.total + ' 条 ' + JSON.stringify(t.counts || {}));
      lines.push('建议查询词：' + (t.suggested || []).map((x) => x.term + '(' + x.count + ')').join(' '));
      let last = null;
      for (const x of t.themes) {
        if (x.store !== last) { lines.push('  ── ' + x.store); last = x.store; }
        lines.push('   · ' + x.id + ' ｜ ' + (x.tags.slice(0, 4).join('/') || '-') + ' ｜ ' + x.headline);
      }
      print(t, lines.join('\n'));
      break;
    }
    if (sub === 'clusters') {
      // (b) 主题簇导航（词频簇，非语义簇——如实标注）
      const cl = sessionClusters({
        storeFile,
        session: flags.session ? String(flags.session) : undefined,
        topN: Number(flags.top) || 12,
        minCount: Number(flags.min) || 3
      });
      const expand = typeof flags.expand === 'string' ? flags.expand : null;
      const lines = [];
      lines.push('主题簇（词频簇，非语义簇）：' + cl.length + ' 个' + (expand ? '（只展开：' + expand + '）' : ''));
      for (const c of cl) {
        if (expand && c.term !== expand) continue;
        lines.push(c.term + ' ×' + c.count + '（均 ' + Math.round(c.chars / c.count) + ' 字/段）');
        for (const s of c.samples) lines.push('   · ' + s.id + ' turn ' + (s.turn ?? '?') + ' · ' + s.gist);
      }
      print(cl, lines.join('\n'));
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
      if (!sid) { print(null, '用法：session tree [--build|--auto] --session <id> [--store F]'); code = 1; break; }
      if (flags.auto) {
        // 弧线树 v0.3 自动建树（2026-10-12）：签名未变即复用 + 节流；--force 跳过两道门。
        const storeF = storeFile ?? SESSION_DEFAULTS.storeFile;
        const r = autoBuildTree({ session: sid, storeFile: storeF, minIntervalMs: Number(flags.interval) || 600000, force: !!flags.force });
        print(r, (r.built ? '已自动建树：' : '未建（' + r.reason + '）：') + 'treegen ' + (r.treegen ?? '—') + ' · 节点 ' + (r.nodes ?? '—') + ' · 段 ' + (r.segCount ?? '—') + (r.nextEligibleInMs ? '（' + Math.round(r.nextEligibleInMs / 1000) + 's 后可再建）' : ''));
        break;
      }
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
    console.log('用法：node akasha.mjs <check|stats|budget [--enable] [--phase-check 文本]|lookup <词> [--since D --until D] [--max-tokens N] [--offset N] [--include-refuted] [--today D] [--load-balance] [--balance-log F]|brief <主题> [--per N] [--since D --until D] [--max-tokens N] [--offset N]|cross <词> [--per N] [--since D --until D] [--max-tokens N] [--offset N]|summary [--per N]|show <id>|mirror match <文本> [--limit N] [--mode task|improve] [--role solution|boundary] [--evidence story|own-log] [--era …] [--context …]|sleep [--dry]|sleep --replay [--log F] [--out F] [--today D] [--theta X] [--max K] [--orphan-days N] [--stale-days N]|sleep --plan [--out F] [--today D] [--theta X] [--max K] [--orphan-days N] [--stale-days N] [--log F]|kit|promote [--dry]|revise <store> <id> --data \'<json>\'|price --severity N --irreversibility N --cost N [--good|--bad] [--apply-store S --apply-id ID] [--json]|metrics [--since D]|orphan add --summary ... [--event-time YYYY-MM-DD]|orphan list|frontier list|frontier due|frontier recheck <id> --status <S> [--next-review D]|audit [--due] [--today D]|diff [--since D] [--until D] [--store S]|conflict <id|主题词> [--top N]|review pack <id>|review log <id> --verdict 维持\|修正\|升级 [--by self\|subagent]|review list [--limit N]|add --store <s> --data \'<json>\'|retire <store> <id> [--reason \'...\'] [--hard]|session <index|lookup|promote|context|tree|node|loopwatch|stats|help>（细目见 session help）>（体裁隔离：P0 读侧剥皮（lookup/brief/show/**cross**）与过程段不回放、P1 剂量闸——`--reflect` / `--raw-process` 反思通道不受限；`--dose-threshold N` 调闸 / 0 关闸）');
    code = cmd ? 1 : 0;
}
process.exit(code);
