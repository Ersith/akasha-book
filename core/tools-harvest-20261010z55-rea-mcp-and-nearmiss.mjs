// akasha/tools/harvest-20261010z55-rea-mcp-and-nearmiss.mjs
// 2026-10-10：① REA→MCP 薄壳桥；② 睡眠计划近失报告。幂等。
import { loadStore, currentRecords, appendRecord } from '../lib.mjs';

const canon = currentRecords(loadStore('canon').records);
const has = (pfx) => canon.some((r) => r.id.startsWith(pfx));

if (has('canon-mcp-rea-shim')) console.log('跳过：mcp-rea 条目已存在');
else {
  const rec = appendRecord('canon', {
    id: 'canon-mcp-rea-shim-20261010',
    claim:
      '**REA 接入 DSH：薄壳 MCP 桥（2026-10-10，用户裁定「REA 注册成 MCP」）**。' +
      '**为何不是直连**：REA 原生 `rea --mcp` 暴露 **139 个工具 / 约 1.83 MB schema**（实测），而官方 `@deepseek-ai/dsh-mcp-client` **无工具过滤字段**（"tools appear before the harness starts its first turn"，一次性全量注册）→ 直连会把几十万字符塞进每次请求的 prefill。' +
      '**做法**：自建 `@local/mcp-rea`（`<LOCAL_PATH>`，~180 行手写 MCP stdio：initialize / tools/list / tools/call），只暴露 **10 个高频工具 + 1 个 CLI 逃生舱（`rea_cli`，命令名白名单校验）**；后端为钉版 `rea-agents@6.3.0`（本地安装于 `_tools\\rea`，避免 `@latest` 漂移）。' +
      '**实测**：工具面 11 个 / **3.0 KB schema**（对原生 1.83 MB ≈ 1/600）；selftest 6/6（握手、工具面、真跑 REA capabilities、逃生舱校验、未知方法 -32601）。输出保护：单次上限 64 KB（超限截断注明）、超时 120 s。' +
      '**接线**：profile 装 `local-mcp-rea-0.1.0.tgz`（plugin_manager；39 个 bundle 中已启用），模型侧工具名 `mcp__rea__*`。**环境限制**如实：REA 原生二进制分析仍需 Hopper/Ghidra/IDA 提供方。',
    source: { type: '复现', ref: '本机实测 2026-10-10（rea-mcp-probe 握手、dsh-mcp-rea/selftest.mjs 6/6、plugin_manager install_bundle 返回 applied）' },
    event_time: '2026-10-10',
    last_reviewed: '2026-10-10',
    tags: ['REA', 'MCP', '插件', 'prefill', '工具面'],
  });
  console.log('已入 canon：' + rec.id);
}

if (has('canon-sleep-plan-nearmiss')) console.log('跳过：nearMiss 条目已存在');
else {
  const rec = appendRecord('canon', {
    id: 'canon-sleep-plan-nearmiss-20261010',
    claim:
      '**睡眠计划「ops 恒空」定案 + 近失报告（2026-10-10）**。' +
      '**结论：不是缺陷，是数据年轻 + 保守阈值**——默认 `theta=0.8 / orphanDays=90 / staleDays=365`；六库 2026-10-06 才启，故 orphan-aging（需 >90 天）与 canon-stale-unused（需 >365 天）必然零命中；机制本身早有夹具测试覆盖（merge / snapshot-superseded / canon-stale-unused / orphan-aging 四规则都会触发，见 test.mjs 的 planFixture）。' +
      '**真实数据（2026-10-10）**：orphan 检视 30 条、最老 **4 天**（阈值 90）；canon 检视 89 条、最老 **4 天**（阈值 365）；同主题多快照 **0 组**（检视 72 主题）；全库最接近的一对 Jaccard 仅 **0.2412**（θ 0.8：`canon-dsh-module-generation-cache ↔ canon-dsh-plugin-replace-restart-r1`）。' +
      '**改动**：`sleepPlan` 新增 **`nearMiss` 诊断段**（合并：各库 top-3 最近对 vs θ；丢弃：最老 orphan / canon 年龄 vs 阈值、同主题多快照组数、同 URL frontier 组数），**不进 planId 哈希、不影响任何 op**；CLI `sleep --plan` 在 0 op 时打印"近失报告（为何为空）"；新增测试 1 条（121/121 全绿）。' +
      '**旋钮演示**：`sleep --plan --orphan-days 3` 在真库上产出 5 条 orphan-aging discard（只读）——阈值一放宽就有 op，证明管线可用；默认值保持保守。',
    source: { type: '复现', ref: '本机实测 2026-10-10（node akasha.mjs sleep --plan / --orphan-days 3；test.mjs 121/121）' },
    event_time: '2026-10-10',
    last_reviewed: '2026-10-10',
    tags: ['睡眠', '计划', '近失报告', '可观测', '定案'],
  });
  console.log('已入 canon：' + rec.id);
}
