import type { PulledCard } from './types';

const BALANCE_KEY = 'cr_balance';
const COLLECTION_KEY = 'cr_collection';

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
  try {
    const raw = localStorage.getItem(COLLECTION_KEY);
    return raw ? (JSON.parse(raw) as PulledCard[]) : [];
  } catch {
    return [];
  }
}

export function saveCollection(cards: PulledCard[]): void {
  localStorage.setItem(COLLECTION_KEY, JSON.stringify(cards));
}
