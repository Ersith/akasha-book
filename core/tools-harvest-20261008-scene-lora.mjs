// 2026-10-08：scene_ref 场景 LoRA 里程碑的 canon 条目（三条新条目 + 一条修订）。
// 为什么要用脚本而不是 CLI --data：PowerShell 5.1 把含中文的参数按 ANSI 传给 node，
// 中文会被截断 -> JSON.parse 报 Unterminated string。写入一律走 lib.appendRecord（与 CLI add 同一函数）。
// 幂等：已存在同 id 跳过。
import { appendRecord, loadStore, currentRecords, revise, allIds } from './lib.mjs';

const RECORDS = [
  {
    id: 'canon-anime-person-detection-20261008',
    claim: '2026-10-08 实测：动漫/插画图的人物判定不能用 COCO 真人检测器——person_yolov8m-seg 在动漫图上几乎全漏检（框面积 0%），把 67 张「纯环境」里的 62 张带人物图误判为无人；anime_censor_v1.0_s.pt 只检测裸露部位（nipple/penis/pussy），不是人物检测器。可靠信号是 WD14（danbooru 训练）的 general 人物词（1girl/1boy/solo/multiple girls/person…），再以场景词数量判「环境是否为主体」：scene_hits>=4 且人物占比<=15% 归 envchar；scene_hits>=2 且无 simple/white/blurry background 归 chars（低权重收录）。',
    source: { type: '复现', ref: 'D:\\ClaudeWorkspace\\sekali-lab\\anime_prep.py + anime_person_audit.py + data\\scene-train-v3\\_person-audit.tsv' },
    last_reviewed: '2026-10-08',
    event_time: '2026-10-08',
    tags: ['wd14', 'anime', 'dataset', 'person-detection', 'sekali-lab'],
  },
  {
    id: 'canon-image-intake-resolution-20261008',
    claim: '2026-10-08 实测：训练图收图不能用「短边>=1024」当判据——动画/游戏视觉图大量是宽幅（1920x993、2000x1000、2048x970），短边 800-1000 而总像素近 200 万，该判据一次性误杀 39 张可用图。正确判据：短边>=768 或 总像素>=1.2MP（长宽比<=3.2、短边>=640 作硬底线）；裁掉 UI/文字边后再放宽到短边>=700。',
    source: { type: '复现', ref: 'D:\\ClaudeWorkspace\\sekali-lab\\anime_prep.py 阈值段 + 158 张样本前后对照' },
    last_reviewed: '2026-10-08',
    event_time: '2026-10-08',
    tags: ['dataset', 'image-intake', 'resolution', 'sekali-lab'],
  },
  {
    id: 'canon-lowdenoise-refine-loss-20261008',
    claim: '2026-10-08 实测（832x1216 / seed42 / 近景人像 / euler_ancestral 20 步）：mask 型精修通道在低 denoise 下只有损失没有收益——denoise 0.05 即改动 19.6% 像素（发丝与衣褶被抹平），而「只做 VAE 往返」仅改 2.1%，说明损失来自低 denoise 的 img2img 本身而非编解码；换非祖先采样器（euler 13.7%、dpmpp_2m 14.2%）只减轻约三成。规矩：该通道要么不开、要么 denoise>=0.3，0.05-0.20 是死区。另：低 denoise 场景不能用 Laplacian 清晰度判定（0.05 分数反而更高，是噪点造成的假象）。',
    source: { type: '复现', ref: '<LOCAL_PATH>\\tmp\\scene-diag-20261006\\lowdenoise_test.ps1 + lowdenoise-whatchanged.jpg' },
    last_reviewed: '2026-10-08',
    event_time: '2026-10-08',
    tags: ['comfyui', 'detailer', 'denoise', 'evaluation'],
  },
];

const PATCHES = [
  {
    id: 'canon-akasha-session-index-scope-20261008',
    patch: {
      claim: '2026-10-08 核实：@akasha-book/akasha-session 的自动索引只覆盖插件落位之后新建的会话——akasha-session 于 2026-10-07 22:05 建档，本会话 59f3a538 创建于 2026-10-06 03:09（早于插件），从未被自动索引入库（session-meta.json 里无条目），手动 node akasha.mjs session index <id> 一次补齐 938 段（lastSeq 2229）。已入库的另外 5 个会话创建时间全部 >= 2026-10-07 02:39。=> 对早于插件的长会话，收尾时需手动补索引。',
      last_reviewed: '2026-10-08',
    },
  },
];

const report = [];
const canon = loadStore('canon').records;
const existing = new Set(currentRecords(canon).map((r) => r.id));

for (const rec of RECORDS) {
  if (existing.has(rec.id)) {
    report.push('跳过（已存在） ' + rec.id);
    continue;
  }
  appendRecord('canon', rec);
  report.push('已追加 [canon] ' + rec.id);
}

for (const { id, patch } of PATCHES) {
  if (!existing.has(id)) {
    report.push('警告：找不到要修订的条目 ' + id);
    continue;
  }
  const r = revise('canon', id, patch);
  report.push('已修订 ' + id + ' → ' + (r?.id ?? '(新版本)'));
}

console.log(report.join('\n'));
