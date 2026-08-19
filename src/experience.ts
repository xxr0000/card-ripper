import type { PulledCard } from './types';

export interface ExperienceSettings {
  sound: boolean;
  vibration: boolean;
  motion: boolean;
  volume: number;
}

export type SoundCue = 'pack-crinkle' | 'pack-tear' | 'pack-open' | 'flip';
export type HitSoundTier = 'numbered' | 'premium' | 'case' | 'one-of-one';

export interface RecordedSound {
  path: string;
  gain: number;
  playbackRate: number;
}

const FLIP_SOUND_PATHS = [
  'audio/flip-1.mp3',
  'audio/flip-2.mp3',
  'audio/flip-3.mp3',
  'audio/flip-4.mp3',
] as const;

const PACK_SOUND_PATHS: Record<Exclude<SoundCue, 'flip'>, string> = {
  'pack-crinkle': 'audio/pack-crinkle.mp3',
  'pack-tear': 'audio/pack-tear.mp3',
  'pack-open': 'audio/pack-open.mp3',
};

const HIT_SOUND_PATHS: Record<HitSoundTier, string> = {
  numbered: 'audio/hit-numbered.mp3',
  premium: 'audio/hit-premium.mp3',
  case: 'audio/hit-case.mp3',
  'one-of-one': 'audio/hit-one-of-one.mp3',
};

export const RECORDED_AUDIO_PATHS = [
  ...Object.values(PACK_SOUND_PATHS),
  ...FLIP_SOUND_PATHS,
  ...Object.values(HIT_SOUND_PATHS),
] as const;

export const DEFAULT_EXPERIENCE_SETTINGS: ExperienceSettings = {
  sound: true,
  vibration: true,
  motion: true,
  volume: 0.55,
};

const SETTINGS_KEY = 'cr_experience';

export function parseExperienceSettings(raw: string | null): ExperienceSettings {
  if (!raw) return DEFAULT_EXPERIENCE_SETTINGS;
  try {
    const value = JSON.parse(raw) as Partial<ExperienceSettings>;
    return {
      sound: typeof value.sound === 'boolean' ? value.sound : true,
      vibration: typeof value.vibration === 'boolean' ? value.vibration : true,
      motion: typeof value.motion === 'boolean' ? value.motion : true,
      volume: typeof value.volume === 'number' && Number.isFinite(value.volume)
        ? Math.min(1, Math.max(0, value.volume))
        : DEFAULT_EXPERIENCE_SETTINGS.volume,
    };
  } catch {
    return DEFAULT_EXPERIENCE_SETTINGS;
  }
}

export function loadExperienceSettings(): ExperienceSettings {
  try {
    return parseExperienceSettings(localStorage.getItem(SETTINGS_KEY));
  } catch {
    return DEFAULT_EXPERIENCE_SETTINGS;
  }
}

export function saveExperienceSettings(settings: ExperienceSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable in private or locked-down browsing modes.
  }
}

export function tearProgress(startX: number, currentX: number, width: number): number {
  const distance = Math.max(0, currentX - startX);
  return Math.min(1, distance / Math.max(64, width * 0.58));
}

export function shouldOpenFromTear(progress: number): boolean {
  return progress >= 0.78;
}

export function vibrationPattern(level: number): number | number[] {
  if (level >= 4) return [55, 30, 90];
  if (level >= 3) return [35, 25, 60];
  if (level >= 2) return [20, 20, 28];
  return 10;
}

function vary(random: () => number, amount: number): number {
  return 1 + (random() * 2 - 1) * amount;
}

export function recordedSound(cue: SoundCue, random: () => number = Math.random): RecordedSound {
  if (cue === 'flip') {
    const index = Math.min(FLIP_SOUND_PATHS.length - 1, Math.floor(random() * FLIP_SOUND_PATHS.length));
    return {
      path: FLIP_SOUND_PATHS[index],
      gain: 0.52 * vary(random, 0.08),
      playbackRate: vary(random, 0.035),
    };
  }
  const gains: Record<Exclude<SoundCue, 'flip'>, number> = {
    'pack-crinkle': 0.28,
    'pack-tear': 0.5,
    'pack-open': 0.42,
  };
  return {
    path: PACK_SOUND_PATHS[cue],
    gain: gains[cue] * vary(random, 0.05),
    playbackRate: vary(random, 0.025),
  };
}

export function hitSoundTier(card: PulledCard): HitSoundTier | null {
  if (card.parallel.rarity === 'one-of-one') return 'one-of-one';
  if (card.parallel.rarity === 'super') return 'case';
  if (card.kind === 'auto' || card.kind === 'relic' || card.kind === 'auto-relic') return 'premium';
  if (card.parallel.rarity === 'numbered' || card.parallel.rarity === 'low-numbered') return 'numbered';
  return null;
}

export function recordedHitSound(tier: HitSoundTier, random: () => number = Math.random): RecordedSound {
  const gains: Record<HitSoundTier, number> = {
    numbered: 0.32,
    premium: 0.38,
    case: 0.44,
    'one-of-one': 0.5,
  };
  return {
    path: HIT_SOUND_PATHS[tier],
    gain: gains[tier] * vary(random, 0.035),
    playbackRate: vary(random, 0.018),
  };
}

export function publicAssetUrl(path: string, baseUrl = '/'): string {
  return `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}${path.replace(/^\//, '')}`;
}
