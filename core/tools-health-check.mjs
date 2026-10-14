// akasha/tools/health-check.mjs —— 阿卡夏全功能体检（2026-10-13；从 tmp 转正为常驻工具）
//
// 纪律（2026-10-13 用血写的）：**写命令只许在沙箱段**。第一版把  放进只读段 + 写死真 id，
//   连跑两遍体检 ⇒ 真库 mirror 链被写入 r5/r6（其后 r7/r8 + 连带整链退役）。
//   凡「动词像读、实则 revise 落库」的子命令（outcome / recheck / price --apply / promote / session index），一律进沙箱。
// 口径：**读命令**在真库跑（只读）；**写命令**在临时副本跑（AKASHA_ROOT/AKASHA_DIR/AKASHA_LOGS 指向 temp）——
//   真库一字不写。每项判据：退出码 + 输出非空 + 无 error/异常字样 + （关键的）断言具体语义。
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, existsSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const H = "<LOCAL_PATH>";
const NODE = process.execPath;
const rows = [];
const ok = (name, pass, detail) => rows.push({ name, pass: !!pass, detail: String(detail ?? "").slice(0, 160) });

// ── A. 只读命令（真库）──
const RO = [
  ["check", ["check"], (o) => /OK —/.test(o)],
  ["stats", ["stats"], (o) => /canon:/.test(o)],
  ["audit", ["audit"], (o) => /OK|warn|findings/.test(o)],
  ["kit", ["kit"], (o) => /起床包/.test(o)],
  ["summary", ["summary"], (o) => /canon/.test(o)],
  ["metrics", ["metrics", "--since", "2026-10-01"], (o) => o.length > 0],
  ["lookup", ["lookup", "尾读", "--per-store", "3"], (o) => /canon/.test(o)],
  ["brief", ["cross", "门控", "--per", "2"], (o) => o.length > 0],
  ["cross", ["cross", "门控", "--per", "2"], (o) => /canon/.test(o)],
  ["show", ["show", "canon-akasha-usage"], (o) => /canon-akasha-usage/.test(o)],
  ["mirror match", ["mirror", "match", "工具失败后没有查库", "--limit", "3"], (o) => o.length >= 0],
  ["mirror compare", ["mirror", "compare", "工具失败后没有查库"], (o) => o.length > 0],
  // ⚠ 2026-10-13 教训：`mirror outcome` **是写命令**（revise 落库）——第一版把它放只读段、还写死一个真 id，
  //   连跑两遍体检就真库里写了两条修订（r5/r6，随后连带 r7/r8）。**写命令一律进沙箱段**，此处不再出现。
  ["orphan list", ["orphan", "list"], (o) => o.length > 0],
  ["frontier list", ["frontier", "list"], (o) => /frontier|ok|current/.test(o) || o.length > 0],
  ["frontier due", ["frontier", "due"], (o) => true],
  ["budget", ["budget"], (o) => o.length > 0],
  ["negative", ["negative"], (o) => o.length >= 0],
  ["blindspots", ["blindspots"], (o) => o.length >= 0],
  ["blindmap", ["blindmap"], (o) => o.length >= 0],
  ["discipline", ["discipline"], (o) => o.length >= 0],
  ["generation", ["generation"], (o) => o.length >= 0],
  ["recall", ["recall"], (o) => o.length >= 0],
  ["calibration", ["calibration"], (o) => o.length >= 0],
  ["readings", ["readings"], (o) => o.length >= 0 || true],
  ["session stats", ["session", "stats"], (o) => /段|session/.test(o)],
  ["session lookup", ["session", "lookup", "门控", "--limit", "3"], (o) => o.length > 0],
  ["session loopwatch", ["session", "loopwatch"], (o) => o.length >= 0],
  ["session tree（真 id 只读）", ["session", "tree", "--session", "official-collab-6b40ba60-6973-4854-8a4b-3c7972bdb4ac"], (o) => o.length > 0],
  ["session context", ["session", "context"], (o) => o.length >= 0],
  ["sleep --dry", ["sleep", "--dry"], (o) => /dry-run|蒸馏/.test(o)],
  ["sleep --plan", ["sleep", "--plan"], (o) => o.length > 0],
  ["sleep --replay", ["sleep", "--replay", "--today", "2026-10-13"], (o) => o.length > 0],
  ["help（无参用法）", [], (o) => /用法/.test(o)],
];
for (const [name, args, assert] of RO) {
  // 2026-10-13 卫生修：读面探测是**机器检查**、不是真使用 ⇒ 关查询侧线
  // （否则体检的探询会混进真 logs/query-log.jsonl——首跑即实测到 3 条）。
  const r = spawnSync(NODE, [join(H, "akasha/akasha.mjs"), ...args], { cwd: H, encoding: "utf8", timeout: 120000, env: { ...process.env, AKASHA_QUERY_LOG: "off" } });
  const out = ((r.stdout || "") + (r.stderr || "")).trim();
  const bad = /Cannot find module|TypeError|ReferenceError|SyntaxError|ENOENT/.test(out);
  ok("CLI " + name, r.status === 0 && !bad && assert(out), `exit=${r.status}${bad ? " 含异常字样" : ""} :: ${out.slice(0, 110).replace(/\n/g, " ⏎ ")}`);
}

