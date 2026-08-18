import { describe, expect, it } from 'vitest';
import { derivedPrintRunWeight } from '../engine/rip';
import { SERIES, SERIES_MAP } from './series';
import { SERIES_ODDS, SERIES_ODDS_MAP } from './odds';

describe('M2 odds data', () => {
  it('每个在售系列都有可追踪的赔率配置', () => {
    expect(SERIES_ODDS).toHaveLength(SERIES.length);
    for (const series of SERIES) {
      const odds = SERIES_ODDS_MAP[series.id];
      expect(odds).toBeDefined();
      expect(odds.sources.length).toBeGreaterThan(0);
      expect(odds.sources.every((source) => source.url && source.accessedAt)).toBe(true);
    }
  });

  it('所有槽位与逐包赔率都引用存在的平行', () => {
    for (const odds of SERIES_ODDS) {
      const series = SERIES_MAP[odds.seriesId];
      const baseIds = new Set(series.parallels.map((parallel) => parallel.id));
      const insertIds = new Set(series.insertParallels.map((parallel) => parallel.id));
      for (const rule of odds.boxSlots) {
        if (rule.cardKind === 'hit') continue;
        const pool = rule.cardKind === 'insert' ? insertIds : baseIds;
        expect(rule.parallelIds?.every((id) => pool.has(id))).toBe(true);
        if (rule.selection === 'estimated') expect(rule.confidence).toBe('estimated');
      }
      for (const rule of odds.packOdds) {
        const pool = rule.cardKind === 'insert' ? insertIds : baseIds;
        expect(pool.has(rule.parallelId)).toBe(true);
        expect(rule.oneInPacks).toBeGreaterThan(0);
      }
    }
  });

  it('编号槽位权重由 checklist 数量乘单卡印量推导', () => {
    const blue = SERIES_MAP['prizm-epl'].parallels.find((parallel) => parallel.id === 'blue299');
    const black = SERIES_MAP['prizm-epl'].parallels.find((parallel) => parallel.id === 'black1');
    expect(derivedPrintRunWeight(blue!, 300)).toBe(299 * 300);
    expect(derivedPrintRunWeight(black!, 300)).toBe(300);
  });

  it('Topps Hobby 使用官方 20 包配置与官方赔率锚点', () => {
    expect(SERIES_MAP['topps-ucl'].packsPerBox).toBe(20);
    const odds = SERIES_ODDS_MAP['topps-ucl'].packOdds;
    expect(odds.find((rule) => rule.parallelId === 'refractor')?.oneInPacks).toBe(3);
    expect(odds.find((rule) => rule.parallelId === 'superfractor')?.oneInPacks).toBe(25703);
    expect(odds.every((rule) => rule.confidence === 'official')).toBe(true);
  });
});
