// 阿卡夏之书（Akasha）v0 自检。运行：node test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zstdCompressSync } from 'node:zlib';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SCRATCH = join(ROOT, '..', '_scratch');
mkdirSync(SCRATCH, { recursive: true });
let passed = 0; const failures = [];
function t(name, fn) {
  try { fn(); passed++; console.log('PASS', name); }
  catch (e) { failures.push([name, e]); console.log('FAIL', name, '—', e.message); }
}

// ---- 1. 核心库
let lib = null;
try { lib = await import('./lib.mjs'); }
catch (e) { failures.push(['import lib.mjs', e]); console.log('FAIL import lib.mjs —', e.message); }

let sleepMod = null;
try { sleepMod = await import('./sleep.mjs'); }
catch (e) { failures.push(['import sleep.mjs', e]); console.log('FAIL import sleep.mjs —', e.message); }

let sessionMod = null;
try { sessionMod = await import('./session.mjs'); }
catch (e) { failures.push(['import session.mjs', e]); console.log('FAIL import session.mjs —', e.message); }

let loopDetect = null;
try { loopDetect = await import('./loop-detect.mjs'); }
catch (e) { failures.push(['import loop-detect.mjs', e]); console.log('FAIL import loop-detect.mjs —', e.message); }

if (lib) {
  t('parseJsonl：坏行只报告不抛，好行照收', () => {
    const r = lib.parseJsonl('{"a":1}\n这不是JSON\n{"b":2}\n');
    assert.equal(r.records.length, 2);
    assert.equal(r.errors.length, 1);
    assert.equal(r.errors[0].line, 2);
  });
  t('checkAll：六个存储全部通过校验', () => {
    const r = lib.checkAll();
    assert.equal(r.ok, true, JSON.stringify(r.errors, null, 2));
    for (const name of lib.STORES) {
      assert.ok(r.stores[name] && r.stores[name].total >= 1, name);
      assert.equal(r.stores[name].ok, r.stores[name].total, name + ' 应全部通过校验');
    }
    assert.ok(r.stores.frontier.total >= 68);
  });
  t('validateRecord：缺 claim 的 canon 记录被拒绝', () => {
    const errs = lib.validateRecord('canon', { id: 'x', source: { type: '官方', ref: 'r' } });
    assert.ok(errs.length >= 1);
  });
  t('validateRecord：pricing valence 越界被拒绝', () => {
    const errs = lib.validateRecord('pricing', { id: 'x', behavior: 'b', valence: 3, severity_default: 2 });
    assert.ok(errs.some(e => e.includes('valence')));
  });
  t('validateRecord：frontier status 非法被拒绝', () => {
    const errs = lib.validateRecord('frontier', {
      id: 'x', title: 't', url: 'https://a', topic: 't', status: '什么', last_checked: '2026-10-06', next_review: '2027-01-01'
    });
    assert.ok(errs.some(e => e.includes('status')));
  });
  t('price：5×5×5 上限 → raw 125 / arousal 1；坏结果 valence -1', () => {
    const p = lib.price({ severity: 5, irreversibility: 5, cost: 5, good: false });
    assert.equal(p.price_raw, 125);
    assert.equal(p.arousal, 1);
    assert.equal(p.valence, -1);
  });
  t('lookup：命中镜像库（狼来了）', () => {
    const hits = lib.lookup('狼来了');
    assert.ok(hits.some(h => h.store === 'mirror' && h.id === 'mirror-langlaile'));
  });
  t('lookup：命中原版文献层（HippoRAG）', () => {
    const hits = lib.lookup('HippoRAG');
    assert.ok(hits.some(h => h.store === 'frontier'));
  });
  t('lookup：空查询返回 []', () => {
    assert.deepEqual(lib.lookup('   '), []);
  });
  t('lookup：无结果返回 []（纯 ASCII 陌生词）', () => {
    assert.deepEqual(lib.lookup('zzqqxx-none'), []);
  });
  t('lookup：中文陌生词只产生弱命中（子词回退分 < 1，不与整词级混淆）', () => {
    const hits = lib.lookup('不存在的词xyzq');
    assert.ok(hits.every(h => h.score < 1), '回退命中必须全部 < 1：' + JSON.stringify(hits));
    // 封顶不变式：回退累计再多也 <1（「≥1 ⟺ 至少一次整词命中」；2026-10-07 复查捕获的漏洞，已封顶 0.9）
    const many = lib.lookup('不存不存不存不存');
    assert.ok(many.every(h => h.score < 1), '回退封顶后仍须 < 1：' + JSON.stringify(many));
  });
  t('stats：计数与来源分布自洽（按当前版本计）；frontier 计数', () => {
    const s = lib.stats();
    assert.equal(s.canon.total, lib.currentRecords(lib.loadStore('canon').records).length);
    assert.equal(Object.values(s.canon.by_source).reduce((a, b) => a + b, 0), s.canon.total);
    assert.ok(s.canon.by_source['复现'] >= 2, '示例库来源分布：' + JSON.stringify(s.canon.by_source));
    assert.ok(s.frontier.total >= 68);
    assert.equal(Object.values(s.frontier.by_status).reduce((a, b) => a + b, 0), s.frontier.total);
    assert.ok(s.frontier.by_status['高引用'] >= 1);
  });
  t('appendRecord：追加后可读回（临时文件）', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-test-'));
    const tmp = join(dir, '.tmp-test.jsonl');
    lib.appendRecord('orphan', {
      id: 'orphan-test', summary: 'x', observed: 'x', hypothesis: 'x',
      would_confirm: 'x', would_refute: 'x', severity: '低', created: '2026-10-06'
    }, { file: tmp });
    assert.ok(readFileSync(tmp, 'utf8').includes('orphan-test'));
    rmSync(dir, { recursive: true, force: true });
  });
  t('双时态：logged_at 缺则自动盖 / 自带保留；event_time 保留', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-test-'));
    const tmp = join(dir, '.tmp-time.jsonl');
    lib.appendRecord('orphan', {
      id: 'orphan-t1', summary: 'x', observed: 'x', hypothesis: 'x',
      would_confirm: 'x', would_refute: 'x', severity: '低', created: '2026-10-07'
    }, { file: tmp });
    lib.appendRecord('orphan', {
      id: 'orphan-t2', summary: 'x', observed: 'x', hypothesis: 'x',
      would_confirm: 'x', would_refute: 'x', severity: '低', created: '2026-10-07',
      logged_at: '2020-01-01T00:00:00.000Z', event_time: '2026-10-06'
    }, { file: tmp });
    const rows = readFileSync(tmp, 'utf8').trim().split(/\r?\n/).map(l => JSON.parse(l));
    assert.equal(rows.length, 2);
    assert.match(rows[0].logged_at, /^\d{4}-\d{2}-\d{2}T/, '缺则自动盖 ISO 戳');
    assert.equal(rows[1].logged_at, '2020-01-01T00:00:00.000Z', '自带 logged_at 保留');
    assert.equal(rows[1].event_time, '2026-10-06', 'event_time 原样保留');
    rmSync(dir, { recursive: true, force: true });
  });
  t('双时态：event_time / logged_at 非字符串被拒绝', () => {
    const base = { id: 'x', summary: 'x', observed: 'x', hypothesis: 'x', would_confirm: 'x', would_refute: 'x', severity: '低', created: '2026-10-07' };
    assert.ok(lib.validateRecord('orphan', { ...base, event_time: 123 }).some(e => e.includes('event_time')));
    assert.ok(lib.validateRecord('orphan', { ...base, logged_at: 5 }).some(e => e.includes('logged_at')));
  });
  t('audit：默认今天无警告（ok=true）', () => {
    const a = lib.audit();
    assert.equal(a.ok, true, JSON.stringify(a.findings));
    assert.equal(a.summary.frontier.total, lib.currentRecords(lib.loadStore('frontier').records).length, '审计摘要的 frontier 计数应与当前版本自洽');
  });
  t('audit：模拟 2027-06-01 → frontier 到期警告出现', () => {
    const a = lib.audit({ today: '2027-06-01' });
    assert.ok(a.findings.some(f => f.code === 'frontier-due'));
    assert.equal(a.ok, false);
  });
  t('brief：空查询给出提示、无分组', () => {
    const b = lib.brief('');
    assert.equal(b.groups.length, 0);
    assert.ok(b.note.length > 0);
  });
  t('brief：HippoRAG 命中前沿层且摘要带状态', () => {
    const b = lib.brief('HippoRAG');
    const g = b.groups.find(x => x.store === 'frontier');
    assert.ok(g && g.hits.length >= 1, JSON.stringify(b.groups));
    const hit = g.hits[0];
    assert.ok(hit.title.includes('HippoRAG') || String(hit.id).includes('hipporag'));
    assert.ok(['已实践', '已复现', '高引用', '待验证'].includes(hit.status));
  });
  t('brief：主题词「记忆」跨库取料（frontier ≥ 3）', () => {
    const b = lib.brief('记忆');
    const g = b.groups.find(x => x.store === 'frontier');
    assert.ok(g && g.total >= 3, JSON.stringify(b.groups.map(x => [x.store, x.total])));
  });
  t('lookup：多字词组经子词回退命中（原零命中场景）', () => {
    const hits = lib.lookup('记忆架构');
    assert.ok(hits.length > 0, '多字词组应命中');
  });
  t('brief：多词短语不再零命中（orphan-brief-phrase-miss 回归）', () => {
    const b = lib.brief('记忆架构 外部记忆 论文对标');
    const total = b.groups.reduce((n, g) => n + g.total, 0);
    assert.ok(total >= 5, '原零命中查询修复后应有多条命中，total=' + total);
  });
  t('cross：多字词组（子词回退）命中', () => {
    const c = lib.cross('记忆架构');
    assert.ok(c.total >= 3, 'total=' + c.total);
  });
  t('summary：全库摘要形状（六库计数 + 最近条目 + 审计 + frontier 状态分布）', () => {
    const s = lib.summary({ per: 2 });
    for (const name of lib.STORES) {
      assert.ok(s.stores[name] && typeof s.stores[name].total === 'number', name);
      assert.ok(Array.isArray(s.stores[name].recent) && s.stores[name].recent.length <= 2, name);
      assert.ok(s.stores[name].recent.every(r => r.id && typeof r.line === 'string' && (r.event_time === null || typeof r.event_time === 'string')), name);
    }
    assert.equal(typeof s.audit.ok, 'boolean');
    assert.ok(s.stores.frontier.by_status, 'frontier 应带状态分布');
    assert.ok(s.newest === null || typeof s.newest.ageText === 'string', JSON.stringify(s.newest));
  });
  t('show：按 id 直读（旧版本＝所查版本全文 + 链尾附注；不自动跳转）', () => {
    // 示例库自带一条修订链：canon-akasha-self → canon-akasha-self-r1（根 = 旧版本，链尾 = 当前版本）
    const tipNow = lib.currentRecords(lib.loadStore('canon').records).find(r => r.id.startsWith('canon-akasha-self'));
    assert.ok(tipNow, '示例库应含 canon-akasha-self 链尾');
    const root = lib.show('canon-akasha-self');
    assert.equal(root.found, false, '根 id 指向链尾而非当前版本');
    assert.equal(root.record.id, 'canon-akasha-self');
    assert.ok(String(root.note).includes(tipNow.id), '旧版本应指向当前链尾：' + root.note);
    assert.ok(String(root.note).includes('所查版本全文'), 'note 应明示内容＝所查版本全文：' + root.note);
    const live = lib.show(tipNow.id);
    assert.equal(live.found, true);
    assert.equal(live.store, 'canon');
    assert.equal(lib.show('no-such-id-xyz').found, false);
  });
  t('时间过滤：since/until 按 event_time||logged_at 过滤（无戳条目被排除）', () => {
    const all = lib.lookup('阿卡夏');
    assert.ok(all.length > 0);
    const since = lib.lookup('阿卡夏', { since: '2026-10-06' });
    assert.ok(since.length > 0 && since.length <= all.length, `since 过滤：${since.length}/${all.length}`);
    assert.equal(lib.lookup('阿卡夏', { until: '2020-01-01' }).length, 0, '极早 until → 无戳条目全被排除');
    const b = lib.brief('阿卡夏', { perStore: 5 });
    const g = b.groups[0];
    assert.ok(g.hits.every(h => h.time === null || /^\d{4}-\d{2}-\d{2}$/.test(h.time)), JSON.stringify(g.hits.map(h => [h.id, h.time])));
    const cAll = lib.cross('阿卡夏').total;
    const cSince = lib.cross('阿卡夏', { since: '2026-10-06' }).total;
    assert.ok(cSince <= cAll, `cross 过滤：${cSince}/${cAll}`);
  });
  t('情绪回写：valence/arousal 越界拒绝 + emotionBoost 纯函数', () => {
    const bad1 = lib.validateRecord('canon', { id: 'x', claim: 'c', valence: 3 });
    assert.ok(bad1.some(e => e.includes('valence')), JSON.stringify(bad1));
    const bad2 = lib.validateRecord('canon', { id: 'x', claim: 'c', arousal: 2 });
    assert.ok(bad2.some(e => e.includes('arousal')), JSON.stringify(bad2));
    assert.equal(lib.emotionBoost({ arousal: 1 }), 0.5);
    assert.equal(lib.emotionBoost({ valence: -1 }), 0.25);
    assert.equal(lib.emotionBoost({ valence: -0.5, arousal: 0.4 }), 0.45);
    assert.equal(lib.emotionBoost({}), 0);
  });
  t('镜像匹配：场景词命中 mirror-langlaile 且排第一；空查询空结果', () => {
    const hits = lib.mirrorMatch('虚构 危险 无人 相信');
    assert.ok(hits.length >= 1, JSON.stringify(hits));
    assert.equal(hits[0].id, 'mirror-langlaile', JSON.stringify(hits.map(h => [h.id, h.score])));
    assert.ok(hits[0].score >= 4, '分数下界：' + hits[0].score);
    assert.deepEqual(lib.mirrorMatch(''), []);
  });
  t('输出审计：真 id 入 ids、假 id 入 unknownIds、四标签计数', () => {
    const a = lib.auditText('按 记得·库内 的说法见 canon-akasha-usage；另有一个 canon-no-such-thing-xyz 不存在。');
    assert.ok(a.ids.includes('canon-akasha-usage'), JSON.stringify(a));
    assert.ok(a.unknownIds.includes('canon-no-such-thing-xyz'), JSON.stringify(a));
    assert.equal(a.tagged, 1);
    assert.deepEqual(lib.auditText('没有 id 的普通句子。'), { ids: [], unknownIds: [], tagged: 0 });
  });
  t('结果计数器：桩 log 计数正确 + since 过滤 + 真库修订链统计下界', () => {
    const tmp = join(SCRATCH, 'metrics-' + Date.now() + '.jsonl');
    writeFileSync(tmp, [
      JSON.stringify({ ts: '2026-10-07T01:00:00.000Z', kind: 'tool', tool: 'pwsh', ok: true }),
      JSON.stringify({ ts: '2026-10-07T01:01:00.000Z', kind: 'tool', tool: 'pwsh', ok: false }),
      JSON.stringify({ ts: '2026-10-07T01:02:00.000Z', kind: 'gate-denied' }),
      JSON.stringify({ ts: '2026-10-07T01:03:00.000Z', kind: 'usage', ids: ['canon-akasha-usage-r10'] }),
      JSON.stringify({ ts: '2026-10-07T01:04:00.000Z', kind: 'output-audit', unknown: ['x'] }),
      JSON.stringify({ ts: '2026-10-07T01:05:00.000Z', kind: 'tool', tool: 'mcp__akasha__akasha_brief', ok: true }),
      JSON.stringify({ ts: '2026-10-07T01:06:00.000Z', kind: 'tool', tool: 'mcp__akasha__akasha_session_lookup', ok: true })
    ].join('\n') + '\n', 'utf8');
    const m = lib.metrics({ log: tmp });
    assert.equal(m.counters.tools, 4);
    assert.equal(m.counters.toolErrors, 1);
    assert.equal(m.counters.denials, 1);
    assert.equal(m.counters.outputAudits, 1);
    assert.equal(m.counters.usageRefs, 1);
    assert.equal(m.memoryTools.calls, 2, '记忆工具（MCP 面）计数：' + JSON.stringify(m.memoryTools));
    assert.equal(m.memoryTools.byTool['mcp__akasha__akasha_brief'], 1);
    assert.ok(m.memoryTools.share > 0 && m.memoryTools.share <= 1, JSON.stringify(m.memoryTools));
    assert.equal(m.topToolErrors[0][0], 'pwsh');
    assert.equal(m.topUsage[0][0], 'canon-akasha-usage-r10');
    assert.equal(lib.metrics({ log: tmp, since: '2027-01-01' }).counters.tools, 0);
    const real = lib.metrics();
    assert.ok(real.revisions.count >= 1, '真库修订链 >= 1');
    assert.ok(real.revisions.longest >= 2, '最长链 >= 2');
    rmSync(tmp, { force: true });
  });
  t('kit：history（负价条目）字段形状', () => {
    const k = lib.kit();
    assert.ok(Array.isArray(k.history), 'history 数组');
    assert.ok(k.history.length >= 1, '真库存在负价条目（pricing）');
    assert.ok(k.history.every(h => h.valence < 0 && typeof h.arousal === 'number'), JSON.stringify(k.history));
  });
  t('kit：起床包形状（协议/库况/审计/提示）', () => {
    const k = lib.kit();
    assert.ok(k.protocol.includes('来源态'), k.protocol);
    assert.equal(k.library.canon, lib.stats().canon.total);
    assert.equal(typeof k.review.ok, 'boolean');
    assert.ok(Array.isArray(k.hints) && k.hints.length >= 1, JSON.stringify(k.hints));
    assert.equal(typeof k.library.frontier_by_status, 'object');
  });
  t('kit：可注入 stateFile / inboxFile（桩数据）', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-test-'));
    const sf = join(dir, 'state.json');
    const ib = join(dir, 'inbox.jsonl');
    writeFileSync(sf, JSON.stringify({ lastRunAt: '2026-10-07T00:00:00Z', lastTrigger: 'activate', lastTodo: 2, lastAudit: 'ok', lastReport: 'sleep-x.json', lastCounters: { lines: 3 } }), 'utf8');
    writeFileSync(ib, JSON.stringify({ ts: 'x', kind: 'todo', fromReport: 'r', items: [{ kind: 'orphan-candidate', code: 'tool-error' }, { kind: 'review', code: 'frontier-due' }] }) + '\n', 'utf8');
    const k = lib.kit({ stateFile: sf, inboxFile: ib });
    assert.equal(k.sleep.todo, 2);
    assert.equal(k.inbox.totalItems, 2);
    assert.equal(k.inbox.latest[0].code, 'tool-error');
    rmSync(dir, { recursive: true, force: true });
  });
  t('promote：候选转正（tmp 库）幂等 + dry-run 不写', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-test-'));
    const ib = join(dir, 'inbox.jsonl');
    const sf = join(dir, 'orphan.jsonl');
    writeFileSync(ib, JSON.stringify({
      ts: 'x', kind: 'todo', items: [
        { kind: 'orphan-candidate', code: 'tool-error', count: 2, note: '工具失败 pwsh: boom', samples: ['a', 'b'] },
        { kind: 'orphan-candidate', code: 'gate-denied', count: 1, note: '被门控拦截' },
        { kind: 'review', code: 'frontier-due', count: 3 }
      ]
    }) + '\n', 'utf8');
    const dry = lib.promoteInbox({ inboxFile: ib, storeFile: sf, dry: true });
    assert.equal(dry.wouldPromote.length, 2, JSON.stringify(dry));
    assert.equal(lib.loadStore('orphan', sf).records.length, 0, 'dry-run 不得写库');
    const r1 = lib.promoteInbox({ inboxFile: ib, storeFile: sf });
    assert.equal(r1.promoted.length, 2, JSON.stringify(r1));
    assert.ok(r1.promoted.every((id) => id.startsWith('orphan-b')));
    const r2 = lib.promoteInbox({ inboxFile: ib, storeFile: sf });
    assert.equal(r2.promoted.length, 0);
    assert.equal(r2.skipped.length, 2, '幂等：二跑全跳过');
    const stored = lib.loadStore('orphan', sf).records;
    assert.equal(stored.length, 2);
    assert.ok(stored.every((rec) => lib.validateRecord('orphan', rec).length === 0), JSON.stringify(stored));
    rmSync(dir, { recursive: true, force: true });
  });
  t('inbox 消费记账：promote 落 consumed、kit 只计未消费批次', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-test-'));
    const ib = join(dir, 'inbox.jsonl');
    const sf = join(dir, 'orphan.jsonl');
    writeFileSync(ib, [
      JSON.stringify({ ts: 'x', kind: 'todo', items: [{ kind: 'orphan-candidate', code: 'tool-error', count: 1, samples: ['a'] }] }),
      JSON.stringify({ ts: 'x', kind: 'todo', items: [{ kind: 'orphan-candidate', code: 'gate-denied', count: 1 }] })
    ].join('\n') + '\n', 'utf8');
    assert.equal(lib.kit({ inboxFile: ib, stateFile: join(dir, 'none.json') }).inbox.totalItems, 2, '消费前：全批次计入');
    const r = lib.promoteInbox({ inboxFile: ib, storeFile: sf });
    assert.equal(r.promoted.length, 2, JSON.stringify(r));
    assert.equal(r.consumed, true, 'promote 应落消费记账');
    const k2 = lib.kit({ inboxFile: ib, stateFile: join(dir, 'none.json') });
    assert.equal(k2.inbox.totalItems, 0, '消费后：历史批次不再计入');
    assert.equal(k2.inbox.batches, 0, '消费后：未消费批次数归零');
    const tail = JSON.parse(readFileSync(ib, 'utf8').trim().split(/\r?\n/).pop());
    assert.equal(tail.kind, 'consumed');
    assert.equal(tail.count, 2);
    assert.equal(tail.upTo, 2, 'upTo=消费时读入的行数');
    appendFileSync(ib, JSON.stringify({ ts: 'y', kind: 'todo', items: [{ kind: 'orphan-candidate', code: 'agent-error', count: 1 }] }) + '\n', 'utf8');
    const k3 = lib.kit({ inboxFile: ib, stateFile: join(dir, 'none.json') });
    assert.equal(k3.inbox.totalItems, 1, '新批次重新计入');
    const r3 = lib.promoteInbox({ inboxFile: ib, storeFile: sf });
    assert.equal(r3.promoted.length, 1, '新候选照常转正');
    assert.equal(lib.kit({ inboxFile: ib, stateFile: join(dir, 'none.json') }).inbox.totalItems, 0, '再次消费后归零');
    // dry 只读不改：dry 复检不得落消费记账（否则「已转正、待复核」的批次会被一次 dry 静默抹掉）
    const beforeDry = readFileSync(ib, 'utf8');
    const rd = lib.promoteInbox({ inboxFile: ib, storeFile: sf, dry: true });
    assert.equal(rd.dry, true);
    assert.equal(readFileSync(ib, 'utf8'), beforeDry, 'dry 不得改写 inbox');
    assert.equal(lib.kit({ inboxFile: ib, stateFile: join(dir, 'none.json') }).inbox.totalItems, 0, 'dry 后计数不变');
    rmSync(dir, { recursive: true, force: true });
  });
  t('修订链：currentRecords 只留链尾', () => {
    const base = { id: 'a' };
    const r1 = { id: 'a-r1', supersedes: 'a' };
    const r2 = { id: 'a-r2', supersedes: 'a-r1' };
    assert.deepEqual(lib.currentRecords([base, r1, r2]).map((r) => r.id), ['a-r2']);
    assert.deepEqual(lib.currentRecords([base, { id: 'b' }]).map((r) => r.id), ['a', 'b']);
  });
  t('修订链：checkSupersedes 抓悬空引用', () => {
    const errs = lib.checkSupersedes('canon', [{ id: 'x', supersedes: 'ghost' }]);
    assert.equal(errs.length, 1);
    assert.equal(lib.checkSupersedes('canon', [{ id: 'x', supersedes: 'y' }, { id: 'y' }]).length, 0);
  });
  t('修订链：revise 逐版追加（tmp 库，任意起点落到链尾）', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-test-'));
    const sf = join(dir, 'canon.jsonl');
    lib.appendRecord('canon', { id: 'canon-x', claim: 'v0', source: { type: '复现', ref: 'r' }, last_reviewed: '2026-10-06' }, { file: sf });
    const a = lib.revise('canon', 'canon-x', { claim: 'v1' }, { storeFile: sf });
    assert.equal(a.id, 'canon-x-r1');
    const b = lib.revise('canon', 'canon-x', { claim: 'v2' }, { storeFile: sf });
    assert.equal(b.id, 'canon-x-r2', '从任意版本出发都落到链尾的下一版');
    assert.equal(b.supersedes, 'canon-x-r1');
    const cur = lib.currentRecords(lib.loadStore('canon', sf).records);
    assert.equal(cur.length, 1);
    assert.equal(cur[0].claim, 'v2');
    assert.equal(cur[0].source.ref, 'r', '未打补丁的字段应保留');
    rmSync(dir, { recursive: true, force: true });
  });
  t('计分：记录级口径——多 token 弱回退叠加不得越过 1（round 2 复查捕获）', () => {
    const hay = '重启重启重启重启记忆记忆记忆记忆';
    const p = lib.matchParts(hay, '重启甲');
    assert.equal(p.whole, 0, JSON.stringify(p));
    assert.ok(p.fb > 0, JSON.stringify(p));
    const s = lib.scoreTokens(hay, ['重启甲', '记忆乙']);
    assert.equal(s.whole, 0);
    assert.ok(s.score < 1, '无整词命中时记录分必须 <1：' + JSON.stringify(s));
    const w = lib.scoreTokens('重启甲 出现整词', ['重启甲']);
    assert.ok(w.score >= 1, JSON.stringify(w));
  });
  t('修订链：revise 刷新 logged_at（不继承旧版；显式自带保留）', () => {
    const dir = mkdtempSync(join(SCRATCH, 'akasha-test-'));
    const sf = join(dir, 'canon.jsonl');
    lib.appendRecord('canon', { id: 'canon-t', claim: 'v0', source: { type: '复现', ref: 'r' }, last_reviewed: '2026-10-06', logged_at: '2020-01-01T00:00:00.000Z' }, { file: sf });
    lib.revise('canon', 'canon-t', { claim: 'v1' }, { storeFile: sf });
    const r1 = lib.loadStore('canon', sf).records.find((x) => x.id === 'canon-t-r1');
    assert.notEqual(r1.logged_at, '2020-01-01T00:00:00.000Z', '修订版应盖新戳（不继承旧版）');
    assert.match(r1.logged_at, /^\d{4}-\d{2}-\d{2}T/, r1.logged_at);
    lib.revise('canon', 'canon-t', { claim: 'v2', logged_at: '2021-02-02T00:00:00.000Z' }, { storeFile: sf });
    const r2 = lib.loadStore('canon', sf).records.find((x) => x.id === 'canon-t-r2');
    assert.equal(r2.logged_at, '2021-02-02T00:00:00.000Z', '显式自带 logged_at 保留');
    rmSync(dir, { recursive: true, force: true });
  });
  t('cross：对位比较（分组 + 同题多源提示 + perStore 截断）', () => {
    const c = lib.cross('记忆');
    assert.ok(c.groups.length >= 2, JSON.stringify(c.groups.map((g) => [g.store, g.total])));
    assert.ok(c.total >= 2, 'total=' + c.total);
    assert.ok(c.groups.every((g) => g.items.every((i) => typeof i.id === 'string' && typeof i.line === 'string' && i.line.length > 0)), JSON.stringify(c.groups));
    const cM = lib.cross('示例');
    assert.ok(cM.groups.some((g) => g.total >= 2), JSON.stringify(cM.groups.map((g) => [g.store, g.total])));
    assert.ok(typeof cM.hint === 'string' && cM.hint.includes('对位'), 'multi-source hint: ' + cM.hint);
    const c2 = lib.cross('示例', { perStore: 1 });
    assert.ok(c2.groups.every((g) => g.items.length <= 1), JSON.stringify(c2.groups.map((g) => [g.store, g.items.length])));
    const c3 = lib.cross('');
    assert.equal(c3.total, 0);
    assert.ok(c3.hint.includes('主题词'), c3.hint);
  });
  t('pulse / ageText：库脉搏快照与相对时间', () => {
    const p = lib.pulse();
    for (const name of lib.STORES) {
      assert.ok(p.stores[name] && typeof p.stores[name].current === 'number' && typeof p.stores[name].count === 'number', name);
    }
    assert.ok(p.newest && p.newest.store && typeof p.newest.ageMs === 'number', JSON.stringify(p.newest));
    assert.equal(lib.ageText(30 * 1000), '刚刚');
    assert.equal(lib.ageText(5 * 60000), '5 分钟前');
    assert.equal(lib.ageText(3 * 3600000), '3 小时前');
    assert.equal(lib.ageText(3 * 86400000), '3 天前');
    assert.equal(lib.ageText(null), '未知');
  });
  if (sleepMod) {
    t('sleep：纯函数（distillHooks / buildTodos / shouldSleep / renderContextLine）', () => {
      const lines = [
        JSON.stringify({ kind: 'tool', tool: 'pwsh', ok: false, message: 'boom' }),
        JSON.stringify({ kind: 'turn-end' }),
        JSON.stringify({ kind: 'gate-denied' }),
        'not json'
      ];
      const { counters, notes } = sleepMod.distillHooks(lines);
      assert.equal(counters.lines, 3, '只有可解析记录计数');
      assert.equal(counters.toolErrors, 1);
      assert.equal(counters.denials, 1);
      assert.equal(counters.turns, 1);
      assert.equal(notes.length, 1);
      const todos = sleepMod.buildTodos({ toolErrors: 1, denials: 0, agentErrors: 0 }, ['x'], { ok: false, findings: [{ level: 'warn', code: 'frontier-due', count: 2 }] });
      assert.equal(todos.length, 2);
      assert.equal(todos[0].kind, 'review');
      assert.equal(todos[1].kind, 'orphan-candidate');
      assert.equal(sleepMod.shouldSleep({}, Date.now(), 6).due, true, '无记录 → 该睡');
      assert.equal(sleepMod.shouldSleep({ lastRunAt: new Date().toISOString() }, Date.now(), 6).due, false, '<6h → 不睡');
      assert.equal(sleepMod.shouldSleep({ lastRunAt: new Date(Date.now() - 7 * 3600000).toISOString() }, Date.now(), 6).due, true, '>6h → 该睡');
      assert.ok(sleepMod.renderContextLine({ lastRunAt: 'x', lastAudit: 'ok', lastCounters: {}, lastTodo: 0 }).includes('阿卡夏·睡眠'));
      assert.equal(sleepMod.renderPulseLine(null), null);
    });
    t('sleep：sleepRun 集成（报告 / 水位线 / inbox / 幂等 / dry 零写）', () => {
      const dir = mkdtempSync(join(SCRATCH, 'akasha-sleep-'));
      const logPath = join(dir, 'hooks.jsonl');
      const statePath = join(dir, 'sleep-state.json');
      const inboxPath = join(dir, 'inbox.jsonl');
      const reportDir = join(dir, 'logs');
      appendFileSync(logPath, JSON.stringify({ kind: 'tool', tool: 't', ok: false, message: 'x' }) + '\n' + JSON.stringify({ kind: 'gate-denied' }) + '\n', 'utf8');
      const dry = sleepMod.sleepRun({ trigger: 'manual', log: logPath, stateFile: statePath, inboxFile: inboxPath, reportDir, dry: true });
      assert.equal(dry.ok, true);
      assert.equal(dry.report.counters.lines, 2);
      assert.ok(!existsSync(statePath), 'dry 不写状态');
      const run = sleepMod.sleepRun({ trigger: 'manual', log: logPath, stateFile: statePath, inboxFile: inboxPath, reportDir });
      assert.equal(run.ok, true);
      assert.equal(run.processedTo, 2);
      assert.ok(run.todo >= 2, '工具失败 + 门控拦截 → 至少两条待办：' + run.todo);
      assert.ok(existsSync(join(reportDir, run.reportFile)), '报告生成：' + run.reportFile);
      const state = JSON.parse(readFileSync(statePath, 'utf8'));
      assert.equal(state.processedLines, 2);
      assert.equal(state.lastTrigger, 'manual');
      assert.ok(existsSync(inboxPath), '有待办写 inbox');
      const second = sleepMod.sleepRun({ trigger: 'manual', log: logPath, stateFile: statePath, inboxFile: inboxPath, reportDir });
      assert.equal(second.processedFrom, 2, '二跑从水位线续');
      assert.equal(second.processedTo, 2, '二跑不重复处理');
      rmSync(dir, { recursive: true, force: true });
    });
  }
  if (sessionMod) {
    t('session：多帧 zstd 读取 + 单帧 + 坏容器抛错', () => {
      const dir = mkdtempSync(join(SCRATCH, 'akasha-ses-'));
      const l1 = '{"type":"a","seq":1}\n', l2 = '{"type":"b","seq":2}\n';
      const multi = join(dir, 'multi.jsonl.zstd');
      writeFileSync(multi, Buffer.concat([zstdCompressSync(Buffer.from(l1)), zstdCompressSync(Buffer.from(l2))]));
      const r = sessionMod.readSessionArchive(multi);
      assert.equal(r.text, l1 + l2);
      assert.equal(r.frames, 2);
      const single = join(dir, 'single.jsonl.zstd');
      writeFileSync(single, zstdCompressSync(Buffer.from(l1)));
      assert.equal(sessionMod.readSessionArchive(single).text, l1);
      const bad = join(dir, 'bad.zstd');
      writeFileSync(bad, Buffer.from('not zstd'));
      assert.throws(() => sessionMod.readSessionArchive(bad));
      rmSync(dir, { recursive: true, force: true });
    });
    t('session：extractSegments 四类 + 配对 + 关键词 + 截断', () => {
      const pid = 'A:\\x\\file.txt';
      const records = [
        { seq: 1, time: 1791312000000, type: 'user/message', data: { content: [{ type: 'text', text: '帮我看看「开源包」的依赖' }] } },
        { seq: 2, time: 1791312001000, type: 'assistant/message', data: { turn: 1, step: 1, message: { role: 'assistant', content: [
          { type: 'reasoning', text: '先读 ' + pid + '。\n第二行' },
          { type: 'text', text: '结论：依赖清单在这个文件里。' } ] } } },
        { seq: 3, time: 1791312002000, type: 'tool/call', data: { turn: 1, step: 1, callId: 'c1', name: 'read', arguments: '{"filePath":"' + pid + '"}' } },
        { seq: 4, time: 1791312003000, type: 'tool/result', data: { turn: 1, step: 1, toolCallId: 'c1', content: [{ type: 'text', text: 'file contents here' }] } }
      ];
      const segs = sessionMod.extractSegments(records, { session: 's-demo' });
      assert.deepEqual(segs.map(s => s.kind), ['intent', 'conclusion', 'process', 'action']);
      const act = segs[3];
      assert.deepEqual(act.tools, ['read']);
      assert.equal(act.ptr.callSeq, 3);
      assert.ok(act.why.includes('先读'), act.why);
      assert.ok(act.keywords.includes('read'), JSON.stringify(act.keywords));
      assert.ok(act.keywords.some(k => k.includes('A:\\x')), JSON.stringify(act.keywords));
      assert.ok(segs[2].gist.length <= 200, 'process gist 截断');
      assert.ok(segs.every(s => s.id.startsWith('seg-s-demo-')));
      assert.equal(segs[1].ptr.seq, 2, 'conclusion 带原档指针');
      assert.equal(segs[0].ptr.seq, 1, 'intent 带原档指针');
      assert.deepEqual(sessionMod.extractSegments([], { session: 'x' }), []);
    });
    t('session：索引幂等 + 增量 + 去重 + 坏行容错 + meta', () => {
      const dir = mkdtempSync(join(SCRATCH, 'akasha-ses-'));
      const fx = join(dir, 'fx.jsonl.zstd'), store = join(dir, 'session.jsonl'), meta = join(dir, 'meta.json');
      const mk = (seqs) => Buffer.from(seqs.map(seq => JSON.stringify({ seq, time: 1791312000000 + seq * 1000, type: 'user/message', data: { content: [{ type: 'text', text: '第' + seq + '条 「词' + seq + '」' }] } })).join('\n') + '\n');
      writeFileSync(fx, zstdCompressSync(mk([1, 2])));
      const r1 = sessionMod.indexSession({ file: fx, session: 's1', storeFile: store, metaFile: meta });
      assert.equal(r1.added, 2);
      assert.equal(r1.frameFails, 0);
      assert.equal(sessionMod.indexSession({ file: fx, session: 's1', storeFile: store, metaFile: meta }).added, 0, '二跑幂等');
      appendFileSync(fx, zstdCompressSync(mk([3])));
      assert.equal(sessionMod.indexSession({ file: fx, session: 's1', storeFile: store, metaFile: meta }).added, 1, '增量只收新帧');
      const firstSegId = JSON.parse(readFileSync(store, 'utf8').trim().split(/\r?\n/)[0]).id;
      appendFileSync(store, JSON.stringify({ id: firstSegId, store: 'session', session: 's1', seq: 1, kind: 'intent', gist: '种入重复', keywords: [], tools: [], ptr: {}, logged_at: 'x' }) + '\n');
      const r4 = sessionMod.indexSession({ file: fx, session: 's1', storeFile: store, metaFile: meta, full: true });
      assert.equal(r4.added, 0, '--full 重扫：重复 id 不得再增');
      assert.ok(r4.skipped >= 1, '重复 id 进 skipped：' + r4.skipped);
      appendFileSync(fx, zstdCompressSync(Buffer.from('{坏行\n')));
      const r5 = sessionMod.indexSession({ file: fx, session: 's1', storeFile: store, metaFile: meta });
      assert.ok(r5.parseFails >= 1, '坏行只计数不抛：' + r5.parseFails);
      const m = JSON.parse(readFileSync(meta, 'utf8'));
      assert.equal(m.sessions.s1.segments, 3, '唯一段数（重复 id 不重计）');
      assert.equal(m.sessions.s1.lastSeq, 3);
      rmSync(dir, { recursive: true, force: true });
    });
    t('session：lookupSegments 结论优先 + 默认排除 process + kind 过滤', () => {
      const dir = mkdtempSync(join(SCRATCH, 'akasha-ses-'));
      const store = join(dir, 'session.jsonl');
      sessionMod.appendSegments(store, sessionMod.extractSegments([
        { seq: 1, time: 1791312000000, type: 'user/message', data: { content: [{ type: 'text', text: '请查「葡萄熟了」' }] } },
        { seq: 2, time: 1791312001000, type: 'assistant/message', data: { turn: 1, step: 1, message: { role: 'assistant', content: [
          { type: 'reasoning', text: '关于葡萄熟了我想想' },
          { type: 'text', text: '结论：葡萄熟了，可以采摘了。' } ] } } }
      ], { session: 's-look' }));
      const all = sessionMod.lookupSegments('葡萄熟了', { storeFile: store });
      assert.ok(all.length >= 2, JSON.stringify(all.map(h => [h.id, h.score, h.kind])));
      assert.equal(all[0].kind, 'conclusion', '结论优先：' + JSON.stringify(all.map(h => h.kind)));
      assert.ok(all.every(h => h.kind !== 'process'), '默认排除 process');
      const withP = sessionMod.lookupSegments('葡萄熟了', { storeFile: store, includeProcess: true });
      assert.ok(withP.some(h => h.kind === 'process'), JSON.stringify(withP.map(h => h.kind)));
      const onlyIntent = sessionMod.lookupSegments('葡萄熟了', { storeFile: store, kind: 'intent' });
      assert.ok(onlyIntent.length >= 1 && onlyIntent.every(h => h.kind === 'intent'));
      assert.deepEqual(sessionMod.lookupSegments('   ', { storeFile: store }), []);
      const weak = sessionMod.lookupSegments('蒸蒸日上的葡萄', { storeFile: store });
      assert.ok(weak.length >= 1, JSON.stringify(weak.map(h => h.score)));
      assert.ok(weak.every(h => h.score < 1), '弱命中必须显示 <1（结论加成只进排序权重）：' + JSON.stringify(weak.map(h => h.score)));
      rmSync(dir, { recursive: true, force: true });
    });
    t('session：renderSessionContext ≤budget 且含段数与命令提示', () => {
      const dir = mkdtempSync(join(SCRATCH, 'akasha-ses-'));
      const store = join(dir, 'session.jsonl');
      sessionMod.appendSegments(store, sessionMod.extractSegments([
        { seq: 1, time: 1791312000000, type: 'user/message', data: { content: [{ type: 'text', text: '主题甲' }] } },
        { seq: 2, time: 1791312001000, type: 'assistant/message', data: { turn: 1, step: 1, message: { role: 'assistant', content: [{ type: 'text', text: '结论甲：就这样定。' }] } } }
      ], { session: 's-ctx' }));
      const s = sessionMod.renderSessionContext({ storeFile: store, session: 's-ctx', budget: 200 });
      assert.ok(s.length <= 200, 'budget 截断：' + s.length);
      assert.ok(s.includes('段'), s);
      assert.ok(s.includes('结论'), s);
      assert.ok(s.includes('session lookup'), s);
      rmSync(dir, { recursive: true, force: true });
    });
    t('session：损坏帧容错（截断末帧不炸 → frameFails 计数）', () => {
      const dir = mkdtempSync(join(SCRATCH, 'akasha-ses-'));
      const l1 = '{"type":"a","seq":1}\n', l2 = '{"type":"b","seq":2}\n';
      const f1 = zstdCompressSync(Buffer.from(l1)), f2 = zstdCompressSync(Buffer.from(l2));
      const torn = join(dir, 'torn.jsonl.zstd');
      writeFileSync(torn, Buffer.concat([f1, f2.subarray(0, f2.length - 3)]));
      const r = sessionMod.readSessionArchive(torn);
      const lines = r.text.split('\n').filter(Boolean);
      assert.equal(lines[0], l1.trim(), '可用帧照读（首行 = 完整帧内容）');
      // 2026-10-07 实测：Node v24.19.0 的 zstdDecompressSync 对「末尾截断帧」**不抛错**，
      // 直接返回部分解压字节（含半条 JSON 行）——故 frameFails 测不到它；
      // 改以「文本完整性」判定：末行非空且非 JSON ⇒ frameTruncated=1（下游按 parseFails 丢弃半行）。
      assert.ok(lines.length >= 1, '至少读出可用帧：' + JSON.stringify(lines));
      assert.equal(r.frameTruncated, 1, '截断帧的文本完整性信号：' + r.frameTruncated);
      assert.ok(r.frameFails >= 0, '截断帧计数（不抛错时为 0，属运行时行为）：' + r.frameFails);
      rmSync(dir, { recursive: true, force: true });
    });
    t('session：档案重写漂移 → 新内容可入（指纹 id）、旧段保留', () => {
      const dir = mkdtempSync(join(SCRATCH, 'akasha-ses-'));
      const fx = join(dir, 'fx.jsonl.zstd'), store = join(dir, 'session.jsonl'), meta = join(dir, 'meta.json');
      const mk = (text) => Buffer.from(JSON.stringify({ seq: 1, time: 1791312000000, type: 'user/message', data: { content: [{ type: 'text', text }] } }) + '\n');
      writeFileSync(fx, zstdCompressSync(mk('旧版本内容')));
      const r1 = sessionMod.indexSession({ file: fx, session: 's2', storeFile: store, metaFile: meta });
      assert.equal(r1.added, 1);
      writeFileSync(fx, zstdCompressSync(mk('新版本内容')));
      const r2 = sessionMod.indexSession({ file: fx, session: 's2', storeFile: store, metaFile: meta, full: true });
      assert.equal(r2.added, 1, '漂移：新内容应追加');
      const raw = readFileSync(store, 'utf8');
      assert.ok(raw.includes('新版本内容'), '新文本入库');
      assert.ok(raw.includes('旧版本内容'), '旧段保留（append-only）');
      rmSync(dir, { recursive: true, force: true });
    });
    t('session：resolveSessionFile 按会话 id 找档案', () => {
      const root = mkdtempSync(join(SCRATCH, 'akasha-ses-'));
      const sDir = join(root, '--W--', 'session-abc12345');
      mkdirSync(sDir, { recursive: true });
      writeFileSync(join(sDir, 'session.v4.jsonl.zstd'), Buffer.from('x'));
      assert.equal(sessionMod.resolveSessionFile(root, 'abc12345'), join(sDir, 'session.v4.jsonl.zstd'));
      assert.equal(sessionMod.resolveSessionFile(root, 'session-abc12345'), join(sDir, 'session.v4.jsonl.zstd'), '前缀形态应可解析');
      assert.equal(sessionMod.resolveSessionFile(root, 'nope'), null);
      rmSync(root, { recursive: true, force: true });
    });
    t('session：buildTree 切块 + 指纹幂等 + 节点入库/代际 + 跨层检索', () => {
      const dir = mkdtempSync(join(SCRATCH, 'akasha-ses-'));
      const store = join(dir, 'session.jsonl');
      const segs = [];
      let seq = 0;
      for (let turn = 1; turn <= 6; turn += 1) {
        for (const [kind, text] of [['intent', '意图' + turn], ['conclusion', '详'.repeat(220) + '，结论-' + String.fromCharCode(64 + turn)], ['action', '动作' + turn + 'a'], ['action', '动作' + turn + 'b']]) {
          seq += 1;
          segs.push({ id: `seg-sT-${seq}`, store: 'session', session: 'sT', seq, time: new Date(1791312000000 + seq * 1000).toISOString(), turn, step: 1, kind, gist: text, keywords: [], tools: [], ptr: {}, logged_at: 'x' });
        }
      }
      sessionMod.appendSegments(store, segs);
      const r1 = sessionMod.buildTree({ session: 'sT', storeFile: store, chunkTurns: 2, fanout: 4 });
      const l1 = r1.nodes.filter((n) => n.level === 1);
      const l2 = r1.nodes.filter((n) => n.level === 2);
      assert.equal(l1.length, 3, 'L1 三块：' + JSON.stringify(r1.nodes.map((n) => [n.id, n.level])));
      assert.equal(l2.length, 1);
      assert.equal(l1[0].children.length, 8, '每块 2 turn × 4 段');
      assert.ok(l1[0].gist.includes('结论-A'), l1[0].gist);
      assert.ok(l1[0].id.startsWith('node-sT-L1-'), l1[0].id);
      assert.ok(l2[0].children.length === 3 && l2[0].children.every((c) => c.startsWith('node-')), JSON.stringify(l2[0].children));
      assert.ok(!l1[1].gist.includes('结论-D'), 'gist 截断后不应含后段标签：' + l1[1].gist.slice(-40));
      assert.ok(l1[1].extra.includes('结论-D'), 'extra（评分扩面）应含全块结论');
      const r2 = sessionMod.buildTree({ session: 'sT', storeFile: store, chunkTurns: 2, fanout: 4 });
      assert.deepEqual(r2.nodes.map((n) => n.id), r1.nodes.map((n) => n.id), '指纹幂等');
      sessionMod.appendNodes(store, r1.nodes, r1.treegen);
      assert.equal(sessionMod.latestNodes(store, 'sT').length, 4);
      seq += 1;
      sessionMod.appendSegments(store, [{ id: 'seg-sT-99', store: 'session', session: 'sT', seq: 99, time: new Date(1791312000990000).toISOString(), turn: 7, step: 1, kind: 'conclusion', gist: '结论-G', keywords: [], tools: [], ptr: {}, logged_at: 'x' }]);
      const r3 = sessionMod.buildTree({ session: 'sT', storeFile: store, chunkTurns: 2, fanout: 4 });
      sessionMod.appendNodes(store, r3.nodes, r3.treegen);
      assert.ok(r3.treegen >= r1.treegen);
      const latest3 = sessionMod.latestNodes(store, 'sT');
      assert.equal(latest3.filter((n) => n.level === 1).length, 4, 'L1 变四块');
      const allNodeRecs = lib.loadStore('session', store).records.filter((x) => x.kind === 'node');
      assert.equal(allNodeRecs.length, 4 + r3.nodes.length, '旧代留档（append-only）');
      const hitN = sessionMod.lookupSegments('结论-A', { storeFile: store, level: 'nodes' });
      assert.ok(hitN.length >= 1 && hitN.every((h) => h.kind === 'node'), JSON.stringify(hitN.map((h) => [h.kind, h.id])));
      const hitAll = sessionMod.lookupSegments('结论-A', { storeFile: store });
      assert.ok(hitAll.some((h) => h.kind === 'node'), '默认纳入节点');
      assert.ok(hitAll.some((h) => h.kind !== 'node'), '段仍在默认集合');
      const hitD = sessionMod.lookupSegments('结论-D', { storeFile: store, level: 'nodes' });
      assert.ok(hitD.length >= 1, 'extra 入评分 hay（节点入库后）：' + JSON.stringify(hitD.map((h) => h.id)));
      rmSync(dir, { recursive: true, force: true });
    });
    t('session：loopWatchStats 汇总（phase/type/session 计数 + 修复前/后分组 + 坏行容忍 + 最近摘录）', () => {
      const recs = [
        { kind: 'loop-watch', ts: '2026-10-07T01:00:00Z', phase: 'stream', session: 'a1', turn: 1, stream: 'reasoning', hit: { type: 'exact', excerpt: 'x'.repeat(80) } },
        { kind: 'loop-watch', ts: '2026-10-07T01:01:00Z', phase: 'turn', session: 'a1', turn: 1, stream: 'reasoning', hit: { type: 'variant', excerpt: 'y' } },
        { kind: 'loop-watch', ts: '2026-10-07T01:02:00Z', phase: 'stream', session: 'b2', turn: 2, stream: 'text', hit: { type: 'punct', excerpt: 'z' } },
        { kind: 'loop-watch', ts: '2026-10-07T12:00:00Z', phase: 'stream', session: 'a1', turn: 3, stream: 'text', hit: { type: 'exact', excerpt: 'later' } },
        { kind: 'loop-watch-probe', session: 'a1', type: 'x-delta' },
        { kind: 'session-index', session: 'a1' },
        null
      ];
      const s = sessionMod.loopWatchStats(recs);
      assert.equal(s.total, 4);
      assert.equal(s.hitsPreFix, 3, '修复前=' + s.hitsPreFix);
      assert.equal(s.hitsPostFix, 1, '修复后=' + s.hitsPostFix);
      assert.equal(s.byPhase.stream, 3);
      assert.equal(s.byPhase.turn, 1);
      assert.equal(s.byType.exact, 2);
      assert.equal(s.bySession.a1, 3);
      assert.equal(s.probes, 1);
      assert.equal(s.recent.length, 4);
      assert.ok(s.recent[0].excerpt.length <= 60, '摘录截断');
      const since = sessionMod.loopWatchStats(recs, { since: '2026-10-08' });
      assert.equal(since.total, 0);
    });
    t('session：跨会话节点检索（无 --session 各会话各取最新代）', () => {
      const dir = mkdtempSync(join(SCRATCH, 'akasha-ses-'));
      const store = join(dir, 'session.jsonl');
      const mk = (sid, seq0, text) => ({ id: `seg-${sid}-${seq0}`, store: 'session', session: sid, seq: seq0, time: new Date(1791312000000 + seq0 * 1000).toISOString(), turn: 1, step: 1, kind: 'conclusion', gist: text, keywords: [], tools: [], ptr: {}, logged_at: 'x' });
      sessionMod.appendSegments(store, [mk('sA', 1, '甲会话要点'), mk('sB', 2, '乙会话要点')]);
      const ta = sessionMod.buildTree({ session: 'sA', storeFile: store });
      sessionMod.appendNodes(store, ta.nodes, ta.treegen);
      const tb = sessionMod.buildTree({ session: 'sB', storeFile: store });
      sessionMod.appendNodes(store, tb.nodes, tb.treegen);
      assert.ok(tb.treegen > ta.treegen, 'sB 代应更大（构造前提）');
      const hitA = sessionMod.lookupSegments('甲会话要点', { storeFile: store, level: 'nodes' });
      assert.ok(hitA.some((h) => h.session === 'sA'), '无 --session 也应命中较旧代的 sA 节点：' + JSON.stringify(hitA.map((h) => h.session)));
      const hitB = sessionMod.lookupSegments('乙会话要点', { storeFile: store, level: 'nodes' });
      assert.ok(hitB.some((h) => h.session === 'sB'));
      const scoped = sessionMod.lookupSegments('甲会话要点', { storeFile: store, level: 'nodes', session: 'sA' });
      assert.ok(scoped.length >= 1 && scoped.every((h) => h.session === 'sA'));
      rmSync(dir, { recursive: true, force: true });
    });
  }
}

