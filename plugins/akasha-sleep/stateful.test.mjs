// stateful.test.mjs —— C3 自测：正向 / 跳过注入段 / 去重 / 关闭双停 / 与 C1 优先级联动
import { apply } from "./lib/index.js";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const FIX = "H:\\Harness\\_ab\\stateful-fixture";

function makeFixture(intentGists) {
  rmSync(FIX, { recursive: true, force: true });
  mkdirSync(join(FIX, "data"), { recursive: true });
  mkdirSync(join(FIX, "logs"), { recursive: true });
  writeFileSync(join(FIX, "lib.mjs"),
    "export const RECALL_TRAP_MAP = { edit: [\"canon-trap-edit-context-mismatch\"], read: [\"canon-trap-read-offset-range\"] };\n", "utf8");
  const lines = intentGists.map((g, i) => JSON.stringify({ store: "session", session: "s1", seq: i + 1, time: new Date().toISOString(), kind: "intent", gist: g }));
  writeFileSync(join(FIX, "data", "session.jsonl"), lines.join("\n") + "\n", "utf8");
}

function run(cfg, failures = []) {
  const rows = [];
  const handlers = {};
  const ctx = {
    systemPrompt: { context: (r) => rows.push(r) },
    tools: { register() {}, guard() {} },
    on(n, fn) { (handlers[n] ||= []).push(fn); },
    logger: { info() {} },
    config: cfg,
  };
  apply(ctx, cfg);
  for (const t of failures) for (const fn of handlers["tools/result"] || []) fn({ name: t }, { isError: true });
  return { rows, row: (n) => rows.find((r) => r.name === n) };
}

let pass = 0, fail = 0;
const T = (n, c, extra = "") => { if (c) { pass++; console.log("  PASS " + n); } else { fail++; console.log("  FAIL " + n + (extra ? "  " + extra : "")); } };

// ① 正向：用户问"1.2.3 是否已发布" ⇒ C3 应触发
makeFixture(["Current runtime context. 阿卡夏·睡眠：...", "demo-pkg 的 1.2.3 是否已发布？给依据"]);
let { rows, row } = run({ akashaDir: FIX, statefulGate: true, preflightHints: true });
let c3 = row("akasha:stateful");
T("① 注册 akasha:stateful", !!c3, JSON.stringify(rows.map((r) => r.name)));
T("① order=134（先于 C1 的 135）", c3 && c3.order === 134, String(c3 && c3.order));
const line = c3 && c3.text();
T("① 渲染出提醒行", typeof line === "string" && line.includes("[断言提醒]"), String(line));
T("① ≤80 字", !!line && line.length <= 80, String(line && line.length));
T("② 同类 30 分钟去重（二次 null）", typeof line === "string" && c3.text() === null);

// ③ 只有注入样式段 ⇒ 不触发
makeFixture(["Current runtime context. 阿卡夏·库脉搏：canon 124", "阿卡夏·称呼：① Master"]);
({ rows, row } = run({ akashaDir: FIX, statefulGate: true }));
c3 = row("akasha:stateful");
T("③ 注入样式段不触发", !!c3 && c3.text() === null, String(c3 && c3.text()));

// ④ 关闭 ⇒ 不注册、无事件
makeFixture(["demo-pkg 是否已发布"]);
({ rows, row } = run({ akashaDir: FIX, statefulGate: false }));
T("④ 关闭时不注册 akasha:stateful", !rows.some((r) => r.name === "akasha:stateful"));
let hooksTxt = ""; try { hooksTxt = readFileSync(join(FIX, "logs", "hooks.jsonl"), "utf8"); } catch { /* 文件不存在＝无事件 */ }
T("④ 关闭时无 stateful-reminder 事件", !hooksTxt.includes("stateful-reminder"));

// ⑤ 优先级联动：C3 命中时 C1 让位（即便有近期失败）
makeFixture(["1.2.3 是否已发布"]);
({ rows, row } = run({ akashaDir: FIX, statefulGate: true, preflightHints: true }, ["edit"]));
const l3 = row("akasha:stateful").text();
const l1 = row("akasha:preflight").text();
T("⑤ C3 命中时有提醒行", typeof l3 === "string", String(l3));
T("⑤ 同回合 C1 让位（null）", l1 === null, String(l1));
let hooksTxt2 = ""; try { hooksTxt2 = readFileSync(join(FIX, "logs", "hooks.jsonl"), "utf8"); } catch { /* 同上 */ }
T("⑤ 开启了 stateful-reminder 事件", hooksTxt2.includes("stateful-reminder"));

console.log("\n  " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
