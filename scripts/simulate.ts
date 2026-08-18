/* M2 盒规与赔率模拟：npm run simulate -- --boxes 10000 --seed 20240818 */
import { SERIES_ODDS_MAP, type BoxSlotRule } from '../src/data/odds';
import { SERIES } from '../src/data/series';
import { ripBox } from '../src/engine/rip';
import type { HitType, PulledCard } from '../src/types';

function numberArg(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} 必须是正整数`);
  return value;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function countSlot(cards: PulledCard[], rule: BoxSlotRule): number {
  if (rule.cardKind === 'hit') {
    const kinds = new Set(rule.hitTypes);
    return cards.filter((card) => kinds.has(card.kind as HitType)).length;
  }
  if (rule.cardKind === 'insert') return cards.filter((card) => card.kind === 'insert').length;
  const parallelIds = new Set(rule.parallelIds);
  return cards.filter((card) => card.kind === 'base' && parallelIds.has(card.parallel.id)).length;
}

const boxes = numberArg('--boxes', 10_000);
const seed = numberArg('--seed', 20240818);
let failed = false;

for (const [seriesIndex, series] of SERIES.entries()) {
  const odds = SERIES_ODDS_MAP[series.id];
  const random = seededRandom(seed + seriesIndex);
  const slotTotals = Object.fromEntries(odds.boxSlots.map((rule) => [rule.id, 0]));
  const slotViolations = Object.fromEntries(odds.boxSlots.map((rule) => [rule.id, 0]));
  const oddsTotals = Object.fromEntries(odds.packOdds.map((rule) => [rule.parallelId, 0]));
  let cardViolations = 0;
  let serialViolations = 0;

  for (let boxIndex = 0; boxIndex < boxes; boxIndex += 1) {
    const cards = ripBox(series, { random }).flatMap((pack) => pack.cards);
    if (cards.length !== series.packsPerBox * series.cardsPerPack) cardViolations += 1;
    for (const rule of odds.boxSlots) {
      const actual = countSlot(cards, rule);
      slotTotals[rule.id] += actual;
      if (actual !== rule.count) slotViolations[rule.id] += 1;
    }
    for (const rule of odds.packOdds) {
      oddsTotals[rule.parallelId] += cards.filter((card) => card.parallel.id === rule.parallelId).length;
    }
    for (const card of cards) {
      const maximum = card.parallel.serialTo;
      if (
        (maximum === null && card.serialNumber !== null) ||
        (maximum !== null && (card.serialNumber === null || card.serialNumber < 1 || card.serialNumber > maximum))
      ) serialViolations += 1;
    }
  }

  const totalPacks = boxes * series.packsPerBox;
  console.log(`\n===== ${series.brand} ${series.name} · ${odds.productFormat}（${boxes} 盒） =====`);
  console.log(`卡数违规: ${cardViolations}；编号违规: ${serialViolations}`);
  for (const rule of odds.boxSlots) {
    const average = slotTotals[rule.id] / boxes;
    console.log(
      `槽位 ${rule.id.padEnd(22)} 目标 ${rule.count}/盒，实际 ${average.toFixed(3)}/盒，违规盒 ${slotViolations[rule.id]}，${rule.confidence}`,
    );
    if (slotViolations[rule.id] > 0) failed = true;
  }
  for (const rule of odds.packOdds) {
    const count = oddsTotals[rule.parallelId];
    const actual = count === 0 ? Infinity : totalPacks / count;
    const relativeError = Math.abs(actual - rule.oneInPacks) / rule.oneInPacks;
    const expectedHits = totalPacks / rule.oneInPacks;
    // 期望命中约 1,600 次时，二项分布 95% 相对误差才稳定落在约 5% 内。
    const enoughSamples = expectedHits >= 1_600;
    console.log(
      `赔率 ${rule.parallelId.padEnd(22)} 理论 1:${rule.oneInPacks} 包，实际 1:${Number.isFinite(actual) ? actual.toFixed(2) : '∞'}，误差 ${(relativeError * 100).toFixed(2)}%${enoughSamples ? '' : '（样本不足，不作 5% 门禁）'}，${rule.confidence}`,
    );
    if (rule.confidence === 'official' && enoughSamples && relativeError > 0.05) failed = true;
  }
  if (cardViolations > 0 || serialViolations > 0) failed = true;
}

console.log(`\n模拟完成（每系列 ${boxes} 盒，seed=${seed}）`);
if (failed) {
  console.error('M2 概率/盒规门禁未通过');
  process.exitCode = 1;
}
