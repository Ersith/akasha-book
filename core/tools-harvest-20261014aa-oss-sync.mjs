// 2026-10-14：OSS 全量同步轮（公开仓上传 main）。幂等：判据＝单一常量。
import { loadStore, currentRecords, appendRecord } from './lib.mjs';
if (currentRecords(loadStore('canon').records).some((r) => String(r.id).startsWith('canon-oss-sync-20261014'))) { console.log('= 已存在'); process.exit(0); }
const claim = [
  '**OSS 全量同步轮：公开仓上传 main 完成（2026-10-14；用户令「检查无误后把现在的阿卡夏上传 main；随后交 claude/gpt 复核」）**。',
  '**范围**：core 主文件 9 + tools 304（含今日新增：时钟/review 工具面/修复合入；`loop-detect.mjs` 补入清单 + tools 扁平 import 改写）· 数据 7 库 2719 KB（门禁 + 占位邮箱替换）· 插件 35 文件（oss-sync v2 映射）。**提交**：`8130992`（前任 `fa37019`），推送 `fa37019..8130992 main -> main`、远程对账一致；清除 4 个内部杂物（*.bak-*/_verify-*）并入 .gitignore。',
  '**公开前隐私/API 专项（用户当日提醒「公开仓，去隐私和我们的 API」）**：独立终扫首轮 **53 文件硬命中 → 0**（本机路径族含裸/转义变体、@local、环回端口与裸端口令牌 <PORT>/<PORT>/<PORT>/<PORT>/<PORT>、用户名）；新增清洗器 `tools-oss-scrub-paths.mjs`（dry 默认）定为**每次同步后固定检查单**；`sync-core` 映射表补齐根因（防回灌）。**数据门禁误伤第二例**（判据被自己描述的对象误伤——首例 git 前缀）：`canon-oss-data-sync-20261012` 正文引用占位邮箱 `a@b.com` ⇒ 处置＝副本替换 `<EMAIL>`（不放宽真邮箱判据；自检扩为 正/反/侧/侧2 四例）。保留项（结构性）：门禁/红action 自检内示例邮箱与合成令牌（夹具非真凭据）——R30 留痕判定。',
  '**OSS 侧验证**：仓内自跑 套件 **236/236（+1 skip）** · `check` **730/730**。**修掉的三红**（同步引入/击穿）：tools 扁平 import（test ↔ checker-selftest）、checker-selftest 硬编码本机临时根（→ os.tmpdir()）、policy 夹具被清洗失配（→ 中性真路径 C:/akasha/…，守卫判据与盘符无关）。',
  '**留痕**：发布检查单 `CHECKS.md` **R30** 章节（含纪律固化三条：每次同步后必跑清洗+终扫 / 判据收窄必配正反侧自检 / 零真凭据红线、示例须集中可辨识）。**后续**：claude/gpt 复核入口＝仓库 main + CHECKS R30 + `research/read-pollution-2x2-spec-20261014.md`；插件版本号仍锁发布态（属「版本 bump + npm 重发（时机待定）」板条）。',
].join('');
const r = appendRecord('canon', {
  id: 'canon-oss-sync-20261014',
  claim,
  source: { type: '复现', ref: 'dist/akasha-oss @ 8130992（远程对账一致）· CHECKS R30 · tmp/oss-final-scan.mjs 硬命中 0 · OSS 236/236 + check 730/730' },
  event_time: '2026-10-14',
  last_reviewed: '2026-10-14',
  tags: ['OSS', '发布', '隐私', 'R30', '上传'],
});
console.log('已入 canon：' + r.id);
