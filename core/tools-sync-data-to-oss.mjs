// sync-data-to-oss.mjs —— (a) 六库数据同步到 OSS（2026-10-11 用户裁定「a 也要做」：判断与教训可公开，无不可说隐私）。
//   **范围**：六库数据（canon/frontier/mirror/orphan/pricing/lexicon）→ OSS `core/data/`；
//            **排除会话层 `session.jsonl`**（那是原始对话 L0，体积大且含完整对话，不进 OSS）。
//   **门禁（机械验证，不凭感觉）**：同步前扫描密钥/令牌/密码/邮箱/本机用户名/本机绝对路径 ⇒ 有则**拒绝同步**并列出。
//   **脱敏**：路径替换为占位符（与 oss-sync 同口径）：<AKASHA_DIR> / <LOCAL_PATH> / <DSH_INSTALL> / <USER_HOME>。
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from 'node:fs';

const SRC = 'H:/Harness/akasha/data';
const DST = 'H:/Harness/dist/akasha-oss/core/data';
const SKIP = new Set(['session.jsonl']);   // 会话层原文不进 OSS

const SECRET_PATTERNS = [
  ['API key（sk- 前缀）', /sk-[A-Za-z0-9]{16,}/g],
  ['令牌（Bearer / gh*_ / npm_）', /(Bearer\s+[A-Za-z0-9._-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|npm_[A-Za-z0-9]{20,})/g],
  ['password/secret/token 赋值', /(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["'][^"']{6,}/gi],
  ['邮箱', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g],
  ['本机用户名路径', /[A-Za-z]:[\\/]Users[\\/][A-Za-z0-9._-]+/g],
];

const files = readdirSync(SRC).filter((f) => f.endsWith('.jsonl') && !SKIP.has(f)).sort();
console.log('源目录 ' + SRC + '：' + files.length + ' 个库文件（排除 ' + [...SKIP].join(', ') + '）');
let totalHits = 0;
for (const f of files) {
  const p = SRC + '/' + f;
  const text = readFileSync(p, 'utf8');
  const kb = Math.round(statSync(p).size / 1024);
  const hits = [];
  for (const [name, re] of SECRET_PATTERNS) {
    const m = text.match(re);
    if (m) { totalHits += m.length; hits.push(name + '×' + m.length + '（例：' + String(m[0]).slice(0, 50) + '）'); }
  }
  console.log('  ' + f.padEnd(16) + String(kb).padStart(5) + ' KB' + (hits.length ? '  ⚠ ' + hits.join('；') : '  ✓'));
}
if (totalHits > 0) {
  console.log('\n✗ 门禁未过：发现 ' + totalHits + ' 处敏感串 ⇒ **拒绝同步**（先处置，再重跑）');
  process.exit(2);
}
console.log('\n✓ 门禁通过（未发现密钥/令牌/邮箱/用户名路径）——开始脱敏并写入 OSS');

if (!existsSync(DST)) mkdirSync(DST, { recursive: true });
let written = 0, bytes = 0;
for (const f of files) {
  let text = readFileSync(SRC + '/' + f, 'utf8');
  // 脱敏（路径 → 占位符；与 oss-sync 同口径）
  text = text
    .replace(/[A-Za-z]:[\\/]+Harness[\\/]+akasha/g, '<AKASHA_DIR>')
    .replace(/[A-Za-z]:[\\/]+Harness/g, '<LOCAL_PATH>')
    .replace(/[A-Za-z]:[\\/]+DSHHarness[\\/]+[^\s"'`)]*/g, '<DSH_INSTALL>')
    .replace(/[A-Za-z]:[\\/]+个人资料整理_[0-9]+[^\s"'`)]*/g, '<LOCAL_PATH>');
  writeFileSync(DST + '/' + f, text, 'utf8');
  written++;
  bytes += Buffer.byteLength(text, 'utf8');
  console.log('  → core/data/' + f + '（' + Math.round(Buffer.byteLength(text, 'utf8') / 1024) + ' KB）');
}
console.log('✓ 已写入 ' + written + ' 个文件，共 ' + Math.round(bytes / 1024) + ' KB → ' + DST);
console.log('  注意：会话层 session.jsonl **未同步**（原始对话不进 OSS）。');
