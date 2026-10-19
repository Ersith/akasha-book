// akasha/tools/harvest-20261007z17-world-sim.mjs
// 2026-10-07 留痕：world-sim 立项准备——frontier 基石 11 条 + canon 立项条目。幂等。
import { loadStore, appendRecord } from './lib.mjs';

const FRONTIER = [
  ['front-objectfolder-20261007', 'ObjectFolder: A Dataset of Objects with Implicit Visual, Auditory, and Tactile Representations', 'https://ar5iv.labs.arxiv.org/html/2109.07991', 2021, '多感官对象数据', ['量感世界：多感官对象基石（视觉×听觉×触觉）', '基准物库选型参考']],
  ['front-objectfolder-bench-20261007', 'The ObjectFolder Benchmark: Multisensory Learning with Neural and Real Objects', 'https://ar5iv.labs.arxiv.org/html/2306.00956', 2023, '多感官对象数据', ['多感官评测协议与素材']],
  ['front-tacto-sim-20261007', 'TACTO: A Fast, Flexible, and Open-source Simulator for High-Resolution Vision-based Tactile Sensors', 'https://ar5iv.labs.arxiv.org/html/2012.08456', 2020, '触觉仿真', ['触觉软件化先例（视觉→触觉代理）']],
  ['front-sim-survey-tud-20261007', 'Survey on Simulators for Robot Learning (TU Darmstadt)', 'https://www.ias.informatik.tu-darmstadt.de/uploads/Team/NicoBohlinger/Survey_on_Simulators_for_RobtoLearning.pdf', null, '仿真引擎选型', ['引擎横向对比：精度/GPU/6DoF']],
  ['front-sim-compare-aaai-20261007', 'Physics engine comparison: Isaac Sim vs MuJoCo vs PyBullet (AAAI OJS)', 'https://ojs.aaai.org/index.php/AAAI/article/view/38894/42856', null, '仿真引擎选型', ['三引擎对照数据']],
  ['front-articulated-survey-20261007', 'Survey on Modeling of Articulated Objects', 'https://ar5iv.labs.arxiv.org/html/2403.14937', 2024, '铰接物体建模', ['门/抽屉/盖——能动件建模']],
  ['front-mass-dataset-20261007', 'Learning to Weigh Waste: Physics-Informed Multimodal Fusion and Large-Scale Dataset', 'https://ar5iv.labs.arxiv.org/html/2603.00931', 2026, '物体质量估计', ['"多重"可从数据学——质量估计先例']],
  ['front-ddg-flexible-sim-20261007', 'Discrete Differential Geometry for Simulating Nonlinear Behaviors of Flexible Systems: A Survey', 'https://ar5iv.labs.arxiv.org/html/2510.17546', 2025, '柔性体仿真', ['软/柔/布的近似仿真边界']],
  ['front-piqa-20261007', 'PIQA: Reasoning about Physical Commonsense in Natural Language', 'https://ar5iv.labs.arxiv.org/html/1911.11641', 2019, '物理常识基准', ['模型物理常识的基准与短板']],
  ['front-global-piqa-20261007', 'Global PIQA: Evaluating Physical Commonsense Reasoning Across 100+ Languages and Cultures', 'https://ar5iv.labs.arxiv.org/html/2510.24081', 2025, '物理常识基准', ['跨语言物理常识评测']],
  ['front-haptic-perception-20261007', 'Haptic Perception (overview, ScienceDirect topics)', 'https://www.sciencedirect.com/topics/social-sciences/haptic-perception', null, '人类触觉知觉', ['人的触觉知觉——对照系']]
];

let added = 0; let skipped = 0;
const existing = new Set(loadStore('frontier').records.map((r) => r.id));
for (const [id, title, url, year, topic, supports] of FRONTIER) {
  if (existing.has(id)) { skipped += 1; continue; }
  appendRecord('frontier', {
    id, title, url, ...(year === null ? {} : { year }), topic,
    status: '待验证', last_checked: '2026-10-07', next_review: '2026-11-07', supports,
    event_time: '2026-10-07'
  });
  added += 1;
}
console.log(`frontier：新增 ${added}，跳过 ${skipped}`);

const CID = 'canon-world-sim-20261007';
if (loadStore('canon').records.some((r) => r.id === CID)) { console.log('canon 已存在，跳过：' + CID); }
else {
  appendRecord('canon', {
    id: CID,
    claim: '**量感世界（感官扩展 v0）· 立项准备（2026-10-07，用户提出）**：为外置大脑补几何—力学感官通道——把「多大 / 多沉 / 推不推得动 / 碎不碎」从文本先验变成**可测量·可复现·可入库**的经验。用户裁定次序：① **修图像分析环境（已完成）**——dsh-blender `.venv` 重建（Python 3.12.10 + cv2 4.14 / numpy 2.5.3 / Pillow 12.3.0 / scipy 1.18.1；`blender_status.analysis.available=true`；重建命令见 `research/world-sim-plan-20261007.md`；重装插件会清掉 .venv 需重跑）；② 文献（frontier 新增 11 条基石：ObjectFolder×2 / TACTO / 引擎对比×2 / 铰接物体 / 质量估计 / 柔性仿真 / PIQA×2 / 触觉知觉）；③ 教程（Blender 物理手册 / MuJoCo / PyBullet / Isaac Sim / bpy API）；④ 代码准备（`world-sim/`：README + `params/unit-table.json` 种子 6 物（全带 source_status）+ `probes/` 三探针计划）。**3D 引擎正式启用待裁定**；边界如实：仿真给因果近似、给不了手感；参数表是质量的唯一来源、错参数＝教错世界。',
    source: { type: '复现', ref: 'research/world-sim-plan-20261007.md；world-sim/；blender_status 实查' },
    last_reviewed: '2026-10-07',
    event_time: '2026-10-07'
  });
  console.log('canon：已新增 ' + CID);
}
