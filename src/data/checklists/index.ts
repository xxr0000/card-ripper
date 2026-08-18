import rawPrizmEpl from './prizm-epl.json';
import type { ChecklistEntry, ChecklistSubject, SeriesChecklist } from './types';
import type { Player } from '../../types';

export const PRIZM_EPL_CHECKLIST = rawPrizmEpl as SeriesChecklist;

export const CHECKLIST_MAP: Record<string, SeriesChecklist> = {
  [PRIZM_EPL_CHECKLIST.seriesId]: PRIZM_EPL_CHECKLIST,
};

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
