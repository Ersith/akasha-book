// 测试入口（2026-10-19 P1）：OSS 仓把「中性示例」与「真库脱敏快照」分开了——
//   core/data/ = init-example 的中性示例；core/data-snapshot/ = 测试基线。
// ESM 的静态 import 会在模块体之前求值，故必须在导入 test-core 之前设 AKASHA_ROOT。
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

if (!process.env.AKASHA_ROOT) {
  const snapshot = fileURLToPath(new URL('./data-snapshot', import.meta.url));
  if (existsSync(snapshot)) process.env.AKASHA_ROOT = snapshot;
}
await import('./test-core.mjs');
