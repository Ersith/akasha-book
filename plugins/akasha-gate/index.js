// 阿卡夏之书门控 v1.2 —— 三件可机检的事（设计稿 §10 投影律）：
//   ① tools.guard：拦下对 akasha\data\ 的直接文件写入与命令写操作（数据必须经校验路径）
//   ② systemPrompt.section：把「用法 + 来源态约定」注入系统提示（akasha:protocol）——
//      **渲染时读库当前版本 canon-akasha-usage**（库自己说话：改用法 = revise 记录，提示自动跟上）；
//      读库失败回退到本文件内置的同文兜底（FALLBACK_SECTION），渲染永不抛。
//   ③ 观测线：gate-armed 记录 usageSource（library / fallback）。
// 自身异常一律放行/静默：门控自崩不能拖垮宿主。
import { appendFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export const inject = ['tools', 'systemPrompt'];

// 默认值：家目录下的 .akasha（可用 config.akashaDir / dataDir / log 覆盖）。
const DEFAULT_AKASHA_DIR = join(homedir(), '.akasha');
const DEFAULT_DATA_DIR = join(DEFAULT_AKASHA_DIR, 'data');
const DEFAULT_LOG = join(DEFAULT_AKASHA_DIR, 'logs', 'hooks.jsonl');
const WRITE_TOOLS = new Set(['edit', 'write', 'apply_patch']);
const SHELL_TOOLS = new Set(['pwsh', 'bash']);
// 2026-10-07 复查：重定向判定排除 JS 箭头（`=>`）与 `2>&1`——`(?<![=\-])` 挡 `=>`/`->`，`(?![&=])` 挡 `>&`；
const WRITE_IDIOM = /(>>|(?<![=\-])>(?![&=])\s*[^\s|]|Set-Content|Add-Content|Out-File|Remove-Item|Move-Item|Copy-Item|New-Item|Set-Item|tee\b|sed -i|drop\b|delete\b|\bdel\b)/i;

// 读库失败时的兜底文本（与 canon-akasha-usage 初始版本同文；改兜底 = 升级本插件）。
const FALLBACK_SECTION = [
  '## 阿卡夏之书（外置大脑 · v0）',
  '- 事实性断言尽量带来源态：学过 / 接触过 / 记得·库内 / 搜到；未标注按「学过」（未核验）处理。',
  '- 排序钉子：无据的确定 ≪ 有据的不确定；编造比承认不知道更糟。',
  '- 开工先 akasha_kit（起床包：睡眠 + 待办 + 审计 + 库况）；相关主题先 akasha_brief；查库 akasha_lookup；对位 akasha_cross；基石 akasha_frontier_due；自查 akasha_audit。',
  '- 更正走修订链：akasha_revise / frontier recheck（追加不改原文，currentRecords 取当前版本）。',
  '- 数据只经校验写入（akasha CLI / MCP 工具）；直接改 akasha\\data\\*.jsonl 会被门控拒绝。',
  '- 本段文本随库更新：改用法 = revise canon-akasha-usage（当前版本即注入内容）。'
].join('\n');

export function apply(ctx, config = {}) {
  const logPath = typeof config.log === 'string' && config.log.trim() !== '' ? config.log : DEFAULT_LOG;
  const dataDir = (typeof config.dataDir === 'string' && config.dataDir.trim() !== '' ? config.dataDir : DEFAULT_DATA_DIR)
    .replace(/\//g, '\\').replace(/\\+$/, '');
  const akashaDir = (typeof config.akashaDir === 'string' && config.akashaDir.trim() !== '' ? config.akashaDir : DEFAULT_AKASHA_DIR)
    .replace(/\//g, '\\').replace(/\\+$/, '');
  const sectionOrder = Number.isFinite(config.sectionOrder) ? config.sectionOrder : 700;

  let require_ = null;
  try { require_ = createRequire(import.meta.url); } catch { /* 拿不到 require 就只用兜底 */ }

  // 库驱动的降级/恢复只在**切换时**落一行观测线（防刷屏；静默降级必须有痕——2026-10-07 类扫补）。
  let lastUsageSource = null;
  const settleUsage = (source) => {
    if (source !== lastUsageSource && lastUsageSource !== null) {
      write({ kind: source === 'fallback' ? 'gate-usage-fallback' : 'gate-usage-recovered' });
    }
    lastUsageSource = source;
    return source;
  };
  // 渲染时读库：canon-akasha-usage 的当前版本即注入文本；任何异常 → 兜底，绝不抛。
  const usageText = () => {
    try {
      if (!require_) { settleUsage('fallback'); return FALLBACK_SECTION; }
      const lib = require_(join(akashaDir, 'lib.mjs'));
      const recs = lib.currentRecords(lib.loadStore('canon').records);
      const hit = recs.filter((r) => r.id === 'canon-akasha-usage' || r.id.startsWith('canon-akasha-usage-r')).pop();
      const text = hit && typeof hit.claim === 'string' ? hit.claim.trim() : '';
      if (text) { settleUsage('library'); return text; }
      settleUsage('fallback');
      return FALLBACK_SECTION;
    } catch {
      settleUsage('fallback');
      return FALLBACK_SECTION;
    }
  };

  let ready = false;
  try {
    mkdirSync(dirname(logPath), { recursive: true });
    ready = true;
  } catch { /* 静默：写不了日志不代表门控不能工作 */ }

  const write = (record) => {
    if (!ready) return;
    try {
      appendFileSync(logPath, JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n', 'utf8');
    } catch { /* 静默 */ }
  };

  const norm = (p) => String(p ?? '').replace(/\//g, '\\').toLowerCase();
  const dataNeedle = () => norm(dataDir).replace(/\\+$/, '') + '\\';
  // 文件路径参数：按整体前缀判定
  const isDataPath = (p) => {
    const s = norm(p);
    const d = norm(dataDir);
    return s === d || s.startsWith(dataNeedle());
  };
  // 命令文本：路径出现在任意位置都算（命令不等于路径）
  const mentionsDataDir = (text) => norm(text).includes(dataNeedle());

  // ① 数据目录写入守卫（同步、与注册顺序无关）。
  ctx.tools.guard((exec) => {
    try {
      const name = String(exec?.name ?? '');
      const args = exec?.arguments ?? {};
      if (WRITE_TOOLS.has(name)) {
        const target = String(args.file_path ?? args.path ?? '');
        if (target && isDataPath(target)) {
          write({ kind: 'gate-denied', tool: name, target });
          return `阿卡夏门控：拒绝 ${name} 直接写 ${target}——数据必须经校验写入（akasha CLI / mcp__akasha__*），直改 JSONL 会污染 append-only 库。确需绕过请先停用 @akasha-book/gate。`;
        }
      } else if (SHELL_TOOLS.has(name)) {
        const command = String(args.command ?? args.script ?? '');
        if (command && mentionsDataDir(command) && WRITE_IDIOM.test(command)) {
          write({ kind: 'gate-denied', tool: name, target: 'akasha\\data（命令）' });
          return `阿卡夏门控：拒绝 ${name} 命令里对 akasha\\data 的写操作——请改走 akasha CLI / mcp__akasha__*。确需绕过请先停用 @akasha-book/gate。`;
        }
      }
    } catch { /* 守卫异常 → 放行 */ }
    return undefined;
  });

  // ② 系统提示注入：用法 + 来源态约定（order 700，落在 TEAM_POLICY 600 与 PTC_ONLY 800 之间）。
  //    text 传函数 —— system-prompt 在组装时逐次求值（dsh-system-prompt renderPrompt: typeof text === 'function' ? text(ctx) : text），
  //    因此库里的 canon-akasha-usage 一旦 revise，下一次组装即生效（无需重启/重载）。
  ctx.systemPrompt.section({
    name: 'akasha:protocol',
    order: sectionOrder,
    text: usageText
  });

  // 提示变更的观测线（**只跟结构变更**——section / context 的注册与销毁；动态文本漂移不触发，2026-10-07 实测）。
  ctx.on('system-prompt/change', () => write({ kind: 'prompt-change' }));

  usageText(); // 播种 usageSource（首调不落切换线）
  write({ kind: 'gate-armed', pid: process.pid, dataDir, sectionOrder, akashaDir, usageSource: lastUsageSource });
}
