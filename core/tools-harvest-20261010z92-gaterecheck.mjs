// harvest-20261010z92-gaterecheck.mjs —— 第三轮人读（gate 覆盖缺口 + hooks 陈旧）+ 常设纪律入 canon
import { loadStore, currentRecords, appendRecord, revise } from './lib.mjs';

// ① 常设纪律（用户裁定，跨会话有效）
const canon = currentRecords(loadStore('canon').records);
if (!canon.some((r) => r.id.startsWith('canon-discipline-hand-found-vs-script'))) {
  const r1 = appendRecord('canon', {
    id: 'canon-discipline-hand-found-vs-script',
    claim:
      '**常设纪律：手检发现问题而检查脚本没报 ⇒ 必须完善脚本（2026-10-10 用户裁定）**。' +
      '**原话**：「以后只要发现手检有问题，但脚本正常，那么就得完善脚本了」（前一轮还有：「不要过于信赖自己搞得检测脚本，逐项排查看看」「如果检查不出问题，但自己手检发现了问题，那么就说明现在的检查不完善」）。' +
      '**为什么**：脚本是用来**替代眼睛**的；一旦"眼睛比脚本尖"，脚本就从资产变成了**虚假的安心感**（漏报比没脚本更危险）。' +
      '**落地动作（每次照做）**：① 把该问题**归类**（族类，不是个案）；② 在 `tools/risk-scan.mjs` 加/改规则（或把约束挪进**可执行用例**，如 gate 的"写盘工具覆盖清单"）；③ **用修复前的真实代码做变异回归**——文件从 git 取历史版本、或逐字嵌入当时片段，证明新规则/新用例**在旧代码上会红、在新代码上不红**；④ 自测计入 `risk-scan.selftest.mjs`（当前 15/15）；⑤ 规则放宽后必须回跑自测，防止"改宽了就不报了"。' +
      '**相关**：`canon-review-manual-20261010`（方法论）、`canon-discipline-*` 家族。判断标准很直白：**新规则能不能在旧代码上复现当初手检的那一眼**。',
    source: { type: '共识', ref: '用户 2026-10-10 裁定（本会话）' },
    event_time: '2026-10-10',
    last_reviewed: '2026-10-10',
    tags: ['纪律', '复查', '工具', '脚本', '方法论'],
  });
  console.log('已入 canon：' + r1.id);
} else console.log('= 纪律条目已存在');

// ② 第三轮复查记录：挂到 review-manual 条目上
const rec = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-review-manual-20261010'));
if (!rec) { console.log('未找到 review 主条目'); process.exit(0); }
const marker = '**第三轮（同日，用户：「再查一遍，依旧不用脚本，举一反三」）**';
if (rec.claim.includes(marker)) { console.log('= 第三轮已记录'); process.exit(0); }
const add = ' ' + marker + '：继续**逐行人读**未读过的文件（不再只读自己写的部分）。**① 安全关键：`akasha-gate/index.js`（239 行全文）**——' +
  '路径归一（大小写 / `~` / `$HOME` / `%USERPROFILE%`）、注入污染检测、库驱动降级、放行语义均正确；**但发现真 gap（G1）**：守卫只覆盖 `WRITE_TOOLS={edit,write,apply_patch}` 与 `SHELL_TOOLS={pwsh,bash}`，' +
  '**漏了 `dsh_wsl`（WSL bash）与 codex 系（`codex_exec`/`codex_thread_*`——子进程可写盘）**，两条真实绕道能直改 `akasha\\data\\*.jsonl`。' +
  '**修**：`SHELL_TOOLS` 补 `dsh_wsl`；新增 `AGENT_TOOLS` 扫委派型 `prompt`（数据目录 + 写动作 ⇒ 拒绝）；`WRITE_IDIOM` 补**中文写动词**（追加/写入/改写/覆盖/替换/清空/删除/修改/编辑）与 `append|overwrite|modify`；' +
  '**边界写进代码注释**：WSL 侧同一物理文件可能以 `/mnt/<盘>/…` 出现，守卫只认配置形态的 `dataDir` ⇒ 挂载路径写法拦不住（劝告层的已知边界，不是安全承诺）。' +
  '**防复发**：gate selftest 增**"写盘工具覆盖清单"**——11 条"写数据必被拒"（含 `dsh_wsl`/codex 系中文 prompt）+ 3 条"只读必须放行"；**变异回归**用 `git show 3e7177a^:plugins/akasha-gate/index.js` 跑同批用例 ⇒ `dsh_wsl`/`codex_exec` **当场未拦**（证明用例有效）。gate 1.2.3。' +
  '**② 扫描器同步升级**：新增 `RISK-GUARD-COVER` 规则（注册了 `tools.guard(` 的文件必须提到 `WRITER_TOOLS` 清单里每个工具），自测用**修复前的 gate 真文件**做历史回放 ⇒ 报红 ✓（15/15）。' +
  '**③ 规则误报修正**：该规则一开始把 `akasha-hooks` 也报了——人读确认 hooks 的 `SHELL_TOOLS` 是**分类用**（统计经 shell 的查库召回），不是守卫 ⇒ 收紧触发条件为"真的注册了 `tools.guard(`"。' +
  '**④ 顺着误报又发现同族小陈旧**：hooks 的分类集合没跟上工具目录（`dsh_wsl` 在校验清单外）⇒ `dsh_wsl` 里的查库**不被计入召回**；补 `dsh_wsl` + 两条回归用例；hooks 1.2.2。' +
  '**⑤ 记录一处"有痕的半成功"（暂不改代码）**：`sleep.mjs` 的 `sleepRun` 写序正确（报告→inbox→**水位线最后**、只消费到最后一个换行、原子写），但**报告写失败时仍推进水位线**——' +
  '该窗口的详细报告永久缺失、`lastReport` 指向不存在的文件；选择不改的理由：改"失败不推进"会导致**重复追加待办**（append-only inbox 的幂等性更值钱），且失败已落 `sleep-report-error` 观测线 ⇒ 可发现、可人工重跑（`sleep --replay`）。' +
  '**⑥ 测试与回归**：五插件自测全绿 · 核心 137/137（仓）+ 138/138（活树）· 扫描器自测 15/15 · 全改动面复扫 **207 文件 0 命中** · OSS `3e7177a`（CHECKS R29）。' +
  '**仍未逐行人读（诚实边界）**：`lib.mjs` 的 revise/retire/promote 写路径（约 150 行）、`session.mjs` 全文、`sleep.mjs` 的 plan/replay 段、`akasha-session` 插件 456 行中未读部分、`hooks` 剩余段。';
const next = revise('canon', rec.id, { claim: rec.claim + add, last_reviewed: '2026-10-10' });
console.log('已记录：' + rec.id + ' → ' + next.id);
