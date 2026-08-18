import { useEffect, useMemo, useState } from 'react';
import { PLAYER_MAP } from '../data/players';
import { SERIES, SERIES_MAP } from '../data/series';
import { rarityRank } from '../engine/rip';
import type { PulledCard } from '../types';
import { CardFace } from './CardFace';

type KindFilter = 'all' | 'auto' | 'relic' | 'numbered' | 'oneofone';
const PAGE_SIZE = 48;

function matchKind(card: PulledCard, f: KindFilter): boolean {
  switch (f) {
    case 'all':
      return true;
    case 'auto':
      return card.kind === 'auto' || card.kind === 'auto-relic';
    case 'relic':
      return card.kind === 'relic' || card.kind === 'auto-relic';
    case 'numbered':
      return card.serialNumber !== null;
    case 'oneofone':
      return card.parallel.serialTo === 1;
  }
}

export function Collection({ cards }: { cards: PulledCard[] }) {
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [selected, setSelected] = useState<PulledCard | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const stats = useMemo(() => {
    return {
      total: cards.length,
      autos: cards.filter((c) => c.kind === 'auto' || c.kind === 'auto-relic').length,
      relics: cards.filter((c) => c.kind === 'relic' || c.kind === 'auto-relic').length,
      numbered: cards.filter((c) => c.serialNumber !== null).length,
      ones: cards.filter((c) => c.parallel.serialTo === 1).length,
    };
  }, [cards]);

  const shown = useMemo(() => {
    return cards
      .filter(
        (c) =>
          (seriesFilter === 'all' || c.seriesId === seriesFilter) &&
          matchKind(c, kindFilter),
      )
      .sort((a, b) => rarityRank(b) - rarityRank(a) || b.pulledAt - a.pulledAt);
  }, [cards, seriesFilter, kindFilter]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [cards, seriesFilter, kindFilter]);

  const visibleCards = shown.slice(0, visibleCount);

  const selPlayer = selected ? PLAYER_MAP[selected.playerId] : null;
  const selSeries = selected ? SERIES_MAP[selected.seriesId] : null;

  return (
    <div className="collection">
      <div className="col-stats">
        <div className="stat"><b>{stats.total}</b><span>总卡数</span></div>
        <div className="stat"><b>{stats.autos}</b><span>签名卡</span></div>
        <div className="stat"><b>{stats.relics}</b><span>物料卡</span></div>
        <div className="stat"><b>{stats.numbered}</b><span>带编卡</span></div>
        <div className="stat"><b>{stats.ones}</b><span>1/1</span></div>
      </div>

      <div className="col-filters">
        <select value={seriesFilter} onChange={(e) => setSeriesFilter(e.target.value)}>
          <option value="all">全部系列</option>
          {SERIES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.brand} {s.name}
            </option>
          ))}
        </select>
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as KindFilter)}
        >
          <option value="all">全部类型</option>
          <option value="auto">签名卡</option>
          <option value="relic">物料卡</option>
          <option value="numbered">带编卡</option>
          <option value="oneofone">1/1</option>
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="col-empty">
          {cards.length === 0 ? '还没有卡，去卡店拆一盒吧！' : '没有符合筛选的卡。'}
        </p>
      ) : (
        <div className="col-grid">
          {visibleCards.map((c) => (
            <button key={c.uid} className="col-card" onClick={() => setSelected(c)}>
              <CardFace card={c} size="sm" />
            </button>
          ))}
        </div>
      )}

      {visibleCount < shown.length && (
        <button
          className="btn btn-ghost col-load-more"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        >
          再显示 {Math.min(PAGE_SIZE, shown.length - visibleCount)} 张
          <span>（已显示 {visibleCount}/{shown.length}）</span>
        </button>
      )}

      {selected && selPlayer && selSeries && (
        <div className="modal" onClick={() => setSelected(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <CardFace card={selected} size="lg" />
            <div className="modal-info">
              <h3>{selPlayer.name}</h3>
              <p>
                {selSeries.year} {selSeries.brand} {selSeries.name} · {selected.parallel.name}
                {selected.serialNumber !== null &&
                  ` · 编号 ${selected.serialNumber}/${selected.parallel.serialTo}`}
                {selected.rookie && ' · 新秀 RC'}
              </p>
              <p className="modal-time">
                {new Date(selected.pulledAt).toLocaleString('zh-CN')} 抽出
              </p>
              <button className="btn btn-ghost" onClick={() => setSelected(null)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