// ---- 2. CLI
function cli(args) {
  return spawnSync(process.execPath, [join(ROOT, 'akasha.mjs'), ...args], { cwd: ROOT, encoding: 'utf8' });
}
t('CLI：check 通过（exit 0，含 OK）', () => {
  const r = cli(['check']);
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  assert.ok((r.stdout || '').includes('OK'));
});
t('CLI：lookup 龟兔 命中', () => {
  const r = cli(['lookup', '龟兔']);
  assert.equal(r.status, 0, r.stderr || '');
  assert.ok((r.stdout || '').includes('龟兔'));
});
t('CLI：price --json 输出可解析且数值正确', () => {
  const r = cli(['price', '--severity', '5', '--irreversibility', '4', '--cost', '3', '--json']);
  assert.equal(r.status, 0, r.stderr || '');
  const obj = JSON.parse(r.stdout);
  assert.equal(obj.price_raw, 60);
});
t('CLI：frontier due 可运行（exit 0）', () => {
  const r = cli(['frontier', 'due']);
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  assert.ok((r.stdout || '').length > 0);
});
t('CLI：audit 可运行（exit 0，含 OK）', () => {
  const r = cli(['audit']);
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  assert.ok((r.stdout || '').includes('OK'));
});
t('CLI：brief 可运行（exit 0，含主题简报）', () => {
  const r = cli(['brief', 'HippoRAG']);
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  assert.ok((r.stdout || '').includes('HippoRAG'), (r.stdout || '').slice(0, 200));
});
t('CLI：kit 可运行（exit 0，含起床包）', () => {
  const r = cli(['kit']);
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  assert.ok((r.stdout || '').includes('起床包'), (r.stdout || '').slice(0, 200));
});
t('CLI：promote --dry 可运行（exit 0，dry-run）', () => {
  const r = cli(['promote', '--dry']);
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  assert.ok((r.stdout || '').includes('dry-run'), (r.stdout || '').slice(0, 200));
});
t('CLI：cross 可运行（exit 0，含对位比较）', () => {
  const r = cli(['cross', '重启']);
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  assert.ok((r.stdout || '').includes('对位比较'), (r.stdout || '').slice(0, 200));
});
t('CLI：summary 可运行（exit 0，含全库摘要）', () => {
  const r = cli(['summary']);
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  assert.ok((r.stdout || '').includes('全库摘要'), (r.stdout || '').slice(0, 200));
});
t('CLI：show 可运行（exit 0，含 id）', () => {
  const r = cli(['show', 'canon-akasha-usage']);
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  assert.ok((r.stdout || '').includes('canon-akasha-usage'), (r.stdout || '').slice(0, 200));
});
t('CLI：session index 拒绝非规范路径（防「路径造伪会话」）', () => {
  const dir = mkdtempSync(join(SCRATCH, 'tmp-noncanon-'));
  try {
    const f = join(dir, 'session-freeze-abc12345', 'session.v4.jsonl.zstd');
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, Buffer.from('28b52ffd', 'hex'));
    const r = cli(['session', 'index', f]);
    assert.equal(r.status, 1, (r.stdout || '') + (r.stderr || ''));
    assert.ok(((r.stdout || '') + (r.stderr || '')).includes('未能'), (r.stdout || '') + (r.stderr || ''));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
t('CLI：sleep --dry 可运行（exit 0，dry-run 不落盘）', () => {
  const r = cli(['sleep', '--dry']);
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  assert.ok((r.stdout || '').includes('dry-run'), (r.stdout || '').slice(0, 200));
});
t('CLI：lookup --since 过滤可运行（exit 0）', () => {
  const r = cli(['lookup', '阿卡夏', '--since', '2026-10-06']);
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  assert.ok((r.stdout || '').length > 0);
});
t('CLI：mirror match 可运行（exit 0，含镜像匹配）', () => {
  const r = cli(['mirror', 'match', '虚构', '危险']);
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  assert.ok((r.stdout || '').includes('镜像匹配'), (r.stdout || '').slice(0, 200));
});
t('CLI：metrics 可运行（exit 0，含结果计数器）', () => {
  const r = cli(['metrics']);
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  assert.ok((r.stdout || '').includes('结果计数器'), (r.stdout || '').slice(0, 200));
});
t('CLI：session help 含用法与分级', () => {
  const r = cli(['session', 'help']);
  assert.equal(r.status, 0, (r.stdout || '') + (r.stderr || ''));
  assert.ok((r.stdout || '').includes('分级'), (r.stdout || '').slice(0, 200));
  assert.ok((r.stdout || '').includes('结论'), (r.stdout || '').slice(0, 400));
});
t('CLI：session 无子命令 → usage exit 1', () => {
  const r = cli(['session']);
  assert.equal(r.status, 1, (r.stdout || '') + (r.stderr || ''));
  assert.ok((r.stdout || '').includes('session'), (r.stdout || '').slice(0, 200));
});
t('CLI：session index → lookup → stats（tmp 注入）', () => {
  const dir = mkdtempSync(join(SCRATCH, 'akasha-ses-'));
  const fx = join(dir, 'fx.jsonl.zstd'), store = join(dir, 'session.jsonl'), meta = join(dir, 'meta.json');
  const lines = [
    { seq: 1, time: 1791312000000, type: 'user/message', data: { content: [{ type: 'text', text: 'CLI 冒烟「银杏」' }] } },
    { seq: 2, time: 1791312001000, type: 'assistant/message', data: { turn: 1, step: 1, message: { role: 'assistant', content: [{ type: 'text', text: '结论：银杏已入库。' }] } } }
  ];
  writeFileSync(fx, zstdCompressSync(Buffer.from(lines.map((x) => JSON.stringify(x)).join('\n') + '\n')));
  const ri = cli(['session', 'index', fx, '--session', 's-cli', '--store', store, '--meta', meta]);
  assert.equal(ri.status, 0, (ri.stdout || '') + (ri.stderr || ''));
  const rl = cli(['session', 'lookup', '银杏', '--store', store]);
  assert.equal(rl.status, 0, (rl.stdout || '') + (rl.stderr || ''));
  assert.ok((rl.stdout || '').includes('s-cli'), (rl.stdout || '').slice(0, 300));
  assert.ok((rl.stdout || '').includes('结论'), (rl.stdout || '').slice(0, 300));
  const rs = cli(['session', 'stats', '--store', store, '--meta', meta, '--json']);
  assert.equal(rs.status, 0, (rs.stdout || '') + (rs.stderr || ''));
  const obj = JSON.parse(rs.stdout);
  assert.ok(obj.segments >= 2, JSON.stringify(obj));
  rmSync(dir, { recursive: true, force: true });
});
t('CLI：session tree --build → 渲染 → node 直读（tmp 注入）', () => {
  const dir = mkdtempSync(join(SCRATCH, 'akasha-ses-'));
  const store = join(dir, 'session.jsonl');
  const segs = [];
  let sq = 0;
  for (let turn = 1; turn <= 4; turn += 1) {
    for (const [kind, text] of [['intent', '意图' + turn], ['conclusion', '结论-' + turn], ['action', '动作' + turn]]) {
      sq += 1;
      segs.push(JSON.stringify({ id: `seg-cT-${sq}`, store: 'session', session: 'cT', seq: sq, time: new Date(1791312000000 + sq * 1000).toISOString(), turn, step: 1, kind, gist: text, keywords: [], tools: [], ptr: {}, logged_at: 'x' }));
    }
  }
  writeFileSync(store, segs.join('\n') + '\n');
  const rb = cli(['session', 'tree', '--build', '--session', 'cT', '--store', store]);
  assert.equal(rb.status, 0, (rb.stdout || '') + (rb.stderr || ''));
  assert.ok((rb.stdout || '').includes('L1'), (rb.stdout || '').slice(0, 300));
  const rt = cli(['session', 'tree', '--session', 'cT', '--store', store]);
  assert.equal(rt.status, 0, (rt.stdout || '') + (rt.stderr || ''));
  assert.ok((rt.stdout || '').includes('node-cT-L1-'), (rt.stdout || '').slice(0, 300));
  const nodeId = readFileSync(store, 'utf8').split(/\r?\n/).map((l) => { try { return JSON.parse(l); } catch { return null; } }).find((x) => x && x.kind === 'node').id;
  const rn = cli(['session', 'node', nodeId, '--store', store]);
  assert.equal(rn.status, 0, (rn.stdout || '') + (rn.stderr || ''));
  assert.ok((rn.stdout || '').includes(nodeId), (rn.stdout || '').slice(0, 300));
  assert.ok((rn.stdout || '').includes('children'), (rn.stdout || '').slice(0, 300));
  const rbad = cli(['session', 'node', 'node-none', '--store', store]);
  assert.equal(rbad.status, 1, (rbad.stdout || '') + (rbad.stderr || ''));
  const rl = cli(['session', 'lookup', '结论', '--level', 'nodes', '--store', store]);
  assert.equal(rl.status, 0, (rl.stdout || '') + (rl.stderr || ''));
  assert.ok((rl.stdout || '').includes('[node'), (rl.stdout || '').slice(0, 300));
  assert.ok(!(rl.stdout || '').includes('[conclusion]'), 'level=nodes 不得出段：' + (rl.stdout || '').slice(0, 300));
  const rl2 = cli(['session', 'lookup', '结论', '--level', 'segs', '--store', store]);
  assert.ok((rl2.stdout || '').includes('[conclusion]'), (rl2.stdout || '').slice(0, 300));
  assert.ok(!(rl2.stdout || '').includes('[node'), 'level=segs 不得出节点：' + (rl2.stdout || '').slice(0, 300));
  // 跨代同 id：重建后 node <id> 必须取最新 treegen（2026-10-07 复查：原 .find() 命中旧代留档——stale-read）
  const seg13 = JSON.stringify({ id: 'seg-cT-13', store: 'session', session: 'cT', seq: 13, time: new Date(1791312000000 + 13000).toISOString(), turn: 5, step: 1, kind: 'conclusion', gist: '结论-5', keywords: [], tools: [], ptr: {}, logged_at: 'x' });
  appendFileSync(store, seg13 + '\n');
  const rb2 = cli(['session', 'tree', '--build', '--session', 'cT', '--store', store]);
  assert.equal(rb2.status, 0, (rb2.stdout || '') + (rb2.stderr || ''));
  // 无变更再次重建 → 同范围同 id、新 treegen（跨代重复的真实来源）
  const rb3 = cli(['session', 'tree', '--build', '--session', 'cT', '--store', store]);
  assert.equal(rb3.status, 0, (rb3.stdout || '') + (rb3.stderr || ''));
  const nodesAll = readFileSync(store, 'utf8').split(/\r?\n/).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((x) => x && x.kind === 'node');
  const dupId = [...new Set(nodesAll.map((n) => n.id))].find((id) => nodesAll.filter((n) => n.id === id).length > 1);
  assert.ok(dupId, '重建后应有跨代同 id 节点：' + JSON.stringify(nodesAll.map((n) => n.id)));
  const maxGen = Math.max(...nodesAll.filter((n) => n.id === dupId).map((n) => Number(n.treegen)));
  const rd = cli(['session', 'node', dupId, '--store', store]);
  assert.equal(rd.status, 0, (rd.stdout || '') + (rd.stderr || ''));
  assert.ok((rd.stdout || '').includes('treegen：' + maxGen), 'node 直读应取最新代：' + (rd.stdout || '').slice(0, 300));
  assert.ok((rd.stdout || '').includes('代留档'), '跨代时应提示：' + (rd.stdout || '').slice(0, 300));
  rmSync(dir, { recursive: true, force: true });
});

// ---- 3. MCP
t('MCP：initialize / tools/list / stats / frontier_due / audit / brief / kit / promote / revise / cross / summary / show / mirror_match / metrics / 未知方法', () => {
  const probe = [
    JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test' } } }),
    JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
    JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'akasha_stats', arguments: {} } }),
    JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'akasha_frontier_due', arguments: {} } }),
    JSON.stringify({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'akasha_audit', arguments: {} } }),
    JSON.stringify({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'akasha_brief', arguments: { query: 'HippoRAG' } } }),
    JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'akasha_kit', arguments: {} } }),
    JSON.stringify({ jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'akasha_promote', arguments: { dry: true } } }),
    JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'akasha_revise', arguments: { store: 'canon', id: '__no_such__', patch: {} } } }),
    JSON.stringify({ jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'akasha_cross', arguments: { query: '重启' } } }),
    JSON.stringify({ jsonrpc: '2.0', id: 11, method: 'tools/call', params: { name: 'akasha_summary', arguments: {} } }),
    JSON.stringify({ jsonrpc: '2.0', id: 12, method: 'tools/call', params: { name: 'akasha_show', arguments: { id: 'canon-akasha-usage-r10' } } }),
    JSON.stringify({ jsonrpc: '2.0', id: 13, method: 'tools/call', params: { name: 'akasha_mirror_match', arguments: { text: '虚构 危险' } } }),
    JSON.stringify({ jsonrpc: '2.0', id: 14, method: 'tools/call', params: { name: 'akasha_metrics', arguments: {} } }),
    JSON.stringify({ jsonrpc: '2.0', id: 15, method: 'tools/call', params: { name: 'akasha_session_lookup', arguments: { query: '银杏' } } }),
    JSON.stringify({ jsonrpc: '2.0', id: 16, method: 'no/such' })
  ].join('\n') + '\n';
  const r = spawnSync(process.execPath, [join(ROOT, 'mcp.mjs')], { cwd: ROOT, encoding: 'utf8', input: probe });
  const lines = (r.stdout || '').trim().split(/\r?\n/).map(l => JSON.parse(l));
  assert.equal(lines.length, 16, (r.stdout || '') + (r.stderr || ''));
  assert.equal(lines[0].result.serverInfo.name, 'akasha');
  assert.ok(lines[1].result.tools.length >= 17);
  assert.ok(lines[2].result.content[0].text.includes('canon'));
  assert.ok(Array.isArray(JSON.parse(lines[3].result.content[0].text)), 'frontier_due 应返回数组');
  assert.ok(Array.isArray(JSON.parse(lines[4].result.content[0].text).findings), 'audit 应返回 findings 数组');
  assert.ok(JSON.parse(lines[5].result.content[0].text).groups.length >= 1, 'brief 应返回分组');
  assert.ok(JSON.parse(lines[6].result.content[0].text).library.canon >= 1, 'kit 应返回库况');
  assert.equal(JSON.parse(lines[7].result.content[0].text).dry, true, 'promote 应回 dry 标记');
  assert.equal(lines[8].result.isError, true, 'revise 对不存在的 id 应回错误（不写库）');
  assert.ok(Array.isArray(JSON.parse(lines[9].result.content[0].text).groups), 'cross 应返回分组');
  assert.ok(JSON.parse(lines[10].result.content[0].text).stores, 'summary 应返回六库');
  assert.ok(JSON.stringify(lines[11]).includes('canon-akasha-usage-r10'), 'show 应返回该条目');
  assert.ok(Array.isArray(JSON.parse(lines[12].result.content[0].text)), 'mirror_match 应返回数组');
  assert.ok(JSON.parse(lines[13].result.content[0].text).counters, 'metrics 应返回 counters');
  assert.ok(Array.isArray(JSON.parse(lines[14].result.content[0].text)), 'session_lookup 应返回数组');
  assert.equal(lines[15].error.code, -32601);
});
t('loop-detect：块重复/变体重复/标点串/零误报（文献方法论机械代理）', () => {
  assert.ok(loopDetect, 'loop-detect 模块缺失');
  const norm = loopDetect.normalize('测试，文本。有没有标点！');
  assert.equal(norm, '测试文本有没有标点');
  const block = '我们先把这个问题拆开来看：第一步核对事实，第二步检查路径，第三步再决定是否继续深入。';
  const loopText = (block + '中间插入一段普通内容。').repeat(3);
  const rc = loopDetect.detectLoops(loopText, { window: 30, blockCount: 3 });
  assert.ok(rc.exact.length >= 1, '块重复应命中：' + JSON.stringify(rc.stats));
  const variant = [block, block.replace('深入', '扎入'), block.replace('决定', '确定')].join('');
  const rv = loopDetect.detectLoops(variant, { window: 24, sim: 0.7 });
  assert.ok(rv.variant.length >= 1, '变体重复应命中：' + JSON.stringify(rv.stats));
  const stars = loopDetect.detectLoops('*'.repeat(400) + '再写一段正常的分析文本用于收尾。', {});
  assert.ok(stars.exact.length === 0, '纯符号窗不得算块重复');
  const punct = '分析一下：——：——：——：——：——：——：——：——：——：——：然后结束';
  const rp = loopDetect.detectLoops(punct, {});
  assert.ok(rp.punctRuns.length >= 1 && rp.punctRuns[0].length >= 6, JSON.stringify(rp.punctRuns));
  const rn = loopDetect.detectLoops('普通的一段分析，没有重复内容，也检查不出循环。再补一短句收尾。', {});
  assert.ok(rn.exact.length === 0 && rn.variant.length === 0 && rn.punctRuns.length === 0, JSON.stringify(rn.stats));
  const empty = loopDetect.detectLoops('', {});
  assert.ok(empty.exact.length === 0 && empty.stats.chars === 0);
});
t('loop-detect：punctRuns 不含空白（列表不误报）+ 奇周期循环（step=1 回归哨兵）', () => {
  assert.ok(loopDetect, 'loop-detect 模块缺失');
  // 2026-10-07 复查：punctRuns 原字符类含 \s —— markdown 列表（：\n  -）被误判为标点串（试运行试用 5 条命中全为误报）
  const md = '核对清单：\n  - 甲项\n  - 乙项\n  - 丙项\n  - 丁项';
  assert.equal(loopDetect.punctRuns(md).length, 0, '列表符号不得成串：' + JSON.stringify(loopDetect.punctRuns(md)));
  const tpl = '——：——：——：——';
  assert.ok(loopDetect.punctRuns(tpl).length >= 1, '模板串仍须命中');
  // 奇周期：13 字句 ×5 + window 30 —— 旧 step=2 采样只见 2 窗（不足 3），step=1 修正后命中（防回退哨兵）
  const seg = '这是一个奇周期的循环文本啊';
  const odd = loopDetect.detectLoops(seg.repeat(5), { window: 30, blockCount: 3 });
  assert.ok(odd.exact.length >= 1, '奇周期循环应命中：' + JSON.stringify(odd.stats));
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('失败清单：');
  for (const [name, e] of failures) console.log(' -', name, ':', e.message);
}
process.exit(failures.length ? 1 : 0);
