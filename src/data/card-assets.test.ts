import { describe, expect, it } from 'vitest';
import { SERIES } from './series';
import { joinAssetUrl, resolveCardAsset, resolvePlayerMediaAsset } from './card-assets';
import { PLAYER_MAP } from './players';
import type { PulledCard } from '../types';

function card(overrides: Partial<PulledCard> = {}): PulledCard {
  return {
    uid: 'asset-test',
    playerId: 'erling-haaland',
    seriesId: 'prizm-epl',
    cardId: 'base-9',
    kind: 'base',
    parallel: SERIES[0].parallels[0],
    serialNumber: null,
    rookie: false,
    pulledAt: 0,
    ...overrides,
  };
}

describe('card asset resolution', () => {
  it('honors Vite base path and explicit base metadata', () => {
    expect(resolveCardAsset(card(), '/card-ripper/')).toMatchObject({
      path: 'cards/prizm-epl/base-9.webp',
      source: 'reference',
      url: '/card-ripper/cards/prizm-epl/base-9.webp',
    });
    expect(joinAssetUrl('/', '/cards/a.webp')).toBe('/cards/a.webp');
  });

  it('selects explicit auto and relic variants', () => {
    expect(resolveCardAsset(card({ kind: 'auto' }), '/')?.path).toBe(
      'cards/prizm-epl/base-9.auto.webp',
    );
    expect(resolveCardAsset(card({ kind: 'relic' }), '/')?.path).toBe(
      'cards/prizm-epl/base-9.relic.webp',
    );
    expect(resolveCardAsset(card({ kind: 'auto-relic' }), '/')?.path).toBe(
      'cards/prizm-epl/base-9.auto.webp',
    );
  });

  it('returns no asset for old saves and missing metadata', () => {
    expect(resolveCardAsset(card({ cardId: undefined }), '/')).toBeUndefined();
    expect(resolveCardAsset(card({ cardId: 'base-12' }), '/')).toBeUndefined();
  });

  it('uses a responsive player photo only after card-specific art is unavailable', () => {
    const haaland = PLAYER_MAP.haaland;
    expect(resolvePlayerMediaAsset(haaland, '/card-ripper/')).toMatchObject({
      thumbnailPath: 'cards/players/erling-haaland-sm.webp',
      largePath: 'cards/players/erling-haaland-lg.webp',
      url: '/card-ripper/cards/players/erling-haaland-sm.webp',
      largeUrl: '/card-ripper/cards/players/erling-haaland-lg.webp',
    });
  });
});
