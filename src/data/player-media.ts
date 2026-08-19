import { PLAYER_MEDIA } from './player-media.generated';

export interface PlayerMedia {
  playerName: string;
  /** M10 竖图字段，仅保留用于审计和旧数据兼容；正式卡面不读取。 */
  thumbnailPath: string;
  largePath: string;
  sourcePage: string;
  accessedAt: string;
  originalWidth: number;
  originalHeight: number;
  /** 以归一化坐标记录横图主体位置，复杂构图可同时调整 x/y。 */
  focalPoint: { x: number; y: number };
  /** 原图对 3:2 横向照片窗的处理结论。 */
  landscapeStatus?: 'crop-approved' | 'needs-new-source' | 'fallback';
  /** 仅人工复核通过的横图才允许在正式卡面显示。 */
  landscapeReview?: 'pending' | 'verified';
  landscapeThumbnailPath?: string;
  landscapeLargePath?: string;
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

export function verifiedLandscapeMediaFor(name: string): PlayerMedia | undefined {
  const media = playerMediaFor(name);
  if (
    media?.landscapeStatus !== 'crop-approved'
    || media.landscapeReview !== 'verified'
    || !media.landscapeThumbnailPath
    || !media.landscapeLargePath
  ) return undefined;
  return media;
}
