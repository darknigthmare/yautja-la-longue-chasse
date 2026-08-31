"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { controlActionShortcut } from "./controlBindingLabels";
import {
  DEFAULT_CONTROL_BINDINGS,
  matchesControlAction,
  type ControlBindings,
} from "./systems/controlBindings";

import ShipLevelScene, { ShipLevelMiniMap } from "./ShipLevelScene";
import "./ship-level.css";
import type { HunterAppearance, Loadout } from "./types";
import {
  PHYSICAL_SHIP_STATIONS,
  PHYSICAL_SHIP_LADDERS as LADDERS,
  SHIP_LEVEL_SHAFTS,
  clampPhysicalShip as clamp,
  clearPhysicalShipControls,
  createPhysicalShipMotion,
  createShipDoorStates,
  stepShipDoorStates,
  getShipCamera,
  shipRoomAt,
  gatePhysicalShipGamepad,
  nearestPhysicalShipStation as nearestStationFor,
  resolvePhysicalShipInput,
  stepPhysicalShipMotion,
  type PhysicalShipMotion as PlayerMotion,
  type PhysicalShipHeldControls as HeldControls,
  type PhysicalShipStationDefinition,
  type PhysicalShipStationId,
} from "./systems/physicalShipMotion";

export { PHYSICAL_SHIP_STATIONS } from "./systems/physicalShipMotion";
export type { PhysicalShipStationDefinition, PhysicalShipStationId } from "./systems/physicalShipMotion";

export interface PhysicalShipTrophyDisplay {
  id: string;
  label: string;
  image: string;
}

export interface PhysicalShipDeckProps {
  appearance: HunterAppearance;
  loadout: Loadout;
  trophyDisplays?: readonly PhysicalShipTrophyDisplay[];
  rankLabel?: string;
  selectedDestination?: string;
  /** Keep the deck mounted under station overlays to preserve the hunter's position. */
  suspended?: boolean;
  showShortcuts?: boolean;
  controlBindings?: ControlBindings;
  autoFocus?: boolean;
  gamepadEnabled?: boolean;
  highContrast?: boolean;
  onOpenMap?: () => void;
  onOpenArmory?: () => void;
  onOpenTrophies?: () => void;
  onOpenArchives?: () => void;
  onOpenAppearanceForge?: () => void;
  onOpenMedbay?: () => void;
  onOpenTraining?: () => void;
  onOpenAirlock?: () => void;
  /** Generic telemetry hook, called in addition to the station callback. */
  onInteract?: (stationId: PhysicalShipStationId) => void;
  onStationProximityChange?: (stationId: PhysicalShipStationId | null) => void;
  onNotify?: (message: string) => void;
}

/** Guidance never moves the hunter and only uses shafts that join both decks. */
export function shipWaypointGuidance(player: Pick<PlayerMotion, "x" | "y">, waypoint: PhysicalShipStationDefinition): string {
  const shafts = LADDERS.filter((ladder) => SHIP_LEVEL_SHAFTS.some((shaft) => shaft.id === ladder.id));
  const occupiedShaft = shafts.find((ladder) => Math.abs(player.x - ladder.x) < 100 && player.y > ladder.top + 1 && player.y < ladder.bottom - 1);
  if (occupiedShaft) return waypoint.y <= occupiedShaft.top ? "↑ Puits de liaison · continuer à monter" : "↓ Puits de liaison · continuer à descendre";
  const originDeck = shipRoomAt(player)?.deckY ?? (player.y < 980 ? 700 : 1360);
  if (Math.abs(originDeck - waypoint.y) > 1) {
    const ladder = shafts.filter((entry) => entry.top <= Math.min(originDeck, waypoint.y) && entry.bottom >= Math.max(originDeck, waypoint.y))
      .sort((a, b) => Math.abs(a.x - player.x) + Math.abs(a.x - waypoint.x) - Math.abs(b.x - player.x) - Math.abs(b.x - waypoint.x))[0];
    if (ladder) return `${ladder.x < player.x ? "←" : "→"} Puits de liaison · ${waypoint.y < originDeck ? "monter" : "descendre"}`;
  }
  if (nearestStationFor(player)?.id === waypoint.id) return "Station à portée";
  const room = shipRoomAt(player);
  if (room?.id === waypoint.id && player.y < waypoint.y - 24) {
    const access = LADDERS.filter((ladder) => ladder.x >= room.x && ladder.x <= room.x + room.width && ladder.top <= player.y + 1 && ladder.bottom >= waypoint.y)
      .sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))[0];
    return access ? `${access.x < player.x ? "←" : "→"} Échelle de la salle · descendre` : "↓ Rejoindre le plancher de la salle";
  }
  return `${waypoint.x < player.x ? "←" : "→"} Suivre la coursive`;
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.tagName === "BUTTON")
  );
}

