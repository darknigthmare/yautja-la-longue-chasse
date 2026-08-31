"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { controlActionShortcut } from "./controlBindingLabels";
import {
  DEFAULT_CONTROL_BINDINGS,
  matchesControlAction,
  type ControlBindings,
} from "./systems/controlBindings";

import HunterRigPreview from "./HunterRigPreview";
import { SHIP_INTERIOR_KIT } from "./shipInteriorKit";
import type { HunterAppearance, Loadout } from "./types";
import {
  PHYSICAL_SHIP_WORLD,
  PHYSICAL_SHIP_STATIONS,
  PHYSICAL_SHIP_LADDERS as LADDERS,
  PHYSICAL_SHIP_SURFACES as SURFACES,
  clampPhysicalShip as clamp,
  clearPhysicalShipControls,
  createPhysicalShipMotion,
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

const WORLD_WIDTH = PHYSICAL_SHIP_WORLD.width;
const WORLD_HEIGHT = PHYSICAL_SHIP_WORLD.height;

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

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || viewport.scrollWidth <= viewport.clientWidth) return;
    const playerPosition = (player.x / WORLD_WIDTH) * viewport.scrollWidth;
    viewport.scrollLeft = clamp(
      playerPosition - viewport.clientWidth / 2,
      0,
      viewport.scrollWidth - viewport.clientWidth,
    );
  }, [player.x]);

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
      const next = stepPhysicalShipMotion(playerRef.current, input, deltaSeconds, suspendedRef.current);
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

  const stationKeyboard = (
    event: ReactKeyboardEvent<SVGGElement>,
    station: PhysicalShipStationDefinition,
  ) => {
    if (suspendedRef.current) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      activateStation(station);
    }
  };

  const accent = highContrast ? "#ffffff" : "#70f4cf";
  const warning = highContrast ? "#ffff00" : "#ffb85c";
  const activeId = nearbyStation?.id ?? null;

  return (
    <section
      ref={rootRef}
      className="physical-ship-deck"
      data-screen-focus
      tabIndex={suspended ? -1 : 0}
      inert={suspended}
      aria-hidden={suspended || undefined}
      data-suspended={suspended}
      data-player-x={Math.round(player.x)}
      data-player-y={Math.round(player.y)}
      role="region"
      aria-label="Pont physique du vaisseau Yautja"
      aria-describedby="physical-deck-help"
      onPointerDown={(event) => {
        if (suspended || (event.target instanceof Element &&
          event.target.closest('button, [role="button"], a, input, select, textarea'))) return;
        rootRef.current?.focus({ preventScroll: true });
      }}
      style={{ ...styles.root, "--deck-accent": accent } as CSSProperties}
    >
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>VAISSEAU DE CHASSE · {rankLabel.toLocaleUpperCase("fr")}</p>
          <h2 style={styles.title}>Le pont du chasseur</h2>
        </div>
        <p id="physical-deck-help" style={styles.help}>
          Marcher : {controlActionShortcut("hunt.moveLeft", controlBindings)} / {controlActionShortcut("hunt.moveRight", controlBindings)} / {controlActionShortcut("hunt.moveUp", controlBindings)} / {controlActionShortcut("hunt.moveDown", controlBindings)} / stick · sauter : {controlActionShortcut("hunt.jump", controlBindings)} / A · interagir : {interactionShortcut} / X. Grimpe aux échelles avec haut et bas.
        </p>
      </header>

      <div
        ref={viewportRef}
        className="physical-ship-deck__viewport"
        style={styles.viewport}
      >
        <svg
          className="physical-ship-deck__map"
          viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
          role="group"
          aria-label="Coupe latérale interactive du pont, avec huit stations accessibles"
          style={styles.svg}
        >
          <title>Pont physique interactif du vaisseau Yautja</title>
          <defs>
            <pattern id="deck-wall-module" patternUnits="userSpaceOnUse" width={SHIP_INTERIOR_KIT.wall.width} height={SHIP_INTERIOR_KIT.wall.height} y={PHYSICAL_SHIP_WORLD.floorY - SHIP_INTERIOR_KIT.wall.height}>
              <image href={SHIP_INTERIOR_KIT.wall.src} width={SHIP_INTERIOR_KIT.wall.width} height={SHIP_INTERIOR_KIT.wall.height} preserveAspectRatio="xMidYMid meet" />
            </pattern>
            <linearGradient id="deck-space" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#020607" />
              <stop offset="1" stopColor="#0b1d1b" />
            </linearGradient>
            <linearGradient id="deck-metal" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#172522" />
              <stop offset="0.5" stopColor="#3a4a42" />
              <stop offset="1" stopColor="#111b19" />
            </linearGradient>
            <filter id="deck-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width={WORLD_WIDTH} height={WORLD_HEIGHT} fill="url(#deck-space)" />
          {/* Repeated wall modules are cosmetic: posts cover the joins, and
              collision stays on the independent floor and gantry surfaces. */}
          <rect data-ship-wall-module={SHIP_INTERIOR_KIT.wall.id} x="0" y={PHYSICAL_SHIP_WORLD.floorY - SHIP_INTERIOR_KIT.wall.height} width={WORLD_WIDTH} height={SHIP_INTERIOR_KIT.wall.height} fill="url(#deck-wall-module)" />
          {Array.from({ length: Math.ceil(WORLD_WIDTH / SHIP_INTERIOR_KIT.wall.width) + 1 }, (_, index) => (
            <g key={index} aria-hidden="true">
              <rect x={index * SHIP_INTERIOR_KIT.wall.width - SHIP_INTERIOR_KIT.wall.jointCoverWidth / 2} y={PHYSICAL_SHIP_WORLD.floorY - SHIP_INTERIOR_KIT.wall.height} width={SHIP_INTERIOR_KIT.wall.jointCoverWidth} height={SHIP_INTERIOR_KIT.wall.height} fill="url(#deck-metal)" stroke="#34433a" strokeWidth="2" />
              <path d={`M${index * SHIP_INTERIOR_KIT.wall.width} 175 V465`} stroke="#658477" opacity="0.22" />
            </g>
          ))}
          <rect
            width={WORLD_WIDTH}
            height={WORLD_HEIGHT}
            fill="url(#deck-space)"
            opacity="0.22"
          />
          <path
            d="M20 480 L20 105 Q180 25 360 72 L700 30 L1040 72 Q1220 25 1380 105 L1380 480 Z"
            fill="none"
            stroke="#31423c"
            strokeWidth="8"
          />
          <path
            d="M35 120 Q190 55 360 96 M1040 96 Q1210 55 1365 120"
            fill="none"
            stroke="#122c29"
            strokeWidth="30"
          />
          <circle cx="700" cy="68" r="3" fill={accent} opacity="0.8" />
          <path d="M590 68 H810" stroke={accent} strokeWidth="2" opacity="0.32" />

          {/* Traversal geometry: a lower floor, an upper gantry and two ladders. */}
          {SURFACES.map((surface) => (
            <g key={surface.y} aria-hidden="true">
              <rect x={surface.left} y={surface.y} width={surface.right - surface.left} height="22" rx="3" fill="url(#deck-metal)" />
              <path d={`M${surface.left} ${surface.y + 2} H${surface.right}`} stroke={accent} opacity="0.45" />
            </g>
          ))}
          {LADDERS.map((ladder) => (
            <g key={ladder.x} stroke="#65786e" strokeWidth="6">
              <line x1={ladder.x - 17} y1={ladder.top} x2={ladder.x - 17} y2={ladder.bottom} />
              <line x1={ladder.x + 17} y1={ladder.top} x2={ladder.x + 17} y2={ladder.bottom} />
              {Array.from({ length: 7 }, (_, index) => (
                <line
                  key={index}
                  x1={ladder.x - 17}
                  y1={ladder.top + 16 + index * 22}
                  x2={ladder.x + 17}
                  y2={ladder.top + 16 + index * 22}
                  strokeWidth="4"
                />
              ))}
            </g>
          ))}

          {PHYSICAL_SHIP_STATIONS.map((station) => (
            <StationGlyph
              key={station.id}
              station={station}
              active={station.id === activeId}
              accent={accent}
              warning={warning}
              suspended={suspended}
              trophyDisplays={trophyDisplays}
              onActivate={() => activateStation(station)}
              onKeyDown={(event) => stationKeyboard(event, station)}
            />
          ))}

          {nearbyStation ? (
            <g
              transform={`translate(${nearbyStation.x} ${nearbyStation.y - 118})`}
              aria-hidden="true"
              filter="url(#deck-glow)"
            >
              <path d="M-9 -8 H9 L0 5 Z" fill={warning} />
              <text y="-18" textAnchor="middle" fill={warning} fontSize="12" fontWeight="700">
                INTERAGIR
              </text>
            </g>
          ) : null}

          <DeckHunter player={player} appearance={appearance} loadout={loadout} suspended={suspended} />
          <text x="32" y="535" fill="#88aaa0" fontSize="12" letterSpacing="2">PONT INFÉRIEUR · PRÉPARATION ET DÉPART</text>
          <text x="700" y="140" textAnchor="middle" fill={accent} fontSize="12" letterSpacing="3">PASSERELLE · ARSENAL DU CLAN</text>
        </svg>
      </div>

      <div style={styles.stationReadout} aria-live="polite" aria-atomic="true">
        <strong>{nearbyStation?.label ?? "Déplacement libre"}</strong>
        <span>{nearbyStation?.id === "launch-airlock" ? selectedDestination : nearbyStation?.description ?? status}</span>
        {nearbyStation && <button type="button" disabled={suspended} onClick={interactFromAvatar} style={styles.interactButton}>UTILISER · {interactionShortcut}</button>}
      </div>

      {showShortcuts && <nav
        className="physical-ship-deck__station-shortcuts"
        aria-label="Accès direct aux stations du pont"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(8rem, 1fr))" }}
      >
        {PHYSICAL_SHIP_STATIONS.map((station) => (
          <button
            key={station.id}
            type="button"
            disabled={suspended}
            aria-current={station.id === activeId ? "location" : undefined}
            onClick={() => activateStation(station)}
          >
            <strong>{station.shortLabel}</strong>
            <span>{station.level === "gantry" ? "Passerelle" : "Pont bas"}</span>
          </button>
        ))}
      </nav>}

      <div
        className="physical-ship-deck__touch-controls"
        style={styles.touchControls}
        aria-label="Commandes tactiles"
      >
        <div style={styles.directionPad}>
          <DeckDirectionButton control="up" label="Grimper" glyph="▲" suspended={suspended} onHeldControl={setHeldControl} onPulseControl={pulseControl} />
          <div style={styles.controlRow}>
            <DeckDirectionButton control="left" label="Aller à gauche" glyph="◀" suspended={suspended} onHeldControl={setHeldControl} onPulseControl={pulseControl} />
            <DeckDirectionButton control="down" label="Descendre" glyph="▼" suspended={suspended} onHeldControl={setHeldControl} onPulseControl={pulseControl} />
            <DeckDirectionButton control="right" label="Aller à droite" glyph="▶" suspended={suspended} onHeldControl={setHeldControl} onPulseControl={pulseControl} />
          </div>
        </div>
        <div style={styles.actionPad}>
          <button
            type="button"
            disabled={suspended}
            aria-label="Sauter"
            style={styles.actionButton}
            onPointerDown={queueJump}
            onClick={(event) => {
              if (event.detail === 0) queueJump();
            }}
          >
            SAUT
          </button>
          <button
            type="button"
            disabled={suspended}
            aria-label="Interagir avec la station proche"
            style={{ ...styles.actionButton, borderColor: warning }}
            onClick={interactFromAvatar}
          >
            ACTION
          </button>
        </div>
      </div>
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

function StationGlyph({
  station,
  active,
  accent,
  warning,
  suspended,
  trophyDisplays,
  onActivate,
  onKeyDown,
}: {
  station: PhysicalShipStationDefinition;
  active: boolean;
  accent: string;
  warning: string;
  suspended: boolean;
  trophyDisplays: readonly PhysicalShipTrophyDisplay[];
  onActivate: () => void;
  onKeyDown: (event: ReactKeyboardEvent<SVGGElement>) => void;
}) {
  const color = active ? warning : accent;
  return (
    <g
      transform={`translate(${station.x} ${station.y})`}
      role="button"
      tabIndex={suspended ? -1 : 0}
      aria-disabled={suspended}
      aria-label={`${station.label}. ${station.description}`}
      onClick={onActivate}
      onKeyDown={onKeyDown}
      style={{ cursor: "pointer" }}
    >
      <rect
        x="-70"
        y="-102"
        width="140"
        height="96"
        rx="7"
        fill={active ? "rgba(56, 64, 37, 0.92)" : "rgba(7, 24, 23, 0.94)"}
        stroke={color}
        strokeWidth={active ? 4 : 2}
      />
      {station.id === "galaxy-map" ? <MapConsole color={color} /> : null}
      {station.id === "wall-armory" ? <WallArmory color={color} /> : null}
      {station.id === "trophy-hall" ? <TrophyWall color={color} trophyDisplays={trophyDisplays} /> : null}
      {station.id === "clan-archives" ? <ArchiveConsole color={color} /> : null}
      {station.id === "appearance-forge" ? <AppearanceForgeConsole color={color} /> : null}
      {station.id === "medical-bay" ? <MedbayConsole color={color} /> : null}
      {station.id === "training-arena" ? <TrainingConsole color={color} /> : null}
      {station.id === "launch-airlock" ? <AirlockConsole color={color} /> : null}
      <text y="-113" textAnchor="middle" fill={color} fontSize="12" fontWeight="800" letterSpacing="1.4">
        {station.shortLabel}
      </text>
      <circle cx="0" cy="-2" r={active ? 7 : 4} fill={color} opacity="0.9" />
    </g>
  );
}

function MapConsole({ color }: { color: string }) {
  return (
    <g aria-hidden="true">
      <ellipse cx="0" cy="-54" rx="50" ry="30" fill="#06110f" stroke={color} />
      <circle cx="-23" cy="-61" r="5" fill={color} />
      <circle cx="18" cy="-43" r="8" fill="none" stroke={color} />
      <path d="M-23 -61 Q0 -82 18 -43 M18 -43 Q38 -58 44 -35" fill="none" stroke={color} opacity="0.75" />
    </g>
  );
}

function WallArmory({ color }: { color: string }) {
  return (
    <g aria-hidden="true" fill="none" stroke={color} strokeWidth="3">
      <path d="M-48 -83 Q-34 -98 -20 -83 V-52 Q-34 -40 -48 -52 Z" />
      <path d="M-11 -84 Q4 -101 19 -84 V-52 Q4 -39 -11 -52 Z" />
      <path d="M30 -88 Q45 -97 53 -78 V-49 Q41 -40 30 -53 Z" />
      <line x1="-53" y1="-25" x2="52" y2="-25" />
      <line x1="-28" y1="-38" x2="-28" y2="-15" />
      <line x1="29" y1="-38" x2="29" y2="-15" />
    </g>
  );
}

function TrophyWall({ color, trophyDisplays }: { color: string; trophyDisplays: readonly PhysicalShipTrophyDisplay[] }) {
  if (trophyDisplays.length) {
    return <g>{trophyDisplays.slice(0, 3).map((trophy, index, entries) => <g key={trophy.id}>
      <rect x={-entries.length * 21 + index * 42} y="-86" width="40" height="68" fill="#080d0b" stroke={color} opacity="0.7" />
      <image href={trophy.image} x={-entries.length * 21 + index * 42} y="-82" width="40" height="60" preserveAspectRatio="xMidYMid meet" aria-label={trophy.label}><title>{trophy.label}</title></image>
    </g>)}</g>;
  }
  return (
    <g aria-hidden="true" stroke={color} strokeWidth="3">
      <path d="M-27 -77 Q0 -101 27 -77 L20 -47 Q0 -29 -20 -47 Z" fill="none" />
      <circle cx="-11" cy="-66" r="6" fill={color} />
      <circle cx="11" cy="-66" r="6" fill={color} />
      <path d="M-7 -44 L0 -56 L7 -44 M-20 -31 H20" fill="none" />
      <path d="M-45 -21 H45" />
    </g>
  );
}

function ArchiveConsole({ color }: { color: string }) {
  return (
    <g aria-hidden="true" fill="none" stroke={color} strokeWidth="2">
      <rect x="-50" y="-88" width="100" height="60" rx="3" />
      <path d="M-37 -72 H15 M-37 -60 H37 M-37 -48 H25" />
      <path d="M34 -80 L43 -71 L34 -62 L25 -71 Z" fill={color} />
    </g>
  );
}

function AppearanceForgeConsole({ color }: { color: string }) {
  return (
    <g aria-hidden="true" fill="none" stroke={color} strokeWidth="3">
      <path d="M-30 -83 Q0 -101 30 -83 L25 -48 Q0 -31 -25 -48 Z" />
      <path d="M-22 -66 H22 M-12 -49 L-22 -24 M12 -49 L22 -24" />
      <circle cx="0" cy="-65" r="5" fill={color} />
      <path d="M-45 -20 H45" opacity="0.7" />
    </g>
  );
}

function MedbayConsole({ color }: { color: string }) {
  return (
    <g aria-hidden="true" fill="none" stroke={color} strokeWidth="3">
      <rect x="-43" y="-91" width="86" height="66" rx="8" />
      <path d="M0 -79 V-39 M-20 -59 H20" strokeWidth="7" />
      <path d="M-52 -19 H52 M-36 -19 V-9 M36 -19 V-9" opacity="0.72" />
    </g>
  );
}

function TrainingConsole({ color }: { color: string }) {
  return <g aria-hidden="true" fill="none" stroke={color} strokeWidth="2">
    <circle cy="-60" r="26" /><circle cy="-60" r="13" />
    <path d="M0 -98 V-82 M0 -38 V-20 M-39 -60 H-23 M23 -60 H39" />
    <path d="M-48 -16 H48" opacity="0.5" />
  </g>;
}

function AirlockConsole({ color }: { color: string }) {
  return <g aria-hidden="true" fill="none" stroke={color} strokeWidth="3">
    <path d="M-39 -12 V-89 Q0 -113 39 -89 V-12 M0 -98 V-12" />
    <path d="M-19 -69 L-7 -57 L-19 -45 M19 -69 L7 -57 L19 -45" />
    <path d="M-49 -10 H49" strokeWidth="5" />
  </g>;
}

function DeckHunter({ player, appearance, loadout, suspended }: {
  player: PlayerMotion;
  appearance: HunterAppearance;
  loadout: Loadout;
  suspended: boolean;
}) {
  // The production rig registers its feet at y=366 on a 256×384 canvas.
  const size = 110;
  const scale = size / 256;
  const pose = player.climbing ? "climb" : !player.onSurface ? "jump" : Math.abs(player.velocityX) > 1 && !suspended ? "run" : "idle";
  return <g data-physical-ship-hunter="" pointerEvents="none">
    <ellipse cx={player.x} cy={player.y + 1} rx="30" ry="5" fill="#000" opacity="0.6" />
    <foreignObject x={player.x - size / 2} y={player.y - 366 * scale} width={size} height={384 * scale} overflow="visible">
      <HunterRigPreview appearance={appearance} armorId={loadout.armorId} weaponIds={loadout.weaponIds} gearIds={loadout.gearIds} size={size} pose={pose} phase={player.phase} facing={player.facing} speed={suspended ? 0 : Math.abs(player.velocityX)} verticalVelocity={player.velocityY} label="Ton chasseur Yautja équipé, contrôlé sur le pont" style={{ display: "block", filter: "drop-shadow(0 1px 3px #000)" }} />
    </foreignObject>
  </g>;
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
  header: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "end",
    justifyContent: "space-between",
    gap: "0.75rem",
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
  help: {
    maxWidth: "42rem",
    margin: 0,
    color: "#9bb0a9",
    fontSize: "0.78rem",
    lineHeight: 1.45,
  },
  viewport: {
    width: "100%",
    overflowX: "auto",
    overflowY: "hidden",
    scrollbarGutter: "stable",
    border: "1px solid rgba(112, 244, 207, 0.2)",
    background: "#020607",
  },
  svg: {
    display: "block",
    width: "100%",
    height: "auto",
    minHeight: "25rem",
    minWidth: "62rem",
    touchAction: "none",
  },
  stationReadout: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: "0.75rem",
    alignItems: "center",
    minHeight: "3rem",
    padding: "0.55rem 0.75rem",
    borderLeft: "3px solid var(--deck-accent)",
    background: "rgba(13, 31, 29, 0.74)",
    fontSize: "0.82rem",
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
