"use client";

/* eslint-disable @next/next/no-img-element -- independent game bitmaps keep their authored alpha and foot anchors */
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import HunterRigPreview from './HunterRigPreview';
import HomeworldNpcSpriteV84 from './HomeworldNpcSpriteV84';
import ClanShipIncidentPanel from './ClanShipIncidentPanel';
import { CLAN_SHIP_CREW_ART_ROLES, clanShipCrewArtIdentity } from './clanShipCrew';
import { CLAN_SHIP_RECRUITS, evaluateClanShipRecruit, type ClanShipNpcId } from './systems/clanShipOperations';
import { HUNTER_RIG_CANVAS } from './hunterRig';
import { SHIP_LEVEL_ART } from './shipInteriorKit';
import { SHIP_LEVEL_ART_V22 } from './shipInteriorV22';
import clanPropManifest from '../../public/game/clan-ship/props/manifest.json';
import incidentPropManifest from '../../public/game/clan-ship/incidents/manifest.json';
import { shipForId, shipProfileAssetPath, type ShipId } from './shipCatalogue';
import type { HunterAppearance, SaveGame } from './types';
import type { ClanShipRoomId } from './systems/clanShipDocking';
import {
  clanShipIncidentTarget, getClanShipIncidentEscort, getClanShipIncidentStep, getClanShipIncidentTargets,
  inspectClanShipIncidents,
  type ClanShipIncidentAction, type ClanShipIncidentPhysicalContext, type ClanShipIncidentTarget,
} from './systems/clanShipIncidents';
import {
  CLAN_SHIP_ESCORT_MOTION, clanShipIncidentEscortDoorAccess, clanShipIncidentEscortScene,
  createClanShipEscortMotion, stepClanShipEscortMotion,
  type ClanShipEscortMotion, type ClanShipEscortScene,
} from './systems/clanShipIncidentEscort';
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
  onOperations?: (npcId?: ClanShipNpcId) => void;
  onIncident?: (action: ClanShipIncidentAction, physical: ClanShipIncidentPhysicalContext) => boolean;
  onIncidentPanelOpenChange?: (open: boolean) => void;
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
  { kind: 'service'; requestedRoomId?: ClanShipRoomId } |
  { kind: 'incident'; targetId: string; openOnArrival: boolean; requestedRoomId?: ClanShipRoomId };
