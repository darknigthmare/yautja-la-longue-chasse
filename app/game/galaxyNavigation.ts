import { MISSIONS } from "./data";
import {
  GALAXY_SYSTEM_REGISTRY,
  type GalaxyBodyRegistryEntry,
  type GalaxyBodyStatus,
  type GalaxyBodyType,
  type GalaxySystemRegistryEntry,
} from "./galaxyRegistry";
import type {
  BiomeId,
  MissionDefinition,
  MissionId,
  MissionPalette,
} from "./types";

export const GALAXY_BIOME_LABELS = Object.freeze({
  jungle: "Jungle équatoriale",
  ice: "Banquise cryogénique",
  volcano: "Sanctuaire volcanique",
  swamp: "Marais acide",
  desert: "Désert de verre",
  ocean: "Archipel abyssal",
  fungal: "Réseau fongique",
  ruins: "Mégalopole en ruines",
} satisfies Readonly<Record<BiomeId, string>>);

export const GALAXY_BODY_KIND_LABELS = Object.freeze({
  planet: "Planète",
  moon: "Lune",
  "gas-giant": "Géante gazeuse",
  station: "Station",
  "asteroid-belt": "Ceinture",
  anomaly: "Anomalie",
} satisfies Readonly<Record<GalaxyBodyType, string>>);

export const GALAXY_BODY_STATUS_LABELS = Object.freeze({
  active: "Chasse active",
  surveyed: "Monde prospecté",
  charted: "Corps cartographié",
} satisfies Readonly<Record<GalaxyBodyStatus, string>>);

/**
 * Read-only navigation data used by the bridge map.  The tree is deliberately
 * derived from MISSIONS so adding another hunt to data.ts automatically adds
 * it to the right planet, system and galaxy without duplicating content.
 */
export interface GalaxyMissionNode {
  id: MissionId;
  order: number;
  title: string;
  subtitle: string;
  targetName: string;
  threatLevel: MissionDefinition["threatLevel"];
  prerequisiteMissionId: MissionId | null;
  palette: MissionPalette;
}

export interface GalaxyBodyNode {
  id: string;
  name: string;
  bodyKind: GalaxyBodyType;
  status: GalaxyBodyStatus;
  biome: BiomeId;
  environment: string;
  summary: string;
  population: string;
  signal: string;
  hazard: string;
  /** Position inside the selected system, expressed as a percentage. */
  position: Readonly<{ x: number; y: number }>;
  accent: string;
  missions: readonly GalaxyMissionNode[];
}

/** Legacy name kept so callers do not need a flag-day migration. */
export type GalaxyPlanetNode = GalaxyBodyNode;

export interface GalaxySystemNode {
  id: string;
  name: string;
  starName: string;
  starClass: string;
  description: string;
  /** Position on the galactic chart, expressed as a percentage. */
  position: Readonly<{ x: number; y: number }>;
  accent: string;
  /** Every mapped object, including moons, stations and anomalies. */
  bodies: readonly GalaxyBodyNode[];
  /** Planet-only compatibility view used by campaign summaries. */
  planets: readonly GalaxyPlanetNode[];
}

export interface GalaxyNavigationTree {
  id: "long-hunt-galaxy";
  name: string;
  description: string;
  systemCount: number;
  bodyCount: number;
  planetCount: number;
  huntWorldCount: number;
  missionCount: number;
  systems: readonly GalaxySystemNode[];
}

export type GalaxyNavigationLevel =
  | "galaxy"
  | "system"
  | "planet"
  | "mission";

/** Serializable state, suitable for React, tests and eventual save migration. */
export interface GalaxyNavigationState {
  level: GalaxyNavigationLevel;
  systemId: string | null;
  planetId: string | null;
  missionId: MissionId | null;
  cursorIndex: number;
}

export type GalaxyNavigationAction =
  | { type: "move"; delta: -1 | 1 }
  | { type: "activate" }
  | { type: "back" }
  | { type: "reset" }
  | { type: "open-system"; systemId: string }
  | { type: "open-planet"; planetId: string }
  | { type: "open-mission"; missionId: MissionId };

