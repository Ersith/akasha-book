// sync-data-to-oss.mjs —— (a) 六库数据同步到 OSS（2026-10-11 用户裁定「a 也要做」：判断与教训可公开，无不可说隐私）。
//   **范围**：六库数据（canon/frontier/mirror/orphan/pricing/lexicon）→ OSS `core/data/`；
//            **排除会话层 `session.jsonl`**（那是原始对话 L0，体积大且含完整对话，不进 OSS）。
//   **门禁（机械验证，不凭感觉）**：同步前扫描密钥/令牌/密码/邮箱/本机用户名/本机绝对路径 ⇒ 有则**拒绝同步**并列出。
//   **脱敏**：路径替换为占位符（与 oss-sync 同口径）：<AKASHA_DIR> / <LOCAL_PATH> / <DSH_INSTALL> / <USER_HOME>。
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from 'node:fs';

const SRC = '<AKASHA_DIR>/data';
const DST = '<LOCAL_PATH>/dist/akasha-oss/core/data';
const SKIP = new Set(['session.jsonl']);   // 会话层原文不进 OSS

// 判据实例（带 g，供 match 计量；.test 侧一律另建非 g 副本，见门禁循环）
const GIT_PREFIX = /(?:git|oauth2)@(?:github\.com|gitlab\.com)/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

