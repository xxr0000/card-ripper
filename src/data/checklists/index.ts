import rawPrizmEpl from './prizm-epl.json';
import rawSelectLaLiga from './select-laliga.json';
import rawObsidian from './obsidian.json';
import rawToppsUcl from './topps-ucl.json';
import type {
  CardAssetMetadata,
  ChecklistCategory,
  ChecklistEntry,
  ChecklistSubject,
  SeriesChecklist,
} from './types';
import type { Player } from '../../types';

export const PRIZM_EPL_PILOT_CARD_IDS = [
  ...Array.from({ length: 10 }, (_, index) => `base-${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `base-${index + 21}`),
  ...Array.from({ length: 10 }, (_, index) => `base-${index + 41}`),
  ...Array.from({ length: 10 }, (_, index) => `base-${index + 271}`),
];

const TCDB_PILOT_ASSETS: Record<string, CardAssetMetadata> = Object.fromEntries(
  PRIZM_EPL_PILOT_CARD_IDS.map((cardId) => {
    const cardNumber = Number(cardId.slice('base-'.length));
    const tcdbImageId = 28_923_325 + cardNumber;
    return [cardId, {
      base: {
        path: `cards/prizm-epl/${cardId}.webp`,
        source: 'reference',
        note: `TCDB image ${tcdbImageId}; accessed 2026-08-18; private M4 pilot`,
      },
    }];
  }),
);

/** M3/M4 试点素材；正式素材仍由导入器生成 assets 字段，不修改生成 JSON。 */
const PRIZM_EPL_ASSET_OVERRIDES: Record<string, CardAssetMetadata> = {
  ...TCDB_PILOT_ASSETS,
  'base-9': {
    ...TCDB_PILOT_ASSETS['base-9'],
    auto: { path: 'cards/prizm-epl/base-9.auto.webp', source: 'self-made', note: 'M3 test art' },
    relic: { path: 'cards/prizm-epl/base-9.relic.webp', source: 'self-made', note: 'M3 test art' },
  },
  'base-11': {
    base: {
      path: 'cards/prizm-epl/broken.webp',
      source: 'self-made',
      note: 'M3 preview intentionally exercises the load-error fallback',
    },
  },
};

const rawChecklist = rawPrizmEpl as SeriesChecklist;
export const PRIZM_EPL_CHECKLIST: SeriesChecklist = {
  ...rawChecklist,
  entries: rawChecklist.entries.map((entry) => ({
    ...entry,
    ...(PRIZM_EPL_ASSET_OVERRIDES[entry.id]
      ? { assets: PRIZM_EPL_ASSET_OVERRIDES[entry.id] }
      : {}),
  })),
};

export const SELECT_LALIGA_CHECKLIST = rawSelectLaLiga as SeriesChecklist;
export const OBSIDIAN_CHECKLIST = rawObsidian as SeriesChecklist;
export const TOPPS_UCL_CHECKLIST = rawToppsUcl as SeriesChecklist;

export const CHECKLIST_MAP: Record<string, SeriesChecklist> = {
  [PRIZM_EPL_CHECKLIST.seriesId]: PRIZM_EPL_CHECKLIST,
  [SELECT_LALIGA_CHECKLIST.seriesId]: SELECT_LALIGA_CHECKLIST,
  [OBSIDIAN_CHECKLIST.seriesId]: OBSIDIAN_CHECKLIST,
  [TOPPS_UCL_CHECKLIST.seriesId]: TOPPS_UCL_CHECKLIST,
};

export const CHECKLIST_ENTRY_MAP: Record<string, Record<string, ChecklistEntry>> =
  Object.fromEntries(
    Object.values(CHECKLIST_MAP).map((checklist) => [
      checklist.seriesId,
      Object.fromEntries(checklist.entries.map((entry) => [entry.id, entry])),
    ]),
  );

const CHECKLIST_PLAYER_ENTRY_MAP: Record<string, Record<string, ChecklistEntry[]>> =
  Object.fromEntries(Object.values(CHECKLIST_MAP).map((checklist) => {
    const entriesByPlayer: Record<string, ChecklistEntry[]> = {};
    for (const entry of checklist.entries) {
      for (const subject of entry.subjects) {
        const key = `${entry.category}:${subject.playerId}`;
        (entriesByPlayer[key] ??= []).push(entry);
      }
    }
    return [checklist.seriesId, entriesByPlayer];
  }));

export function checklistEntriesFor(
  seriesId: string,
  playerId: string,
  category: ChecklistCategory,
): ChecklistEntry[] {
  return CHECKLIST_PLAYER_ENTRY_MAP[seriesId]?.[`${category}:${playerId}`] ?? [];
}

function subjectsFor(checklist: SeriesChecklist, category: ChecklistEntry['category']): ChecklistSubject[] {
  return checklist.entries
    .filter((entry) => entry.category === category)
    .flatMap((entry) => entry.subjects);
}

function leagueFor(seriesId: string, team: string): Player['league'] {
  if (seriesId === 'select-laliga') return 'LaLiga';
  if (['Al Nassr FC', 'Al Hilal', 'Al Ittihad'].includes(team)) return 'Saudi';
  if (['Inter Miami CF', 'United States', 'United States (WNT)'].includes(team)) return 'MLS';
  if (['Real Madrid', 'Real Madrid C.F.', 'FC Barcelona', 'Atletico de Madrid', 'Athletic Club', 'Real Betis'].includes(team)) return 'LaLiga';
  if (['FC Bayern München', 'Bayer 04 Leverkusen', 'Borussia Dortmund', 'RB Leipzig', 'Eintracht Frankfurt'].includes(team)) return 'Bundesliga';
  if (['AC Milan', 'FC Internazionale Milano', 'Juventus', 'SSC Napoli', 'AS Roma'].includes(team)) return 'SerieA';
  if (['Paris Saint-Germain', 'AS Monaco'].includes(team)) return 'Ligue1';
  return 'EPL';
}

function toPlayers(seriesId: string, subjects: ChecklistSubject[]): Player[] {
  const byId = new Map<string, Player>();
  for (const subject of subjects) {
    const existing = byId.get(subject.playerId);
    if (existing) {
      existing.rookie ||= subject.rookie;
      continue;
    }
    byId.set(subject.playerId, {
      id: subject.playerId,
      name: subject.playerName,
      team: subject.teamEn,
      teamEn: subject.teamEn,
      league: leagueFor(seriesId, subject.teamEn),
      position: '',
      country: subject.countryEn ?? '',
      countryEn: subject.countryEn ?? '',
      tier: 4,
      rookie: subject.rookie,
    });
  }
  return [...byId.values()];
}

/** Prizm 的底卡与签字名单独立，避免“所有底卡球员都能出签”。 */
export const PRIZM_EPL_BASE_PLAYERS = toPlayers('prizm-epl', subjectsFor(PRIZM_EPL_CHECKLIST, 'base'));
export const PRIZM_EPL_INSERT_PLAYERS = toPlayers('prizm-epl', subjectsFor(PRIZM_EPL_CHECKLIST, 'insert'));
export const PRIZM_EPL_AUTO_PLAYERS = toPlayers('prizm-epl', subjectsFor(PRIZM_EPL_CHECKLIST, 'auto'));
export const PRIZM_EPL_PLAYERS = toPlayers('prizm-epl',
  PRIZM_EPL_CHECKLIST.entries.flatMap((entry) => entry.subjects),
);

export interface SeriesPlayerPools {
  base: Player[];
  insert: Player[];
  auto: Player[];
  relic: Player[];
  autoRelic: Player[];
}

function playerPools(checklist: SeriesChecklist): SeriesPlayerPools {
  const pool = (category: ChecklistCategory) =>
    toPlayers(checklist.seriesId, subjectsFor(checklist, category));
  const base = pool('base');
  const insert = pool('insert');
  const auto = pool('auto');
  const relic = pool('relic');
  const autoRelic = pool('auto-relic');
  return {
    base,
    insert: insert.length > 0 ? insert : base,
    auto: auto.length > 0 ? auto : base,
    relic: relic.length > 0 ? relic : base,
    autoRelic: autoRelic.length > 0 ? autoRelic : auto.length > 0 ? auto : base,
  };
}

export const SERIES_PLAYER_POOLS: Record<string, SeriesPlayerPools> = Object.fromEntries(
  Object.values(CHECKLIST_MAP).map((checklist) => [checklist.seriesId, playerPools(checklist)]),
);

export const CHECKLIST_PLAYERS = [
  ...new Map(
    Object.values(CHECKLIST_MAP)
      .flatMap((checklist) => toPlayers(
        checklist.seriesId,
        checklist.entries.flatMap((entry) => entry.subjects),
      ))
      .map((player) => [player.id, player]),
  ).values(),
];
