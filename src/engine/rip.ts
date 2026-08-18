import { PLAYERS } from '../data/players';
import {
  SERIES_PLAYER_POOLS,
  checklistEntriesFor,
} from '../data/checklists';
import type { ChecklistCategory } from '../data/checklists/types';
import { SERIES_ODDS_MAP, type BoxSlotRule } from '../data/odds';
import type {
  CardKind,
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

function playersForSeries(series: SeriesConfig, kind: CardKind): Player[] {
  const pools = SERIES_PLAYER_POOLS[series.id];
  if (pools) {
    if (kind === 'insert') return pools.insert;
    if (kind === 'auto') return pools.auto;
    if (kind === 'relic') return pools.relic;
    if (kind === 'auto-relic') return pools.autoRelic;
    return pools.base;
  }
  if (series.leagues === 'all') return PLAYERS;
  return PLAYERS.filter((p) => (series.leagues as string[]).includes(p.league));
}

function pickPlayer(pool: Player[], random: RandomSource): Player {
  return pool[Math.floor(random() * pool.length)];
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
  kind: CardKind,
  random: RandomSource,
  now: () => number,
  forcedParallel?: Parallel,
): PulledCard {
  const pool = playersForSeries(series, kind);
  const player = pickPlayer(pool, random);
  const checklistCategory: ChecklistCategory = kind;
  let checklistEntries = checklistEntriesFor(series.id, player.id, checklistCategory);
  if (kind === 'auto-relic' && checklistEntries.length === 0) {
    checklistEntries = checklistEntriesFor(series.id, player.id, 'auto');
  }
  const checklistEntry = checklistEntries.length > 0
    ? checklistEntries[Math.floor(random() * checklistEntries.length)]
    : undefined;
  const parallelPool =
    kind === 'auto' || kind === 'auto-relic'
      ? series.autoParallels
      : kind === 'relic'
        ? series.relicParallels
        : kind === 'insert'
          ? series.insertParallels
          : series.parallels;
  const parallel = forcedParallel ?? weightedPick(parallelPool, random);
  const card: PulledCard = {
    uid: nextUid(random, now),
    playerId: player.id,
    seriesId: series.id,
    ...(checklistEntry ? { cardId: checklistEntry.id } : {}),
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

export function derivedPrintRunWeight(parallel: Parallel, checklistSize: number): number {
  if (parallel.serialTo === null) {
    throw new Error(`${parallel.id} 没有公开印量，不能作为 print-run 槽位候选`);
  }
  return parallel.serialTo * checklistSize;
}

function pickParallelForSlot(
  series: SeriesConfig,
  rule: BoxSlotRule,
  random: RandomSource,
): Parallel {
  const sourcePool = rule.cardKind === 'insert'
    ? series.insertParallels
    : series.parallels;
  const allowed = new Set(rule.parallelIds ?? []);
  const pool = sourcePool.filter((parallel) => allowed.has(parallel.id));
  if (pool.length === 0) throw new Error(`${series.id}/${rule.id}: 平行池为空`);
  if (rule.selection === 'fixed' && pool.length === 1) return pool[0];
  if (rule.selection === 'print-run') {
    const checklistSize = SERIES_ODDS_MAP[series.id].baseChecklistSize;
    return weightedPick(
      pool.map((parallel) => ({
        parallel,
        weight: derivedPrintRunWeight(parallel, checklistSize),
      })),
      random,
    ).parallel;
  }
  return weightedPick(pool, random);
}

function pickHitType(rule: BoxSlotRule, random: RandomSource): HitType {
  const types = rule.hitTypes ?? [];
  if (types.length === 0) throw new Error(`${rule.id}: 命中槽位未配置类型`);
  return types[Math.floor(random() * types.length)];
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
  const odds = SERIES_ODDS_MAP[series.id];
  if (!odds) throw new Error(`${series.id}: 缺少 M2 赔率配置`);
  const baseParallelPool = series.parallels.filter((parallel) =>
    odds.baseParallelIds.includes(parallel.id),
  );
  if (baseParallelPool.length === 0) throw new Error(`${series.id}: 基础卡槽位为空`);

  const packs: PackData[] = Array.from({ length: series.packsPerBox }, (_, i) => ({
    index: i,
    cards: Array.from({ length: series.cardsPerPack }, () =>
      makeCard(series, 'base', random, now, weightedPick(baseParallelPool, random)),
    ),
  }));

  const availableSlots = shuffle(
    packs.flatMap((pack) => pack.cards.map((_, cardIndex) => ({ packIndex: pack.index, cardIndex }))),
    random,
  );

  for (const rule of odds.boxSlots) {
    for (let index = 0; index < rule.count; index += 1) {
      const slot = availableSlots.pop();
      if (!slot) throw new Error(`${series.id}: 盒槽位超过卡片总数`);
      const kind = rule.cardKind === 'hit'
        ? pickHitType(rule, random)
        : rule.cardKind === 'insert'
          ? 'insert'
          : 'base';
      const parallel = rule.cardKind === 'hit'
        ? undefined
        : pickParallelForSlot(series, rule, random);
      packs[slot.packIndex].cards[slot.cardIndex] = makeCard(series, kind, random, now, parallel);
    }
  }

  for (const rule of odds.packOdds) {
    const sourcePool = rule.cardKind === 'insert'
      ? series.insertParallels
      : series.parallels;
    const parallel = sourcePool.find((candidate) => candidate.id === rule.parallelId);
    if (!parallel) throw new Error(`${series.id}: 找不到赔率平行 ${rule.parallelId}`);
    for (const pack of packs) {
      if (random() >= 1 / rule.oneInPacks) continue;
      const candidates = packs.flatMap((candidatePack) =>
        candidatePack.cards.flatMap((card, cardIndex) => {
          const matchesReplacement = rule.replaceKind
            ? card.kind === rule.replaceKind
            : card.kind === 'base' && odds.baseParallelIds.includes(card.parallel.id);
          return matchesReplacement ? [{ pack: candidatePack, cardIndex }] : [];
        }),
      );
      const samePack = candidates.filter((candidate) => candidate.pack.index === pack.index);
      const replacementPool = samePack.length > 0 ? samePack : candidates;
      if (replacementPool.length === 0) continue;
      const target = replacementPool[Math.floor(random() * replacementPool.length)];
      target.pack.cards[target.cardIndex] = makeCard(series, rule.cardKind, random, now, parallel);
    }
  }

  // 包内排序：命中永远压轴，编号平行卡尽量靠后，制造翻卡节奏
  for (const pack of packs) {
    pack.cards.sort((a, b) => rarityRank(a) - rarityRank(b));
  }
  return packs;
}

export function rarityRank(card: PulledCard): number {
  const kindBoost = card.kind === 'auto' || card.kind === 'relic' || card.kind === 'auto-relic'
    ? 10
    : card.kind === 'insert'
      ? 1
      : 0;
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
  if (
    card.kind === 'auto' ||
    card.kind === 'relic' ||
    card.kind === 'auto-relic' ||
    card.parallel.rarity === 'super'
  ) return 3;
  if (card.parallel.rarity === 'low-numbered') return 2;
  if (card.parallel.rarity === 'numbered') return 2;
  if (card.parallel.rarity === 'shine') return 1;
  return 0;
}
