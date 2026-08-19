import { describe, expect, it } from 'vitest';
import { playerMediaFor, verifiedLandscapeMediaFor } from './player-media';

describe('landscape player media', () => {
  it('keeps the legacy portrait catalog readable without treating it as approved landscape art', () => {
    const haaland = playerMediaFor('Erling Haaland');
    expect(haaland?.thumbnailPath).toBe('cards/players/erling-haaland-sm.webp');
    expect(verifiedLandscapeMediaFor('Erling Haaland')).toBeUndefined();
  });
});
