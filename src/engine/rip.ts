import { PLAYERS } from '../data/players';
import type {
  HitType,
  PackData,
  Parallel,
  Player,
  PulledCard,
  SeriesConfig,
} from '../types';

function weightedPick<T extends { weight: number }>(pool: T[]): T {
  const total = pool.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const item of pool) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return pool[pool.length - 1];
}

function playersForSeries(series: SeriesConfig): Player[] {
  if (series.leagues === 'all') return PLAYERS;
  return PLAYERS.filter((p) => (series.leagues as string[]).includes(p.league));
}

/** 命中卡（签名/物料）中大牌更难抽到，模拟真实签名卡的短印 */
const HIT_TIER_WEIGHT: Record<Player['tier'], number> = {
  1: 1,
  2: 2.2,
  3: 3.5,
  4: 4.5,
};

function pickPlayer(pool: Player[], forHit: boolean): Player {
  if (!forHit) return pool[Math.floor(Math.random() * pool.length)];
  return weightedPick(
    pool.map((p) => ({ p, weight: HIT_TIER_WEIGHT[p.tier] })),
  ).p;
}

function rollSerial(parallel: Parallel): number | null {
  if (parallel.serialTo === null) return null;
  return 1 + Math.floor(Math.random() * parallel.serialTo);
}

let uidCounter = 0;
function nextUid(): string {
  uidCounter += 1;
  return `${Date.now().toString(36)}-${uidCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeCard(
  series: SeriesConfig,
  kind: 'base' | HitType,
  pool: Player[],
): PulledCard {
  const player = pickPlayer(pool, kind !== 'base');
  const parallelPool =
    kind === 'auto'
      ? series.autoParallels
      : kind === 'relic'
        ? series.relicParallels
        : series.parallels;
  const parallel = weightedPick(parallelPool);
  const card: PulledCard = {
    uid: nextUid(),
    playerId: player.id,
    seriesId: series.id,
    kind,
    parallel,
    serialNumber: rollSerial(parallel),
    rookie: !!player.rookie,
    pulledAt: Date.now(),
  };
  if (kind === 'relic') {
    card.relicKind = parallel.id.includes('patch') || parallel.id.includes('logo')
      ? 'patch'
      : 'jersey';
  }
  return card;
}

/** 生成一整盒卡：先铺满普通卡位，再把保底命中随机塞进不同的包 */
export function ripBox(series: SeriesConfig): PackData[] {
  const pool = playersForSeries(series);

  const packs: PackData[] = Array.from({ length: series.packsPerBox }, (_, i) => ({
    index: i,
    cards: Array.from({ length: series.cardsPerPack }, () =>
      makeCard(series, 'base', pool),
    ),
  }));

  const hits: PulledCard[] = [];
  for (const spec of series.hitsPerBox) {
    for (let i = 0; i < spec.count; i++) {
      hits.push(makeCard(series, spec.type, pool));
    }
  }
  // 小概率额外命中，模拟"爆盒"惊喜
  if (Math.random() < 0.12) {
    const spec = series.hitsPerBox[Math.floor(Math.random() * series.hitsPerBox.length)];
    hits.push(makeCard(series, spec.type, pool));
  }

  // 把命中分配到随机的包，替换该包末尾的普通卡位
  const packOrder = packs
    .map((p) => p.index)
    .sort(() => Math.random() - 0.5);
  const replacedCount: Record<number, number> = {};
  hits.forEach((hit, i) => {
    const packIdx = packOrder[i % packOrder.length];
    const pack = packs[packIdx];
    const used = replacedCount[packIdx] ?? 0;
    const slot = pack.cards.length - 1 - used;
    if (slot >= 0) {
      pack.cards[slot] = hit;
      replacedCount[packIdx] = used + 1;
    } else {
      pack.cards.push(hit);
    }
  });

  // 包内排序：命中永远压轴，编号平行卡尽量靠后，制造翻卡节奏
  for (const pack of packs) {
    pack.cards.sort((a, b) => rarityRank(a) - rarityRank(b));
  }
  return packs;
}

export function rarityRank(card: PulledCard): number {
  const kindBoost = card.kind === 'base' ? 0 : 10;
  const order: Record<string, number> = {
    base: 0,
    shine: 1,
    numbered: 2,
    'low-numbered': 3,
    super: 4,
    'one-of-one': 6,
  };
  return kindBoost + (order[card.parallel.rarity] ?? 0);
}

/** 0-4 的特效等级 */
export function effectLevel(card: PulledCard): number {
  if (card.parallel.rarity === 'one-of-one') return 4;
  if (card.kind !== 'base' || card.parallel.rarity === 'super') return 3;
  if (card.parallel.rarity === 'low-numbered') return 2;
  if (card.parallel.rarity === 'numbered') return 2;
  if (card.parallel.rarity === 'shine') return 1;
  return 0;
}