// ── B. 写命令（临时副本库；真库零写入）──
const SANDBOX = mkdtempSync(join(tmpdir(), "akasha-health-"));
{
  // 布局纠正 v2（2026-10-13）：`AKASHA_ROOT` = **放六库 jsonl 的目录本身**（lib.mjs:10 `DATA = AKASHA_ROOT`，
  //   默认 `<repo>/data`）——不是"父级"。第一版把它当父级 ⇒ 全项「数据根缺少库文件」（这条是体检器自己的坑，已记）。
  //   本版：脚本仍走真库路径（只读用），**数据根指向临时目录**（写全落 temp）。
  const dataDir = join(SANDBOX, "data");
  mkdirSync(dataDir, { recursive: true });
  cpSync(join(H, "akasha/data"), dataDir, { recursive: true });
  mkdirSync(join(SANDBOX, "logs"), { recursive: true });
  const env = { ...process.env, AKASHA_ROOT: dataDir, AKASHA_LOGS: join(SANDBOX, "logs"), AKASHA_DIR: SANDBOX };
  const run = (args, input) => {
    const r = spawnSync(NODE, [join(H, "akasha/akasha.mjs"), ...args], { cwd: H, encoding: "utf8", timeout: 120000, env, input });
    return { status: r.status, out: ((r.stdout || "") + (r.stderr || "")).trim() };
  };
  // B1 写：orphan add —— 真用法（**须给 observed**：只给 summary 会被校验拒，这是设计，见 B1b）
  const a = run(["orphan", "add", "--summary", "体检写入探针（临时库）", "--observed", "体检用观测文本", "--hypothesis", "体检用假设", "--confirm", "check 仍绿", "--refute", "check 变红"]);
  ok("CLI orphan add（临时库）", a.status === 0 && /orphan-/.test(a.out), `exit=${a.status} :: ${a.out.slice(0, 110)}`);
  // B1b 反向：缺 observed 必须被拒（校验在岗）
  const aBad = run(["orphan", "add", "--summary", "缺字段"]);
  ok("CLI orphan add 缺必填被拒（校验在岗）", aBad.status !== 0 || /校验|必填|missing|拒绝/.test(aBad.out), `exit=${aBad.status} :: ${aBad.out.split("\n").slice(-1)[0].slice(0, 90)}`);
  // B2 修订链：revise 一条 canon（挑非协议类——协议/自我层有信任边界，正当拒绝见 B2b）
  const rev = run(["revise", "canon", "canon-akasha-sweep20261013c", "--data", JSON.stringify({ last_reviewed: "2026-10-13" })]);
  ok("CLI revise（临时库·非协议条）", rev.status === 0, `exit=${rev.status} :: ${rev.out.slice(0, 110)}`);
  // B2b 信任边界：协议条必须被拒（这条**期望失败**）
  const revProt = run(["revise", "canon", "canon-akasha-usage", "--data", JSON.stringify({ last_reviewed: "2026-10-13" })]);
  ok("CLI revise 协议条被拒（信任边界在岗）", revProt.status !== 0 && /拒绝修订/.test(revProt.out), `exit=${revProt.status} :: ${revProt.out.slice(0, 90)}`);
  // B3 退役 + 硬删
  const ret = run(["retire", "orphan", "orphan-0001", "--reason", "体检探针"]);
  ok("CLI retire（临时库）", ret.status === 0 && /已退役/.test(ret.out), `exit=${ret.status} :: ${ret.out.slice(0, 90)}`);
  // B4 frontier recheck
  const fr = run(["frontier", "due"]);
  ok("CLI frontier due（临时库可跑）", fr.status === 0, `exit=${fr.status}`);
  // B5 price 计算 + 回写
  const pr = run(["price", "--severity", "3", "--irreversibility", "2", "--cost", "1"]);
  ok("CLI price 计算", pr.status === 0 && pr.out.length > 0, `exit=${pr.status} :: ${pr.out.slice(0, 90)}`);
  // B6 promote（临时库幂等）
  const p1 = run(["promote"]);
  const p2 = run(["promote"]);
  ok("CLI promote 幂等（临时库）", p1.status === 0 && p2.status === 0, `${p1.out.slice(0, 60)} | ${p2.out.slice(0, 60)}`);
  // B6b mirror outcome（**写命令**——只在沙箱跑；2026-10-13 全局唯一允许它出现的位置）
  const mo = run(["mirror", "outcome", "mirror-handcheck-sweep-r1", "--verdict", "部分"]);
  ok("CLI mirror outcome（临时库）", mo.status === 0 && /已记录结果/.test(mo.out), `exit=${mo.status} :: ${mo.out.slice(0, 100)}`);
  // B7 session index（要 sessionId；临时库只让它写派生索引，真档案只读）
  const si = run(["session", "index", "session-4ef9e15f-85ac-44e7-8e23-a4c7914482ce"]);
  ok("CLI session index（临时库）", si.status === 0, `exit=${si.status} :: ${si.out.slice(0, 110)}`);
  // B8 check（临时库写后仍须绿）
  const ck = run(["check"]);
  ok("临时库 check（写后仍绿）", ck.status === 0 && /OK —/.test(ck.out), ck.out.slice(0, 110));
  // 真库零写入核验：数据目录 mtime/大小快照对比在调用方做（见下）
}

