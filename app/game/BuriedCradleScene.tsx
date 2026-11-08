"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import HunterRigPreview from './HunterRigPreview';
import { HUNTER_RIG_CANVAS } from './hunterRig';
import type { DifficultyId, HunterAppearance, Loadout } from './types';
import type { GameSfxId } from './sound';
import { useMenuGamepad } from './useMenuGamepad';
import { controlActionShortcut } from './controlBindingLabels';
import { DEFAULT_CONTROL_BINDINGS, matchesControlAction, type ControlBindings } from './systems/controlBindings';
import { CRADLE_CHECKPOINT_BUDGET } from './systems/buriedCradleCampaign';
import { inspectBuriedCradleSnapshot, snapshotBuriedCradleRun, type BuriedCradleSnapshot } from './systems/buriedCradleSnapshot';
import { BURIED_CRADLE_DOORS, BURIED_CRADLE_ROOMS, CRADLE_BOSS_HEAD, buriedCradleRoom,
  createBuriedCradleRun, getBuriedCradlePlatforms, getCradleBossAttackRects, getCradleEnvironmentHazards,
  getCradleWeakPoint, stepBuriedCradle, type BuriedCradleProgress, type BuriedCradleRun, type CradleInput,
  type CradleEvent } from './systems/buriedCradle';
import art from './data/buriedCradleArt.json';
import styles from './BuriedCradleScene.module.css';

interface SpriteDefinition { src: string; width: number; height: number; bounds: number[]; name: string }
const assets: Record<string, SpriteDefinition> = art.assets;
const attackLabels = { puncture: 'Perforation', sweep: 'Balayage bas', capture: 'Capture', salvo: 'Salve acide',
  breath: 'Souffle acide', bite: 'Morsure', pulse: 'Onde au sol', whips: 'Fouets diagonaux' };

export interface BuriedCradleSceneProps {
  progress: BuriedCradleProgress;
  snapshot?: BuriedCradleSnapshot | null;
  appearance: HunterAppearance;
  loadout: Loadout;
  difficultyId?: DifficultyId;
  controlBindings?: ControlBindings;
  suspended?: boolean;
  reducedMotion?: boolean;
  highContrast?: boolean;
  onCheckpoint: (progress: BuriedCradleProgress, snapshot: BuriedCradleSnapshot) => boolean;
  onExtract: (progress: BuriedCradleProgress, snapshot: BuriedCradleSnapshot) => boolean;
  onExit: () => boolean | void;
  onSound?: (sound: GameSfxId) => void;
}
function Sprite({ id, x, y, width, height, opacity = 1, flip = false, raw = false }: {
  id: string; x: number; y: number; width: number; height: number; opacity?: number; flip?: boolean; raw?: boolean;
}) {
  const asset = assets[id];
  if (!asset) return null;
  const [left, top, right, bottom] = raw ? [0, 0, asset.width, asset.height] : asset.bounds;
  return <g opacity={opacity} transform={flip ? `translate(${x * 2 + width} 0) scale(-1 1)` : undefined}>
    <svg x={x} y={y} width={width} height={height} viewBox={`${left} ${top} ${right - left} ${bottom - top}`} preserveAspectRatio="none" overflow="hidden">
      <image href={asset.src} width={asset.width} height={asset.height} />
    </svg>
  </g>;
}
function describeEvents(events: readonly CradleEvent[], next: BuriedCradleRun): string | null {
  if (events.some(e => e.type === 'extracted')) return next.progress.crownClaimed ? 'Crête arrimée. Extraction vers ton vaisseau.' : 'Repli engagé. Tes observations sont conservées.';
  if (events.some(e => e.type === 'crown-claimed')) return 'Crête prélevée. Rejoins la balise d’extraction à droite.';
  if (events.some(e => e.type === 'boss-phase' && e.id === 'defeated')) return 'La Matriarche est neutralisée. Approche de la crête pour la prélever.';
  if (events.some(e => e.type === 'knockout')) return `Reprise à la balise ${next.progress.checkpointId}. La Matriarche vivante retrouve ses défenses.`;
  if (events.some(e => e.type === 'root-cut')) return 'Anneau racinaire sectionné. Le passage vers la lèvre du bassin est ouvert.';
  if (events.some(e => e.type === 'drainage-opened')) return 'Vanne drainée. Les nappes acides se dissipent plus vite.';
  if (events.some(e => e.type === 'shortcut-opened')) return 'Raccourci ouvert dans les deux sens.';
  if (events.some(e => e.type === 'door-locked')) return 'Passage fermé. Observe les racines et les attaches avant de poursuivre.';
  if (events.some(e => e.type === 'room-entered')) return buriedCradleRoom(next.roomId).purpose;
  return null;
}
const newKeys = () => ({ left: false, right: false, jump: false, jumpPressed: false, meleePressed: false, interactPressed: false });

