// akasha/tools/harvest-20261010z56-rea-shim-capability.mjs
// 2026-10-10：给 mcp-rea 条目补「完整可用性」口径（逃生舱参数透传 / --format 覆盖 / 三层限制）。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const canon = currentRecords(loadStore('canon').records);
const rec = canon.find((r) => r.id.startsWith('canon-mcp-rea-shim'));
if (!rec) { console.log('未找到条目，跳过'); process.exit(0); }
if (rec.claim.includes('完整可用性口径')) { console.log('已含，跳过：' + rec.id); process.exit(0); }
const add =
  ' **完整可用性口径（2026-10-10 追问后补）**：薄壳只过滤「工具面的呈现」，不过滤能力——**REA 全部 97 个命令经 `rea_cli` 逃生舱 100% 可达**；参数原样透传（实测 `--token-limit 300` 把输出从 65563B 压到 216B、`--format md` 可覆盖默认 json），selftest 8/8。真正的限制有三层且与装法无关：① **提供方**（原生二进制分析需 Hopper/Ghidra/IDA，本机无；JS/Electron/.NET 开箱可用）；② **输出规模**（单次默认上限 64KB，超出截断注明；大分析走 `--token-limit`/`--filter-output` 或让 REA 写文件）；③ **有状态命令**（需要已打开分析会话的 `current_address`/`comment` 等，同受提供方限制）。若将来遇到必须连续会话的命令，可在 shim 里加会话句柄支持（未实现，属已知扩展点）。';
const next = revise('canon', rec.id, { claim: rec.claim + add, last_reviewed: '2026-10-10' });
console.log('已修订：' + rec.id + ' → ' + next.id);
