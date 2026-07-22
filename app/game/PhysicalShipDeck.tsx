"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

export type PhysicalShipStationId =
  | "galaxy-map"
  | "wall-armory"
  | "trophy-hall"
  | "clan-archives"
  | "appearance-forge"
  | "medical-bay";

export interface PhysicalShipStationDefinition {
  id: PhysicalShipStationId;
  label: string;
  shortLabel: string;
  description: string;
  x: number;
  y: number;
  level: "floor" | "gantry";
}

export const PHYSICAL_SHIP_STATIONS: readonly PhysicalShipStationDefinition[] = [
  {
    id: "galaxy-map",
    label: "Carte galactique",
    shortLabel: "CARTE",
    description: "Explorer la galaxie, les systèmes, les planètes et leurs chasses.",
    x: 100,
    y: 440,
    level: "floor",
  },
  {
    id: "wall-armory",
    label: "Armurerie murale",
    shortLabel: "ARMURERIE",
    description: "Choisir biomasks, armes et équipements exposés sur le mur.",
    x: 275,
    y: 300,
    level: "gantry",
  },
  {
    id: "trophy-hall",
    label: "Mur des trophées",
    shortLabel: "TROPHÉES",
    description: "Préparer, honorer et exposer les prises de la Longue Chasse.",
    x: 500,
    y: 440,
    level: "floor",
  },
  {
    id: "clan-archives",
    label: "Archives du clan",
    shortLabel: "ARCHIVES",
    description: "Consulter chasseurs légendaires, castes, rangs et chroniques.",
    x: 500,
    y: 300,
    level: "gantry",
  },
  {
    id: "appearance-forge",
    label: "Forge des parures",
    shortLabel: "PARURES",
    description: "Ajuster corps, biomask, dreads, plaques et ornements du chasseur.",
    x: 725,
    y: 300,
    level: "gantry",
  },
  {
    id: "medical-bay",
    label: "Baie médicale",
    shortLabel: "SOINS",
    description: "Traiter blessures, brûlures acides et interfaces neurales entre deux chasses.",
    x: 900,
    y: 440,
    level: "floor",
  },
] as const;

export interface PhysicalShipDeckProps {
  autoFocus?: boolean;
  gamepadEnabled?: boolean;
  highContrast?: boolean;
  onOpenMap?: () => void;
  onOpenArmory?: () => void;
  onOpenTrophies?: () => void;
  onOpenArchives?: () => void;
  onOpenAppearanceForge?: () => void;
  onOpenMedbay?: () => void;
  /** Generic telemetry hook, called in addition to the station callback. */
  onInteract?: (stationId: PhysicalShipStationId) => void;
  onStationProximityChange?: (
    stationId: PhysicalShipStationId | null,
  ) => void;
  onNotify?: (message: string) => void;
}

interface PlayerMotion {
  x: number;
  y: number;
  velocityY: number;
  facing: -1 | 1;
  onSurface: boolean;
  climbing: boolean;
}

interface HeldControls {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jumpQueued: boolean;
}

interface WalkableSurface {
  left: number;
  right: number;
  y: number;
}

const WORLD_WIDTH = 1_000;
const WORLD_HEIGHT = 520;
const INTERACTION_RADIUS = 92;
const WALK_SPEED = 190;
const CLIMB_SPEED = 150;
const JUMP_SPEED = 375;
const GRAVITY = 980;

const SURFACES: readonly WalkableSurface[] = [
  { left: 235, right: 765, y: 300 },
  { left: 20, right: 980, y: 440 },
];

