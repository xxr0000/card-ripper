import { describe, expect, it } from 'vitest';
import { CHECKLIST_PLAYERS } from './checklists';
import { PLAYERS } from './players';
import { SERIES } from './series';

const cjk = /[\u3400-\u9fff\uf900-\ufaff]/u;

describe('English-only card copy', () => {
  it('keeps all card-facing series and parallel labels free of CJK characters', () => {
    for (const series of SERIES) {
      expect(series.nameEn).not.toMatch(cjk);
      for (const parallel of [
        ...series.parallels,
        ...series.insertParallels,
        ...series.autoParallels,
        ...series.relicParallels,
      ]) {
        expect(parallel.nameEn).not.toMatch(cjk);
      }
    }
  });

  it('provides English team and country copy for every player rendered on a card', () => {
    for (const player of [...PLAYERS, ...CHECKLIST_PLAYERS]) {
      expect(player.teamEn).not.toMatch(cjk);
      expect(player.countryEn).not.toMatch(cjk);
    }
  });
});
