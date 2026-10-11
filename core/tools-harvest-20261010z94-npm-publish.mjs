// akasha/tools/harvest-20261010z94-npm-publish.mjs —— npm 重发（4 成 1 待 2FA）
import { loadStore, currentRecords, appendRecord } from '../lib.mjs';

const canon = currentRecords(loadStore('canon').records);
if (canon.some((r) => r.id.startsWith('canon-npm-publish-20261010'))) { console.log('= 已记录'); process.exit(0); }
const r = appendRecord('canon', {
  id: 'canon-npm-publish-20261010',
  claim:
    '**npm 重发（2026-10-10，用户裁定「没问题的话，npm 就发」）**：五包逐一 `npm publish --access public`（走本地代理 `http://127.0.0.1:7897`）。' +
    '**结果：4 成 1 待**——`@akasha-book/gate@1.2.4` ✓、`@akasha-book/hooks@1.2.3` ✓、`@akasha-book/sleep@1.5.3` ✓、`@akasha-book/mcp@1.1.1` ✓（`dist-tag latest` 均已指向新版）；' +
    '`@akasha-book/session@0.3.1` **被 npm 暂存（staged）待 2FA 确认**：重发报 `E409 Cannot publish over previously staged version "0.3.1"`，而 `npm stage list` 在本机 CLI 侧看不到该暂存件（需 2FA 新鲜授权或走网页确认）。' +
    '**两条踩坑（都已成经验）**：① **`npm view` 会骗人**：本地 packument 缓存让刚发布的版本仍读成旧版（`latest` 显示 1.2.1、`time.modified` 停在 10-08）——' +
    '核验必须 `--prefer-online`，或直接问**具体版本**（`npm view <pkg>@<ver> version`）；本次一度因此误判"发布失败"。' +
    '② **npm 11 的"分阶段发布 + 2FA"**：带写权限的 2FA 账号在非交互环境发布时，npm 可能把 tarball **暂存**在服务端、待 OTP 确认（首次调用甚至返回成功/退出码 0，实际只是"已暂存"）；' +
    '同版本重发则得 `E409`。确认路径：`npm stage approve <stage-id> --otp=<code>`（需先能列出 stage）或网页端 2FA 确认。' +
    '**关联**：OIDC/2FA 与密钥轮换仍是用户侧事项（板子 `5a155dca`）。',
  source: { type: '复现', ref: '本机 2026-10-10（npm dist-tag ls / npm publish 输出；registry 回读）' },
  event_time: '2026-10-10',
  last_reviewed: '2026-10-10',
  tags: ['npm', '发布', '2FA', '缓存', '教训'],
});
console.log('已入 canon：' + r.id);
