// 首次真实入库（harvest 2026-10-06）：把当天验证过的操作事实（复现/官方）、镜像故事、情绪词、定价与孤案写入各库。
// 幂等：已存在同 id 跳过；全部经 lib.appendRecord 校验写入（不直改 JSONL）。
// 用法：node akasha\tools\harvest-20261006.mjs
import { appendRecord, loadStore } from './lib.mjs';

const D = '2026-10-06';

const canon = [
  {
    id: 'canon-dsh-mcp-reconnect',
    claim: 'DSH 的 MCP 客户端在本地 stdio 服务器进程被杀后会自动重连（500ms 起退避），重连后刷新工具表——新工具无需重启桌面端即可被模型调用。',
    source: { type: '复现', ref: '2026-10-06 三次杀 akasha mcp.mjs 实测：PID 3268→47804→47832；akasha_audit / akasha_brief 热更新后当场可调' },
    last_reviewed: D,
    tags: ['dsh', 'mcp', '插件']
  },
  {
    id: 'canon-dsh-plugin-replace-restart',
    claim: 'DSH 插件包替换已安装版本后，运行中的宿主仍执行旧 JS，需重启才载入新代码（安装返回 restart-required）；而新装 bundle 可热生效（applied）。',
    source: { type: '官方', ref: 'cordis-plugin-development references/host-plugin.md（Install, enable, and observe）；2026-10-06 实测（gate 1.0.1 / sleep 1.1.0 → restart-required；mcp-akasha / hooks / gate / sleep 首装 → applied）' },
    last_reviewed: D,
    tags: ['dsh', '插件', '重启']
  },
  {
    id: 'canon-dsh-workspace-changes-temp',
    claim: 'dsh-workspace-changes 的每会话暂存目录为 %TEMP%\\dsh-workspace-changes-*（objects/ 为内容寻址快照），会话被强杀时不自清；它没有配置项，tempRoot=os.tmpdir() 写死——换盘只能改进程的 TEMP/TMP。',
    source: { type: '复现', ref: '源码 lib/index.js:807/1067；2026-10-06 C: 0 GB 事件（单会话 16.2 GB）；工具 tools\\dsh-launch-temp.cmd + tools\\dsh-temp-clean.mjs' },
    last_reviewed: D,
    tags: ['dsh', '临时目录', '清理']
  },
  {
    id: 'canon-dsh-session-log-container',
    claim: 'DSH 会话日志 session.v4.jsonl.zstd 是多帧 zstd 容器（按魔数 28 B5 2F FD 分帧），解码拼接后为逐行 JSON 事件流；系统提示以 system/message 事件记录（提示变更时落一条）。',
    source: { type: '复现', ref: 'tools\\session-log-grep.mjs 对 session-7f72d46a… 实测：688 帧 / 16.3 MB / 1444 行；system/message seq 1377 录得注入段落' },
    last_reviewed: D,
    tags: ['dsh', '会话日志']
  },
  {
    id: 'canon-dsh-runtime-context-snapshot',
    claim: 'DSH 的 systemPrompt.context() 贡献不落 system/message，而是作为 runtime-context 快照随下一个 user/message 落地（source.kind=runtime-context，sections 数组；可检索可重放）。',
    source: { type: '复现', ref: '2026-10-06 akasha:sleep 条子实证：user/message 事件含 source.kind=runtime-context 与 akasha:sleep 段落' },
    last_reviewed: D,
    tags: ['dsh', '系统提示']
  },
  {
    id: 'canon-node-tmpdir-env',
    claim: 'Windows 上 Node 的 os.tmpdir() 读 TEMP/TMP 环境变量（子进程继承）——可用它把某个进程树的临时文件整体改盘。',
    source: { type: '官方', ref: 'Node.js Docs — os.tmpdir()；2026-10-06 实测：设 TEMP=<LOCAL_PATH> 后 os.tmpdir() 返回 <LOCAL_PATH>' },
    last_reviewed: D,
    tags: ['node', 'windows']
  }
];

