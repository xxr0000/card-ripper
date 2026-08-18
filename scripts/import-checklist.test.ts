import { describe, expect, it } from 'vitest';
import { importChecklist, importExpandedChecklist, parseCsv } from './import-checklist';

const options = {
  seriesId: 'prizm-epl',
  productName: '2024-25 Panini Prizm Premier League',
  releaseDate: '2025-04-30',
  sources: [
    {
      name: 'Test source',
      url: 'https://example.com/checklist',
      kind: 'reference' as const,
      accessedAt: '2026-08-17',
    },
  ],
};

describe('parseCsv', () => {
  it('解析带逗号、转义引号与 CRLF 的字段', () => {
    expect(parseCsv('cardNumber,playerName,teamEn\r\n1,"Doe, John","A ""Team"""')).toEqual([
      { cardNumber: '1', playerName: 'Doe, John', teamEn: 'A "Team"' },
    ]);
  });

  it('拒绝未闭合引号和重复表头', () => {
    expect(() => parseCsv('a,b\n"x,y')).toThrow('未闭合');
    expect(() => parseCsv('a,a\n1,2')).toThrow('不能重复');
  });
});

describe('importChecklist', () => {
  it('生成稳定 ID、默认字段并识别 RC', () => {
    const result = importChecklist(
      'cardNumber,playerName,teamEn,rookie,subset\n16,Nico O\'Reilly,Manchester City,RC,Base',
      options,
    );

    expect(result.entries).toEqual([
      {
        id: 'base-16',
        cardNumber: '16',
        subjects: [{
          playerId: 'nico-oreilly',
          playerName: "Nico O'Reilly",
          teamEn: 'Manchester City',
          rookie: true,
        }],
        subset: 'Base',
        category: 'base',
      },
    ]);
  });

  it('拒绝缺字段、非法类型和完全重复的球员', () => {
    expect(() => importChecklist('cardNumber,playerName,teamEn\n1,,Arsenal', options)).toThrow(
      '缺少 playerName',
    );
    expect(() =>
      importChecklist('cardNumber,playerName,teamEn,category\n1,A,Arsenal,unknown', options),
    ).toThrow('category 值无效');
    expect(() =>
      importChecklist('cardNumber,playerName,teamEn\n1,A,Arsenal\n1,A,Arsenal', options),
    ).toThrow('重复卡片球员');
  });

  it('将双人签字的同号两行合并成一张卡', () => {
    const result = importChecklist(
      'cardNumber,playerName,teamEn,subset,category\n1,Oscar Bobb,Manchester City,Dual Signatures,auto\n1,Rico Lewis,Manchester City,Dual Signatures,auto',
      options,
    );
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].subjects.map((subject) => subject.playerName)).toEqual([
      'Oscar Bobb', 'Rico Lewis',
    ]);
  });

  it('导入显式图片元数据并拒绝不安全路径', () => {
    const result = importChecklist(
      'cardNumber,playerName,teamEn,assetBase,assetAuto,assetSource\n9,Erling Haaland,Manchester City,cards/prizm-epl/base-9.webp,cards/prizm-epl/base-9.auto.webp,self-made',
      options,
    );
    expect(result.entries[0].assets).toEqual({
      base: { path: 'cards/prizm-epl/base-9.webp', source: 'self-made' },
      auto: { path: 'cards/prizm-epl/base-9.auto.webp', source: 'self-made' },
    });
    expect(() => importChecklist(
      'cardNumber,playerName,teamEn,assetBase\n9,Erling Haaland,Manchester City,../secret.webp',
      options,
    )).toThrow('安全的 .webp 相对路径');
  });

  it('从展开 XLSX 行中过滤正式子系列并叠加 RC', () => {
    const result = importExpandedChecklist([
      ['Set', 'Number', 'Name', 'Team', 'Print Run'],
      ['Base', 16, "Nico O'Reilly", 'Manchester City', null],
      ['Base Prizms Black', 16, "Nico O'Reilly", 'Manchester City', 1],
    ], {
      ...options,
      setCategories: { Base: 'base' },
      rookieCardNumbers: ['16'],
      allowedTeams: ['Manchester City'],
    });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].subjects[0].rookie).toBe(true);
  });

  it('报告未知球队并稳定应用可审计的姓名修订', () => {
    expect(() => importChecklist('cardNumber,playerName,teamEn\n1,A,Unknown FC', {
      ...options,
      allowedTeams: ['Manchester City'],
    })).toThrow('未知球队');
    const result = importChecklist('cardNumber,playerName,teamEn\n112,Anthony rdon,Newcastle United', {
      ...options,
      nameCorrections: { 'Anthony rdon': 'Anthony Gordon' },
    });
    expect(result.entries[0].subjects[0].playerName).toBe('Anthony Gordon');
    expect(result.entries[0].subjects[0].playerId).toBe('anthony-gordon');
  });

  it('为扩展系列隔离球员 ID，并从新秀子系列传播 RC 标记', () => {
    const result = importExpandedChecklist([
      ['Set', 'Number', 'Name', 'Team', 'Print Run'],
      ['Base', 1, 'Future Star', 'Example FC', null],
      ['Future', 'F-1', 'Future Star', 'Example FC', null],
    ], {
      ...options,
      seriesId: 'example-series',
      setCategories: { Base: 'base', Future: 'insert' },
      rookieSubsets: ['Future'],
    });

    expect(result.entries[0].subjects[0]).toMatchObject({
      playerId: 'example-series-future-star',
      rookie: true,
    });
  });
});
