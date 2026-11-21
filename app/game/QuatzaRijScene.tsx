"use client";

/* eslint-disable @next/next/no-img-element -- world-space native sprites */
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import type { SaveGame } from './types';
import HunterRigPreview from './HunterRigPreview';
import { controlActionShortcut } from './controlBindingLabels';
import { DEFAULT_CONTROL_BINDINGS, matchesControlAction } from './systems/controlBindings';
import {
  QUATZA_FLOOR, QUATZA_INPUT, QUATZA_MODES, QUATZA_PLATFORMS, QUATZA_POSTS, QUATZA_WIDTH,
  canEnterQuatza, replayQuatzaAttempt, stepQuatza, type QuatzaAttempt, type QuatzaCommand,
  type QuatzaFrame, type QuatzaMode,
} from './systems/quatzaRij';
import styles from './QuatzaRijScene.module.css';

const BEAST = '/game/quatza-rij/poses.png';
const HIDE = '/game/quatza-rij/hide.png';
const SKULL = '/game/quatza-rij/skull.png';
const title: Record<QuatzaMode, string> = { triad: 'Le Quatza-Rij à trois', solo: 'Le Quatza-Rij solitaire' };
const controls = [
  ['left', 'hunt.moveLeft', '←'], ['right', 'hunt.moveRight', '→'], ['jump', 'hunt.jump', 'Sauter'],
  ['strike', 'hunt.melee', 'Frapper'], ['interact', 'hunt.interact', 'Interagir'], ['signal', 'hunt.scan', 'Signal'],
] as const;
type Control = typeof controls[number][0];
interface Props { save: SaveGame; onCommand(command: QuatzaCommand): boolean; suspended?: boolean }

function markers(frame: QuatzaFrame, mode: QuatzaMode) {
  const { rack, map, care, mobility, departure, refuge, trail, witness } = QUATZA_POSTS;
  if (frame.phase === 'preparation') return [
    { x: rack, label: frame.checked ? 'Lames vérifiées' : 'Vérifier les lames', current: !frame.checked },
    { x: map, label: frame.route ? 'Itinéraire reconnu' : 'Lire l’itinéraire et les règles', current: frame.checked && !frame.route },
    ...(mode === 'solo' ? [
      { x: care, label: frame.kit === 'care' ? 'Marge de soin choisie' : 'Marge de soin', current: frame.route && !frame.kit },
      { x: mobility, label: frame.kit === 'mobility' ? 'Mobilité choisie' : 'Outil de mobilité', current: frame.route && !frame.kit },
    ] : []),
    { x: departure, label: 'Départ vers le territoire', current: frame.route && (mode === 'triad' || !!frame.kit) },
  ];
  if (frame.phase === 'field') return [
    { x: refuge, label: frame.skull ? 'Extraction' : frame.kit === 'care' && frame.player.health <= 3 && !frame.player.careSpent ? 'Soin au refuge' : 'Repli', current: frame.skull },
    ...(!frame.trail ? [{ x: trail, label: 'Lire la piste', current: true }] : []),
  ];
  if (frame.phase === 'return') return [{ x: witness, label: 'Présenter la peau et le crâne', current: true }];
  return [];
}

function objective(frame: QuatzaFrame, mode: QuatzaMode): string {
  if (frame.phase === 'delivered') return 'La peau et le crâne ont été remis aux témoins.';
  if (frame.phase === 'retreated') return 'Repli consigné. Aucun trophée rapporté.';
  if (frame.phase === 'return') return 'Rejoins les témoins et présente les deux pièces rapportées.';
  if (frame.phase === 'preparation') {
    if (!frame.checked) return 'Au râtelier, vérifie les lames disponibles.';
    if (!frame.route) return 'Lis le plan du territoire et confirme les règles au poste suivant.';
    if (mode === 'solo' && !frame.kit) return 'Choisis une marge de soin au refuge ou un appui de mobilité pour atteindre les corniches plus hautes.';
    return 'Rejoins la sortie du camp.';
  }
  if (!frame.trail) return 'Suis les empreintes jusqu’au relevé.';
  if (frame.beast.stage === 'dead') {
    if (!frame.hide) return 'Approche le Quatza-Rij pour prélever la peau.';
    if (!frame.skull) return 'Prélève le crâne au même emplacement.';
    return 'Ramène les deux pièces au point d’extraction.';
  }
  if (mode === 'triad' && !frame.companions[0].contribution) return 'Appelle Saar à portée de la bête. Attends qu’il prenne position.';
  if (mode === 'triad' && !frame.companions[1].contribution) return 'Appelle Vek pour fermer le passage. Attends son ouverture.';
  if (frame.beast.stage === 'recover') return 'La bête reprend son souffle. Entre à portée des lames.';
  if (frame.beast.stage === 'warning') return 'Charge annoncée. Quitte la ligne au sol.';
  return 'Observe la course du Quatza-Rij et attends son ouverture.';
}

