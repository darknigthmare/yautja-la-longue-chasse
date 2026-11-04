"use client";

/* eslint-disable @next/next/no-img-element -- independent game bitmaps keep their authored alpha and foot anchors */
import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import HunterRigPreview from './HunterRigPreview';
import { HUNTER_RIG_CANVAS } from './hunterRig';
import { SHIP_LEVEL_ART } from './shipInteriorKit';
import { SHIP_LEVEL_ART_V22 } from './shipInteriorV22';
import clanPropManifest from '../../public/game/clan-ship/props/manifest.json';
import { shipForId, shipProfileAssetPath, type ShipId } from './shipCatalogue';
import type { SaveGame } from './types';
import type { ClanShipRoomId } from './systems/clanShipDocking';
import {
  CLAN_SHIP_INTERIOR_METRICS as METRICS,
  CLAN_SHIP_INTERIOR_ROOM_ORDER as ROOM_ORDER,
  CLAN_SHIP_INTERIOR_ROOMS as ROOMS,
  canClanShipInteriorTransition,
  clanShipInteriorRoomRoute,
  clanShipInteriorSpawn,
  freshClanShipInteriorPad,
  nearbyClanShipInteriorInteraction,
  planClanShipInteriorPath,
  stepClanShipInteriorActor,
  stepClanShipInteriorPad,
  stepClanShipInteriorPath,
  type ClanShipInteriorActor,
  type ClanShipInteriorDoor,
  type ClanShipInteriorFixture,
  type ClanShipInteriorPoint,
} from './systems/clanShipInterior';
import styles from './ClanShipInterior.module.css';

export interface ClanShipInteriorProps {
  roomId: ClanShipRoomId;
  save: SaveGame;
  suspended: boolean;
  onRoomChange: (roomId: ClanShipRoomId) => boolean;
  onService: () => void;
  onReturnToPersonal: () => void;
  targetRoomId?: ClanShipRoomId | null;
  onNavigateTarget?: (roomId: ClanShipRoomId) => void;
  onTargetReached?: () => void;
  onTargetCancelled?: () => void;
  personalShipId?: ShipId;
  onOpenSettings?: () => void;
}

type Direction = 'up' | 'down' | 'left' | 'right';
type Goal = { kind: 'walk' } | { kind: 'door'; door: ClanShipInteriorDoor; requestedRoomId?: ClanShipRoomId } |
  { kind: 'service'; requestedRoomId?: ClanShipRoomId };
interface Presentation {
  actor: ClanShipInteriorActor;
  phase: number;
  moving: boolean;
  waypoints: ClanShipInteriorPoint[];
  navigating: boolean;
}
interface Commands {
  point: (point: ClanShipInteriorPoint) => void;
  door: (door: ClanShipInteriorDoor) => void;
  service: () => void;
  interact: () => void;
  cancel: () => void;
  target: (target: ClanShipRoomId | null) => void;
  touch: (direction: Direction, held: boolean) => void;
}
const emptyCommands = (): Commands => ({ point: () => {}, door: () => {}, service: () => {}, interact: () => {}, cancel: () => {}, target: () => {}, touch: () => {} });
const distance = (a: ClanShipInteriorPoint, b: ClanShipInteriorPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const MOVE_KEYS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up', KeyW: 'up', KeyZ: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left', ArrowRight: 'right', KeyD: 'right',
};
const INTERACTIVE_TARGET = 'input,textarea,select,[contenteditable="true"]';

/** Each accepted room transition creates a new local controller at the paired
 * doorway. Service/settings overlays leave that controller mounted and paused.
 * Only the room ID is durable; a fresh load intentionally uses its safe spawn. */
export default function ClanShipInterior(props: ClanShipInteriorProps) {
  const [entry, setEntry] = useState<{ roomId: ClanShipRoomId; from?: ClanShipRoomId }>({ roomId: props.roomId });
  const [returnTarget, setReturnTarget] = useState<ClanShipRoomId | null>(null);
  if (entry.roomId !== props.roomId) setEntry({ roomId: props.roomId, from: entry.roomId });
  return <InteriorRoom
    key={`${props.save.createdAt}:${entry.roomId}`}
    {...props}
    enteredFrom={entry.from}
    targetRoomId={props.targetRoomId ?? returnTarget}
    onNavigateTarget={roomId => {
      if (props.onNavigateTarget) props.onNavigateTarget(roomId);
      else setReturnTarget(roomId);
    }}
    onTargetReached={() => { setReturnTarget(null); props.onTargetReached?.(); }}
    onTargetCancelled={() => { setReturnTarget(null); props.onTargetCancelled?.(); }}
  />;
}

