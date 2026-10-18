// akasha/tools/harvest-20261010z89-sleep-parity.mjs
// 2026-10-10：sleep「删动态加载是否降能力」的判定 + 契约测试 + 复检。幂等。
import { loadStore, currentRecords, revise } from './lib.mjs';

const rec = currentRecords(loadStore('canon').records).find((r) => r.id.startsWith('canon-dsh-store-remediation'));
if (!rec) { console.log('未找到条目'); process.exit(0); }
const marker = '**sleep 去动态加载＝能力不降（2026-10-10 用户追问「删掉动态加载不会让 sleep 能力下降？」）**';
if (rec.claim.includes(marker)) { console.log('已记录，跳过：' + rec.id); process.exit(0); }
const add = ' ' + marker + '：**结论：不降，逐字等价**，依据全部来自宿主源码（非推断）——' +
  '① 那段动态加载**只取一个函数**（`createUserMessage`），sleep 其余能力（调度/蒸馏/条子/库脉搏/回查）一行未动；' +
  '② `createUserMessage(input)` ＝ `createMessage({...input, role:"user"})`，`createMessage(input)` ＝ `deepFreeze(structuredClone({...input, id: brandString(randomUUID())}))`；' +
  '③ **`brandString(value) { return value; }`**——`@deepseek-ai/dsh-brand` 文档原话「Apply a compile-time string brand **without changing the value**」「keeps no runtime identity or mutable state」⇒ 纯编译期标记、运行时恒等。' +
  '⇒ 本地实现（`structuredClone` + 递归深冻结 + 新 uuid + `role:"user"`）与宿主**逐字等价**。**唯一真实代价**：失去「自动跟随宿主未来实现」——上游若改 `createMessage` 形状我们不会自动跟上。' +
  ' **对策（已落地）**：把这条耦合**移进测试**——`selftest.test.mjs` 新增**契约测试**：若本机有宿主包（`AKASHA_DSH_MODULES` 可指定，默认 `<DSH_INSTALL>`），就用 `createUserMessage` 造一份消息与我们的逐字段比对（键集合 / role / id 类型 / content / source / 冻结语义）。**测试文件不在商城扫描面内**（`files` 白名单只有 lib/index.js、cordis.patch.yml、README.md、package.json），因此"让测试去碰宿主、让运行时代码保持静态"是两全做法。**实跑：无 SKIP ⇒ 比对真的执行并通过**。' +
  ' **同步与复检**：仓 + **活树**双侧同步；版本 1.5.2；OSS `e6bf1c9`；再次刷新 #1367 预检 ⇒ **passed**（`verdict=pass`、`complete=true`、固定源 `e6bf1c94e914`）。';
const next = revise('canon', rec.id, { claim: rec.claim + add, last_reviewed: '2026-10-10' });
console.log('已记录：' + rec.id + ' → ' + next.id);
