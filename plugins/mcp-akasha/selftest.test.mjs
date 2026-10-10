// @akasha-book/mcp 自测：Bundle Patch 契约（STORE 硬门）+ MCP 服务端对 malformed 输入的容错。
// 运行：node selftest.test.mjs（退出码 0 = 全过）；不碰真实 profile、不读任何密钥、不写真实库。
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PATCH = join(HERE, 'cordis.patch.yml');
const patch = readFileSync(PATCH, 'utf8');

// —— ① Bundle Patch 契约（STORE 硬门：入口 ID 自有、不 disable/replace/遮蔽官方组件）——
assert.ok(/id:\s*mcp-akasha/.test(patch), '入口 id 为插件自有 ID：mcp-akasha');
assert.ok(!/^\s*(remove|disable|patch):/m.test(patch), 'Bundle Patch 只使用 insert；不得出现 remove/disable/patch 行');
assert.ok(!/(remove|disable)[\s\S]{0,160}@deepseek-ai\//i.test(patch), '不得禁用或替换任何 @deepseek-ai/* 官方组件');

// —— ② 命令以数组给出，不做 shell 字符串拼接（fail closed：避免注入面）——
assert.ok(/args:\s*\[/.test(patch), 'args 必须为数组（不拼接 shell 字符串）');
assert.ok(!/command:\s*['"][^'"]*[;&|]/.test(patch), 'command 不得含 shell 元字符（; & |）');

// —— ③ MCP 服务端：malformed JSON-RPC 不得导致非零退出（fail closed 语义；core 缺失则跳过）——
const CORE_MCP = join(HERE, '..', '..', 'core', 'mcp.mjs');
if (existsSync(CORE_MCP)) {
  const result = await new Promise((resolve) => {
    const child = spawn(process.execPath, [CORE_MCP], { stdio: ['pipe', 'pipe', 'pipe'] });
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; try { child.kill(); } catch { /* 已退出 */ } resolve(v); } };
    const timer = setTimeout(() => done({ code: null, killed: true }), 12000);
    child.on('error', () => { clearTimeout(timer); done({ code: 'spawn-error' }); });
    child.on('exit', (code, signal) => { clearTimeout(timer); done({ code, signal }); });
    const send = (s) => { try { child.stdin.write(s); } catch { /* stdin 关闭 */ } };
    send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2026-06-18', capabilities: {}, clientInfo: { name: 'akasha-selftest', version: '0.0.0' } } }) + '\n');
    send('{ this is not json }\n'); // malformed：必须被容错，而不是整进程崩掉
    send(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'no/such-method', params: {} }) + '\n');
    setTimeout(() => send(JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/list' }) + '\n'), 600);
  });
  assert.ok(result.code === null || result.code === 0, `malformed JSON-RPC 不得导致非零退出（实际 exit=${result.code} signal=${result.signal ?? '无'}）`);
  console.log('mcp 服务端：malformed JSON-RPC 与未知方法均未导致异常退出 ✓');
} else {
  console.log('SKIP mcp 服务端用例：未找到 core/mcp.mjs（仓库布局变化？）');
}

console.log('selftest: all assertions passed');
