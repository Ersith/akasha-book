// sync-core-to-oss.mjs —— core 侧正式同步器（2026-10-11 用户令「开搞」收尾；根除"手工复制冲坏 OSS 适配"的雷）
//   为什么需要它：`core/` **不在** oss-sync 的同步范围（oss-sync 只同步 `plugins/*`）⇒ 过去一直是手工 Copy-Item
//   ⇒ ① 活树路径（`../plugins/akasha-gate/`）被原样带进仓里 ⇒ 模块找不到；② 每次覆盖都会把 OSS 侧的适配冲掉。
//   做法：固定清单 + **同一套映射**（路径/本机路径 → 占位符）+ **逐文件语法校验**；跑完可选跑 OSS 测试。
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const LIVE = '<AKASHA_DIR>';
const OSS_CORE = '<LOCAL_PATH>/dist/akasha-oss/core';
const NODE = '<DSH_INSTALL>';

// 固定清单：源码 + 文档（不含 data/，数据由 sync-data-to-oss.mjs 专管）
const FILES = ['lib.mjs', 'session.mjs', 'sleep.mjs', 'akasha.mjs', 'mcp.mjs', 'test.mjs', 'loop-detect.mjs', 'SCHEMA.md', 'PROTOCOL.md', 'MEMORY-TEST.md', 'CHECKS.md'];

