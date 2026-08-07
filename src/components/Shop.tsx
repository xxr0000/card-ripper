import type { CSSProperties } from 'react';
import { SERIES } from '../data/series';
import type { SeriesConfig } from '../types';

export function Shop({
  balance,
  onBuy,
}: {
  balance: number;
  onBuy: (series: SeriesConfig) => void;
}) {
  return (
    <div className="shop">
      <p className="shop-tip">选一盒喜欢的，用模拟余额付款，体验完整拆盒过程。</p>
      <div className="shop-grid">
        {SERIES.map((s) => {
          const affordable = balance >= s.price;
          return (
            <div
              key={s.id}
              className={`shop-box theme-${s.design.theme}`}
              style={{ '--acc': s.design.accent, '--acc2': s.design.accent2 } as CSSProperties}
            >
              <div className="box-art">
                <div className="box-art-brand">{s.brand}</div>
                <div className="box-art-name">{s.name}</div>
                <div className="box-art-year">{s.year} · HOBBY BOX</div>
              </div>
              <div className="box-info">
                <div className="box-hits">{s.hitLabel}</div>
                <p className="box-blurb">{s.blurb}</p>
                <div className="box-buy">
                  <span className="box-price">¥{s.price.toLocaleString()}</span>
                  <button
                    className="btn btn-primary"
                    disabled={!affordable}
                    onClick={() => onBuy(s)}
                  >
                    {affordable ? '购买并拆盒' : '余额不足'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
