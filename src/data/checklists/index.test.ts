import { describe, expect, it } from 'vitest';
import {
  PRIZM_EPL_AUTO_PLAYERS,
  PRIZM_EPL_BASE_PLAYERS,
  PRIZM_EPL_CHECKLIST,
  PRIZM_EPL_INSERT_PLAYERS,
} from './index';

describe('Prizm EPL checklist', () => {
  it('包含完整基础卡、插入卡和签字卡目录', () => {
    expect(PRIZM_EPL_CHECKLIST.entries.filter((entry) => entry.category === 'base')).toHaveLength(300);
    expect(PRIZM_EPL_CHECKLIST.entries.filter((entry) => entry.category === 'insert')).toHaveLength(300);
    expect(PRIZM_EPL_CHECKLIST.entries.filter((entry) => entry.category === 'auto')).toHaveLength(92);
    expect(PRIZM_EPL_CHECKLIST.entries).toHaveLength(692);
    expect(PRIZM_EPL_CHECKLIST.entries.flatMap((entry) => entry.subjects)).toHaveLength(700);
  });

  it('基础卡覆盖 20 队、300 名球员和 33 张 RC', () => {
    expect(PRIZM_EPL_BASE_PLAYERS).toHaveLength(300);
    expect(PRIZM_EPL_INSERT_PLAYERS.length).toBeGreaterThan(0);
    expect(new Set(PRIZM_EPL_BASE_PLAYERS.map((player) => player.team))).toHaveLength(20);
    expect(PRIZM_EPL_BASE_PLAYERS.filter((player) => player.rookie)).toHaveLength(33);
  });

  it('双人签字按一张卡保存多个球员，签字池与底卡池分离', () => {
    const duals = PRIZM_EPL_CHECKLIST.entries.filter(
      (entry) => entry.subset === 'Dual Signatures',
    );
    expect(duals).toHaveLength(8);
    expect(duals.every((entry) => entry.subjects.length === 2)).toBe(true);
    expect(PRIZM_EPL_AUTO_PLAYERS.length).toBeGreaterThan(0);
    expect(new Set(PRIZM_EPL_AUTO_PLAYERS.map((player) => player.id))).not.toEqual(
      new Set(PRIZM_EPL_BASE_PLAYERS.map((player) => player.id)),
    );
  });

  it('卡目 ID 唯一且来源、日期可追踪', () => {
    const ids = PRIZM_EPL_CHECKLIST.entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PRIZM_EPL_CHECKLIST.sources).toHaveLength(2);
    expect(PRIZM_EPL_CHECKLIST.sources.every((source) => source.url && source.accessedAt)).toBe(true);
  });

  it('支持显式素材元数据且保留无素材卡目', () => {
    expect(PRIZM_EPL_CHECKLIST.entries.find((entry) => entry.id === 'base-9')?.assets?.base)
      .toMatchObject({ path: 'cards/prizm-epl/base-9.webp', source: 'self-made' });
    expect(PRIZM_EPL_CHECKLIST.entries.find((entry) => entry.id === 'base-11')?.assets)
      .toBeUndefined();
  });
});
