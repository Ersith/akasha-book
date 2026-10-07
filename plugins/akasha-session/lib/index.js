// 阿卡夏之书会话层插件 v0.2（@akasha-book/akasha-session）—— 自动增量索引 + 压缩事件行 + 节奏条 + 循环观测 P0（dry）。
//   · 核心逻辑归 ~/.akasha/session.mjs（插件只做调度与注入；降级只留痕，不炸宿主）
//   · 观测线（hooks.jsonl）：session-armed / session-index / session-index-skip / session-index-error / session-compact
//     + 循环观测（P0 干跑，2026-10-07）：loop-watch / loop-watch-probe —— **只观测、绝不干预**（不 steer / 不 cancel / 不注入）
//       实时面＝`agent/assistant-stream` 帧（现役 v4 格式；`assistant/chunk` 为 V0 遗物，仅兼容保留）
//   · 条子：systemPrompt.context（akasha:session，order 134）；无内容静默
import { appendFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export const inject = ['systemPrompt', 'timer'];

// 默认值：家目录（~/.akasha）；sessionsRoot 按你的宿主实际会话档案目录配置。
const AKASHA_HOME = join(homedir(), '.akasha');
const DEFAULTS = {
  log: join(AKASHA_HOME, 'logs', 'hooks.jsonl'),
  akashaDir: AKASHA_HOME,
  sessionsRoot: join(homedir(), '.dsh', 'sessions'),
  storeFile: join(AKASHA_HOME, 'data', 'session.jsonl'),
  metaFile: join(AKASHA_HOME, 'data', 'session-meta.json'),
  minIndexIntervalMs: 30000,
  timerCheckMs: 240000,
  contextOrder: 134,
  loopWatch: true,
  watchMinChars: 200,
  watchCheckEvery: 480
};

/** 去抖判定（纯函数）。 */
export function shouldIndex(lastIndexedAt, now, minMs) {
  return !Number.isFinite(lastIndexedAt) || lastIndexedAt <= 0 || now - lastIndexedAt >= minMs;
}

/** 自适应节流（纯函数）：档案 >16MB 时节流 ×4（防大会话增长后每次触发阻塞宿主）。 */
export function effectiveThrottle(size, baseMs) {
  return size > 16 * 1024 * 1024 ? baseMs * 4 : baseMs;
}

/** 节奏条渲染（纯函数）：段数/会话数 + 回看提示；压缩窗口内追一行。无数据 → null（静默）。 */
export function renderSessionLine(state, now) {
  const sessions = state?.meta?.sessions ?? {};
  const ids = Object.keys(sessions);
  if (!ids.length) return null;
  let segments = 0;
  for (const id of ids) segments += Number(sessions[id]?.segments ?? 0);
  if (!segments) return null;
  const lines = [`小阿卡夏·会话层：已索引 ${segments} 段（${ids.length} 会话）；回看用 node akasha.mjs session lookup <词>`];
  const compacts = (state?.compacts ?? []).filter((c) => Number.isFinite(c?.ts) && now - c.ts <= 10 * 60 * 1000);
  if (compacts.length) {
    const last = compacts[compacts.length - 1];
    const s = state?.meta?.sessions?.[last?.session];
    const counts = s ? `（该会话已索引 ${Number(s.segments ?? 0)} 段 · 结论 ${Number(s.conclusions ?? 0)} 条）` : '';
    lines.push(`⚠ 近期发生压缩（${compacts.length} 次）——本段历史已收入会话层${counts}；细节查 akasha_session_lookup`);
  }
  return lines.join('\n');
}

/** 循环观测 P0（dry）：chunk 归类——真值对 @deepseek-ai/dsh-llm StreamChunk（text-delta / reasoning-delta / tool-call-delta）。 */
export function classifyChunk(chunk) {
  const t = chunk?.type;
  if (t === 'reasoning-delta') return { stream: 'reasoning', text: String(chunk.text ?? '') };
  if (t === 'text-delta') return { stream: 'text', text: String(chunk.text ?? '') };
  if (t === 'tool-call-delta') return { stream: 'tool', name: String(chunk.name ?? '') };
  return null;
}

/** 流式节流（纯函数）：累计 ≥ minChars 且距上次检查 ≥ every 才查。 */
export function shouldCheckStream(bufferedLen, lastCheckedLen, every, minChars) {
  return bufferedLen >= minChars && bufferedLen - lastCheckedLen >= every;
}

/** 命中摘要（纯函数）：exact > variant > punct 取最强未报类型；hitSet 去重；摘录 ≤60。 */
export function summarizeWatch(result, stream, atChars, hitSet, phase = 'stream') {
  const order = [['exact', result?.exact?.[0]], ['variant', result?.variant?.[0]], ['punct', result?.punctRuns?.[0]]];
  for (const [type, hit] of order) {
    if (!hit) continue;
    if (hitSet?.has(type)) continue;
    if (hitSet) hitSet.add(type);
    const excerpt = String(typeof hit === 'string' ? hit : hit.excerpt ?? '').slice(0, 60);
    const extra = (typeof hit === 'object' && hit.count) ? { count: hit.count } : {};
    return { phase, stream, atChars, hit: { type, excerpt, ...extra } };
  }
  return null;
}

export function apply(ctx, config = {}) {
  const cfg = { ...DEFAULTS, ...config };
  const require_ = createRequire(import.meta.url);
  const core = () => require_(join(cfg.akashaDir, 'session.mjs'));

  const log = (record) => {
    try {
      mkdirSync(dirname(cfg.log), { recursive: true });
      appendFileSync(cfg.log, JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n', 'utf8');
    } catch { /* 观测线写不了不拖垮宿主 */ }
  };

  const readMeta = () => { try { return JSON.parse(readFileSync(cfg.metaFile, 'utf8')); } catch { return null; } };

  // 事件循环延迟采样（2026-10-07，观测用；unref 不拖住进程）：每秒 tick 偏差 ≈ 采样期阻塞。
  let loopLastTick = Date.now();
  let loopLagMs = 0;
  const loopTimer = setInterval(() => {
    const now = Date.now();
    loopLagMs = Math.max(0, now - loopLastTick - 1000);
    loopLastTick = now;
  }, 1000);
  if (typeof loopTimer.unref === 'function') loopTimer.unref();

  // 每会话去抖（进程内；重启后首触发即补跑，不丢段）。
  const lastIndexedAt = new Map();
  // 档案快照（size + mtimeMs）：两者都相同 ⇒ 没有新字节，跳过重读；**只在索引成功后记账**（失败可重试）。
  const lastStat = new Map();
  // 统一失败背压（未命中 / 链接失败 / 执行失败：窗口内静默，不重复扫 + 不重复报错；含宿主模块代缓存场景）。
  const lastFailAt = new Map();
  const FAIL_BACKOFF_MS = 5 * 60 * 1000;

  // 压缩事件窗口（进程内近况；重启后清空——只影响提示行，不影响数据）。
  const compacts = [];

  // ---------- 循环防护 P0（dry 干跑观测，受控解冻） ----------
  // 红线：只观测、只写 hooks 观测线；绝不 steer / cancel / 注入。
  const watchEnabled = cfg.loopWatch !== false;
  const watchBuf = new Map();      // `${sid}:${attempt}:${index}:${stream}` -> { text, seen, lastChecked, done, hit:Set }
  const watchProbe = new Map();    // sid -> Set(帧/chunk 类型；前 8 个各记一行，防真值漂移）
  const watchTurnDone = new Set(); // `${sid}:${turn}` 去重
  const attemptTurns = new Map();  // attemptId -> {turn, step}（chunk 帧不带 turn/step，start 帧带——2026-10-07 复查）
  const lastAssistant = new Map(); // sid -> {turn, message}（事件流缓存；官方 Session 无同步读者可用）
  const watchLoopCore = () => require_(join(cfg.akashaDir, 'loop-detect.mjs'));

  const probeType = (sid, tag) => {
    const seen = watchProbe.get(sid) ?? new Set();
    if (seen.has(tag) || seen.size >= 8) return;
    seen.add(tag);
    watchProbe.set(sid, seen);
    log({ kind: 'loop-watch-probe', session: sid, type: tag });
  };

  const feedStreamChunk = (sid, turn, step, keyPrefix, cls) => {
    const key = `${keyPrefix}:${cls.stream}`;
    let buf = watchBuf.get(key);
    if (!buf) {
      buf = { text: '', seen: 0, lastChecked: 0, done: false, hit: new Set() };
      watchBuf.set(key, buf);
      if (watchBuf.size > 64) {
        let victim = null;
        for (const [k, v] of watchBuf) { if (v.done) { victim = k; break; } } // 优先淘汰已收工的（收口点复核 F2）
        watchBuf.delete(victim ?? watchBuf.keys().next().value);
      }
    }
    if (buf.done) return;
    buf.text += cls.text;
    buf.seen += cls.text.length; // 单调累计：缓冲截尾不影响节流（复核 F1——饱和后尾段仍继续检查）
    if (buf.text.length > 20000) buf.text = buf.text.slice(buf.text.length - 20000);
    if (!shouldCheckStream(buf.seen, buf.lastChecked, cfg.watchCheckEvery, cfg.watchMinChars)) return;
    buf.lastChecked = buf.seen;
    const res = watchLoopCore().detectLoops(buf.text.slice(-8000), { window: 100, blockCount: 3, maxWindows: 9000 });
    const sum = summarizeWatch(res, cls.stream, buf.seen, buf.hit);
    if (sum) {
      buf.done = true;
      log({ kind: 'loop-watch', session: sid, turn, step, ...sum });
    }
  };

  // V0 遗物兼容：`assistant/chunk` 事件（现役 v4 格式不再发此事件；字段面保留，防旧宿主）。
  const onChunk = (session, event) => {
    const sid = String(session?.id ?? '').replace(/^session-/, '');
    const chunk = event?.data?.chunk;
    if (!sid || !chunk || typeof chunk.type !== 'string') return;
    probeType(sid, chunk.type);
    const cls = classifyChunk(chunk);
    if (!cls || cls.stream === 'tool') return;
    feedStreamChunk(sid, event?.data?.turn ?? null, event?.data?.step ?? null, `${sid}:${event?.data?.turn ?? '?'}:${chunk.index ?? 0}`, cls);
  };

  // 现役格式：`agent/assistant-stream` 进程内瞬态帧（真值对 dsh-agent-loop AssistantStreamAttempt 与 dsh-headless 消费口径）。
  // frame：{type:'start'|'chunk'|'end', attemptId, turn, step, chunk?}；chunk：text-delta/reasoning-delta/tool-call-delta/block-*/usage/finish。
  const onStreamFrame = (agent, frame) => {
    const sid = String(agent?.session?.id ?? agent?.id ?? '').replace(/^session-/, '');
    const frameType = String(frame?.type ?? '');
    if (!sid || !frameType) return;
    probeType(sid, frameType + (frame?.chunk?.type ? '/' + frame.chunk.type : ''));
    const attemptId = String(frame?.attemptId ?? '');
    if (frameType === 'start') { // start 帧带 turn/step；chunk 帧不带（2026-10-07 复查）→ 缓存供补全
      attemptTurns.set(attemptId, { turn: frame?.turn ?? null, step: frame?.step ?? null });
      if (attemptTurns.size > 64) attemptTurns.delete(attemptTurns.keys().next().value);
      return;
    }
    if (frameType === 'end') { attemptTurns.delete(attemptId); return; }
    if (frameType !== 'chunk') return;
    const cls = classifyChunk(frame.chunk);
    if (!cls || cls.stream === 'tool') return;
    const meta = attemptTurns.get(attemptId) ?? {};
    feedStreamChunk(sid, meta.turn ?? frame?.turn ?? null, meta.step ?? frame?.step ?? null, `${sid}:${attemptId || '?'}:${frame.chunk?.index ?? 0}`, cls);
  };

  const rememberAssistant = (session, event) => {
    const sid = String(session?.id ?? '').replace(/^session-/, '');
    if (!sid) return;
    lastAssistant.set(sid, { turn: event?.data?.turn ?? null, message: event?.data?.message });
    if (lastAssistant.size > 64) lastAssistant.delete(lastAssistant.keys().next().value);
  };

  // turn 环：全文检测。取数＝事件流缓存（2026-10-07 复查：官方 Session 无 .events 属性，
  // 同步读者 snapshotEvents/ownEvents 已被官方弃用「新调用禁止」——宿主容器改事件驱动，插件不得伸手进日志）。
  const onTurnWatch = (sidIn, turn) => {
    const sid = String(sidIn ?? '').replace(/^session-/, '');
    const key = `${sid}:${turn ?? '?'}`;
    if (!sid || watchTurnDone.has(key)) return;
    const cached = lastAssistant.get(sid);
    if (!cached?.message) return;
    if (turn != null && cached.turn !== turn) return; // 缓存尚未到该回合（等 turn/end 兜底）
    watchTurnDone.add(key);
    if (watchTurnDone.size > 200) watchTurnDone.delete(watchTurnDone.keys().next().value);
    const message = cached.message;
    for (const stream of ['reasoning', 'text']) {
      const text = (message.content ?? []).filter((b) => b?.type === stream).map((b) => String(b.text ?? '')).join('');
      if (text.length < 120) continue;
      const res = watchLoopCore().detectLoops(text, {});
      const sum = summarizeWatch(res, stream, text.length, new Set(), 'turn');
      if (sum) log({ kind: 'loop-watch', session: sid, turn: turn ?? null, phase: 'turn', stream, chars: text.length, hit: sum.hit });
    }
  };

  const indexNow = (sidIn, trigger, extra = {}) => {
    const sid = String(sidIn ?? '').replace(/^session-/, ''); // 前缀归一：宿主事件常见 'session-<id>'，目录 / 记账恒用裸 id
    try {
      if (!sid) return; // 空 id：静默跳过（正常路径不出现；见 README 降级节）
      const now = Date.now();
      if (now - (lastFailAt.get(sid) ?? 0) < FAIL_BACKOFF_MS) return; // 失败背压：窗口内静默
      const file = core().resolveSessionFile(cfg.sessionsRoot, sid);
      if (!file) { lastFailAt.set(sid, now); log({ kind: 'session-index-error', session: sid, trigger, message: '未找到会话档案' }); return; }
      lastFailAt.delete(sid);
      let st = null;
      try { st = statSync(file); } catch { /* stat 失败 → 走全量 */ }
      if (!shouldIndex(lastIndexedAt.get(sid) ?? 0, now, effectiveThrottle(st?.size ?? 0, cfg.minIndexIntervalMs))) {
        log({ kind: 'session-index-skip', session: sid, trigger, sinceMs: now - (lastIndexedAt.get(sid) ?? 0) });
        return;
      }
      // 设计：去抖标记先置位——索引失败后 30s 内不重试（错误背压）；统一失败窗口见 lastFailAt
      lastIndexedAt.set(sid, now);
      // 廉价快路：字节与 mtime 都没变 → 没有新内容，跳过重读（省一次全量解压）
      if (st) {
        const prev = lastStat.get(sid);
        if (prev && prev.size === st.size && prev.mtimeMs === st.mtimeMs) {
          log({ kind: 'session-index-skip', session: sid, trigger, reason: 'unchanged' });
          return;
        }
      }
      const t0 = Date.now();
      const r = core().indexSession({ file, session: sid, storeFile: cfg.storeFile, metaFile: cfg.metaFile });
      if (st) lastStat.set(sid, { size: st.size, mtimeMs: st.mtimeMs }); // 只记成功：失败后同档可重试
      const dur = Date.now() - t0;
      log({ kind: 'session-index', session: sid, trigger, turn: extra.turn ?? null, added: r.added, skipped: r.skipped, parseFails: r.parseFails, frameFails: r.frameFails ?? 0, ms: dur, lagMs: loopLagMs });
      if (dur > 1500) log({ kind: 'session-index-slow', session: sid, trigger, ms: dur, lagMs: loopLagMs, added: r.added }); // >1.5s 告警线（2026-10-07 补4）
    } catch (error) {
      const msg = String(error?.message ?? error);
      const hint = /not yet fully loaded|does not provide an export named|Cannot find module/.test(msg) ? '（疑似宿主模块代缓存——重启桌面端后恢复）' : '';
      lastFailAt.set(sid, Date.now());
      log({ kind: 'session-index-error', session: sid, trigger, message: (msg + hint).slice(0, 300) });
    }
  };

  // 触发面：回合结束（durable）+ 空闲追平 + 定时兜底 + 压缩信号（compaction/end 真值；2026-10-07 复查）。
  ctx.on('session/event', (session, event) => {
    try {
      if (event?.type === 'turn/end') indexNow(String(session?.id ?? ''), 'turn-end', { turn: event?.data?.turn ?? null });
      else if (event?.type === 'compaction/end' && event?.data?.error === void 0) {
        const sid = String(session?.id ?? '').replace(/^session-/, '');
        compacts.push({ session: sid, ts: Date.now() });
        if (compacts.length > 20) compacts.splice(0, compacts.length - 20);
        log({ kind: 'session-compact', session: sid });
      }
    } catch { /* 静默 */ }
  });
  ctx.on('agent/status', (payload) => {
    try { if (payload?.status === 'idle') indexNow(String(payload?.agent?.id ?? ''), 'idle'); } catch { /* 静默 */ }
  });
  if (watchEnabled) {
    ctx.on('agent/assistant-stream', (payload) => {
      try { onStreamFrame(payload?.agent, payload?.frame); } catch { /* 观测不拖垮宿主 */ }
    });
    ctx.on('session/event', (session, event) => {
      try {
        if (event?.type === 'assistant/chunk') onChunk(session, event);
        else if (event?.type === 'assistant/message') rememberAssistant(session, event);
        else if (event?.type === 'turn/end') onTurnWatch(String(session?.id ?? ''), event?.data?.turn ?? null);
      } catch { /* 观测不拖垮宿主 */ }
    });
    ctx.on('agent/turn-stopping', (payload) => {
      try { onTurnWatch(String(payload?.agent?.session?.id ?? payload?.agent?.id ?? ''), payload?.turn ?? null); } catch { /* 静默 */ }
    });
  }

  if (typeof ctx.interval === 'function') {
    try {
      const stop = ctx.interval(() => { try { for (const sid of [...lastIndexedAt.keys()]) indexNow(sid, 'timer'); } catch { /* 静默 */ } }, cfg.timerCheckMs);
      ctx.effect(() => () => { try { stop(); } catch { /* 静默 */ } });
    } catch { /* 静默 */ }
  }

  // 条子：每回合一行（无内容静默）。
  ctx.systemPrompt.context({
    name: 'akasha:session',
    order: cfg.contextOrder,
    text: () => {
      try { return renderSessionLine({ meta: readMeta(), compacts }, Date.now()); }
      catch { return null; }
    }
  });

  log({ kind: 'session-armed', pid: process.pid, minIndexIntervalMs: cfg.minIndexIntervalMs, timerCheckMs: cfg.timerCheckMs, contextOrder: cfg.contextOrder, loopWatch: watchEnabled, watchMinChars: cfg.watchMinChars, watchCheckEvery: cfg.watchCheckEvery });
}
