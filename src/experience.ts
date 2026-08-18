export interface ExperienceSettings {
  sound: boolean;
  vibration: boolean;
  motion: boolean;
  volume: number;
}

export type SoundCue = 'pack' | 'flip' | 'hit';

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

export function soundProfile(cue: SoundCue, level = 0): {
  frequency: number;
  endFrequency: number;
  duration: number;
  type: OscillatorType;
} {
  if (cue === 'pack') {
    return { frequency: 180, endFrequency: 520, duration: 0.13, type: 'sawtooth' };
  }
  if (cue === 'hit') {
    return {
      frequency: level >= 4 ? 880 : 660,
      endFrequency: level >= 4 ? 1320 : 990,
      duration: level >= 4 ? 0.42 : 0.3,
      type: 'sine',
    };
  }
  return { frequency: 320, endFrequency: 220, duration: 0.08, type: 'triangle' };
}
