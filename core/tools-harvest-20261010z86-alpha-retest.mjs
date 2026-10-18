// akasha/tools/harvest-20261010z86-alpha-retest.mjs
// 2026-10-10：alpha 复测完成（三版矩阵全 compatible）。幂等。
// 注意：本文件正文刻意不使用 ASCII 单引号——见文末踩坑 ③（同类坑当日第四次）。
import { loadStore, currentRecords, revise } from './lib.mjs';

const rec = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-dsh-store-remediation'));
if (!rec) { console.log('未找到条目'); process.exit(0); }
const marker = '**alpha 复测完成（2026-10-10）**';
if (rec.claim.includes(marker)) { console.log('已记录，跳过：' + rec.id); process.exit(0); }
const add = ' ' + marker + '：用户「可以测试下吧」→ 实做。**步骤**：用 npm 把 `@deepseek-ai/dsh@0.2.1-alpha.1` / `@0.2.1-alpha.2` 装到临时目录（各 550+ 包）→ 用 `akasha/tools/store-e3-20261010.mjs --cli <该版 bin.js>` 对五插件重跑 E3。**结果**：两版 × 五插件 **全部通过**（install → 冷启动 HTTP 就绪 → 停 → uninstall → `--dump-config` 逐字回到基线；版本自报 0.2.1-alpha.1 / 0.2.1-alpha.2）⇒ 五份 manifest 的 `dshReleases` 三版窗口 **全部 `compatible`**（`0.2.0-rc.2` / `0.2.1-alpha.1` / `0.2.1-alpha.2`）；OSS `fadbcc8` → `91d97d7`；审计复评仍 **100/100**。' +
  ' **过程踩坑（都已修，值得复用）**：① **PowerShell 参数拼接陷阱**：把包名写成「单引号字符串紧邻变量」的形式会被 PowerShell 拆成**两个参数**（`pkg@` 与版本号），npm 于是装 `latest`（rc.2）并**静默成功**——必须先把 spec 拼成**单个变量**再传。② **Windows 保留端口**会让随机端口 `listen EACCES` → host 启动即退（exit=1；真相只在 `startup-*.log` 里：`Failed plugins: webserver` + `listen EACCES`）；跑器已加「EACCES/EADDRINUSE → 换端口重试（≤3 次）」，**非端口类失败不重试**（保持诚实）。③ **并行编辑漏发**：gate 的 `dsh.compatibility` 块在并行编辑批里漏了，直到打印步骤抛 `Cannot read properties of undefined` 才暴露 ⇒ 教训：**并行编辑后必须逐份复核最终内容**，不能只看批量脚本的「更新 N 份」计数。④ **单引号串内嵌单引号**当日**第四次**复发（本条记录脚本自己崩了一次）——写脚本正文一律改用中文引号或反引号，禁用 ASCII 单引号做示例。' +
  ' **剩余**：只剩「提交 5 条子路径上架申请」——**待用户明确授权**（STORE 同一人全局只联系一次的名额已用掉）。';
const next = revise('canon', rec.id, { claim: rec.claim + add, last_reviewed: '2026-10-10' });
console.log('已记录：' + rec.id + ' → ' + next.id);
