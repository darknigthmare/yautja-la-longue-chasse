"use client";

/* eslint-disable @next/next/no-img-element -- game sprites use their measured native alpha bounds */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import HunterRigPreview from "./HunterRigPreview";
import { HUNTER_RIG_CANVAS } from "./hunterRig";
import type { PhysicalShipDeckProps } from "./PhysicalShipDeck";
import { PHYSICAL_SHIP_STATIONS } from "./systems/physicalShipMotion";
import type { PhysicalShipStationId } from "./systems/shipLevelLayout";
import { controlActionShortcut } from "./controlBindingLabels";
import { DEFAULT_CONTROL_BINDINGS, matchesControlAction } from "./systems/controlBindings";
import ShipPreparationPanelV88 from "./ShipPreparationPanelV88";
import CompanionResidencePanel from "./CompanionResidencePanel";
import CompanionQuartersScene from "./CompanionQuartersScene";
import type { CompanionResidenceObservation } from "./systems/companionResidence";
import { SHIP_LEVEL_ART } from "./shipInteriorKit";
import { SHIP_LEVEL_ART_V22 } from "./shipInteriorV22";
import { SHIP_INTERIOR_25D_ART, SHIP_INTERIOR_25D_FLOOR } from "./shipInterior25dArt";
import {
  SHIP_INTERIOR_25D_METRICS as METRICS, SHIP_INTERIOR_25D_ROOMS as ROOMS,
  SHIP_INTERIOR_25D_ROOM_ORDER as ROOM_ORDER, SHIP_INTERIOR_25D_DEFAULT_ROOM as DEFAULT_ROOM,
  projectShipInterior25d, unprojectShipInterior25d, shipInterior25dSpawn,
  stepShipInterior25dActor, planShipInterior25dPath, stepShipInterior25dPath,
  nearbyShipInterior25dInteraction, shipInterior25dTransition, shipInterior25dRoomRoute,
  type ShipInterior25dActor, type ShipInterior25dPoint, type ShipInterior25dFixture,
  type ShipInterior25dDoor, type ShipInterior25dArtKey,
} from "./systems/shipInterior25d";
import styles from "./ShipInterior25D.module.css";

const WALL_HEIGHT = 240;
const ACTOR_WIDTH = 124;
const ACTOR_FOOT = ACTOR_WIDTH * HUNTER_RIG_CANVAS.groundY / HUNTER_RIG_CANVAS.width;
type Direction = "up" | "down" | "left" | "right";
interface Frame {
  roomId: PhysicalShipStationId;
  actor: ShipInterior25dActor;
  phase: number;
  moving: boolean;
  path: ShipInterior25dPoint[];
}
interface NativeArt {
  src: string; sourceWidth: number; sourceHeight: number;
  alphaBounds: { x: number; y: number; width: number; height: number };
}
const FIXTURE_ART = {
  ...SHIP_INTERIOR_25D_ART,
  archiveTerminal: SHIP_LEVEL_ART_V22.archiveTerminal,
} satisfies Record<ShipInterior25dArtKey, NativeArt>;

const freshControls = (): Record<Direction, boolean> => ({ up: false, down: false, left: false, right: false });
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const pointOnScreen = (point: ShipInterior25dPoint) => {
  const projected = projectShipInterior25d(point);
  return { x: projected.x, y: projected.y + WALL_HEIGHT };
};

/** The same eight services, on a real ground plane. All coordinates below are
 * physical floor coordinates until the one projection in the renderer. */