/**
 * A fully traversable ship menu. The avatar is the primary navigation method;
 * focusable stations remain available as an accessibility shortcut.
 */
export default function PhysicalShipDeck({
  appearance,
  loadout,
  trophyDisplays = [],
  rankLabel = "Chasseur",
  selectedDestination = "Choisis une chasse à la carte galactique",
  suspended = false,
  showShortcuts = false,
  controlBindings = DEFAULT_CONTROL_BINDINGS,
  autoFocus = true,
  gamepadEnabled = true,
  highContrast = false,
  onOpenMap,
  onOpenArmory,
  onOpenTrophies,
  onOpenArchives,
  onOpenAppearanceForge,
  onOpenMedbay,
  onOpenTraining,
  onOpenAirlock,
  onInteract,
  onStationProximityChange,
  onNotify,
}: PhysicalShipDeckProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HeldControls>(clearPhysicalShipControls());
  const previousGamepadRef = useRef({ jump: false, interact: false });
  const gamepadReadyRef = useRef(false);
  const suspendedRef = useRef(suspended);
  const previousStationRef = useRef<PhysicalShipStationId | null>(null);
  const [player, setPlayer] = useState<PlayerMotion>(createPhysicalShipMotion);
  const playerRef = useRef(player);
  const [doors, setDoors] = useState(createShipDoorStates);
  const doorsRef = useRef(doors);
  const [cameraSize, setCameraSize] = useState({ width: 1100, height: 650 });
  const [mapOpen, setMapOpen] = useState(false);
  const [waypointId, setWaypointId] = useState<PhysicalShipStationId | null>(null);
  const [status, setStatus] = useState(
    "Pont prêt. Approche-toi d’une station puis interagis.",
  );
  const interactionShortcut = controlActionShortcut(
    "hunt.interact",
    controlBindings,
  );

  const nearbyStation = useMemo(() => nearestStationFor(player), [player]);

  const notify = useCallback(
    (message: string) => {
      setStatus(message);
      onNotify?.(message);
    },
    [onNotify],
  );

  const activateStation = useCallback(
    (station: PhysicalShipStationDefinition) => {
      if (suspendedRef.current) return;
      controlsRef.current = clearPhysicalShipControls();
      onInteract?.(station.id);
      if (station.id === "galaxy-map") onOpenMap?.();
      if (station.id === "wall-armory") onOpenArmory?.();
      if (station.id === "trophy-hall") onOpenTrophies?.();
      if (station.id === "clan-archives") onOpenArchives?.();
      if (station.id === "appearance-forge") onOpenAppearanceForge?.();
      if (station.id === "medical-bay") onOpenMedbay?.();
      if (station.id === "training-arena") onOpenTraining?.();
      if (station.id === "launch-airlock") onOpenAirlock?.();
      notify(`${station.label} activée.`);
    },
    [
      notify,
      onInteract,
      onOpenArchives,
      onOpenAppearanceForge,
      onOpenArmory,
      onOpenMap,
      onOpenMedbay,
      onOpenTrophies,
      onOpenTraining,
      onOpenAirlock,
    ],
  );

  const interactFromAvatar = useCallback(() => {
    if (suspendedRef.current) return;
    const station = nearestStationFor(playerRef.current);
    if (station) {
      activateStation(station);
      return;
    }
    notify("Aucune station à portée. Suis le marqueur lumineux.");
  }, [activateStation, notify]);

  const interactRef = useRef(interactFromAvatar);
  useEffect(() => {
    interactRef.current = interactFromAvatar;
  }, [interactFromAvatar]);

  // Releasing held controls on both edges prevents a stale key or pad from
  // moving the hunter as a modal closes. The physics state stays mounted.
  useLayoutEffect(() => {
    suspendedRef.current = suspended;
    controlsRef.current = clearPhysicalShipControls();
    previousGamepadRef.current = { jump: false, interact: false };
    gamepadReadyRef.current = false;
    if (!suspended && autoFocus) rootRef.current?.focus({ preventScroll: true });
  }, [autoFocus, suspended]);

  // Camera units follow the viewport ratio, so mobile keeps the same readable
  // character scale instead of scrolling a shrunken picture of the entire ship.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const resize = () => {
      const bounds = viewport.getBoundingClientRect();
      const height = Math.round(clamp(bounds.height / 0.82, 360, 760));
      const width = Math.round(clamp(height * bounds.width / Math.max(1, bounds.height), 320, 2000));
      setCameraSize((current) => current.width === width && current.height === height ? current : { width, height });
    };
    resize();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (suspended) return;
    const stationId = nearbyStation?.id ?? null;
    if (stationId === previousStationRef.current) return;
    previousStationRef.current = stationId;
    onStationProximityChange?.(stationId);
    if (nearbyStation) {
      onNotify?.(
        `${nearbyStation.label} à portée. ${interactionShortcut} / X pour utiliser.`,
      );
    }
  }, [interactionShortcut, nearbyStation, onNotify, onStationProximityChange, suspended]);

  // Keyboard state is sampled by the same fixed physics loop as touch/gamepad.
  useEffect(() => {
    const clearControls = () => {
      controlsRef.current = clearPhysicalShipControls();
      previousGamepadRef.current = { jump: false, interact: false };
      gamepadReadyRef.current = false;
    };
    const changeKey = (event: KeyboardEvent, pressed: boolean) => {
      if (suspendedRef.current || document.hidden) return;
      if (pressed) {
        if (event.defaultPrevented || isEditableTarget(event.target)) return;
        if (
          event.target instanceof HTMLButtonElement &&
          (event.key === "Enter" || event.key === " ")
        ) {
          return;
        }
        const root = rootRef.current;
        if (
          !root ||
          (document.activeElement !== root &&
            !root.contains(document.activeElement))
        ) {
          return;
        }
      }
      if (matchesControlAction("hunt.moveLeft", event, controlBindings)) {
        controlsRef.current.left = pressed;
      } else if (matchesControlAction("hunt.moveRight", event, controlBindings)) {
        controlsRef.current.right = pressed;
      } else if (matchesControlAction("hunt.moveUp", event, controlBindings)) {
        controlsRef.current.up = pressed;
      } else if (matchesControlAction("hunt.moveDown", event, controlBindings)) {
        controlsRef.current.down = pressed;
      } else if (
        matchesControlAction("hunt.jump", event, controlBindings) &&
        pressed
      ) {
        controlsRef.current.jumpQueued = true;
      } else if (
        matchesControlAction("hunt.interact", event, controlBindings) &&
        pressed &&
        !event.repeat
      ) {
        interactRef.current();
      } else {
        return;
      }
      event.preventDefault();
    };
    const keyDown = (event: KeyboardEvent) => changeKey(event, true);
    const keyUp = (event: KeyboardEvent) => changeKey(event, false);
    const visibilityChange = () => {
      if (document.hidden) clearControls();
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", clearControls);
    window.addEventListener("pagehide", clearControls);
    document.addEventListener("visibilitychange", visibilityChange);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clearControls);
      window.removeEventListener("pagehide", clearControls);
      document.removeEventListener("visibilitychange", visibilityChange);
      clearControls();
    };
  }, [controlBindings]);

  useEffect(() => {
    let frameId = 0;
    let previousTime = performance.now();
    const frame = (time: number) => {
      const deltaSeconds = Math.min(0.034, Math.max(0, (time - previousTime) / 1_000));
      previousTime = time;
      const root = rootRef.current;
      const active = !suspendedRef.current && !document.hidden && document.hasFocus() && Boolean(root?.contains(document.activeElement));
      if (!active) {
        controlsRef.current = clearPhysicalShipControls();
        previousGamepadRef.current = { jump: false, interact: false };
        gamepadReadyRef.current = false;
        frameId = window.requestAnimationFrame(frame);
        return;
      }

      let sample = { horizontal: 0, vertical: 0, jump: false, interact: false };
      if (gamepadEnabled && typeof navigator.getGamepads === "function") {
        const gamepad = Array.from(navigator.getGamepads()).find(Boolean);
        if (gamepad) {
          const axisX = gamepad.axes[0] ?? 0;
          const axisY = gamepad.axes[1] ?? 0;
          sample = {
            horizontal: Math.abs(axisX) > 0.22 ? axisX : Number(gamepad.buttons[15]?.pressed ?? false) - Number(gamepad.buttons[14]?.pressed ?? false),
            vertical: Math.abs(axisY) > 0.22 ? axisY : Number(gamepad.buttons[13]?.pressed ?? false) - Number(gamepad.buttons[12]?.pressed ?? false),
            jump: gamepad.buttons[0]?.pressed ?? false,
            interact: (gamepad.buttons[2]?.pressed ?? false) || (gamepad.buttons[3]?.pressed ?? false),
          };
        }
      }
      const gated = gatePhysicalShipGamepad(sample, gamepadReadyRef.current, false);
      gamepadReadyRef.current = gated.ready;
      sample = gated.sample;
      if (sample.interact && !previousGamepadRef.current.interact) interactRef.current();
      const input = resolvePhysicalShipInput(controlsRef.current, { ...sample, jump: sample.jump && !previousGamepadRef.current.jump }, suspendedRef.current);
      previousGamepadRef.current = { jump: sample.jump, interact: sample.interact };
      controlsRef.current.jumpQueued = false;
      const nextDoors = stepShipDoorStates(doorsRef.current, playerRef.current, deltaSeconds, suspendedRef.current);
      if (nextDoors !== doorsRef.current) {
        doorsRef.current = nextDoors;
        setDoors(nextDoors);
      }
      const next = stepPhysicalShipMotion(playerRef.current, input, deltaSeconds, suspendedRef.current, nextDoors);
      if (next !== playerRef.current) {
        playerRef.current = next;
        setPlayer(next);
      }
      frameId = window.requestAnimationFrame(frame);
    };
    frameId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(frameId);
  }, [gamepadEnabled]);

  const setHeldControl = useCallback(
    (control: keyof Omit<HeldControls, "jumpQueued">, pressed: boolean) => {
      if (suspendedRef.current) return;
      controlsRef.current[control] = pressed;
      if (pressed) rootRef.current?.focus({ preventScroll: true });
    },
    [],
  );

  const pulseControl = useCallback(
    (control: keyof Omit<HeldControls, "jumpQueued">) => {
      setHeldControl(control, true);
      window.setTimeout(() => setHeldControl(control, false), 140);
    },
    [setHeldControl],
  );

  const queueJump = useCallback(() => {
    if (suspendedRef.current) return;
    controlsRef.current.jumpQueued = true;
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  const selectWaypoint = useCallback((stationId: PhysicalShipStationId) => {
    if (suspendedRef.current) return;
    const station = PHYSICAL_SHIP_STATIONS.find((entry) => entry.id === stationId);
    if (!station) return;
    setWaypointId(stationId);
    notify(`${station.label} balisée. Rejoins la salle par les coursives et les puits.`);
    rootRef.current?.focus({ preventScroll: true });
  }, [notify]);

  const requestStation = useCallback((station: PhysicalShipStationDefinition) => {
    if (suspendedRef.current) return;
    if (nearestStationFor(playerRef.current)?.id === station.id) activateStation(station);
    else selectWaypoint(station.id);
  }, [activateStation, selectWaypoint]);

  const accent = highContrast ? "#ffffff" : "#70f4cf";
  const warning = highContrast ? "#ffff00" : "#ffb85c";
  const activeId = nearbyStation?.id ?? null;
  const camera = getShipCamera(player, cameraSize);
  const room = shipRoomAt(player);
  const waypoint = PHYSICAL_SHIP_STATIONS.find((station) => station.id === waypointId);
  const routeHint = waypoint ? shipWaypointGuidance(player, waypoint) : null;

  return (
    <section
      ref={rootRef}
      className="physical-ship-deck ship-level-deck"
      data-screen-focus
      tabIndex={suspended ? -1 : 0}
      inert={suspended}
      aria-hidden={suspended || undefined}
      data-suspended={suspended}
      data-player-x={Math.round(player.x)}
      data-player-y={Math.round(player.y)}
      data-ship-room={room?.id ?? "corridor"}
      role="region"
      aria-label="Intérieur du vaisseau Yautja, huit salles reliées sur deux ponts"
      aria-describedby="physical-deck-help"
      onPointerDown={(event) => {
        if (suspended || (event.target instanceof Element &&
          event.target.closest('button, [role="button"], a, input, select, textarea'))) return;
        rootRef.current?.focus({ preventScroll: true });
      }}
      style={{ ...styles.root, "--deck-accent": accent } as CSSProperties}
    >
      <header className="ship-level-header">
        <div>
          <p style={styles.eyebrow}>VAISSEAU DE CHASSE · {rankLabel.toLocaleUpperCase("fr")}</p>
          <h2 style={styles.title}>{room?.label ?? "Coursive de liaison"}</h2>
        </div>
        <button className="ship-level-map-toggle" type="button" disabled={suspended} aria-expanded={mapOpen} aria-controls="ship-level-plan" onClick={() => setMapOpen((open) => !open)}>
          {mapOpen ? "FERMER LE PLAN" : "PLAN DU VAISSEAU"}
        </button>
      </header>

      <div ref={viewportRef} className="physical-ship-deck__viewport ship-level-viewport" role="group" aria-label="Vue rapprochée du niveau, caméra suivant le chasseur">
        <ShipLevelScene player={player} camera={camera} doors={doors} appearance={appearance} loadout={loadout}
          trophyDisplays={trophyDisplays} suspended={suspended} highContrast={highContrast}
          activeStationId={activeId} waypointId={waypointId} onStationRequest={requestStation} />
        <div className="ship-level-location" aria-hidden="true">
          <span>{player.y < 980 ? "PONT SUPÉRIEUR" : "PONT INFÉRIEUR"}</span>
          <strong>{room?.label ?? "LIAISON"}</strong>
        </div>
        {waypoint && <div className="ship-level-waypoint" role="status">
          <span>{waypoint.shortLabel} · {routeHint}</span>
          <button type="button" disabled={suspended} aria-label="Effacer la balise de navigation" onClick={() => setWaypointId(null)}>×</button>
        </div>}
        {mapOpen && <aside className="ship-level-minimap" id="ship-level-plan" aria-label="Plan du vaisseau : sélectionner une salle pose une balise sans déplacer le chasseur">
          <ShipLevelMiniMap player={player} camera={camera} activeStationId={activeId} waypointId={waypointId} suspended={suspended} onSelect={selectWaypoint} />
          <p>Choisir une salle pose une balise. Deux puits relient les ponts.</p>
        </aside>}
      <div className="physical-ship-deck__touch-controls" style={styles.touchControls} aria-label="Commandes tactiles">
        <div style={styles.directionPad}>
          <DeckDirectionButton control="up" label="Grimper" glyph="▲" suspended={suspended} onHeldControl={setHeldControl} onPulseControl={pulseControl} />
          <div style={styles.controlRow}>
            <DeckDirectionButton control="left" label="Aller à gauche" glyph="◀" suspended={suspended} onHeldControl={setHeldControl} onPulseControl={pulseControl} />
            <DeckDirectionButton control="down" label="Descendre" glyph="▼" suspended={suspended} onHeldControl={setHeldControl} onPulseControl={pulseControl} />
            <DeckDirectionButton control="right" label="Aller à droite" glyph="▶" suspended={suspended} onHeldControl={setHeldControl} onPulseControl={pulseControl} />
          </div>
        </div>
        <div style={styles.actionPad}>
          <button type="button" disabled={suspended} aria-label="Sauter" style={styles.actionButton} onPointerDown={queueJump} onClick={(event) => { if (event.detail === 0) queueJump(); }}>SAUT</button>
          <button type="button" disabled={suspended} aria-label="Interagir avec la station proche" style={{ ...styles.actionButton, borderColor: warning }} onClick={interactFromAvatar}>ACTION</button>
        </div>
      </div>
      </div>

      <div className="ship-level-readout" aria-live="polite" aria-atomic="true">
        <div><strong>{nearbyStation?.label ?? "Exploration du vaisseau"}</strong><span>{nearbyStation?.id === "launch-airlock" ? selectedDestination : nearbyStation?.description ?? status}</span></div>
        {nearbyStation ? <button type="button" disabled={suspended} onClick={interactFromAvatar} style={styles.interactButton}>UTILISER · {interactionShortcut}</button> : <span className="ship-level-door-hint">Portes automatiques à proximité</span>}
      </div>

      <details className="ship-level-help"><summary>Commandes du chasseur</summary><p id="physical-deck-help">
        Marcher : {controlActionShortcut("hunt.moveLeft", controlBindings)} / {controlActionShortcut("hunt.moveRight", controlBindings)} / stick · sauter : {controlActionShortcut("hunt.jump", controlBindings)} / A · interagir : {interactionShortcut} / X · échelles : {controlActionShortcut("hunt.moveUp", controlBindings)} / {controlActionShortcut("hunt.moveDown", controlBindings)}.
      </p></details>

      {showShortcuts && <details className="ship-level-accessibility">
        <summary>Accès direct aux interfaces · sans déplacement du chasseur</summary>
        <nav className="physical-ship-deck__station-shortcuts" aria-label="Accès alternatif aux interfaces, la position du chasseur est conservée">
          {PHYSICAL_SHIP_STATIONS.map((station) => <button key={station.id} type="button" disabled={suspended} aria-current={station.id === activeId ? "location" : undefined} onClick={() => activateStation(station)}>
            <strong>{station.shortLabel}</strong><span>Ouvrir l’interface</span>
          </button>)}
        </nav>
      </details>}


    </section>
  );
}

function DeckDirectionButton({ control, label, glyph, suspended, onHeldControl, onPulseControl }: {
  control: keyof Omit<HeldControls, "jumpQueued">;
  label: string;
  glyph: string;
  suspended: boolean;
  onHeldControl: (control: keyof Omit<HeldControls, "jumpQueued">, pressed: boolean) => void;
  onPulseControl: (control: keyof Omit<HeldControls, "jumpQueued">) => void;
}) {
  return <button type="button" disabled={suspended} aria-label={label} style={styles.controlButton}
    onPointerDown={(event) => {
      if (suspended) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      onHeldControl(control, true);
    }}
    onPointerUp={() => onHeldControl(control, false)}
    onPointerCancel={() => onHeldControl(control, false)}
    onPointerLeave={() => onHeldControl(control, false)}
    onLostPointerCapture={() => onHeldControl(control, false)}
    onClick={(event) => { if (event.detail === 0) onPulseControl(control); }}
  >{glyph}</button>;
}

const styles: Readonly<Record<string, CSSProperties>> = {
  root: {
    display: "grid",
    gap: "0.75rem",
    width: "100%",
    maxWidth: "100rem",
    margin: "0 auto",
    padding: "clamp(0.65rem, 2vw, 1rem)",
    color: "#d9eee7",
    background: "linear-gradient(145deg, #06100f, #020606)",
    border: "1px solid color-mix(in srgb, var(--deck-accent) 42%, transparent)",
  },
  eyebrow: {
    margin: 0,
    color: "var(--deck-accent)",
    fontSize: "0.72rem",
    letterSpacing: "0.16em",
  },
  title: {
    margin: "0.1rem 0 0",
    fontSize: "clamp(1.15rem, 3vw, 1.75rem)",
  },
  interactButton: {
    minHeight: "2.5rem",
    padding: "0.55rem 0.9rem",
    border: "1px solid #d9ad65",
    background: "#2c2718",
    color: "#ffe3a6",
    fontSize: "0.72rem",
    fontWeight: 800,
  },
  touchControls: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: "1rem",
    userSelect: "none",
  },
  directionPad: {
    display: "grid",
    justifyItems: "center",
    gap: "0.25rem",
  },
  controlRow: {
    display: "flex",
    gap: "0.25rem",
  },
  controlButton: {
    width: "2.8rem",
    minHeight: "2.65rem",
    border: "1px solid rgba(112, 244, 207, 0.55)",
    borderRadius: "0.25rem",
    color: "#d9eee7",
    background: "rgba(9, 29, 27, 0.94)",
    touchAction: "none",
  },
  actionPad: {
    display: "flex",
    alignItems: "end",
    gap: "0.45rem",
  },
  actionButton: {
    minWidth: "4.75rem",
    minHeight: "3.2rem",
    border: "1px solid var(--deck-accent)",
    borderRadius: "50%",
    color: "#eefaf6",
    background: "rgba(16, 42, 38, 0.95)",
    fontSize: "0.7rem",
    fontWeight: 800,
    touchAction: "manipulation",
  },
};
