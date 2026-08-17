import { PLAYERS } from '../data/players';
import { PRIZM_EPL_AUTO_PLAYERS, PRIZM_EPL_BASE_PLAYERS } from '../data/checklists';
import type {
  HitType,
  PackData,
  Parallel,
  Player,
  PulledCard,
  SeriesConfig,
} from '../types';

export type RandomSource = () => number;

export interface RipOptions {
  /** 测试与模拟可注入带种子的随机源；生产环境默认使用 Math.random。 */
  random?: RandomSource;
  /** 测试可固定时间，避免生成结果随系统时钟变化。 */
  now?: () => number;
}

function weightedPick<T extends { weight: number }>(
  pool: T[],
  random: RandomSource,
): T {
  const total = pool.reduce((s, x) => s + x.weight, 0);
  let r = random() * total;
  for (const item of pool) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return pool[pool.length - 1];
}

function playersForSeries(series: SeriesConfig, forHit = false): Player[] {
  if (series.id === 'prizm-epl') {
    return forHit ? PRIZM_EPL_AUTO_PLAYERS : PRIZM_EPL_BASE_PLAYERS;
  }
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

function pickPlayer(
  pool: Player[],
  forHit: boolean,
  random: RandomSource,
): Player {
  if (!forHit) return pool[Math.floor(random() * pool.length)];
  return weightedPick(
    pool.map((p) => ({ p, weight: HIT_TIER_WEIGHT[p.tier] })),
    random,
  ).p;
}

function rollSerial(parallel: Parallel, random: RandomSource): number | null {
  if (parallel.serialTo === null) return null;
  return 1 + Math.floor(random() * parallel.serialTo);
}

let uidCounter = 0;
function nextUid(random: RandomSource, now: () => number): string {
  uidCounter += 1;
  return `${now().toString(36)}-${uidCounter}-${random().toString(36).slice(2, 8)}`;
}

function makeCard(
  series: SeriesConfig,
  kind: 'base' | HitType,
  pool: Player[],
  random: RandomSource,
  now: () => number,
): PulledCard {
  const player = pickPlayer(pool, kind !== 'base', random);
  const parallelPool =
    kind === 'auto' || kind === 'auto-relic'
      ? series.autoParallels
      : kind === 'relic'
        ? series.relicParallels
        : series.parallels;
  const parallel = weightedPick(parallelPool, random);
  const card: PulledCard = {
    uid: nextUid(random, now),
    playerId: player.id,
    seriesId: series.id,
    kind,
    parallel,
    serialNumber: rollSerial(parallel, random),
    rookie: !!player.rookie,
    pulledAt: now(),
  };
  if (kind === 'relic' || kind === 'auto-relic') {
    card.relicKind = parallel.id.includes('patch') || parallel.id.includes('logo')
      ? 'patch'
      : 'jersey';
  }
  return card;
}

function shuffle<T>(items: T[], random: RandomSource): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 生成一整盒卡：先铺满普通卡位，再把保底命中随机塞进不同的包 */
export function ripBox(series: SeriesConfig, options: RipOptions = {}): PackData[] {
  const random = options.random ?? Math.random;
  const now = options.now ?? Date.now;
  const basePool = playersForSeries(series);
  const hitPool = playersForSeries(series, true);

  const packs: PackData[] = Array.from({ length: series.packsPerBox }, (_, i) => ({
    index: i,
    cards: Array.from({ length: series.cardsPerPack }, () =>
      makeCard(series, 'base', basePool, random, now),
    ),
  }));

  const hits: PulledCard[] = [];
  for (const spec of series.hitsPerBox) {
    for (let i = 0; i < spec.count; i++) {
      hits.push(makeCard(series, spec.type, hitPool, random, now));
    }
  }
  // 小概率额外命中，模拟"爆盒"惊喜
  if (random() < 0.12) {
    const spec = series.hitsPerBox[Math.floor(random() * series.hitsPerBox.length)];
    hits.push(makeCard(series, spec.type, hitPool, random, now));
  }

  // 把命中分配到随机的包，替换该包末尾的普通卡位
  const packOrder = shuffle(
    packs.map((p) => p.index),
    random,
  );
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
