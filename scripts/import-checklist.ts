import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import readXlsxFile from 'read-excel-file/node';
import type {
  ChecklistCategory,
  ChecklistEntry,
  ChecklistSubject,
  ChecklistSource,
  SeriesChecklist,
} from '../src/data/checklists/types';

type CsvRow = Record<string, string>;

export interface ImportOptions {
  seriesId: string;
  productName: string;
  releaseDate?: string;
  sources: ChecklistSource[];
  setCategories?: Record<string, ChecklistCategory>;
  rookieCardNumbers?: string[];
  allowedTeams?: string[];
  teamTranslations?: Record<string, string>;
  nameCorrections?: Record<string, string>;
}

const CATEGORIES = new Set<ChecklistCategory>([
  'base',
  'insert',
  'auto',
  'relic',
  'auto-relic',
]);

export function parseCsv(input: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field.trim());
      field = '';
    } else if (char === '\n') {
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (quoted) throw new Error('CSV 包含未闭合的引号');
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, '').trim());
  if (headers.some((header) => !header)) throw new Error('CSV 表头不能为空');
  if (new Set(headers).size !== headers.length) throw new Error('CSV 表头不能重复');

  return rows
    .slice(1)
    .filter((values) => values.some(Boolean))
    .map((values, rowIndex) => {
      if (values.length > headers.length) {
        throw new Error(`CSV 第 ${rowIndex + 2} 行的列数超过表头`);
      }
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    });
}

function slug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseRookie(value: string, rowNumber: number): boolean {
  const normalized = value.trim().toLowerCase();
  if (['', 'false', '0', 'no', 'n'].includes(normalized)) return false;
  if (['true', '1', 'yes', 'y', 'rc'].includes(normalized)) return true;
  throw new Error(`第 ${rowNumber} 行 rookie 值无效：${value}`);
}

function required(row: CsvRow, key: string, rowNumber: number): string {
  const value = row[key]?.trim();
  if (!value) throw new Error(`第 ${rowNumber} 行缺少 ${key}`);
  return value;
}

function importRows(rows: CsvRow[], options: ImportOptions): SeriesChecklist {
  const rookieNumbers = new Set(options.rookieCardNumbers ?? []);
  const allowedTeams = options.allowedTeams ? new Set(options.allowedTeams) : null;
  const grouped = new Map<string, ChecklistEntry>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const cardNumber = required(row, 'cardNumber', rowNumber);
    const rawPlayerName = required(row, 'playerName', rowNumber);
    const playerName = options.nameCorrections?.[rawPlayerName] ?? rawPlayerName;
    const teamEn = required(row, 'teamEn', rowNumber);
    if (allowedTeams && !allowedTeams.has(teamEn)) {
      throw new Error(`第 ${rowNumber} 行包含未知球队：${teamEn}`);
    }
    const subset = row.subset?.trim() || 'Base';
    const category = (row.category?.trim() || options.setCategories?.[subset] || 'base') as ChecklistCategory;
    if (!CATEGORIES.has(category)) {
      throw new Error(`第 ${rowNumber} 行 category 值无效：${category}`);
    }
    const playerId = row.playerId?.trim() || slug(playerName);
    if (!playerId) throw new Error(`第 ${rowNumber} 行无法生成 playerId`);
    const subsetId = slug(subset);
    if (!subsetId) throw new Error(`第 ${rowNumber} 行无法生成 subset ID`);
    const printRunText = row.printRun?.trim();
    const printRun = printRunText ? Number(printRunText) : undefined;
    if (printRun !== undefined && (!Number.isInteger(printRun) || printRun <= 0)) {
      throw new Error(`第 ${rowNumber} 行 printRun 值无效：${printRunText}`);
    }
    const teamZh = row.teamZh?.trim() || options.teamTranslations?.[teamEn];
    const subject: ChecklistSubject = {
      playerId,
      playerName,
      teamEn,
      ...(teamZh ? { teamZh } : {}),
      ...(row.countryEn?.trim() ? { countryEn: row.countryEn.trim() } : {}),
      ...(row.countryZh?.trim() ? { countryZh: row.countryZh.trim() } : {}),
      rookie: parseRookie(row.rookie ?? '', rowNumber) || (subset === 'Base' && rookieNumbers.has(cardNumber)),
    };
    const id = `${subsetId}-${cardNumber.toLowerCase()}`;
    const existing = grouped.get(id);
    if (existing) {
      if (existing.category !== category || existing.printRun !== printRun) {
        throw new Error(`重复卡片 ID 的类型或印量不一致：${id}`);
      }
      if (existing.subjects.some((item) => item.playerId === playerId)) {
        throw new Error(`重复卡片球员：${id}/${playerId}`);
      }
      existing.subjects.push(subject);
    } else {
      grouped.set(id, {
        id,
        cardNumber,
        subjects: [subject],
        subset,
        category,
        ...(printRun === undefined ? {} : { printRun }),
      });
    }
  });

  return {
    schemaVersion: 1,
    seriesId: options.seriesId,
    productName: options.productName,
    ...(options.releaseDate ? { releaseDate: options.releaseDate } : {}),
    sources: options.sources,
    entries: [...grouped.values()],
  };
}

