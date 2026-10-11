// akasha/tools/harvest-20261010z93-installability.mjs —— 对外可安装性（用户问：别的用户会不会踩同样的坑）
import { loadStore, currentRecords, appendRecord, revise } from '../lib.mjs';

const canon = currentRecords(loadStore('canon').records);
if (!canon.some((r) => r.id.startsWith('canon-installability-20261010'))) {
  const r = appendRecord('canon', {
    id: 'canon-installability-20261010',
    claim:
      '**对外可安装性复盘（2026-10-10，用户裁定「想想刚刚那些问题，其它用户安装阿卡夏之书会不会遇到」）**。' +
      '**本机当天真实事故**：重装插件（gate 1.2.3 / hooks 1.2.2）后，门控的 `akashaDir` 丢失 → 退回 `homedir()` 默认 `C:\\Users\\…\\.akasha` → ' +
      '`usageSource/selfSource` 双双从 `library` 变 `fallback`（**用法条与自我层静默降级为内置兜底文本**，不报错）；' +
      '根因＝**机器配置只写在"已装包的 patch"里**（就地改 node_modules 的实践），任何重装都会覆盖它。' +
      '**同族排查（对其它用户的影响）**：① 发布版 `sleep`/`session` 默认值本是可移植的 `join(homedir(), ".akasha")` ✓（硬编码 H: 只存在于我的活树副本）；' +
      '② 但用户**只能逐项配 patch**（log/dataDir/stateFile/inboxFile/reportDir…），**漏一项就静默换库**——这就是本机踩的那条路。' +
      '**已落地的三件产品化修复**：❶ **一处配置贯通**：五插件统一按 `config.akashaDir → 环境变量 AKASHA_DIR → ~/.akasha` 解析库根，其余路径随之推导；' +
      '❷ mcp 桥**自愈**：`command: "node"` 在用户机器上不可用（ENOENT）时自动回退到**宿主自带 node**（`process.execPath`）并留日志——用户机器未必有 node 在 PATH；' +
      '❸ 新增 `docs/INSTALL.md`（三分钟安装、一处配置、各插件所需项、**安装后验收四条**：`akasha check` / `mcp__akasha__akasha_check` / 观测线 kind / **`usageSource` 必须为 `library` 而不是 fallback**、六条常见坑）。' +
      '**另一条踩过的坑**：同名同版本、内容不同的 tgz 安装会被拒（`ambiguous-install`，安全设计，不破坏现场）⇒ **改内容必须升版本号**（本机改用 `-h1` 后缀区分"带本机路径配置"的活树包）。' +
      '**验证**：五插件自测全绿（含新增的 node 回退用例、gate 的写盘工具覆盖清单）；发布版 OSS `3cef72d`；本机五包已重装为 `1.2.4-h1/1.2.3-h1/1.5.3-h1/0.3.1-h1/1.1.1-h1`（重启后生效，届时 `usageSource` 应恢复 `library`）。' +
      '**结论**：其它用户**不会**再踩"配置被升级吞掉"这条主坑（走 AKASHA_DIR 或 profile 覆盖即免疫）；仍需注意的六条（restart-required、ambiguous-install、`~` 不展开、data/ 门控拒绝是设计、WSL `/mnt` 形态拦不住、node 不在 PATH）全部写进了 INSTALL.md。',
    source: { type: '复现', ref: '本机 2026-10-10（gate-armed usageSource 从 library→fallback 的日志对照；OSS 3cef72d）' },
    event_time: '2026-10-10',
    last_reviewed: '2026-10-10',
    tags: ['安装', '产品化', '配置', '对外', '教训'],
  });
  console.log('已入 canon：' + r.id);
} else console.log('= 已存在');
