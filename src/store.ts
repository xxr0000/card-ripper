import type { PulledCard } from './types';

const BALANCE_KEY = 'cr_balance';
const COLLECTION_KEY = 'cr_collection';
const COLLECTION_VERSION = 1;

export const INITIAL_BALANCE = 20000;
export const RECHARGE_AMOUNT = 10000;

export function loadBalance(): number {
  const raw = localStorage.getItem(BALANCE_KEY);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : INITIAL_BALANCE;
}

export function saveBalance(balance: number): void {
  localStorage.setItem(BALANCE_KEY, String(balance));
}

export function loadCollection(): PulledCard[] {
  return parseCollection(localStorage.getItem(COLLECTION_KEY));
}

export function saveCollection(cards: PulledCard[]): void {
  localStorage.setItem(
    COLLECTION_KEY,
    JSON.stringify({ version: COLLECTION_VERSION, cards }),
  );
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

/** 兼容旧版直接存数组的格式，并过滤损坏条目。 */
export function parseCollection(raw: string | null): PulledCard[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    const cards = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === 'object' &&
          'version' in parsed &&
          'cards' in parsed &&
          (parsed as { version?: unknown }).version === COLLECTION_VERSION &&
          Array.isArray((parsed as { cards?: unknown }).cards)
        ? (parsed as { cards: unknown[] }).cards
        : [];
    return cards.filter(isPulledCard);
  } catch {
    return [];
  }
}
