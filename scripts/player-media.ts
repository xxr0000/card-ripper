import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { PLAYERS } from '../src/data/players';
import { CHECKLIST_PLAYERS } from '../src/data/checklists';
import { PLAYER_MEDIA } from '../src/data/player-media.generated';
import { mediaKey, type PlayerMedia } from '../src/data/player-media';
import {
  processResponsiveAsset,
  PLAYER_LARGE_HEIGHT,
  PLAYER_LARGE_WIDTH,
} from './assets';

const INPUT_ROOT = resolve('assets-src/players');
const OUTPUT_ROOT = resolve('public/cards/players');
const GENERATED_DATA = resolve('src/data/player-media.generated.ts');
const STAGING_ROOT = resolve('scripts/.player-media-staging');
const ACCESS_DATE = new Date().toISOString().slice(0, 10);
let nextSearchAt = 0;
let searchDelayMs = 0;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
}

/** TheSportsDB 的正式姓名与卡池常用名不一致时，仍要求精确匹配候选姓名。 */
const SOURCE_NAME_ALIASES: Record<string, string> = {
  Rodri: 'Rodrigo Hernández',
  'Son Heung-min': 'Heung-Min Son',
  Pedri: 'Pedro González López',
  Gavi: 'Pablo Martín Páez Gavira',
  'Alejandro Grimaldo': 'Álex Grimaldo',
  'Kenan Yildiz': 'Kenan Yıldız',
};

interface SportsDbPlayer {
  idPlayer?: string;
  strPlayer?: string;
  strThumb?: string;
  strSport?: string;
  sourcePage?: string;
}

const MANUAL_SOURCES: Record<string, SportsDbPlayer> = {
  Rodri: {
    strPlayer: 'Rodri',
    strThumb: 'https://www.mancity.com/meta/media/a5rpno0p/rodri.png?width=900',
    sourcePage: 'https://www.mancity.com/players/rodrigo',
  },
};

