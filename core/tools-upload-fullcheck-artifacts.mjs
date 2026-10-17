// 第二轮上传（2026-10-15）：把原始产物（切片/裁决/升级清单）+ 重新生成的报告一起进仓，供外部逐条核对
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const H = '<LOCAL_PATH>';
const OSS = `${H}/dist/akasha-oss`;
const G = `${H}/akasha/gate-out/full-check-20261015`;
const DEST = join(OSS, 'docs/fullcheck-20261015');
mkdirSync(DEST, { recursive: true });

const MAP = [
  [/<AKASHA_DIR>/g, '<akasha>'], [/<AKASHA_DIR>/g, '<akasha>'],
  [/<LOCAL_PATH>/g, '<workspace>'], [/<LOCAL_PATH>/g, '<workspace>'],
  [/@local\//g, '@akasha-book/'],
  [/罪爹的power/g, '<user>'],
  [/127\.0\.0\.1:\d{4,5}/g, '<loopback>'],
];
const mapText = (t) => MAP.reduce((s, [re, to]) => s.replace(re, to), t);

const copied = [];
const copyMapped = (src, dst) => {
  if (!existsSync(src)) return false;
  writeFileSync(join(DEST, dst), mapText(readFileSync(src, 'utf8')), 'utf8');
  copied.push(dst);
  return true;
};
// ① 报告（重新生成后的最新版）
copyMapped(`${H}/akasha/FULLCHECK-20261015.md`, 'FULLCHECK-20261015.md');
// ② 原始产物（供逐条核）：切片 5 份 + 升级清单 + A 路裁决
for (const f of readdirSync(join(G, 'slices'))) if (f.endsWith('.jsonl')) copyMapped(join(G, 'slices', f), `slices-${f}`);
copyMapped(join(G, 'escalate.json'), 'escalate.json');
copyMapped(join(G, 'verdict.json'), 'verdict-A.json');
// ③ 批次元信息
writeFileSync(join(DEST, 'README.md'), [
  '# 全量检查原始产物（2026-10-15）',
  '',
  '本目录是 `FULLCHECK-20261015.md` 的**可核对底稿**：切片（每条带 `falsifier`＝什么最小实验能让它挂掉）、机检升级清单、A 路裁决。',
  '路径已按发布铁律脱敏（本机路径 → `<workspace>`/`<akasha>`，包名 → `@akasha-book/`）。',
  '',
  '- `slices-*.jsonl`：5 个文件的切片（**61 条**，每条一个可证伪指控）',
  '- `escalate.json`：机检升级裁决（**29 点** A1 28/A2 1 + 自证包完整性）',
  '- `verdict-A.json`：A 路（cli-mcp + core）逐条裁决；B 路 8 条见报告 §3（其落盘件含断字，已按回执转录）',
  '',
  '复现命令见报告 §0。',
].join('\n') + '\n', 'utf8');

const git = (a) => execFileSync('git', a, { cwd: OSS, encoding: 'utf8', maxBuffer: 1 << 26 });
console.log('已写入：' + copied.join(' · '));
console.log(git(['add', '-A']).trim() || '（已 add）');
console.log(git(['commit', '-m', 'docs(fullcheck): 全量检查报告 + 原始产物底稿（61 切片 / 29 升级 / A 路裁决），供外部逐条核对']).trim().split('\n').slice(0, 3).join('\n'));
try { console.log(git(['push', 'origin', 'main']).trim() || '（push 完成）'); } catch (e) { console.log('push 失败：' + String(e.stdout ?? '') + String(e.stderr ?? '')); }
console.log(git(['log', '--oneline', '-2']).trim());
