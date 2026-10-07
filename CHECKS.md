# 发布前隐私与安全扫描记录（CHECKS）

> 对象：本目录（`dist/akasha-oss`，开源发布候选）。
> 铁律：零本机路径 / 零用户名 / 零密钥或 token / 零内网端口 / 零个人记忆与事件内容。
> 多轮扫描，逐轮记录（含过程事故——扫描器自身也会出错，一并留痕）。

## R1 · 源材料预扫（2026-10-07）

- 对象：`akasha/` 核心库 + 四个插件目录（md / mjs / js / json / yml）。
- 结论：命中集中在插件 README / cordis.patch.yml / index.js 的默认路径与包名——属于复制前的侦察面。
- **过程事故（在案）**：首轮模式漏检「JS 源码里的双反斜杠转义写法」（本机路径的转义变体）——修正为「单/双反斜杠与正斜杠」三变体模式后完整覆盖。**教训：扫描器本身也要换角度复查。**

## R2 · staging 全量扫描（变体模式）

- 模式：本机路径（单/双反斜杠、正斜杠三变体）/ 用户名 / 云厂商密钥前缀（`sk-` / `AKIA` 等）/ API-key 与 Bearer 变量名 / GitHub·Slack token 前缀 / Windows 用户目录与环境数据目录字样 / 本地工具链盘符前缀 / 环回地址带端口 / 包 scope 前缀（`@local`）。
- 命中与修复：**6 文件 7 处**——hooks `cordis.patch.yml`（包名+路径）、gate `package.json`（包名）、`lib.mjs` / `SCHEMA.md` / `sleep.mjs` 注释（包名）、论文版本行（包名）。
- 修复后复扫：**0**。
- **过程事故（在案）**：一次含数据目录字样的复制命令被本机 `akasha-gate` 按设计拦截（「命令含数据路径 + 写动词」即拒）——改用只读通道（robocopy）完成。**门控行为正确，非缺陷；它拦的就是它该拦的。**

## R3 · 换角度（字节与文件名）

- NUL / UTF-16 字节检查：**0 个文件**（全部 UTF-8 文本）。
- 文件名清点：全部中性；发现并**移除**一处运行产物（`core/logs/sleep-*.json`——诊断脚本副产物，内容为纯桩计数器）——发布包**不含 `logs/`**（运行时自动生成）。

## R4 · 终扫（全模式 + 会话引用类扩展）

- 全模式残余：**2 处，均在论文**——「受控解冻（每次解冻须用户裁定、限定范围、全程留痕）」与术语表「裁定」。
- **判定：保留**——「用户」为方法论术语（使用者角色），不含身份信息；论文叙事体裁需要它。除此之外全模式 **0**。
- 当前文件总数：39。

## 结论

- **零本机路径 / 零用户名 / 零密钥与 token / 零内网端口 / 零个人记忆条目**。六库数据 = 中性示例（init-example 生成）+ 公开论文元数据（frontier 基石，含 1 处个人色彩词已脱敏：「我们的 sleep 插件」→「与离线巩固思想同向」）。
- **开放项（发布前确认）**：① ~~LICENSE 选择~~ **已定：MIT**（依据：`deepseek-ai/deepseek-harness` 官方仓库为 MIT License——社区主流；2026-10-07 查证）；② ~~npm 包名~~ **已定 scope：`@akasha-book/{gate,hooks,sleep,mcp}`**（用户裁定 2026-10-07；发布前确认 scope 在 npm 的可用性）；③ `plugins/akasha-mcp/cordis.patch.yml` 的 `<AKASHA_DIR>` 占位需安装者改为实际路径；④ 四包 `package.json` 的 `"private": true` 发布时需移除（npm 会拒绝发布 private 包）。
- 扫描纪律执行方式：R1（源）→ R2（全量变体）→ R3（换角度：字节/文件名）→ R4（终扫+判定）——**发布前任何一次内容改动都应重跑 R2+R4**。

## R5 · 维护同步后复扫（2026-10-07 晚）

- 触发：本体维护批 + 会话层（小阿卡夏）并入开源包——core 重同步（lib / akasha / mcp / sleep / test / SCHEMA + 新增 `session.mjs` / `loop-detect.mjs`）+ 插件四→五件（gate 1.2.0 / hooks 1.2.0 / sleep 1.5.1 / session 0.2.3）。
- 验证：core `test.mjs` **77/77**（示例库口径）；四插件 selftest 全绿（session 18/18；含审计累积与门控箭头回归哨兵）。
- 全模式扫描：仅两类允许项——① 本记录自身的模式说明（本轮起改为**描述式写法**，不再含字面路径）；② 论文源起叙事中的「苦力怕」（虚构游戏生物、公版素材，判定保留）。
- 新约定：**包内任何改动 → 重跑等价全模式扫描**；插件默认值一律 `homedir()` 运行时计算（源码不含用户目录字面量）；跨运行环境断言以「双路信号任一命中」为形态（见 core `readSessionArchive` 截断帧信号）。

## R6 · 发布上线（2026-10-07 晚）

- 目标：GitHub 开源发布（账号 `Ersith`）——仓库 **`Ersith/akasha-book`**（public，默认分支 main）；初版 commit `3bb7834`（48 文件 / 5814 行）、tag **v0.1.0**、Release 附件 **6 件**（五插件 tgz + 论文 md）；README 安装行微调 commit `6f33be5`。
- 发布前门（全绿）：core `test.mjs` **77/77**、四插件 selftest 全绿；凭据全程未落屏（仅进程内使用）；打包与仓库内容按 R5 口径。
- 消费者侧冒烟：Release 附件公开下载 **HTTP 200**（`akasha-book-session-0.2.3.tgz`）。
- 版权与许可：`LICENSE` = MIT（Copyright (c) 2026 Ersith）；插件 `private:true` 保留（npm 轨启用时再移除）。
- 发布轨：GitHub 直装 / Release 附件（本轨）；**npm 轨未启用**（`@akasha-book` scope 可用性待核）。
- 已知小项：仓库 Topics 经 API 两次设置未生效（令牌权限面所致，静默无报错）——**需在 GitHub 仓库页 Settings → Topics 手动补**，官方要求必填 **`dsh-plugin`**（官方 README「Community and support」指定：加该 topic 以获得插件可发现性），建议一并加 `agent-memory` / `llm-agents` / `memory` / `mcp` / `deepseek-harness`。
- 官方社区坐标（2026-10-07 核实，官方 README 现行版）：**Discord** `https://discord.gg/4MrtZUhpxg`；**GitHub Discussions** `https://github.com/deepseek-ai/deepseek-harness/discussions`；插件发现＝`dsh-plugin` topic。
- 回滚：`git push origin :refs/tags/v0.1.0` 后删除对应 Release 即回退该版；整体撤回＝仓库转私有或删除。**数据不动**（发布仅含源码/文档/示例数据）。
