// akasha/tools/harvest-20261010z76-oss-mirror-rule.mjs
// 2026-10-10：OSS 仓 = 活树的「脱敏镜像」这条规矩 + 本次同步记录。幂等。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';

const canon = currentRecords(loadStore('canon').records);
if (canon.some((r) => r.id.startsWith('canon-oss-mirror-rule'))) { console.log('已存在，跳过'); process.exit(0); }

const rec = appendRecord('canon', {
  id: 'canon-oss-mirror-rule-20261010',
  claim:
    '**OSS 仓 = 活树的「脱敏镜像」——不能拿活树直接覆盖仓**（2026-10-10 在「main 更新」时定案）。' +
    '**为什么**：活树文件里带本机痕迹，仓里必须是通用版。实测的**逐处对应**：`sessionsRoot` 活树＝`<LOCAL_PATH>\\official-home\\sessions` / 仓＝`join(homedir(), ".dsh", "sessions")`；包名 活树＝`@akasha-book/akasha-sleep` / 仓＝`@akasha-book/sleep`；内部代号「阿巴阿巴」→ 仓里写「试运行」；活树注释里的内部文档路径（`docs\\superpowers\\...`）→ 仓里换成通用说明；`<LOCAL_PATH>\\...` → `~` / `~/.akasha` / `<scratch>`。' +
    '**正解**：只走同步脚本（`akasha/tools/oss-sync-*.mjs`，链式：新脚本 → 旧脚本 → 隐私终扫）。规则：复制 + `sanitize()`（路径/包名/代号）+ 少量结构转换（如 session 自检的 CORE/SCRATCH 相对化）+ 末尾 13 类隐私正则全树扫描（`<LOCAL_PATH>` / `C:\\Users` / `@akasha-book\\/` / token 前缀 / `127.0.0.1:端口` / `阿巴阿巴` …）。' +
    '**刻意不进仓的东西**：① `core/test.mjs` 不同步（仓用「示例库口径」测试，与活树真实库口径分离，新用例按需人工移植——故活树 135 vs 仓 134）；② `MEMORY-TEST.md` 不同步（内部测试治理 + 21 条解冻日志；仓 README 也未引用它）；③ README / 版本号不在同步范围（属「版本 bump + npm 重发」收尾项）。' +
    '**本次同步（2026-10-10，10-10f 脚本）**：跑链后绝大多数 `[same]`（说明当日各批补丁本身就是仓洁净版）；实际更新两项——① **`core/PROTOCOL.md` 补上活树新增章节**（§ 验证与证据纪律 · ARTEX 移植 / 五源路由）；② `CHECKS.md` 措辞（把描述扫描模式的 `` `@akasha-book/` `` 改成 `` `@local` ``，否则被自家隐私扫命中——与 R19 同例）。隐私终扫**零命中**；提交 `bf40d64` 已推。',
  source: { type: '复现', ref: '本机实测 2026-10-10（跑 oss-sync-20261010f/e/d 链；逐文件 LF 归一差异比对；隐私终扫）' },
  event_time: '2026-10-10',
  last_reviewed: '2026-10-10',
  tags: ['OSS', '镜像', '脱敏', '发布纪律', '同步脚本'],
});
console.log('已入 canon：' + rec.id);
