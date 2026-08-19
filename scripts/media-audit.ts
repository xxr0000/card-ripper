import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { CHECKLIST_PLAYERS } from '../src/data/checklists';
import { PLAYER_MEDIA } from '../src/data/player-media.generated';
import { mediaKey } from '../src/data/player-media';
import { PLAYERS } from '../src/data/players';
import {
  LANDSCAPE_LARGE_HEIGHT,
  LANDSCAPE_LARGE_WIDTH,
  LANDSCAPE_THUMB_HEIGHT,
  LANDSCAPE_THUMB_WIDTH,
  MAX_LANDSCAPE_LARGE_BYTES,
  MAX_LANDSCAPE_THUMB_BYTES,
} from './assets';

const OUTPUT_ROOT = resolve('public/cards/players');
const expected = [...new Map(
  [...PLAYERS, ...CHECKLIST_PLAYERS].map((player) => [mediaKey(player.name), player]),
).values()];
const expectedKeys = new Set(expected.map((player) => mediaKey(player.name)));
const failures: string[] = [];
const hashes = new Map<string, string>();
let mediaBytes = 0;
const landscape = {
  cropApproved: 0,
  needsNewSource: 0,
  fallback: 0,
  pendingReview: 0,
  verified: 0,
};

for (const [key, media] of Object.entries(PLAYER_MEDIA)) {
  if (!expectedKeys.has(key)) failures.push(`${key}: 不在当前卡池中`);
  if (mediaKey(media.playerName) !== key) failures.push(`${key}: 姓名与清单键不一致`);
  if (!media.sourcePage.startsWith('https://')) failures.push(`${key}: 缺少 HTTPS 来源页`);
  for (const [size, path, width, height, byteLimit] of [
    ['sm', media.thumbnailPath, 500, 700, 120 * 1024],
    ['lg', media.largePath, 1000, 1400, 300 * 1024],
  ] as const) {
    const absolutePath = resolve('public', path);
    try {
      const fileStat = await stat(absolutePath);
      mediaBytes += fileStat.size;
      if (fileStat.size > byteLimit) failures.push(`${key}-${size}: ${fileStat.size} bytes 超过门禁`);
      const metadata = await sharp(absolutePath).metadata();
      if (metadata.width !== width || metadata.height !== height || metadata.format !== 'webp') {
        failures.push(`${key}-${size}: 实际为 ${metadata.width}x${metadata.height} ${metadata.format}`);
      }
      const hash = createHash('sha256').update(await readFile(absolutePath)).digest('hex');
      const duplicate = hashes.get(hash);
      if (duplicate) failures.push(`${key}-${size}: 与 ${duplicate} 内容重复`);
      else hashes.set(hash, `${key}-${size}`);
    } catch (error) {
      failures.push(`${key}-${size}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (media.landscapeStatus === 'crop-approved') landscape.cropApproved += 1;
  else if (media.landscapeStatus === 'needs-new-source') landscape.needsNewSource += 1;
  else landscape.fallback += 1;
  if (media.landscapeReview === 'verified') landscape.verified += 1;
  else landscape.pendingReview += 1;
  if (media.landscapeStatus === 'crop-approved') {
    if (!media.landscapeThumbnailPath || !media.landscapeLargePath) {
      failures.push(`${key}: 横图已批准但缺少输出路径`);
    } else {
      for (const [size, path, width, height, byteLimit] of [
        ['landscape-sm', media.landscapeThumbnailPath, LANDSCAPE_THUMB_WIDTH, LANDSCAPE_THUMB_HEIGHT, MAX_LANDSCAPE_THUMB_BYTES],
        ['landscape-lg', media.landscapeLargePath, LANDSCAPE_LARGE_WIDTH, LANDSCAPE_LARGE_HEIGHT, MAX_LANDSCAPE_LARGE_BYTES],
      ] as const) {
        try {
          const fileStat = await stat(resolve('public', path));
          if (fileStat.size > byteLimit) failures.push(`${key}-${size}: ${fileStat.size} bytes 超过门禁`);
          const metadata = await sharp(resolve('public', path)).metadata();
          if (metadata.width !== width || metadata.height !== height || metadata.format !== 'webp') {
            failures.push(`${key}-${size}: 实际为 ${metadata.width}x${metadata.height} ${metadata.format}`);
          }
        } catch (error) {
          failures.push(`${key}-${size}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }
}

const files = (await readdir(OUTPUT_ROOT)).filter((file) => file.endsWith('.webp'));
if (files.length !== Object.keys(PLAYER_MEDIA).length * 2) {
  failures.push(`媒体文件数 ${files.length} 与清单预期 ${Object.keys(PLAYER_MEDIA).length * 2} 不一致`);
}

const covered = expected.filter((player) => PLAYER_MEDIA[mediaKey(player.name)]).length;
const fallbackSubjects = expected
  .filter((player) => !PLAYER_MEDIA[mediaKey(player.name)])
  .map((player) => ({ name: player.name, team: player.teamEn, id: player.id }));
const report = {
  uniqueSubjects: expected.length,
  covered,
  fallback: expected.length - covered,
  coveragePercent: Number((covered / expected.length * 100).toFixed(1)),
  identityPending: 0,
  mediaFiles: files.length,
  mediaBytes,
  mediaMiB: Number((mediaBytes / 1024 / 1024).toFixed(2)),
  landscape,
  fallbackSubjects,
};

console.log(JSON.stringify(report, null, 2));
if (process.argv.includes('--write')) {
  await writeFile(resolve('docs/M10-player-media-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}
if (failures.length > 0) {
  console.error(`球员媒体审计未通过：\n${failures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('球员媒体审计通过。');
}
