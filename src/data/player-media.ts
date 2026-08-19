import { PLAYER_MEDIA } from './player-media.generated';

export interface PlayerMedia {
  playerName: string;
  thumbnailPath: string;
  largePath: string;
  sourcePage: string;
  accessedAt: string;
  originalWidth: number;
  originalHeight: number;
  focalPoint: { x: number; y: number };
  status: 'verified';
}

export function mediaKey(name: string): string {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '');
  return {
    'heung-min-son': 'son-heung-min',
  }[normalized] ?? normalized;
}

export function playerMediaFor(name: string): PlayerMedia | undefined {
  return PLAYER_MEDIA[mediaKey(name)];
}
