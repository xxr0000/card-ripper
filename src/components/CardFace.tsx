import {
  useEffect,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { PLAYER_MAP, TEAM_COLORS } from '../data/players';
import { SERIES_MAP } from '../data/series';
import { resolveLandscapePlayerMediaAsset } from '../data/card-assets';
import { effectLevel } from '../engine/rip';
import type { Player, PulledCard, Rarity, SeriesConfig } from '../types';
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

function RealCardLayer({
  url,
  largeUrl,
  alt,
  loaded,
  onLoad,
  onError,
}: {
  url: string;
  largeUrl?: string;
  alt: string;
  loaded: boolean;
  onLoad: () => void;
  onError: () => void;
}) {
  const image = (
    <img
      className={`cf-real-image ${loaded ? 'is-loaded' : ''}`}
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      onLoad={onLoad}
      onError={onError}
    />
  );
  return largeUrl ? (
    <picture>
      <source media="(min-width: 480px)" srcSet={largeUrl} />
      {image}
    </picture>
  ) : image;
}

export const CARD_FRAME_GRADES: Record<Rarity, string> = {
  base: 'base',
  shine: 'shine',
  numbered: 'numbered',
  'low-numbered': 'low-numbered',
  super: 'super',
  'one-of-one': 'one-of-one',
};

function FramedCardLayer({
  card,
  player,
  series,
  hasRealImage,
}: {
  card: PulledCard;
  player: Player;
  series: SeriesConfig;
  hasRealImage: boolean;
}) {
  const hasAuto = card.kind === 'auto' || card.kind === 'auto-relic';
  const hasRelic = card.kind === 'relic' || card.kind === 'auto-relic';

  return (
    <>
      <div className="cf-frame-header">
        <span>{series.brand}</span>
        <span>{series.year}</span>
      </div>

      <div className="cf-photo-window">
        {!hasRealImage && (
          <div className="cf-photo-fallback">
            <strong>{initialsOf(player.name)}</strong>
            <span>{player.position}</span>
          </div>
        )}
      </div>

      {card.rookie && <div className="cf-frame-rc">RC</div>}

      <div className={`cf-info-panel ${hasAuto || hasRelic ? 'has-hit' : ''}`}>
        <div className="cf-player-info">
          <div>
            <strong>{player.name}</strong>
            <span>{player.teamEn} · {player.countryEn} · {player.position}</span>
          </div>
        </div>

        {(hasAuto || hasRelic) && (
          <div className="cf-hit-panel">
            {hasRelic && (
              <div className={`cf-relic-panel ${card.relicKind === 'patch' ? 'is-patch' : ''}`}>
                <span className="cf-relic-swatch" />
                <small>{card.relicKind === 'patch' ? 'PLAYER-WORN PATCH' : 'MATCH-WORN JERSEY'}</small>
              </div>
            )}
            {hasAuto && (
              <div className="cf-autograph-panel">
                <small>CERTIFIED AUTOGRAPH</small>
                <span>{signatureText(player.name)}</span>
              </div>
            )}
          </div>
        )}

        <div className="cf-frame-footer">
          <span>{card.parallel.nameEn}</span>
          {card.serialNumber !== null && card.parallel.serialTo !== null && (
            <strong>{pad(card.serialNumber, card.parallel.serialTo)}/{card.parallel.serialTo}</strong>
          )}
        </div>
      </div>
    </>
  );
}

export function CardFace({
  card,
  size = 'md',
  interactive = false,
  motionEnabled = true,
}: {
  card: PulledCard;
  size?: 'lg' | 'md' | 'sm';
  interactive?: boolean;
  motionEnabled?: boolean;
}) {
  const player = PLAYER_MAP[card.playerId];
  const series = SERIES_MAP[card.seriesId];
  // 完整卡面扫描图不能进入新版照片窗；未复核的横图统一使用绘制回退。
  const asset = player ? resolveLandscapePlayerMediaAsset(player) : undefined;
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const assetUrl = asset?.url;
  const hasRealImage = !!assetUrl && loadedUrl === assetUrl && failedUrl !== assetUrl;

  useEffect(() => {
    setLoadedUrl(null);
    setFailedUrl(null);
  }, [assetUrl]);

  if (!player || !series) return null;

  const [c1, c2] = TEAM_COLORS[player.team] ?? ['#334155', '#0f172a'];
  const fx = effectLevel(card);

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!interactive || !motionEnabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    event.currentTarget.style.setProperty('--card-rx', `${(0.5 - y) * 10}deg`);
    event.currentTarget.style.setProperty('--card-ry', `${(x - 0.5) * 12}deg`);
    event.currentTarget.style.setProperty('--holo-x', `${x * 100}%`);
    event.currentTarget.style.setProperty('--holo-y', `${y * 100}%`);
  }

  function resetTilt(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.style.removeProperty('--card-rx');
    event.currentTarget.style.removeProperty('--card-ry');
    event.currentTarget.style.removeProperty('--holo-x');
    event.currentTarget.style.removeProperty('--holo-y');
  }

  return (
    <div
      className={`card-face theme-${series.design.theme} pstyle-${card.parallel.style} grade-${CARD_FRAME_GRADES[card.parallel.rarity]} size-${size} fx-${fx} ${hasRealImage ? 'has-real-image' : 'uses-fallback'} ${interactive && motionEnabled ? 'is-interactive' : ''}`}
      style={{
        '--t1': c1,
        '--t2': c2,
        '--acc': series.design.accent,
        '--photo-position': asset?.focalPoint
          ? `${asset.focalPoint.x * 100}% ${asset.focalPoint.y * 100}%`
          : 'center',
      } as CSSProperties}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      onPointerCancel={resetTilt}
    >
      <div className="cf-bg" />
      {assetUrl && failedUrl !== assetUrl && (
        <RealCardLayer
          url={assetUrl}
          largeUrl={'largeUrl' in asset ? asset.largeUrl : undefined}
          alt={`${player.name} ${series.nameEn}`}
          loaded={hasRealImage}
          onLoad={() => setLoadedUrl(assetUrl)}
          onError={() => setFailedUrl(assetUrl)}
        />
      )}
      <div className="cf-foil" />
      {interactive && motionEnabled && <div className="cf-interactive-holo" />}
      <div className="cf-inner">
        <FramedCardLayer
          card={card}
          player={player}
          series={series}
          hasRealImage={hasRealImage}
        />
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
