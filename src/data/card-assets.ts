import { CHECKLIST_ENTRY_MAP } from './checklists';
import type { CardAssetMetadata, CardAssetVariant } from './checklists/types';
import { playerMediaFor } from './player-media';
import type { Player, PulledCard } from '../types';

function assetForKind(
  assets: CardAssetMetadata,
  kind: PulledCard['kind'],
): CardAssetVariant | undefined {
  if (kind === 'auto-relic') {
    return assets.autoRelic ?? assets.auto ?? assets.relic ?? assets.base;
  }
  if (kind === 'auto') return assets.auto ?? assets.base;
  if (kind === 'relic') return assets.relic ?? assets.base;
  return assets.base;
}

export function joinAssetUrl(baseUrl: string, path: string): string {
  const normalizedBase = `/${baseUrl.split('/').filter(Boolean).join('/')}`;
  const normalizedPath = path.replace(/^\/+/, '');
  return `${normalizedBase === '/' ? '/' : `${normalizedBase}/`}${normalizedPath}`;
}

/** 没有 cardId、元数据或匹配素材时返回 undefined，让 CardFace 使用绘制回退层。 */
export function resolveCardAsset(
  card: PulledCard,
  baseUrl = import.meta.env.BASE_URL,
): CardAssetVariant & { url: string } | undefined {
  if (!card.cardId) return undefined;
  const entry = CHECKLIST_ENTRY_MAP[card.seriesId]?.[card.cardId];
  if (!entry?.assets) return undefined;
  const asset = assetForKind(entry.assets, card.kind);
  return asset ? { ...asset, url: joinAssetUrl(baseUrl, asset.path) } : undefined;
}

/** 真卡图缺失时使用球员摄影图；原版卡图始终具有更高优先级。 */
export function resolvePlayerMediaAsset(
  player: Player,
  baseUrl = import.meta.env.BASE_URL,
) {
  const media = playerMediaFor(player.name);
  if (!media) return undefined;
  return {
    ...media,
    url: joinAssetUrl(baseUrl, media.thumbnailPath),
    largeUrl: joinAssetUrl(baseUrl, media.largePath),
  };
}
