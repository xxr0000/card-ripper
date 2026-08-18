import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { effectLevel, rarityRank } from '../engine/rip';
import {
  loadExperienceSettings,
  saveExperienceSettings,
  shouldOpenFromTear,
  soundProfile,
  tearProgress,
  vibrationPattern,
  type ExperienceSettings,
  type SoundCue,
} from '../experience';
import type { PackData, PulledCard, SeriesConfig } from '../types';
import { CardBack, CardFace } from './CardFace';

const FX_LABEL: Record<number, string> = {
  2: '编号卡！',
  3: '大卡来了！',
  4: '超级大卡！！',
};

function ExperienceControls({
  settings,
  onChange,
}: {
  settings: ExperienceSettings;
  onChange: (settings: ExperienceSettings) => void;
}) {
  function toggle(key: 'sound' | 'vibration' | 'motion') {
    onChange({ ...settings, [key]: !settings[key] });
  }

  return (
    <fieldset className="experience-controls">
      <legend>拆包体验</legend>
      <button type="button" aria-pressed={settings.sound} onClick={() => toggle('sound')}>
        音效 {settings.sound ? '开' : '关'}
      </button>
      <button type="button" aria-pressed={settings.vibration} onClick={() => toggle('vibration')}>
        震动 {settings.vibration ? '开' : '关'}
      </button>
      <button type="button" aria-pressed={settings.motion} onClick={() => toggle('motion')}>
        动效 {settings.motion ? '开' : '关'}
      </button>
      <label>
        音量
        <input
          aria-label="音效音量"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={settings.volume}
          disabled={!settings.sound}
          onChange={(event) => onChange({ ...settings, volume: Number(event.target.value) })}
        />
      </label>
    </fieldset>
  );
}

