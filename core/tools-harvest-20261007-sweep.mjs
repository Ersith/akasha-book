// 2026-10-07「举一反三」类扫的结论入库（幂等）。
// 用法：node akasha\tools\harvest-20261007-sweep.mjs
import { appendRecord, loadStore } from './lib.mjs';

const rec = {
  id: 'canon-akasha-sweep-20261007',
  claim: '「举一反三」类扫（2026-10-07，由近日六类实错出发的全系统排查）：**类别表** = ①说明不随库（已修：gate 库驱动注入）②写入不可见（已修：库脉搏）③测试写死数量（已修：一律自洽/下界断言）④默认不安全/裸跑副作用（已修：删标记脚本；工具全线幂等）⑤观测线语义想当然（已修：注释+文档注明 prompt-change 只跟结构变更）⑥静默失败无痕。**本轮新捕获并修复**：(a) **`import-frontier.mjs` 整文件覆盖**——v1 重跑会抹掉设计稿外的 16 条应用向文献与全部修订链（活库被当生成物）；v2 改**幂等合并追加 + `--dry`**，双跑验证（新增 0 / 跳过 68 / 库况不变）。(b) sleep 两处写路径静默（state / inbox）→ v1.3.1 补 `sleep-state-error` / `sleep-inbox-error` 观测线（待办不会无声消失、水位线不会无声卡死）。(c) gate 库驱动降级无痕 → v1.1.1 补切换线 `gate-usage-fallback` / `gate-usage-recovered`（仅切换时落一行）。(d) 文档漂移一批：README 自检 34→35、mcp 桥工具面 6→12、PROTOCOL 注入源描述（真源 = canon-akasha-usage 当前版本）、WORKSPACE-MAP 两处，全部修订。**已知边界（非缺陷，登记在案）**：门控防「模型直写」不防「脚本内写文件」；并发跑同款幂等脚本存在窄 TOCTOU（事后 `check` 可查重复 id）。自测自撞一例：selftest 里改写成不同内容的同路径模块被 require 缓存吃掉——**模块代缓存**（canon-dsh-module-generation-cache 同族）在测试里也成立，改用「读标志位」的 stub 规避。',
  source: {
    type: '复现',
    ref: '本轮实修与验证（2026-10-07）：import-frontier v2 双跑；gate selftest 全绿（含库驱动降级/恢复切换）；sleep selftest 全绿（含写失败观测线两路）；akasha test.mjs 35/35；README / PROTOCOL / WORKSPACE-MAP / dsh-mcp-akasha README 同步修订'
  },
  last_reviewed: '2026-10-07',
  tags: ['akasha', '类扫', '静默失败', '幂等', '覆盖写入']
};

const existing = new Set(loadStore('canon').records.map((r) => r.id));
if (existing.has(rec.id)) {
  console.log('skip  canon ' + rec.id + '（已存在；改内容请用 revise）');
} else {
  appendRecord('canon', rec);
  console.log('added canon ' + rec.id);
}
