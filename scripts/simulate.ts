/* 批量模拟拆盒，验证保底命中与爆率分布：npx tsx scripts/simulate.ts */
import { ripBox } from '../src/engine/rip';
import { SERIES } from '../src/data/series';

const BOXES = 2000;

for (const series of SERIES) {
  const guaranteed = series.hitsPerBox.reduce((s, h) => s + h.count, 0);
  let minHits = Infinity;
  let totalCards = 0;
  const parallelCount: Record<string, number> = {};
  const kindCount: Record<string, number> = {};
  let serialOk = true;

  for (let i = 0; i < BOXES; i++) {
    const packs = ripBox(series);
    const cards = packs.flatMap((p) => p.cards);
    totalCards += cards.length;
    const hits = cards.filter((c) => c.kind !== 'base');
    minHits = Math.min(minHits, hits.length);
    for (const c of cards) {
      kindCount[c.kind] = (kindCount[c.kind] ?? 0) + 1;
      if (c.kind === 'base') {
        parallelCount[c.parallel.name] = (parallelCount[c.parallel.name] ?? 0) + 1;
      }
      const st = c.parallel.serialTo;
      if (st !== null && (c.serialNumber === null || c.serialNumber < 1 || c.serialNumber > st)) {
        serialOk = false;
      }
      if (st === null && c.serialNumber !== null) serialOk = false;
    }
    const expectCards = series.packsPerBox * series.cardsPerPack;
    if (cards.length !== expectCards) {
      throw new Error(`${series.id}: 卡数 ${cards.length} != ${expectCards}`);
    }
  }

  console.log(`\n===== ${series.brand} ${series.name}（${BOXES} 盒） =====`);
  console.log(`保底命中 ${guaranteed}，实际最少 ${minHits} ${minHits >= guaranteed ? 'OK' : '!!! 违反保底'}`);
  console.log(`编号合法性: ${serialOk ? 'OK' : '!!! 有非法编号'}`);
  console.log(`命中分布:`, kindCount);
  const sorted = Object.entries(parallelCount).sort((a, b) => b[1] - a[1]);
  for (const [name, n] of sorted) {
    console.log(`  ${name.padEnd(24)} ${n}（1 张/${(totalCards / n).toFixed(0)} 卡）`);
  }
}
console.log('\n模拟完成');