function PackButton({
  pack,
  series,
  opened,
  onOpen,
}: {
  pack: PackData;
  series: SeriesConfig;
  opened: boolean;
  onOpen: (pack: PackData) => void;
}) {
  const startX = useRef<number | null>(null);
  const width = useRef(0);
  const dragged = useRef(false);
  const openedByGesture = useRef(false);
  const [progress, setProgress] = useState(0);

  function open() {
    if (opened || openedByGesture.current) return;
    openedByGesture.current = true;
    onOpen(pack);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (opened || event.button !== 0) return;
    startX.current = event.clientX;
    width.current = event.currentTarget.getBoundingClientRect().width;
    dragged.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (startX.current === null) return;
    const next = tearProgress(startX.current, event.clientX, width.current);
    setProgress(next);
    if (next > 0.05) {
      dragged.current = true;
      event.preventDefault();
    }
    if (shouldOpenFromTear(next)) open();
  }

  function resetGesture() {
    startX.current = null;
    setProgress(0);
  }

  return (
    <button
      className={`pack theme-${series.design.theme} ${opened ? 'is-opened' : ''} ${progress > 0 ? 'is-tearing' : ''}`}
      style={{ '--tear-progress': progress } as CSSProperties}
      disabled={opened}
      aria-label={opened ? `第 ${pack.index + 1} 包，已拆` : `撕开第 ${pack.index + 1} 包`}
      onClick={() => {
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        open();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={resetGesture}
      onPointerCancel={resetGesture}
    >
      <span className="pack-tear" aria-hidden="true"><span>向右撕</span></span>
      <span className="pack-brand">{series.brand}</span>
      <span className="pack-name">{series.name}</span>
      <span className="pack-no">{opened ? '已拆' : `第 ${pack.index + 1} 包`}</span>
    </button>
  );
}

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
  const [autoRipping, setAutoRipping] = useState(false);
  const [pausedCardUid, setPausedCardUid] = useState<string | null>(null);
  const [settings, setSettings] = useState(loadExperienceSettings);
  const audioContext = useRef<AudioContext | null>(null);
  const revealedUids = useRef(new Set<string>());

  const allDone = openedPacks.length === packs.length;
  const hits = useMemo(
    () => revealed.filter((card) =>
      card.kind === 'auto' || card.kind === 'relic' || card.kind === 'auto-relic' || effectLevel(card) >= 2,
    ),
    [revealed],
  );

  useEffect(() => saveExperienceSettings(settings), [settings]);
  useEffect(() => () => {
    if (audioContext.current) void audioContext.current.close();
  }, []);

  const playSound = useCallback((cue: SoundCue, level = 0) => {
    if (!settings.sound || settings.volume <= 0) return;
    const AudioContextClass = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      const context = audioContext.current ?? new AudioContextClass();
      audioContext.current = context;
      if (context.state === 'suspended') void context.resume();
      const profile = soundProfile(cue, level);
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = profile.type;
      oscillator.frequency.setValueAtTime(profile.frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(profile.endFrequency, now + profile.duration);
      gain.gain.setValueAtTime(Math.max(0.0001, settings.volume * 0.12), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + profile.duration);
    } catch {
      // Audio can be unavailable or blocked; opening cards must still work.
    }
  }, [settings.sound, settings.volume]);

  const vibrate = useCallback((level: number) => {
    if (!settings.vibration || typeof navigator.vibrate !== 'function') return;
    try {
      navigator.vibrate(vibrationPattern(level));
    } catch {
      // Unsupported devices fail silently.
    }
  }, [settings.vibration]);

  function openPack(pack: PackData) {
    playSound('pack');
    vibrate(1);
    setActive(pack);
    setRevealIdx(0);
    setFlipped(false);
    setAutoRipping(false);
    setPausedCardUid(null);
  }

  const handleCardClick = useCallback(() => {
    if (!active) return;
    const current = active.cards[revealIdx];
    if (!flipped) {
      if (revealedUids.current.has(current.uid)) return;
      revealedUids.current.add(current.uid);
      const level = effectLevel(current);
      playSound(level >= 2 ? 'hit' : 'flip', level);
      vibrate(level);
      setFlipped(true);
      setRevealed((cards) => cards.some((card) => card.uid === current.uid) ? cards : [...cards, current]);
      onCardRevealed(current);
      if (settings.motion && level >= 2) setBurst({ level, key: Date.now() });
      return;
    }
    if (revealIdx + 1 < active.cards.length) {
      setRevealIdx((index) => index + 1);
      setFlipped(false);
    } else {
      setOpenedPacks((opened) => opened.includes(active.index) ? opened : [...opened, active.index]);
      setActive(null);
      setAutoRipping(false);
      setPausedCardUid(null);
    }
  }, [active, flipped, onCardRevealed, playSound, revealIdx, settings.motion, vibrate]);

  useEffect(() => {
    if (!autoRipping || !active) return;
    const current = active.cards[revealIdx];
    if (flipped && effectLevel(current) >= 3 && pausedCardUid !== current.uid) {
      setPausedCardUid(current.uid);
      setAutoRipping(false);
      return;
    }
    const timer = window.setTimeout(handleCardClick, flipped ? 340 : 260);
    return () => window.clearTimeout(timer);
  }, [active, autoRipping, flipped, handleCardClick, pausedCardUid, revealIdx]);

  function handleManualCardClick() {
    setAutoRipping(false);
    handleCardClick();
  }

  function confirmExit() {
    if (allDone || window.confirm('这盒还没拆完，确定要离开吗？没拆的包会被放弃。')) onExit();
  }

  const rootClassName = `rip ${settings.motion ? '' : 'motion-disabled'}`;
  const controls = <ExperienceControls settings={settings} onChange={setSettings} />;

  if (allDone) {
    const sorted = [...revealed].sort((a, b) => rarityRank(b) - rarityRank(a));
    return (
      <div className={rootClassName}>
        {controls}
        <div className="rip-summary">
          <h2>拆盒完成！</h2>
          <p className="rip-summary-sub">共 {revealed.length} 张 · 命中/编号卡 {hits.length} 张</p>
          <div className="summary-grid">
            {sorted.map((card) => <CardFace key={card.uid} card={card} size="sm" />)}
          </div>
          <button className="btn btn-primary" onClick={onExit}>回到卡店</button>
        </div>
      </div>
    );
  }

  if (active) {
    const current = active.cards[revealIdx];
    const packRevealed = active.cards.slice(0, revealIdx + (flipped ? 1 : 0));
    return (
      <div className={rootClassName}>
        {controls}
        {settings.motion && burst && burst.level >= 2 && (
          <div key={burst.key} className={`burst burst-${burst.level}`}><span>{FX_LABEL[burst.level]}</span></div>
        )}
        <div className="rip-stage">
          <div className="rip-stage-head">
            <span>{series.name} · 第 {active.index + 1} 包</span>
            <span>{Math.min(revealIdx + 1, active.cards.length)} / {active.cards.length} 张</span>
          </div>
          <div
            className={`flip-card ${flipped ? 'is-flipped' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={flipped ? '下一张' : '翻开卡片'}
            onClick={handleManualCardClick}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleManualCardClick();
              }
            }}
          >
            <div className="flip-inner">
              <div className="flip-front"><CardBack size="lg" /></div>
              <div className="flip-back">
                <CardFace card={current} size="lg" interactive={flipped} motionEnabled={settings.motion} />
              </div>
            </div>
          </div>
          <p className="rip-hint">
            {autoRipping
              ? '正在自动拆包，点击暂停'
              : flipped
                ? revealIdx + 1 < active.cards.length ? '再点一下看下一张' : '点击收起这一包'
                : '点击卡片翻开'}
          </p>
          <div className="rip-controls">
            <button
              className={`btn ${autoRipping ? 'btn-ghost' : 'btn-primary'}`}
              onClick={() => setAutoRipping((running) => !running)}
            >
              {autoRipping
                ? '暂停连翻'
                : flipped && pausedCardUid === current.uid ? '看完大卡，继续连翻' : '一键拆开这一包'}
            </button>
          </div>
          {packRevealed.length > 0 && (
            <div className="rip-tray">
              {packRevealed.map((card) => <CardFace key={card.uid} card={card} size="sm" />)}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={rootClassName}>
      {controls}
      <div className="rip-packs-head">
        <h2>{series.name} · 整盒到手</h2>
        <p>已拆 {openedPacks.length} / {packs.length} 包，向右拖动撕开，也可点击或按 Enter</p>
      </div>
      <div className="packs-grid">
        {packs.map((pack) => (
          <PackButton
            key={pack.index}
            pack={pack}
            series={series}
            opened={openedPacks.includes(pack.index)}
            onOpen={openPack}
          />
        ))}
      </div>
      <button className="btn btn-ghost" onClick={confirmExit}>退出这盒</button>
    </div>
  );
}
