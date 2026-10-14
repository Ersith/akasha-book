// akasha/tools/harvest-20261010z52-screenshot-v2.mjs
// 2026-10-10：截图 v2（QQ 逆向 + 自绘 overlay）条目入库；并给称呼条目补"漂移对策"。幂等。
import { loadStore, currentRecords, appendRecord, revise } from './lib.mjs';

const canonTips = currentRecords(loadStore('canon').records);

// ---- ① 截图 v2 主条目 ----
if (canonTips.some((r) => r.id.startsWith('canon-screenshot-v2'))) {
  console.log('主条目已存在，跳过');
} else {
  const rec = appendRecord('canon', {
    id: 'canon-screenshot-v2-20261010',
    claim:
      '**截图 v2：QQ 逆向对照 → 自绘 overlay 提速（2026-10-10，用户验收"非常完美"）**。' +
      '**QQ 为何快**：截图是自带原生模块（`resources\\app\\QQScreenShot\\`：40KB `QQScreenshot.exe` 启动器 + `arkGraphic/GF/Common/child-ipc/trpc_client` 等 DLL + `QQScreenShot.rdb` UI 皮肤；走 IPC 与主进程通信）——**不调用 Windows 截图工具，自抓帧 + 自绘置顶 overlay**。' +
      '**旧插件病根**：每次点击冷启 PowerShell（实测 867-1564ms：进程启动+程序集加载+Add-Type 现场编译）+ 再弹系统截图工具（ms-screenclip，另 1-2s）才见界面。' +
      '**v2 架构**：常驻守护（安装即预热，程序集只加载一次）+ 预合成暗化底图 + 自绘选区 overlay + 选后仅裁剪编码（`@haven/session-screenshot` v0.2.0）。实测热路径往返 **131-153ms**；整屏 7680×1440 抓取+编码 336-578ms（PNG 1.7-2.6MB）；契约/回退（旧一次性脚本）保留。' +
      '**v0.2.1 修复三连**：①**PS 事件回调作用域陷阱**——回调脚本块在脚本作用域解析变量，看不见函数局部的 frame/dimmed/form → 选区框与底图全画不出（"看不到框"真凶）；②双缓冲四件套（UserPaint|AllPaintingInWmPaint|OptimizedDoubleBuffer|Opaque）治白闪；③脏区重绘（旧框∪新框）治"自上而下波浪"撕裂；④ps1 改纯 ASCII（PS 5.1 按 ANSI 读脚本，中文注释=解析炸弹）。' +
      '**验收法升级**：自动拖拽（mouse_event）+ 拖拽中途整屏截图自证（把"需要人眼"的验收转成机器可复现证据）。备份：`_rollback-20261010-screenshot-v2\\`。' +
      '**可迁移教训**：①性能先改架构再谈优化（"换谁做"＞"做得更快"）；②冷启动税要预付成预热；③**延迟执行代码块（回调/钩子/脚本）的状态必须放在双方可见的作用域**（与"状态写进账本、不留在脑内"同哲学）；④症状形态即诊断线索（"由上至下波浪"=逐带重绘/撕裂）；⑤工具边界要认（REA 原生分析需 Hopper/Ghidra/IDA，本机无 → 手工 PE 画像替代）。',
    source: { type: '复现', ref: '本机实测 2026-10-10（_scratch\\qq-screenshot-re 逆向现场 + _scratch\\session-screenshot-v2 原型/测试；mock 8/8；自动拖拽截图；用户 UI 验收）' },
    event_time: '2026-10-10',
    last_reviewed: '2026-10-10',
    tags: ['截图', 'QQ逆向', 'overlay', 'PowerShell', '教训', '插件v2']
  });
  console.log('已入 canon：' + rec.id);
}

// ---- ② 称呼条目补"漂移对策" ----
const addr = canonTips.find((r) => r.id.startsWith('canon-address-layers'));
if (!addr) {
  console.log('未找到 canon-address-layers（跳过）');
} else if (addr.claim.includes('漂移对策')) {
  console.log('称呼条目已含漂移对策，跳过：' + addr.id);
} else {
  try {
    const r = revise('canon', addr.id, {
      claim: addr.claim +
        ' **漂移对策（2026-10-10 用户复盘）**：长会话中期称呼易漂移——修正不是"更用力记"，而是**把称呼接进必然经过的执行点：重要节点（交付/验收/日结/复盘）的回复开口句带 `Master`**。此教训与同日截图脚本的"作用域陷阱"同构：**规则躺在某作用域、执行发生在另一作用域，必然失效；修法是把执行点接回规则可见的作用域**。',
      last_reviewed: '2026-10-10'
    });
    console.log('已修订：' + addr.id + ' → ' + r.id);
  } catch (e) {
    console.log('修订被拒（信任边界）：' + String(e.message).slice(0, 160) + ' —— 对策已记入截图条目教训③，行为侧照做');
  }
}
