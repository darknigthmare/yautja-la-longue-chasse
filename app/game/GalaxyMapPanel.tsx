"use client";

/* eslint-disable @next/next/no-img-element -- runtime art is generated and stored locally */

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { MISSIONS } from "./data";
import {
  cancelGalaxyAutopilot,
  createGalaxyFlightState,
  engageGalaxyAutopilot,
  galaxyFlightPointFromMapPosition,
  galaxyFlightReturnAnchorId,
  galaxyShipTopDownPose,
  isGalaxyFlightNear,
  normalizeGalaxyFlightInput,
  stepGalaxyFlight,
  type GalaxyFlightNavigationPath,
  type GalaxyFlightPoint,
  type GalaxyFlightState,
} from "./galaxyFlight";
import {
  GALAXY_NAVIGATION,
  GALAXY_BIOME_LABELS,
  GALAXY_BODY_KIND_LABELS,
  GALAXY_BODY_STATUS_LABELS,
  createGalaxyNavigationState,
  getGalaxyNavigationBreadcrumbs,
  getGalaxyNavigationItems,
  getGalaxyNavigationSelection,
  reduceGalaxyNavigation,
  type GalaxyBodyNode,
  type GalaxyNavigationItem,
  type GalaxyNavigationState,
  type GalaxySectorNode,
  type GalaxySystemNode,
} from "./galaxyNavigation";
import { galaxyOrbitRingGeometry } from "./galaxyRegistry";
import {
  GALAXY_V10_BACKGROUNDS,
  galaxyBodyVisualPath,
  galaxySystemBackgroundPath,
} from "./galaxyVisuals";
import { backgroundPathForBiome } from "./worldScreens";
import { shipForId, type ShipId } from "./shipCatalogue";
import type {
  MissionDefinition,
  MissionId,
  MissionProgress,
} from "./types";

export interface GalaxyMapPanelProps {
  missionProgress: Readonly<Record<MissionId, MissionProgress>>;
  selectedShipId: ShipId;
  initialState?: GalaxyNavigationState;
  onStateChange?: (state: GalaxyNavigationState) => void;
  onBack: () => void;
  onChooseMission: (mission: MissionDefinition) => void;
}

const MISSION_BY_ID = Object.freeze(
  Object.fromEntries(MISSIONS.map((mission) => [mission.id, mission])),
) as Readonly<Record<MissionId, MissionDefinition>>;

const FLIGHT_LEVELS = new Set<GalaxyNavigationState["level"]>([
  "galaxy",
  "sector",
  "system",
]);

function actionForItem(item: GalaxyNavigationItem) {
  if (item.kind === "sector") {
    return { type: "open-sector", sectorId: item.id } as const;
  }
  if (item.kind === "system") {
    return { type: "open-system", systemId: item.id } as const;
  }
  if (item.kind === "planet") {
    return { type: "open-planet", planetId: item.id } as const;
  }
  return { type: "open-mission", missionId: item.id as MissionId } as const;
}

function missionPosition(index: number, total: number): GalaxyFlightPoint {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, total);
  return {
    x: 50 + Math.cos(angle) * 30,
    y: 50 + Math.sin(angle) * 27,
  };
}

function spatialPosition(
  level: GalaxyNavigationState["level"],
  source: GalaxyFlightPoint,
  index: number,
  total: number,
): GalaxyFlightPoint {
  let position = source;
  if (level === "galaxy") {
    const sectorRing = [
      { x: 18, y: 29 },
      { x: 50, y: 18 },
      { x: 82, y: 55 },
      { x: 63, y: 79 },
      { x: 27, y: 72 },
    ];
    position = sectorRing[index] ?? source;
  } else if (level === "sector") {
    const systemLayouts: Readonly<Record<number, readonly GalaxyFlightPoint[]>> = {
      1: [{ x: 50, y: 50 }],
      2: [{ x: 27, y: 38 }, { x: 72, y: 64 }],
      3: [{ x: 25, y: 35 }, { x: 50, y: 72 }, { x: 78, y: 55 }],
    };
    position = systemLayouts[total]?.[index] ?? source;
  }
  const horizontalBounds = level === "system"
    ? { minimum: 4, maximum: 78 }
    : { minimum: 9, maximum: 91 };
  const verticalBounds = level === "system"
    ? { minimum: 18, maximum: 82 }
    : { minimum: 14, maximum: 82 };
  return {
    x: Math.min(horizontalBounds.maximum, Math.max(horizontalBounds.minimum, position.x)),
    y: Math.min(verticalBounds.maximum, Math.max(verticalBounds.minimum, position.y)),
  };
}