export default function ShipInterior25D(props: PhysicalShipDeckProps) {
  const {
    appearance, loadout, trophyDisplays = [], rankLabel = "Chasseur",
    selectedDestination = "Choisis une chasse à la carte galactique",
    suspended = false, showShortcuts = false, autoFocus = true, gamepadEnabled = true,
    highContrast = false, controlBindings = DEFAULT_CONTROL_BINDINGS, preflightV88, companions,
  } = props;
  const rootRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  const suspendedRef = useRef(suspended);
  const controlsRef = useRef(freshControls());
  const padRef = useRef({ ready: false, interact: false });
  const timersRef = useRef(new Set<number>());
  const tapRef = useRef<{ id: number; x: number; y: number; cancelled: boolean } | null>(null);
  const [frame, setFrame] = useState<Frame>(() => ({ roomId: DEFAULT_ROOM, actor: shipInterior25dSpawn(DEFAULT_ROOM), phase: 0, moving: false, path: [] }));
  const frameRef = useRef(frame);
  const [viewport, setViewport] = useState({ width: 1100, height: 570 });
  const [planOpen, setPlanOpen] = useState(false);
  const [waypoint, setWaypoint] = useState<PhysicalShipStationId | null>(null);
  const waypointRef = useRef(waypoint);
  const [status, setStatus] = useState("Pont prêt. Clique sur le sol pour marcher, ou utilise les commandes de déplacement.");
  const [reducedMotion, setReducedMotion] = useState(false);
  const helpId = useId();
  const planId = useId();
  const room = ROOMS[frame.roomId];
  const nearby = nearbyShipInterior25dInteraction(frame.roomId, frame.actor);
  const serviceNearby = nearby?.type === "service" ? nearby.station.id : null;
  const route = waypoint ? shipInterior25dRoomRoute(frame.roomId, waypoint) : [];
  const nextDoor = route.length > 1 ? room.doors.find(door => door.targetRoomId === route[1]) : null;
  const interactionKey = controlActionShortcut("hunt.interact", controlBindings);
  const roomHeight = WALL_HEIGHT + projectShipInterior25d({ x: 0, y: room.depth }).y + 24;
  // A close camera on narrow screens preserves adult and equipment scale.
  const zoom = Math.min(viewport.height / roomHeight, Math.max(.58, viewport.width / room.width));
  const cameraWidth = viewport.width / zoom;
  const cameraHeight = viewport.height / zoom;
  const actorScreen = pointOnScreen(frame.actor);
  const camera = {
    x: room.width <= cameraWidth ? (room.width - cameraWidth) / 2 : clamp(actorScreen.x - cameraWidth / 2, 0, room.width - cameraWidth),
    y: roomHeight <= cameraHeight ? (roomHeight - cameraHeight) / 2 : clamp(actorScreen.y - cameraHeight * .62, 0, roomHeight - cameraHeight),
  };
  const cameraRef = useRef({ ...camera, zoom });

  useLayoutEffect(() => { propsRef.current = props; });
  useLayoutEffect(() => { cameraRef.current = { ...camera, zoom }; });
  const publish = useCallback((next: Frame) => { frameRef.current = next; setFrame(next); }, []);
  const notify = useCallback((message: string) => { setStatus(message); propsRef.current.onNotify?.(message); }, []);
  const stop = useCallback(() => {
    controlsRef.current = freshControls();
    padRef.current = { ready: false, interact: false };
    const current = frameRef.current;
    if (current.moving || current.path.length) publish({ ...current, moving: false, path: [] });
  }, [publish]);
  const cancelGuidance = useCallback(() => {
    waypointRef.current = null;
    setWaypoint(null);
    stop();
  }, [stop]);
  const observeCompanions = useCallback((): CompanionResidenceObservation | null => {
    if (suspendedRef.current) return null;
    const current = frameRef.current;
    const actual = nearbyShipInterior25dInteraction(current.roomId, current.actor);
    return actual?.type === 'service' ? { site: 'personal', roomId: current.roomId, x: current.actor.x, y: current.actor.y } : null;
  }, []);

  const openService = useCallback((id: PhysicalShipStationId) => {
    if (suspendedRef.current) return;
    stop();
    const active = propsRef.current;
    active.onInteract?.(id);
    const actions: Record<PhysicalShipStationId, (() => void) | undefined> = {
      "galaxy-map": active.onOpenMap, "wall-armory": active.onOpenArmory,
      "trophy-hall": active.onOpenTrophies, "clan-archives": active.onOpenArchives,
      "appearance-forge": active.onOpenAppearanceForge, "medical-bay": active.onOpenMedbay,
      "training-arena": active.onOpenTraining, "launch-airlock": active.onOpenAirlock,
    };
    actions[id]?.();
  }, [stop]);

  const walkTo = useCallback((point: ShipInterior25dPoint) => {
    if (suspendedRef.current) return;
    const current = frameRef.current;
    const path = planShipInterior25dPath(current.roomId, current.actor, point);
    if (!path) { notify("Ce passage est obstrué. Choisis un emplacement libre sur le sol."); return; }
    controlsRef.current = freshControls();
    publish({ ...current, path: path.points.slice(1), moving: false });
    rootRef.current?.focus({ preventScroll: true });
  }, [notify, publish]);

  const guideTo = useCallback((target: PhysicalShipStationId) => {
    if (suspendedRef.current) return;
    const current = frameRef.current;
    waypointRef.current = target;
    setWaypoint(target);
    const itinerary = shipInterior25dRoomRoute(current.roomId, target);
    if (itinerary.length === 1) {
      walkTo(ROOMS[target].station.approach);
      notify("Rejoins le poste, puis interagis pour l’utiliser.");
    } else {
      const door = ROOMS[current.roomId].doors.find(entry => entry.targetRoomId === itinerary[1]);
      if (door) walkTo(door);
      notify("Route vers " + ROOMS[target].label + ". Confirme chaque passage à la porte.");
    }
    setPlanOpen(false);
  }, [notify, walkTo]);

  const interact = useCallback(() => {
    if (suspendedRef.current) return;
    const current = frameRef.current;
    const actual = nearbyShipInterior25dInteraction(current.roomId, current.actor);
    if (!actual) { notify("Approche-toi d’une installation ou d’un passage."); return; }
    if (actual.type === "service") { openService(actual.station.id); return; }
    const destination = shipInterior25dTransition(current.roomId, actual.door.id, current.actor);
    if (!destination) { notify("Le seuil doit être libre et à portée pour passer."); return; }
    stop();
    let path: ShipInterior25dPoint[] = [];
    const target = waypointRef.current;
    if (target) {
      const itinerary = shipInterior25dRoomRoute(destination.roomId, target);
      const goal = itinerary.length === 1 ? ROOMS[destination.roomId].station.approach : ROOMS[destination.roomId].doors.find(door => door.targetRoomId === itinerary[1]);
      if (goal) path = planShipInterior25dPath(destination.roomId, destination.actor, goal)?.points.slice(1) ?? [];
    }
    publish({ ...current, ...destination, phase: 0, moving: false, path });
    notify((actual.door.kind === "lift" ? "Liaison entre les ponts · " : "Passage franchi · ") + ROOMS[destination.roomId].label);
    rootRef.current?.focus({ preventScroll: true });
  }, [notify, openService, publish, stop]);
  const interactRef = useRef(interact);
  useLayoutEffect(() => { interactRef.current = interact; });

  useLayoutEffect(() => {
    suspendedRef.current = suspended;
    stop();
    if (!suspended && autoFocus) rootRef.current?.focus({ preventScroll: true });
  }, [autoFocus, stop, suspended]);

  useEffect(() => {
    propsRef.current.onStationProximityChange?.(suspended ? null : serviceNearby);
  }, [serviceNearby, suspended]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const resize = () => {
      const rect = element.getBoundingClientRect();
      setViewport(previous => previous.width === rect.width && previous.height === rect.height ? previous : { width: rect.width, height: rect.height });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => setReducedMotion(query.matches);
    changed(); query.addEventListener("change", changed);
    return () => query.removeEventListener("change", changed);
  }, []);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent, pressed: boolean) => {
      if (suspendedRef.current || document.hidden) return;
      if (pressed && (event.defaultPrevented || !(rootRef.current?.contains(document.activeElement)))) return;
      if (pressed && event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|SELECT|TEXTAREA|BUTTON|SUMMARY)$/.test(event.target.tagName) || event.target.closest('[data-companion-residence-panel]'))) return;
      const actions = [["hunt.moveLeft", "left"], ["hunt.moveRight", "right"], ["hunt.moveUp", "up"], ["hunt.moveDown", "down"]] as const;
      const direction = actions.find(([action]) => matchesControlAction(action, event, controlBindings))?.[1];
      if (direction) { controlsRef.current[direction] = pressed; event.preventDefault(); }
      else if (pressed && !event.repeat && matchesControlAction("hunt.interact", event, controlBindings)) { event.preventDefault(); interactRef.current(); }
    };
    const keydown = (event: KeyboardEvent) => keyboard(event, true);
    const keyup = (event: KeyboardEvent) => keyboard(event, false);
    const visibility = () => { if (document.hidden) stop(); };
    window.addEventListener("keydown", keydown); window.addEventListener("keyup", keyup);
    window.addEventListener("blur", stop); window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", visibility);
    const timers = timersRef.current;
    return () => {
      window.removeEventListener("keydown", keydown); window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", stop); window.removeEventListener("pagehide", stop);
      document.removeEventListener("visibilitychange", visibility);
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear(); controlsRef.current = freshControls();
    };
  }, [controlBindings, stop]);

  useEffect(() => {
    let request = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
      const focused = rootRef.current?.contains(document.activeElement);
      const panelFocused = document.activeElement instanceof HTMLElement && !!document.activeElement.closest('[data-companion-residence-panel]');
      if (suspendedRef.current || document.hidden || !document.hasFocus() || !focused || panelFocused) {
        stop(); request = requestAnimationFrame(tick); return;
      }
      let horizontal = 0, vertical = 0, action = false;
      if (gamepadEnabled) {
        let pad: Gamepad | null | undefined;
        try { pad = Array.from(navigator.getGamepads?.() ?? []).find(Boolean); } catch { /* Keyboard and touch stay available. */ }
        if (pad) {
          const x = pad.axes[0] ?? 0, y = pad.axes[1] ?? 0;
          horizontal = Math.abs(x) > .22 ? x : Number(!!pad.buttons[15]?.pressed) - Number(!!pad.buttons[14]?.pressed);
          vertical = Math.abs(y) > .22 ? y : Number(!!pad.buttons[13]?.pressed) - Number(!!pad.buttons[12]?.pressed);
          action = !!pad.buttons[0]?.pressed || !!pad.buttons[2]?.pressed;
        }
      }
      if (!horizontal && !vertical && !action) padRef.current.ready = true;
      if (!padRef.current.ready) { horizontal = 0; vertical = 0; action = false; }
      const justInteracted = action && !padRef.current.interact;
      padRef.current.interact = action;
      if (justInteracted) { interactRef.current(); request = requestAnimationFrame(tick); return; }
      const held = controlsRef.current;
      const direction = { x: clamp(horizontal + Number(held.right) - Number(held.left), -1, 1), y: clamp(vertical + Number(held.down) - Number(held.up), -1, 1) };
      const current = frameRef.current;
      let actor = current.actor, path = current.path;
      if (direction.x || direction.y) {
        if (waypointRef.current) { waypointRef.current = null; setWaypoint(null); }
        path = []; actor = stepShipInterior25dActor(current.roomId, actor, direction, elapsed);
      } else if (path.length) {
        const next = stepShipInterior25dPath(current.roomId, actor, path, elapsed);
        actor = next.actor; path = next.remaining;
        if (next.arrived) notify("À destination. Interagis pour utiliser le poste ou franchir le passage.");
        if (next.blocked) { path = []; notify("Le passage est bloqué. Le chasseur s’arrête devant l’obstacle."); }
      }
      const moving = Math.hypot(actor.x - current.actor.x, actor.y - current.actor.y) > .001;
      if (moving || path !== current.path || moving !== current.moving) publish({ ...current, actor, path, moving, phase: moving ? (current.phase + elapsed * 1.7) % 1 : current.phase });
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [gamepadEnabled, notify, publish, stop]);

  const touch = (direction: Direction, pressed: boolean) => {
    if (suspendedRef.current) return;
    controlsRef.current[direction] = pressed;
    if (pressed) rootRef.current?.focus({ preventScroll: true });
  };
  const touchButton = (direction: Direction, label: string, glyph: string) => <button type="button" disabled={suspended} aria-label={label}
    data-ship-direction={direction} className={styles[direction]}
    onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); touch(direction, true); }}
    onPointerUp={() => touch(direction, false)} onPointerCancel={() => touch(direction, false)} onLostPointerCapture={() => touch(direction, false)}
    onClick={event => {
      if (event.detail !== 0) return;
      touch(direction, true);
      const timer = window.setTimeout(() => { touch(direction, false); timersRef.current.delete(timer); }, 150);
      timersRef.current.add(timer);
    }}>{glyph}</button>;
  const floorClick = (event: PointerEvent<HTMLDivElement>) => {
    if (suspended || event.button !== 0 || (event.target instanceof Element && event.target.closest("button, a"))) return;
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const view = cameraRef.current;
    const projected = { x: (event.clientX - rect.left) / view.zoom + view.x, y: (event.clientY - rect.top) / view.zoom + view.y - WALL_HEIGHT };
    walkTo(unprojectShipInterior25d(projected));
  };
  const floorPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (suspended || event.button !== 0 || (event.target instanceof Element && event.target.closest("button, a"))) return;
    tapRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, cancelled: false };
  };
  const floorPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const tap = tapRef.current;
    if (tap?.id === event.pointerId && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 10) tap.cancelled = true;
  };
  const floorPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const tap = tapRef.current;
    tapRef.current = null;
    if (tap?.id === event.pointerId && !tap.cancelled && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) <= 10) {
      waypointRef.current = null; setWaypoint(null);
      floorClick(event);
    }
  };
  const requestDoor = (door: ShipInterior25dDoor) => {
    const actual = nearbyShipInterior25dInteraction(frameRef.current.roomId, frameRef.current.actor);
    if (actual?.type === "door" && actual.door.id === door.id) interact();
    else { walkTo(door); notify("Rejoins " + door.label + ", puis interagis au seuil."); }
  };
  const stationRequest = () => {
    if (nearbyShipInterior25dInteraction(frameRef.current.roomId, frameRef.current.actor)?.type === "service") interact();
    else walkTo(ROOMS[frameRef.current.roomId].station.approach);
  };
  const inView = (point: ShipInterior25dPoint, width = 0) => {
    const p = pointOnScreen(point);
    return p.x - width / 2 >= camera.x && p.x + width / 2 <= camera.x + cameraWidth && p.y > camera.y && p.y < camera.y + cameraHeight;
  };
  const interactLabel = nearby?.type === "service" ? "Utiliser · " + nearby.station.label : nearby?.type === "door" ? "Passer · " + nearby.door.label : "Approche une installation";
  const actorStyle = { left: actorScreen.x, top: actorScreen.y, zIndex: 20 + Math.round(frame.actor.y) };
  const wall = frame.roomId === "galaxy-map" ? SHIP_LEVEL_ART.wallObservatory : ["trophy-hall", "clan-archives"].includes(frame.roomId) ? SHIP_LEVEL_ART.wallSanctum : SHIP_LEVEL_ART.wallMachinery;
  const stationScreen = pointOnScreen(room.station.approach);

  return <section ref={rootRef} className={styles.interior + " physical-ship-deck"} role="region"
    aria-label="Intérieur du vaisseau Yautja en 2,5D, huit salles reliées sur deux ponts" aria-describedby={helpId}
    tabIndex={suspended ? -1 : 0} inert={suspended} aria-hidden={suspended || undefined} data-screen-focus
    data-ship-interior="2.5d" data-ship-room={frame.roomId} data-ship-deck={room.deck} data-suspended={suspended}
    data-player-x={frame.actor.x.toFixed(2)} data-player-y={frame.actor.y.toFixed(2)} data-ship-navigation={frame.path.length > 0}
    data-ship-projection="homeworld-35" data-ship-nearby={serviceNearby ?? nearby?.type ?? "none"}
    style={{ "--ship-accent": highContrast ? "#ffffff" : room.accent } as CSSProperties}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>VAISSEAU DE CHASSE · {rankLabel}</p><h2>{room.label}</h2></div>
      <div className={styles.headingActions}><span>{room.deck === "upper" ? "PONT SUPÉRIEUR" : "PONT INFÉRIEUR"}</span>
        <button type="button" disabled={suspended} data-ship-plan-toggle aria-expanded={planOpen} aria-controls={planId} onClick={() => setPlanOpen(!planOpen)}>{planOpen ? "Fermer le plan" : "Plan du vaisseau"}</button></div>
    </header>
    <div ref={viewportRef} className={styles.viewport} data-ship-viewport onPointerDown={floorPointerDown} onPointerMove={floorPointerMove}
      onPointerUp={floorPointerUp} onPointerCancel={() => { tapRef.current = null; }} aria-label="Salle parcourable en profondeur, caméra suivant le chasseur">
      <div ref={worldRef} className={styles.world} data-ship-world style={{ width: room.width, height: roomHeight, transform: "translate(" + -camera.x * zoom + "px," + -camera.y * zoom + "px) scale(" + zoom + ")" }}>
        <div className={styles.wall} style={{ height: WALL_HEIGHT, backgroundImage: "url('" + wall.src + "')" }} aria-hidden="true" />
        <div className={styles.floor} style={{ top: WALL_HEIGHT, width: room.width, height: room.depth, transform: "scaleY(" + projectShipInterior25d({ x: 0, y: 1 }).y + ")" }} aria-hidden="true">
          <img data-ship-floor src={SHIP_INTERIOR_25D_FLOOR.src} alt="" draggable={false} />
        </div>
        <div className={styles.wallLight} style={{ top: WALL_HEIGHT - 4 }} aria-hidden="true" />
        <div className={styles.floorRim} style={{ top: roomHeight - 26 }} aria-hidden="true" />
        <div className={styles.roomGlyph} aria-hidden="true">{String(ROOM_ORDER.indexOf(frame.roomId) + 1).padStart(2, "0")}</div>
        {room.fixtures.map(fixture => <Fixture key={fixture.id} fixture={fixture} actor={frame.actor} />)}
        {companions && <CompanionQuartersScene save={companions.save} site="personal" shipId={companions.selectedShipId} roomId={frame.roomId} />}
        {frame.roomId === "trophy-hall" && trophyDisplays.slice(0, 4).map((trophy, index) => <div className={styles.trophy} key={trophy.id} style={{ left: 260 + index * 185, top: 50 }}>
          <img src={trophy.image} alt={trophy.label} draggable={false} /><span>{trophy.label}</span>
        </div>)}
        {room.doors.map(door => {
          const point = pointOnScreen(door);
          const ready = nearby?.type === "door" && nearby.door.id === door.id;
          return <div key={door.id} className={styles.door} data-ship-door={door.id} data-door-side={door.side} data-door-ready={ready}
            style={{ left: point.x, top: point.y, zIndex: 18 + Math.round(door.y) }}>
            {door.side === "north" ? <><span className={styles.doorVoid} /><Art asset={SHIP_LEVEL_ART.doorFrame} width={170} height={210} /></> : <span className={styles.sidePassage} aria-hidden="true" />}
            <button type="button" disabled={suspended} data-ship-door-target={door.targetRoomId} tabIndex={inView(door, 120) ? 0 : -1}
              className={styles.doorTarget} aria-label={(ready ? "Passer vers " : "Marcher vers ") + ROOMS[door.targetRoomId].label} onClick={() => requestDoor(door)}>
              <span aria-hidden="true">{door.kind === "lift" ? "↕" : door.side === "west" ? "←" : "→"}</span>{ROOMS[door.targetRoomId].label}</button>
            <span className={styles.threshold} aria-hidden="true" />
          </div>;
        })}
        <button type="button" className={styles.beacon} data-ship-service-target={room.id} data-service-ready={!!serviceNearby}
          disabled={suspended} tabIndex={inView(room.station.approach, 80) ? 0 : -1}
          style={{ left: stationScreen.x, top: stationScreen.y, zIndex: 19 + Math.round(room.station.approach.y) }} aria-label={"Rejoindre " + room.station.label} onClick={stationRequest}>
          <span aria-hidden="true" /><strong>{room.station.label}</strong>
        </button>
        {frame.path.length > 0 && <div className={styles.destination} aria-hidden="true" style={{ left: pointOnScreen(frame.path[frame.path.length - 1]).x, top: pointOnScreen(frame.path[frame.path.length - 1]).y }} />}
        <div className={styles.actor} style={actorStyle} data-ship-actor data-actor-depth={Math.round(frame.actor.y)} data-actor-moving={frame.moving}>
          <span className={styles.actorShadow} />
          <HunterRigPreview appearance={appearance} armorId={loadout.armorId} weaponIds={loadout.weaponIds} gearIds={loadout.gearIds}
            size={ACTOR_WIDTH} pose={frame.moving && !suspended && !reducedMotion ? "run" : "idle"} phase={reducedMotion ? 0 : frame.phase}
            speed={frame.moving && !suspended ? METRICS.speed : 0} facing={frame.actor.facing} label="Ton chasseur équipé dans le vaisseau"
            style={{ position: "absolute", left: -ACTOR_WIDTH / 2, top: -ACTOR_FOOT }} />
        </div>
      </div>
      <div className={styles.vignette} aria-hidden="true" />
      <span className={styles.roomName} aria-hidden="true">{room.label}</span>
      {waypoint && <aside className={styles.routeHint}><span>{ROOMS[waypoint].label}<small>{nextDoor ? "Passage : " + nextDoor.label : "Rejoindre le poste dans cette salle"}</small></span>
        <button type="button" aria-label="Annuler le guidage" onClick={cancelGuidance}>×</button></aside>}
      {suspended && <div className={styles.suspended} aria-hidden="true">Consultation en cours</div>}
    </div>
    {planOpen && <nav id={planId} className={styles.plan} aria-label="Plan du vaisseau, guidage physique vers les huit installations">
      {(["upper", "lower"] as const).map(deck => <div key={deck}><h3>{deck === "upper" ? "Pont supérieur" : "Pont inférieur"}</h3><div className={styles.planRooms}>
        {ROOM_ORDER.filter(id => ROOMS[id].deck === deck).map(id => <button type="button" key={id} disabled={suspended} aria-current={frame.roomId === id ? "location" : undefined}
          data-ship-guide={id} onClick={() => guideTo(id)}><span>{String(ROOM_ORDER.indexOf(id) + 1).padStart(2, "0")}</span>{ROOMS[id].label}</button>)}
      </div></div>)}<p>La balise guide tes pas. Au seuil, confirme le passage pour rejoindre la salle suivante.</p>
    </nav>}
    <div className={styles.controls}>
      <div className={styles.dpad} aria-label="Commandes tactiles de déplacement">
        {touchButton("up", "Marcher vers le fond", "↑")}{touchButton("left", "Marcher à gauche", "←")}
        {touchButton("down", "Marcher vers l’avant", "↓")}{touchButton("right", "Marcher à droite", "→")}
      </div>
      <div className={styles.context}><strong>{nearby?.type === "service" ? nearby.station.label : "Circulation à bord"}</strong>
        <span>{frame.roomId === "launch-airlock" ? selectedDestination : "Clique au sol pour te déplacer autour des équipements."}</span></div>
      <div className={styles.actions}>
        <button type="button" disabled={suspended || !nearby} className={styles.interact} data-ship-interact onClick={interact}><kbd>{interactionKey} / A</kbd>{interactLabel}</button>
        <div><button type="button" disabled={suspended} data-ship-approach-service onClick={stationRequest}>Rejoindre le poste</button>
          <button type="button" disabled={suspended || (!frame.path.length && !waypoint)} onClick={cancelGuidance}>Arrêter le trajet</button></div>
      </div>
    </div>
    <p className={styles.status} role="status" aria-live="polite">{status}</p>
    {companions && <CompanionResidencePanel controlled={companions} site="personal" suspended={suspended} stationId={serviceNearby}
      observe={observeCompanions} onNavigate={roomId => { if (ROOM_ORDER.includes(roomId as PhysicalShipStationId)) guideTo(roomId as PhysicalShipStationId); }} />}
    {preflightV88 && <ShipPreparationPanelV88 key={serviceNearby ?? "navigation"} controlled={preflightV88} stationId={serviceNearby} suspended={suspended}
      observe={() => {
        if (suspendedRef.current) return null;
        const current = frameRef.current;
        const actual = nearbyShipInterior25dInteraction(current.roomId, current.actor);
        return actual?.type === "service" ? { space: "ship-ground-v1", roomId: current.roomId, stationId: actual.station.id, x: current.actor.x, y: current.actor.y } : null;
      }} />}
    <details className={styles.help}><summary>Commandes du chasseur</summary><p id={helpId}>Déplacement : {controlActionShortcut("hunt.moveLeft", controlBindings)} / {controlActionShortcut("hunt.moveRight", controlBindings)} et {controlActionShortcut("hunt.moveUp", controlBindings)} / {controlActionShortcut("hunt.moveDown", controlBindings)}, stick ou clic au sol. Interaction : {interactionKey} / A. Une commande de déplacement interrompt le trajet guidé.</p></details>
    {showShortcuts && <details className={styles.shortcuts} data-ship-shortcuts><summary>Accès direct aux interfaces</summary><p>Les raccourcis conservent ta position et ne valident aucune inspection physique.</p><nav aria-label="Accès alternatif aux interfaces, la position du chasseur est conservée">
      {PHYSICAL_SHIP_STATIONS.map(station => <button key={station.id} type="button" data-ship-shortcut={station.id} disabled={suspended} onClick={() => openService(station.id)}><strong>{station.shortLabel}</strong><span>Ouvrir l’interface</span></button>)}
    </nav></details>}
  </section>;
}