const SECRET_PATTERNS = [
  ['API key（sk- 前缀）', /sk-[A-Za-z0-9]{16,}/g],
  ['令牌（Bearer / gh*_ / npm_）', /(Bearer\s+[A-Za-z0-9._-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|npm_[A-Za-z0-9]{20,})/g],
  ['password/secret/token 赋值', /(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["'][^"']{6,}/gi],
  ['邮箱', EMAIL],
  // 2026-10-12 允许（用户裁定）：公开 git 主机前缀（git@github.com / oauth2@gitlab.com）不是邮箱，
  // 属 ssh URL / OAuth 的公开写法；本文件里它们出现在讲述「脱敏正则别误伤 git 前缀」的记录正文中，被判据自身误伤。
  // 判据收窄只放行这两个前缀 + 这两个主机，其余 `user@…` 形态照旧拦。
  ['公开 git 主机前缀（非邮箱）', GIT_PREFIX, 'strip'],
  ['本机用户名路径', /[A-Za-z]:[\\/]Users[\\/][A-Za-z0-9._-]+/g],
];

// —— 门禁自检（常量级，跑在扫描之前；2026-10-12 加）——
//   为什么：① strip 模式是「检查视图」手术，必须自证「剥离干净 + 真阳性仍拦」；
//   ② 教训——把「采样判据」放进逐文件循环当恒真自检用会**自检自爆**（库里真有邮箱是正常态，不是失败）。
//   三例：正例（真邮箱必拦）· 反例（git 前缀剥离后必不拦）· 侧例（a@b.com 形态仍拦，防剥离过宽）。
// 2026-10-14 · 第二例「判据被自己描述的对象误伤」（首次＝git 前缀，见上）：
//   canon-oss-data-sync-20261012 条目正文**引用了 `a@b.com` 这个占位示例**（它在讲本门禁的自检侧例）⇒ 门禁把
//   「描述门禁的文本」当成「真邮箱」拦下。**处置（不改原文、不放宽真邮箱）**：**占位示例邮箱在 OSS 副本里
//   替换为 `<EMAIL>` 并计数**——即「原样不放行」立场不变，它被**替换**而非放行。名单保守：只列实测命中串。
const PLACEHOLDER_EMAILS = ['a@b.com'];
function gateOn(text) {
  let scan = text;
  for (const [, re, mode] of SECRET_PATTERNS) if (mode === 'strip') scan = scan.split(new RegExp(re.source, re.flags)).join(' ');
  let replaced = 0;
  for (const e of PLACEHOLDER_EMAILS) { const n = scan.split(e).length - 1; if (n) { replaced += n; scan = scan.split(e).join('<EMAIL>'); } }
  const hits = [];
  for (const [name, re, mode] of SECRET_PATTERNS) {
    if (mode === 'strip') continue;
    const rx = new RegExp(re.source, re.flags.replace('g', ''));   // 非 g 新实例（g 复用会给 test 留下 lastIndex 残留）
    const m = scan.match(rx);
    if (m) hits.push({ name, n: m.length, eg: String(m[0]).slice(0, 40) });
  }
  return { scan, hits, replaced };
}
function assertGateSelfTest() {
  const bad = [];
  const pos = gateOn('联系人 real.person@corp.cn 在此');                        // 正：必须拦
  if (!pos.hits.some((h) => h.name === '邮箱')) bad.push('正例失败：真邮箱未被拦');
  const neg = gateOn('ssh://git@github.com 与 oauth2@gitlab.com 是公开写法');   // 反：剥离后不得拦
  if (neg.hits.length) bad.push('反例失败：git 前缀未被剥离（' + neg.hits.map((h) => h.name).join(',') + '）');
  const side = gateOn('顺手写个 a@b.com 形态');                                  // 侧：占位示例 ⇒ 替换、原样不放行
  if (side.hits.some((h) => h.name === '邮箱')) bad.push('侧例失败：占位邮箱未被替换（原样混过）');
  if (!(side.replaced >= 1) || !side.scan.includes('<EMAIL>')) bad.push('侧例失败：占位邮箱未计数替换');
  const side2 = gateOn('真地址 person@abc.cn 不得被占位规则放宽');               // 侧2：替换不得放宽真邮箱
  if (!side2.hits.some((h) => h.name === '邮箱')) bad.push('侧例2失败：占位替换规则放宽了真邮箱');
  if (bad.length) { console.log('✗ 门禁自检失败 ⇒ 拒绝同步：' + bad.join('；')); process.exit(3); }
  console.log('✓ 门禁自检通过（正例拦真邮箱 / 反例剥 git 前缀 / 侧例占位替换 / 侧例2不放宽真邮箱）');
}
assertGateSelfTest();

const files = readdirSync(SRC).filter((f) => f.endsWith('.jsonl') && !SKIP.has(f)).sort();
console.log('源目录 ' + SRC + '：' + files.length + ' 个库文件（排除 ' + [...SKIP].join(', ') + '）');
let totalHits = 0;
for (const f of files) {
  const p = SRC + '/' + f;
  const text = readFileSync(p, 'utf8');
  const kb = Math.round(statSync(p).size / 1024);
  const hits = [];
  // 先应用 strip 模式（2026-10-12）：公开 git 主机的 `git@`/`oauth2@` 不是邮箱——只从「检查视图」里剥掉，
  // 其余模式照常跑在被剥过的视图上（真邮箱如 a@b.com 仍会命中；钉边断言见下方自检）。
  let scan = text; let replaced = 0;
  for (const [name, re, mode] of SECRET_PATTERNS) {
    if (mode !== 'strip') continue;
    scan = scan.split(new RegExp(re.source, re.flags)).join(' ');
  }
  for (const e of PLACEHOLDER_EMAILS) { const n = scan.split(e).length - 1; if (n) { replaced += n; scan = scan.split(e).join('<EMAIL>'); } }   // 占位示例邮箱：替换（2026-10-14）
  for (const [name, re, mode] of SECRET_PATTERNS) {
    if (mode === 'strip') continue;
    const rx = new RegExp(re.source, re.flags.replace('g', ''));   // 每次新建非 g 实例（g 复用会给 test 留下 lastIndex 残留）
    const m = scan.match(rx);
    if (m) { totalHits += m.length; hits.push(name + '×' + m.length + '（例：' + String(m[0]).slice(0, 50) + '）'); }
  }
  // 自检位置修正（2026-10-12）：常量自检**移出逐文件循环**——见文件末尾 assertGateSelfTest()。
  //   教训：把「采样判据」（逐文件跑，命中与否都正常）当「恒真自检」用 ⇒ 自检自爆（库里真有邮箱正是正常态）。
  console.log('  ' + f.padEnd(16) + String(kb).padStart(5) + ' KB' + (replaced ? '  ↺ 占位邮箱×' + replaced + '（→ <EMAIL>）' : '') + (hits.length ? '  ⚠ ' + hits.join('；') : '  ✓'));
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
    .replace(/[A-Za-z]:[\\/]+个人资料整理_[0-9]+[^\s"'`)]*/g, '<LOCAL_PATH>')
    // 2026-10-14（用户提醒「公开仓，去隐私与我们的 API」）：环境事实族加宽——代理/回环端口与其余本机路径族
    .replace(/(?:127\.0\.0\.1|localhost):\d{2,5}/g, '127.0.0.1:<PORT>')   // 数据侧只脱敏「带冒号」形（裸数字形会误伤年份/计数等正文，故不做——2026-10-14 裁定）
    .replace(/[A-Za-z]:[\\/]+ServerPackCreator[^\s"'`,)\]}]*/g, '<LOCAL_PATH>')
    .replace(/[A-Za-z]:[\\/]+h[\\/]+all[\\/][^\s"'`,)\]}]*/g, '<LOCAL_PATH>')
    .replace(/[A-Za-z]:[\\/]+dsh-temp[^\s"'`,)\]}]*/g, '<LOCAL_PATH>')
    .replace(/[A-Za-z]:[\\/]+Program Files[^\s"'`,)\]}]*/g, '<LOCAL_PATH>');
  for (const e of PLACEHOLDER_EMAILS) text = text.split(e).join('<EMAIL>');   // 占位示例邮箱 → <EMAIL>（2026-10-14；与门禁口径一致）
  writeFileSync(DST + '/' + f, text, 'utf8');
  written++;
  bytes += Buffer.byteLength(text, 'utf8');
  console.log('  → core/data/' + f + '（' + Math.round(Buffer.byteLength(text, 'utf8') / 1024) + ' KB）');
}
console.log('✓ 已写入 ' + written + ' 个文件，共 ' + Math.round(bytes / 1024) + ' KB → ' + DST);
console.log('  注意：会话层 session.jsonl **未同步**（原始对话不进 OSS）。');