export interface GalaxyNavigationItem {
  kind: "system" | "planet" | "mission";
  id: string;
  label: string;
  detail: string;
}

export interface GalaxyNavigationSelection {
  system: GalaxySystemNode | null;
  planet: GalaxyPlanetNode | null;
  mission: GalaxyMissionNode | null;
}

function toMissionNode(mission: MissionDefinition): GalaxyMissionNode {
  return {
    id: mission.id,
    order: mission.order,
    title: mission.title,
    subtitle: mission.subtitle,
    targetName: mission.targetName,
    threatLevel: mission.threatLevel,
    prerequisiteMissionId: mission.prerequisiteMissionId,
    palette: mission.palette,
  };
}

/** Build the navigation tree by joining missions onto the explicit registry. */
export function buildGalaxyNavigation(
  missions: readonly MissionDefinition[] = MISSIONS,
  registry: readonly GalaxySystemRegistryEntry[] = GALAXY_SYSTEM_REGISTRY,
): GalaxyNavigationTree {
  const registrySystemIds = new Set<string>();
  const registryBodyIds = new Set<string>();
  const missionBindings = new Map<string, GalaxyBodyRegistryEntry>();

  for (const system of registry) {
    if (registrySystemIds.has(system.id)) {
      throw new Error(`Duplicate galaxy system id: ${system.id}`);
    }
    registrySystemIds.add(system.id);
    for (const mappedBody of system.bodies) {
      if (registryBodyIds.has(mappedBody.id)) {
        throw new Error(`Duplicate galaxy body id: ${mappedBody.id}`);
      }
      registryBodyIds.add(mappedBody.id);
      if (mappedBody.missionPlanetName) {
        if (missionBindings.has(mappedBody.missionPlanetName)) {
          throw new Error(
            `Duplicate mission planet binding: ${mappedBody.missionPlanetName}`,
          );
        }
        missionBindings.set(mappedBody.missionPlanetName, mappedBody);
      }
    }
  }

  const missionsByPlanetName = new Map<string, MissionDefinition[]>();
  for (const mission of missions) {
    if (!missionBindings.has(mission.planetName)) {
      throw new Error(
        `Mission ${mission.id} has no registry binding for ${mission.planetName}`,
      );
    }
    const planetMissions = missionsByPlanetName.get(mission.planetName) ?? [];
    planetMissions.push(mission);
    missionsByPlanetName.set(mission.planetName, planetMissions);
  }

  const systemNodes = registry.map<GalaxySystemNode>((system) => {
    const bodies = system.bodies.map<GalaxyBodyNode>((mappedBody) => ({
      id: mappedBody.id,
      name: mappedBody.name,
      bodyKind: mappedBody.type,
      status: mappedBody.status,
      biome: mappedBody.biome,
      environment: mappedBody.environment,
      summary: mappedBody.summary,
      population: mappedBody.population,
      signal: mappedBody.signal,
      hazard: mappedBody.hazard,
      position: mappedBody.position,
      accent: mappedBody.accent,
      missions: (mappedBody.missionPlanetName
        ? (missionsByPlanetName.get(mappedBody.missionPlanetName) ?? [])
        : []
      )
        .toSorted((a, b) => a.order - b.order)
        .map(toMissionNode),
    }));

    return {
      id: system.id,
      name: system.name,
      starName: system.starName,
      starClass: system.starClass,
      description: system.summary,
      position: system.position,
      accent: system.accent,
      bodies,
      planets: bodies.filter(({ bodyKind }) => bodyKind === "planet"),
    };
  });

  const allBodies = systemNodes.flatMap(({ bodies }) => bodies);

  return {
    id: "long-hunt-galaxy",
    name: "Étendue de la Longue Chasse",
    description:
      "Registre des systèmes, mondes, stations et signaux connus du clan.",
    systemCount: systemNodes.length,
    bodyCount: allBodies.length,
    planetCount: allBodies.filter(({ bodyKind }) => bodyKind === "planet")
      .length,
    huntWorldCount: allBodies.filter(
      ({ bodyKind, status }) =>
        bodyKind === "planet" && status === "active",
    ).length,
    missionCount: missions.length,
    systems: systemNodes,
  };
}