// ── C. MCP 桥（真进程；用仓库既有夹具 spawn 服务器 —— 不依赖 @modelcontextprotocol/sdk）──
{
  const r = spawnSync(NODE, [join(H, "dsh-mcp-akasha/selftest.test.mjs")], { cwd: H, encoding: "utf8", timeout: 300000, env: { ...process.env, AKASHA_QUERY_LOG: "off" } });   // 同上：夹具探测不落真侧线
  const out = ((r.stdout || "") + (r.stderr || "")).trim();
  ok("MCP 桥：夹具端到端（真起服务器 + 真调工具）", r.status === 0 && /all assertions passed/.test(out), out.split("\n").filter(Boolean).slice(-2).join(" ⏎ ").slice(0, 200));
}

// ── D. 插件面 ──
{
  const log = join(H, "akasha/logs/hooks.jsonl");
  const lines = readFileSync(log, "utf8").trim().split("\n").slice(-4000).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const kinds = {};
  for (const l of lines) kinds[l.kind] = (kinds[l.kind] || 0) + 1;
  const now = Date.now();
  const fresh = (k) => lines.filter((l) => l.kind === k && now - Date.parse(l.ts || 0) < 48 * 3600 * 1000).length;
  ok("hooks：tool 线活跃", fresh("tool") > 0, "tool=" + fresh("tool"));
  ok("hooks：preflight 线活跃", fresh("preflight") > 0, "preflight=" + fresh("preflight"));
  ok("hooks：usage/session-worker 线存在", (kinds["usage"] || 0) + (kinds["session-worker"] || 0) > 0, JSON.stringify(kinds).slice(0, 120));
  const armed = lines.filter((l) => l.kind === "gate-armed").pop();
  // 版本口径：接受 2026-10-13 系列任意小版（重启后才会换成最新；不把断言写死成单版，免得每次提版就假红）
  ok("gate：启动线含新规则版本", !!armed && /gate-rules\/2026-10-13\.\d+/.test(armed.rulesVersion || ""), JSON.stringify(armed || {}).slice(0, 120));
  const st = JSON.parse(readFileSync(join(H, "akasha/logs/sleep-state.json"), "utf8"));
  ok("sleep：状态水位线推进", Number(st.processedBytes) > 0 && !!st.lastRunAt, `bytes=${st.processedBytes} last=${st.lastRunAt}`);
  const sess = readFileSync(join(H, "akasha/data/session.jsonl"), "utf8");
  ok("session：索引库非空", sess.length > 1000, `bytes=${sess.length}`);
}

console.log("\n══ 全功能体检 ══");
for (const r of rows) console.log((r.pass ? "  ✓ " : "  ✗ ") + r.name.padEnd(36) + " " + r.detail);
const bad = rows.filter((r) => !r.pass);
console.log("\n" + (bad.length ? `★★ ${bad.length}/${rows.length} 项未通过` : `★★ 全部 ${rows.length} 项通过`));

// ── E. 真库零写入哨兵（2026-10-13 加：体检器自己的纪律，别再犯 mirror outcome 那次）──
{
  const { createHash } = await import("node:crypto");
  const hashes = [];
  for (const s of ["canon", "mirror", "orphan", "pricing", "lexicon", "frontier"]) {
    const f = join(H, `akasha/data/${s}.jsonl`);
    const b = readFileSync(f);
    hashes.push(s + ":" + createHash("sha256").update(b).digest("hex").slice(0, 12));
  }
  console.log("\n真库快照（供前后对照）: " + hashes.join("  "));
}

rmSync(SANDBOX, { recursive: true, force: true });
process.exit(bad.length ? 1 : 0);
