import { describe, expect, it } from 'vitest';
import { PLAYER_MAP } from './players';
import { LANDSCAPE_PILOT_SUBJECTS, landscapePilotForSeries } from './landscape-pilot';

describe('M11 landscape pilot', () => {
  it('locks 40 distinct, valid subjects across the four card series', () => {
    expect(LANDSCAPE_PILOT_SUBJECTS).toHaveLength(40);
    expect(new Set(LANDSCAPE_PILOT_SUBJECTS.map((subject) => subject.playerId)).size).toBe(40);
    for (const seriesId of ['prizm-epl', 'select-laliga', 'obsidian', 'topps-ucl'] as const) {
      expect(landscapePilotForSeries(seriesId)).toHaveLength(10);
    }
    expect(LANDSCAPE_PILOT_SUBJECTS.every((subject) => PLAYER_MAP[subject.playerId])).toBe(true);
  });
});
