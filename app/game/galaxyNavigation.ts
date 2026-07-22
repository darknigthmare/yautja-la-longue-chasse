import { MISSIONS } from "./data";
import type {
  BiomeId,
  MissionDefinition,
  MissionId,
  MissionPalette,
} from "./types";

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

export interface GalaxyPlanetNode {
  id: string;
  name: string;
  biome: BiomeId;
  /** Position inside the selected system, expressed as a percentage. */
  position: Readonly<{ x: number; y: number }>;
  missions: readonly GalaxyMissionNode[];
}

export interface GalaxySystemNode {
  id: string;
  name: string;
  /** Position on the galactic chart, expressed as a percentage. */
  position: Readonly<{ x: number; y: number }>;
  accent: string;
  planets: readonly GalaxyPlanetNode[];
}

export interface GalaxyNavigationTree {
  id: "long-hunt-galaxy";
  name: string;
  description: string;
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

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deriveSystemRoot(planetName: string): string {
  const segments = planetName.split("-");
  const suffix = segments.at(-1) ?? "";
  // Common catalogue forms such as Oseris-IV, Nivalis-K and Cinder-12.
  if (
    segments.length > 1 &&
    /^(?:[ivxlcdm]+|\d+|[a-z])$/i.test(suffix)
  ) {
    return segments.slice(0, -1).join("-");
  }
  return planetName;
}

function stableUnit(seed: string, salt: number): number {
  let hash = 2_166_136_261 ^ salt;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0) / 4_294_967_295;
}

function chartPosition(
  seed: string,
  inset = 12,
): Readonly<{ x: number; y: number }> {
  const span = 100 - inset * 2;
  return {
    x: Number((inset + stableUnit(seed, 17) * span).toFixed(2)),
    y: Number((inset + stableUnit(seed, 43) * span).toFixed(2)),
  };
}

/** Build a deterministic systems/planets/missions tree from mission content. */
export function buildGalaxyNavigation(
  missions: readonly MissionDefinition[] = MISSIONS,
): GalaxyNavigationTree {
  const systems = new Map<
    string,
    {
      id: string;
      name: string;
      firstOrder: number;
      accent: string;
      planets: Map<
        string,
        {
          id: string;
          name: string;
          biome: BiomeId;
          firstOrder: number;
          missions: GalaxyMissionNode[];
        }
      >;
    }
  >();

  for (const mission of missions) {
    const systemRoot = deriveSystemRoot(mission.planetName);
    const systemId = `system-${slug(systemRoot)}`;
    const planetId = `planet-${slug(mission.planetName)}`;
    let system = systems.get(systemId);
    if (!system) {
      system = {
        id: systemId,
        name: `Système ${systemRoot}`,
        firstOrder: mission.order,
        accent: mission.palette.accent,
        planets: new Map(),
      };
      systems.set(systemId, system);
    }
    system.firstOrder = Math.min(system.firstOrder, mission.order);

    let planet = system.planets.get(planetId);
    if (!planet) {
      planet = {
        id: planetId,
        name: mission.planetName,
        biome: mission.biome,
        firstOrder: mission.order,
        missions: [],
      };
      system.planets.set(planetId, planet);
    }
    planet.firstOrder = Math.min(planet.firstOrder, mission.order);
    planet.missions.push({
      id: mission.id,
      order: mission.order,
      title: mission.title,
      subtitle: mission.subtitle,
      targetName: mission.targetName,
      threatLevel: mission.threatLevel,
      prerequisiteMissionId: mission.prerequisiteMissionId,
      palette: mission.palette,
    });
  }

  const systemNodes = [...systems.values()]
    .sort((a, b) => a.firstOrder - b.firstOrder || a.name.localeCompare(b.name))
    .map<GalaxySystemNode>((system) => ({
      id: system.id,
      name: system.name,
      position: chartPosition(system.id),
      accent: system.accent,
      planets: [...system.planets.values()]
        .sort(
          (a, b) =>
            a.firstOrder - b.firstOrder || a.name.localeCompare(b.name),
        )
        .map<GalaxyPlanetNode>((planet) => ({
          id: planet.id,
          name: planet.name,
          biome: planet.biome,
          position: chartPosition(planet.id, 18),
          missions: planet.missions
            .toSorted((a, b) => a.order - b.order)
            .map((mission) => ({ ...mission })),
        })),
    }));

  return {
    id: "long-hunt-galaxy",
    name: "Étendue de la Longue Chasse",
    description:
      "Carte hiérarchique des systèmes, mondes et contrats connus du clan.",
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
    const planet = system.planets.find(({ id }) => id === planetId);
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
    for (const planet of system.planets) {
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
    return tree.systems.map((system) => ({
      kind: "system",
      id: system.id,
      label: system.name,
      detail: `${system.planets.length} planète(s) · ${system.planets.reduce(
        (total, planet) => total + planet.missions.length,
        0,
      )} chasse(s)`,
    }));
  }
  if (state.level === "system" && selection.system) {
    return selection.system.planets.map((planet) => ({
      kind: "planet",
      id: planet.id,
      label: planet.name,
      detail: `${planet.biome} · ${planet.missions.length} mission(s)`,
    }));
  }
  if (state.level === "planet" && selection.planet) {
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
          cursorIndex: 0,
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
          selection.system.planets.findIndex(
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
