'use client';

/* eslint-disable @next/next/no-img-element -- independent preserved game bitmaps with explicit ground anchors */
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import HunterRigPreview from './HunterRigPreview';
import { HUNTER_RIG_CANVAS } from './hunterRig';
import { useHomeworldReducedMotionV77 } from './useHomeworldReducedMotionV77';
import type { SaveGame } from './types';
import {
  actWarpBay, createWarpBayState, planWarpBayPath, stepWarpBay, stepWarpBayPath,
  warpBayStations, WARP_BAY_ART_ROOT, WARP_BAY_METRICS as METRICS, WARP_BAY_ROOMS,
  type WarpBayAction, type WarpBayPoint, type WarpBayState,
} from './systems/warpModuleBay';
import styles from './WarpModuleBay.module.css';

export interface WarpModuleBayProps {
  save: Pick<SaveGame, 'appearance' | 'loadout'>;
  onExit?: () => void;
  suspended?: boolean;
}

/** The /dev owner supplies only the appearance/loadout, not a save writer.
 * Room traversal and bench observations are deliberately temporary. */
export default function WarpModuleBay({ save, onExit, suspended = false }: WarpModuleBayProps) {
  const [state, setState] = useState(createWarpBayState);
  const [notice, setNotice] = useState('Rejoins la console, puis la mémoire. Le sas relie les deux salles.');
  const [navigating, setNavigating] = useState(false);
  const [moving, setMoving] = useState(false);
  const [viewport, setViewport] = useState({ width: 1000, height: 500 });
  const sceneRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<WarpBayState>(state);
  const pathRef = useRef<WarpBayPoint[]>([]);
  const keysRef = useRef(new Set<string>());
  const reducedMotion = useHomeworldReducedMotionV77();
  const room = WARP_BAY_ROOMS[state.roomId];
  const stations = warpBayStations(state.roomId);
  const scale = Math.max(0.6, viewport.width / METRICS.width, viewport.height / METRICS.height);
  const cameraX = Math.min(0, Math.max(viewport.width - METRICS.width * scale, viewport.width / 2 - state.actor.x * scale));
  const cameraY = Math.min(0, Math.max(viewport.height - METRICS.height * scale, viewport.height * 0.84 - state.actor.y * scale));

  const publish = useCallback((next: WarpBayState) => {
    stateRef.current = next;
    setState(next);
  }, []);
  const stop = useCallback(() => {
    pathRef.current = [];
    keysRef.current.clear();
    setNavigating(false);
    setMoving(false);
  }, []);
  const approach = useCallback((point: WarpBayPoint) => {
    if (suspended) return;
    const path = planWarpBayPath(stateRef.current, point);
    pathRef.current = path;
    keysRef.current.clear();
    setNavigating(path.length > 0);
    setNotice(path.length ? 'Déplacement vers le point choisi. Confirme le poste une fois à portée.' : 'Ce point n’est pas accessible. Le passage du sas exige son ouverture.');
    sceneRef.current?.focus({ preventScroll: true });
  }, [suspended]);
  const activate = useCallback((id: WarpBayAction) => {
    if (suspended) return;
    const current = stateRef.current;
    const station = warpBayStations(current.roomId).find(s => s.id === id);
    if (!station) return;
    const reach = id === 'cross' ? 18 : METRICS.reach;
    if (Math.hypot(current.actor.x - station.point.x, current.actor.y - station.point.y) > reach) {
      approach(station.approach);
      return;
    }
    stop();
    const result = actWarpBay(current, id);
    publish(result.state);
    setNotice(result.message);
    if (result.exit) onExit?.();
    else sceneRef.current?.focus({ preventScroll: true });
  }, [approach, onExit, publish, stop, suspended]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const observer = new ResizeObserver(([entry]) => setViewport({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(scene);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (!suspended) scene.focus({ preventScroll: true });
    const held = keysRef.current;
    const active = () => !suspended && document.visibilityState === 'visible' && document.hasFocus();
    let frame = 0, before = 0, lastPublish = 0, needsPublish = false, padConnected = false, previousA = false, previousB = false;
    const clear = () => { held.clear(); pathRef.current = []; setNavigating(false); setMoving(false); before = 0; padConnected = false; };
    const keyboardDown = (event: KeyboardEvent) => {
      if (!active() || event.target !== scene) return;
      const key = event.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'z', 'q'].includes(key)) {
        event.preventDefault(); pathRef.current = []; setNavigating(false); held.add(key);
      } else if (key === 'e' && !event.repeat) {
        event.preventDefault();
        const current = stateRef.current;
        const nearby = warpBayStations(current.roomId).filter(station => Math.hypot(station.point.x - current.actor.x, station.point.y - current.actor.y) <= (station.id === 'cross' ? 18 : METRICS.reach));
        nearby.sort((a, b) => Math.hypot(a.point.x - current.actor.x, a.point.y - current.actor.y) - Math.hypot(b.point.x - current.actor.x, b.point.y - current.actor.y));
        if (nearby[0]) activate(nearby[0].id);
        else setNotice('Aucun poste à portée.');
      } else if (key === 'escape') {
        event.preventDefault(); stop(); setNotice('Trajet arrêté. Le retour reste disponible.');
      }
    };
    const keyUp = (event: KeyboardEvent) => held.delete(event.key.toLowerCase());
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (!active()) { clear(); return; }
      const seconds = before ? Math.min((now - before) / 1000, METRICS.maxFrameSeconds) : 0;
      before = now;
      const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
      const pad = Array.from(pads).find(candidate => candidate?.connected);
      let padX = 0, padY = 0;
      if (pad) {
        const a = pad.buttons[0]?.pressed === true, b = pad.buttons[1]?.pressed === true;
        if (padConnected && a && !previousA) {
          const current = stateRef.current;
          const nearby = [...warpBayStations(current.roomId)].sort((left, right) => Math.hypot(left.point.x - current.actor.x, left.point.y - current.actor.y) - Math.hypot(right.point.x - current.actor.x, right.point.y - current.actor.y))[0];
          if (nearby) activate(nearby.id);
        }
        if (padConnected && b && !previousB) stop();
        previousA = a; previousB = b; padConnected = true;
        padX = Math.abs(pad.axes[0] ?? 0) > 0.2 ? pad.axes[0] : 0;
        padY = Math.abs(pad.axes[1] ?? 0) > 0.2 ? pad.axes[1] : 0;
      } else padConnected = false;
      const dx = Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('q') || held.has('arrowleft')) + padX;
      const dy = Number(held.has('s') || held.has('arrowdown')) - Number(held.has('w') || held.has('z') || held.has('arrowup')) + padY;
      let next = stateRef.current;
      if (dx || dy) {
        pathRef.current = [];
        next = stepWarpBay(next, { x: dx, y: dy }, seconds);
      } else if (pathRef.current.length) {
        const result = stepWarpBayPath(next, pathRef.current, seconds);
        next = result.state;
        pathRef.current = result.remaining;
        if (!result.remaining.length) { setNavigating(false); setNotice('Point atteint. Choisis le poste pour confirmer son utilisation.'); }
      }
      const moved = next.walked > stateRef.current.walked;
      setMoving(moved);
      if (next !== stateRef.current) {
        stateRef.current = next;
        needsPublish = true;
      }
      if (needsPublish && (now - lastPublish >= 32 || !moved)) { setState(next); lastPublish = now; needsPublish = false; }
    };
    scene.addEventListener('keydown', keyboardDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', clear);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame); clear();
      scene.removeEventListener('keydown', keyboardDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', clear);
    };
  }, [activate, stop, suspended]);

  function groundClick(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || suspended) return;
    const rect = event.currentTarget.getBoundingClientRect();
    approach({ x: (event.clientX - rect.left - cameraX) / scale, y: (event.clientY - rect.top - cameraY) / scale });
  }
  const actorWidth = 78, actorFootY = HUNTER_RIG_CANVAS.groundY / HUNTER_RIG_CANVAS.width * actorWidth;
  return <section className={styles.root} data-warp-module-bay data-warp-room={state.roomId} data-warp-door-open={state.doorOpen}
    data-warp-actor-x={state.actor.x.toFixed(2)} data-warp-actor-y={state.actor.y.toFixed(2)} data-warp-walked={state.walked.toFixed(2)}
    data-warp-bench-tested={state.benchTested} data-warp-navigating={navigating}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>Banc d’essai Warp</p><h2>{room.label}</h2></div>
      {onExit && <button type="button" onClick={() => { stop(); onExit(); }}>Quitter le banc d’essai</button>}
    </header>
    <p className={styles.disclosure}>Deux salles à parcourir dans la session temporaire. Aucun rang, recrutement ou transit de campagne n’est accordé.</p>
    <div ref={sceneRef} className={styles.viewport} tabIndex={0} role="group" aria-label={`${room.label} : déplacement du chasseur`}
      onPointerDown={groundClick} data-warp-viewport data-warp-camera-x={cameraX.toFixed(2)} data-warp-camera-y={cameraY.toFixed(2)} data-warp-scale={scale.toFixed(4)}>
      <div className={styles.world} style={{ width: METRICS.width, height: METRICS.height, transform: `translate(${cameraX}px,${cameraY}px) scale(${scale})` }}>
        <img className={styles.background} src={WARP_BAY_ART_ROOT + room.background} alt="" draggable={false} width={1672} height={941} />
        {state.roomId === 'bay' && <>
          <img className={styles.prop} data-warp-prop="201" src={WARP_BAY_ART_ROOT + '201_module_archiviste_yautja.png'} alt="" draggable={false}
            style={{ left: 730, top: 460, height: 122, zIndex: 460 }} />
          <img className={styles.prop} data-warp-prop="203" src={WARP_BAY_ART_ROOT + '203_module_memoire_avatar.png'} alt="" draggable={false}
            style={{ left: 625, top: 460, height: 104, zIndex: 460 }} />
        </>}
        <div className={styles.airlock} style={{ left: room.doorX, top: 480 }} data-warp-prop="202" data-warp-door-state={state.doorOpen ? 'open' : 'closed'} aria-hidden="true">
          <div className={styles.shutter} data-open={state.doorOpen} />
          <img src={WARP_BAY_ART_ROOT + '202_module_sas_decontamination.png'} alt="" draggable={false} />
        </div>
        {stations.filter(station => station.id !== 'cross').map(station => <span key={station.id} className={styles.marker} aria-hidden="true"
          data-warp-station-marker={station.id} style={{ left: station.approach.x, top: station.approach.y }}>{station.id === 'door' ? 'SAS' : station.id === 'exit' ? 'SORTIE' : station.id === 'calibrate' ? 'BANC' : station.id === 'archivist' ? 'ARCHIVISTE' : station.id === 'archive' ? 'MÉMOIRE' : 'CONSOLE'}</span>)}
        <div className={styles.actor} data-warp-hunter style={{ left: state.actor.x, top: state.actor.y, zIndex: Math.round(state.actor.y) }}>
          <span className={styles.shadow} />
          <HunterRigPreview appearance={save.appearance} armorId={save.loadout.armorId} weaponIds={save.loadout.weaponIds} gearIds={save.loadout.gearIds}
            size={actorWidth} facing={state.actor.facing} phase={reducedMotion ? 0 : state.walked / 130 % 1}
            pose={!suspended && moving && !reducedMotion ? 'run' : 'idle'} speed={!suspended && moving ? METRICS.speed : 0}
            style={{ position: 'absolute', left: -actorWidth / 2, top: -actorFootY }} />
        </div>
      </div>
      {suspended && <div className={styles.veil}>Banc en pause</div>}
    </div>
    <p className={styles.help}>Sol : toucher pour marcher · Flèches / ZQSD / WASD · E / A : poste proche · Échap / B : arrêter le trajet.</p>
    <div className={styles.controls} aria-label="Postes de la salle">
      {stations.map(station => {
        const ready = Math.hypot(state.actor.x - station.point.x, state.actor.y - station.point.y) <= (station.id === 'cross' ? 18 : METRICS.reach);
        return <button type="button" key={station.id} data-warp-action={station.id} data-warp-ready={ready} disabled={suspended}
          onClick={() => activate(station.id)}>{ready ? (station.id === 'door' ? state.doorOpen ? 'Fermer le sas' : 'Ouvrir le sas' : station.label) : `Rejoindre : ${station.label}`}</button>;
      })}
      <button type="button" disabled={!navigating || suspended} onClick={stop} data-warp-stop>Arrêter</button>
    </div>
    <p className={styles.notice} role="status" aria-live="polite">{notice}</p>
  </section>;
}
