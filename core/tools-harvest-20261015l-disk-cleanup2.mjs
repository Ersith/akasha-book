// akasha/tools/harvest-20261015l-disk-cleanup2.mjs —— D 盘清理批 2 留痕（BlenderTemp 删除 + quarantine 定性 + CW 分解）
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-disk-cleanup2-20261015'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**D 盘清理批 2（2026-10-15 下午）**：BlenderTemp 删除（用户授权「看完了，可以删」）+ quarantine 定性 + ClaudeWorkspace 分解。**D 盘可用：9.4GB → 36.5GB**（批 1 清暂存 4.48G + 批 2 删 BlenderTemp 14.67G）。',
  '**① `D:\\BlenderTemp` 已删**：14.67GB（43 个 autosave.blend，最新 10-01）；删前核过无 Blender 进程。**② `dsh-tmp-obj-quarantine` 定性（抽验 3 个对象）**：magic=zlib（78 01）流，解出为 `blob <原始大小>` 包头 + 内容——#1 是 **LoRA 权重**（`diffusion_model.*.lora_down/lora_up` BF16 safetensors）、#2/#3 是 **Python 包快照**（PK zip + `functorch/__init__.py`，原始 2.75GB）⇒ **它是「工作区变更快照对象（内容寻址 blob）」的隔离件**——时间全在 10-03 深夜→10-04 凌晨（v3a 训练期 / C 盘危机处置夜），只读标记＝当时的「只搬不删」保全动作；对应产物 v3a 用户 10-04 已裁定回退 ⇒ **建议可删（20.3GB），待用户拍板**。',
  '**③ ClaudeWorkspace 分解（199GB）**：`krea2 136.6G` = models 86.4G + output 38.7G + venv 5.4G + cache 3.5G + wheels 2.5G；`sekali-lab 61.9G` = output 43.9G + data 7.5G + venv 5.2G + .uv-cache 5.2G。**可清候选（需用户示意）**：两个 `output`（82.6G，可能有废图/中间图）、`cache/.uv-cache/wheels`（11.2G 缓存类）、`models 86.4G`（可能有旧版/重复模型）。**不可动**：venv（在用）。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-disk-cleanup2-20261015',
  claim,
  source: { type: '复现', ref: 'tmp/peek-obj.mjs 抽验（3 对象）· tools/disk-usage.mjs（krea2/sekali-lab）· Remove-Item 实录（freed 14.67GB）' },
  event_time: '2026-10-15',
  last_reviewed: '2026-10-15',
  tags: ['磁盘', 'D盘', '清理', 'quarantine', 'ClaudeWorkspace'],
});
console.log('已入 canon：' + r.id);