function poseOf(frame: QuatzaFrame): number {
  if (frame.beast.stage === 'dead') return 6;
  if (frame.beast.stage === 'warning') return 2;
  if (frame.beast.stage === 'charge') return frame.beast.remaining < 8 ? 4 : 3;
  if (frame.beast.stage === 'recover') return frame.player.cooldown > 11 ? 5 : 7;
  if (frame.beast.stage === 'stalk') return Math.floor(frame.tick / 12) % 2;
  return 0;
}

function Expedition({ save, mode, attempt, attempts, onCommand, suspended = false }: Props & {
  mode: QuatzaMode; attempt: QuatzaAttempt; attempts: number;
}) {
  const [frame, setFrame] = useState(() => replayQuatzaAttempt(mode, attempt.input));
  const [running, setRunning] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [assets, setAssets] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [assetRetry, setAssetRetry] = useState(0);
  const [width, setWidth] = useState(900);
  const groundRef = useRef<HTMLDivElement>(null);
  const expeditionRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(frame);
  const controlsRef = useRef(0);
  const buffer = useRef<number[]>([]);
  const savedTick = useRef(attempt.input.length);
  const commitRef = useRef(onCommand);
  useEffect(() => { commitRef.current = onCommand; }, [onCommand]);
  const bindings = save.settings.controlBindings ?? DEFAULT_CONTROL_BINDINGS;
  const terminal = frame.phase === 'retreated' || frame.phase === 'delivered';
  const visibleControls = controls.filter(([id]) => mode === 'triad' || id !== 'signal');

  useEffect(() => {
    let alive = true;
    void Promise.all([BEAST, HIDE, SKULL].map(async source => {
      const image = new Image();
      image.src = source;
      await image.decode();
      if (!image.naturalWidth || !image.naturalHeight || source === BEAST && (image.naturalWidth !== 1104 || image.naturalHeight !== 336))
        throw new Error('Image du Quatza-Rij incompatible');
    })).then(() => { if (alive) setAssets('ready'); }, () => { if (alive) setAssets('failed'); });
    return () => { alive = false; };
  }, [assetRetry]);

  useEffect(() => {
    const ground = groundRef.current;
    if (!ground) return;
    const observe = new ResizeObserver(([entry]) => setWidth(Math.max(1, entry.contentRect.width)));
    observe.observe(ground);
    return () => observe.disconnect();
  }, []);

  const flush = useCallback(() => {
    if (!buffer.current.length) return true;
    const input = [...buffer.current];
    if (!commitRef.current({ type: 'advance', mode, expectedAttempts: attempts, expectedTick: savedTick.current, input })) {
      setBlocked(true);
      setRunning(false);
      controlsRef.current = 0;
      return false;
    }
    savedTick.current += input.length;
    buffer.current.length = 0;
    return true;
  }, [attempts, mode]);

  const stop = useCallback(() => {
    controlsRef.current = 0;
    setRunning(false);
    flush();
  }, [flush]);

  useEffect(() => {
    if (!running) return;
    const onActivity = () => { if (document.hidden || !document.hasFocus()) stop(); };
    window.addEventListener('blur', onActivity);
    document.addEventListener('visibilitychange', onActivity);
    return () => {
      window.removeEventListener('blur', onActivity);
      document.removeEventListener('visibilitychange', onActivity);
    };
  }, [running, stop]);

  useEffect(() => {
    if (!running || suspended || blocked || assets !== 'ready') return;
    let raf = 0, previous = 0, accumulated = 0;
    const tick = (time: number) => {
      const elapsed = previous ? Math.min(45, time - previous) : 0;
      accumulated += elapsed;
      previous = time;
      let current = frameRef.current;
      while (accumulated >= 1000 / 60) {
        accumulated -= 1000 / 60;
        const code = controlsRef.current;
        const safeCode = (code & 3) === 3 ? code & ~3 : code;
        const next = stepQuatza(mode, current, safeCode);
        if (next === current) break;
        buffer.current.push(safeCode);
        frameRef.current = next;
        const significant = next.phase !== current.phase || next.checked !== current.checked || next.route !== current.route ||
          next.kit !== current.kit || next.player.health !== current.player.health || next.beast.health !== current.beast.health ||
          next.hide !== current.hide || next.skull !== current.skull || buffer.current.length >= 64;
        current = next;
        if (significant && !flush()) { setFrame(current); return; }
        if (next.phase === 'retreated' || next.phase === 'delivered') { setFrame(next); setRunning(false); return; }
      }
      setFrame(current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); controlsRef.current = 0; };
  }, [assets, blocked, flush, mode, running, suspended]);

  useEffect(() => {
    if (!running || suspended || blocked) return;
    const keyboard = (event: KeyboardEvent) => {
      if (!groundRef.current?.contains(document.activeElement)) return;
      const control = controls.find(([, action]) => matchesControlAction(action, event, bindings));
      if (!control) return;
      event.preventDefault();
      const bit = QUATZA_INPUT[control[0]];
      controlsRef.current = event.type === 'keydown' ? controlsRef.current | bit : controlsRef.current & ~bit;
    };
    window.addEventListener('keydown', keyboard);
    window.addEventListener('keyup', keyboard);
    return () => {
      window.removeEventListener('keydown', keyboard);
      window.removeEventListener('keyup', keyboard);
    };
  }, [bindings, blocked, running, suspended]);

  const touch = (event: PointerEvent<HTMLButtonElement>, id: Control) => {
    event.preventDefault();
    if (event.type === 'pointerdown') {
      event.currentTarget.setPointerCapture(event.pointerId);
      controlsRef.current |= QUATZA_INPUT[id];
    } else controlsRef.current &= ~QUATZA_INPUT[id];
  };
  const camera = Math.max(0, Math.min(QUATZA_WIDTH - width, frame.player.x - width * .42));
  const pose = poseOf(frame);
  const beastWidth = mode === 'solo' ? 325 : 282, beastHeight = beastWidth * 168 / 276;
  const heldProof = frame.hide && (frame.phase === 'field' || frame.phase === 'return');
  return <div ref={expeditionRef} data-quatza-expedition={mode}
    onBlur={event => {
      if (running && (!(event.relatedTarget instanceof Node) || !expeditionRef.current?.contains(event.relatedTarget))) stop();
    }} data-phase={frame.phase} data-tick={frame.tick} data-x={frame.player.x}
    data-y={Math.round(frame.player.y)} data-health={frame.player.health} data-beast-health={frame.beast.health}
    data-beast-state={frame.beast.stage} data-beast-x={frame.beast.x} data-kit={frame.kit ?? 'none'} data-route={frame.route}
    data-trail={frame.trail} data-hide={frame.hide} data-skull={frame.skull}
    data-saar-ready={frame.companions[0]?.contribution ?? false} data-vek-ready={frame.companions[1]?.contribution ?? false}>
    <div className={styles.heading}>
      <strong>{frame.phase === 'preparation' ? 'Préparation au camp' : frame.phase === 'field' ? 'Territoire du Quatza-Rij' :
        frame.phase === 'return' ? 'Retour aux témoins' : frame.phase === 'delivered' ? 'Retour enregistré' : 'Expédition interrompue'}</strong>
      {!terminal && (running ? <button type="button" onClick={stop}>Pause</button> :
        <button type="button" disabled={assets !== 'ready' || suspended || blocked}
          onClick={() => { setRunning(true); groundRef.current?.focus(); }}>Reprendre la chasse</button>)}
    </div>
    {blocked && <p role="alert">Sauvegarde à confirmer. <button type="button" onClick={() => { if (flush()) setBlocked(false); }}>Réessayer</button></p>}
    {assets === 'failed' && <p role="alert">Une image du Quatza-Rij est indisponible. <button type="button"
      onClick={() => { setAssets('loading'); setAssetRetry(value => value + 1); }}>Recharger les images</button></p>}
    <div className={styles.vital}><label>Vitalité <meter min={0} max={5} value={frame.player.health} /></label>
      {mode === 'triad' && frame.companions.map(member => <label key={member.id}>{member.id === 'saar' ? 'Saar' : 'Vek'} <meter min={0} max={3} value={member.health} /></label>)}
      {frame.phase === 'field' && frame.trail && <label>Quatza-Rij <meter min={0} max={mode === 'solo' ? 8 : 6} value={frame.beast.health} /></label>}
    </div>
    <div className={styles.viewport} ref={groundRef} tabIndex={0} aria-label={title[mode]}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) controlsRef.current = 0; }}>
      <div className={styles.world} style={{ transform: `translateX(${-camera}px)` }}>
        <div className={styles.land} />
        {frame.phase === 'field' && QUATZA_PLATFORMS.map(place => <span key={place.left} className={styles.platform}
          style={{ left: place.left, top: place.y, width: place.right - place.left }} />)}
        {markers(frame, mode).map(marker => <span key={marker.x} className={styles.marker} data-ready={marker.current}
          style={{ left: marker.x, top: QUATZA_FLOOR - 28 }}>{marker.label}</span>)}
        {frame.phase === 'field' && frame.trail && <>
          {(frame.beast.stage === 'warning' || frame.beast.stage === 'charge') && <span className={styles.groundWarning}
            style={{ left: frame.beast.x - (frame.beast.direction < 0 ? 236 : 20), width: 250 }} />}
          <div aria-label="Quatza-Rij" role="img" className={styles.beast} data-quatza-sprite={pose}
            style={{ left: frame.beast.x, top: QUATZA_FLOOR, width: beastWidth, height: beastHeight,
              backgroundImage: `url(${BEAST})`, backgroundSize: `${beastWidth * 4}px ${beastHeight * 2}px`,
              backgroundPosition: `${-(pose % 4) * beastWidth}px ${-Math.floor(pose / 4) * beastHeight}px`,
              transform: frame.beast.direction > 0 ? 'translate(-48%, -100%) scaleX(-1)' : undefined }} />
          {frame.beast.stage === 'dead' && !frame.skull && <img className={styles.proof} src={frame.hide ? SKULL : HIDE}
            style={{ left: frame.beast.x + 12, top: QUATZA_FLOOR }} alt={frame.hide ? 'Crâne à prélever' : 'Peau à prélever'} />}
        </>}
        {frame.companions.map(ally => <div className={styles.actor} key={ally.id} style={{ left: ally.x, top: QUATZA_FLOOR, opacity: ally.health > 0 ? 1 : .48 }}>
          <span className={styles.actorName}>{ally.id === 'saar' ? 'Saar' : 'Vek'}</span>
          <div><HunterRigPreview appearance={save.appearance} armorId={ally.id === 'saar' ? 'scout' : save.loadout.armorId}
            weaponIds={['wristblades']} gearIds={[]} size={98} label={ally.id === 'saar' ? 'Saar' : 'Vek'} /></div>
        </div>)}
        <div className={styles.actor} data-quatza-actor style={{ left: frame.player.x, top: frame.player.y }}><div>
          <HunterRigPreview appearance={save.appearance} armorId={save.loadout.armorId} weaponIds={['wristblades']} gearIds={[]}
            facing={frame.player.facing} size={108} label="Ton chasseur" pose={frame.player.vy ? 'jump' : frame.previous & 3 ? 'run' : 'idle'}
            phase={frame.tick / 8} bladesExtended={frame.player.cooldown > 12} />
        </div></div>
        {heldProof && <img className={styles.proof} data-quatza-carried src={frame.skull ? SKULL : HIDE}
          style={{ left: frame.player.x - 21, top: frame.player.y - 35 }} alt={frame.skull ? 'Peau et crâne portés' : 'Peau portée'} />}
        {frame.phase === 'delivered' && <img className={styles.proof} src={SKULL} style={{ left: QUATZA_POSTS.witness + 62, top: QUATZA_FLOOR - 28 }} alt="Crâne remis" />}
      </div>
    </div>
    <p className={styles.status} role="status">{objective(frame, mode)}</p>
    {!terminal && <div className={styles.controls} aria-label="Commandes du Quatza-Rij">
      {visibleControls.map(([id, action, label]) => <button key={id} type="button" data-quatza-control={id}
        disabled={!running || blocked || suspended} aria-label={label} onPointerDown={event => touch(event, id)}
        onPointerUp={event => touch(event, id)} onPointerCancel={event => touch(event, id)}
        onLostPointerCapture={event => touch(event, id)}>{label} · {controlActionShortcut(action, bindings)}</button>)}
    </div>}
  </div>;
}

