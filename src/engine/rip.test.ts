import { describe, expect, it } from 'vitest';
import { PLAYER_MAP } from '../data/players';
import { PRIZM_EPL_AUTO_PLAYERS, PRIZM_EPL_BASE_PLAYERS } from '../data/checklists';
import { SERIES } from '../data/series';
import type { PulledCard } from '../types';
import { ripBox } from './rip';

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

function cardSnapshot(card: PulledCard) {
  return {
    playerId: card.playerId,
    kind: card.kind,
    parallelId: card.parallel.id,
    serialNumber: card.serialNumber,
    relicKind: card.relicKind,
  };
}

describe('ripBox', () => {
  for (const [seriesIndex, series] of SERIES.entries()) {
    it(`${series.id} 满足卡数、盒保、卡池与编号约束`, () => {
      for (let boxIndex = 0; boxIndex < 50; boxIndex += 1) {
        const packs = ripBox(series, {
          random: seededRandom(seriesIndex * 1000 + boxIndex),
          now: () => 1_700_000_000_000,
        });
        const cards = packs.flatMap((pack) => pack.cards);

        expect(packs).toHaveLength(series.packsPerBox);
        expect(cards).toHaveLength(series.packsPerBox * series.cardsPerPack);

        for (const spec of series.hitsPerBox) {
          expect(cards.filter((card) => card.kind === spec.type).length).toBeGreaterThanOrEqual(
            spec.count,
          );
        }

        for (const card of cards) {
          const player = PLAYER_MAP[card.playerId];
          expect(player).toBeDefined();
          if (series.leagues !== 'all') {
            expect(series.leagues).toContain(player.league);
          }
          if (card.parallel.serialTo === null) {
            expect(card.serialNumber).toBeNull();
          } else {
            expect(card.serialNumber).toBeGreaterThanOrEqual(1);
            expect(card.serialNumber).toBeLessThanOrEqual(card.parallel.serialTo);
          }
        }
      }
    });
  }

  it('相同种子生成相同的卡片内容', () => {
    const series = SERIES[0];
    const first = ripBox(series, {
      random: seededRandom(42),
      now: () => 1_700_000_000_000,
    }).flatMap((pack) => pack.cards.map(cardSnapshot));
    const second = ripBox(series, {
      random: seededRandom(42),
      now: () => 1_700_000_000_000,
    }).flatMap((pack) => pack.cards.map(cardSnapshot));

    expect(second).toEqual(first);
  });

  it('Prizm 基础卡和签字卡只从各自正式 checklist 抽取', () => {
    const baseIds = new Set(PRIZM_EPL_BASE_PLAYERS.map((player) => player.id));
    const autoIds = new Set(PRIZM_EPL_AUTO_PLAYERS.map((player) => player.id));
    const cards = ripBox(SERIES[0], {
      random: seededRandom(20240818),
      now: () => 1_700_000_000_000,
    }).flatMap((pack) => pack.cards);
    for (const card of cards) {
      expect(card.kind === 'auto' ? autoIds : baseIds).toContain(card.playerId);
    }
  });
});
