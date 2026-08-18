import type { CardKind, HitType } from '../types';

export type ProbabilityConfidence = 'official' | 'estimated';

export interface OddsSource {
  id: string;
  name: string;
  url: string;
  kind: 'manufacturer' | 'reference';
  accessedAt: string;
  note?: string;
}

export interface BoxSlotRule {
  id: string;
  count: number;
  cardKind: 'base-parallel' | 'insert' | 'hit';
  parallelIds?: string[];
  hitTypes?: HitType[];
  selection: 'fixed' | 'print-run' | 'estimated';
  confidence: ProbabilityConfidence;
  sourceId: string;
  note?: string;
}

export interface PackOddsRule {
  parallelId: string;
  oneInPacks: number;
  cardKind: Extract<CardKind, 'base' | 'insert'>;
  replaceKind?: Extract<CardKind, 'base' | 'insert'>;
  confidence: ProbabilityConfidence;
  sourceId: string;
  note?: string;
}

export interface SeriesOddsConfig {
  seriesId: string;
  productFormat: string;
  baseChecklistSize: number;
  baseParallelIds: string[];
  sources: OddsSource[];
  boxSlots: BoxSlotRule[];
  packOdds: PackOddsRule[];
  notes: string[];
}

const accessedAt = '2026-08-18';