async function playerPhotoFor(name: string): Promise<SportsDbPlayer | undefined> {
  if (MANUAL_SOURCES[name]) return MANUAL_SOURCES[name];
  const sourceName = SOURCE_NAME_ALIASES[name] ?? name;
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const delay = Math.max(0, nextSearchAt - Date.now());
    if (delay > 0) await wait(delay);
    nextSearchAt = Date.now() + searchDelayMs;
    const response = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(sourceName)}`, {
      headers: { 'User-Agent': 'CardRipperMediaPilot/1.0 (private hobby project)' },
    });
    if (response.status === 429) {
      await wait(10_000);
      continue;
    }
    if (!response.ok) throw new Error(`${name}: TheSportsDB 返回 ${response.status}`);
    const payload = await response.json() as { player?: SportsDbPlayer[] };
    const acceptedNames = new Set([mediaKey(name), mediaKey(sourceName)]);
    return payload.player?.find((player) =>
      player.strSport === 'Soccer'
      && player.strPlayer
      && acceptedNames.has(mediaKey(player.strPlayer))
      && player.strThumb,
    );
  }
  throw new Error(`${name}: TheSportsDB 持续限流`);
}

function generatedModule(media: Record<string, PlayerMedia>): string {
  return `import type { PlayerMedia } from './player-media';\n\n/** 由 scripts/player-media.ts 生成；不要手工编辑。 */\nexport const PLAYER_MEDIA: Record<string, PlayerMedia> = ${JSON.stringify(media, null, 2)};\n`;
}

async function main(): Promise<void> {
  const arg = (name: string, fallback: number) => {
    const index = process.argv.indexOf(name);
    return index === -1 ? fallback : Number(process.argv[index + 1]);
  };
  const offset = arg('--offset', 0);
  const limit = arg('--limit', 100);
  const concurrency = Math.max(1, arg('--concurrency', 8));
  searchDelayMs = Math.max(0, arg('--search-delay', 0));
  const allPlayers = [...new Map(
    [...PLAYERS, ...CHECKLIST_PLAYERS].map((player) => [mediaKey(player.name), player]),
  ).values()];
  const corePlayers = allPlayers.slice(offset, offset + limit);
  const media: Record<string, PlayerMedia> = {};
  const failures: string[] = [];
  await Promise.all([mkdir(INPUT_ROOT, { recursive: true }), mkdir(STAGING_ROOT, { recursive: true })]);

  if (process.argv.includes('--finalize')) {
    Object.assign(media, PLAYER_MEDIA);
    const batches = (await readdir(STAGING_ROOT)).filter((file) => file.endsWith('.json'));
    for (const batch of batches) Object.assign(media, JSON.parse(await readFile(resolve(STAGING_ROOT, batch), 'utf8')));
    for (const [key, entry] of Object.entries(media)) {
      const canonicalKey = mediaKey(entry.playerName);
      if (canonicalKey === key) continue;
      media[canonicalKey] ??= entry;
      delete media[key];
    }
    await writeFile(GENERATED_DATA, generatedModule(media), 'utf8');
    const covered = allPlayers.filter((player) => media[mediaKey(player.name)]).length;
    console.log(`高清图片清单完成 ${covered}/${allPlayers.length}；回退 ${allPlayers.length - covered}；大图规格 ${PLAYER_LARGE_WIDTH}x${PLAYER_LARGE_HEIGHT}。`);
    return;
  }

  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < corePlayers.length) {
      const player = corePlayers[cursor];
      cursor += 1;
      if (PLAYER_MEDIA[mediaKey(player.name)]) continue;
      const key = mediaKey(player.name);
      try {
        const sourcePlayer = await playerPhotoFor(player.name);
        if (!sourcePlayer?.strThumb || (!sourcePlayer.idPlayer && !sourcePlayer.sourcePage)) {
          throw new Error('未找到可核对的球员摄影图');
        }
        const sourceResponse = await fetch(sourcePlayer.strThumb, {
          headers: { 'User-Agent': 'CardRipperMediaPilot/1.0 (private hobby project)' },
        });
        if (!sourceResponse.ok) throw new Error(`图片下载返回 ${sourceResponse.status}`);
        const sourcePath = resolve(INPUT_ROOT, `${key}.source`);
        await writeFile(sourcePath, Buffer.from(await sourceResponse.arrayBuffer()));
        const source = await readFile(sourcePath);
        const metadata = await sharp(source).metadata();
        if (!metadata.width || !metadata.height) throw new Error('无法读取图片尺寸');
        const thumbnailPath = resolve(OUTPUT_ROOT, `${key}-sm.webp`);
        const largePath = resolve(OUTPUT_ROOT, `${key}-lg.webp`);
        await processResponsiveAsset(sourcePath, thumbnailPath, largePath);
        media[key] = {
          playerName: player.name,
          thumbnailPath: `cards/players/${key}-sm.webp`,
          largePath: `cards/players/${key}-lg.webp`,
          sourcePage: sourcePlayer.sourcePage ?? `https://www.thesportsdb.com/player/${sourcePlayer.idPlayer}`,
          accessedAt: ACCESS_DATE,
          originalWidth: metadata.width,
          originalHeight: metadata.height,
          focalPoint: { x: 0.5, y: 0.4 },
          status: 'verified',
        };
        console.log(`完成: ${player.name}`);
      } catch (error) {
        failures.push(`${player.name}: ${error instanceof Error ? error.message : String(error)}`);
        console.warn(`跳过: ${failures.at(-1)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, corePlayers.length) }, () => worker()));

  const stagingPath = resolve(STAGING_ROOT, `${offset}.json`);
  try {
    Object.assign(media, JSON.parse(await readFile(stagingPath, 'utf8')));
  } catch {
    // 首次处理该批次时没有旧的临时记录。
  }
  await writeFile(stagingPath, `${JSON.stringify(media, null, 2)}\n`, 'utf8');
  const alreadyCovered = corePlayers.filter((player) => PLAYER_MEDIA[mediaKey(player.name)]).length;
  console.log(`批次完成 ${alreadyCovered + Object.keys(media).length}/${corePlayers.length}。`);
  if (failures.length) {
    await writeFile(resolve(STAGING_ROOT, `${offset}.failures.txt`), `${failures.join('\n')}\n`, 'utf8');
  }
}

const isMain = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href === import.meta.url
  : false;
if (isMain) main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