const mirror = [
  {
    id: 'mirror-enospc',
    story: '2026-10-06 · ENOSPC 探针',
    situation: '自测在系统盘报「空间不足」失败，第一嫌疑是自己刚写的代码',
    behavior: '没有吞失败：加观测线、翻回静默 catch、再转去查磁盘',
    outcome: '查出 C: 0 字节可用、workspace-changes 堆了约 50 GB；修复并把静默 catch 升级为 sleep-report-error',
    social_reaction: '用户一句「删」，并顺势要求把记录器换盘',
    emotion: '警觉 → 顺藤摸瓜的兴奋'
  },
  {
    id: 'mirror-batched-restart',
    story: '2026-10-06 · 攒单重启',
    situation: '两处变更都要重启桌面端才生效',
    behavior: '不假称生效、不反复重启；记账攒单并预留重启后验证清单',
    outcome: '变更一单一次重启激活，验证计划落纸',
    social_reaction: '用户按部就班继续推进',
    emotion: '克制'
  }
];

const pricing = [
  {
    id: 'price-direct-write',
    behavior: '绕过校验直改 append-only 数据文件',
    valence: -1,
    severity_default: 4,
    note: '门控拦截项（@akasha-book/akasha-gate）'
  },
  {
    id: 'price-silent-catch',
    behavior: '静默吞掉失败（无观测线的 catch）',
    valence: -0.8,
    severity_default: 3,
    note: '延迟爆雷；正确姿势=留痕（2026-10-06 ENOSPC）'
  },
  {
    id: 'price-batched-restart-honesty',
    behavior: '把「待重启生效」如实标注而不是宣称已完成',
    valence: 0.6,
    severity_default: 2,
    note: '攒单纪律（2026-10-06 gate/sleep）'
  }
];

const lexicon = [
  {
    id: 'lex-silent-failure',
    term: '静默失败',
    trigger: '错误被 catch{} 吞掉且无观测线',
    behavior: '问题在黑暗里堆积、延迟爆雷',
    resolution: '要么写明理由、要么升级为观测线（sleep-report-error 模式）',
    source: '2026-10-06 ENOSPC 事件'
  },
  {
    id: 'lex-provenance',
    term: '来源态',
    trigger: '任何事实性断言',
    behavior: '未标注=未核验；无据的确定 ≪ 有据的不确定',
    resolution: '学过 / 接触过 / 记得·库内 / 搜到 四标签 + 查库留痕',
    source: 'akasha PROTOCOL.md'
  },
  {
    id: 'lex-batched-restart',
    term: '攒单重启',
    trigger: '多处变更需重启才生效',
    behavior: '不虚报、不空转重启',
    resolution: '记账攒单 + 重启后统一验证',
    source: '2026-10-06 gate v1.0.1 / sleep v1.1.0'
  },
  {
    id: 'lex-incidental-probe',
    term: '顺带探针',
    trigger: '顺手撞见的异常（如测试里的 ENOSPC）',
    behavior: '易被当成噪声跳过',
    resolution: '先留痕再判断：异常都是免费情报',
    source: '2026-10-06 C: 满事件'
  }
];

const orphan = [
  {
    id: 'orphan-wsc-dispose',
    summary: 'workspace-changes 的暂存目录为何在会话结束后不自清（dispose 未触发）',
    observed: '源码 lib/index.js:785 有 rm(dispose) 逻辑，但 4 个目录里 3 个遗留在 C:（31.88 / 2.13 / 0.9 GB）',
    hypothesis: '强杀路径绕过 dispose；或 abort 之后 rm 未执行',
    would_confirm: '在 dispose 处加日志或断点，强杀一次看 rm 是否被调用',
    would_refute: '干净退出后目录仍残留，且 dispose 确实已被调用（rm 失败被吞）',
    severity: '中',
    created: D
  },
  {
    id: 'orphan-mcp-tool-refresh',
    summary: 'MCP 重连后模型侧工具表热更新的确切实现路径',
    observed: '杀 mcp 进程后客户端自动重连，新工具立即可调（三次复现）',
    hypothesis: '重连时重新 tools/list 并替换注册表（或客户端主动 re-list）',
    would_confirm: '抓客户端侧重连后的 tools/list 请求',
    would_refute: '重连后未发 tools/list 而工具仍可用（走别处缓存）',
    severity: '低',
    created: D
  }
];

const PLAN = { canon, mirror, pricing, lexicon, orphan };
let added = 0; let skipped = 0;
for (const [store, records] of Object.entries(PLAN)) {
  const existing = new Set(loadStore(store).records.map((r) => r.id));
  for (const rec of records) {
    if (existing.has(rec.id)) { console.log(`skip  ${store.padEnd(8)} ${rec.id}（已存在）`); skipped++; continue; }
    appendRecord(store, rec);
    console.log(`added ${store.padEnd(8)} ${rec.id}`);
    added++;
  }
}
console.log(`\nharvest 完成：新增 ${added}，跳过 ${skipped}`);
