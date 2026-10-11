// akasha/tools/harvest-20261010z95-npm-correction.mjs —— 更正：session 0.3.1 其实已 LIVE（此前误判"待 2FA"）
import { loadStore, currentRecords, revise } from '../lib.mjs';

const rec = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-npm-publish-20261010'));
if (!rec) { console.log('未找到条目'); process.exit(0); }
const marker = '**更正（同日，终核后）**';
if (rec.claim.includes(marker)) { console.log('= 已更正'); process.exit(0); }
const add = ' ' + marker + '：**五包全部 LIVE，无需任何 OTP** —— 终核（全部 `--prefer-online`）：' +
  '`@akasha-book/gate@1.2.4` ✓ / `hooks@1.2.3` ✓ / `sleep@1.5.3` ✓ / `session@0.3.1` ✓ / `mcp@1.1.1` ✓，且五个 `dist-tag latest` 均已指向新版。' +
  '**此前"session 0.3.1 待 2FA 确认"是我的误判**，两处原因：① **npm 本地 packument 缓存滞后**——同一会话内先读到 `latest: 0.3.0`，稍后（`--prefer-online` + `versions` 数组）才看到 0.3.1 已在列表里；② **重发已发布版本得到的 `E409` 措辞含糊**（"Cannot publish over previously staged version"），被我读成"已暂存待批"——而事实是**该版本早已发布**（npm 网页 Staged Packages 队列当时就是空的，与之一致）。' +
  '**教训（补进核验纪律）**：判断 npm 发布是否成功，只看**两处**——`npm view <pkg> versions --json`（版本是否在数组里）+ `npm dist-tag ls <pkg>`（latest 指向），**两处都必须 `--prefer-online`**；`E409` 不等于"待审批"，也别把第一次 `npm view` 的读数当结论。' +
  '**顺带**：npm 登录 token 是能直接发布的（四包未要求 OTP 即上线），页头提示的"绕过 2FA 的 token 将被限制（直接发布 Jan 2027 起受限）"——该侧调整（改用 trusted publishing / 轮换 token）仍在用户侧待办。';
const next = revise('canon', rec.id, { claim: rec.claim + add, last_reviewed: '2026-10-10' });
console.log('已更正：' + rec.id + ' → ' + next.id);
