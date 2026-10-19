// 测试入口（2026-10-19 P1）：OSS 仓把「中性示例」与「真库脱敏快照」分开了——
//   core/data/ = init-example 的中性示例；core/data-snapshot/ = 测试基线。
// ESM 的静态 import 会在模块体之前求值，故必须在导入 test-core 之前设 AKASHA_ROOT。
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const snapshot = fileURLToPath(new URL('./data-snapshot', import.meta.url));
// 2026-10-19 人工复检：有脱敏快照时强制用它，避免外部 AKASHA_ROOT 指活库；
// 只有显式 AKASHA_ALLOW_LIVE_TESTS=1 才允许跑外部库（例如活树自己的全量测试）。
if (existsSync(snapshot) && process.env.AKASHA_ALLOW_LIVE_TESTS !== '1') process.env.AKASHA_ROOT = snapshot;
if (process.env.AKASHA_TEST_ECHO === '1') console.log('AKASHA_ROOT=' + process.env.AKASHA_ROOT);
await import('./test-core.mjs');