interface Presentation {
  actor: ClanShipInteriorActor;
  phase: number;
  moving: boolean;
  waypoints: ClanShipInteriorPoint[];
  navigating: boolean;
  escort: ClanShipEscortMotion | null;
  escortScene: ClanShipEscortScene | null;
}
interface Commands {
  point: (point: ClanShipInteriorPoint) => void;
  door: (door: ClanShipInteriorDoor) => void;
  service: () => void;
  operations: (npcId?: ClanShipNpcId) => void;
  incident: (targetId: string) => void;
  incidentAction: (action: ClanShipIncidentAction) => boolean;
  interact: () => void;
  cancel: () => void;
  target: (target: ClanShipRoomId | null) => void;
  touch: (direction: Direction, held: boolean) => void;
}
const emptyCommands = (): Commands => ({ point: () => {}, door: () => {}, service: () => {}, operations: () => {}, incident: () => {}, incidentAction: () => false, interact: () => {}, cancel: () => {}, target: () => {}, touch: () => {} });
const distance = (a: ClanShipInteriorPoint, b: ClanShipInteriorPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const MOVE_KEYS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up', KeyW: 'up', KeyZ: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left', ArrowRight: 'right', KeyD: 'right',
};
const INTERACTIVE_TARGET = 'input,textarea,select,[contenteditable="true"]';
// A fixed returning scout uses the existing articulated rig. Its identity is
// independent of player customisation and is not a new recruited roster entry.
const RETURNING_SCOUT_APPEARANCE: HunterAppearance = {
  presetId: 'jungle-hunter', bodyMorphId: 'classic', headStyleId: 'reference', skinId: 'ashen-mottle',
  biomaskId: 'jungle', dreadStyleId: 'classic', dreadTintId: 'obsidian', armorStyleId: 'classic',
  armorTintId: 'gunmetal', trophyAdornmentId: 'none', laserColorId: 'cyan',
};

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
  const { roomId, save, targetRoomId, enteredFrom } = props;
  const room = ROOMS[roomId];
  const rootRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const floorTouchRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const latestRef = useRef(props);
  const incidentInspection = useMemo(() => inspectClanShipIncidents(save.clanShipIncidents, save.createdAt), [save.clanShipIncidents, save.createdAt]);
  const incidentState = incidentInspection.state;
  const incidentStateRef = useRef(incidentState);
  const incidentPanelTargetRef = useRef<string | null>(null);
  const [incidentPanelTargetId, setIncidentPanelTargetId] = useState<string | null>(null);
  const suspended = props.suspended || incidentPanelTargetId !== null;
  const focusRestoreFrameRef = useRef(0);
  const commandsRef = useRef<Commands>(emptyCommands());
  const [presentation, setPresentation] = useState<Presentation>(() => {
    const escortScene = clanShipIncidentEscortScene(incidentState, roomId);
    return { actor: clanShipInteriorSpawn(roomId, enteredFrom), phase: 0, moving: false, waypoints: [], navigating: false,
      escortScene, escort: escortScene ? createClanShipEscortMotion(escortScene.position) : null };
  });
  const [viewport, setViewport] = useState({ width: 1100, height: 560 });
  const [status, setStatus] = useState('Clique sur le sol pour marcher. Approche d’une installation pour interagir.');
  const [reducedMotion, setReducedMotion] = useState(false);

  useLayoutEffect(() => { latestRef.current = props; incidentStateRef.current = incidentState; });

  const closeIncidentPanel = useCallback(() => {
    incidentPanelTargetRef.current = null;
    setIncidentPanelTargetId(null);
    latestRef.current.onIncidentPanelOpenChange?.(false);
    window.cancelAnimationFrame(focusRestoreFrameRef.current);
    focusRestoreFrameRef.current = window.requestAnimationFrame(() => worldRef.current?.focus({ preventScroll: true }));
  }, []);

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
    let escortScene = clanShipIncidentEscortScene(incidentStateRef.current, roomId);
    let escort = escortScene ? createClanShipEscortMotion(escortScene.position) : null;
    let paintedEscortMoving = false;
    let waitingIncidentId: string | null = null;
    let padState = freshClanShipInteriorPad();
    const keys = new Set<string>();
    const touch = new Set<Direction>();

    const active = () => !pendingTransition && !latestRef.current.suspended && !incidentPanelTargetRef.current && !document.hidden && document.hasFocus() &&
      !!rootRef.current && !rootRef.current.closest('[inert],[aria-hidden="true"],[hidden]');
    const clearHeld = () => { keys.clear(); touch.clear(); padState = freshClanShipInteriorPad(); lastFrame = 0; };
    const publish = () => {
      paintedMoving = moving;
      paintedEscortMoving = escort?.moving ?? false;
      setPresentation({ actor: { ...actor }, phase, moving, waypoints: waypoints.map(point => ({ ...point })), navigating: goal !== null, escort, escortScene });
    };
    const syncEscort = () => {
      const next = clanShipIncidentEscortScene(incidentStateRef.current, roomId);
      const changed = next?.key !== escortScene?.key || next?.checkpointId !== escortScene?.checkpointId ||
        next?.follows !== escortScene?.follows || next?.arrived !== escortScene?.arrived;
      if (!next) escort = null;
      else if (!escort || next.key !== escortScene?.key) escort = createClanShipEscortMotion(next.position);
      escortScene = next;
      return changed;
    };
    const cancel = (announce = true) => {
      const hadRoute = goal !== null || !!latestRef.current.targetRoomId;
      waypoints = []; goal = null; moving = false;
      waitingIncidentId = null;
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
      const access = clanShipIncidentEscortDoorAccess(incidentStateRef.current, roomId, door.targetRoomId, actor, escort?.actor ?? null);
      if (!access.allowed) { cancel(false); setStatus(access.message); return; }
      clearHeld(); moving = false;
      if (latestRef.current.onRoomChange(door.targetRoomId)) {
        pendingTransition = true; waypoints = []; goal = null;
      } else {
        cancel(false);
        setStatus('Le passage n’a pas pu être enregistré. Tu restes dans cette salle ; réessaie après résolution de la sauvegarde.');
      }
      publish();
    };
    const activateService = () => {
      if (!active() || distance(actor, room.servicePoint) > METRICS.interactionReach) return;
      if (roomId === 'hangar' && getClanShipIncidentEscort(incidentStateRef.current)?.follows) {
        setStatus('Accompagne le membre de l’équipe jusqu’au poste médical avant de rejoindre ton vaisseau.'); return;
      }
      waypoints = []; goal = null; moving = false; clearHeld();
      latestRef.current.onTargetReached?.();
      publish();
      if (roomId === 'hangar') latestRef.current.onReturnToPersonal();
      else latestRef.current.onService();
    };
    const escortAtTarget = (target: ClanShipIncidentTarget) => !!escort && distance(escort.actor, target.position) <= METRICS.interactionReach;
    const currentIncidentTarget = () => {
      const step = getClanShipIncidentStep(incidentStateRef.current);
      return step ? clanShipIncidentTarget(step.targetId) : null;
    };
    const openIncident = (target: ClanShipIncidentTarget) => {
      if (!active() || !latestRef.current.onIncident || target.roomId !== roomId ||
          target.incidentId !== incidentStateRef.current?.activeIncident?.incidentId || distance(actor, target.position) > METRICS.interactionReach) return false;
      const step = getClanShipIncidentStep(incidentStateRef.current);
      if (step?.targetId === target.id && step.kind === 'escort-checkpoint' && !escortAtTarget(target)) return false;
      waypoints = []; goal = null; moving = false; clearHeld();
      if (escort) escort = { ...escort, moving: false };
      incidentPanelTargetRef.current = target.id;
      setIncidentPanelTargetId(target.id);
      latestRef.current.onTargetReached?.();
      latestRef.current.onIncidentPanelOpenChange?.(true);
      publish();
      return true;
    };
    const incident = (targetId: string) => {
      const target = clanShipIncidentTarget(targetId);
      if (!active() || !latestRef.current.onIncident || !target || target.roomId !== roomId ||
          target.incidentId !== incidentStateRef.current?.activeIncident?.incidentId) return;
      if (distance(actor, target.position) <= METRICS.interactionReach && openIncident(target)) return;
      cancel(false);
      plan(target.position, { kind: 'incident', targetId, openOnArrival: true }, `${target.label} · approche en cours. Le groupe attend ensemble aux points de passage.`);
      worldRef.current?.focus({ preventScroll: true });
    };
    const incidentAction = (action: ClanShipIncidentAction) => {
      // The panel deliberately pauses active(). It may submit only its own
      // object command, using feet from this still-mounted controller.
      if (pendingTransition || latestRef.current.suspended || document.hidden || !document.hasFocus() ||
          !latestRef.current.onIncident || !incidentPanelTargetRef.current) return false;
      const step = getClanShipIncidentStep(incidentStateRef.current);
      const targetId = action.type === 'interact' || action.type === 'choose' ? action.targetId
        : action.type === 'escort-checkpoint' && action.checkpointId === step?.id ? step.targetId : null;
      if (targetId !== incidentPanelTargetRef.current) return false;
      return latestRef.current.onIncident(action, {
        actor: { x: actor.x, y: actor.y },
        escort: escort ? { roomId, position: { x: escort.actor.x, y: escort.actor.y } } : null,
      });
    };
    const interact = () => {
      if (!active() || performance.now() - lastActivation < 250) return;
      const target = currentIncidentTarget();
      if (latestRef.current.onIncident && target?.roomId === roomId && distance(actor, target.position) <= METRICS.interactionReach) {
        lastActivation = performance.now(); incident(target.id); return;
      }
      const nearby = nearbyClanShipInteriorInteraction(roomId, actor);
      if (!nearby) { setStatus('Approche-toi d’une porte, d’un objet du dossier ou de l’installation éclairée avant d’interagir.'); return; }
      lastActivation = performance.now();
      if (nearby.type === 'door') { enterDoor(nearby.point); return; }
      activateService();
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
        const incidentTarget = latestRef.current.onIncident ? currentIncidentTarget() : null;
        planned = incidentTarget?.roomId === target
          ? plan(incidentTarget.position, { kind: 'incident', targetId: incidentTarget.id, openOnArrival: false, requestedRoomId: target }, `${incidentTarget.label} · approche du point d’intervention.`)
          : plan(room.servicePoint, { kind: 'service', requestedRoomId: target }, `${room.serviceLabel} · approche en cours.`);
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
      if (distance(actor, room.servicePoint) <= METRICS.interactionReach) { activateService(); return; }
      cancel(false);
      plan(room.servicePoint, { kind: 'service' }, `${room.serviceLabel} · marche jusqu’à l’installation, puis interagis.`);
      worldRef.current?.focus({ preventScroll: true });
    };
    const operations = (npcId?: ClanShipNpcId) => {
      if (!active() || !latestRef.current.onOperations) return;
      if (distance(actor, room.servicePoint) > METRICS.interactionReach) {
        cancel(false);
        plan(room.servicePoint, { kind: 'service' }, 'Approche du poste de clan. Confirme ensuite « Dossier du poste ».');
        worldRef.current?.focus({ preventScroll: true });
        return;
      }
      waypoints = []; goal = null; moving = false; clearHeld();
      latestRef.current.onTargetReached?.(); publish();
      latestRef.current.onOperations(npcId);
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
      service, operations, incident, incidentAction, interact, cancel, target: setTarget,
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
      } else if (event.code === 'KeyR' && latestRef.current.onOperations) {
        event.preventDefault(); event.stopPropagation();
        if (!event.repeat) operations();
      } else if (event.code === 'KeyE' || event.code === 'Enter' || event.code === 'Space') {
        if (element?.closest('button,a[href]') && event.code !== 'KeyE') return;
        event.preventDefault(); event.stopPropagation();
        if (!event.repeat) interact();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => { keys.delete(event.code); };
    const onBlur = () => {
      clearHeld(); wasActive = false; moving = false;
      if (escort) escort = { ...escort, moving: false };
      publish();
    };
    const onVisibility = () => { if (document.hidden) onBlur(); };
    const tick = (now: number) => {
      frameId = window.requestAnimationFrame(tick);
      const escortChanged = syncEscort();
      if (!active()) {
        if (wasActive || escortChanged || escort?.moving) {
          moving = false;
          if (escort) escort = { ...escort, moving: false };
          publish();
        }
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
        confirm: pressed(0), operations: pressed(2), back: pressed(1), start: pressed(9),
      } : null;
      const input = stepClanShipInteriorPad(padState, sample);
      padState = input.state;
      if (input.settings) { settings(); return; }
      if (input.back) { back(); return; }
      if (input.operations) { operations(); return; }
      if (input.interact) { interact(); return; }
      const held = new Set<Direction>([...touch, ...Array.from(keys, key => MOVE_KEYS[key])]);
      const x = Number(held.has('right')) - Number(held.has('left')) || input.x;
      const y = Number(held.has('down')) - Number(held.has('up')) || input.y;
      const before = actor;
      let arrivedGoal: Goal | null = null;
      if (Math.abs(x) > 0.001 || Math.abs(y) > 0.001) {
        if (goal || latestRef.current.targetRoomId) cancel(false);
        actor = stepClanShipInteriorActor(roomId, actor, { x, y }, seconds);
      } else if (goal) {
        const step = stepClanShipInteriorPath(roomId, actor, waypoints, seconds);
        actor = step.actor; waypoints = step.remaining;
        if (step.blocked) { cancel(false); setStatus('Le passage est bloqué. Choisis un autre point sur le sol.'); }
        else if (step.arrived) arrivedGoal = goal;
      }
      moving = distance(actor, before) > 0.001;
      if (moving) phase = (phase + distance(actor, before) / 130) % 1;
      if (escort) escort = stepClanShipEscortMotion(roomId, escort, actor, seconds, escortScene?.follows ?? false);
      if (arrivedGoal) {
        if (arrivedGoal.kind === 'door') { goal = null; moving = false; enterDoor(arrivedGoal.door); return; }
        if (arrivedGoal.kind === 'incident') {
          const target = clanShipIncidentTarget(arrivedGoal.targetId);
          if (arrivedGoal.openOnArrival && target) {
            // Do not freeze a slower follower outside the checkpoint by
            // opening a modal as soon as only the player's feet arrive.
            if (openIncident(target)) { lastPaint = now; return; }
            if (waitingIncidentId !== target.id) {
              waitingIncidentId = target.id;
              setStatus('Le membre accompagné rejoint le point. Le relevé s’ouvrira quand le groupe sera réuni.');
            }
          } else {
            goal = null; moving = false;
            if (arrivedGoal.requestedRoomId) latestRef.current.onTargetReached?.();
            setStatus(`${target?.label ?? 'Point d’intervention'} · à portée. Appuie sur E / A pour examiner.`);
          }
        } else {
          goal = null; moving = false;
          if (arrivedGoal.kind === 'service') {
            if (arrivedGoal.requestedRoomId) latestRef.current.onTargetReached?.();
            setStatus(`${room.serviceLabel} · à portée. Appuie sur E / A ou sur Interagir.`);
          } else setStatus('Position atteinte.');
        }
        if (!goal || now - lastPaint >= 1000 / 30 || moving !== paintedMoving || !!escort?.moving !== paintedEscortMoving) {
          lastPaint = now; publish();
        }
        return;
      }
      if (((moving || escort?.moving) && now - lastPaint >= 1000 / 30) || moving !== paintedMoving ||
          !!escort?.moving !== paintedEscortMoving || escortChanged) { lastPaint = now; publish(); }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    frameId = window.requestAnimationFrame(tick);
    if (!latestRef.current.suspended) worldRef.current?.focus({ preventScroll: true });
    return () => {
      window.cancelAnimationFrame(frameId); window.cancelAnimationFrame(focusRestoreFrameRef.current);
      clearHeld(); commandsRef.current = emptyCommands();
      latestRef.current.onIncidentPanelOpenChange?.(false);
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
  const incidentStep = getClanShipIncidentStep(incidentState);
  const stepTarget = incidentStep ? clanShipIncidentTarget(incidentStep.targetId) : null;
  const incidentTargets = props.onIncident ? getClanShipIncidentTargets(incidentState).filter(target => target.roomId === roomId) : [];
  const nearbyIncident = props.onIncident && stepTarget?.roomId === roomId && distance(actor, stepTarget.position) <= METRICS.interactionReach ? stepTarget : null;
  const serviceOccupiedByIncident = incidentTargets.some(target => distance(target.position, room.servicePoint) < 110);
  const openedTarget = incidentPanelTargetId ? clanShipIncidentTarget(incidentPanelTargetId) : null;
  const selectedShipId = props.personalShipId ?? save.clanShipDocking?.personalShipId ?? 'classic-predator-spaceship';
  const actorWidth = 122;
  const actorFootY = HUNTER_RIG_CANVAS.groundY / HUNTER_RIG_CANVAS.width * actorWidth;
  const marker = presentation.waypoints.at(-1);
  const interactLabel = nearbyIncident ? `Examiner : ${nearbyIncident.label}` : nearby?.type === 'door' ? `Entrer : ${ROOMS[nearby.point.targetRoomId].label}` : nearby?.type === 'service' ? room.serviceLabel : 'Approche d’une installation';
  const witnessHere = incidentTargets.some(target => target.id === 'provenance-veteran');
  const crew = save.clanShipOperations ? CLAN_SHIP_RECRUITS.filter(npc => npc.roomId === roomId &&
    ((witnessHere && npc.id === 'ash-scar') || save.clanShipOperations!.recruitedNpcIds.includes(npc.id) || evaluateClanShipRecruit(save.clanShipOperations!, npc.id).allowed)) : [];

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

  return <><section ref={rootRef} className={styles.interior} aria-label={`Intérieur du Clan Ship : ${room.label}`}
    inert={!!openedTarget} aria-hidden={openedTarget ? true : undefined}
    data-clan-interior data-interior-room={roomId}
    data-interior-actor-x={actor.x.toFixed(2)} data-interior-actor-y={actor.y.toFixed(2)}
    data-interior-moving={!suspended && presentation.moving} data-interior-suspended={suspended}
    data-interior-target-room={targetRoomId ?? ''} data-interior-incident-step={incidentStep?.id ?? ''}
    style={{ '--room-accent': room.accent } as CSSProperties}>
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
        {crew.map(npc => {
          const recruited = save.clanShipOperations?.recruitedNpcIds.includes(npc.id) ?? false;
          // Feet stand on the raised service gallery behind the walkable floor;
          // the player cannot cross a stationary actor's authored footprint.
          const isWitness = witnessHere && npc.id === 'ash-scar';
          const x = isWitness ? clanShipIncidentTarget('provenance-veteran')!.position.x : roomId === 'conseil' ? 1120 : Math.min(1160, room.servicePoint.x + 180);
          return <div key={npc.id} className={styles.crewActor} data-clan-crew={npc.id}
            data-clan-crew-recruited={recruited} style={{ left: x, top: 500, zIndex: 500 }}>
            <span className={styles.crewPlatform} aria-hidden="true" />
            <HomeworldNpcSpriteV84 npcId={clanShipCrewArtIdentity(npc.id)} role={CLAN_SHIP_CREW_ART_ROLES[npc.id]} height={190} facing={-1} />
            <button type="button" className={styles.crewLabel} disabled={suspended || (!props.onOperations && !isWitness)}
              tabIndex={suspended || !controlInView(x, 200) ? -1 : 0}
              data-clan-crew-talk={npc.id} onClick={() => isWitness ? commandsRef.current.incident('provenance-veteran') : commandsRef.current.operations(npc.id)}>
              <strong>{npc.name}</strong><span>{isWitness ? 'Témoin du retour' : recruited ? npc.role : 'Entretien disponible'}</span>
            </button>
          </div>;
        })}
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
        {!serviceOccupiedByIncident && <button type="button" className={styles.serviceBeacon} disabled={suspended}
          tabIndex={suspended || !controlInView(room.servicePoint.x, 88) ? -1 : 0}
          data-interior-service={roomId} data-interior-ready={serviceReady}
          style={{ left: room.servicePoint.x, top: room.servicePoint.y, zIndex: Math.round(room.servicePoint.y) - 1 }}
          onClick={() => commandsRef.current.service()} aria-label={`${serviceReady ? '' : 'Approcher : '}${room.serviceLabel}`}>
          <span className={styles.beaconRing} aria-hidden="true" /><span className={styles.beaconLabel}>{serviceReady ? 'E / A · ' : ''}{room.serviceLabel}</span>
        </button>}
        {incidentTargets.map(target => {
          const near = distance(actor, target.position) <= METRICS.interactionReach;
          const current = incidentStep?.targetId === target.id;
          const escortReady = !current || incidentStep.kind !== 'escort-checkpoint' ||
            !!presentation.escort && distance(presentation.escort.actor, target.position) <= METRICS.interactionReach;
          return <div key={target.id} className={styles.incidentObject} data-clan-incident-object={target.id}
            data-current-incident-target={current}>
            <IncidentObjectArt target={target} />
            <button type="button" className={styles.incidentTarget} disabled={suspended}
              tabIndex={suspended || !controlInView(target.position.x, 216) ? -1 : 0}
              style={{ left: target.position.x, top: target.position.y, zIndex: Math.round(target.position.y) + 2 }}
              data-clan-incident-target={target.id} data-clan-incident-ready={near && escortReady}
              data-target-room={target.roomId} data-target-x={target.position.x} data-target-y={target.position.y}
              aria-label={`${near ? 'Examiner' : 'Approcher'} : ${target.label}`}
              onClick={() => commandsRef.current.incident(target.id)}>
              <span className={styles.incidentRing} aria-hidden="true" />
              <span className={styles.incidentLabel}><small>{current ? 'INTERVENTION · PROCHAIN POINT' : 'OBJET DU DOSSIER'}</small><strong>{target.label}</strong></span>
            </button>
          </div>;
        })}
        {marker && <div className={styles.destination} aria-hidden="true" style={{ left: marker.x, top: marker.y }} />}
        {presentation.escort && presentation.escortScene && <div className={styles.escortActor}
          data-clan-incident-escort data-escort-room={roomId}
          data-escort-x={presentation.escort.actor.x.toFixed(2)} data-escort-y={presentation.escort.actor.y.toFixed(2)}
          data-escort-moving={!suspended && presentation.escort.moving} data-escort-follows={presentation.escortScene.follows}
          data-escort-checkpoint={presentation.escortScene.checkpointId} data-escort-path-builds={presentation.escort.pathBuilds}
          style={{ left: presentation.escort.actor.x, top: presentation.escort.actor.y, zIndex: Math.round(presentation.escort.actor.y) + 1 }}>
          <span className={styles.actorShadow} aria-hidden="true" />
          <HunterRigPreview appearance={RETURNING_SCOUT_APPEARANCE} armorId="scout" weaponIds={[]} gearIds={[]}
            size={112} label="Éclaireur de retour" pose={!suspended && presentation.escort.moving && !reducedMotion ? 'run' : 'idle'}
            phase={reducedMotion ? 0 : presentation.escort.phase} speed={!suspended && presentation.escort.moving ? CLAN_SHIP_ESCORT_MOTION.speed : 0}
            facing={presentation.escort.actor.facing} style={{ position: 'absolute', left: -56, top: -HUNTER_RIG_CANVAS.groundY / HUNTER_RIG_CANVAS.width * 112 }} />
          <span className={styles.escortLabel}>ÉCLAIREUR DE RETOUR<small>{presentation.escortScene.arrived ? 'Arrivée consignée' : presentation.escortScene.follows ? 'Accompagnement en cours' : 'Au point de transfert'}</small></span>
        </div>}
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
      {roomId === 'hangar' && <span className={styles.berthLabel}>Vaisseau personnel · amarré</span>}
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
        <button type="button" className={styles.interactButton} disabled={suspended || (!nearby && !nearbyIncident)}
          data-interior-interact data-interior-ready={!!nearby || !!nearbyIncident}
          onClick={() => commandsRef.current.interact()}><span className={styles.keycap}>E / A</span><span>{interactLabel}</span></button>
        <div className={styles.secondaryControls}>
          {props.onOperations && <button type="button" disabled={suspended} data-interior-operations
            data-interior-operations-ready={serviceReady} onClick={() => commandsRef.current.operations()}>
            {serviceReady ? (roomId === 'conseil' ? 'R / X · Table holo du clan' : 'R / X · Dossier du poste') : 'R / X · Rejoindre le poste de clan'}
          </button>}
          <button type="button" disabled={suspended || (!presentation.navigating && !targetRoomId)} data-interior-cancel
            onClick={() => commandsRef.current.cancel()}>Arrêter le trajet</button>
          {(!serviceReady || serviceOccupiedByIncident) && <button type="button" disabled={suspended} data-interior-approach-service onClick={() => commandsRef.current.service()}>
            {serviceReady ? room.serviceLabel : roomId === 'hangar' ? 'Rejoindre la passerelle' : 'Approcher l’installation'}</button>}
        </div>
      </div>
      <p className={styles.keyHelp}><span>Sol : cliquer pour marcher</span><span>Flèches / ZQSD / WASD · E : service · R : dossier du poste</span><span>Manette : stick, A : service · X : dossier · B : hangar · Start : réglages</span></p>
    </div>
    <p className={styles.status} role="status" aria-live="polite">{suspended ? 'Déplacements suspendus pendant la consultation.' : status}</p>
  </section>
    {openedTarget && incidentState && <ClanShipIncidentPanel target={openedTarget} state={incidentState} suspended={props.suspended}
      escortReady={!!presentation.escort && distance(presentation.escort.actor, openedTarget.position) <= METRICS.interactionReach}
      onAction={action => commandsRef.current.incidentAction(action)} onClose={closeIncidentPanel}
      onNavigate={target => { closeIncidentPanel(); props.onNavigateTarget(target.roomId); }} />}
  </>;
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
  cargo: incidentPropManifest.assets['sealed-return-cargo'], tablet: incidentPropManifest.assets['trophy-memory-tablet'],
};

/** Modules are attached to existing blocked console/forge sockets. Cargo and
 * the freestanding archive tablet are permanent physical fixtures above; their
 * footprints are authored in the same geometry used by both actors. */
const IncidentObjectArt = memo(function IncidentObjectArt({ target }: { target: ClanShipIncidentTarget }) {
  if (target.art !== 'relay' && target.art !== 'tablet') return null;
  if (target.id === 'relay-reference' || target.id === 'provenance-record-b') return null;
  const relay = target.art === 'relay';
  const footY = target.id === 'relay-component' ? 575 : target.id === 'relay-console' ? 549
    : target.id === 'provenance-support' ? 550 : 540;
  const layer = target.id === 'relay-component' ? 581 : target.id === 'relay-console' ? 551
    : target.id === 'provenance-support' ? 566 : 556;
  return <div className={styles.fixture} data-clan-incident-prop={target.id}
    style={{ left: target.position.x, top: footY, zIndex: layer }}>
    <NativeArt asset={incidentPropManifest.assets[relay ? 'relay-cartridge' : 'trophy-memory-tablet']}
      x={0} y={0} width={relay ? target.id === 'relay-console' ? 100 : 115 : 84} height={relay ? 78 : 112} />
  </div>;
});
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
    {fixture.id === 'council-table' && <svg className={styles.holoProjection} viewBox="0 0 560 280" aria-hidden="true" data-clan-holo-projection>
      <ellipse cx="280" cy="195" rx="240" ry="62" /><ellipse cx="280" cy="150" rx="195" ry="54" />
      <path d="M40 195 280 22 520 195M95 150 280 245 475 150M280 22V245M75 195H485" />
      <circle cx="280" cy="112" r="58" /><ellipse cx="280" cy="112" rx="58" ry="19" />
      <ellipse cx="280" cy="112" rx="21" ry="58" />
      <path d="m127 142 24-12-5 20-19-8m275-55 20-9-6 20-14-11M330 198l16-17 5 21-21-4" />
      <text x="40" y="264">CONSEIL · OPÉRATIONS DU CLAN</text>
    </svg>}
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
    </div>}
    {roomId === 'entrainement' && <div className={styles.trainingCircle} aria-hidden="true" />}
    {room.fixtures.map(fixture => <Fixture key={fixture.id} fixture={fixture} />)}
    <div className={styles.floorEdge} aria-hidden="true" />
  </>;
});
