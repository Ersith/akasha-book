// akasha/tools/harvest-20261014a-causal-pilot.mjs
// 2026-10-14：I-09 因果注释字段先行——手工试点（给 10-13 体裁隔离链条打 caused_by/led_to）。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const MARK = 'CAUSAL-PILOT-20261014';   // 判据＝单一常量（与正文共用；防重复的机械修法，2026-10-13 教训）

const cur = () => currentRecords(loadStore('canon').records);
const find = (prefix) => cur().find((r) => String(r.id).startsWith(prefix));

const jobs = [
  { id: 'canon-genre-p0-20261013', patch: { led_to: ['canon-genre-p1-dose-20261013', 'canon-idle-resume-v110-20261013'] } },
  { id: 'canon-genre-p1-dose-20261013', patch: { caused_by: ['canon-genre-p0-20261013'] } }
];

for (const j of jobs) {
  const r = find(j.id);
  if (!r) { console.log('未找到：' + j.id); continue; }
  const key = Object.keys(j.patch)[0];
  const curVal = Array.isArray(r[key]) ? r[key] : null;
  if (curVal) { console.log(`= ${j.id} 已有 ${key}，跳过`); continue; }
  const out = revise('canon', r.id, j.patch);
  console.log(`已打注释：${j.id} → ${out.id}  ${key}=${JSON.stringify(j.patch[key])}`);
}

// 试点留痕（写进 newest 的条目里？不——留痕放同日 canon 由收尾脚本统一做；此处只打印）
console.log(`（试点标记 ${MARK}：字段定义见 SCHEMA.md；检索侧未改——「为什么」类遍历后置）`);
