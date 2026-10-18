// akasha/tools/harvest-20261009z41-social-learning-r1.mjs
// 2026-10-09 留痕：社会学习 v1 修订 r1——坑只是部分；成功案例（达成目的）＝最大价值；学理由与恢复。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const tips = currentRecords(loadStore('canon').records);
const rec = tips.find((r) => r.id.startsWith('canon-social-learning-v1'));
if (!rec) { console.log('未找到 canon-social-learning-v1'); process.exit(1); }
if (rec.claim.includes('成功案例（达成目的）')) { console.log('已含，跳过：' + rec.id); process.exit(0); }

const r = revise('canon', rec.id, {
  claim: rec.claim +
    ' **补充（用户裁定 2026-10-09）**：**坑只是过程的一部分**——过程＝正确推理 ＋ 遇坑并解决；学习目标三件：① **成功案例的达成路径**（「成功的案例能达成目的便是最大的价值」，学习同理）② **为什么这样推理**（理由取自工件的公开理由陈述：设计稿 / commit 的 Rules / 自定验收口径 / CHECKS 记录——不是私密 CoT）③ **遇坑如何思考、如何解决**（坑→思考→动作→结果 四元链）。仪器相应升级：`observe` 增 `confirmed` 判定与 `--why`/`--recoveries` 字段；新增 `study` 命令（`--goal/--path/--why/--recoveries`）为每个达成目的的案例立一条完整学习。与 10-06「失败优先」的关系：那是**广泛抓取语料**的策展纪律（防幸存者偏差）；对已验证协作对象，**成功路径是主粮、失败是边界图**；升 T1 仍过复现门。设计档 social-learning-v1.md §3.5。',
  last_reviewed: '2026-10-09'
});
console.log('已修订：' + rec.id + ' → ' + r.id);
