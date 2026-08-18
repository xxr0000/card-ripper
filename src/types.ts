export type League =
  | 'EPL'
  | 'LaLiga'
  | 'Bundesliga'
  | 'SerieA'
  | 'Ligue1'
  | 'MLS'
  | 'Saudi';

export interface Player {
  id: string;
  name: string;
  team: string;
  league: League;
  position: string;
  country: string;
  /** 1 = 顶级巨星, 2 = 球星, 3 = 主力, 4 = 轮换 */
  tier: 1 | 2 | 3 | 4;
  rookie?: boolean;
}

/** 视觉稀有度，决定卡面特效强度 */
export type Rarity =
  | 'base'
  | 'shine' // 无编平行（银折等）
  | 'numbered' // 大编号（/99 以上）
  | 'low-numbered' // 小编号（/50 及以下）
  | 'super' // /10 及以下、案例卡
  | 'one-of-one';

export interface Parallel {
  id: string;
  name: string;
  /** null = 不带编 */
  serialTo: number | null;
  /** 仅用于同一盒槽位内的估算分配；出现频率由 odds.ts 的槽位/赔率决定。 */
  weight: number;
  rarity: Rarity;
  /** CardFace 使用的样式类名 */
  style: string;
}

export type HitType = 'auto' | 'relic' | 'auto-relic';
export type CardKind = 'base' | 'insert' | HitType;

export interface SeriesDesign {
  /** 卡面主题类名 */
  theme: string;
  accent: string;
  accent2: string;
}

export interface SeriesConfig {
  id: string;
  brand: string;
  name: string;
  year: string;
  /** 简介，显示在商店 */
  blurb: string;
  price: number;
  packsPerBox: number;
  cardsPerPack: number;
  /** 该系列收录哪些联赛的球员 */
  leagues: League[] | 'all';
  design: SeriesDesign;
  /** 普通卡位的平行池（含普通底卡） */
  parallels: Parallel[];
  /** 插卡与案例卡池 */
  insertParallels: Parallel[];
  /** 签名卡的平行池 */
  autoParallels: Parallel[];
  /** 物料卡的平行池 */
  relicParallels: Parallel[];
  /** 商店里的保底说明 */
  hitLabel: string;
}

export interface PulledCard {
  uid: string;
  playerId: string;
  seriesId: string;
  kind: CardKind;
  parallel: Parallel;
  /** 例如 23（配合 parallel.serialTo 显示 23/99） */
  serialNumber: number | null;
  /** 物料卡：球衣 or Patch */
  relicKind?: 'jersey' | 'patch';
  rookie: boolean;
  pulledAt: number;
}

export interface PackData {
  index: number;
  cards: PulledCard[];
}
