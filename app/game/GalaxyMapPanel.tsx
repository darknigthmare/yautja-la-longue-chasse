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
import { backgroundPathForBiome } from "./worldScreens";
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
  type GalaxySystemNode,
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

const BODY_GLYPHS = Object.freeze({
  planet: "●",
  moon: "◔",
  "gas-giant": "≋",
  station: "◇",
  "asteroid-belt": "∴",
  anomaly: "⌁",
});

function missionBackground(mission: MissionDefinition): string {
  return backgroundPathForBiome(mission.biome);
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

function missionPosition(
  index: number,
  total: number,
): Readonly<{ x: number; y: number }> {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, total);
  return {
    x: 50 + Math.cos(angle) * (total === 1 ? 28 : 31),
    y: 50 + Math.sin(angle) * (total === 1 ? 0 : 29),
  };
}

export default function GalaxyMapPanel({
  missionProgress,
  initialState,
  onStateChange,
  onBack,
  onChooseMission,
}: GalaxyMapPanelProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const latestStateRef = useRef(initialState ?? createGalaxyNavigationState());
  const onBackRef = useRef(onBack);
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

  const returnToGalaxy = useCallback(() => {
    dispatch({ type: "reset" });
    window.requestAnimationFrame(() => {
      chartRef.current?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    onStateChange?.(state);
  }, [onStateChange, state]);

  useEffect(() => {
    latestStateRef.current = state;
    onBackRef.current = onBack;
  }, [onBack, state]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      chartRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    let previous = new Set<string>();
    const readGamepad = () => {
      const pad = navigator.getGamepads?.().find(Boolean);
      const pressed = new Set<string>();
      if (pad) {
        const horizontal = pad.axes[0] ?? 0;
        const vertical = pad.axes[1] ?? 0;
        if (pad.buttons[14]?.pressed || horizontal < -0.6) pressed.add("previous");
        if (pad.buttons[15]?.pressed || horizontal > 0.6) pressed.add("next");
        if (pad.buttons[12]?.pressed || vertical < -0.6) pressed.add("previous");
        if (pad.buttons[13]?.pressed || vertical > 0.6) pressed.add("next");
        if (pad.buttons[0]?.pressed) pressed.add("activate");
        if (pad.buttons[1]?.pressed) pressed.add("back");
      }
      for (const command of pressed) {
        if (previous.has(command)) continue;
        if (command === "previous") dispatch({ type: "move", delta: -1 });
        if (command === "next") dispatch({ type: "move", delta: 1 });
        if (command === "activate") dispatch({ type: "activate" });
        if (command === "back") {
          if (latestStateRef.current.level === "galaxy") onBackRef.current();
          else dispatch({ type: "back" });
        }
      }
      previous = pressed;
      animationFrame = window.requestAnimationFrame(readGamepad);
    };
    animationFrame = window.requestAnimationFrame(readGamepad);
    return () => window.cancelAnimationFrame(animationFrame);
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
    } else if (event.key.toLowerCase() === "g") {
      event.preventDefault();
      returnToGalaxy();
    }
  };

  const activeMission = selection.mission
    ? MISSION_BY_ID[selection.mission.id]
    : null;
  const activeItem = items[state.cursorIndex] ?? items[0] ?? null;
  const previewSystem = state.level === "galaxy"
    ? GALAXY_NAVIGATION.systems.find(({ id }) => id === activeItem?.id) ?? null
    : selection.system;
  const previewBody = state.level === "system"
    ? selection.system?.bodies.find(({ id }) => id === activeItem?.id) ?? null
    : selection.planet;

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
      <div className="screen-safe galaxy-screen-safe">
        <header className="galaxy-map-header">
          <button
            type="button"
            className="back-button"
            onClick={navigateBack}
            aria-label="Revenir au niveau précédent"
          >
            ←
          </button>
          <div className="galaxy-map-heading">
            <p className="eyebrow">Navigation // Registre stellaire V9</p>
            <h1 id="galaxy-map-title">{GALAXY_NAVIGATION.name}</h1>
            <p>{GALAXY_NAVIGATION.description}</p>
          </div>
          <div className="galaxy-header-actions">
            <button
              type="button"
              className="galaxy-home-button"
              onClick={returnToGalaxy}
              disabled={state.level === "galaxy"}
            >
              <span aria-hidden="true">✦</span>
              Vue galaxie
              <kbd>G</kbd>
            </button>
            <figure className="galaxy-ship-marker" aria-label="Vaisseau du clan">
              <img src="/game/sprites/v6/ships-atlas.png" alt="Vaisseaux du clan" />
            </figure>
          </div>
        </header>

        <dl className="galaxy-registry-counters" aria-label="Contenu du registre galactique">
          <div><dt>Systèmes</dt><dd>{GALAXY_NAVIGATION.systemCount}</dd></div>
          <div><dt>Planètes</dt><dd>{GALAXY_NAVIGATION.planetCount}</dd></div>
          <div><dt>Corps recensés</dt><dd>{GALAXY_NAVIGATION.bodyCount}</dd></div>
          <div><dt>Mondes de chasse</dt><dd>{GALAXY_NAVIGATION.huntWorldCount}</dd></div>
        </dl>

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
            aria-label={`Carte galactique, niveau ${state.level}. Flèches pour naviguer, Entrée pour ouvrir, Échap pour revenir.`}
            aria-activedescendant={
              activeItem ? `galaxy-node-${activeItem.id}` : undefined
            }
            data-screen-focus
            tabIndex={0}
            onKeyDown={onKeyDown}
          >
            <div className="galaxy-chart-scan" aria-hidden="true" />

            {state.level === "system" && selection.system ? (
              <>
                <div className="galaxy-mini-context" aria-label="Autres systèmes cartographiés">
                  {GALAXY_NAVIGATION.systems.map((system) => (
                    <button
                      type="button"
                      className={system.id === selection.system?.id ? "current" : ""}
                      style={{ "--context-accent": system.accent } as CSSProperties}
                      key={system.id}
                      onClick={() => dispatch({ type: "open-system", systemId: system.id })}
                      aria-label={`Ouvrir ${system.name}`}
                      aria-current={system.id === selection.system?.id ? "true" : undefined}
                    >
                      <span aria-hidden="true" />
                      <small>{system.name.replace("Système ", "")}</small>
                    </button>
                  ))}
                </div>
                {[36, 53, 70, 87].map((size, orbitIndex) => (
                  <div
                    className="galaxy-orbit"
                    key={size}
                    style={{
                      "--orbit-size": `${size}%`,
                      "--orbit-delay": `${orbitIndex * -2.7}s`,
                    } as CSSProperties}
                    aria-hidden="true"
                  />
                ))}
                <div
                  className="galaxy-system-star"
                  style={{ "--star-accent": selection.system.accent } as CSSProperties}
                  aria-label={`${selection.system.starName}, ${selection.system.starClass}`}
                >
                  <span aria-hidden="true" />
                  <strong>{selection.system.starName}</strong>
                  <small>{selection.system.starClass}</small>
                </div>
              </>
            ) : null}

            {(state.level === "planet" || state.level === "mission") && selection.planet ? (
              <div
                className="galaxy-focus-body"
                data-body-kind={selection.planet.bodyKind}
                style={{ "--body-accent": selection.planet.accent } as CSSProperties}
                aria-hidden="true"
              >
                <span>{BODY_GLYPHS[selection.planet.bodyKind]}</span>
                <strong>{selection.planet.name}</strong>
                <small>{selection.planet.environment}</small>
              </div>
            ) : null}

            {items.map((item, index) => {
              const system = GALAXY_NAVIGATION.systems.find(({ id }) => id === item.id);
              const body = selection.system?.bodies.find(({ id }) => id === item.id);
              const position = system?.position ?? body?.position ?? missionPosition(index, items.length);
              const selected = index === state.cursorIndex ||
                (state.level === "mission" && item.id === state.missionId);
              const progress = item.kind === "mission"
                ? missionProgress[item.id as MissionId]
                : null;
              const bodyKind = body?.bodyKind;
              const nodeKind = bodyKind ?? item.kind;
              const accent = system?.accent ?? body?.accent ?? selection.system?.accent ?? "#70f4cf";
              return (
                <button
                  id={`galaxy-node-${item.id}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-label={`${item.label} — ${item.detail}`}
                  tabIndex={-1}
                  data-node-kind={nodeKind}
                  className={`galaxy-node ${item.kind} node-${nodeKind}${selected ? " selected" : ""}${progress?.status === "locked" ? " locked" : ""}${body?.status === "active" ? " hunt-world" : ""}`}
                  style={{
                    "--node-x": `${position.x}%`,
                    "--node-y": `${position.y}%`,
                    "--node-accent": accent,
                  } as CSSProperties}
                  key={item.id}
                  onClick={() => activateItem(item)}
                >
                  <span className="galaxy-node-core" aria-hidden="true">
                    {bodyKind ? BODY_GLYPHS[bodyKind] : item.kind === "system" ? "✦" : "△"}
                  </span>
                  <span className="galaxy-node-copy">
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                  {body?.status === "active" ? <em>Chasse</em> : null}
                </button>
              );
            })}

            {state.level === "planet" && selection.planet && items.length === 0 ? (
              <p className="galaxy-no-contract" role="status">
                Aucun contrat validé dans ce secteur. Le corps reste accessible à l’inspection.
              </p>
            ) : null}

            <p className="galaxy-control-hint">
              <span>Clavier</span> Flèches · Entrée · Échap
              <span>Manette</span> Croix · A · B
              <span>Tactile</span> Touchez un signal
            </p>
          </div>

          <aside className="galaxy-selection-panel" aria-live="polite">
            {activeMission ? (
              <MissionSelection
                mission={activeMission}
                progress={missionProgress[activeMission.id]}
                onChoose={() => onChooseMission(activeMission)}
              />
            ) : previewBody ? (
              <BodySelection body={previewBody} />
            ) : previewSystem ? (
              <SystemSelection system={previewSystem} />
            ) : (
              <GalaxySelection />
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}

function GalaxySelection() {
  return (
    <>
      <p className="mission-planet">Registre du secteur</p>
      <h2>Une galaxie habitée</h2>
      <p className="galaxy-selection-lead">
        Douze systèmes reliés par les routes du clan. Les huit mondes portant
        la balise « Chasse » possèdent un contrat et une écologie validés.
      </p>
      <dl className="galaxy-inspection-grid">
        <div><dt>Systèmes</dt><dd>{GALAXY_NAVIGATION.systemCount}</dd></div>
        <div><dt>Planètes</dt><dd>{GALAXY_NAVIGATION.planetCount}</dd></div>
        <div><dt>Corps</dt><dd>{GALAXY_NAVIGATION.bodyCount}</dd></div>
        <div><dt>Chasses</dt><dd>{GALAXY_NAVIGATION.huntWorldCount}</dd></div>
      </dl>
      <img
        className="galaxy-rank-atlas"
        src="/game/sprites/v6/ranks-lasers-atlas.png"
        alt="Insignes des rangs et couleurs de ciblage du clan"
      />
    </>
  );
}

function SystemSelection({ system }: { system: GalaxySystemNode }) {
  const typeCount = new Set(system.bodies.map(({ bodyKind }) => bodyKind)).size;
  return (
    <>
      <p className="mission-planet">Système stellaire</p>
      <h2>{system.name}</h2>
      <p className="galaxy-selection-lead">{system.description}</p>
      <div className="galaxy-star-card" style={{ "--star-accent": system.accent } as CSSProperties}>
        <span aria-hidden="true">✦</span>
        <div><small>Étoile centrale</small><strong>{system.starName}</strong><em>{system.starClass}</em></div>
      </div>
      <dl className="galaxy-inspection-grid">
        <div><dt>Corps</dt><dd>{system.bodies.length}</dd></div>
        <div><dt>Planètes</dt><dd>{system.planets.length}</dd></div>
        <div><dt>Types</dt><dd>{typeCount}</dd></div>
        <div><dt>Signaux</dt><dd>{system.bodies.filter(({ status }) => status === "active").length}</dd></div>
      </dl>
      <p className="galaxy-panel-prompt">Ouvrez le système pour analyser chaque orbite.</p>
    </>
  );
}

function BodySelection({ body }: { body: GalaxyBodyNode }) {
  const mission = body.missions[0] ? MISSION_BY_ID[body.missions[0].id] : null;
  const isHuntWorld = body.status === "active" && body.missions.length > 0;
  return (
    <>
      <p className="mission-planet">Corps sélectionné · {GALAXY_BODY_KIND_LABELS[body.bodyKind]}</p>
      <h2>{body.name}</h2>
      {mission ? (
        <div className="galaxy-body-visual">
          <img src={missionBackground(mission)} alt={`Surface de ${body.name}`} />
          <span>{GALAXY_BIOME_LABELS[body.biome]}</span>
        </div>
      ) : (
        <div
          className="galaxy-body-portrait"
          data-body-kind={body.bodyKind}
          style={{ "--body-accent": body.accent } as CSSProperties}
          role="img"
          aria-label={`${GALAXY_BODY_KIND_LABELS[body.bodyKind]} ${body.name}`}
        >
          <span aria-hidden="true">{BODY_GLYPHS[body.bodyKind]}</span>
          <small>{body.environment}</small>
        </div>
      )}
      <p className="galaxy-selection-lead">{body.summary}</p>
      <p className={`galaxy-contract-status${isHuntWorld ? " active" : " pending"}`}>
        <strong>{GALAXY_BODY_STATUS_LABELS[body.status]}</strong>
        {isHuntWorld
          ? "30 menaces cataloguées (24 endémiques + 6 communes)"
          : body.status === "surveyed"
            ? "Aucun contrat de chasse n’est encore validé sur ce monde."
            : "Aucun contrat de chasse validé sur ce corps cartographié."}
      </p>
      <dl className="galaxy-body-details">
        <div><dt>Milieu</dt><dd>{body.environment}</dd></div>
        <div><dt>Population</dt><dd>{body.population}</dd></div>
        <div><dt>Signal</dt><dd>{body.signal}</dd></div>
        <div><dt>Danger</dt><dd>{body.hazard}</dd></div>
      </dl>
      <p className="galaxy-panel-prompt">
        {body.missions.length > 0
          ? `${body.missions.length} contrat${body.missions.length > 1 ? "s" : ""} transmis par le clan.`
          : "Inspection libre : les données écologiques restent à confirmer."}
      </p>
    </>
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
      <p className="galaxy-contract-status active">
        <strong>Écologie de chasse</strong>
        30 menaces cataloguées (24 endémiques + 6 communes)
      </p>
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
