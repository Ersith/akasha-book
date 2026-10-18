// akasha/tools/harvest-20261010z97-mirror-meta.mjs —— 给 10 条镜像补 era/context/evidence/patterns（幂等）
import { loadStore, currentRecords, revise } from './lib.mjs';

// 逐条判断：evidence＝own-log（我们自己的实战）| story（典故/教材）；era＝事件月份或"典故"；context＝场景类；patterns＝可复用模式
const TABLE = {
  'mirror-langlaile':            { era: '典故', context: '告警与信任', patterns: ['虚构告警耗尽信任', '狼来了', '告警须附证据'] },
  'mirror-guitu':                { era: '典故', context: '竞争与节奏', patterns: ['领先不停顿', '龟兔赛跑', '节奏优于天赋'] },
  'mirror-wangyang':             { era: '典故', context: '事故处置', patterns: ['止损不晚', '先补再论责', '亡羊补牢'] },
  'mirror-saiweng':              { era: '典故', context: '评估与定性', patterns: ['不急于定性', '持续观察', '塞翁失马'] },
  'mirror-enospc':               { era: '2026-10', context: '取证与排障', patterns: ['不吞失败', '观测先行', '跨面排查（自测→磁盘）'] },
  'mirror-batched-restart':      { era: '2026-10', context: '交付与重启纪律', patterns: ['攒单重启', '不假称已生效', '重启后验证清单'] },
  'mirror-silent-deactivate':    { era: '2026-09', context: '插件与宿主', patterns: ['静默失效', '先立观测线', '不盲目重装'] },
  'mirror-creeper-panic':        { era: '典故', context: '记忆治理', patterns: ['教训膨胀', '只增不减坏信噪比', '规则冲突'] },
  'mirror-ghost-citation-r1':    { era: '2026-10', context: '写作与取证', patterns: ['二手当原始', '无据重构现场', '换回原档'] },
  'mirror-thinking-face-20261007': { era: '2026-10', context: '协作与情绪', patterns: ['先问再定性', '好奇≠投诉', '误解澄清'] },
};

const recs = currentRecords(loadStore('mirror').records);
let done = 0, skip = 0, miss = [];
for (const r of recs) {
  const meta = TABLE[r.id];
  if (!meta) { miss.push(r.id); continue; }
  if (r.era !== undefined && r.context !== undefined && r.evidence !== undefined && r.patterns !== undefined) { skip++; continue; }
  const evidence = String(r.story ?? '').length && /^\d{4}-/.test(meta.era) ? 'own-log' : 'story';
  const next = revise('mirror', r.id, {
    era: meta.era,
    context: meta.context,
    evidence,
    patterns: meta.patterns,
    last_reviewed: '2026-10-10',
  });
  done++;
  console.log('  补标 ' + r.id + ' → ' + next.id + '  [evidence=' + evidence + ' era=' + meta.era + ']');
}
console.log('  完成 ' + done + ' 条，跳过 ' + skip + ' 条，未在表内 ' + (miss.length ? miss.join(',') : '无'));
