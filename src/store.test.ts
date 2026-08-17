import { describe, expect, it } from 'vitest';
import type { PulledCard } from './types';
import { parseCollection } from './store';

const card: PulledCard = {
  uid: 'legacy-1',
  playerId: 'haaland',
  seriesId: 'prizm-epl',
  kind: 'base',
  parallel: {
    id: 'base',
    name: '底卡',
    serialTo: null,
    weight: 1,
    rarity: 'base',
    style: 'plain',
  },
  serialNumber: null,
  rookie: false,
  pulledAt: 1_700_000_000_000,
};

describe('parseCollection', () => {
  it('读取旧版数组存档', () => {
    expect(parseCollection(JSON.stringify([card]))).toEqual([card]);
  });

  it('读取当前版本存档', () => {
    expect(parseCollection(JSON.stringify({ version: 1, cards: [card] }))).toEqual([
      card,
    ]);
  });

  it('过滤损坏条目并安全处理非法 JSON', () => {
    expect(parseCollection(JSON.stringify([card, { uid: 'broken' }]))).toEqual([card]);
    expect(parseCollection('{not-json')).toEqual([]);
    expect(parseCollection(null)).toEqual([]);
  });

  it('拒绝未知版本，避免错误解释未来格式', () => {
    expect(parseCollection(JSON.stringify({ version: 99, cards: [card] }))).toEqual([]);
  });
});
