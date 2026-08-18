import { SERIES_MAP } from './data/series';
import type { Parallel, PulledCard } from './types';

const BALANCE_KEY = 'cr_balance';
const COLLECTION_KEY = 'cr_collection';
const COLLECTION_VERSION = 2;

export const INITIAL_BALANCE = 20000;
export const RECHARGE_AMOUNT = 10000;

type StoredCardV2 = [
  uid: string,
  playerId: string,
  seriesId: string,
  cardId: string | null,
  kind: PulledCard['kind'],
  parallelId: string,
  serialNumber: number | null,
  relicKind: PulledCard['relicKind'] | null,
  rookie: boolean,
  pulledAt: number,
];

export function loadBalance(): number {
  try {
    const raw = localStorage.getItem(BALANCE_KEY);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : INITIAL_BALANCE;
  } catch {
    return INITIAL_BALANCE;
  }
}

export function saveBalance(balance: number): boolean {
  try {
    localStorage.setItem(BALANCE_KEY, String(balance));
    return true;
  } catch {
    return false;
  }
}

export function loadCollection(): PulledCard[] {
  try {
    return parseCollection(localStorage.getItem(COLLECTION_KEY));
  } catch {
    return [];
  }
}

export function serializeCollection(cards: PulledCard[]): string {
  const stored: StoredCardV2[] = cards.map((card) => [
    card.uid,
    card.playerId,
    card.seriesId,
    card.cardId ?? null,
    card.kind,
    card.parallel.id,
    card.serialNumber,
    card.relicKind ?? null,
    card.rookie,
    card.pulledAt,
  ]);
  return JSON.stringify({ version: COLLECTION_VERSION, cards: stored });
}

export function saveCollection(cards: PulledCard[]): boolean {
  try {
    localStorage.setItem(COLLECTION_KEY, serializeCollection(cards));
    return true;
  } catch {
    return false;
  }
}

function isPulledCard(value: unknown): value is PulledCard {
  if (!value || typeof value !== 'object') return false;
  const card = value as Partial<PulledCard>;
  return (
    typeof card.uid === 'string' &&
    typeof card.playerId === 'string' &&
    typeof card.seriesId === 'string' &&
    typeof card.kind === 'string' &&
    typeof card.rookie === 'boolean' &&
    typeof card.pulledAt === 'number' &&
    !!card.parallel &&
    typeof card.parallel.id === 'string'
  );
}

function parallelFor(seriesId: string, parallelId: string): Parallel | undefined {
  const series = SERIES_MAP[seriesId];
  if (!series) return undefined;
  return [
    ...series.parallels,
    ...series.insertParallels,
    ...series.autoParallels,
    ...series.relicParallels,
  ].find((parallel) => parallel.id === parallelId);
}

function parseStoredCard(value: unknown): PulledCard | null {
  if (!Array.isArray(value) || value.length !== 10) return null;
  const [uid, playerId, seriesId, cardId, kind, parallelId, serialNumber, relicKind, rookie, pulledAt] = value;
  if (
    typeof uid !== 'string' ||
    typeof playerId !== 'string' ||
    typeof seriesId !== 'string' ||
    (cardId !== null && typeof cardId !== 'string') ||
    !['base', 'insert', 'auto', 'relic', 'auto-relic'].includes(String(kind)) ||
    typeof parallelId !== 'string' ||
    (serialNumber !== null && typeof serialNumber !== 'number') ||
    (relicKind !== null && relicKind !== 'jersey' && relicKind !== 'patch') ||
    typeof rookie !== 'boolean' ||
    typeof pulledAt !== 'number'
  ) return null;
  const parallel = parallelFor(seriesId, parallelId);
  if (!parallel) return null;
  return {
    uid,
    playerId,
    seriesId,
    ...(cardId ? { cardId } : {}),
    kind: kind as PulledCard['kind'],
    parallel,
    serialNumber,
    ...(relicKind ? { relicKind } : {}),
    rookie,
    pulledAt,
  };
}

/** 兼容旧版数组、v1 对象，并将 v2 紧凑存档恢复为运行时卡片。 */
export function parseCollection(raw: string | null): PulledCard[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(isPulledCard);
    if (!parsed || typeof parsed !== 'object' || !('version' in parsed) || !('cards' in parsed)) return [];
    const value = parsed as { version?: unknown; cards?: unknown };
    if (!Array.isArray(value.cards)) return [];
    if (value.version === 1) return value.cards.filter(isPulledCard);
    if (value.version === COLLECTION_VERSION) {
      return value.cards.map(parseStoredCard).filter((card): card is PulledCard => card !== null);
    }
    return [];
  } catch {
    return [];
  }
}
