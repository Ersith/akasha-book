// akasha/tools/harvest-20261010z51-rea-usage.mjs
// 2026-10-10：REA（逆向分析 MCP/CLI）本地可用性实测口径入库。幂等。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';

const tips = currentRecords(loadStore('canon').records);
if (tips.some((r) => r.id.startsWith('canon-rea-usage'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('canon', {
  id: 'canon-rea-usage-20261010',
  claim:
    '**REA（逆向分析 MCP/CLI）本地可用性（2026-10-10 实测）**：npm `rea-agents` v6.3.0（MIT；bin: `rea`/`rea-agents`；`npx -y rea-agents@latest <cmd>`；本机以 **CLI 直用**，未注册 MCP）。**使用要点**：① **目标必须先隔离拷贝**——直接指 `<DSH_INSTALL>` 会顺着 import 爬进 `app\\node_modules` 卡 >10 分钟；拷到独立目录后（6 文件 / 1MB）**46 秒完成**；② 输出格式参数是 `--format <toon|json|yaml|md|jsonl>`（README 里的 `--json` **不是**真选项）；③ **输出巨大**（6 文件 → 80MB JSON，含 2.4 万节点语义图）→ 用 `--token-limit` / `--filter-output` 或本地脚本解析（PS 的 `Out-File -Encoding UTF8` 会加 BOM，解析前先 strip）；④ 能力面：原生二进制（需 Hopper/Ghidra/IDA 提供方）、**JS/Electron（Windows 免引擎）**、.NET 静态、Web 抓取、APK、HAR、EVM 等；⑤ `doctor` 只认已支持的 agent（Claude Code/Codex/VSCode 等），**不含 DSH**——MCP 注册需另走「手工 MCP」，动 agent 配置前须用户裁定；⑥ 纪律同风格：证据 ID + 摘要 + **显式局限清单**（"不可读作不存在"），与我们的对照/来源态精神相容。**官方壳实测情报（`resources\\app\\lib`）**：4 个浏览器窗口 / 11 个 contextBridge API（16 个暴露成员）/ IPC 83 操作（**0 字面频道、83 动态未解析**）/ 37 renderer 发送 + 35 main handlers / 22 条 sender-validation 观察 / 231 findings / 73,255 AST 节点 / 0 解析失败。',
  source: { type: '复现', ref: '本机实测 2026-10-10（_scratch\\rea-trial：analysis-lib.json / summarize-analysis.mjs / 命令记录）；README（github.com/morluto/rea）+ rea doctor 输出' },
  event_time: '2026-10-10',
  last_reviewed: '2026-10-10',
  tags: ['REA', '工具口径', '逆向分析', 'Windows', '外部工具']
});
console.log('已入 canon：' + rec.id);
