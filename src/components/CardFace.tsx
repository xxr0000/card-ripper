import type { CSSProperties } from 'react';
import { PLAYER_MAP, TEAM_COLORS } from '../data/players';
import { SERIES_MAP } from '../data/series';
import { effectLevel } from '../engine/rip';
import type { PulledCard } from '../types';
import './CardFace.css';

function initialsOf(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function signatureText(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

const pad = (n: number, to: number) => String(n).padStart(String(to).length, '0');

export function CardFace({
  card,
  size = 'md',
}: {
  card: PulledCard;
  size?: 'lg' | 'md' | 'sm';
}) {
  const player = PLAYER_MAP[card.playerId];
  const series = SERIES_MAP[card.seriesId];
  if (!player || !series) return null;
  const [c1, c2] = TEAM_COLORS[player.team] ?? ['#334155', '#0f172a'];
  const fx = effectLevel(card);

  return (
    <div
      className={`card-face theme-${series.design.theme} pstyle-${card.parallel.style} size-${size} fx-${fx}`}
      style={{ '--t1': c1, '--t2': c2, '--acc': series.design.accent } as CSSProperties}
    >
      <div className="cf-bg" />
      <div className="cf-foil" />
      <div className="cf-inner">
        <div className="cf-header">
          <span className="cf-brand">{series.brand}</span>
          <span className="cf-series">
            {series.year} {series.name}
          </span>
        </div>

        <div className="cf-photo">
          <svg viewBox="0 0 100 92" className="cf-jersey" aria-hidden>
            <defs>
              <linearGradient id={`jg-${card.uid}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={c1} />
                <stop offset="100%" stopColor={c2} />
              </linearGradient>
            </defs>
            <path
              d="M32 8 L14 16 L2 34 L16 44 L22 36 L22 90 L78 90 L78 36 L84 44 L98 34 L86 16 L68 8 Q60 18 50 18 Q40 18 32 8 Z"
              fill={`url(#jg-${card.uid})`}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1.5"
            />
            <path
              d="M32 8 Q40 18 50 18 Q60 18 68 8 L62 6 Q50 14 38 6 Z"
              fill="rgba(255,255,255,0.5)"
            />
          </svg>
          <div className="cf-initials">{initialsOf(player.name)}</div>
          <div className="cf-pos">{player.position}</div>
          {card.rookie && <div className="cf-rc">RC</div>}
        </div>

        {card.kind === 'relic' && (
          <div className={`cf-relic ${card.relicKind === 'patch' ? 'is-patch' : ''}`}>
            <div className="cf-relic-swatch" />
            <span>{card.relicKind === 'patch' ? 'PATCH' : 'JERSEY'}</span>
          </div>
        )}

        {(card.kind === 'auto' || card.kind === 'auto-relic') && (
          <div className="cf-signature">{signatureText(player.name)}</div>
        )}

        <div className="cf-namebar">
          <div className="cf-name">{player.name}</div>
          <div className="cf-meta">
            {player.team} · {player.country}
          </div>
        </div>

        <div className="cf-footer">
          <span className="cf-parallel">{card.parallel.name}</span>
          {card.serialNumber !== null && card.parallel.serialTo !== null && (
            <span className="cf-serial">
              {pad(card.serialNumber, card.parallel.serialTo)}/{card.parallel.serialTo}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function CardBack({ size = 'md' }: { size?: 'lg' | 'md' | 'sm' }) {
  return (
    <div className={`card-back size-${size}`}>
      <div className="cb-pattern" />
      <div className="cb-logo">
        CARD
        <br />
        RIPPER
      </div>
    </div>
  );
}