const LADDERS = [
  { x: 275, top: 300, bottom: 440 },
  { x: 735, top: 300, bottom: 440 },
] as const;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function nearestStationFor(
  player: PlayerMotion,
): PhysicalShipStationDefinition | null {
  let nearest: PhysicalShipStationDefinition | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const station of PHYSICAL_SHIP_STATIONS) {
    const distance = Math.hypot(
      player.x - station.x,
      (player.y - station.y) * 1.35,
    );
    if (distance <= INTERACTION_RADIUS && distance < nearestDistance) {
      nearest = station;
      nearestDistance = distance;
    }
  }
  return nearest;
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
  autoFocus = true,
  gamepadEnabled = true,
  highContrast = false,
  onOpenMap,
  onOpenArmory,
  onOpenTrophies,
  onOpenArchives,
  onOpenAppearanceForge,
  onOpenMedbay,
  onInteract,
  onStationProximityChange,
  onNotify,
}: PhysicalShipDeckProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HeldControls>({
    left: false,
    right: false,
    up: false,
    down: false,
    jumpQueued: false,
  });
  const previousGamepadRef = useRef({ jump: false, interact: false });
  const previousStationRef = useRef<PhysicalShipStationId | null>(null);
  const [player, setPlayer] = useState<PlayerMotion>({
    x: 92,
    y: 440,
    velocityY: 0,
    facing: 1,
    onSurface: true,
    climbing: false,
  });
  const playerRef = useRef(player);
  const [status, setStatus] = useState(
    "Pont prêt. Approche-toi d’une station puis interagis.",
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
      onInteract?.(station.id);
      if (station.id === "galaxy-map") onOpenMap?.();
      if (station.id === "wall-armory") onOpenArmory?.();
      if (station.id === "trophy-hall") onOpenTrophies?.();
      if (station.id === "clan-archives") onOpenArchives?.();
      if (station.id === "appearance-forge") onOpenAppearanceForge?.();
      if (station.id === "medical-bay") onOpenMedbay?.();
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
    ],
  );

  const interactFromAvatar = useCallback(() => {
    const station = nearestStationFor(player);
    if (station) {
      activateStation(station);
      return;
    }
    notify("Aucune station à portée. Suis le marqueur lumineux.");
  }, [activateStation, notify, player]);

  const interactRef = useRef(interactFromAvatar);
  useEffect(() => {
    interactRef.current = interactFromAvatar;
  }, [interactFromAvatar]);

  useEffect(() => {
    if (!autoFocus) return;
    rootRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

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
    const stationId = nearbyStation?.id ?? null;
    if (stationId === previousStationRef.current) return;
    previousStationRef.current = stationId;
    onStationProximityChange?.(stationId);
    if (nearbyStation) {
      onNotify?.(
        `${nearbyStation.label} à portée. E / Entrée / X pour utiliser.`,
      );
    }
  }, [nearbyStation, onNotify, onStationProximityChange]);

  // Keyboard state is sampled by the same fixed physics loop as touch/gamepad.
  useEffect(() => {
    const changeKey = (event: KeyboardEvent, pressed: boolean) => {
      if (event.defaultPrevented || isEditableTarget(event.target)) return;
      const root = rootRef.current;
      if (!root || (document.activeElement !== root && !root.contains(document.activeElement))) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a" || key === "q") {
        controlsRef.current.left = pressed;
      } else if (key === "arrowright" || key === "d") {
        controlsRef.current.right = pressed;
      } else if (key === "arrowup" || key === "w" || key === "z") {
        controlsRef.current.up = pressed;
      } else if (key === "arrowdown" || key === "s") {
        controlsRef.current.down = pressed;
      } else if ((key === " " || key === "spacebar") && pressed) {
        controlsRef.current.jumpQueued = true;
      } else if ((key === "e" || key === "enter") && pressed && !event.repeat) {
        interactRef.current();
      } else {
        return;
      }
      event.preventDefault();
    };
    const keyDown = (event: KeyboardEvent) => changeKey(event, true);
    const keyUp = (event: KeyboardEvent) => changeKey(event, false);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    };
  }, []);

  useEffect(() => {
    let frameId = 0;
    let previousTime = performance.now();

    const frame = (time: number) => {
      const deltaSeconds = Math.min(0.034, Math.max(0, (time - previousTime) / 1_000));
      previousTime = time;

      let gamepadHorizontal = 0;
      let gamepadVertical = 0;
      if (gamepadEnabled && typeof navigator.getGamepads === "function") {
        const gamepad = navigator.getGamepads().find(Boolean);
        if (gamepad) {
          const axisX = gamepad.axes[0] ?? 0;
          const axisY = gamepad.axes[1] ?? 0;
          const dpadLeft = gamepad.buttons[14]?.pressed ?? false;
          const dpadRight = gamepad.buttons[15]?.pressed ?? false;
          const dpadUp = gamepad.buttons[12]?.pressed ?? false;
          const dpadDown = gamepad.buttons[13]?.pressed ?? false;
          gamepadHorizontal =
            Math.abs(axisX) > 0.22 ? axisX : Number(dpadRight) - Number(dpadLeft);
          gamepadVertical =
            Math.abs(axisY) > 0.22 ? axisY : Number(dpadDown) - Number(dpadUp);
          const jumpPressed = gamepad.buttons[0]?.pressed ?? false;
          const interactPressed =
            (gamepad.buttons[2]?.pressed ?? false) ||
            (gamepad.buttons[3]?.pressed ?? false);
          if (jumpPressed && !previousGamepadRef.current.jump) {
            controlsRef.current.jumpQueued = true;
          }
          if (interactPressed && !previousGamepadRef.current.interact) {
            interactRef.current();
          }
          previousGamepadRef.current = {
            jump: jumpPressed,
            interact: interactPressed,
          };
        }
      }

      const heldControls = controlsRef.current;
      const currentPlayer = playerRef.current;
      const idleAtRest =
        !heldControls.left &&
        !heldControls.right &&
        !heldControls.up &&
        !heldControls.down &&
        !heldControls.jumpQueued &&
        gamepadHorizontal === 0 &&
        gamepadVertical === 0 &&
        currentPlayer.velocityY === 0 &&
        currentPlayer.onSurface &&
        !currentPlayer.climbing;
      if (idleAtRest) {
        frameId = window.requestAnimationFrame(frame);
        return;
      }

      setPlayer((current) => {
        const held = controlsRef.current;
        const keyboardHorizontal = Number(held.right) - Number(held.left);
        const keyboardVertical = Number(held.down) - Number(held.up);
        const horizontal = clamp(keyboardHorizontal + gamepadHorizontal, -1, 1);
        const vertical = clamp(keyboardVertical + gamepadVertical, -1, 1);
        let x = clamp(current.x + horizontal * WALK_SPEED * deltaSeconds, 28, 972);
        let y = current.y;
        let velocityY = current.velocityY;
        let onSurface = false;
        let climbing = false;
        const facing = horizontal === 0 ? current.facing : horizontal < 0 ? -1 : 1;
        const ladder = LADDERS.find(
          (candidate) =>
            Math.abs(x - candidate.x) <= 29 &&
            y >= candidate.top - 12 &&
            y <= candidate.bottom + 12,
        );

        if (ladder && vertical !== 0 && !held.jumpQueued) {
          climbing = true;
          x += (ladder.x - x) * Math.min(1, deltaSeconds * 9);
          y = clamp(
            y + vertical * CLIMB_SPEED * deltaSeconds,
            ladder.top,
            ladder.bottom,
          );
          velocityY = 0;
          onSurface = y === ladder.top || y === ladder.bottom;
        } else {
          const currentSurface = SURFACES.find(
            (surface) =>
              Math.abs(current.y - surface.y) <= 2 &&
              x >= surface.left &&
              x <= surface.right,
          );
          const canJump = current.onSurface || current.climbing || Boolean(currentSurface);
          if (held.jumpQueued && canJump) {
            velocityY = -JUMP_SPEED;
          } else if (currentSurface && !held.jumpQueued) {
            y = currentSurface.y;
            velocityY = 0;
            onSurface = true;
          }

          if (!onSurface) {
            const previousY = y;
            velocityY += GRAVITY * deltaSeconds;
            y += velocityY * deltaSeconds;
            if (velocityY >= 0) {
              const landing = SURFACES.find(
                (surface) =>
                  x >= surface.left &&
                  x <= surface.right &&
                  previousY <= surface.y &&
                  y >= surface.y,
              );
              if (landing) {
                y = landing.y;
                velocityY = 0;
                onSurface = true;
              }
            }
          }
        }

        held.jumpQueued = false;
        const nextY = clamp(y, 40, 440);
        if (
          current.x === x &&
          current.y === nextY &&
          current.velocityY === velocityY &&
          current.facing === facing &&
          current.onSurface === onSurface &&
          current.climbing === climbing
        ) {
          playerRef.current = current;
          return current;
        }
        const nextPlayer: PlayerMotion = {
          x,
          y: nextY,
          velocityY,
          facing,
          onSurface,
          climbing,
        };
        playerRef.current = nextPlayer;
        return nextPlayer;
      });
      frameId = window.requestAnimationFrame(frame);
    };

    frameId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(frameId);
  }, [gamepadEnabled]);

  const setHeldControl = useCallback(
    (control: keyof Omit<HeldControls, "jumpQueued">, pressed: boolean) => {
      controlsRef.current[control] = pressed;
      rootRef.current?.focus({ preventScroll: true });
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
    controlsRef.current.jumpQueued = true;
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  const holdHandlers = (
    control: keyof Omit<HeldControls, "jumpQueued">,
  ) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setHeldControl(control, true);
    },
    onPointerUp: () => setHeldControl(control, false),
    onPointerCancel: () => setHeldControl(control, false),
    onPointerLeave: () => setHeldControl(control, false),
    onClick: (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (event.detail === 0) pulseControl(control);
    },
  });

  const stationKeyboard = (
    event: ReactKeyboardEvent<SVGGElement>,
    station: PhysicalShipStationDefinition,
  ) => {
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
      tabIndex={0}
      role="region"
      aria-label="Pont physique du vaisseau Yautja"
      aria-describedby="physical-deck-help"
      style={{ ...styles.root, "--deck-accent": accent } as CSSProperties}
    >
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>VAISSEAU · MENU JOUABLE</p>
          <h2 style={styles.title}>Parcours le pont</h2>
        </div>
        <p id="physical-deck-help" style={styles.help}>
          Marcher : flèches / ZQSD / stick · sauter : Espace / A · interagir : E,
          Entrée / X. Grimpe aux échelles avec haut et bas.
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
          aria-label="Coupe latérale interactive du pont, avec six stations accessibles"
          style={styles.svg}
        >
          <title>Pont physique interactif du vaisseau Yautja</title>
          <defs>
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
          <image
            href="/game/backgrounds/armory-war-room-v6.png"
            x="0"
            y="0"
            width={WORLD_WIDTH}
            height={WORLD_HEIGHT}
            preserveAspectRatio="xMidYMid slice"
            opacity="0.58"
          />
          <rect
            width={WORLD_WIDTH}
            height={WORLD_HEIGHT}
            fill="url(#deck-space)"
            opacity="0.34"
          />
          <path
            d="M20 440 L20 105 Q130 25 265 72 L500 30 L735 72 Q870 25 980 105 L980 440 Z"
            fill="none"
            stroke="#31423c"
            strokeWidth="8"
          />
          <path
            d="M35 120 Q150 55 260 96 M740 96 Q850 55 965 120"
            fill="none"
            stroke="#122c29"
            strokeWidth="30"
          />
          <circle cx="500" cy="68" r="3" fill={accent} opacity="0.8" />
          <path d="M420 68 H580" stroke={accent} strokeWidth="2" opacity="0.32" />

          {/* Traversal geometry: a lower floor, an upper gantry and two ladders. */}
          <rect x="20" y="440" width="960" height="26" rx="3" fill="url(#deck-metal)" />
          <rect x="235" y="300" width="530" height="18" rx="3" fill="url(#deck-metal)" />
          {LADDERS.map((ladder) => (
            <g key={ladder.x} stroke="#65786e" strokeWidth="6">
              <line x1={ladder.x - 17} y1={ladder.top} x2={ladder.x - 17} y2={ladder.bottom} />
              <line x1={ladder.x + 17} y1={ladder.top} x2={ladder.x + 17} y2={ladder.bottom} />
              {Array.from({ length: 6 }, (_, index) => (
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

          <MiniYautja player={player} accent={accent} />
        </svg>
      </div>

      <div style={styles.stationReadout} aria-live="polite" aria-atomic="true">
        <strong>{nearbyStation?.label ?? "Déplacement libre"}</strong>
        <span>{nearbyStation?.description ?? status}</span>
      </div>

      <nav
        className="physical-ship-deck__station-shortcuts"
        aria-label="Accès direct aux stations du pont"
      >
        {PHYSICAL_SHIP_STATIONS.map((station) => (
          <button
            key={station.id}
            type="button"
            aria-current={station.id === activeId ? "location" : undefined}
            onClick={() => activateStation(station)}
          >
            <strong>{station.shortLabel}</strong>
            <span>{station.level === "gantry" ? "Passerelle" : "Pont bas"}</span>
          </button>
        ))}
      </nav>

      <div
        className="physical-ship-deck__touch-controls"
        style={styles.touchControls}
        aria-label="Commandes tactiles"
      >
        <div style={styles.directionPad}>
          <button type="button" aria-label="Grimper" style={styles.controlButton} {...holdHandlers("up")}>▲</button>
          <div style={styles.controlRow}>
            <button type="button" aria-label="Aller à gauche" style={styles.controlButton} {...holdHandlers("left")}>◀</button>
            <button type="button" aria-label="Descendre" style={styles.controlButton} {...holdHandlers("down")}>▼</button>
            <button type="button" aria-label="Aller à droite" style={styles.controlButton} {...holdHandlers("right")}>▶</button>
          </div>
        </div>
        <div style={styles.actionPad}>
          <button
            type="button"
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

function StationGlyph({
  station,
  active,
  accent,
  warning,
  onActivate,
  onKeyDown,
}: {
  station: PhysicalShipStationDefinition;
  active: boolean;
  accent: string;
  warning: string;
  onActivate: () => void;
  onKeyDown: (event: ReactKeyboardEvent<SVGGElement>) => void;
}) {
  const color = active ? warning : accent;
  return (
    <g
      transform={`translate(${station.x} ${station.y})`}
      role="button"
      tabIndex={0}
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
      {station.id === "trophy-hall" ? <TrophyWall color={color} /> : null}
      {station.id === "clan-archives" ? <ArchiveConsole color={color} /> : null}
      {station.id === "appearance-forge" ? <AppearanceForgeConsole color={color} /> : null}
      {station.id === "medical-bay" ? <MedbayConsole color={color} /> : null}
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

function TrophyWall({ color }: { color: string }) {
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

function MiniYautja({
  player,
  accent,
}: {
  player: PlayerMotion;
  accent: string;
}) {
  return (
    <g
      transform={`translate(${player.x} ${player.y})`}
      aria-label="Chasseur Yautja contrôlé par le joueur"
    >
      <g transform={`scale(${player.facing} 1)`}>
        <ellipse cx="0" cy="0" rx="23" ry="5" fill="#000" opacity="0.45" />
        <path d="M-12 -55 Q-33 -49 -32 -22 M-9 -59 Q-39 -58 -43 -31 M-5 -60 Q-29 -70 -42 -52" fill="none" stroke="#251b15" strokeWidth="5" strokeLinecap="round" />
        <path d="M-10 -48 L-18 -14 M9 -48 L15 -14" stroke="#87622f" strokeWidth="10" strokeLinecap="round" />
        <path d="M-12 -14 L-17 -1 M13 -14 L18 -1" stroke="#a57a3e" strokeWidth="9" strokeLinecap="round" />
        <path d="M-17 -1 H-3 M11 -1 H24" stroke="#46514c" strokeWidth="6" strokeLinecap="round" />
        <path d="M-15 -53 Q0 -66 15 -53 L18 -26 Q0 -15 -18 -26 Z" fill="#5e4025" stroke="#9b7844" strokeWidth="3" />
        <path d="M-14 -52 Q0 -68 14 -52 V-35 Q0 -25 -14 -35 Z" fill="#8c7351" stroke="#c7b078" strokeWidth="2" />
        <path d="M-10 -43 H10" stroke="#080c0b" strokeWidth="6" />
        <circle cx="5" cy="-43" r="2" fill={accent} />
        <path d="M14 -49 L26 -45 L30 -26" fill="none" stroke="#596965" strokeWidth="4" />
        <circle cx="30" cy="-25" r="5" fill={accent} />
        <path d="M-17 -45 L-30 -24 M17 -45 L27 -20" stroke="#9d713a" strokeWidth="7" strokeLinecap="round" />
        <path d="M27 -23 L37 -27 M28 -20 L39 -20 M27 -17 L37 -13" stroke="#d3e2db" strokeWidth="2" />
      </g>
      {player.climbing ? (
        <circle cx="0" cy="-74" r="4" fill={accent} opacity="0.9" />
      ) : null}
    </g>
  );
}

const styles: Readonly<Record<string, CSSProperties>> = {
  root: {
    display: "grid",
    gap: "0.75rem",
    width: "100%",
    maxWidth: "76rem",
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
    minHeight: "18rem",
    touchAction: "none",
  },
  stationReadout: {
    display: "grid",
    gridTemplateColumns: "minmax(9rem, 0.35fr) minmax(0, 1fr)",
    gap: "0.75rem",
    alignItems: "center",
    minHeight: "3rem",
    padding: "0.55rem 0.75rem",
    borderLeft: "3px solid var(--deck-accent)",
    background: "rgba(13, 31, 29, 0.74)",
    fontSize: "0.82rem",
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