export const GALAXY_NAVIGATION = buildGalaxyNavigation();

export function createGalaxyNavigationState(): GalaxyNavigationState {
  return {
    level: "galaxy",
    systemId: null,
    planetId: null,
    missionId: null,
    cursorIndex: 0,
  };
}

function findPlanet(
  tree: GalaxyNavigationTree,
  planetId: string | null,
): { system: GalaxySystemNode; planet: GalaxyPlanetNode } | null {
  if (!planetId) return null;
  for (const system of tree.systems) {
    const planet = system.bodies.find(({ id }) => id === planetId);
    if (planet) return { system, planet };
  }
  return null;
}

export function findGalaxyMission(
  tree: GalaxyNavigationTree,
  missionId: MissionId | null,
): {
  system: GalaxySystemNode;
  planet: GalaxyPlanetNode;
  mission: GalaxyMissionNode;
} | null {
  if (!missionId) return null;
  for (const system of tree.systems) {
    for (const planet of system.bodies) {
      const mission = planet.missions.find(({ id }) => id === missionId);
      if (mission) return { system, planet, mission };
    }
  }
  return null;
}

export function getGalaxyNavigationSelection(
  tree: GalaxyNavigationTree,
  state: GalaxyNavigationState,
): GalaxyNavigationSelection {
  const missionPath = findGalaxyMission(tree, state.missionId);
  if (missionPath) {
    return {
      system: missionPath.system,
      planet: missionPath.planet,
      mission: missionPath.mission,
    };
  }
  const planetPath = findPlanet(tree, state.planetId);
  if (planetPath) {
    return {
      system: planetPath.system,
      planet: planetPath.planet,
      mission: null,
    };
  }
  return {
    system:
      tree.systems.find(({ id }) => id === state.systemId) ?? null,
    planet: null,
    mission: null,
  };
}

export function getGalaxyNavigationItems(
  tree: GalaxyNavigationTree,
  state: GalaxyNavigationState,
): readonly GalaxyNavigationItem[] {
  const selection = getGalaxyNavigationSelection(tree, state);
  if (state.level === "galaxy") {
    return tree.systems.map((system) => {
      const huntCount = system.bodies.reduce(
        (total, planet) => total + planet.missions.length,
        0,
      );
      return {
        kind: "system",
        id: system.id,
        label: system.name,
        detail: `${system.bodies.length} corps · ${system.planets.length} mondes · ${huntCount} ${huntCount > 1 ? "chasses" : "chasse"}`,
      };
    });
  }
  if (state.level === "system" && selection.system) {
    return selection.system.bodies.map(bodyNavigationItem);
  }
  if (state.level === "planet" && selection.planet) {
    if (selection.planet.missions.length === 0 && selection.system) {
      return selection.system.bodies.map(bodyNavigationItem);
    }
    return selection.planet.missions.map((mission) => ({
      kind: "mission",
      id: mission.id,
      label: mission.title,
      detail: `${mission.targetName} · menace ${mission.threatLevel}/4`,
    }));
  }
  if (state.level === "mission" && selection.mission) {
    return [
      {
        kind: "mission",
        id: selection.mission.id,
        label: selection.mission.title,
        detail: selection.mission.subtitle,
      },
    ];
  }
  return [];
}

function bodyNavigationItem(body: GalaxyBodyNode): GalaxyNavigationItem {
  const missionDetail = body.missions.length
    ? `${body.missions.length} ${body.missions.length > 1 ? "missions" : "mission"}`
    : GALAXY_BODY_STATUS_LABELS[body.status];
  return {
    kind: "planet",
    id: body.id,
    label: body.name,
    detail: `${GALAXY_BODY_KIND_LABELS[body.bodyKind]} · ${body.environment} · ${missionDetail}`,
  };
}

function wrappedIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

/** Pure reducer shared by keyboard, gamepad and touch map presentations. */
export function reduceGalaxyNavigation(
  tree: GalaxyNavigationTree,
  state: GalaxyNavigationState,
  action: GalaxyNavigationAction,
): GalaxyNavigationState {
  if (action.type === "reset") return createGalaxyNavigationState();

  if (action.type === "open-mission") {
    const path = findGalaxyMission(tree, action.missionId);
    return path
      ? {
          level: "mission",
          systemId: path.system.id,
          planetId: path.planet.id,
          missionId: path.mission.id,
          cursorIndex: 0,
        }
      : state;
  }

  if (action.type === "open-system") {
    const system = tree.systems.find(({ id }) => id === action.systemId);
    return system
      ? {
          level: "system",
          systemId: system.id,
          planetId: null,
          missionId: null,
          cursorIndex: 0,
        }
      : state;
  }

  if (action.type === "open-planet") {
    const path = findPlanet(tree, action.planetId);
    return path
      ? {
          level: "planet",
          systemId: path.system.id,
          planetId: path.planet.id,
          missionId: null,
          cursorIndex:
            path.planet.missions.length === 0
              ? Math.max(
                  0,
                  path.system.bodies.findIndex(
                    ({ id }) => id === path.planet.id,
                  ),
                )
              : 0,
        }
      : state;
  }

  const items = getGalaxyNavigationItems(tree, state);
  if (action.type === "move") {
    if (state.level === "mission") {
      const selection = getGalaxyNavigationSelection(tree, state);
      const siblings = selection.planet?.missions ?? [];
      const currentIndex = siblings.findIndex(({ id }) => id === state.missionId);
      const next = siblings[wrappedIndex(currentIndex + action.delta, siblings.length)];
      return next ? { ...state, missionId: next.id } : state;
    }
    return {
      ...state,
      cursorIndex: wrappedIndex(state.cursorIndex + action.delta, items.length),
    };
  }

  if (action.type === "activate") {
    const item = items[wrappedIndex(state.cursorIndex, items.length)];
    if (!item) return state;
    if (item.kind === "system") {
      return reduceGalaxyNavigation(tree, state, {
        type: "open-system",
        systemId: item.id,
      });
    }
    if (item.kind === "planet") {
      return reduceGalaxyNavigation(tree, state, {
        type: "open-planet",
        planetId: item.id,
      });
    }
    return reduceGalaxyNavigation(tree, state, {
      type: "open-mission",
      missionId: item.id as MissionId,
    });
  }

  if (action.type === "back") {
    const selection = getGalaxyNavigationSelection(tree, state);
    if (state.level === "mission" && selection.planet) {
      const cursorIndex = Math.max(
        0,
        selection.planet.missions.findIndex(({ id }) => id === state.missionId),
      );
      return {
        level: "planet",
        systemId: selection.system?.id ?? null,
        planetId: selection.planet.id,
        missionId: null,
        cursorIndex,
      };
    }
    if (state.level === "planet" && selection.system && selection.planet) {
      return {
        level: "system",
        systemId: selection.system.id,
        planetId: null,
        missionId: null,
        cursorIndex: Math.max(
          0,
          selection.system.bodies.findIndex(
            ({ id }) => id === selection.planet?.id,
          ),
        ),
      };
    }
    if (state.level === "system" && selection.system) {
      return {
        level: "galaxy",
        systemId: null,
        planetId: null,
        missionId: null,
        cursorIndex: Math.max(
          0,
          tree.systems.findIndex(({ id }) => id === selection.system?.id),
        ),
      };
    }
  }

  return state;
}

export function getGalaxyNavigationBreadcrumbs(
  tree: GalaxyNavigationTree,
  state: GalaxyNavigationState,
): readonly string[] {
  const selection = getGalaxyNavigationSelection(tree, state);
  return [
    tree.name,
    selection.system?.name,
    selection.planet?.name,
    selection.mission?.title,
  ].filter((label): label is string => Boolean(label));
}
