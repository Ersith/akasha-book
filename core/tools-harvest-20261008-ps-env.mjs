// 2026-10-08：两条环境级坑的 canon（今晚在写库与重训时各踩一次，均可复现）。
// 写入走 lib.appendRecord（与 CLI add 同一校验）；幂等：已存在同 id 跳过。
// 注意：本文件本身就踩了它描述的第一个坑——所以内容全部写在文件里，不经命令行参数传递。
import { appendRecord, loadStore, currentRecords, allIds } from '../lib.mjs';

const RECORDS = [
  {
    id: 'canon-powershell-native-args-20261008',
    claim: '2026-10-08 实测（本机宿主 pwsh 工具实为 Windows PowerShell 5.1.22621）：① 把含非 ASCII（中文）的字符串作为参数传给原生命令（node 等）会按 ANSI/OEM 代码页转换——中文被截断，node 收到残缺 JSON，报 `Unterminated string in JSON at position N`；⇒ 写库/传数据一律不走命令行参数：改用文件（CLI `--data-file`）或直接调 API（`akasha/tools/*.mjs` 里的 `lib.appendRecord`），`akasha.mjs add` 只认 `--data`（不支持 data-file），故中文条目必须走 `tools/*.mjs`。② PowerShell 5.1 在**参数位置**不能内联方法调用：`node x.mjs --data $e.Replace(\'"\',\'\\"\')` 不会执行方法，必须先把结果落到变量（`$esc = $e.Replace(...)`）再传；同一晚为此白试两次。',
    source: { type: '复现', ref: '<AKASHA_DIR>\\tools\\harvest-20261008-scene-lora.mjs（改用 lib.appendRecord 后全部入库成功）+ akasha.mjs:267 的 JSON.parse 报错轨迹' },
    last_reviewed: '2026-10-08',
    event_time: '2026-10-08',
    tags: ['powershell', 'encoding', 'cli', 'akasha', 'tooling'],
  },
  {
    id: 'canon-killed-process-locks-log-20261008',
    claim: '2026-10-08 实测（sekali-lab 训练重启用例）：用 Stop-Process 强杀训练进程后，其 stdout 重定向目标文件仍被占用——下一次 `cmd /c xxx.cmd` 里的 `> ..\\logs\\train.log 2>&1` 会直接失败，整个脚本**静默退出**（无日志、无进程、无报错，只有外层 trace 重定向才能捕获到 GBK 乱码的「另一个程序正在使用此文件」）；当晚因此两次以为「已启动」实则没跑。规避：训练/长任务日志一律用**带时间戳的文件名**（`train_v3_<stamp>.log`），并在启动后立刻核对「进程存在 + 日志在增长」双证据，不要只看启动返回值。',
    source: { type: '复现', ref: 'sekali-lab: logs/launch_trace.log + start_train_scene_v3.cmd（改为时间戳日志名后启动正常）' },
    last_reviewed: '2026-10-08',
    event_time: '2026-10-08',
    tags: ['windows', 'process', 'logging', 'sekali-lab', 'training'],
  },
];

const report = [];
const existing = new Set(allIds(loadStore('canon').records));
for (const rec of RECORDS) {
  if (existing.has(rec.id)) {
    report.push('跳过（已存在） ' + rec.id);
    continue;
  }
  appendRecord('canon', rec);
  report.push('已追加 [canon] ' + rec.id);
}
console.log(report.join('\n'));