export function importChecklist(csv: string, options: ImportOptions): SeriesChecklist {
  return importRows(parseCsv(csv), options);
}

export function importExpandedChecklist(
  values: Array<Array<string | number | boolean | Date | null>>,
  options: ImportOptions,
): SeriesChecklist {
  if (values.length === 0) throw new Error('XLSX 没有数据');
  const headers = values[0].map((value) => String(value ?? '').trim());
  const requiredHeaders = ['Set', 'Number', 'Name', 'Team', 'Print Run'];
  for (const header of requiredHeaders) {
    if (!headers.includes(header)) throw new Error(`XLSX 缺少表头：${header}`);
  }
  const column = Object.fromEntries(headers.map((header, index) => [header, index]));
  const rows: CsvRow[] = [];
  for (const valuesRow of values.slice(1)) {
    const subset = String(valuesRow[column.Set] ?? '').trim();
    if (!subset || (options.setCategories && !options.setCategories[subset])) continue;
    rows.push({
      cardNumber: String(valuesRow[column.Number] ?? '').replace(/\.0$/, '').trim(),
      playerName: String(valuesRow[column.Name] ?? '').trim(),
      teamEn: String(valuesRow[column.Team] ?? '').trim(),
      printRun: String(valuesRow[column['Print Run']] ?? '').trim(),
      subset,
      category: options.setCategories?.[subset] ?? 'base',
    });
  }
  return importRows(rows, options);
}

const PRIZM_EPL_SET_CATEGORIES: Record<string, ChecklistCategory> = {
  Base: 'base',
  Brilliance: 'insert',
  'Center Stage': 'insert',
  'Color Blast': 'insert',
  Emergent: 'insert',
  Fireworks: 'insert',
  Fractal: 'insert',
  Kaleidoscopic: 'insert',
  Manga: 'insert',
  'Prizm Flashback - 2014': 'insert',
  Prizmania: 'insert',
  Sublime: 'insert',
  Talismen: 'insert',
  'Club Legends Signatures': 'auto',
  'Dual Signatures': 'auto',
  Penmanship: 'auto',
  Signatures: 'auto',
};

const PRIZM_EPL_ROOKIES = [
  '16', '35', '65', '68', '74', '76', '82', '92', '131', '155', '177',
  '214', '217', '218', '222', '232', '243', '245', '262', '263', '264',
  '272', '273', '277', '279', '280', '281', '282', '284', '285', '287',
  '294', '300',
];

const PRIZM_EPL_TEAMS = [
  'Manchester City', 'Arsenal', 'Liverpool FC', 'Aston Villa', 'Tottenham Hotspur',
  'Chelsea FC', 'Newcastle United', 'Manchester United', 'West Ham United',
  'Crystal Palace', 'Brighton & Hove Albion', 'AFC Bournemouth', 'Fulham',
  'Wolverhampton Wanderers', 'Everton', 'Brentford', 'Nottingham Forest FC',
  'Leicester City', 'Ipswich Town FC', 'Southampton',
];