function initialFlightForLevel(
  level: GalaxyNavigationState["level"],
  aspect = 16 / 9,
): GalaxyFlightState {
  return createGalaxyFlightState({
    position: { x: 12 * aspect, y: level === "system" ? 78 : 80 },
    heading: -90,
    bounds: { minX: 0, maxX: 100 * aspect, minY: 0, maxY: 100 },
  });
}

function scannerValues(id: string): readonly number[] {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return [0, 1, 2, 3].map((index) => 24 + ((hash >>> (index * 5)) % 72));
}

function movementVector(keys: ReadonlySet<string>): GalaxyFlightPoint {
  const left = keys.has("ArrowLeft") || keys.has("KeyA") || keys.has("KeyQ");
  const right = keys.has("ArrowRight") || keys.has("KeyD");
  const up = keys.has("ArrowUp") || keys.has("KeyW") || keys.has("KeyZ");
  const down = keys.has("ArrowDown") || keys.has("KeyS");
  return normalizeGalaxyFlightInput({
    x: Number(right) - Number(left),
    y: Number(down) - Number(up),
  });
}

export default function GalaxyMapPanel({
  missionProgress,
  selectedShipId,
  initialState,
  onStateChange,
  onBack,
  onChooseMission,
}: GalaxyMapPanelProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const heldKeysRef = useRef(new Set<string>());
  const touchInputRef = useRef<GalaxyFlightPoint>({ x: 0, y: 0 });
  const previousPadButtonsRef = useRef(new Set<string>());
  const flightTargetRef = useRef<{
    item: GalaxyNavigationItem;
    position: GalaxyFlightPoint;
  } | null>(null);
  const launchActiveRef = useRef<() => void>(() => undefined);
  const navigateBackRef = useRef<() => void>(() => undefined);
  const [state, dispatch] = useReducer(
    (current: GalaxyNavigationState, action: Parameters<typeof reduceGalaxyNavigation>[2]) =>
      reduceGalaxyNavigation(GALAXY_NAVIGATION, current, action),
    initialState ?? createGalaxyNavigationState(),
  );
  const previousNavigationRef = useRef<GalaxyFlightNavigationPath>({
    level: state.level,
    sectorId: state.sectorId,
    systemId: state.systemId,
    planetId: state.planetId,
  });
  const [stageAspect, setStageAspect] = useState(16 / 9);
  const stageAspectRef = useRef(stageAspect);
  const [flight, setFlight] = useState(() => initialFlightForLevel(state.level, stageAspect));
  const flightRef = useRef(flight);
  const [flightMessage, setFlightMessage] = useState("Pilotage manuel");
  const selectedShip = shipForId(selectedShipId);

  const items = useMemo(
    () => getGalaxyNavigationItems(GALAXY_NAVIGATION, state),
    [state],
  );
  const selection = useMemo(
    () => getGalaxyNavigationSelection(GALAXY_NAVIGATION, state),
    [state],
  );
  const breadcrumbs = useMemo(
    () => getGalaxyNavigationBreadcrumbs(GALAXY_NAVIGATION, state),
    [state],
  );

  const itemPositions = useMemo(() => {
    const positions = new Map<string, GalaxyFlightPoint>();
    items.forEach((item, index) => {
      const sector = GALAXY_NAVIGATION.sectors.find(({ id }) => id === item.id);
      const system = selection.sector?.systems.find(({ id }) => id === item.id);
      const body = selection.system?.bodies.find(({ id }) => id === item.id);
      positions.set(item.id, spatialPosition(
        state.level,
        sector?.position ?? system?.position ?? body?.position ?? missionPosition(index, items.length),
        index,
        items.length,
      ));
    });
    return positions;
  }, [items, selection.sector, selection.system, state.level]);
  const itemPositionsRef = useRef(itemPositions);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemPositionsRef.current = itemPositions;
    itemsRef.current = items;
  }, [itemPositions, items]);

  const activeItem = state.level === "mission"
    ? items.find(({ id }) => id === state.missionId) ?? items[0] ?? null
    : items[state.cursorIndex] ?? items[0] ?? null;
  const activeMission = selection.mission
    ? MISSION_BY_ID[selection.mission.id]
    : null;
  const previewSector = state.level === "galaxy"
    ? GALAXY_NAVIGATION.sectors.find(({ id }) => id === activeItem?.id) ?? null
    : selection.sector;
  const previewSystem = state.level === "sector"
    ? selection.sector?.systems.find(({ id }) => id === activeItem?.id) ?? null
    : selection.system;
  const previewBody = state.level === "system"
    ? selection.system?.bodies.find(({ id }) => id === activeItem?.id) ?? null
    : selection.planet;
  const supportsFlight = FLIGHT_LEVELS.has(state.level);
  const activeMapPosition = activeItem ? itemPositions.get(activeItem.id) : null;
  const activeFlightPosition = activeMapPosition
    ? galaxyFlightPointFromMapPosition(activeMapPosition, stageAspect)
    : null;
  const canEnterActive = supportsFlight && activeFlightPosition
    ? isGalaxyFlightNear(flight.position, activeFlightPosition, 4.5)
    : false;
  const shipVisualPose = galaxyShipTopDownPose(flight.heading);

  const navigateBack = useCallback(() => {
    if (state.level === "galaxy") onBack();
    else dispatch({ type: "back" });
  }, [onBack, state.level]);

  const returnToGalaxy = useCallback(() => {
    dispatch({ type: "reset" });
    window.requestAnimationFrame(() => stageRef.current?.focus({ preventScroll: true }));
  }, []);

  const focusItem = useCallback((index: number) => {
    if (items.length <= 1 || index === state.cursorIndex) return;
    const forward = (index - state.cursorIndex + items.length) % items.length;
    const backward = (state.cursorIndex - index + items.length) % items.length;
    const direction = forward <= backward ? 1 : -1;
    const count = Math.min(forward, backward);
    for (let step = 0; step < count; step += 1) {
      dispatch({ type: "move", delta: direction as -1 | 1 });
    }
  }, [items.length, state.cursorIndex]);

  const openItem = useCallback((item: GalaxyNavigationItem) => {
    dispatch(actionForItem(item));
    window.requestAnimationFrame(() => stageRef.current?.focus({ preventScroll: true }));
  }, []);

  const cancelActiveRoute = useCallback(() => {
    if (flightRef.current.mode !== "autopilot") return;
    const next = cancelGalaxyAutopilot(flightRef.current);
    flightTargetRef.current = null;
    flightRef.current = next;
    setFlight(next);
    setFlightMessage("Trajectoire annulée · nouvelle cible sélectionnée");
  }, []);

  const traceRouteToItem = useCallback((item: GalaxyNavigationItem, index: number) => {
    focusItem(index);
    const mapPosition = itemPositions.get(item.id);
    if (!supportsFlight || !mapPosition) {
      openItem(item);
      return;
    }
    const position = galaxyFlightPointFromMapPosition(mapPosition, stageAspectRef.current);
    if (isGalaxyFlightNear(flightRef.current.position, position, 4.5)) {
      const next = cancelGalaxyAutopilot(flightRef.current);
      flightTargetRef.current = null;
      flightRef.current = next;
      setFlight(next);
      setFlightMessage(`${item.label} à portée · Entrée / A pour entrer`);
      return;
    }
    const next = engageGalaxyAutopilot(flightRef.current, item.id);
    flightTargetRef.current = { item, position };
    flightRef.current = next;
    setFlight(next);
    setFlightMessage(`Trajectoire verrouillée : ${item.label}`);
  }, [focusItem, itemPositions, openItem, supportsFlight]);

  const launchActive = useCallback(() => {
    if (!activeItem) return;
    const mapPosition = itemPositions.get(activeItem.id);
    if (!supportsFlight || !mapPosition) {
      openItem(activeItem);
      return;
    }
    const position = galaxyFlightPointFromMapPosition(mapPosition, stageAspectRef.current);
    if (isGalaxyFlightNear(flightRef.current.position, position, 4.5)) {
      flightTargetRef.current = null;
      openItem(activeItem);
      return;
    }
    traceRouteToItem(activeItem, Math.max(0, items.indexOf(activeItem)));
  }, [activeItem, itemPositions, items, openItem, supportsFlight, traceRouteToItem]);

  useEffect(() => {
    onStateChange?.(state);
  }, [onStateChange, state]);

  useEffect(() => {
    const previousNavigation = previousNavigationRef.current;
    const returnAnchorId = galaxyFlightReturnAnchorId(previousNavigation, state.level);
    const returnAnchor = returnAnchorId
      ? itemPositionsRef.current.get(returnAnchorId)
      : null;
    const reset = returnAnchor
      ? createGalaxyFlightState({
          position: galaxyFlightPointFromMapPosition(returnAnchor, stageAspectRef.current),
          heading: -90,
          bounds: {
            minX: 0,
            maxX: 100 * stageAspectRef.current,
            minY: 0,
            maxY: 100,
          },
        })
      : initialFlightForLevel(state.level, stageAspectRef.current);
    previousNavigationRef.current = {
      level: state.level,
      sectorId: state.sectorId,
      systemId: state.systemId,
      planetId: state.planetId,
    };
    flightTargetRef.current = null;
    flightRef.current = reset;
    heldKeysRef.current.clear();
    touchInputRef.current = { x: 0, y: 0 };
    const frame = window.requestAnimationFrame(() => {
      setFlight(reset);
      setFlightMessage(returnAnchorId && returnAnchor
        ? `Retour à proximité de ${itemsRef.current.find(({ id }) => id === returnAnchorId)?.label ?? "la dernière position"}`
        : state.level === "planet" || state.level === "mission"
          ? "Scanner orbital en ligne"
          : "Pilotage manuel");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [state.level, state.missionId, state.planetId, state.sectorId, state.systemId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => stageRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.height <= 0) return;
      const nextAspect = Math.min(4, Math.max(0.75, entry.contentRect.width / entry.contentRect.height));
      const previousAspect = stageAspectRef.current;
      if (Math.abs(nextAspect - previousAspect) < 0.005) return;
      const scale = nextAspect / previousAspect;
      stageAspectRef.current = nextAspect;
      setStageAspect(nextAspect);
      if (flightTargetRef.current) {
        flightTargetRef.current = {
          ...flightTargetRef.current,
          position: {
            x: flightTargetRef.current.position.x * scale,
            y: flightTargetRef.current.position.y,
          },
        };
      }
      const current = flightRef.current;
      const resized = {
        ...current,
        position: { x: current.position.x * scale, y: current.position.y },
      };
      flightRef.current = resized;
      setFlight(resized);
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    launchActiveRef.current = launchActive;
    navigateBackRef.current = navigateBack;
  }, [launchActive, navigateBack]);

  useEffect(() => {
    let frame = 0;
    let previousTime = performance.now();

    const tick = (time: number) => {
      const dt = Math.min(80, time - previousTime);
      previousTime = time;
      const pad = navigator.getGamepads?.().find(Boolean);
      const padInput = pad
        ? normalizeGalaxyFlightInput({ x: pad.axes[0] ?? 0, y: pad.axes[1] ?? 0 })
        : { x: 0, y: 0 };
      const keyboardInput = movementVector(heldKeysRef.current);
      const input = normalizeGalaxyFlightInput({
        x: keyboardInput.x + touchInputRef.current.x + (Math.abs(padInput.x) > 0.16 ? padInput.x : 0),
        y: keyboardInput.y + touchInputRef.current.y + (Math.abs(padInput.y) > 0.16 ? padInput.y : 0),
      });

      if (Math.hypot(input.x, input.y) > 0.08 && flightTargetRef.current) {
        flightTargetRef.current = null;
        setFlightMessage("Pilotage manuel");
      }

      if (supportsFlight) {
        const current = flightRef.current;
        const target = flightTargetRef.current;
        const next = stepGalaxyFlight(
          current,
          input,
          dt,
          target ? { id: target.item.id, position: target.position } : null,
          {
            bounds: {
              minX: 4 * stageAspectRef.current,
              maxX: 96 * stageAspectRef.current,
              minY: 8,
              maxY: 82,
            },
          },
        );
        flightRef.current = next;
        if (
          next.position.x !== current.position.x ||
          next.position.y !== current.position.y ||
          next.velocity.x !== current.velocity.x ||
          next.velocity.y !== current.velocity.y ||
          next.heading !== current.heading ||
          next.mode !== current.mode ||
          next.targetId !== current.targetId
        ) {
          setFlight(next);
        }

        if (target && current.mode === "autopilot" && next.mode === "manual" && next.targetId === null) {
          flightTargetRef.current = null;
          setFlightMessage(`${target.item.label} à portée · Entrée / A pour entrer`);
        }
      }

      if (pad) {
        const pressed = new Set<string>();
        let changedTarget = false;
        if (pad.buttons[4]?.pressed || pad.buttons[14]?.pressed) pressed.add("previous");
        if (pad.buttons[5]?.pressed || pad.buttons[15]?.pressed) pressed.add("next");
        if (pad.buttons[0]?.pressed) pressed.add("activate");
        if (pad.buttons[1]?.pressed) pressed.add("back");
        for (const command of pressed) {
          if (previousPadButtonsRef.current.has(command)) continue;
          if (command === "previous") {
            cancelActiveRoute();
            dispatch({ type: "move", delta: -1 });
            changedTarget = true;
          }
          if (command === "next") {
            cancelActiveRoute();
            dispatch({ type: "move", delta: 1 });
            changedTarget = true;
          }
          if (command === "activate" && !changedTarget) launchActiveRef.current();
          if (command === "back") navigateBackRef.current();
        }
        previousPadButtonsRef.current = pressed;
      } else {
        previousPadButtonsRef.current = new Set<string>();
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [cancelActiveRoute, supportsFlight]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    const movementCodes = new Set([
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "KeyW", "KeyA", "KeyS", "KeyD", "KeyZ", "KeyQ",
    ]);
    if (supportsFlight && movementCodes.has(event.code)) {
      event.preventDefault();
      heldKeysRef.current.add(event.code);
      if (flightRef.current.mode === "autopilot") {
        const next = cancelGalaxyAutopilot(flightRef.current);
        flightTargetRef.current = null;
        flightRef.current = next;
        setFlight(next);
        setFlightMessage("Pilotage manuel");
      }
      return;
    }
    if (event.code === "PageDown" || event.code === "PageUp" || event.code === "KeyE" || event.code === "KeyR") {
      event.preventDefault();
      cancelActiveRoute();
      dispatch({ type: "move", delta: event.code === "PageUp" || event.code === "KeyR" ? -1 : 1 });
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      launchActive();
    } else if (event.key === "Escape" || event.key === "Backspace") {
      event.preventDefault();
      navigateBack();
    } else if (event.key.toLowerCase() === "g") {
      event.preventDefault();
      returnToGalaxy();
    }
  };

  const onKeyUp = (event: KeyboardEvent<HTMLElement>) => {
    heldKeysRef.current.delete(event.code);
  };

  const setTouchDirection = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    touchInputRef.current = {
      x: Number(event.currentTarget.dataset.flightX ?? 0),
      y: Number(event.currentTarget.dataset.flightY ?? 0),
    };
  }, []);
  const clearTouchDirection = useCallback(() => {
    touchInputRef.current = { x: 0, y: 0 };
  }, []);
  const setKeyDirection = useCallback((event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    touchInputRef.current = {
      x: Number(event.currentTarget.dataset.flightX ?? 0),
      y: Number(event.currentTarget.dataset.flightY ?? 0),
    };
  }, []);

  const mapBackground = state.level === "galaxy"
    ? GALAXY_V10_BACKGROUNDS.galaxy
    : state.level === "sector"
      ? GALAXY_V10_BACKGROUNDS.sector
      : state.level === "system" && selection.system
        ? galaxySystemBackgroundPath(selection.system)
        : GALAXY_V10_BACKGROUNDS.system;
  const levelTitle = state.level === "galaxy"
    ? "Voie des grandes chasses"
    : state.level === "sector"
      ? selection.sector?.name ?? "Secteur inconnu"
      : state.level === "system"
        ? selection.system?.name ?? "Système inconnu"
        : previewBody?.name ?? "Analyse orbitale";

  return (
    <section className="screen panel-screen galaxy-v10-screen" aria-labelledby="galaxy-map-title">
      <div className="galaxy-v10-shell">
        <header className="galaxy-v10-header">
          <div className="galaxy-v10-title-row">
            <button type="button" className="galaxy-v10-text-button" onClick={navigateBack}>
              Retour
            </button>
            <div>
              <p className="eyebrow">Navigation du vaisseau // Carte galactique V11</p>
              <h1 id="galaxy-map-title">{levelTitle}</h1>
            </div>
          </div>
          <div className="galaxy-v10-header-tools">
            <span title={selectedShip.name}>
              Vaisseau · {selectedShip.shortName}
            </span>
            <span>{GALAXY_NAVIGATION.sectorCount} secteurs</span>
            <span>{GALAXY_NAVIGATION.systemCount} systèmes</span>
            <span>{GALAXY_NAVIGATION.bodyCount} corps</span>
            <button
              type="button"
              className="galaxy-v10-text-button"
              onClick={returnToGalaxy}
              disabled={state.level === "galaxy"}
            >
              Vue galaxie <kbd>G</kbd>
            </button>
          </div>
        </header>

        <nav className="galaxy-v10-breadcrumbs" aria-label="Position galactique">
          {breadcrumbs.map((label, index) => (
            <button
              type="button"
              key={`${label}-${index}`}
              aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}
              disabled={index === breadcrumbs.length - 1}
              onClick={() => {
                if (index === 0) dispatch({ type: "reset" });
                else if (index === 1 && selection.sector) dispatch({ type: "open-sector", sectorId: selection.sector.id });
                else if (index === 2 && selection.system) dispatch({ type: "open-system", systemId: selection.system.id });
                else if (index === 3 && selection.planet) dispatch({ type: "open-planet", planetId: selection.planet.id });
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div
          ref={stageRef}
          className={`galaxy-v10-stage level-${state.level}`}
          data-galaxy-v10-level={state.level}
          data-selected-ship={selectedShipId}
          role="region"
          aria-label={supportsFlight
            ? `Carte ${state.level}. Pilotez avec les flèches ou ZQSD, changez de cible avec E ou R et voyagez avec Entrée.`
            : `Dossier orbital ${state.level}. Parcourez les signaux et contrats avec les commandes affichées.`}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onBlur={() => heldKeysRef.current.clear()}
        >
          <img className="galaxy-v10-stage-art" src={mapBackground} alt="" aria-hidden="true" />
          <div className="galaxy-v10-stage-vignette" aria-hidden="true" />

          {supportsFlight ? (
            <SpatialMap
              level={state.level}
              items={items}
              activeItem={activeItem}
              positions={itemPositions}
              selection={selection}
              onSelect={traceRouteToItem}
            />
          ) : previewBody ? (
            <PlanetDossier
              body={previewBody}
              activeMission={activeMission}
              missionProgress={missionProgress}
              siblingItems={items}
              activeItem={activeItem}
              onOpenItem={openItem}
              onChooseMission={onChooseMission}
            />
          ) : null}

          {supportsFlight ? (
            <>
              <div
                className={`galaxy-v10-ship${flight.mode === "autopilot" ? " autopilot" : ""}`}
                data-flight-x={flight.position.x}
                data-flight-y={flight.position.y}
                data-flight-mode={flight.mode}
                data-ship-flip={shipVisualPose.scaleX}
                data-ship-rotation={shipVisualPose.rotationDegrees}
                style={{
                  "--ship-x": `${flight.position.x / stageAspect}%`,
                  "--ship-y": `${flight.position.y}%`,
                  "--ship-rotation": `${shipVisualPose.rotationDegrees}deg`,
                  "--ship-flip": shipVisualPose.scaleX,
                } as CSSProperties}
                aria-label={`${selectedShip.name}, ${flightMessage}`}
              >
                <img
                  src={selectedShip.provenance.topRuntimeAssetPath}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                />
                <span aria-hidden="true" />
              </div>

              <MapSelectionCard
                sector={previewSector}
                system={previewSystem}
                body={previewBody}
                item={activeItem}
                onTravel={launchActive}
                canEnter={canEnterActive}
              />

              <div className="galaxy-v10-flight-controls" aria-label="Commandes du vaisseau">
                <p aria-live="polite">{flightMessage}</p>
                <div className="galaxy-v10-dpad">
                  <button type="button" className="up" data-flight-x="0" data-flight-y="-1" aria-label="Piloter vers le haut" onPointerDown={setTouchDirection} onPointerUp={clearTouchDirection} onPointerCancel={clearTouchDirection} onKeyDown={setKeyDirection} onKeyUp={clearTouchDirection} onBlur={clearTouchDirection}>Haut</button>
                  <button type="button" className="left" data-flight-x="-1" data-flight-y="0" aria-label="Piloter vers la gauche" onPointerDown={setTouchDirection} onPointerUp={clearTouchDirection} onPointerCancel={clearTouchDirection} onKeyDown={setKeyDirection} onKeyUp={clearTouchDirection} onBlur={clearTouchDirection}>Gauche</button>
                  <button type="button" className="right" data-flight-x="1" data-flight-y="0" aria-label="Piloter vers la droite" onPointerDown={setTouchDirection} onPointerUp={clearTouchDirection} onPointerCancel={clearTouchDirection} onKeyDown={setKeyDirection} onKeyUp={clearTouchDirection} onBlur={clearTouchDirection}>Droite</button>
                  <button type="button" className="down" data-flight-x="0" data-flight-y="1" aria-label="Piloter vers le bas" onPointerDown={setTouchDirection} onPointerUp={clearTouchDirection} onPointerCancel={clearTouchDirection} onKeyDown={setKeyDirection} onKeyUp={clearTouchDirection} onBlur={clearTouchDirection}>Bas</button>
                </div>
                <button type="button" className="galaxy-v10-travel-button" disabled={!activeItem} onClick={launchActive}>
                  {canEnterActive ? "Entrer dans la destination" : "Tracer la route"}
                </button>
              </div>
            </>
          ) : null}

          {supportsFlight ? (
            <p className="galaxy-v10-control-hint">
              Pilotage : flèches ou ZQSD/WASD · Cible : E/R · Voyage : Entrée · Retour : Échap · Manette : stick, A, B
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SpatialMap({
  level,
  items,
  activeItem,
  positions,
  selection,
  onSelect,
}: {
  level: GalaxyNavigationState["level"];
  items: readonly GalaxyNavigationItem[];
  activeItem: GalaxyNavigationItem | null;
  positions: ReadonlyMap<string, GalaxyFlightPoint>;
  selection: ReturnType<typeof getGalaxyNavigationSelection>;
  onSelect: (item: GalaxyNavigationItem, index: number) => void;
}) {
  return (
    <nav className="galaxy-v10-spatial-map" aria-label={`Destinations du niveau ${level}`}>
      {level === "system" && selection.system ? (
        <>
          {selection.system.bodies.map((body, index) => {
            const geometry = galaxyOrbitRingGeometry(body.orbit);
            return (
              <span
                key={body.id}
                className="galaxy-v10-orbit"
                data-orbit-body={body.id}
                data-orbit-radius={body.orbit.radius}
                data-orbit-angle={body.orbit.angleDegrees}
                style={{
                  "--orbit-width": `${geometry.widthPercent}%`,
                  "--orbit-height": `${geometry.heightPercent}%`,
                  "--orbit-accent": body.accent,
                  "--orbit-delay": `${index * -1.35}s`,
                  "--orbit-opacity": `${(0.18 + selection.system!.visualProfile.orbitEccentricity * 0.28) * 100}%`,
                } as CSSProperties}
                aria-hidden="true"
              />
            );
          })}
          <figure
            className="galaxy-v10-star"
            data-system-background={selection.system.visualProfile.backgroundKey}
            data-system-orbit-scale={selection.system.visualProfile.orbitScale}
            data-system-orbit-tilt={selection.system.visualProfile.orbitTiltDegrees}
            style={{
              "--star-accent": selection.system.visualProfile.starGlow,
              "--star-scale": Math.min(1.14, Math.max(0.88, selection.system.visualProfile.orbitScale)),
            } as CSSProperties}
          >
            <img src={galaxySystemBackgroundPath(selection.system)} alt="" aria-hidden="true" />
            <figcaption><strong>{selection.system.starName}</strong><small>{selection.system.starClass}</small></figcaption>
          </figure>
        </>
      ) : null}

      {items.map((item, index) => {
        const position = positions.get(item.id) ?? { x: 50, y: 50 };
        const sector = GALAXY_NAVIGATION.sectors.find(({ id }) => id === item.id);
        const system = selection.sector?.systems.find(({ id }) => id === item.id);
        const body = selection.system?.bodies.find(({ id }) => id === item.id);
        const selected = activeItem?.id === item.id;
        const image = body
          ? galaxyBodyVisualPath(body)
          : item.kind === "sector"
            ? GALAXY_V10_BACKGROUNDS.galaxy
            : GALAXY_V10_BACKGROUNDS.sector;
        const accent = body?.accent ?? system?.accent ?? sector?.accent ?? "#70f4cf";
        return (
          <button
            type="button"
            aria-current={selected ? "true" : undefined}
            className={`galaxy-v10-node kind-${body?.bodyKind ?? item.kind}${selected ? " selected" : ""}${body?.status === "active" ? " hunt" : ""}`}
            data-map-x={position.x}
            data-map-y={position.y}
            data-body-orbit-radius={body?.orbit.radius}
            style={{
              "--node-x": `${position.x}%`,
              "--node-y": `${position.y}%`,
              "--node-accent": accent,
            } as CSSProperties}
            key={item.id}
            onClick={() => onSelect(item, index)}
          >
            <span className="galaxy-v10-node-visual">
              <img src={image} alt="" aria-hidden="true" style={{ objectPosition: `${position.x}% ${position.y}%` }} />
            </span>
            <span className="galaxy-v10-node-label">
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </span>
            {body?.status === "active" ? <em>Chasse</em> : null}
          </button>
        );
      })}
    </nav>
  );
}

function MapSelectionCard({
  sector,
  system,
  body,
  item,
  onTravel,
  canEnter,
}: {
  sector: GalaxySectorNode | null;
  system: GalaxySystemNode | null;
  body: GalaxyBodyNode | null;
  item: GalaxyNavigationItem | null;
  onTravel: () => void;
  canEnter: boolean;
}) {
  if (!item) return null;
  const title = body?.name ?? system?.name ?? sector?.name ?? item.label;
  const description = body?.summary ?? system?.description ?? sector?.description ?? item.detail;
  return (
    <aside className="galaxy-v10-selection-card" aria-live="polite">
      <p>{body ? GALAXY_BODY_KIND_LABELS[body.bodyKind] : system ? "Système" : "Secteur"}</p>
      <h2>{title}</h2>
      <span>{description}</span>
      <dl>
        {sector && !system ? <><div><dt>Systèmes</dt><dd>{sector.systems.length}</dd></div><div><dt>Mondes</dt><dd>{sector.systems.reduce((total, value) => total + value.planets.length, 0)}</dd></div></> : null}
        {system && !body ? <><div><dt>Corps</dt><dd>{system.bodies.length}</dd></div><div><dt>Étoile</dt><dd>{system.starClass}</dd></div></> : null}
        {body ? <><div><dt>Statut</dt><dd>{GALAXY_BODY_STATUS_LABELS[body.status]}</dd></div><div><dt>Danger</dt><dd>{body.hazard}</dd></div></> : null}
      </dl>
      <button type="button" onClick={onTravel}>{canEnter ? "Entrer" : "Tracer la route"}</button>
    </aside>
  );
}

function PlanetDossier({
  body,
  activeMission,
  missionProgress,
  siblingItems,
  activeItem,
  onOpenItem,
  onChooseMission,
}: {
  body: GalaxyBodyNode;
  activeMission: MissionDefinition | null;
  missionProgress: Readonly<Record<MissionId, MissionProgress>>;
  siblingItems: readonly GalaxyNavigationItem[];
  activeItem: GalaxyNavigationItem | null;
  onOpenItem: (item: GalaxyNavigationItem) => void;
  onChooseMission: (mission: MissionDefinition) => void;
}) {
  const values = scannerValues(body.id);
  const bodyMission = activeMission ?? (body.missions[0] ? MISSION_BY_ID[body.missions[0].id] : null);
  const progress = activeMission ? missionProgress[activeMission.id] : null;
  return (
    <div className="galaxy-v10-dossier">
      <div className="galaxy-v10-planet-view">
        <div className="galaxy-v10-scan-grid" aria-hidden="true" />
        <img src={galaxyBodyVisualPath(body)} alt={`${GALAXY_BODY_KIND_LABELS[body.bodyKind]} ${body.name}`} />
        <span className="galaxy-v10-scan-line" aria-hidden="true" />
        <p>{GALAXY_BODY_KIND_LABELS[body.bodyKind]} · {GALAXY_BIOME_LABELS[body.biome]}</p>
      </div>
      <section className="galaxy-v10-scan-panel" aria-labelledby="galaxy-v10-dossier-title">
        <p className="eyebrow">Résultats du scanner</p>
        <h2 id="galaxy-v10-dossier-title">{body.name}</h2>
        <strong className={`galaxy-v10-status status-${body.status}`}>{GALAXY_BODY_STATUS_LABELS[body.status]}</strong>
        <p>{body.summary}</p>
        <dl className="galaxy-v10-body-data">
          <div><dt>Milieu</dt><dd>{body.environment}</dd></div>
          <div><dt>Population</dt><dd>{body.population}</dd></div>
          <div><dt>Signal</dt><dd>{body.signal}</dd></div>
          <div><dt>Danger</dt><dd>{body.hazard}</dd></div>
        </dl>
        <div className="galaxy-v10-spectrum" aria-label="Spectre du scanner">
          {values.map((value, index) => (
            <div key={index}><span>{["Biosphère", "Métaux", "Énergie", "Technologie"][index]}</span><i><b style={{ width: `${value}%` }} /></i><strong>{value}%</strong></div>
          ))}
        </div>
        {activeMission ? (
          <div className="galaxy-v10-mission-brief">
            <img src={backgroundPathForBiome(activeMission.biome)} alt={`Zone de chasse de ${activeMission.planetName}`} />
            <div><small>Contrat sélectionné · menace {activeMission.threatLevel}/4</small><strong>{activeMission.title}</strong><p>{activeMission.subtitle}</p></div>
            <button type="button" className="alien-button" disabled={progress?.status === "locked"} onClick={() => onChooseMission(activeMission)}>
              {progress?.status === "locked" ? "Trophée précédent requis" : "Préparer la chasse"}
            </button>
          </div>
        ) : bodyMission ? (
          <p className="galaxy-v10-contract-note">{body.missions.length} contrat de chasse détecté. Sélectionnez-le pour ouvrir le briefing.</p>
        ) : (
          <p className="galaxy-v10-contract-note">Aucun contrat validé. Ce corps reste accessible à l’inspection orbitale.</p>
        )}
      </section>
      <nav className="galaxy-v10-dossier-nav" aria-label="Signaux orbitaux">
        {siblingItems.map((item) => {
          const siblingBody = item.kind === "planet"
            ? GALAXY_NAVIGATION.systems.flatMap(({ bodies }) => bodies).find(({ id }) => id === item.id)
            : null;
          return (
            <button type="button" key={item.id} className={activeItem?.id === item.id ? "selected" : ""} aria-current={activeItem?.id === item.id ? "true" : undefined} onClick={() => onOpenItem(item)}>
              {siblingBody ? <img src={galaxyBodyVisualPath(siblingBody)} alt="" aria-hidden="true" /> : null}
              <span><strong>{item.label}</strong><small>{item.detail}</small></span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
