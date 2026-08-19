import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  LANDSCAPE_LARGE_HEIGHT,
  LANDSCAPE_LARGE_WIDTH,
  LANDSCAPE_THUMB_HEIGHT,
  LANDSCAPE_THUMB_WIDTH,
  MAX_CARD_BYTES,
  MAX_PLAYER_LARGE_BYTES,
  PLAYER_LARGE_HEIGHT,
  PLAYER_LARGE_WIDTH,
  processAssets,
  processLandscapeAsset,
  processResponsiveAsset,
} from './assets';

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((path) => rm(path, { recursive: true })));
});

describe('asset processing pipeline', () => {
  it('creates a bounded 5:7 WebP and manifest', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'card-ripper-assets-'));
    tempDirectories.push(root);
    const input = resolve(root, 'source');
    const output = resolve(root, 'cards');
    await sharp({
      create: { width: 900, height: 900, channels: 3, background: '#38bdf8' },
    }).png().toFile(resolve(root, 'source.png'));
    await mkdir(input);
    await writeFile(resolve(input, 'test.png'), await readFile(resolve(root, 'source.png')));

    const manifest = await processAssets(input, output);
    const metadata = await sharp(await readFile(resolve(output, 'test.webp'))).metadata();
    expect(manifest).toHaveLength(1);
    expect(metadata.width).toBe(CARD_WIDTH);
    expect(metadata.height).toBe(CARD_HEIGHT);
    expect(manifest[0].bytes).toBeLessThanOrEqual(MAX_CARD_BYTES);
    expect(JSON.parse(await readFile(resolve(output, 'manifest.json'), 'utf8')).assets).toHaveLength(1);
  });

  it('creates responsive thumbnail and high-resolution variants within their budgets', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'card-ripper-responsive-assets-'));
    tempDirectories.push(root);
    const input = resolve(root, 'source.png');
    const thumbnail = resolve(root, 'sm.webp');
    const large = resolve(root, 'lg.webp');
    await sharp({
      create: { width: 1600, height: 900, channels: 3, background: '#1d4ed8' },
    }).png().toFile(input);

    const result = await processResponsiveAsset(input, thumbnail, large);
    const [thumbnailMeta, largeMeta] = await Promise.all([
      sharp(await readFile(thumbnail)).metadata(),
      sharp(await readFile(large)).metadata(),
    ]);
    expect([thumbnailMeta.width, thumbnailMeta.height]).toEqual([CARD_WIDTH, CARD_HEIGHT]);
    expect([largeMeta.width, largeMeta.height]).toEqual([PLAYER_LARGE_WIDTH, PLAYER_LARGE_HEIGHT]);
    expect(result.largeBytes).toBeLessThanOrEqual(MAX_PLAYER_LARGE_BYTES);
  });

  it('creates the 3:2 landscape pair used by the new card photo window', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'card-ripper-landscape-assets-'));
    tempDirectories.push(root);
    const input = resolve(root, 'source.png');
    const thumbnail = resolve(root, 'landscape-sm.webp');
    const large = resolve(root, 'landscape-lg.webp');
    await sharp({
      create: { width: 1600, height: 1000, channels: 3, background: '#246' },
    }).png().toFile(input);

    const result = await processLandscapeAsset(input, thumbnail, large);
    const [thumbnailMeta, largeMeta] = await Promise.all([
      sharp(await readFile(thumbnail)).metadata(),
      sharp(await readFile(large)).metadata(),
    ]);
    expect([thumbnailMeta.width, thumbnailMeta.height]).toEqual([LANDSCAPE_THUMB_WIDTH, LANDSCAPE_THUMB_HEIGHT]);
    expect([largeMeta.width, largeMeta.height]).toEqual([LANDSCAPE_LARGE_WIDTH, LANDSCAPE_LARGE_HEIGHT]);
    expect(result.thumbnailBytes).toBeGreaterThan(0);
  });
});