const PRIZM_EPL_TEAM_TRANSLATIONS: Record<string, string> = {
  'Manchester City': '曼城', Arsenal: '阿森纳', 'Liverpool FC': '利物浦',
  'Aston Villa': '阿斯顿维拉', 'Tottenham Hotspur': '热刺', 'Chelsea FC': '切尔西',
  'Newcastle United': '纽卡斯尔', 'Manchester United': '曼联',
  'West Ham United': '西汉姆联', 'Crystal Palace': '水晶宫',
  'Brighton & Hove Albion': '布莱顿', 'AFC Bournemouth': '伯恩茅斯', Fulham: '富勒姆',
  'Wolverhampton Wanderers': '狼队', Everton: '埃弗顿', Brentford: '布伦特福德',
  'Nottingham Forest FC': '诺丁汉森林', 'Leicester City': '莱斯特城',
  'Ipswich Town FC': '伊普斯维奇', Southampton: '南安普顿',
};

function profile(seriesId: string): Pick<ImportOptions, 'setCategories' | 'rookieCardNumbers' | 'allowedTeams' | 'teamTranslations' | 'nameCorrections'> {
  if (seriesId !== 'prizm-epl') return {};
  return {
    setCategories: PRIZM_EPL_SET_CATEGORIES,
    rookieCardNumbers: PRIZM_EPL_ROOKIES,
    allowedTeams: PRIZM_EPL_TEAMS,
    teamTranslations: PRIZM_EPL_TEAM_TRANSLATIONS,
    nameCorrections: { 'Anthony rdon': 'Anthony Gordon' },
  };
}

function arg(name: string, requiredArg = true): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (requiredArg && !value) throw new Error(`缺少参数 ${name}`);
  return value;
}

async function main(): Promise<void> {
  const input = resolve(arg('--input') as string);
  const output = resolve(arg('--output') as string);
  const sourceKind = arg('--source-kind') as ChecklistSource['kind'];
  if (!['manufacturer', 'reference'].includes(sourceKind)) {
    throw new Error('--source-kind 必须是 manufacturer 或 reference');
  }
  const seriesId = arg('--series') as string;
  const options: ImportOptions = {
    seriesId,
    productName: arg('--product') as string,
    releaseDate: arg('--release-date', false),
    sources: [
      {
        name: arg('--source-name') as string,
        url: arg('--source-url') as string,
        kind: sourceKind,
        accessedAt: arg('--accessed-at') as string,
      },
    ],
    ...profile(seriesId),
  };
  if (seriesId === 'prizm-epl') {
    options.sources[0].note = '源表中的 “Anthony rdon” 依据官方产品 PDF 与 TCDB 修订为 “Anthony Gordon”。';
    options.sources.push({
      name: 'Trading Card Database rookie gallery',
      url: 'https://www.tcdb.com/RookiesGallery.cfm/sid/481484/2024-25-Panini-Prizm-Premier-League',
      kind: 'reference',
      accessedAt: '2026-08-18',
      note: 'RC 标记交叉核对来源，共 33 张基础新秀卡。',
    });
  }
  let checklist: SeriesChecklist;
  if (extname(input).toLowerCase() === '.xlsx') {
    const workbook = await readXlsxFile(input) as unknown;
    const firstSheet = Array.isArray(workbook) ? workbook[0] : undefined;
    const values = firstSheet && typeof firstSheet === 'object' && 'data' in firstSheet
      ? (firstSheet as { data: Array<Array<string | number | boolean | Date | null>> }).data
      : workbook as Array<Array<string | number | boolean | Date | null>>;
    checklist = importExpandedChecklist(values, options);
  } else {
    checklist = importChecklist(await readFile(input, 'utf8'), options);
  }
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(checklist, null, 2)}\n`, 'utf8');
  const subjects = checklist.entries.reduce((sum, entry) => sum + entry.subjects.length, 0);
  console.log(`已导入 ${checklist.entries.length} 张卡、${subjects} 个球员记录：${output}`);
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
