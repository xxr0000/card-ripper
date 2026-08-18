import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { CARD_HEIGHT, CARD_WIDTH, MAX_CARD_BYTES, processAssets } from './assets';

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
    const metadata = await sharp(resolve(output, 'test.webp')).metadata();
    expect(manifest).toHaveLength(1);
    expect(metadata.width).toBe(CARD_WIDTH);
    expect(metadata.height).toBe(CARD_HEIGHT);
    expect(manifest[0].bytes).toBeLessThanOrEqual(MAX_CARD_BYTES);
    expect(JSON.parse(await readFile(resolve(output, 'manifest.json'), 'utf8')).assets).toHaveLength(1);
  });
});
