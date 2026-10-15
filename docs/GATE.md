# 门档（Gate）· 三趟循环 + 独立审核的机械执行器

> 给**外部使用者**的落地说明（2026-10-15 首版；随 `tools/gate.mjs` 一起发布）。
> 一句话：**把「慢思考」从"每一步都慢"改成"只在决定性节点上慢"**——省钱靠**交接物变形**（重读原文 → 高密度切片 + 判别式），不靠少看。

## 1. 它解决什么问题
代码审计 / 数据迁移 / 跨文件重构这类活，最容易出的两种事故：
- **假绿**：用例"通过"，但它喂的输入**绕开了**声称要修的场景（本工具的 `escalate` 专门拦这个：`false-green` 一条即升级）；
- **假修复**：看起来改了，实际没达成声称目标（本工具靠**判别式**抓：`新代码 PASS ∧ 旧代码 FAIL` 的**双向检查**，任一方向不过就有问题）。

## 2. 三层结构与成本（实测量级）
| 层 | 谁做 | 产出 | 成本 |
|---|---|---|---|
| **P0 机检** | **零模型**（一条命令） | `p0.md`：主套件 / 库校验 / 体检 / 全家扫描 / `node --check` / **六库快照哈希** | **秒级~分钟级**（参考：97s） |
| **P1 快层** | 快模型 × ≤4 个**正交单元** | `slices.jsonl`：指控＋**逐字原句**＋锚点＋`risk_class`＋`status`＋`reality_entry`＋**最小证伪实验** | ≤3 分钟/单元 |
| **P2 慢层** | 深模型，**仅升级项** | `verdict.json`：升级项的真伪裁决 | 少而精 |
| **P3 独立审核** | 全新上下文、只读 | 抽查 ≥20% 的双向检查，**只审判别式、不重做结论** | 中 |

> 为什么要分层：实测**深度臂 90%（复核后 ≈82%）的墙钟花在"往返"上**（看完输出、写下一个探针之前的推理），探针真跑只占 3%；
> 而**机械层全跑一遍只要 ~97 秒**。⇒ 把"能机检的"先跑掉，慢层只对升级项开火。

## 3. 命令（`node tools/gate.mjs <子命令>`）
```bash
# ① P0：机检（本仓没有的检查会标 SKIP，不算 FAIL —— 便于不同布局直接套用）
node tools/gate.mjs p0 --task my-task --check src/changed.mjs --out ./gate-out

# ② 快层产物：切片模板（含闭词表，防字段名漂移）
node tools/gate.mjs slices-template --task my-task --out ./gate-out

# ③ 批量跑探针（把 N 次往返压成 1 次）
node tools/gate.mjs fixture --kind cli-call --file ./probes/p1.mjs     # 夹具模板：temp-store / mcp-probe / cli-call
node tools/gate.mjs run ./probes --task my-task --out ./gate-out       # ⇒ probes.md / probes.json

# ④ 升级裁决（可给多个文件：跨工人聚合）——**退出码 3 ＝ 不得报绿**
node tools/gate.mjs escalate --slices ./gate-out/my-task/slices.jsonl --task my-task --out ./gate-out

# ⑤ 收口：summary.md + 一段可直接落库的声明文本
node tools/gate.mjs close --task my-task --out ./gate-out

# ⑥ 自测（不碰真库）
node tools/gate.mjs selftest
```

## 4. 切片（slice）字段与闭词表
```json
{"id":"S1","unit":"unit-A","claim":"（一条可证伪的指控）","quote":"（逐字原句，禁止转述）",
 "anchor":"src/x.mjs:123","rev":"sha256:前12位","risk_class":"dataloss","status":"实证",
 "reality_entry":"reproduced","data_critical":false,"falsifier":"（≤1 个探针：什么最小实验能让这条主张挂掉）"}
```
- `risk_class ∈` **dataloss / silent-skip / false-green / coverage-gap / false-fix / crash / perf / docs / other**
- `status ∈` **实证 / 推测 / 未决**　`reality_entry ∈` **theoretical / observed / reproduced**
- **零容忍校验**：未知取值 / 缺字段 ⇒ `invalid-input`（退出码 3）；坏行**计数并告警**，绝不静默丢弃。

## 5. 升级判据（可机检）
- **A1 立即升级**：`status=实证 ∧ reality_entry≠theoretical ∧ risk_class ∈ {dataloss, silent-skip, false-green, false-fix, crash}`，或 `coverage-gap ∧ data_critical`。
- **A2 趟末升级**：**实证**的 `false-fix/crash` 成批出现（≥2 单元 或 同文件 ≥2 处）。
- **不升**：低危且可用现成命令证伪；纯文档；单文件小改且 P0 全绿。

## 6. 报绿双条件（**机制目的：把「没发现」与「没能力发现」分开**）
放行 ＝ **无升级项** **∧** **自证包完整**（切片数 / 单元数 / 带证伪器数 / untranslatable 数 / 零切片单元清单）。
否则判 `invalid-input` / `unverifiable`，**退出码 3**——不许报绿。

## 7. 三条硬约束（实测踩过）
1. **锚点会过期**：切片必须带 `@rev`（文件哈希），并给 run 起始的 `snap/` 只读副本——否则"审计→修复"一个来回后锚点就失效；
2. **早退判据要信号式**：靠"某趟无新增"的早退，实测 0 次触发＝死条款 ⇒ 改成 ① 无升级项 ② 单元状态已定 ③ 预算到；
3. **哈希口径排除活写面**：若你的库有常驻写入方（如索引器），快照哈希只覆盖"静态面"（本工具默认只对六库做快照），否则每轮都要付"并行写入甄别"的人工税。

## 8. 环境变量与可移植性
- 数据根 `AKASHA_ROOT`（默认 `<repo>/data`）、日志根 `AKASHA_LOGS`（默认 `<repo>/logs`）；
- **P0 的检查项按存在性自动跳过**：另一套布局（或只带核心库的精简版）照样能用——它仍会给你**快照哈希**与**语法检查**；
- 想接自己的检查？照 `p0` 的 `CANDIDATES` 列表加一行即可（每项＝名称 + 探测文件 + 命令行 + 超时）。

## 9. 设计边界（如实，别过度期待）
- 判别式能抓"**声称与验证手段不匹配**"（假绿/假修复）一类，但**样本选择是生成者手里的自由参数**——机械执行**无法发现选错样本**；
- 三类**不在判别式搜索面**：跨声称的组合交互 / 数据-代码一致性 / 时序并发；
- 快层"生成判别式"的能力已在**四档规模（45 / 305 / 1399 / 10914 行）**上验证（含跨文件追踪），但四档同属一类缺陷——**别把结论外推到别的缺陷类**。

## 10. 与库的关系（**为什么不把运行态入库**）
门档的**运行态与切片不入库**：会话/记忆层是"对话与判断"的派生索引，塞运行态会污染检索。
只把**里程碑**落库（`close` 会给你一段可直接喂 `akasha.mjs add --store canon` 的声明文本）——**功能完整性与"进不进库"无关**。
