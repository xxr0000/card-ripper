import { useEffect, useState } from 'react';
import './App.css';
import { Collection } from './components/Collection';
import { RipView } from './components/RipView';
import { Shop } from './components/Shop';
import { ripBox } from './engine/rip';
import {
  loadBalance,
  loadCollection,
  RECHARGE_AMOUNT,
  saveBalance,
  saveCollection,
} from './store';
import type { PackData, PulledCard, SeriesConfig } from './types';
import { CardFace } from './components/CardFace';
import { PLAYERS } from './data/players';
import { SERIES } from './data/series';

type View = 'shop' | 'rip' | 'collection';

/** 开发用：?preview 一次性渲染各系列/各稀有度卡面 */
function PreviewGallery() {
  const samples: PulledCard[] = [];
  for (const s of SERIES) {
    const pool = PLAYERS.filter(
      (p) => s.leagues === 'all' || (s.leagues as string[]).includes(p.league),
    );
    const star = pool.find((p) => p.tier === 1) ?? pool[0];
    const rookie = pool.find((p) => p.rookie) ?? pool[1];
    s.parallels.forEach((parallel, i) => {
      const player = i % 2 === 0 ? star : rookie;
      samples.push({
        uid: `pv-${s.id}-${parallel.id}`,
        playerId: player.id,
        seriesId: s.id,
        kind: 'base',
        parallel,
        serialNumber: parallel.serialTo ? Math.ceil(parallel.serialTo / 2) : null,
        rookie: !!player.rookie && player === rookie,
        pulledAt: Date.now(),
      });
    });
    samples.push({
      uid: `pv-${s.id}-auto`,
      playerId: star.id,
      seriesId: s.id,
      kind: 'auto',
      parallel: s.autoParallels[0],
      serialNumber: s.autoParallels[0].serialTo ? 5 : null,
      rookie: false,
      pulledAt: Date.now(),
    });
    samples.push({
      uid: `pv-${s.id}-relic`,
      playerId: star.id,
      seriesId: s.id,
      kind: 'relic',
      parallel: s.relicParallels[1],
      serialNumber: s.relicParallels[1].serialTo ? 5 : null,
      relicKind: 'patch',
      rookie: false,
      pulledAt: Date.now(),
    });
  }
  const prizm = SERIES[0];
  const m3Samples: Array<{ label: string; card: PulledCard }> = [
    {
      label: '同底图 · Base',
      card: {
        uid: 'm3-base', playerId: 'erling-haaland', seriesId: 'prizm-epl', cardId: 'base-9',
        kind: 'base', parallel: prizm.parallels[0], serialNumber: null, rookie: false, pulledAt: 0,
      },
    },
    {
      label: '同底图 · Silver 平行',
      card: {
        uid: 'm3-silver', playerId: 'erling-haaland', seriesId: 'prizm-epl', cardId: 'base-9',
        kind: 'base', parallel: prizm.parallels[1], serialNumber: null, rookie: false, pulledAt: 0,
      },
    },
    {
      label: '签名专图 + 叠加签名',
      card: {
        uid: 'm3-auto', playerId: 'erling-haaland', seriesId: 'prizm-epl', cardId: 'base-9',
        kind: 'auto', parallel: prizm.autoParallels[1], serialNumber: 23, rookie: false, pulledAt: 0,
      },
    },
    {
      label: '物料专图 + 叠加物料',
      card: {
        uid: 'm3-relic', playerId: 'erling-haaland', seriesId: 'prizm-epl', cardId: 'base-9',
        kind: 'relic', parallel: prizm.relicParallels[1], serialNumber: 8,
        relicKind: 'patch', rookie: false, pulledAt: 0,
      },
    },
    {
      label: '缺少元数据 · 绘制回退',
      card: {
        uid: 'm3-missing', playerId: 'jack-grealish', seriesId: 'prizm-epl', cardId: 'base-11',
        kind: 'base', parallel: prizm.parallels[0], serialNumber: null, rookie: false, pulledAt: 0,
      },
    },
    {
      label: '错误 URL · 加载失败回退',
      card: {
        uid: 'm3-broken', playerId: 'rico-lewis', seriesId: 'prizm-epl', cardId: 'base-10',
        kind: 'base', parallel: prizm.parallels[0], serialNumber: null, rookie: true, pulledAt: 0,
      },
    },
  ];
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ color: '#fff' }}>M3 真实图 / 回退验收</h1>
      <div data-preview-section="m3" style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
        {m3Samples.map(({ label, card }) => (
          <figure key={card.uid} style={{ margin: 0, color: '#cbd5e1', textAlign: 'center' }}>
            <CardFace card={card} size="sm" />
            <figcaption style={{ width: 148, marginTop: 6, fontSize: 12 }}>{label}</figcaption>
          </figure>
        ))}
      </div>
      <h2 style={{ color: '#fff', marginTop: 32 }}>全系列绘制卡面回归</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {samples.map((c) => (
          <CardFace key={c.uid} card={c} size="sm" />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>('shop');
  const [balance, setBalance] = useState(loadBalance);
  const [collection, setCollection] = useState<PulledCard[]>(loadCollection);
  const [currentBox, setCurrentBox] = useState<{
    series: SeriesConfig;
    packs: PackData[];
  } | null>(null);

  useEffect(() => saveBalance(balance), [balance]);
  useEffect(() => saveCollection(collection), [collection]);

  if (new URLSearchParams(window.location.search).has('preview')) {
    return <PreviewGallery />;
  }

  function buyBox(series: SeriesConfig) {
    if (balance < series.price) return;
    setBalance((b) => b - series.price);
    setCurrentBox({ series, packs: ripBox(series) });
    setView('rip');
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <span className="app-logo">⚽</span>
          <span>球星卡模拟拆卡器</span>
        </div>
        <nav className="app-nav">
          <button
            className={view === 'shop' ? 'is-active' : ''}
            onClick={() => setView('shop')}
          >
            卡店
          </button>
          <button
            className={view === 'collection' ? 'is-active' : ''}
            onClick={() => setView('collection')}
          >
            收藏册
          </button>
        </nav>
        <div className="wallet">
          <span className="wallet-balance">¥{balance.toLocaleString()}</span>
          <button
            className="btn btn-small"
            onClick={() => setBalance((b) => b + RECHARGE_AMOUNT)}
          >
            +充值
          </button>
        </div>
      </header>

      <main className="app-main">
        {view === 'shop' && <Shop balance={balance} onBuy={buyBox} />}
        {view === 'rip' && currentBox && (
          <RipView
            series={currentBox.series}
            packs={currentBox.packs}
            onCardRevealed={(card) => setCollection((c) => [...c, card])}
            onExit={() => {
              setCurrentBox(null);
              setView('shop');
            }}
          />
        )}
        {view === 'collection' && <Collection cards={collection} />}
      </main>

      <footer className="app-footer">模拟娱乐用途 · 卡面为程序生成的致敬设计</footer>
    </div>
  );
}