export const SERIES_ODDS: SeriesOddsConfig[] = [
  {
    seriesId: 'prizm-epl',
    productFormat: 'Hobby',
    baseChecklistSize: 300,
    baseParallelIds: ['base'],
    sources: [
      {
        id: 'prizm-hobby-sell-sheet',
        name: 'Panini 2024-25 Prizm Premier League Hobby sell sheet',
        url: 'https://www.blowoutcards.net/images/ss/24pnprizmeplSC.pdf',
        kind: 'manufacturer',
        accessedAt,
      },
    ],
    boxSlots: [
      {
        id: 'silver', count: 4, cardKind: 'base-parallel', parallelIds: ['silver'],
        selection: 'fixed', confidence: 'official', sourceId: 'prizm-hobby-sell-sheet',
      },
      {
        id: 'other-prizms', count: 8, cardKind: 'base-parallel',
        parallelIds: ['hyper', 'ice', 'lazer', 'mojo', 'genesis', 'snakeskin', 'checker', 'purple', 'orange-hyper'],
        selection: 'estimated', confidence: 'estimated', sourceId: 'prizm-hobby-sell-sheet',
        note: 'Sell sheet only fixes the aggregate count; individual unnumbered parallel mix is not published.',
      },
      {
        id: 'numbered-prizms', count: 5, cardKind: 'base-parallel',
        parallelIds: ['blue299', 'red199', 'purple92', 'blue75', 'red49', 'white35', 'purple25', 'gold10', 'black-gold8', 'green5', 'black1'],
        selection: 'print-run', confidence: 'official', sourceId: 'prizm-hobby-sell-sheet',
        note: 'Within the numbered slot, selection is derived from checklist size × per-card print run.',
      },
      {
        id: 'inserts', count: 6, cardKind: 'insert', parallelIds: ['insert-base'],
        selection: 'fixed', confidence: 'official', sourceId: 'prizm-hobby-sell-sheet',
      },
      {
        id: 'autograph', count: 1, cardKind: 'hit', hitTypes: ['auto'],
        selection: 'estimated', confidence: 'official', sourceId: 'prizm-hobby-sell-sheet',
        note: 'The autograph is guaranteed; signer and autograph-parallel short prints are not fully published.',
      },
    ],
    packOdds: [],
    notes: ['Choice and Breakaway configurations are recorded in the M2 report but are not sold by the current shop UI.'],
  },
  {
    seriesId: 'select-laliga',
    productFormat: 'Hobby',
    baseChecklistSize: 250,
    baseParallelIds: ['terrace', 'mezzanine', 'field'],
    sources: [
      {
        id: 'select-laliga-sell-sheet',
        name: 'Panini 2024-25 Select La Liga Hobby sell sheet',
        url: 'https://www.blowoutcards.net/images/ss/24pnselectlaligaSC.pdf',
        kind: 'manufacturer',
        accessedAt,
      },
    ],
    boxSlots: [
      {
        id: 'unnumbered-parallels', count: 9, cardKind: 'base-parallel',
        parallelIds: ['silver', 'red', 'multi-color', 'blue'], selection: 'estimated',
        confidence: 'estimated', sourceId: 'select-laliga-sell-sheet',
        note: 'The aggregate count is official; the per-design mix is not published.',
      },
      {
        id: 'numbered-parallels', count: 5, cardKind: 'base-parallel',
        parallelIds: ['purple99', 'bronze59', 'orange49', 'winter30', 'tiedye25', 'white20', 'gold10', 'green5', 'black1'],
        selection: 'print-run', confidence: 'official', sourceId: 'select-laliga-sell-sheet',
      },
      {
        id: 'inserts', count: 7, cardKind: 'insert', parallelIds: ['insert-base'],
        selection: 'fixed', confidence: 'official', sourceId: 'select-laliga-sell-sheet',
      },
      {
        id: 'hits', count: 3, cardKind: 'hit', hitTypes: ['auto', 'relic', 'auto-relic'],
        selection: 'estimated', confidence: 'official', sourceId: 'select-laliga-sell-sheet',
        note: 'Three combined autograph/memorabilia cards are official; the type split is not published.',
      },
    ],
    packOdds: [
      ...['stained-glass', 'artistic-impressions', 'visionary', 'team-badges'].map((parallelId) => ({
        parallelId, oneInPacks: 144, cardKind: 'insert' as const, replaceKind: 'insert' as const,
        confidence: 'official' as const, sourceId: 'select-laliga-sell-sheet',
        note: 'Each named limited insert averages one per 12-box case (12 packs per box).',
      })),
    ],
    notes: [],
  },
  {
    seriesId: 'obsidian',
    productFormat: 'Hobby',
    baseChecklistSize: 107,
    baseParallelIds: ['base145'],
    sources: [
      {
        id: 'obsidian-checklist-reference',
        name: 'Beckett 2024-25 Panini Obsidian Soccer checklist and box info',
        url: 'https://www.beckett.com/news/2024-25-panini-obsidian-soccer-cards/',
        kind: 'reference',
        accessedAt,
        note: 'Panini did not publish pack odds; box collation and print runs are transcribed from the product checklist.',
      },
    ],
    boxSlots: [
      {
        id: 'base-parallel', count: 1, cardKind: 'base-parallel',
        parallelIds: ['red44', 'orange40', 'purple30', 'jade26', 'blue20', 'gold10', 'contra9', 'green5', 'blue1'],
        selection: 'print-run', confidence: 'estimated', sourceId: 'obsidian-checklist-reference',
      },
      {
        id: 'insert', count: 1, cardKind: 'insert', parallelIds: ['insert-base'],
        selection: 'fixed', confidence: 'official', sourceId: 'obsidian-checklist-reference',
      },
      {
        id: 'hits', count: 4, cardKind: 'hit', hitTypes: ['auto', 'relic', 'auto-relic'],
        selection: 'estimated', confidence: 'official', sourceId: 'obsidian-checklist-reference',
        note: 'Four combined autograph/memorabilia cards are official; the type split is not published.',
      },
    ],
    packOdds: [],
    notes: ['No manufacturer pack-odds table is public; derived parallel mix is explicitly estimated.'],
  },
  {
    seriesId: 'topps-ucl',
    productFormat: 'Hobby',
    baseChecklistSize: 200,
    baseParallelIds: ['base'],
    sources: [
      {
        id: 'topps-chrome-product',
        name: 'Topps 2024-25 Chrome UEFA Club Competitions Hobby product page',
        url: 'https://www.topps.com/products/2025-25-topps-chrome%C2%AE-uefa-club-competitions-hobby-box',
        kind: 'manufacturer',
        accessedAt,
      },
      {
        id: 'topps-chrome-odds',
        name: 'Topps 2024-25 Chrome UEFA Club Competitions official odds',
        url: 'https://cdn.shopify.com/s/files/1/0662/9749/5709/files/2024_25ToppsChromeUCCOdds.pdf?v=1744648857',
        kind: 'manufacturer',
        accessedAt,
      },
    ],
    boxSlots: [
      {
        id: 'autograph', count: 1, cardKind: 'hit', hitTypes: ['auto'],
        selection: 'estimated', confidence: 'official', sourceId: 'topps-chrome-product',
        note: 'One Chrome autograph is guaranteed; the simplified UI combines autograph subsets.',
      },
    ],
    packOdds: [
      ['refractor', 3], ['violet299', 59], ['pink250', 70], ['aqua199', 94],
      ['blue150', 121], ['green99', 187], ['magenta75', 242], ['gold50', 370],
      ['orange25', 807], ['black10', 1974], ['red5', 4224], ['superfractor', 25703],
    ].map(([parallelId, oneInPacks]) => ({
      parallelId: parallelId as string,
      oneInPacks: oneInPacks as number,
      cardKind: 'base' as const,
      confidence: 'official' as const,
      sourceId: 'topps-chrome-odds',
    })),
    notes: ['Hobby configuration corrected from 24 to the official 20 packs per box.'],
  },
];

export const SERIES_ODDS_MAP: Record<string, SeriesOddsConfig> = Object.fromEntries(
  SERIES_ODDS.map((config) => [config.seriesId, config]),
);