function InteriorRoom(props: ClanShipInteriorProps & {
  enteredFrom?: ClanShipRoomId;
  onNavigateTarget: (roomId: ClanShipRoomId) => void;
}) {
  const { roomId, save, suspended, targetRoomId, enteredFrom } = props;
  const room = ROOMS[roomId];
  const rootRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const floorTouchRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const latestRef = useRef(props);
  const commandsRef = useRef<Commands>(emptyCommands());
  const [presentation, setPresentation] = useState<Presentation>(() => ({
    actor: clanShipInteriorSpawn(roomId, enteredFrom), phase: 0, moving: false, waypoints: [], navigating: false,
  }));
  const [viewport, setViewport] = useState({ width: 1100, height: 560 });
  const [status, setStatus] = useState('Clique sur le sol pour marcher. Approche d’une installation pour interagir.');
  const [reducedMotion, setReducedMotion] = useState(false);

  useLayoutEffect(() => { latestRef.current = props; });

  useEffect(() => {
    const viewportNode = viewportRef.current;
    if (!viewportNode) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setViewport(previous => previous.width === width && previous.height === height ? previous : { width, height });
    });
    observer.observe(viewportNode);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(media.matches);
    updateMotion();
    media.addEventListener('change', updateMotion);
    return () => { observer.disconnect(); media.removeEventListener('change', updateMotion); };
  }, []);

  useEffect(() => {
    let actor = clanShipInteriorSpawn(roomId, enteredFrom);
    let waypoints: ClanShipInteriorPoint[] = [];
    let goal: Goal | null = null;
    let phase = 0;
    let moving = false;
    let lastFrame = 0;
    let lastPaint = 0;
    let paintedMoving = false;
    let lastActivation = -Infinity;
    let frameId = 0;
    let pendingTransition = false;
    let wasActive = false;
    let padState = freshClanShipInteriorPad();
    const keys = new Set<string>();
    const touch = new Set<Direction>();

    const active = () => !pendingTransition && !latestRef.current.suspended && !document.hidden && document.hasFocus() &&
      !!rootRef.current && !rootRef.current.closest('[inert],[aria-hidden="true"],[hidden]');
    const clearHeld = () => { keys.clear(); touch.clear(); padState = freshClanShipInteriorPad(); lastFrame = 0; };
    const publish = () => {
      paintedMoving = moving;
      setPresentation({ actor: { ...actor }, phase, moving, waypoints: waypoints.map(point => ({ ...point })), navigating: goal !== null });
    };
    const cancel = (announce = true) => {
      const hadRoute = goal !== null || !!latestRef.current.targetRoomId;
      waypoints = []; goal = null; moving = false;
      latestRef.current.onTargetCancelled?.();
      if (announce && hadRoute) setStatus('Trajet interrompu. Tu contrôles le chasseur.');
      publish();
    };
    const plan = (point: ClanShipInteriorPoint, nextGoal: Goal, label: string) => {
      if (!active()) return false;
      const path = planClanShipInteriorPath(roomId, actor, point);
      if (!path) { setStatus('Cet emplacement est occupé ou hors du pont. Choisis un passage libre.'); return false; }
      waypoints = path.points.slice(1); goal = nextGoal;
      setStatus(label); publish();
      return true;
    };
    const enterDoor = (door: ClanShipInteriorDoor) => {
      if (!active() || !canClanShipInteriorTransition(roomId, door.targetRoomId, actor)) return;
      clearHeld(); moving = false;
      if (latestRef.current.onRoomChange(door.targetRoomId)) {
        pendingTransition = true; waypoints = []; goal = null;
      } else {
        cancel(false);
        setStatus('Le passage n’a pas pu être enregistré. Tu restes dans cette salle ; réessaie après résolution de la sauvegarde.');
      }
      publish();
    };
    const interact = () => {
      if (!active() || performance.now() - lastActivation < 250) return;
      const nearby = nearbyClanShipInteriorInteraction(roomId, actor);
      if (!nearby) { setStatus('Approche-toi d’une porte ou de l’installation éclairée avant d’interagir.'); return; }
      lastActivation = performance.now();
      if (nearby.type === 'door') { enterDoor(nearby.point); return; }
      waypoints = []; goal = null; moving = false; clearHeld();
      latestRef.current.onTargetReached?.();
      publish();
      if (roomId === 'hangar') latestRef.current.onReturnToPersonal();
      else latestRef.current.onService();
    };
    const setTarget = (target: ClanShipRoomId | null) => {
      if (!target) {
        if (goal && 'requestedRoomId' in goal && goal.requestedRoomId) { waypoints = []; goal = null; moving = false; publish(); }
        return;
      }
      const route = clanShipInteriorRoomRoute(roomId, target);
      if (!route.length) return;
      let planned = false;
      if (route.length === 1) {
        planned = plan(room.servicePoint, { kind: 'service', requestedRoomId: target }, `${room.serviceLabel} · approche en cours.`);
      } else {
        const door = room.doors.find(candidate => candidate.targetRoomId === route[1]);
        if (door) planned = plan(door, { kind: 'door', door, requestedRoomId: target }, `Vers ${ROOMS[target].label} · suivre le passage vers ${ROOMS[door.targetRoomId].label}.`);
      }
      // Choosing a destination transfers control back to the physical room.
      // Arrow keys can now interrupt the route instead of remaining on its
      // navigation button (where ordinary button keyboard behavior is kept).
      if (planned) worldRef.current?.focus({ preventScroll: true });
    };
    const service = () => {
      if (!active()) return;
      if (distance(actor, room.servicePoint) <= METRICS.interactionReach) { interact(); return; }
      cancel(false);
      plan(room.servicePoint, { kind: 'service' }, `${room.serviceLabel} · marche jusqu’à l’installation, puis interagis.`);
      worldRef.current?.focus({ preventScroll: true });
    };
    const settings = () => {
      if (!active()) return;
      clearHeld(); moving = false; publish();
      latestRef.current.onOpenSettings?.();
    };
    const back = () => {
      if (!active()) return;
      if (goal || latestRef.current.targetRoomId) cancel();
      else latestRef.current.onNavigateTarget('hangar');
    };
    commandsRef.current = {
      point: point => {
        if (!active()) return;
        cancel(false); plan(point, { kind: 'walk' }, 'Déplacement dans la salle.');
        worldRef.current?.focus({ preventScroll: true });
      },
      door: door => {
        if (!active()) return;
        cancel(false);
        plan(door, { kind: 'door', door }, `Passage vers ${ROOMS[door.targetRoomId].label}.`);
        worldRef.current?.focus({ preventScroll: true });
      },
      service, interact, cancel, target: setTarget,
      touch: (direction, held) => { if (held && active()) touch.add(direction); else touch.delete(direction); },
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !active() || event.altKey || event.ctrlKey || event.metaKey) return;
      const element = event.target instanceof HTMLElement ? event.target : null;
      if (element?.closest(INTERACTIVE_TARGET)) return;
      const direction = MOVE_KEYS[event.code];
      if (direction) {
        if (element?.closest('button,a[href]')) return;
        event.preventDefault(); event.stopPropagation();
        if (!event.repeat) keys.add(event.code);
      } else if (event.code === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        if (!event.repeat) settings();
      } else if (event.code === 'KeyE' || event.code === 'Enter' || event.code === 'Space') {
        if (element?.closest('button,a[href]') && event.code !== 'KeyE') return;
        event.preventDefault(); event.stopPropagation();
        if (!event.repeat) interact();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => { keys.delete(event.code); };
    const onBlur = () => { clearHeld(); wasActive = false; moving = false; publish(); };
    const onVisibility = () => { if (document.hidden) onBlur(); };
    const tick = (now: number) => {
      frameId = window.requestAnimationFrame(tick);
      if (!active()) {
        if (wasActive) { moving = false; publish(); }
        clearHeld(); wasActive = false; return;
      }
      const seconds = lastFrame === 0 ? 0 : Math.min(METRICS.maxFrameSeconds, Math.max(0, (now - lastFrame) / 1000));
      lastFrame = now; wasActive = true;
      let pad: Gamepad | null | undefined;
      try { pad = Array.from(navigator.getGamepads?.() ?? []).find(candidate => candidate?.connected); } catch { pad = null; }
      const pressed = (index: number) => pad?.buttons[index]?.pressed ?? false;
      const sample = pad ? {
        identity: `${pad.index}:${pad.id}`,
        x: pressed(14) || pressed(15) ? Number(pressed(15)) - Number(pressed(14)) : pad.axes[0] ?? 0,
        y: pressed(12) || pressed(13) ? Number(pressed(13)) - Number(pressed(12)) : pad.axes[1] ?? 0,
        confirm: pressed(0), back: pressed(1), start: pressed(9),
      } : null;
      const input = stepClanShipInteriorPad(padState, sample);
      padState = input.state;
      if (input.settings) { settings(); return; }
      if (input.back) { back(); return; }
      if (input.interact) { interact(); return; }
      const held = new Set<Direction>([...touch, ...Array.from(keys, key => MOVE_KEYS[key])]);
      const x = Number(held.has('right')) - Number(held.has('left')) || input.x;
      const y = Number(held.has('down')) - Number(held.has('up')) || input.y;
      const before = actor;
      if (Math.abs(x) > 0.001 || Math.abs(y) > 0.001) {
        if (goal || latestRef.current.targetRoomId) cancel(false);
        actor = stepClanShipInteriorActor(roomId, actor, { x, y }, seconds);
      } else if (goal) {
        const step = stepClanShipInteriorPath(roomId, actor, waypoints, seconds);
        actor = step.actor; waypoints = step.remaining;
        if (step.blocked) { cancel(false); setStatus('Le passage est bloqué. Choisis un autre point sur le sol.'); }
        else if (step.arrived) {
          const reached = goal; goal = null; moving = false;
          if (reached.kind === 'door') { enterDoor(reached.door); return; }
          if (reached.kind === 'service') {
            if (reached.requestedRoomId) latestRef.current.onTargetReached?.();
            setStatus(`${room.serviceLabel} · à portée. Appuie sur E / A ou sur Interagir.`);
          } else setStatus('Position atteinte.');
          // Always paint the final foot position, including paths shorter
          // than a render interval. Otherwise diagnostics/camera could retain
          // the last moving frame while the controller already stood still.
          if (distance(actor, before) > 0.001) phase = (phase + distance(actor, before) / 130) % 1;
          lastPaint = now; publish();
          return;
        }
      }
      moving = distance(actor, before) > 0.001;
      if (moving) phase = (phase + distance(actor, before) / 130) % 1;
      if ((moving && now - lastPaint >= 1000 / 30) || moving !== paintedMoving) { lastPaint = now; publish(); }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    frameId = window.requestAnimationFrame(tick);
    if (!latestRef.current.suspended) worldRef.current?.focus({ preventScroll: true });
    return () => {
      window.cancelAnimationFrame(frameId); clearHeld(); commandsRef.current = emptyCommands();
      window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur); document.removeEventListener('visibilitychange', onVisibility);
    };
    // Controller lifetime is the entered room. Ordinary save/overlay renders use
    // latestRef and must not replace the physical position or release gates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, enteredFrom]);

  // A route requested in the same frame as a pause/autosave must be planned
  // once this room regains input. Replanning starts at the preserved feet.
  useEffect(() => { if (!suspended) commandsRef.current.target(targetRoomId ?? null); }, [targetRoomId, suspended]);

  const actor = presentation.actor;
  const scale = Math.max(viewport.width / METRICS.width, viewport.height / METRICS.height);
  const cameraX = Math.min(0, Math.max(viewport.width - METRICS.width * scale, viewport.width / 2 - actor.x * scale));
  const cameraY = Math.min(0, Math.max(viewport.height - METRICS.height * scale, viewport.height * 0.82 - actor.y * scale));
  const controlInView = (x: number, width: number) => {
    const screenX = x * scale + cameraX;
    return screenX - width * scale / 2 >= 0 && screenX + width * scale / 2 <= viewport.width;
  };
  const nearby = nearbyClanShipInteriorInteraction(roomId, actor);
  const serviceReady = distance(actor, room.servicePoint) <= METRICS.interactionReach;
  const selectedShipId = props.personalShipId ?? save.clanShipDocking?.personalShipId ?? 'classic-predator-spaceship';
  const actorWidth = 122;
  const actorFootY = HUNTER_RIG_CANVAS.groundY / HUNTER_RIG_CANVAS.width * actorWidth;
  const marker = presentation.waypoints.at(-1);
  const interactLabel = nearby?.type === 'door' ? `Entrer : ${ROOMS[nearby.point.targetRoomId].label}` : nearby?.type === 'service' ? room.serviceLabel : 'Approche d’une installation';

  const pointerWalk = (event: PointerEvent<HTMLDivElement>) => {
    if (suspended || event.button !== 0 || (event.target instanceof HTMLElement && event.target.closest('button'))) return;
    const box = worldRef.current?.getBoundingClientRect();
    if (!box || box.width <= 0 || box.height <= 0) return;
    const point = { x: (event.clientX - box.left) / box.width * METRICS.width, y: (event.clientY - box.top) / box.height * METRICS.height };
    if (point.y < METRICS.floor.y) return;
    event.preventDefault(); commandsRef.current.point(point);
  };
  const startFloorPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') { pointerWalk(event); return; }
    if (suspended || event.button !== 0 || (event.target instanceof HTMLElement && event.target.closest('button'))) return;
    floorTouchRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const finishFloorPointer = (event: PointerEvent<HTMLDivElement>) => {
    const start = floorTouchRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    floorTouchRef.current = null;
    // A vertical swipe scrolls the mobile hub. Only a stationary tap issues
    // a walking order, so browsing the interface cannot move the hunter.
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 10) pointerWalk(event);
  };
  const touchButton = (direction: Direction, label: string, glyph: string) => <button
    type="button" aria-label={label} title={label} disabled={suspended}
    data-interior-move={direction} className={`${styles.moveButton} ${styles[direction]}`}
    onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); commandsRef.current.touch(direction, true); }}
    onPointerUp={event => { commandsRef.current.touch(direction, false); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
    onPointerCancel={() => commandsRef.current.touch(direction, false)}
    onLostPointerCapture={() => commandsRef.current.touch(direction, false)}
    onKeyDown={event => { if ((event.code === 'Enter' || event.code === 'Space') && !event.repeat) { event.preventDefault(); commandsRef.current.touch(direction, true); } }}
    onKeyUp={event => { if (event.code === 'Enter' || event.code === 'Space') { event.preventDefault(); commandsRef.current.touch(direction, false); } }}
    onBlur={() => commandsRef.current.touch(direction, false)}
  ><span aria-hidden="true">{glyph}</span></button>;

  return <section ref={rootRef} className={styles.interior} aria-label={`Intérieur du Clan Ship : ${room.label}`}
    data-clan-interior data-interior-room={roomId}
    data-interior-actor-x={actor.x.toFixed(2)} data-interior-actor-y={actor.y.toFixed(2)}
    data-interior-moving={!suspended && presentation.moving} data-interior-suspended={suspended}
    data-interior-target-room={targetRoomId ?? ''} style={{ '--room-accent': room.accent } as CSSProperties}>
    <div className={styles.roomHeading}>
      <div><span className={styles.eyebrow}>PONT DU CLAN · {String(ROOM_ORDER.indexOf(roomId) + 1).padStart(2, '0')} / 07</span><h3>{room.label}</h3></div>
      <p>{room.subtitle}</p>
    </div>
    <div className={styles.viewport} ref={viewportRef} data-interior-viewport>
      <div ref={worldRef} className={styles.world} data-interior-world data-screen-focus tabIndex={suspended ? -1 : 0}
        aria-label="Pont explorable. Flèches ou ZQSD/WASD pour marcher, E pour interagir."
        style={{ width: METRICS.width, height: METRICS.height, transform: `translate(${cameraX}px, ${cameraY}px) scale(${scale})` }}
        onPointerDown={startFloorPointer} onPointerUp={finishFloorPointer}
        onPointerCancel={() => { floorTouchRef.current = null; }}>
        <RoomScenery roomId={roomId} personalShipId={selectedShipId} />
        <div className={styles.floorGuide} aria-hidden="true" />
        {room.doors.map(door => {
          const open = distance(actor, door) < 160;
          return <div key={door.targetRoomId} className={styles.door} style={{ left: door.x, top: door.y, zIndex: Math.round(door.y) }} data-door-open={open}>
            <div className={styles.doorGlow} />
            <NativeArt asset={SHIP_LEVEL_ART.doorFrame} x={0} y={0} width={155} height={265} className={styles.doorArt} />
            <div className={styles.doorLeaf} data-open={open}><NativeArt asset={SHIP_LEVEL_ART.doorLeaf} x={52.5} y={237} width={105} height={237} /></div>
            <button type="button" disabled={suspended} tabIndex={suspended || !controlInView(door.x, 196) ? -1 : 0} data-interior-door-target={door.targetRoomId}
              onClick={() => commandsRef.current.door(door)} className={styles.doorTarget} aria-label={`Marcher vers ${ROOMS[door.targetRoomId].label}`}>
              <span aria-hidden="true">{door.side === 'left' ? '‹' : '›'}</span><span>{ROOMS[door.targetRoomId].label}</span>
            </button>
          </div>;
        })}
        <button type="button" className={styles.serviceBeacon} disabled={suspended}
          tabIndex={suspended || !controlInView(room.servicePoint.x, 88) ? -1 : 0}
          data-interior-service={roomId} data-interior-ready={serviceReady}
          style={{ left: room.servicePoint.x, top: room.servicePoint.y, zIndex: Math.round(room.servicePoint.y) - 1 }}
          onClick={() => commandsRef.current.service()} aria-label={`${serviceReady ? '' : 'Approcher : '}${room.serviceLabel}`}>
          <span className={styles.beaconRing} aria-hidden="true" /><span className={styles.beaconLabel}>{serviceReady ? 'E / A · ' : ''}{room.serviceLabel}</span>
        </button>
        {marker && <div className={styles.destination} aria-hidden="true" style={{ left: marker.x, top: marker.y }} />}
        <div className={styles.actor} data-interior-hunter data-interior-facing={actor.facing}
          style={{ left: actor.x, top: actor.y, zIndex: Math.round(actor.y) }}>
          <span className={styles.actorShadow} aria-hidden="true" />
          <HunterRigPreview appearance={save.appearance} armorId={save.loadout.armorId}
            weaponIds={save.loadout.weaponIds} gearIds={save.loadout.gearIds} size={actorWidth}
            pose={!suspended && presentation.moving && !reducedMotion ? 'run' : 'idle'}
            phase={reducedMotion ? 0 : presentation.phase} speed={!suspended && presentation.moving ? METRICS.speed : 0} facing={actor.facing}
            style={{ position: 'absolute', left: -actorWidth / 2, top: -actorFootY }} />
          <span className={styles.actorLabel}>TOI</span>
        </div>
      </div>
      <div className={styles.viewportVignette} aria-hidden="true" />
      {suspended && <div className={styles.suspendedVeil} aria-hidden="true">Pont en pause</div>}
      <div className={styles.locationTrack} aria-label="Position dans la salle">
        <span>{ROOMS[room.doors[0].targetRoomId].label}</span><div><i style={{ left: `${actor.x / METRICS.width * 100}%` }} /></div><span>{ROOMS[room.doors[1].targetRoomId].label}</span>
      </div>
    </div>
    <div className={styles.controls}>
      <div className={styles.dpad} aria-label="Déplacement tactile">
        {touchButton('up', 'Marcher vers le fond', '↑')}{touchButton('left', 'Marcher à gauche', '←')}
        {touchButton('down', 'Marcher vers l’avant', '↓')}{touchButton('right', 'Marcher à droite', '→')}
      </div>
      <div className={styles.actionGroup}>
        <button type="button" className={styles.interactButton} disabled={suspended || !nearby}
          data-interior-interact data-interior-ready={!!nearby}
          onClick={() => commandsRef.current.interact()}><span className={styles.keycap}>E / A</span><span>{interactLabel}</span></button>
        <div className={styles.secondaryControls}>
          <button type="button" disabled={suspended || (!presentation.navigating && !targetRoomId)} data-interior-cancel
            onClick={() => commandsRef.current.cancel()}>Arrêter le trajet</button>
          {!serviceReady && <button type="button" disabled={suspended} data-interior-approach-service onClick={() => commandsRef.current.service()}>
            {roomId === 'hangar' ? 'Rejoindre la passerelle' : 'Approcher l’installation'}</button>}
        </div>
      </div>
      <p className={styles.keyHelp}><span>Sol : cliquer pour marcher</span><span>Flèches / ZQSD / WASD · E : interagir</span><span>Manette : stick, A · B : retour au hangar · Start : réglages</span></p>
    </div>
    <p className={styles.status} role="status" aria-live="polite">{suspended ? 'Déplacements suspendus pendant la consultation.' : status}</p>
  </section>;
}

interface AlphaArt {
  src: string; sourceWidth: number; sourceHeight: number;
  alphaBounds: { x: number; y: number; width: number; height: number };
}

/** Size the visible silhouette, preserving the source bitmap's exact ratio. */
function NativeArt({ asset, x, y, width, height, className }: {
  asset: AlphaArt; x: number; y: number; width: number; height: number; className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const bounds = asset.alphaBounds;
  const scale = Math.min(width / bounds.width, height / bounds.height);
  return <span className={className} aria-hidden="true" data-interior-art={asset.src} data-art-unavailable={failed || undefined}
    style={{ position: 'absolute', left: x - bounds.width * scale / 2, top: y - bounds.height * scale, width: bounds.width * scale, height: bounds.height * scale, pointerEvents: 'none' }}>
    {!failed && <img src={asset.src} alt="" draggable={false} decoding="async" onError={() => setFailed(true)}
      style={{ position: 'absolute', left: -bounds.x * scale, top: -bounds.y * scale, width: asset.sourceWidth * scale, height: asset.sourceHeight * scale, maxWidth: 'none' }} />}
  </span>;
}

const FIXTURE_ART = {
  console: SHIP_LEVEL_ART.navigationConsole, rack: SHIP_LEVEL_ART_V22.armoryRack,
  bed: SHIP_LEVEL_ART_V22.medbayBed, terminal: SHIP_LEVEL_ART_V22.archiveTerminal, forge: SHIP_LEVEL_ART_V22.forgeStation,
};
// Dedicated clan fixtures replace only their matching instances. A council
// holotable must not silently turn every berth/trophy console into that table.
const CLAN_FIXTURE_ART: Partial<Record<string, AlphaArt>> = {
  'council-table': clanPropManifest.assets['council-table'],
  'armory-rack': clanPropManifest.assets['armory-rack'],
  'medical-bed': clanPropManifest.assets['medical-bed'],
  'archive-terminal': clanPropManifest.assets['archive-terminal'],
  'training-station': clanPropManifest.assets['training-station'],
  'berth-console': clanPropManifest.assets['berth-console'],
  'trophy-workbench': clanPropManifest.assets['trophy-workbench'],
  'armory-forge': clanPropManifest.assets['armory-forge'],
};
const Fixture = memo(function Fixture({ fixture }: { fixture: ClanShipInteriorFixture }) {
  return <div className={styles.fixture} data-interior-fixture={fixture.id} style={{ left: fixture.x, top: fixture.y, zIndex: Math.round(fixture.y) }}>
    <span className={styles.fixtureShadow} style={{ width: fixture.footprint.width, height: fixture.footprint.height }} />
    <NativeArt asset={CLAN_FIXTURE_ART[fixture.id] ?? FIXTURE_ART[fixture.art]} x={0} y={0} width={fixture.width} height={fixture.height} />
  </div>;
});

const RoomScenery = memo(function RoomScenery({ roomId, personalShipId }: { roomId: ClanShipRoomId; personalShipId: ShipId }) {
  const [backgroundFailed, setBackgroundFailed] = useState(false);
  const [shipFailed, setShipFailed] = useState(false);
  const room = ROOMS[roomId];
  return <>
    <div className={styles.background} aria-hidden="true">
      <img src={backgroundFailed ? SHIP_LEVEL_ART.wallMachinery.src : `/game/clan-ship/interiors/${roomId}-v1.webp`}
        alt="" draggable={false} decoding="async" data-interior-background={roomId}
        onError={() => { if (!backgroundFailed) setBackgroundFailed(true); }} />
      <div className={styles.backgroundGrade} />
    </div>
    {roomId === 'hangar' && <div className={styles.personalShip} data-interior-personal-ship={personalShipId}>
      {!shipFailed && <img src={shipProfileAssetPath(personalShipId)} alt={shipForId(personalShipId).name} draggable={false} onError={() => setShipFailed(true)} />}
      <span className={styles.berthLight} aria-hidden="true" />
      <span className={styles.berthLabel}>Vaisseau personnel · amarré</span>
    </div>}
    {roomId === 'entrainement' && <div className={styles.trainingCircle} aria-hidden="true" />}
    {room.fixtures.map(fixture => <Fixture key={fixture.id} fixture={fixture} />)}
    <div className={styles.floorEdge} aria-hidden="true" />
  </>;
});
