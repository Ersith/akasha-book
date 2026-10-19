// akasha/tools/harvest-20261007z12-oss-paper.mjs
// 2026-10-07 留痕：开源包维护同步 + 论文 v0.5 → OSS 链 与 论文链 各追加一版。幂等。
import { loadStore, revise, currentRecords } from './lib.mjs';

const OSS_APPENDIX =
  ' **维护同步 v1（2026-10-07 晚）**：core 全量重同步（lib / akasha / mcp / sleep / test / SCHEMA + 新增 `session.mjs` / `loop-detect.mjs`，示例库口径 **77/77**）+ 插件四→五件（gate 1.2.0 / hooks 1.2.0 / sleep 1.5.1 / **session 0.2.3**，全部 selftest 绿）+ 论文 v0.5 入包 + CHECKS **R5** 复扫零禁项（模式说明改描述式写法；「苦力怕」判定保留）。插件默认值统一 `homedir()`；跨运行环境断言加固（截断帧双路信号）；**46 文件**。';

const PAPER_APPENDIX =
  ' **v0.5（2026-10-07）**：增补会话层（小阿卡夏）——§3.9（段抽取 / 结论优先检索 / 弧线树 / 循环观测 P0 三环与「观测环修正自身」五类缺陷）、§4.5（与 opencode PR#21112 及 dsh-thinking-loop-guard 的源码级对照：借法不借装）、§5 数据和案例（树 A/B **19/20 vs 14/20**、保真 100/62/60%、帧序 8/8、审计恒零修复后首线、同族举一反三 5 处）、§6.2 新增失败模式（事件真值漂移 / 夹具失真）；套件 **77/77**；refs 新增 23/24；OSS 拷贝脱敏（作者注中性化、去内部文档引用）。';

let changed = 0;
for (const [anchor, appendix, guard, label] of [
  ['canon-oss-package-20261007', OSS_APPENDIX, '维护同步 v1（2026-10-07 晚）', 'oss'],
  ['canon-paper-v01-20261007', PAPER_APPENDIX, 'v0.5（2026-10-07）', 'paper']
]) {
  const tips = currentRecords(loadStore('canon').records);
  const tip = tips.find((r) => r.id === anchor || r.id.startsWith(anchor + '-r'));
  if (!tip) { console.log('未找到链尾：' + anchor); continue; }
  if (tip.claim.includes(guard)) { console.log('已含目标段，跳过：' + label + ' ' + tip.id); continue; }
  const r = revise('canon', tip.id, { claim: tip.claim + appendix });
  changed += 1;
  console.log('已修订：[' + label + '] ' + tip.id + ' → ' + r.id);
}
console.log('完成：修订 ' + changed + ' 条。');