export default function QuatzaRijScene(props: Props) {
  const { save, onCommand, suspended } = props;
  const [mode, setMode] = useState<QuatzaMode | null>(null);
  const entries = QUATZA_MODES.filter(item => save.quatzaRij?.expeditions[item] || canEnterQuatza(save, item));
  if (!entries.length) return null;
  const active = mode && entries.includes(mode) ? mode : entries[0];
  const expedition = save.quatzaRij?.expeditions[active];
  const attempts = expedition?.attempts.length ?? 0;
  const attempt = expedition?.attempts.at(-1);
  const mayStart = canEnterQuatza(save, active);
  return <section className={styles.quest} data-quatza-campaign aria-label="Campagne du Quatza-Rij">
    <h3>{title[active]}</h3>
    {entries.length > 1 && <nav className={styles.choice} aria-label="Expédition">{entries.map(item =>
      <button key={item} type="button" aria-pressed={active === item} onClick={() => setMode(item)}>{title[item]}</button>)}</nav>}
    {attempt && <Expedition key={active + '-' + attempts} {...props} mode={active} attempt={attempt} attempts={attempts} />}
    {(!attempt || attempt.phase === 'retreated') && <button type="button" data-quatza-begin={active}
      disabled={!!suspended || !mayStart}
      onClick={() => onCommand({ type: 'begin', mode: active, expectedAttempts: attempts })}>{attempt ? 'Préparer une nouvelle tentative' : 'Préparer l’expédition'}</button>}
  </section>;
}
