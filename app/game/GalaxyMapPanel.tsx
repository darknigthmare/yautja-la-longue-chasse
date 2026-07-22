"use client";

/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { MISSIONS } from "./data";
import {
  GALAXY_NAVIGATION,
  createGalaxyNavigationState,
  getGalaxyNavigationBreadcrumbs,
  getGalaxyNavigationItems,
  getGalaxyNavigationSelection,
  reduceGalaxyNavigation,
  type GalaxyNavigationItem,
  type GalaxyNavigationState,
} from "./galaxyNavigation";
import type {
  MissionDefinition,
  MissionId,
  MissionProgress,
} from "./types";

export interface GalaxyMapPanelProps {
  missionProgress: Readonly<Record<MissionId, MissionProgress>>;
  initialState?: GalaxyNavigationState;
  onStateChange?: (state: GalaxyNavigationState) => void;
  onBack: () => void;
  onChooseMission: (mission: MissionDefinition) => void;
}

const MISSION_BY_ID = Object.freeze(
  Object.fromEntries(MISSIONS.map((mission) => [mission.id, mission])),
) as Readonly<Record<MissionId, MissionDefinition>>;

function missionBackground(mission: MissionDefinition): string {
  const biome = mission.biome === "volcano" ? "volcanic" : mission.biome;
  return `/game/backgrounds/${biome}-depth-v4.webp`;
}

function actionForItem(item: GalaxyNavigationItem) {
  if (item.kind === "system") {
    return { type: "open-system", systemId: item.id } as const;
  }
  if (item.kind === "planet") {
    return { type: "open-planet", planetId: item.id } as const;
  }
  return { type: "open-mission", missionId: item.id as MissionId } as const;
}

