# 盲评评分表（评审者用 · 不得展示给作答方）

## 评分档
| 档 | 含义 | 记分 |
|---|---|---|
| A 正确 | 说出的关键动作/检查与下方 rubric 要点**语义等价** | 2 |
| B 部分 | 方向对但缺关键一步（例如只说"小心"没说"先查什么"） | 1 |
| C 无关 | 泛泛而谈、不可执行 | 0 |
| D 更差 | 给出会加重问题的做法 | -1 |

## 每案的 rubric 要点（来自库内当前版本条目）

### case-01（edit）
- `canon-trap-edit-context-mismatch`：**工具陷阱·`edit` 上下文失配（可执行条目；2026-10-10 由可预防性测试的"供给缺口"倒逼补料）**。**触发**：用 `edit` 替换文本，而 `old_string` 与文件当前内容**不完全一致**——常见来源：缩进/空白/换行差异、全角半角、BOM/编码、**该行已被更早的编辑改过**、以及"凭记忆或摘要写 old_string"。**症状**：工具返回 `old_string was not found in "<path>"`（本机 10-06~10-10 共 **21 次**，占全部任务失败 **43%**，是最大失败类）。**正确动作（按序）**：① **改前…

### case-02（cordis_inspect_query）
- `canon-trap-provider-method-list`：**工具陷阱·宿主 API/方法名臆测（可执行条目）**。**触发**：对宿主插件/检视服务**凭印象调用方法**（如 `describeService`）。**症状**：`provider "X" has no method "Y"`（本机 10-06 一例）。**正确动作**：① 先**列举**再调用——用宿主检视面（`cordis_inspect_list/query`）列出 provider 与**方法清单**，照抄方法名；② 找不到就查官方文档/源码导出，不猜；③ 猜错一次后**换路径**（列清单）而不是换拼写继续猜。**自检**：「这个方法名是**我列出来的**，还是我想出来的？」…

### case-03（grep）
- `canon-trap-grep-exit2-path`：**工具陷阱·`grep`/rg 退出码 2（可执行条目）**。**触发**：目标路径不可访问或不适合遍历——权限不足、目录不存在、指向 `node_modules`/vectordb 等海量或受保护目录、路径含特殊字符。**症状**：`grep search failed (exit 2): rg: <path> …`（本机四例）。**正确动作**：① 用**明确的文件或浅目录**为范围（先 `glob` 列文件，再逐个 `grep`）；② 排除 `node_modules/.git/data` 等（工具自带 ignore 之外要显式）；③ 路径带空格/中文时给引号；④ 权限类失败**换副本…

### case-04（multi_tool_use.parallel）
- `canon-trap-unknown-tool-name`：**工具陷阱·未知工具名（可执行条目）**。**触发**：凭"通用记忆"写工具名（如 `multi_tool_use.parallel` 之类本机并不存在的名字）。**症状**：`unknown tool "X"`（本机 10-07 一例）。**正确动作**：① 只从**本会话真实可见的工具面**里挑名字（工具清单/补全/上一轮真实调用）；② 多工具并行就用宿主提供的那一个（若存在）并**先小规模试**；③ 拿不准就先运行一次**单工具**验证名字。**反例**：照搬别处/别家 harness 的工具名。**自检**：「这个名字**我在本会话见过**吗？」…

### case-05（read）
- `canon-trap-read-offset-range`：**工具陷阱·`read` 行号越界（可执行条目）**。**触发**：凭印象/凭上次的行号给 `offset`，而文件已变短或被改过。**症状**：`offset N is out of range for "<path>" (M lines)`（本机 10-07/10-08 两例）。**正确动作**：① 大文件先 `grep` 定位目标行（拿到真实行号）再 `read`；② 或先 `read` 头部确认总行数；③ 报"越界"后**不要**继续猜，改用 `grep` 锚点定位。**反例**：沿用上一轮的行号；一次跳读很深的 offset。**自检**：「我这个 offset 是**刚拿到的**…

### case-06（dsh_wsl）
- `canon-installability-20261010`：**对外可安装性复盘（2026-10-10，用户裁定「想想刚刚那些问题，其它用户安装阿卡夏之书会不会遇到」）**。**本机当天真实事故**：重装插件（gate 1.2.3 / hooks 1.2.2）后，门控的 `akashaDir` 丢失 → 退回 `homedir()` 默认 `C:\Users\…\.akasha` → `usageSource/selfSource` 双双从 `library` 变 `fallback`（**用法条与自我层静默降级为内置兜底文本**，不报错）；根因＝**机器配置只写在"已装包的 patch"里**（就地改 node_modules 的实践），任何重装都会…

### case-07（pwsh）
- `canon-trap-pwsh-inline-js`：**工具陷阱·pwsh 内联多行脚本（可执行条目）**。**触发**：把多行 JS/Python 直接塞进 pwsh 的 node -e 或单行命令；或脚本串里内嵌同类引号。**症状**：Unterminated string constant / Unexpected identifier / 替换静默 0 处却当成功（2026-10-10 单日四次）。**正确动作**：① 多行脚本一律先落 .mjs 文件再执行；② 运行前 node --check <脚本>；③ 串内禁止内嵌同类引号（用「」或外层换引号）；④ 中文命令行走命令行时优先纯 ASCII。**自检问句**：这段代码是文件，还是我…

### case-08（edit）
- `canon-trap-edit-context-mismatch`：**工具陷阱·`edit` 上下文失配（可执行条目；2026-10-10 由可预防性测试的"供给缺口"倒逼补料）**。**触发**：用 `edit` 替换文本，而 `old_string` 与文件当前内容**不完全一致**——常见来源：缩进/空白/换行差异、全角半角、BOM/编码、**该行已被更早的编辑改过**、以及"凭记忆或摘要写 old_string"。**症状**：工具返回 `old_string was not found in "<path>"`（本机 10-06~10-10 共 **21 次**，占全部任务失败 **43%**，是最大失败类）。**正确动作（按序）**：① **改前…

### case-09（grep）
- `canon-trap-grep-exit2-path`：**工具陷阱·`grep`/rg 退出码 2（可执行条目）**。**触发**：目标路径不可访问或不适合遍历——权限不足、目录不存在、指向 `node_modules`/vectordb 等海量或受保护目录、路径含特殊字符。**症状**：`grep search failed (exit 2): rg: <path> …`（本机四例）。**正确动作**：① 用**明确的文件或浅目录**为范围（先 `glob` 列文件，再逐个 `grep`）；② 排除 `node_modules/.git/data` 等（工具自带 ignore 之外要显式）；③ 路径带空格/中文时给引号；④ 权限类失败**换副本…

### case-10（read）
- `canon-trap-read-offset-range`：**工具陷阱·`read` 行号越界（可执行条目）**。**触发**：凭印象/凭上次的行号给 `offset`，而文件已变短或被改过。**症状**：`offset N is out of range for "<path>" (M lines)`（本机 10-07/10-08 两例）。**正确动作**：① 大文件先 `grep` 定位目标行（拿到真实行号）再 `read`；② 或先 `read` 头部确认总行数；③ 报"越界"后**不要**继续猜，改用 `grep` 锚点定位。**反例**：沿用上一轮的行号；一次跳读很深的 offset。**自检**：「我这个 offset 是**刚拿到的**…
