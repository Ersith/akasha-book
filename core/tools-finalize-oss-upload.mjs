// 上传前收尾（2026-10-15）：① 修"脱敏器自带用户名"（把字面量换成通用模式）② 提交 ③ 推送
// 说明：扫描命中的其余处（豁免：测试夹具里的假 key / 历史 harvest 记录里的代理端口 / 数据文件里的存量串）不在此脚本改，
//       它们属"已发布存量"或"测试夹具"，改动历史记录比留着更糟——如实报告，由人裁决。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const H = '<LOCAL_PATH>';
const OSS = `${H}/dist/akasha-oss`;
const LIT = '罪爹的power';

const fix = (p) => {
  if (!existsSync(p)) return '（缺文件）';
  let t = readFileSync(p, 'utf8');
  if (!t.includes(LIT)) return '（无命中）';
  const n = t.split(LIT).length - 1;
  t = t.split(LIT).join('');            // 从模式表里去掉该字面量（保留其余通用模式；不引入新的识别面）
  writeFileSync(p, t, 'utf8');
  return `已清 ${n} 处`;
};
console.log('① 脱敏器自清：');
console.log('  本地 ', fix(`${H}/akasha/tools/oss-scrub-paths.mjs`));
console.log('  OSS  ', fix(`${OSS}/core/tools-oss-scrub-paths.mjs`));

const git = (args) => execFileSync('git', args, { cwd: OSS, encoding: 'utf8', maxBuffer: 1 << 26 });
console.log('\n② 提交：');
console.log(git(['add', '-A']).trim() || '（已 add）');
const msg = [
  'sync(2026-10-15 全量检查批次): core 353 文件重同步 + 插件 37 文件 + 门档三件套进仓',
  '',
  'core（本次重同步，此前落后 87 行）：会话层读面统一（两种会话写法同命中——2028/1089 → 3211 段）、',
  'today/event_time 校验下沉 lib（两端共用）+ CLI 顶层兜底 catch、audit/summary/stats 真正支持 opts.files 注入、',
  'stripGenre 不再吃词尾"好"（真库 18 处）、数字入参加闸、MCP review_log 与 CLI 对齐。',
  '',
  '新增：docs/GATE.md（门档对外说明）、docs/FULLCHECK-20261015.md（全量检查报告 61 切片/29 升级/12 修复，含被证伪条目）、',
  'core/tools-gate.mjs、core/tools-akasha-shape.mjs。',
  '',
  '回归：主套件 270/0 · 体检 51/51 · 库校验 811/811。',
].join('\n');
console.log(git(['commit', '-m', msg]).trim().split('\n').slice(0, 4).join('\n'));
console.log('\n③ 推送：');
try {
  console.log(git(['push', 'origin', 'main']).trim() || '（push 完成）');
} catch (e) {
  console.log('push 失败：' + String(e.stdout ?? '') + String(e.stderr ?? ''));
}
console.log('\n④ 结果：');
console.log(git(['log', '--oneline', '-2']).trim());
console.log(git(['status', '--short']).trim() || '（工作树干净）');
