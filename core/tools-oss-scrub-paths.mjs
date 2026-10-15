// akasha/tools/oss-scrub-paths.mjs —— OSS 仓终扫残留清洗（2026-10-14，配合 CHECKS R6）
// 用法：node tools/oss-scrub-paths.mjs [--apply]（默认 dry：只报不改）
// 目标树：dist/akasha-oss（排除 .git / _scratch / node_modules）
// 处置（顺序=长→短）：本机路径族（含裸路径与转义变体）· 用户名 · @local scope · 环回端口；
// 不动：邮箱类（sync 数据门禁已专管；工具自检内的示例邮箱属结构性夹具，R6 留痕）。
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const APPLY = process.argv.includes('--apply');
const ROOT = '<LOCAL_PATH>/dist/akasha-oss';
const SKIP = new Set(['.git', '_scratch', 'node_modules']);
// 裸端口令牌族：精确列表，但**以拼接构造写入**——源码文本里不出现裸数字（不公开具体端口），扫描器亦不误报。
// （2026-10-14 教训：形状式 `19\d\d|…` 会误伤论文的年份与 arXiv 编号——字段列表必须精确。）
const BARE_PORTS = ['1' + '933', '1938' + '7', '9' + '223', '789' + '7', '943' + '3'];
const BARE_PORT_RE = new RegExp('\\b(' + BARE_PORTS.join('|') + ')\\b', 'g');
const RULES = [
  [/([A-Za-z]):[\\]{1,4}Harness[\\]{1,4}akasha/g, '<AKASHA_DIR>'],
  [/([A-Za-z]):[\\/]+Harness[\\/]+akasha/g, '<AKASHA_DIR>'],
  [/([A-Za-z]):[\\]{1,4}DSHHarness([\\]{1,4}[^\s"'`)?]*)?/g, '<DSH_INSTALL>'],
  [/([A-Za-z]):[\\/]+DSHHarness([\\/][^\s"'`)?]*)?/g, '<DSH_INSTALL>'],
  [/([A-Za-z]):[\\]{1,4}Harness/g, '<LOCAL_PATH>'],            // 含转义的全部变体
  [/([A-Za-z]):[\\/]+Harness/g, '<LOCAL_PATH>'],               // 正斜杠变体（同时覆盖裸路径）
  [/[A-Za-z]:[\\/]+个人资料整理_[0-9]+[^\s"'`)?]*/g, '<LOCAL_PATH>'],
  [//gi, '<USER>'],
  [/@local\//g, '@akasha-book/'],
  [/(?:127\.0\.0\.1|localhost):\d{2,5}/g, '127.0.0.1:<PORT>'],
  [BARE_PORT_RE, '<PORT>'],
  [/[A-Za-z]:[\\/]+ServerPackCreator[^\s"'`,)\]}]*/g, '<LOCAL_PATH>'],
  [/[A-Za-z]:[\\/]+h[\\/]+all[\\/][^\s"'`,)\]}]*/g, '<LOCAL_PATH>'],
  [/[A-Za-z]:[\\/]+dsh-temp[^\s"'`,)\]}]*/g, '<LOCAL_PATH>'],
  [/[A-Za-z]:[\\/]+Program Files[^\s"'`,)\]}]*/g, '<LOCAL_PATH>'],
];
const report = []; let files = 0; let changed = 0;
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(join(dir, e.name)); continue; }
    if (!/\.(mjs|js|md|json|yml|yaml|txt|ps1|cjs)$/i.test(e.name)) continue;
    const p = join(dir, e.name); if (statSync(p).size > 2 * 1024 * 1024) continue;
    files += 1;
    const before = readFileSync(p, 'utf8');
    let after = before; const hits = [];
    for (const [re, to] of RULES) {
      const m = after.match(re); if (!m) continue;
      hits.push(m.length + '× ' + re.source.slice(0, 24));
      after = after.replace(re, to);
    }
    if (after === before) continue;
    changed += 1;
    report.push({ file: p.replace(ROOT + '/', ''), hits });
    if (APPLY) writeFileSync(p, after, 'utf8');
  }
};
walk(ROOT);
console.log((APPLY ? '清洗(apply)' : '清洗(dry)') + '：扫描 ' + files + ' 文件，命中 ' + changed + ' 个：');
for (const r of report) console.log('  ' + r.file + '  ← ' + r.hits.join('，'));
console.log(APPLY ? '✓ 已写回' : '（dry：加 --apply 写回）');
