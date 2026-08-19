import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXPERIENCE_SETTINGS,
  RECORDED_AUDIO_PATHS,
  hitSoundTier,
  parseExperienceSettings,
  publicAssetUrl,
  recordedHitSound,
  recordedSound,
  shouldOpenFromTear,
  tearProgress,
  vibrationPattern,
} from './experience';
import type { PulledCard } from './types';

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

  it('scales vibration and maps all recorded cues to local assets', () => {
    expect(vibrationPattern(0)).toBe(10);
    expect(vibrationPattern(4)).toEqual([55, 30, 90]);
    expect(RECORDED_AUDIO_PATHS).toHaveLength(11);
    expect(RECORDED_AUDIO_PATHS.every((path) => path.startsWith('audio/'))).toBe(true);
    expect(recordedSound('flip', () => 0).path).toBe('audio/flip-1.mp3');
    expect(recordedSound('flip', () => 0.999).path).toBe('audio/flip-4.mp3');
    expect(publicAssetUrl('audio/flip-1.mp3', '/card-ripper')).toBe('/card-ripper/audio/flip-1.mp3');
  });

  it('keeps rarity cues separate from the underlying card flip', () => {
    const card = (rarity: PulledCard['parallel']['rarity'], kind: PulledCard['kind'] = 'base') => ({
      kind,
      parallel: { rarity },
    }) as PulledCard;
    expect(hitSoundTier(card('numbered'))).toBe('numbered');
    expect(hitSoundTier(card('low-numbered', 'auto'))).toBe('premium');
    expect(hitSoundTier(card('super'))).toBe('case');
    expect(hitSoundTier(card('one-of-one'))).toBe('one-of-one');
    expect(hitSoundTier(card('shine'))).toBeNull();
    expect(recordedHitSound('one-of-one', () => 0.5).path).toBe('audio/hit-one-of-one.mp3');
  });
});