function Art({ asset, width, height }: { asset: NativeArt; width: number; height: number }) {
  const bounds = asset.alphaBounds;
  const scale = Math.min(width / bounds.width, height / bounds.height);
  return <span className={styles.art} data-ship-art={asset.src} style={{ left: -bounds.width * scale / 2, top: -bounds.height * scale, width: bounds.width * scale, height: bounds.height * scale }}>
    <img src={asset.src} alt="" draggable={false} style={{ left: -bounds.x * scale, top: -bounds.y * scale, width: asset.sourceWidth * scale, height: asset.sourceHeight * scale }} />
  </span>;
}

function Fixture({ fixture, actor }: { fixture: ShipInterior25dFixture; actor: ShipInterior25dActor }) {
  const point = pointOnScreen(fixture);
  const actorPoint = pointOnScreen(actor);
  const occludes = actor.y < fixture.y && Math.abs(actor.x - fixture.x) < fixture.width / 2 + 22 && actorPoint.y > point.y - fixture.height && actorPoint.y - ACTOR_FOOT < point.y;
  return <div className={styles.fixture} data-ship-fixture={fixture.id} data-occluding={occludes} data-fixture-depth={Math.round(fixture.y)}
    style={{ left: point.x, top: point.y, zIndex: 20 + Math.round(fixture.y) }}>
    <span className={styles.fixtureShadow} style={{ width: fixture.footprint.width, height: projectShipInterior25d({ x: 0, y: fixture.footprint.depth }).y }} />
    <div className={styles.fixtureBody} style={{ opacity: occludes ? .28 : 1 }}><Art asset={FIXTURE_ART[fixture.artKey]} width={fixture.width} height={fixture.height} /></div>
  </div>;
}
