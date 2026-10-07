// akasha/loop-detect.mjs
// 空转/思考环检测器（2026-10-07，受控解冻第十五次；机械代理，纯函数）
// 方法论：Circular Reasoning（2601.05693，语义重复先于文本重复）→ bigram Jaccard 近重复；
//        RADAR（2609.38817，异常先于重复）→ 输出前置信号而非只抓末端标点串；
//        dsh-thinking-loop-guard（MIT，2026-08）→ 归一化 + 滑动窗口块重复（window 100 / count 3）为基线参数。
export function normalize(s) {
  return String(s ?? '')
    .replace(/[\s\u3000]+/gu, '')
    .replace(/[，。；、：:！？!?…—–－\-—~〜·,.()（）【】\[\]《》<>"'“”‘’「」『』`|/\\]+/gu, '');
}

export function bigrams(s) {
  const out = new Set();
  for (let i = 0; i < s.length - 1; i += 1) out.add(s.slice(i, i + 2));
  return out;
}

export function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

/** 标点/冒号连排 ≥ minRun（现症末端形态兜底；先于归一化统计）。
 *  **不含空白**（2026-10-07 复查：原字符类含 `\s` ⇒ markdown 列表 `：\n  -` 被误判为标点串，
 *  试运行试用 5 条命中全为误报——列表符号链不应成"标点串"。 */
export function punctRuns(raw, minRun = 6) {
  const out = [];
  const re = new RegExp(`[：:—–－\\-=~〜、，。；？！.,;?!]{${Math.max(4, Number(minRun) || 6)},}`, 'gu');
  for (const m of String(raw ?? '').matchAll(re)) {
    const run = m[0];
    if (/[：:—–－]/.test(run)) out.push(run.slice(0, 40));
  }
  return out;
}

/**
 * detectLoops(text, opts) -> { exact, variant, punctRuns, stats }
 *  exact：归一化后 window 字滑窗出现 ≥ blockCount 次（块重复）；
 *  variant：相距 ≥ 2×window 的两窗 Jaccard ≥ sim（变体重复，≈语义近似代理）；
 *  punctRuns：标点串（原文本统计）。
 */
export function detectLoops(text, { window = 100, blockCount = 3, sim = 0.85, step = 1, cap = 60000, maxWindows = 12000, maxVariantPairs = 240 } = {}) {
  // step=1（2026-10-07 修：奇周期循环在步长 2 采样下相邻重复对不可见——turn 环自检首跑即踩中）。
  // 覆盖上限 = step × maxWindows ≈ 12K 归一字符，且**优先保留尾部**（循环随时间升级；更长文本请分段）。
  // 注意：窗口合格线含「CJK ≥20%」——纯英文/低 CJK 文本为已知盲区（挡代码/符号碎片的设计代价，见收口点复核 F3）。
  const raw = String(text ?? '');
  const puncts = punctRuns(raw);
  const norm = normalize(raw).slice(0, cap);
  const n = norm.length;
  const exact = [];
  const variant = [];
  let windows = 0;
  if (n >= window) {
    // 窗口合格性：词汇多样性 ≥10 种 bigram 且 CJK 占比 ≥20%——过滤星号分隔线 / 代码碎片等结构重复
    const eligible = (s) => {
      const bgs = bigrams(s);
      if (bgs.size < 10) return false;
      let cjk = 0;
      for (const ch of s) if (/[\u4e00-\u9fff]/.test(ch)) cjk += 1;
      return cjk / s.length >= 0.2;
    };
    const wins = [];
    for (let i = n - window; i >= 0; i -= step) { // 尾优先收集（上限截断时保尾部）
      const s = norm.slice(i, i + window);
      if (eligible(s)) wins.push({ at: i, s });
      if (wins.length >= maxWindows) break;
    }
    windows = wins.length;
    const count = new Map();
    for (const w of wins) count.set(w.s, (count.get(w.s) ?? 0) + 1);
    for (const [s, c] of count) if (c >= blockCount) exact.push({ count: c, excerpt: s.slice(0, 60) });
    const stride = wins.length > 600 ? 7 : wins.length > 200 ? 3 : 1;
    const sample = wins.filter((_, idx) => idx % stride === 0).slice(0, maxVariantPairs).sort((a, b) => a.at - b.at);
    const bgs = sample.map((w) => bigrams(w.s));
    for (let i = 0; i < sample.length; i += 1) {
      for (let j = i + 1; j < sample.length; j += 1) {
        if (sample[j].at - sample[i].at < window * 2) continue;
        if (jaccard(bgs[i], bgs[j]) >= sim) variant.push({ atA: sample[i].at, atB: sample[j].at, excerpt: sample[i].s.slice(0, 60) });
      }
    }
  }
  return {
    exact,
    variant: variant.slice(0, 10),
    punctRuns: puncts,
    stats: { chars: raw.length, normChars: n, windows }
  };
}
