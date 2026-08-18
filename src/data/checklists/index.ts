import rawPrizmEpl from './prizm-epl.json';
import type {
  CardAssetMetadata,
  ChecklistCategory,
  ChecklistEntry,
  ChecklistSubject,
  SeriesChecklist,
} from './types';
import type { Player } from '../../types';

/** M3 自制测试素材；正式素材仍由导入器生成 assets 字段，不修改生成 JSON。 */
const PRIZM_EPL_ASSET_OVERRIDES: Record<string, CardAssetMetadata> = {
  'base-9': {
    base: { path: 'cards/prizm-epl/base-9.webp', source: 'self-made', note: 'M3 test art' },
    auto: { path: 'cards/prizm-epl/base-9.auto.webp', source: 'self-made', note: 'M3 test art' },
    relic: { path: 'cards/prizm-epl/base-9.relic.webp', source: 'self-made', note: 'M3 test art' },
  },
  'base-10': {
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

export const CHECKLIST_MAP: Record<string, SeriesChecklist> = {
  [PRIZM_EPL_CHECKLIST.seriesId]: PRIZM_EPL_CHECKLIST,
};

export const CHECKLIST_ENTRY_MAP: Record<string, Record<string, ChecklistEntry>> =
  Object.fromEntries(
    Object.values(CHECKLIST_MAP).map((checklist) => [
      checklist.seriesId,
      Object.fromEntries(checklist.entries.map((entry) => [entry.id, entry])),
    ]),
  );

export function checklistEntriesFor(
  seriesId: string,
  playerId: string,
  category: ChecklistCategory,
): ChecklistEntry[] {
  return (CHECKLIST_MAP[seriesId]?.entries ?? []).filter(
    (entry) =>
      entry.category === category &&
      entry.subjects.some((subject) => subject.playerId === playerId),
  );
}

function subjectsFor(category: ChecklistEntry['category']): ChecklistSubject[] {
  return PRIZM_EPL_CHECKLIST.entries
    .filter((entry) => entry.category === category)
    .flatMap((entry) => entry.subjects);
}

function toPlayers(subjects: ChecklistSubject[]): Player[] {
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
      league: 'EPL',
      position: '',
      country: subject.countryEn ?? '',
      tier: 4,
      rookie: subject.rookie,
    });
  }
  return [...byId.values()];
}

/** Prizm 的底卡与签字名单独立，避免“所有底卡球员都能出签”。 */
export const PRIZM_EPL_BASE_PLAYERS = toPlayers(subjectsFor('base'));
export const PRIZM_EPL_INSERT_PLAYERS = toPlayers(subjectsFor('insert'));
export const PRIZM_EPL_AUTO_PLAYERS = toPlayers(subjectsFor('auto'));
export const PRIZM_EPL_PLAYERS = toPlayers(
  PRIZM_EPL_CHECKLIST.entries.flatMap((entry) => entry.subjects),
);