export default function GalaxyMapPanel({
  missionProgress,
  initialState,
  onStateChange,
  onBack,
  onChooseMission,
}: GalaxyMapPanelProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [state, dispatch] = useReducer(
    (current: GalaxyNavigationState, action: Parameters<typeof reduceGalaxyNavigation>[2]) =>
      reduceGalaxyNavigation(GALAXY_NAVIGATION, current, action),
    initialState ?? createGalaxyNavigationState(),
  );
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

  const navigateBack = useCallback(() => {
    if (state.level === "galaxy") onBack();
    else dispatch({ type: "back" });
  }, [onBack, state.level]);

  useEffect(() => {
    onStateChange?.(state);
  }, [onStateChange, state]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      chartRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      dispatch({ type: "move", delta: -1 });
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      dispatch({ type: "move", delta: 1 });
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      dispatch({ type: "activate" });
    } else if (event.key === "Escape" || event.key === "Backspace") {
      event.preventDefault();
      navigateBack();
    }
  };

  const activeMission = selection.mission
    ? MISSION_BY_ID[selection.mission.id]
    : null;
  const activeItem = items[state.cursorIndex] ?? items[0] ?? null;

  const activateItem = useCallback((item: GalaxyNavigationItem) => {
    dispatch(actionForItem(item));
    window.requestAnimationFrame(() => {
      chartRef.current?.focus({ preventScroll: true });
    });
  }, []);

  return (
    <section
      className="screen panel-screen galaxy-navigation-screen"
      aria-labelledby="galaxy-map-title"
    >
      <div className="screen-safe">
        <header className="galaxy-map-header">
          <button
            type="button"
            className="back-button"
            onClick={navigateBack}
            aria-label="Revenir au niveau précédent"
          >
            ←
          </button>
          <div>
            <p className="eyebrow">Navigation // Carte tridimensionnelle</p>
            <h1 id="galaxy-map-title">{GALAXY_NAVIGATION.name}</h1>
            <p>
              Sélectionnez d’abord un système, puis une planète et enfin la
              mission active sur ce monde.
            </p>
          </div>
          <figure className="galaxy-ship-marker" aria-label="Vaisseau du clan">
            <img src="/game/sprites/v6/ships-atlas.png" alt="Vaisseaux du clan" />
          </figure>
        </header>

        <nav className="galaxy-breadcrumbs" aria-label="Position galactique">
          {breadcrumbs.map((label, index) => (
            <button
              type="button"
              key={`${label}-${index}`}
              aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}
              onClick={() => {
                if (index === 0) dispatch({ type: "reset" });
                else if (index === 1 && selection.system) {
                  dispatch({ type: "open-system", systemId: selection.system.id });
                } else if (index === 2 && selection.planet) {
                  dispatch({ type: "open-planet", planetId: selection.planet.id });
                }
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="galaxy-map-layout">
          <div
            ref={chartRef}
            className={`galaxy-chart level-${state.level}`}
            role="listbox"
            aria-label={`Niveau ${state.level}`}
            aria-activedescendant={
              activeItem ? `galaxy-node-${activeItem.id}` : undefined
            }
            data-screen-focus
            tabIndex={0}
            onKeyDown={onKeyDown}
          >
            <div className="galaxy-orbit orbit-a" aria-hidden="true" />
            <div className="galaxy-orbit orbit-b" aria-hidden="true" />
            {items.map((item, index) => {
              const system = GALAXY_NAVIGATION.systems.find(({ id }) => id === item.id);
              const planet = selection.system?.planets.find(({ id }) => id === item.id);
              const position = system?.position ?? planet?.position ?? {
                x: 22 + (index % 3) * 28,
                y: 28 + Math.floor(index / 3) * 34,
              };
              const selected = index === state.cursorIndex ||
                (state.level === "mission" && item.id === state.missionId);
              const progress = item.kind === "mission"
                ? missionProgress[item.id as MissionId]
                : null;
              return (
                <button
                  id={`galaxy-node-${item.id}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  tabIndex={-1}
                  className={`galaxy-node ${item.kind}${selected ? " selected" : ""}${progress?.status === "locked" ? " locked" : ""}`}
                  style={{
                    "--node-x": `${position.x}%`,
                    "--node-y": `${position.y}%`,
                    "--node-accent": system?.accent ?? selection.system?.accent ?? "#70f4cf",
                  } as CSSProperties}
                  key={item.id}
                  onClick={() => activateItem(item)}
                >
                  <span className="galaxy-node-core" aria-hidden="true" />
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </button>
              );
            })}
          </div>

          <aside className="galaxy-selection-panel" aria-live="polite">
            {activeMission ? (
              <MissionSelection
                mission={activeMission}
                progress={missionProgress[activeMission.id]}
                onChoose={() => onChooseMission(activeMission)}
              />
            ) : selection.planet ? (
              <>
                <p className="mission-planet">Planète sélectionnée</p>
                <h2>{selection.planet.name}</h2>
                <img
                  src={missionBackground(MISSION_BY_ID[selection.planet.missions[0].id])}
                  alt={`Surface de ${selection.planet.name}`}
                />
                <p>
                  Biome {selection.planet.biome} · {selection.planet.missions.length}
                  {" "}signal de chasse détecté.
                </p>
              </>
            ) : selection.system ? (
              <>
                <p className="mission-planet">Système sélectionné</p>
                <h2>{selection.system.name}</h2>
                <p>
                  {selection.system.planets.length} monde cartographié. Ouvrez
                  le système pour analyser ses orbites.
                </p>
              </>
            ) : (
              <>
                <p className="mission-planet">Galaxie locale</p>
                <h2>{GALAXY_NAVIGATION.systems.length} systèmes traqués</h2>
                <p>
                  {GALAXY_NAVIGATION.missionCount} contrats actifs. Les routes
                  du vaisseau se dévoilent selon l’honneur du clan.
                </p>
                <img
                  className="galaxy-rank-atlas"
                  src="/game/sprites/v6/ranks-lasers-atlas.png"
                  alt="Insignes des rangs et couleurs de ciblage du clan"
                />
              </>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}

function MissionSelection({
  mission,
  progress,
  onChoose,
}: {
  mission: MissionDefinition;
  progress: MissionProgress;
  onChoose: () => void;
}) {
  const locked = progress.status === "locked";
  return (
    <>
      <p className="mission-planet">{mission.planetName}</p>
      <h2>{mission.title}</h2>
      <div className="galaxy-mission-visual">
        <img src={missionBackground(mission)} alt={`Surface de ${mission.planetName}`} />
        <span>MENACE {mission.threatLevel}/4</span>
      </div>
      <p>{mission.subtitle}</p>
      <dl className="galaxy-mission-stats">
        <div><dt>Proie</dt><dd>{mission.targetName}</dd></div>
        <div><dt>État</dt><dd>{locked ? "Verrouillée" : progress.status === "completed" ? `Record ${progress.bestScore}` : "Disponible"}</dd></div>
        <div><dt>Honneur</dt><dd>+{mission.baseRewards.honor}</dd></div>
      </dl>
      <button
        type="button"
        className="alien-button"
        disabled={locked}
        onClick={onChoose}
      >
        {locked ? "Trophée précédent requis" : "Étudier la chasse"}
      </button>
    </>
  );
}
