// 阿卡夏核心模块契约 v0（2026-10-20，P4）：只声明「谁可以 import 谁」，不承载运行逻辑。
// 目的：给 177 导出的单文件库加一条可机检的方向边界；先有基线，再谈拆模块。
// 运行：node tools/check-import-direction.mjs（CI/本地同源）；contract.assert 也可被测试调用。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CONTRACT_VERSION = 1;
export const ROOT = dirname(fileURLToPath(import.meta.url));

/** 层号越小越底层：低层不得 import 高层；同层/高层可 import 低层。 */
export const LAYERS = Object.freeze({
  base: 0,      // 零依赖 / 只依赖 stdlib 与更低层
  domain: 1,    // 数据模型与领域逻辑（session / sleep）
  io: 2,        // 进程/协议边界（mcp）
  app: 3,       // 组合入口（akasha CLI / init）
  test: 4,      // 测试可 import 任意层
});

/** 核心模块登记表；新增根级 .mjs 必须登记，否则 lint 报「未登记模块」。 */
export const MODULES = Object.freeze({
  'json-redaction.mjs': { layer: 'base', note: '脱敏原语' },
  'lib.mjs': { layer: 'base', note: '六库/读写/检索/审计核心' },
  'companion.mjs': { layer: 'base', note: 'CompanionPort 抽象' },
  'adapters.mjs': { layer: 'base', note: '外部适配器（Hindsight/OpenViking/HTTP）' },
  'loop-detect.mjs': { layer: 'base', note: '循环观测' },
  'parallel.mjs': { layer: 'base', note: '并行感知' },
  'session.mjs': { layer: 'domain', note: '会话层索引' },
  'sleep.mjs': { layer: 'domain', note: '睡眠蒸馏' },
  'mcp.mjs': { layer: 'io', note: 'MCP stdio 服务' },
  'akasha.mjs': { layer: 'app', note: 'CLI 组合入口' },
  'init-example.mjs': { layer: 'app', note: '示例库初始化' },
  'test.mjs': { layer: 'test', note: '测试入口（快照根）' },
  'test-core.mjs': { layer: 'test', note: '主测试套件' },
  'contract.mjs': { layer: 'base', note: '本契约' },
});

const IMPORT_RE = /(?:from\s+|import\s*\(\s*)['"](\.\/[^'"]+)['"]/g;

function moduleOf(raw) {
  const p = raw.replace(/^\.\//, '');
  if (!p.endsWith('.mjs')) return null;
  if (p.includes('/')) return null;              // tools/** 不在根契约内
  return basename(p);
}

/** 扫描根级核心 .mjs 的静态/动态相对 import，按层检查方向并检测环。返回 {ok, errors, edges, checked}。 */
export function checkImportDirection({ root = ROOT } = {}) {
  const errors = [];
  const edges = [];
  const seen = new Set();
  // OSS 扁平布局把 tools/ 拷成 tools-*.mjs 放在 root；它们不属于核心契约面，跳过。
  const isToolName = (n) => n.startsWith('tools-');
  const files = readdirSync(root).filter((f) => f.endsWith('.mjs') && !isToolName(f));
  for (const f of files) {
    if (!MODULES[f]) { errors.push(`未登记模块：${f}（请登记到 contract.MODULES）`); continue; }
    seen.add(f);
    const text = readFileSync(join(root, f), 'utf8').split(String.fromCharCode(10))
      .map((line) => (line.trimStart().startsWith('//') ? '' : line))
      .join(String.fromCharCode(10));
    for (const m of text.matchAll(IMPORT_RE)) {
      const target = moduleOf(m[1]);
      if (!target || target === f || isToolName(target)) continue;
      if (m[1].includes('/') && !m[1].startsWith('./')) continue;
      if (!existsSync(join(root, target))) { errors.push(`${f} 引用了不存在的模块：${m[1]}`); continue; }
      if (!MODULES[target]) { errors.push(`${f} 引用了未登记模块：${target}`); continue; }
      const from = MODULES[f].layer;
      const to = MODULES[target].layer;
      edges.push({ from: f, to: target });
      if (from !== 'test' && LAYERS[to] > LAYERS[from]) {
        errors.push(`方向错误：${f}(${from}) → ${target}(${to})；低层不得 import 高层`);
      }
    }
  }
  // 未登记但存在的根模块已报；登记了却不存在的也报（防止契约腐化）
  for (const f of Object.keys(MODULES)) if (!seen.has(f) && !existsSync(join(root, f))) errors.push(`契约登记了不存在的模块：${f}`);
  // 环检测（只针对根模块；工具子目录不参与）
  const adj = new Map(files.map((f) => [f, []]));
  for (const e of edges) if (adj.has(e.from)) adj.get(e.from).push(e.to);
  const state = new Map();
  const stack = [];
  const dfs = (n) => {
    if (state.get(n) === 2) return;
    if (state.get(n) === 1) { errors.push('import 环：' + [...stack.slice(stack.indexOf(n)), n].join(' → ')); return; }
    state.set(n, 1); stack.push(n);
    for (const m of adj.get(n) || []) dfs(m);
    stack.pop(); state.set(n, 2);
  };
  for (const f of files) if (state.get(f) !== 2) dfs(f);
  return { ok: errors.length === 0, errors, edges, checked: files.length };
}

export function assertImportDirection(opts = {}) {
  const r = checkImportDirection(opts);
  if (!r.ok) throw new Error('模块契约失败（' + r.errors.length + '）：\n' + r.errors.join('\n'));
  return r;
}
