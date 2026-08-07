import { useMemo, useState } from 'react';
import { effectLevel, rarityRank } from '../engine/rip';
import type { PackData, PulledCard, SeriesConfig } from '../types';
import { CardBack, CardFace } from './CardFace';

const FX_LABEL: Record<number, string> = {
  2: '编号卡！',
  3: '大卡来了！',
  4: '超级大卡！！',
};

export function RipView({
  series,
  packs,
  onCardRevealed,
  onExit,
}: {
  series: SeriesConfig;
  packs: PackData[];
  onCardRevealed: (card: PulledCard) => void;
  onExit: () => void;
}) {
  const [openedPacks, setOpenedPacks] = useState<number[]>([]);
  const [active, setActive] = useState<PackData | null>(null);
  const [revealIdx, setRevealIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState<PulledCard[]>([]);
  const [burst, setBurst] = useState<{ level: number; key: number } | null>(null);

  const allDone = openedPacks.length === packs.length;

  const hits = useMemo(
    () => revealed.filter((c) => c.kind !== 'base' || effectLevel(c) >= 2),
    [revealed],
  );

  function openPack(pack: PackData) {
    setActive(pack);
    setRevealIdx(0);
    setFlipped(false);
  }

  function handleCardClick() {
    if (!active) return;
    const current = active.cards[revealIdx];
    if (!flipped) {
      setFlipped(true);
      setRevealed((r) => [...r, current]);
      onCardRevealed(current);
      const lv = effectLevel(current);
      if (lv >= 2) setBurst({ level: lv, key: Date.now() });
      return;
    }
    if (revealIdx + 1 < active.cards.length) {
      setRevealIdx(revealIdx + 1);
      setFlipped(false);
    } else {
      setOpenedPacks((o) => [...o, active.index]);
      setActive(null);
    }
  }

  function confirmExit() {
    if (
      allDone ||
      window.confirm('这盒还没拆完，确定要离开吗？没拆的包会被放弃。')
    ) {
      onExit();
    }
  }

  // ===== 总结页 =====
  if (allDone) {
    const sorted = [...revealed].sort((a, b) => rarityRank(b) - rarityRank(a));
    return (
      <div className="rip">
        <div className="rip-summary">
          <h2>拆盒完成！</h2>
          <p className="rip-summary-sub">
            共 {revealed.length} 张 · 命中/编号卡 {hits.length} 张
          </p>
          <div className="summary-grid">
            {sorted.map((c) => (
              <CardFace key={c.uid} card={c} size="sm" />
            ))}
          </div>
          <button className="btn btn-primary" onClick={onExit}>
            回到卡店
          </button>
        </div>
      </div>
    );
  }

  // ===== 翻卡页 =====
  if (active) {
    const current = active.cards[revealIdx];
    const packRevealed = active.cards.slice(0, revealIdx + (flipped ? 1 : 0));
    return (
      <div className="rip">
        {burst && burst.level >= 2 && (
          <div key={burst.key} className={`burst burst-${burst.level}`}>
            <span>{FX_LABEL[burst.level]}</span>
          </div>
        )}
        <div className="rip-stage">
          <div className="rip-stage-head">
            <span>
              {series.name} · 第 {active.index + 1} 包
            </span>
            <span>
              {Math.min(revealIdx + 1, active.cards.length)} / {active.cards.length} 张
            </span>
          </div>
          <div
            className={`flip-card ${flipped ? 'is-flipped' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={flipped ? '下一张' : '翻开卡片'}
            onClick={handleCardClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleCardClick();
            }}
          >
            <div className="flip-inner">
              <div className="flip-front">
                <CardBack size="lg" />
              </div>
              <div className="flip-back">
                <CardFace card={current} size="lg" />
              </div>
            </div>
          </div>
          <p className="rip-hint">
            {flipped
              ? revealIdx + 1 < active.cards.length
                ? '再点一下看下一张'
                : '点击收起这一包'
              : '点击卡片翻开'}
          </p>
          {packRevealed.length > 0 && (
            <div className="rip-tray">
              {packRevealed.map((c) => (
                <CardFace key={c.uid} card={c} size="sm" />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== 选包页 =====
  return (
    <div className="rip">
      <div className="rip-packs-head">
        <h2>{series.name} · 整盒到手</h2>
        <p>
          已拆 {openedPacks.length} / {packs.length} 包，点一包撕开
        </p>
      </div>
      <div className="packs-grid">
        {packs.map((pack) => {
          const opened = openedPacks.includes(pack.index);
          return (
            <button
              key={pack.index}
              className={`pack theme-${series.design.theme} ${opened ? 'is-opened' : ''}`}
              disabled={opened}
              onClick={() => openPack(pack)}
            >
              <span className="pack-brand">{series.brand}</span>
              <span className="pack-name">{series.name}</span>
              <span className="pack-no">
                {opened ? '已拆' : `第 ${pack.index + 1} 包`}
              </span>
            </button>
          );
        })}
      </div>
      <button className="btn btn-ghost" onClick={confirmExit}>
        退出这盒
      </button>
    </div>
  );
}
