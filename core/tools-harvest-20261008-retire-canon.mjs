// 2026-10-08：把「退役/删除原语」本身记进 canon（自家能力不入库 → 下一个会话就检索不到）。
import { appendRecord, loadStore, currentRecords, allIds } from '../lib.mjs';

const REC = {
  id: 'canon-akasha-retire-primitive-20261008',
  claim: '阿卡夏 v0 新增「退役 / 删除」原语（2026-10-08 用户裁定落地；动机＝基石分层要求把工具/教程类资料移出 frontier，而 append-only 无移出语义）：① 软退役（默认）——追加墓碑记录（`retires` 指针 + `retired_at` + `retired_reason`，其余字段克隆链尾以通过校验），被退役者连同其修订链与墓碑一起退出 `currentRecords` ⇒ `lookup` / `brief` / `cross` / `summary` / `audit` / `stats` 与 `frontier list` / `orphan list` 全部不再可见（历史仍留档可追溯）；② 硬删 `--hard`——把整条链与墓碑行移出存储文件，移前备份到 `data/_trash/<日期>-<store>.jsonl`。命令：`node akasha.mjs retire <store> <id> [--reason \'...\'] [--hard]`（脚本：`lib.retireRecord`）；幂等（已退役返回 `already`）；`check` 校验 `retires` 悬空指针并新增每库 `retired` 计数。验证：`test.mjs` **85/85**（含 3 条新用例——软退役/墓碑不入当前集、硬删+备份、悬空指针报错）；实作退役 4 条非学术 frontier 条目后，`frontier list` 由 148 → **123 行**、`lookup joycaption` 只命中 canon 条目。',
  source: { type: '复现', ref: 'akasha/lib.mjs（currentRecords / retiredIds / checkRetires / retireRecord）+ akasha.mjs（retire 命令）+ test.mjs 退役三例 + tools/retire-20261008-non-academic-frontier.mjs' },
  last_reviewed: '2026-10-08',
  event_time: '2026-10-08',
  tags: ['akasha', '退役', '原语', '基石分层', 'append-only'],
};

const existing = new Set(allIds(loadStore('canon').records));
if (existing.has(REC.id)) console.log('跳过（已存在） ' + REC.id);
else { appendRecord('canon', REC); console.log('已追加 [canon] ' + REC.id); }
