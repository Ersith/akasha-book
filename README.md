# 阿卡夏之书（Akasha）· 可审计外置记忆层

> 面向语言模型智能体的**可审计外置记忆层**（模型无关、文件式、零依赖 Node）。
> 论文（设计、实现与初步运营报告 v0.5）：[`paper/akasha-paper-20261007.md`](paper/akasha-paper-20261007.md)。

## 这是什么（摘自论文）

语言模型智能体存在结构性「记忆赤字」：**权重内**的记忆不可审计、不可更正；**提示内**的记忆随会话消亡；而**全量日志**又会因「读写成本倒挂」而膨胀。阿卡夏之书把记忆当作一个需要**治理**的工程对象：

- **六库分工**：canon（稳定知识）/ mirror（叙事镜像）/ orphan（零权重孤案）/ pricing（行为定价）/ lexicon（情绪词表）/ frontier（文献基石）——按**用途**切分，各自带复核周期；
- **可审计的演化**：append-only + **修订链**（`supersedes`，永不改原文）+ **双时态**（事件时间 × 记录时间）+ 写入门控——「何时发生 / 何时记下 / 何时被改」三问皆可回答；
- **分层强制力**：软协议 → 机检（`check` / 门控）→ 审计与定价；来源态四标签（学过 / 接触过 / 记得·库内 / 搜到）；排序钉子「**无据的确定 ≪ 有据的不确定**」；
- **离线巩固**：睡眠（追加式蒸馏）+ **会话层**（单会话记忆：段抽取 / 结论优先检索 / 弧线树导航 / **循环观测（dry 干跑，只观测不干预）**）；
- **姿态**：换模型不换大脑——全部资产（数据 + 工具面 + 钩子 + 纪律文本）都在模型之外。

## 目录

- `core/` —— 核心库（零依赖 Node）：CLI / MCP server / 自检 / 数据规范 / 软协议。**从这里开始** → [`core/README.md`](core/README.md)
- `plugins/` —— DeepSeek Harness（DSH）宿主插件五件：
  - `@akasha-book/gate`：写入门控 + 纪律注入（渲染时读库）
  - `@akasha-book/hooks`：事件记录 + 输出审计（`usage` / `output-audit` 观测线）
  - `@akasha-book/sleep`：调度与注入条子（睡眠摘要 / 库脉搏 / 回查提示 / 唤醒条）
  - `@akasha-book/session`：会话层调度（增量索引 / 压缩事件行 / 节奏条）+ 循环观测 P0
  - `@akasha-book/mcp`：MCP 注册桥
- `paper/` —— 论文 v0.5（设计、实现与初步运营报告）
- `deps.md` —— 依赖标注（平台 / 插件 / npm）
- `CHECKS.md` —— 发布前隐私与安全扫描记录（四轮 + 维护同步复扫）

## 30 秒跑通（只需 Node）

```bash
cd core
node init-example.mjs      # 初始化示例库（六库中性示例 + frontier 文献基石）
node test.mjs              # 137 项自检（示例库口径；全绿 = 可交付）
node akasha.mjs brief 修订  # 主题简报（跨六库取料，带来源态与时间坐标）
node akasha.mjs lookup 信任 # 检索
node akasha.mjs mirror match 虚构 危险   # 镜像结构匹配
node akasha.mjs session loopwatch        # 循环观测（dry 干跑）汇总
node mcp.mjs               # MCP stdio server（18 工具）
```

## DSH 插件安装（可选）

1. **从 npm 安装（推荐）**：`npm i @akasha-book/gate`（其余四件：`@akasha-book/hooks` / `@akasha-book/sleep` / `@akasha-book/session` / `@akasha-book/mcp`），或在 DSH 插件管理器里直接用包名安装；
2. 或取 **Release 附件**里的五个 `*.tgz`，用 DSH 插件管理器安装；或从源码自行打包：`cd plugins/akasha-gate && npm pack`（其余四件同法；零依赖，产物即 tgz）；
3. 配置：默认值均指向 `~/.akasha`（家目录，运行时计算）；会话层的 `sessionsRoot` 指向你的宿主会话档案目录——细节见各插件 `README.md` 与 `cordis.patch.yml`。

## 状态与边界（诚实）

- **测试期**：六库数据面与插件处于「冻结 → 受控解冻」治理周期（论文 §5.3），接口可能随测试修正；当前核心自检 **137/137**（示例库口径；另有 zstd 用例在 Node <22.15 上 SKIP）、五件插件自检全绿。
- 本项目不捆绑任何模型与凭据；插件默认不采集网络数据。
- 循环观测为 **dry 观测**——不干预、不注入；干预版本待数据积累与逐条裁定。

## License

MIT（见 [`LICENSE`](LICENSE)）。
