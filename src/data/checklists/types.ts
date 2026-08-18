export type ChecklistCategory = 'base' | 'insert' | 'auto' | 'relic' | 'auto-relic';

export interface ChecklistSource {
  name: string;
  url: string;
  kind: 'manufacturer' | 'reference';
  accessedAt: string;
  note?: string;
}

export interface ChecklistSubject {
  playerId: string;
  playerName: string;
  teamEn: string;
  teamZh?: string;
  countryEn?: string;
  countryZh?: string;
  rookie: boolean;
}

export interface CardAssetVariant {
  /** 相对 public/ 的路径；运行时会自动拼接 Vite BASE_URL。 */
  path: string;
  source: 'self-made' | 'licensed' | 'reference';
  note?: string;
}

export interface CardAssetMetadata {
  base?: CardAssetVariant;
  auto?: CardAssetVariant;
  relic?: CardAssetVariant;
  autoRelic?: CardAssetVariant;
}

export interface ChecklistEntry {
  /** 系列内稳定 ID，格式为 subset slug + 卡号。 */
  id: string;
  cardNumber: string;
  /** 双人签字等卡片会包含多个球员，而不是伪装成重复卡号。 */
  subjects: ChecklistSubject[];
  subset: string;
  category: ChecklistCategory;
  printRun?: number;
  /** 显式素材映射；特殊卡不依赖文件名猜测。 */
  assets?: CardAssetMetadata;
}

export interface SeriesChecklist {
  schemaVersion: 1;
  seriesId: string;
  productName: string;
  releaseDate?: string;
  sources: ChecklistSource[];
  entries: ChecklistEntry[];
}
