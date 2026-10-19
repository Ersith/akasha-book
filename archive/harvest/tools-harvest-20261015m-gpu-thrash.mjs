// akasha/tools/harvest-20261015m-gpu-thrash.mjs —— 终末地卡顿诊断留痕
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-gpu-thrash-20261015'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**「终末地卡成 PPT」现场诊断（2026-10-15 15:25）＝显存颠簸（thrashing）**——现场证据：`nvidia-smi` 读到 **GPU 利用率 100% 但功耗仅 101W**（4090 满载应 350-450W）+ **显存 23654/24564 MiB（96%）** + 温度 43°C + 频率 2760/3105（未降频）。⇒ GPU 不是在"算"，而是在**反复换入换出纹理（等 PCIe/内存）**——这就是帧生成崩塌（PPT 化）的物理机制；**不是过热、不是降频、不是算力不足**。',
  '**显存被谁占**（同机常驻户清单，2026-10-15）：终末地本体 · **ComfyUI（PID 4188，13:52 启动，`main.py --port 8188`，常驻占显存）** · **Hindsight API（PID 8624，`hindsight-api.exe --idle-timeout 0 --port 9077`，CPU 累计 4.5 小时——永不空闲退出）** · **OpenViking server（PID 51568）** · 一批 GPU 加速常驻应用（Chrome/Quark/QQ/微信/Eagle/Grok Bot/Claude/Codex/DSH/NVIDIA Overlay）。',
  '**处置建议（按收益）**：⒜ 玩**前先关 ComfyUI**（最大常驻显存户，用时装回）；⒝ 关掉不看的（Quark/Eagle/Grok Bot/多余 Chrome 窗口/NVIDIA Overlay）；⒞ Hindsight `--idle-timeout 0` 可改（或不用时停）——它是 CPU 大户且永不空闲；⒟ 游戏内降纹理/分辨率倍率、开全屏独占、限帧（压显存峰值）。**长期**：可做「游戏前一键减载」脚本（可选进程组清单，需用户确认名单）。',
  '**同日缓存清理（批 5）**：`krea2/wheels` 2.4G（torch wheel 等）+ `sekali-lab/.uv-cache` 4.9G 删除 ⇒ **7.3G**；**`krea2/cache` 3.5G 未动**——构成看清是**训练数据集缓存**（anat4_breast/anat4_pussy/ero_v5/v3_* 的缓存副本），非垃圾。**D 盘：72G 可用**（今日累计 9.4→72，+62.6G）。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-gpu-thrash-20261015',
  claim,
  source: { type: '复现', ref: 'nvidia-smi --query-gpu/--query-compute-apps · Win32_Process CommandLine 三进程实录 · Get-Volume D' },
  event_time: '2026-10-15',
  last_reviewed: '2026-10-15',
  tags: ['GPU', '显存', '诊断', '终末地', '性能', 'D盘'],
});
console.log('已入 canon：' + r.id);
