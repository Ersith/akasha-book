// 2026-10-07：盘点「三套记忆并联 + 社区插件更新窗口」的结论入库（幂等）。
// 用法：node akasha\tools\harvest-20261007-coexist.mjs
import { appendRecord, loadStore } from './lib.mjs';

const rec = {
  id: 'canon-akasha-memory-coexist-20261007',
  claim: '三套记忆并联盘点（2026-10-07）：① OpenViking 记忆（@haven/openviking-memory 0.5.8-haven.2，本地知识库 + 隔离捕获队列，每回合注入 <openviking-context>）；② Hindsight（@vectorize-io/hindsight-coding-agents 0.8.0，知识页 + 反思，注入 🧠 横幅）；③ **阿卡夏之书**（自有六库 + 十二 MCP 工具 + 四钩子 + 两条桌边条，见 §6）。**数据层完全隔离**——三者互不读写对方存储（阿卡夏只有自己经校验写入；门控只盯 akasha\\data）。**提示层是邻居**——同一份模型上下文里各占一块（设计稿 §8 已按「既有记忆灌注层 + 新增知识轴/纪律/定价层」规划，非冲突）。**更新纪律**：测试期（至 10-28）冻结全部插件更新（更新 = 替换 + 重启 + 改变注入面 = 记忆测试的混淆变量）；收官后统一更新窗口——先行目录依赖体检（§1.11，当前 5 个 link: 雷含 @haven/navigation）+ 快照 + 逐个安装验证。**待更新清单（2026-10-07 盘）**：dsh-context 0.59.2→0.64.0 / dshmarket 1.66.5→1.66.9 / @noob-stupid/dsh-plugin-console 0.5.31→0.5.42 / dsh-purge v1.1.46→v1.1.60（git tag）；**记忆插件无一需更**（hindsight 0.8.0 = npm 最新；openviking-memory 本地管线最高即 0.5.8-haven.2）。',
  source: {
    type: '复现',
    ref: 'plugin_manager list_bundles（38 条）+ profile package.json 依赖源核对 + npm view（hindsight/console/market/context/blender）+ GitHub tags API（dsh-purge）+ 本地 Haven 输出目录 tgz 清点（两处）；2026-10-07'
  },
  last_reviewed: '2026-10-07',
  tags: ['akasha', '记忆系统', '插件更新', '共存']
};

const existing = new Set(loadStore('canon').records.map((r) => r.id));
if (existing.has(rec.id)) {
  console.log('skip  canon ' + rec.id + '（已存在；改内容请用 revise）');
} else {
  appendRecord('canon', rec);
  console.log('added canon ' + rec.id);
}
