import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { CHECKLIST_MAP } from '../src/data/checklists';

export const CARD_WIDTH = 500;
export const CARD_HEIGHT = 700;
export const MAX_CARD_BYTES = 120 * 1024;
export const PLAYER_LARGE_WIDTH = 1000;
export const PLAYER_LARGE_HEIGHT = 1400;
export const MAX_PLAYER_LARGE_BYTES = 300 * 1024;
export const LANDSCAPE_THUMB_WIDTH = 720;
export const LANDSCAPE_THUMB_HEIGHT = 480;
export const LANDSCAPE_LARGE_WIDTH = 1200;
export const LANDSCAPE_LARGE_HEIGHT = 800;
export const MAX_LANDSCAPE_THUMB_BYTES = 150 * 1024;
export const MAX_LANDSCAPE_LARGE_BYTES = 360 * 1024;
const SOURCE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg']);

export interface AssetManifestEntry {
  path: string;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
}

export interface ResponsiveAssetManifestEntry {
  thumbnailPath: string;
  largePath: string;
  thumbnailBytes: number;
  largeBytes: number;
}

async function filesBelow(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => {
      const path = resolve(root, entry.name);
      return entry.isDirectory() ? filesBelow(path) : [path];
    }));
    return nested.flat().sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

export async function processAssets(
  inputRoot = resolve('assets-src'),
  outputRoot = resolve('public/cards'),
): Promise<AssetManifestEntry[]> {
  const sources = (await filesBelow(inputRoot)).filter((path) =>
    SOURCE_EXTENSIONS.has(extname(path).toLowerCase()),
  );
  const manifest: AssetManifestEntry[] = [];
  for (const source of sources) {
    const relativeSource = relative(inputRoot, source);
    const output = resolve(outputRoot, relativeSource.replace(/\.[^.]+$/, '.webp'));
    await mkdir(resolve(output, '..'), { recursive: true });
    await sharp(source)
      .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'cover', position: 'centre' })
      .webp({ quality: 82, smartSubsample: true })
      .toFile(output);
    const bytes = (await stat(output)).size;
    const contents = await readFile(output);
    const metadata = await sharp(contents).metadata();
    if (metadata.width !== CARD_WIDTH || metadata.height !== CARD_HEIGHT) {
      throw new Error(`${relativeSource}: 输出尺寸不是 ${CARD_WIDTH}x${CARD_HEIGHT}`);
    }
    if (bytes > MAX_CARD_BYTES) {
      throw new Error(`${relativeSource}: ${bytes} bytes 超过 ${MAX_CARD_BYTES} bytes`);
    }
    manifest.push({
      path: `cards/${relative(inputRoot, source).replace(/\.[^.]+$/, '.webp')}`,
      width: metadata.width,
      height: metadata.height,
      bytes,
      sha256: createHash('sha256').update(contents).digest('hex'),
    });
  }
  await mkdir(outputRoot, { recursive: true });
  await writeFile(
    resolve(outputRoot, 'manifest.json'),
    `${JSON.stringify({ assets: manifest }, null, 2)}\n`,
    'utf8',
  );
  return manifest;
}

/** 为球员摄影图生成小卡与大卡两档资源，避免缩略图下载不必要的大图。 */
export async function processResponsiveAsset(
  source: string,
  thumbnailOutput: string,
  largeOutput: string,
): Promise<ResponsiveAssetManifestEntry> {
  await mkdir(resolve(thumbnailOutput, '..'), { recursive: true });
  await mkdir(resolve(largeOutput, '..'), { recursive: true });
  await sharp(source)
    .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'cover', position: 'attention' })
    .webp({ quality: 82, smartSubsample: true })
    .toFile(thumbnailOutput);
  await sharp(source)
    .resize(PLAYER_LARGE_WIDTH, PLAYER_LARGE_HEIGHT, { fit: 'cover', position: 'attention' })
    .webp({ quality: 84, smartSubsample: true })
    .toFile(largeOutput);
  const [thumbnail, large] = await Promise.all([readFile(thumbnailOutput), readFile(largeOutput)]);
  const [thumbnailMetadata, largeMetadata] = await Promise.all([
    sharp(thumbnail).metadata(),
    sharp(large).metadata(),
  ]);
  if (thumbnailMetadata.width !== CARD_WIDTH || thumbnailMetadata.height !== CARD_HEIGHT) {
    throw new Error(`${source}: 缩略图输出尺寸不是 ${CARD_WIDTH}x${CARD_HEIGHT}`);
  }
  if (largeMetadata.width !== PLAYER_LARGE_WIDTH || largeMetadata.height !== PLAYER_LARGE_HEIGHT) {
    throw new Error(`${source}: 大图输出尺寸不是 ${PLAYER_LARGE_WIDTH}x${PLAYER_LARGE_HEIGHT}`);
  }
  if (large.byteLength > MAX_PLAYER_LARGE_BYTES) {
    throw new Error(`${source}: 大图 ${large.byteLength} bytes 超过 ${MAX_PLAYER_LARGE_BYTES} bytes`);
  }
  return {
    thumbnailPath: thumbnailOutput,
    largePath: largeOutput,
    thumbnailBytes: thumbnail.byteLength,
    largeBytes: large.byteLength,
  };
}