/** Renderer for the existing production simulation. The host owns durable writes. */
export default function BuriedCradleScene(props: BuriedCradleSceneProps) {
  const { appearance, loadout, difficultyId = 'hunter', controlBindings = DEFAULT_CONTROL_BINDINGS,
    suspended = false, reducedMotion = false, highContrast = false } = props;
  const [frame, setFrame] = useState(() => {
    const inspected = inspectBuriedCradleSnapshot(props.snapshot, props.progress, CRADLE_CHECKPOINT_BUDGET[difficultyId]);
    if (inspected.status === 'invalid-save' || inspected.status === 'future-version') throw new RangeError('Unsupported Berceau snapshot. Keep the saved campaign.');
    return inspected.state?.run ?? createBuriedCradleRun(props.progress, CRADLE_CHECKPOINT_BUDGET[difficultyId]);
  });
  const frameRef = useRef(frame);
  const propsRef = useRef(props);
  const inputRef = useRef(newKeys());
  const keyboardRef = useRef({ left: false, right: false, jump: false });
  const padRef = useRef({ armed: false, jump: false, melee: false, interact: false, pause: false });
  const rootRef = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(true);
  const [notice, setNotice] = useState('Depuis XP-Z11, suis les balises jusqu’au bassin. Les deux détours sont facultatifs.');
  const [pending, setPending] = useState<{ progress: BuriedCradleProgress; snapshot: BuriedCradleSnapshot; extract: boolean } | null>(null);
  const pendingRef = useRef<typeof pending>(null);
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [resourceAttempt, setResourceAttempt] = useState(0);
  const [runtimeError, setRuntimeError] = useState(false);
  const checkpointRef = useRef<() => boolean>(() => true);
  const lastSavedClock = useRef(frame.clockSeconds);
  const [viewport, setViewport] = useState({ width: 1280, height: 620 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const room = buriedCradleRoom(frame.roomId);
  const sourceScene = art.scenes.find(scene => scene.id === frame.roomId)!;
  const zoom = Math.min(viewport.height / 720, Math.max(.55, viewport.width / 1280));
  const visibleWidth = viewport.width / zoom;
  const cameraX = Math.max(0, Math.min(Math.max(0, room.width - visibleWidth), frame.player.x + 36 - visibleWidth * .42));
  const blocked = suspended || paused || !focused || !!pending || !!resourceError || runtimeError || frame.extracted;
  const blockedRef = useRef(blocked);
  const weak = getCradleWeakPoint(frame);
  const hazards = getCradleEnvironmentHazards(frame);
  const boss = frame.boss;
  const inBoss = frame.roomId === '12';
  const interactionKey = controlActionShortcut('hunt.interact', controlBindings);

  useLayoutEffect(() => { propsRef.current = props; blockedRef.current = blocked; });
  const clear = useCallback(() => { inputRef.current = newKeys(); keyboardRef.current = { left: false, right: false, jump: false }; padRef.current = { armed: false, jump: false, melee: false, interact: false, pause: false }; }, []);
  const togglePause = useCallback(() => {
    clear();
    if (!blockedRef.current && !checkpointRef.current()) return;
    blockedRef.current = true;
    setPaused(value => !value);
  }, [clear]);
  useEffect(() => { if (blocked) clear(); }, [blocked, clear]);
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => {
      const box = entries[0].contentRect;
      setViewport({ width: Math.max(1, box.width), height: Math.max(1, box.height) });
    });
    observer.observe(element); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const onFocus = () => { setFocused(document.hasFocus() && document.visibilityState === 'visible'); clear(); };
    window.addEventListener('blur', onFocus); window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    rootRef.current?.focus({ preventScroll: true }); onFocus();
    return () => { window.removeEventListener('blur', onFocus); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus); clear(); };
  }, [clear]);
  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      if (propsRef.current.suspended || event.defaultPrevented || event.target instanceof Element && event.target.closest('input,textarea,select')) return;
      if (matchesControlAction('hunt.pause', event, controlBindings)) { if (!event.repeat) togglePause(); event.preventDefault(); return; }
      if (blockedRef.current) return;
      const keys = inputRef.current;
      if (matchesControlAction('hunt.moveLeft', event, controlBindings)) {
        if (!event.repeat || keyboardRef.current.left) keys.left = keyboardRef.current.left = true;
        event.preventDefault();
      }
      if (matchesControlAction('hunt.moveRight', event, controlBindings)) {
        if (!event.repeat || keyboardRef.current.right) keys.right = keyboardRef.current.right = true;
        event.preventDefault();
      }
      if (matchesControlAction('hunt.jump', event, controlBindings)) {
        if (!event.repeat || keyboardRef.current.jump) keys.jump = keyboardRef.current.jump = true;
        if (!event.repeat) keys.jumpPressed = true;
        event.preventDefault();
      }
      if (matchesControlAction('hunt.melee', event, controlBindings)) { if (!event.repeat) keys.meleePressed = true; event.preventDefault(); }
      if (matchesControlAction('hunt.interact', event, controlBindings)) { if (!event.repeat) keys.interactPressed = true; event.preventDefault(); }
    };
    const onUp = (event: KeyboardEvent) => {
      if (matchesControlAction('hunt.moveLeft', event, controlBindings)) inputRef.current.left = keyboardRef.current.left = false;
      if (matchesControlAction('hunt.moveRight', event, controlBindings)) inputRef.current.right = keyboardRef.current.right = false;
      if (matchesControlAction('hunt.jump', event, controlBindings)) inputRef.current.jump = keyboardRef.current.jump = false;
    };
    window.addEventListener('keydown', onDown); window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [clear, controlBindings, togglePause]);
  const checkpoint = useCallback((progress: BuriedCradleProgress, extract = false, run = frameRef.current) => {
    const copied = structuredClone(progress);
    let snapshot: BuriedCradleSnapshot;
    try { snapshot = snapshotBuriedCradleRun(run); }
    catch { setRuntimeError(true); blockedRef.current = true; clear(); return false; }
    const accepted = extract ? propsRef.current.onExtract(copied, snapshot) : propsRef.current.onCheckpoint(copied, snapshot);
    if (!accepted) {
      const receipt = { progress: copied, snapshot, extract }; pendingRef.current = receipt; setPending(receipt); blockedRef.current = true;
      setNotice('Enregistrement non confirmé. Le jeu reste suspendu pendant la nouvelle tentative.'); clear();
    }
    if (accepted) lastSavedClock.current = run.clockSeconds;
    return accepted;
  }, [clear]);
  useLayoutEffect(() => { checkpointRef.current = () => checkpoint(frameRef.current.progress); }, [checkpoint]);
  useEffect(() => {
    let alive = true, previous = 0, renderedAt = 0, raf = 0;
    const tick = (time: number) => {
      if (!alive) return;
      const dt = previous ? Math.min(.05, (time - previous) / 1000) : 0; previous = time;
      let pad: Gamepad | undefined;
      try { pad = Array.from(navigator.getGamepads?.() ?? []).find((candidate): candidate is Gamepad => !!candidate?.connected); }
      catch { padRef.current.armed = false; }
      if (pad) {
        const jump = !!pad.buttons[0]?.pressed, melee = !!pad.buttons[2]?.pressed,
          interact = !!pad.buttons[3]?.pressed, pause = !!pad.buttons[9]?.pressed;
        const axis = Math.abs(pad.axes[0] ?? 0) > .25 ? Math.sign(pad.axes[0]) : pad.buttons[14]?.pressed ? -1 : pad.buttons[15]?.pressed ? 1 : 0;
        const old = padRef.current;
        if (!jump && !melee && !interact && !pause && !axis) old.armed = true;
        const pauseEdge = old.armed && pause && !old.pause && !propsRef.current.suspended;
        if (pauseEdge) togglePause();
        if (!pauseEdge && old.armed && !blockedRef.current) {
          inputRef.current.left ||= axis === -1; inputRef.current.right ||= axis === 1;
          inputRef.current.jump ||= jump; inputRef.current.jumpPressed ||= jump && !old.jump;
          inputRef.current.meleePressed ||= melee && !old.melee; inputRef.current.interactPressed ||= interact && !old.interact;
        }
        padRef.current = { armed: pauseEdge ? false : old.armed, jump, melee, interact, pause };
      }
      if (!blockedRef.current && !pendingRef.current && dt > 0 && !frameRef.current.extracted) {
        const keys = inputRef.current;
        const input: CradleInput = { move: keys.left === keys.right ? 0 : keys.left ? -1 : 1,
          jumpPressed: keys.jumpPressed, jumpHeld: keys.jump, meleePressed: keys.meleePressed, interactPressed: keys.interactPressed };
        keys.jumpPressed = keys.meleePressed = keys.interactPressed = false;
        const previous = frameRef.current;
        const result = stepBuriedCradle(previous, input, dt);
        if (input.meleePressed) propsRef.current.onSound?.('slash');
        if (input.jumpPressed && previous.player.grounded) propsRef.current.onSound?.('jump');
        if (result.events.some(event => event.type === 'hurt')) propsRef.current.onSound?.('hit');
        if (result.events.some(event => event.type === 'part-cut' || event.type === 'root-cut')) propsRef.current.onSound?.('objective');
        if (result.events.some(event => event.type === 'crown-claimed')) propsRef.current.onSound?.('trophy');
        if (previous.roomId === '12' && previous.boss.stage !== result.run.boss.stage && result.run.boss.stage === 'telegraph') propsRef.current.onSound?.('enemy-alert');
        const changed = JSON.stringify(result.run.progress) !== JSON.stringify(frameRef.current.progress);
        const combatChanged = previous.boss.stage !== result.run.boss.stage || previous.boss.phase !== result.run.boss.phase ||
          previous.rootTrap.stage !== result.run.rootTrap.stage || previous.player.health !== result.run.player.health ||
          JSON.stringify(previous.boss.health) !== JSON.stringify(result.run.boss.health);
        frameRef.current = result.run;
        if (changed || combatChanged || result.run.extracted || result.run.clockSeconds - lastSavedClock.current >= 5)
          checkpoint(result.run.progress, result.run.extracted, result.run);
        const message = describeEvents(result.events, result.run); if (message) setNotice(message);
        if (time - renderedAt > 32 || result.events.length) { setFrame(result.run); renderedAt = time; }
        // Gamepad holds are sampled afresh. Keyboard holds remain in their own map.
        if (pad && padRef.current.armed) { keys.left = keyboardRef.current.left; keys.right = keyboardRef.current.right; keys.jump = keyboardRef.current.jump; }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); clear(); };
  }, [checkpoint, clear, togglePause]);
  const leave = () => {
    clear();
    if (pendingRef.current) return;
    if (runtimeError) { propsRef.current.onExit(); return; }
    if (frameRef.current.extracted || checkpoint(frameRef.current.progress)) propsRef.current.onExit();
  };
  const retry = () => {
    const receipt = pendingRef.current;
    if (!receipt) return;
    if (checkpoint(receipt.progress, receipt.extract, receipt.snapshot.run)) { pendingRef.current = null; setPending(null); setNotice('Enregistrement confirmé.'); }
  };
  const overlayOpen = paused || !!pending || !!resourceError || runtimeError || frame.extracted;
  useMenuGamepad(rootRef, overlayOpen && !suspended && focused,
    `${paused}:${!!pending}:${!!resourceError}:${frame.extracted}`, () => {
      if (paused && !pending && !resourceError && !runtimeError && !frame.extracted) togglePause();
      else if (frame.extracted) leave();
    });
  useEffect(() => {
    if (!overlayOpen || suspended) return;
    const root = rootRef.current;
    root?.querySelector<HTMLButtonElement>('[role="dialog"] button:not(:disabled)')?.focus();
    return () => { root?.focus({ preventScroll: true }); };
  }, [overlayOpen, suspended]);
  const touch = (key: 'left' | 'right' | 'jump' | 'melee' | 'interact', down: boolean) => {
    if (down && blockedRef.current) return;
    const keys = inputRef.current;
    if (key === 'left' || key === 'right' || key === 'jump') { keys[key] = down; keyboardRef.current[key] = down; }
    if (down && key === 'jump') keys.jumpPressed = true;
    if (down && key === 'melee') keys.meleePressed = true;
    if (down && key === 'interact') keys.interactPressed = true;
  };
  const bossHead = frame.progress.bossDefeated ? frame.progress.crownClaimed ? 'A042' : 'A041'
    : boss.stage === 'opening' && boss.phase === 'bulb' ? 'A039'
    : boss.attack === 'breath' ? boss.stage === 'telegraph' ? 'A037' : boss.stage === 'active' ? 'A038' : 'A006'
    : boss.attack === 'bite' ? boss.stage === 'telegraph' ? 'A002' : boss.stage === 'active' ? 'A003' : 'A004'
    : !reducedMotion && Math.floor(frame.clockSeconds * 1.3) % 2 ? 'A001' : '059';
  const actorSize = frame.player.height * HUNTER_RIG_CANVAS.width / HUNTER_RIG_CANVAS.groundY;
  const status = inBoss && !frame.progress.bossDefeated
    ? `${attackLabels[boss.attack]} · ${boss.stage === 'telegraph' ? 'préparation' : boss.stage === 'active' ? 'danger' : weak ? 'frappe la zone exposée' : 'repositionne-toi'}` : notice;
  return <section ref={rootRef} tabIndex={-1} className={styles.scene} data-buried-cradle data-room={frame.roomId}
    data-player-x={Math.round(frame.player.x)} data-player-y={Math.round(frame.player.y)} data-health={frame.player.health}
    data-boss-phase={boss.phase} data-boss-stage={boss.stage} data-clock={frame.clockSeconds.toFixed(2)}
    data-checkpoint={frame.progress.checkpointId} data-crown={frame.progress.crownClaimed} data-high-contrast={highContrast}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>XENO PRIME · LE BERCEAU ENFOUI</span><h2>{room.name}</h2></div>
      <div className={styles.vitals}><label>Vitalité <meter min={0} max={100} value={frame.player.health} /></label>
        <span>Balise {frame.progress.checkpointId} · {frame.progress.visitedRoomIds.length}/12 lieux</span></div>
      <button type="button" onClick={togglePause} aria-pressed={paused} disabled={!!pending || !!resourceError || runtimeError || frame.extracted || suspended}>{paused ? 'Reprendre' : 'Pause'}</button>
    </header>
    <div className={styles.viewport} ref={viewportRef} onErrorCapture={event => {
      const target = event.target as Element; setResourceError(target.getAttribute('href') ?? target.getAttribute('src') ?? 'Ressource du niveau');
    }}>
      <svg key={resourceAttempt} role="img" aria-label={`${room.name}. ${status}`} width="100%" height="100%"
        viewBox={`${cameraX} 0 ${visibleWidth} 720`} preserveAspectRatio="xMidYMid meet" className={styles.world}>
        <image href={assets[sourceScene.background ?? 'BG01'].src} x={cameraX * .55} y={0} width={Math.max(room.width, visibleWidth)} height={720} preserveAspectRatio="xMidYMid slice" />
        <rect x={0} y={0} width={room.width} height={720} fill="#02090d" opacity={.2} />
        {sourceScene.scenery.map((item, i) => {
          const id = frame.progress.bossDefeated ? item.after : item.id;
          if (!id) return null;
          return <Sprite key={i} id={id} x={item.x / sourceScene.width * room.width} y={item.y / sourceScene.height * 624}
            width={item.width / sourceScene.height * 624} height={item.height / sourceScene.height * 624}
            opacity={item.opacity} flip={item.flip} raw />;
        })}
        {getBuriedCradlePlatforms(frame.roomId, frame.progress).map(platform => <g key={platform.id}>
          <Sprite id={platform.id.includes('living-root') ? '044' : platform.id.includes('inert-tentacle') ? '043' : platform.material === 'root' ? '005' : '013'}
            x={platform.x} y={platform.y} width={platform.width} height={Math.max(platform.height, 38)} />
          <path d={`M${platform.x + 3},${platform.y + 1}h${platform.width - 6}`} stroke={highContrast ? '#e8ffac' : '#a1b2a7'} opacity={.5} strokeWidth={2} />
        </g>)}
        {BURIED_CRADLE_DOORS.filter(door => door.a.roomId === frame.roomId || door.b.roomId === frame.roomId).map(door => {
          const end = door.a.roomId === frame.roomId ? door.a : door.b;
          const dest = door.a === end ? door.b : door.a;
          const locked = door.requiresRootRing && !frame.progress.rootRingCut || door.shortcutId && !frame.progress.shortcutIds.includes(door.shortcutId);
          return <g key={door.id}>
            <Sprite id={locked ? '034' : '035'} x={end.feet.x - 44} y={end.feet.y - 140} width={88} height={140} opacity={.92} />
            <text x={end.feet.x} y={end.feet.y - 152} textAnchor="middle" className={styles.label}>{interactionKey} · {door.shortcutId ? 'Raccourci' : `Vers ${dest.roomId}`}</text>
          </g>;
        })}
        {['01', '07', '11'].includes(frame.roomId) && <g><Sprite id="047" x={58} y={(frame.roomId === '07' ? 312 : 624) - 92} width={35} height={92} />
          <text x={100} y={(frame.roomId === '07' ? 312 : 624) - 102} className={styles.label}>Balise {frame.roomId}{frame.progress.checkpointId === frame.roomId ? ' · active' : ' · repère'}</text></g>}
        {['01', '11', '12'].includes(frame.roomId) && <g><Sprite id="047" x={175} y={554} width={34} height={70} />
          <text x={192} y={537} textAnchor="middle" className={styles.rescue}>{interactionKey} · Repli</text></g>}
        {frame.roomId === '09' && <g><Sprite id={frame.progress.drainageOpened ? '036' : '030'} x={1340} y={480} width={136} height={144} />
          <text x={1408} y={464} textAnchor="middle" className={styles.label}>{interactionKey} · {frame.progress.drainageOpened ? 'Drainage ouvert' : 'Drainer le réservoir'}</text></g>}
        {inBoss && <>
          <Sprite id={bossHead} {...CRADLE_BOSS_HEAD} raw />
          {!frame.progress.bossDefeated && boss.phase === 'bulb' && <Sprite id="063" x={1550} y={440} width={70} height={85} />}
          {frame.progress.bossDefeated && !frame.progress.crownClaimed && <Sprite id="054" x={1620} y={570} width={72} height={54} />}
          {frame.progress.bossDefeated && <><text x={1656} y={554} textAnchor="middle" className={styles.label}>{frame.progress.crownClaimed ? 'Crête arrimée' : `${interactionKey} · Prélever`}</text>
            <Sprite id="047" x={1806} y={540} width={36} height={84} /><text x={1824} y={520} textAnchor="middle" className={styles.rescue}>{interactionKey} · Extraction</text></>}
          {!frame.progress.bossDefeated && boss.stage !== 'opening' && getCradleBossAttackRects(boss).map((area, i) => <g key={i}>
            {boss.stage === 'active' && <Sprite id={boss.attack === 'breath' ? '103' : boss.attack === 'capture' ? '091' : boss.attack === 'puncture' ? '039' : boss.attack === 'sweep' ? '038' : boss.attack === 'whips' ? '045' : '071'} {...area} />}
            <rect {...area} className={boss.stage === 'active' ? styles.activeDanger : styles.warning} />
          </g>)}
          {boss.pools.map((pool, i) => <Sprite key={i} id="065" {...pool} />)}
        </>}
        {frame.roomId === '10' && !frame.progress.rootRingCut && frame.rootTrap.stage !== 'waiting' && <g>
          <Sprite id={frame.rootTrap.stage === 'active' ? '040' : '039'} x={frame.rootTrap.targetX - 48} y={280} width={96} height={344} opacity={frame.rootTrap.stage === 'telegraph' ? .4 : 1} />
          <rect x={frame.rootTrap.targetX - 48} y={280} width={96} height={344} className={frame.rootTrap.stage === 'active' ? styles.activeDanger : styles.warning} />
        </g>}
        {hazards.filter(h => h.stage !== 'idle').map(h => <g key={h.id}>
          <Sprite id={h.id.includes('acid') ? '065' : h.id.includes('vent') ? '068' : '038'} x={h.x} y={h.y} width={h.width} height={h.height} opacity={h.stage === 'telegraph' ? .35 : 1} />
          <rect x={h.x} y={h.y} width={h.width} height={h.height} className={h.stage === 'active' ? styles.activeDanger : styles.warning} />
        </g>)}
        {weak && <g><Sprite id={weak.partId === 'bulb' ? '063' : '069'} {...weak} /><rect {...weak} className={styles.weakPoint} />
          <text x={weak.x + weak.width / 2} y={weak.y - 12} textAnchor="middle" className={styles.label}>Lames</text></g>}
        <foreignObject x={frame.player.x + frame.player.width / 2 - actorSize / 2} y={frame.player.y} width={actorSize} height={actorSize * 1.6} overflow="visible">
          <div className={styles.actor} style={{ opacity: frame.player.hurtSeconds > 0 ? .6 : 1 } as CSSProperties}>
            <HunterRigPreview appearance={appearance} armorId={loadout.armorId} weaponIds={loadout.weaponIds} gearIds={loadout.gearIds}
              size={actorSize} facing={frame.player.facing} phase={frame.clockSeconds * 7}
              pose={!frame.player.grounded ? frame.player.velocityY < 0 ? 'jump' : 'fall' : frame.player.velocityX ? 'run' : 'idle'}
              bladesExtended={frame.player.meleeSeconds > .2} trophyCarried={frame.progress.crownClaimed} label="Ton chasseur" />
          </div>
        </foreignObject>
        {frame.player.meleeSeconds > .35 && <path d={`M${frame.player.x + 36} ${frame.player.y + 48}l${frame.player.facing * 105} -18`} stroke="#e2f2cf" strokeWidth={5} />}
      </svg>
      {overlayOpen && <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Expédition suspendue" onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
        const index = controls.indexOf(document.activeElement as HTMLButtonElement);
        const next = controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length];
        if (next) { event.preventDefault(); next.focus(); }
      }}>
        <div><h3>{pending ? 'Confirmer la sauvegarde' : runtimeError ? 'Relevé de reprise incompatible' : resourceError ? 'Ressource indisponible' : frame.extracted ? 'Extraction terminée' : 'Chasse suspendue'}</h3>
          <p>{pending ? 'Tes actions restent en mémoire. Réessaie avant de poursuivre.' : runtimeError ? 'Le dernier enregistrement confirmé reste protégé. Reviens au dossier pour reprendre ce point.' : resourceError ? 'Une image du niveau n’a pas pu être chargée.' : frame.extracted ? notice : 'Le temps, les pièges et les attaques sont arrêtés. Position et combat sont enregistrés.'}</p>
          {pending ? <button onClick={retry}>Réessayer l’enregistrement</button> : resourceError ? <button onClick={() => { setResourceError(null); setResourceAttempt(value => value + 1); setNotice('Nouvelle tentative de chargement.'); }}>Réessayer</button>
            : !runtimeError && !frame.extracted && <button onClick={togglePause}>Reprendre la chasse</button>}
          <button onClick={leave} disabled={!!pending}>{runtimeError ? 'Reprendre le dernier enregistrement' : frame.extracted ? 'Rejoindre le débrief à bord' : 'Suspendre l’expédition'}</button>
        </div>
      </div>}
    </div>
    <footer className={styles.footer}>
      <p role="status">{status}</p>
      <div className={styles.controls} aria-label="Commandes tactiles">
        {(['left', 'right', 'jump', 'melee', 'interact'] as const).map(key => <button key={key} type="button"
          data-cradle-control={key} disabled={blocked}
          onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); touch(key, true); }}
          onPointerUp={() => touch(key, false)} onPointerCancel={() => touch(key, false)} onLostPointerCapture={() => touch(key, false)}
          onKeyDown={event => { if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) touch(key, true); }}
          onKeyUp={() => touch(key, false)}>
          {{ left: '←', right: '→', jump: 'Saut', melee: 'Lames', interact: 'Interagir' }[key]}</button>)}
      </div>
      <span className={styles.help}>{controlActionShortcut('hunt.moveLeft', controlBindings)}/{controlActionShortcut('hunt.moveRight', controlBindings)} · {controlActionShortcut('hunt.jump', controlBindings)} saut · {controlActionShortcut('hunt.melee', controlBindings)} lames · {interactionKey} interagir</span>
    </footer>
    <nav className={styles.route} aria-label="Lieux découverts">
      {BURIED_CRADLE_ROOMS.map(place => <span key={place.id} aria-current={place.id === frame.roomId ? 'location' : undefined}
        title={frame.progress.visitedRoomIds.includes(place.id) ? place.name : 'Lieu inconnu'}>
        {frame.progress.visitedRoomIds.includes(place.id) ? place.id : '·'}</span>)}
    </nav>
  </section>;
}
