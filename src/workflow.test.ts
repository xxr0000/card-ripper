import { describe, expect, it } from 'vitest';
import { CHECKLIST_ENTRY_MAP } from './data/checklists';
import { SERIES } from './data/series';
import { ripBox } from './engine/rip';
import { parseCollection, serializeCollection } from './store';

describe('M6 purchase-to-collection workflow', () => {
  it('四系列整盒抽卡都能进入紧凑存档并完整恢复', () => {
    const cards = SERIES.flatMap((series, seriesIndex) =>
      ripBox(series, {
        random: () => 0.173 + seriesIndex * 0.037,
        now: () => 1_750_000_000_000 + seriesIndex,
      }).flatMap((pack) => pack.cards),
    );

    const restored = parseCollection(serializeCollection(cards));
    expect(restored.map((card) => card.uid)).toEqual(cards.map((card) => card.uid));
    expect(restored).toHaveLength(291);

    for (const card of cards.filter((candidate) => candidate.seriesId !== 'prizm-epl')) {
      expect(card.cardId).toBeTruthy();
      expect(CHECKLIST_ENTRY_MAP[card.seriesId][card.cardId as string]).toBeDefined();
    }
  });
});
