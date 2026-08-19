export interface LandscapePilotSubject {
  playerId: string;
  seriesId: 'prizm-epl' | 'select-laliga' | 'obsidian' | 'topps-ucl';
  /** M11.3 只允许在来源和构图均复核后变为 enabled。 */
  status: 'pending-source';
}

const pilot = (seriesId: LandscapePilotSubject['seriesId'], playerIds: string[]) =>
  playerIds.map((playerId) => ({ playerId, seriesId, status: 'pending-source' as const }));

/** M11.3：四系列各 10 名高频主体，先固定范围再逐图引入横向摄影素材。 */
export const LANDSCAPE_PILOT_SUBJECTS: LandscapePilotSubject[] = [
  ...pilot('prizm-epl', ['haaland', 'salah', 'saka', 'palmer', 'son', 'foden', 'rice', 'isak', 'vandijk', 'mainoo']),
  ...pilot('select-laliga', ['mbappe', 'bellingham', 'vinicius', 'yamal', 'lewandowski', 'pedri', 'gavi', 'griezmann', 'alvarez', 'nicowilliams']),
  ...pilot('obsidian', ['messi', 'ronaldo', 'neymar', 'benzema', 'kante', 'kane', 'musiala', 'wirtz', 'lautaro', 'leao']),
  ...pilot('topps-ucl', ['rodri', 'saliba', 'hojlund', 'endrick', 'cubarsi', 'olise', 'kvara', 'yildiz', 'barcola', 'zaireemery']),
];

export function landscapePilotForSeries(seriesId: string) {
  return LANDSCAPE_PILOT_SUBJECTS.filter((subject) => subject.seriesId === seriesId);
}
