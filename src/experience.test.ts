import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXPERIENCE_SETTINGS,
  parseExperienceSettings,
  shouldOpenFromTear,
  soundProfile,
  tearProgress,
  vibrationPattern,
} from './experience';

describe('experience settings', () => {
  it('uses safe defaults and clamps stored volume', () => {
    expect(parseExperienceSettings(null)).toEqual(DEFAULT_EXPERIENCE_SETTINGS);
    expect(parseExperienceSettings('{bad')).toEqual(DEFAULT_EXPERIENCE_SETTINGS);
    expect(parseExperienceSettings(JSON.stringify({ sound: false, volume: 2 }))).toEqual({
      sound: false,
      vibration: true,
      motion: true,
      volume: 1,
    });
  });

  it('calculates a directional tear threshold', () => {
    expect(tearProgress(100, 100, 200)).toBe(0);
    expect(tearProgress(100, 216, 200)).toBe(1);
    expect(tearProgress(100, 40, 200)).toBe(0);
    expect(shouldOpenFromTear(0.77)).toBe(false);
    expect(shouldOpenFromTear(0.78)).toBe(true);
  });

  it('scales vibration and synthesized hit feedback by rarity', () => {
    expect(vibrationPattern(0)).toBe(10);
    expect(vibrationPattern(4)).toEqual([55, 30, 90]);
    expect(soundProfile('hit', 4).duration).toBeGreaterThan(soundProfile('flip').duration);
  });
});
