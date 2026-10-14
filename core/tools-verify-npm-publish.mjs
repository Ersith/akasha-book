// verify-npm-publish.mjs —— 直读 registry 公开接口核验发布结果（不依赖 npm CLI 的本地缓存）。
// 口径（来自 canon-npm-publish-20261010-r1 的教训）：只看两处 —— versions 数组里有没有该版本 + dist-tags.latest 指向。
// 用法：node tools/verify-npm-publish.mjs
const EXPECT = {
  '@akasha-book/gate': '1.3.0',
  '@akasha-book/hooks': '1.2.4',
  '@akasha-book/session': '0.3.2',
  '@akasha-book/sleep': '1.6.5',
  '@akasha-book/mcp': '1.1.2',
};
const PROXY = process.env.HTTPS_PROXY || 'http://127.0.0.1:<PORT>';

async function getJSON(url) {
  try {
    const r = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch (e) {
    // 直连失败 → 走本机代理（Node 用 undici ProxyAgent 才能吃到环境变量以外的代理）
    const { ProxyAgent } = await import('undici');
    const r = await fetch(url, { headers: { accept: 'application/json' }, dispatcher: new ProxyAgent(PROXY), signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  }
}

let ok = 0, bad = 0;
for (const [name, want] of Object.entries(EXPECT)) {
  const url = 'https://registry.npmjs.org/' + name.replace('/', '%2F');
  try {
    const data = await getJSON(url);
    const inVersions = Object.keys(data.versions || {}).includes(want);
    const latest = (data['dist-tags'] || {}).latest;
    const latestOk = latest === want;
    const modified = data.time && data.time[want] ? String(data.time[want]).slice(0, 19) : '(无)';
    const verdict = inVersions && latestOk ? '✅' : (inVersions ? '⚠ latest 未指向' : '❌ 版本不在册');
    console.log('  ' + verdict + ' ' + name.padEnd(24) + ' 期望 ' + want.padEnd(8) + ' 在册=' + inVersions + '  latest=' + String(latest).padEnd(8) + '  发布时间 ' + modified);
    if (inVersions && latestOk) ok++; else bad++;
  } catch (e) {
    console.log('  ✗ ' + name.padEnd(24) + ' 读取失败：' + e.message);
    bad++;
  }
}
console.log('  ────────');
console.log('  通过 ' + ok + ' / 待查 ' + bad + '（registry 直读，无本地缓存干扰）');