/**
 * 生成新版照片窗专用的 3:2 横图。`cover` 只负责输出，不代表素材通过构图审核；
 * 调用方必须先记录 crop-approved 和人工复核结果。
 */
export async function processLandscapeAsset(
  source: string,
  thumbnailOutput: string,
  largeOutput: string,
): Promise<ResponsiveAssetManifestEntry> {
  await mkdir(resolve(thumbnailOutput, '..'), { recursive: true });
  await mkdir(resolve(largeOutput, '..'), { recursive: true });
  await sharp(source)
    .resize(LANDSCAPE_THUMB_WIDTH, LANDSCAPE_THUMB_HEIGHT, { fit: 'cover', position: 'attention' })
    .webp({ quality: 82, smartSubsample: true })
    .toFile(thumbnailOutput);
  await sharp(source)
    .resize(LANDSCAPE_LARGE_WIDTH, LANDSCAPE_LARGE_HEIGHT, { fit: 'cover', position: 'attention' })
    .webp({ quality: 84, smartSubsample: true })
    .toFile(largeOutput);
  const [thumbnail, large] = await Promise.all([readFile(thumbnailOutput), readFile(largeOutput)]);
  const [thumbnailMetadata, largeMetadata] = await Promise.all([
    sharp(thumbnail).metadata(),
    sharp(large).metadata(),
  ]);
  if (thumbnailMetadata.width !== LANDSCAPE_THUMB_WIDTH || thumbnailMetadata.height !== LANDSCAPE_THUMB_HEIGHT) {
    throw new Error(`${source}: 横图缩略图输出尺寸不是 ${LANDSCAPE_THUMB_WIDTH}x${LANDSCAPE_THUMB_HEIGHT}`);
  }
  if (largeMetadata.width !== LANDSCAPE_LARGE_WIDTH || largeMetadata.height !== LANDSCAPE_LARGE_HEIGHT) {
    throw new Error(`${source}: 横图大图输出尺寸不是 ${LANDSCAPE_LARGE_WIDTH}x${LANDSCAPE_LARGE_HEIGHT}`);
  }
  if (thumbnail.byteLength > MAX_LANDSCAPE_THUMB_BYTES || large.byteLength > MAX_LANDSCAPE_LARGE_BYTES) {
    throw new Error(`${source}: 横图文件超过体积门禁`);
  }
  return {
    thumbnailPath: thumbnailOutput,
    largePath: largeOutput,
    thumbnailBytes: thumbnail.byteLength,
    largeBytes: large.byteLength,
  };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function assetTodo(publicRoot = resolve('public')): Promise<{
  mapped: number;
  missingFiles: string[];
  entriesWithoutAssets: string[];
}> {
  const paths = new Set<string>();
  const entriesWithoutAssets: string[] = [];
  for (const checklist of Object.values(CHECKLIST_MAP)) {
    for (const entry of checklist.entries) {
      if (!entry.assets) entriesWithoutAssets.push(`${checklist.seriesId}/${entry.id}`);
      for (const asset of Object.values(entry.assets ?? {})) paths.add(asset.path);
    }
  }
  const missingFiles: string[] = [];
  for (const path of [...paths].sort()) {
    if (!(await exists(resolve(publicRoot, path)))) missingFiles.push(path);
  }
  return { mapped: paths.size, missingFiles, entriesWithoutAssets };
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main(): Promise<void> {
  if (process.argv.includes('--process')) {
    const manifest = await processAssets(
      resolve(arg('--input') ?? 'assets-src'),
      resolve(arg('--output') ?? 'public/cards'),
    );
    console.log(`已处理 ${manifest.length} 张素材，全部为 ${CARD_WIDTH}x${CARD_HEIGHT} WebP 且不超过 120KB。`);
  }
  if (process.argv.includes('--todo')) {
    const todo = await assetTodo(resolve(arg('--public') ?? 'public'));
    console.log(`显式映射 ${todo.mapped} 个；缺少文件 ${todo.missingFiles.length} 个；未配置卡目 ${todo.entriesWithoutAssets.length} 张。`);
    for (const path of todo.missingFiles) console.log(`缺少文件: ${path}`);
    for (const entry of todo.entriesWithoutAssets.slice(0, 20)) console.log(`待配置: ${entry}`);
    if (todo.entriesWithoutAssets.length > 20) console.log(`另有 ${todo.entriesWithoutAssets.length - 20} 张未列出。`);
  }
  if (!process.argv.includes('--process') && !process.argv.includes('--todo')) {
    throw new Error('请指定 --process、--todo，或同时指定两者');
  }
}

const isMain = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href === import.meta.url
  : false;
if (isMain) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