const MAP = [
  [/\.\.\/dsh-akasha-([a-z]+)\//g, '../plugins/akasha-$1/'],
  [/'dsh-mcp-akasha\//g, "'plugins/mcp-akasha/"],
  [/\.\.\/akasha\//g, '../../core/'],
  // 2026-10-14 · R6 补：旧映射对「转义变体 / 裸路径 / @local」覆盖不全（首扫 53 文件残留）——按长→短补齐
  [/@local\//g, '@akasha-book/'],
  [/"\.\/tools\/([a-z0-9-]+)\.mjs"/g, '"./tools-$1.mjs"'],       // 2026-10-14 R30：仓内 tools 扁平命名（tools-*.mjs）——import 须同步改写（test.mjs → tools/checker-selftest.mjs 曾因此跑不起来）
  [/'\.\/tools\/([a-z0-9-]+)\.mjs'/g, "'./tools-$1.mjs'"],
  [/'\.\.\/tools\/([a-z0-9-]+)\.mjs'/g, "'./tools-$1.mjs'"],
  [/"\.\.\/tools\/([a-z0-9-]+)\.mjs"/g, '"./tools-$1.mjs"'],
  [/(from\s+['"])\.\.\/(lib|session|sleep|mcp|loop-detect)\.mjs(['"])/g, '$1./$2.mjs$3'],   // 扁平化后同目录引用（tools-X.mjs 的 '../lib.mjs' → './lib.mjs'）
  // 2026-10-17 发版：`tools/migrate-20261015-compact-session.mjs` 依赖同目录 `session-key.mjs`；
  //   OSS 侧 tools 全部扁平成 `core/tools-<名>.mjs` ⇒ 该 import 必须跟着改名（否则 ERR_MODULE_NOT_FOUND）。
  [/from '\.\/session-key\.mjs'/g, "from './tools-session-key.mjs'"],
  [/from "\.\/session-key\.mjs"/g, 'from "./tools-session-key.mjs"'],
  [/([A-Za-z]):[\\]{1,4}Harness[\\]{1,4}akasha/g, '<AKASHA_DIR>'],
  [/([A-Za-z]):[\\/]+Harness[\\/]+akasha/g, '<AKASHA_DIR>'],
  [/([A-Za-z]):[\\]{1,4}DSHHarness([\\]{1,4}[^\s"'`)?]*)?/g, '<DSH_INSTALL>'],
  [/([A-Za-z]):[\\/]+DSHHarness([\\/][^\s"'`)?]*)?/g, '<DSH_INSTALL>'],
  [/([A-Za-z]):[\\]{1,4}Harness/g, '<LOCAL_PATH>'],
  [/([A-Za-z]):[\\/]+Harness/g, '<LOCAL_PATH>'],
  [/[A-Za-z]:[\\/]+个人资料整理_[0-9]+[^\s"'`)?]*/g, '<LOCAL_PATH>'],
  [/[A-Za-z]:[\\/]+Harness[\\/]+akasha/g, '<AKASHA_DIR>'],
  [/[A-Za-z]:[\\/]+Harness[\\/]+dsh-akasha-([a-z]+)/g, '<AKASHA_DIR>/../plugins/akasha-$1'],
  [/[A-Za-z]:[\\/]+Harness[\\/]+dsh-mcp-akasha/g, '<AKASHA_DIR>/../plugins/mcp-akasha'],
  [/[A-Za-z]:[\\/]+DSHHarness[\\/]+[^\s"'`)]*/g, '<DSH_INSTALL>'],
  [/[A-Za-z]:[\\/]+个人资料整理_[0-9]+[^\s"'`)]*/g, '<LOCAL_PATH>'],
  [/[A-Za-z]:[\\/]+Harness[\\/]+[^\s"'`)]*/g, '<LOCAL_PATH>'],
];

if (!existsSync(OSS_CORE)) mkdirSync(OSS_CORE, { recursive: true });
let copied = 0, checked = 0, bad = [];
// 2026-10-17 发版：`tools/oss-scrub-paths.mjs` 的整体就是「给本机路径做替换用的正则字面量」，
//   经下面这张 MAP 再映射一次必被改坏（实测 `];` 处 Unexpected token）⇒ 跳过。OSS 侧不需要这个清洗器。
const SKIP = new Set(['tools/oss-scrub-paths.mjs']);
for (const f of FILES) {
  if (SKIP.has(f)) continue;
  let text;
  try { text = readFileSync(LIVE + '/' + f, 'utf8'); } catch { continue; }
  let out = text;
  for (const [re, to] of MAP) out = out.replace(re, to);
  writeFileSync(OSS_CORE + '/' + f, out, 'utf8');
  copied += 1;
  if (f.endsWith('.mjs')) {
    try { execFileSync(NODE, ['--check', OSS_CORE + '/' + f], { stdio: 'pipe' }); checked += 1; }
    catch { bad.push(f); }
  }
}
// tools/*.mjs → core/tools-<name>.mjs（同一映射）
let tools = 0;
for (const t of readdirSync(LIVE + '/tools').filter((x) => x.endsWith('.mjs') && x !== 'oss-scrub-paths.mjs')) {
  // 2026-10-17 发版：跳过 `oss-scrub-paths.mjs`——它整份就是"给本机路径做替换的正则字面量"，
  //   再经 MAP 映射一次必被改坏（实测 `];` 处 Unexpected token）。OSS 侧不需要这个清洗器。
  let out = readFileSync(LIVE + '/tools/' + t, 'utf8');
  for (const [re, to] of MAP) out = out.replace(re, to);
  const dst = OSS_CORE + '/tools-' + t;
  writeFileSync(dst, out, 'utf8');
  tools += 1;
  try { execFileSync(NODE, ['--check', dst], { stdio: 'pipe' }); checked += 1; }
  catch { bad.push('tools-' + t); }
}
console.log('core → OSS 同步：主文件 ' + copied + ' · tools ' + tools + ' · 语法校验通过 ' + checked + (bad.length ? ' · ✗ 失败 ' + bad.join(', ') : ' · ✓ 全部通过'));
console.log('  映射口径：../dsh-akasha-* → ../plugins/akasha-* · 本机路径 → <AKASHA_DIR>/<LOCAL_PATH>/<DSH_INSTALL>');
console.log('  ⚠ data/ 不在此脚本范围（见 tools/sync-data-to-oss.mjs，含敏感串门禁）');
if (bad.length) process.exit(2);
