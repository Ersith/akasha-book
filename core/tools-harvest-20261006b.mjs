// harvest B（2026-10-06 深夜）：把「插件静默失活」两课与一条孤案入库。
// 幂等：已存在同 id 跳过；全部经 lib.appendRecord 校验写入。
// 用法：node akasha\tools\harvest-20261006b.mjs
import { appendRecord, loadStore } from '../lib.mjs';

const D = '2026-10-06';

const canon = [
  {
    id: 'canon-dsh-mixin-inject',
    claim: 'Cordis 混入服务（如 timer 的 ctx.interval / ctx.setTimeout）的属性访问需要 inject 声明；未 inject 时读取 ctx.<别名> 本身抛 cannot get property "X" without inject，apply 整段失败、插件静默失活（不落任何日志）。',
    source: { type: '复现', ref: '2026-10-06 @local/akasha-sleep v1.1.0 事故：typeof ctx.setInterval 守卫亦无法拦截（访问即抛）；修复 = inject:[...,"timer"] + ctx.interval；诊断途径 = plugin_manager set_bundle 返回的 diagnostic，或重启后检查 *-armed 观测线' },
    last_reviewed: D,
    tags: ['dsh', '插件', 'cordis']
  },
  {
    id: 'canon-dsh-module-generation-cache',
    claim: '替换 profile 里已安装插件包的 JS 后，运行中的进程无法热更该插件：set_bundle 开关、remove_bundle + 重装（甚至改 exports 到新文件路径）都复用旧模块代（错误栈仍指向旧路径）；只有重启才载入新代。首次安装的新包/新包名可热生效。',
    source: { type: '复现', ref: '2026-10-06 akasha-sleep 1.1.0→1.1.2 实测：toggle/remove+reinstall/换 lib/ 布局均失败，错误栈固定在旧 index.js:189；对照 cordis-plugin-development references/host-plugin.md 原文「replacing an installed package requires restart to load a fresh JavaScript module generation」' },
    last_reviewed: D,
    tags: ['dsh', '插件', '重启']
  }
];

const orphan = [
  {
    id: 'orphan-plugin-silent-deactivate',
    summary: '插件静默失活是否存在宿主侧的统一观测面（除各插件自报 armed 线外）',
    observed: '2026-10-06 重启后 akasha-sleep 未能激活：宿主日志目录无任何常规错误文件，唯一诊断来自 plugin_manager 操作的返回值（diagnostic）',
    hypothesis: '宿主有内部 logger 但未默认落盘为常规日志文件；或错误只进渲染层 console',
    would_confirm: '找到或开启宿主侧的错误落盘（配置文件/环境变量），复现一次失活并在文件里看到堆栈',
    would_refute: '确认宿主不提供任何错误落盘能力（则「armed 线」是唯一健康检查手段）',
    severity: '中',
    created: D
  }
];

const PLAN = { canon, orphan };
let added = 0; let skipped = 0;
for (const [store, records] of Object.entries(PLAN)) {
  const existing = new Set(loadStore(store).records.map((r) => r.id));
  for (const rec of records) {
    if (existing.has(rec.id)) { console.log(`skip  ${store} ${rec.id}（已存在）`); skipped++; continue; }
    appendRecord(store, rec);
    console.log(`added ${store} ${rec.id}`);
    added++;
  }
}
console.log(`\nharvest B 完成：新增 ${added}，跳过 ${skipped}`);
