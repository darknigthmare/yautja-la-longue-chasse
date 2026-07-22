import { MISSIONS } from "./data";
import {
  GALAXY_SECTOR_REGISTRY,
  GALAXY_SYSTEM_REGISTRY,
  type GalaxyBodyRegistryEntry,
  type GalaxyBodyStatus,
  type GalaxyBodyType,
  type GalaxySectorRegistryEntry,
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
  sectorId: string;
  name: string;
  starName: string;
  starClass: string;
  description: string;
  /** Position inside its sector chart, expressed as a percentage. */
  position: Readonly<{ x: number; y: number }>;
  accent: string;
  /** Every mapped object, including moons, stations and anomalies. */
  bodies: readonly GalaxyBodyNode[];
  /** Planet-only compatibility view used by campaign summaries. */
  planets: readonly GalaxyPlanetNode[];
}

export interface GalaxySectorNode {
  id: string;
  name: string;
  description: string;
  /** Position on the full galactic chart, expressed as a percentage. */
  position: Readonly<{ x: number; y: number }>;
  accent: string;
  systems: readonly GalaxySystemNode[];
}

export interface GalaxyNavigationTree {
  id: "long-hunt-galaxy";
  name: string;
  description: string;
  sectorCount: number;
  systemCount: number;
  bodyCount: number;
  planetCount: number;
  huntWorldCount: number;
  missionCount: number;
  sectors: readonly GalaxySectorNode[];
  /** Flat compatibility view for campaign summaries and direct lookups. */
  systems: readonly GalaxySystemNode[];
}

export type GalaxyNavigationLevel =
  | "galaxy"
  | "sector"
  | "system"
  | "planet"
  | "mission";

/** Serializable state, suitable for React, tests and eventual save migration. */
export interface GalaxyNavigationState {
  level: GalaxyNavigationLevel;
  sectorId: string | null;
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
  | { type: "open-sector"; sectorId: string }
  | { type: "open-system"; systemId: string }
  | { type: "open-planet"; planetId: string }
  | { type: "open-mission"; missionId: MissionId };

export interface GalaxyNavigationItem {
  kind: "sector" | "system" | "planet" | "mission";
  id: string;
  label: string;
  detail: string;
}

export interface GalaxyNavigationSelection {
  sector: GalaxySectorNode | null;
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

function isPercentagePosition(position: Readonly<{ x: number; y: number }>) {
  return (
    Number.isFinite(position.x) &&
    Number.isFinite(position.y) &&
    position.x >= 0 &&
    position.x <= 100 &&
    position.y >= 0 &&
    position.y <= 100
  );
}

/** Build the navigation tree by joining missions onto the explicit registry. */
export function buildGalaxyNavigation(
  missions: readonly MissionDefinition[] = MISSIONS,
  registry: readonly GalaxySystemRegistryEntry[] = GALAXY_SYSTEM_REGISTRY,
  sectorRegistry: readonly GalaxySectorRegistryEntry[] = GALAXY_SECTOR_REGISTRY,
): GalaxyNavigationTree {
  const registrySystemIds = new Set<string>();
  const registryBodyIds = new Set<string>();
  const missionBindings = new Map<string, GalaxyBodyRegistryEntry>();
  const registrySystemsById = new Map<string, GalaxySystemRegistryEntry>();

  for (const system of registry) {
    if (registrySystemIds.has(system.id)) {
      throw new Error(`Duplicate galaxy system id: ${system.id}`);
    }
    registrySystemIds.add(system.id);
    registrySystemsById.set(system.id, system);
    for (const mappedBody of system.bodies) {
      if (registryBodyIds.has(mappedBody.id)) {
        throw new Error(`Duplicate galaxy body id: ${mappedBody.id}`);
      }
      registryBodyIds.add(mappedBody.id);
      if (!isPercentagePosition(mappedBody.position)) {
        throw new Error(`Invalid galaxy body position: ${mappedBody.id}`);
      }
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

  const registrySectorIds = new Set<string>();
  const placedSystemIds = new Set<string>();
  for (const sector of sectorRegistry) {
    if (registrySectorIds.has(sector.id)) {
      throw new Error(`Duplicate galaxy sector id: ${sector.id}`);
    }
    registrySectorIds.add(sector.id);
    if (!isPercentagePosition(sector.position)) {
      throw new Error(`Invalid galaxy sector position: ${sector.id}`);
    }
    for (const placement of sector.systems) {
      if (!registrySystemsById.has(placement.systemId)) {
        throw new Error(
          `Unknown galaxy system placement: ${placement.systemId}`,
        );
      }
      if (placedSystemIds.has(placement.systemId)) {
        throw new Error(
          `Duplicate galaxy system placement: ${placement.systemId}`,
        );
      }
      if (!isPercentagePosition(placement.position)) {
        throw new Error(
          `Invalid galaxy system position: ${placement.systemId}`,
        );
      }
      placedSystemIds.add(placement.systemId);
    }
  }

  for (const systemId of registrySystemIds) {
    if (!placedSystemIds.has(systemId)) {
      throw new Error(`Galaxy system has no sector placement: ${systemId}`);
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

  const toSystemNode = (
    system: GalaxySystemRegistryEntry,
    sectorId: string,
    localPosition: Readonly<{ x: number; y: number }>,
  ): GalaxySystemNode => {
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
      sectorId,
      name: system.name,
      starName: system.starName,
      starClass: system.starClass,
      description: system.summary,
      position: localPosition,
      accent: system.accent,
      bodies,
      planets: bodies.filter(({ bodyKind }) => bodyKind === "planet"),
    };
  };

  const sectors = sectorRegistry.map<GalaxySectorNode>((sector) => ({
    id: sector.id,
    name: sector.name,
    description: sector.description,
    position: sector.position,
    accent: sector.accent,
    systems: sector.systems.map((placement) =>
      toSystemNode(
        registrySystemsById.get(placement.systemId)!,
        sector.id,
        placement.position,
      ),
    ),
  }));
  const systemNodes = sectors.flatMap(({ systems }) => systems);

  const allBodies = systemNodes.flatMap(({ bodies }) => bodies);

  return {
    id: "long-hunt-galaxy",
    name: "Étendue de la Longue Chasse",
    description:
      "Registre des systèmes, mondes, stations et signaux connus du clan.",
    sectorCount: sectors.length,
    systemCount: systemNodes.length,
    bodyCount: allBodies.length,
    planetCount: allBodies.filter(({ bodyKind }) => bodyKind === "planet")
      .length,
    huntWorldCount: allBodies.filter(
      ({ bodyKind, status }) =>
        bodyKind === "planet" && status === "active",
    ).length,
    missionCount: missions.length,
    sectors,
    systems: systemNodes,
  };
}

export const GALAXY_NAVIGATION = buildGalaxyNavigation();

export function createGalaxyNavigationState(): GalaxyNavigationState {
  return {
    level: "galaxy",
    sectorId: null,
    systemId: null,
    planetId: null,
    missionId: null,
    cursorIndex: 0,
  };
}

function findSector(
  tree: GalaxyNavigationTree,
  sectorId: string | null,
): GalaxySectorNode | null {
  if (!sectorId) return null;
  return tree.sectors.find(({ id }) => id === sectorId) ?? null;
}

function findSystem(
  tree: GalaxyNavigationTree,
  systemId: string | null,
): { sector: GalaxySectorNode; system: GalaxySystemNode } | null {
  if (!systemId) return null;
  for (const sector of tree.sectors) {
    const system = sector.systems.find(({ id }) => id === systemId);
    if (system) return { sector, system };
  }
  return null;
}

function findPlanet(
  tree: GalaxyNavigationTree,
  planetId: string | null,
): {
  sector: GalaxySectorNode;
  system: GalaxySystemNode;
  planet: GalaxyPlanetNode;
} | null {
  if (!planetId) return null;
  for (const sector of tree.sectors) {
    for (const system of sector.systems) {
      const planet = system.bodies.find(({ id }) => id === planetId);
      if (planet) return { sector, system, planet };
    }
  }
  return null;
}

export function findGalaxyMission(
  tree: GalaxyNavigationTree,
  missionId: MissionId | null,
): {
  sector: GalaxySectorNode;
  system: GalaxySystemNode;
  planet: GalaxyPlanetNode;
  mission: GalaxyMissionNode;
} | null {
  if (!missionId) return null;
  for (const sector of tree.sectors) {
    for (const system of sector.systems) {
      for (const planet of system.bodies) {
        const mission = planet.missions.find(({ id }) => id === missionId);
        if (mission) return { sector, system, planet, mission };
      }
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
      sector: missionPath.sector,
      system: missionPath.system,
      planet: missionPath.planet,
      mission: missionPath.mission,
    };
  }
  const planetPath = findPlanet(tree, state.planetId);
  if (planetPath) {
    return {
      sector: planetPath.sector,
      system: planetPath.system,
      planet: planetPath.planet,
      mission: null,
    };
  }
  const systemPath = findSystem(tree, state.systemId);
  if (systemPath) {
    return {
      sector: systemPath.sector,
      system: systemPath.system,
      planet: null,
      mission: null,
    };
  }
  return {
    sector: findSector(tree, state.sectorId),
    system: null,
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
    return tree.sectors.map((sector) => {
      const planetCount = sector.systems.reduce(
        (total, system) => total + system.planets.length,
        0,
      );
      const huntCount = sector.systems.reduce(
        (total, system) =>
          total +
          system.bodies.reduce(
            (systemTotal, planet) => systemTotal + planet.missions.length,
            0,
          ),
        0,
      );
      return {
        kind: "sector",
        id: sector.id,
        label: sector.name,
        detail: `${sector.systems.length} systèmes · ${planetCount} mondes · ${huntCount} ${huntCount > 1 ? "chasses" : "chasse"}`,
      };
    });
  }
  if (state.level === "sector" && selection.sector) {
    return selection.sector.systems.map(systemNavigationItem);
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
  if (state.level === "mission" && selection.planet) {
    return selection.planet.missions.map((mission) => ({
      kind: "mission",
      id: mission.id,
      label: mission.title,
      detail: mission.subtitle,
    }));
  }
  return [];
}

function systemNavigationItem(system: GalaxySystemNode): GalaxyNavigationItem {
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

  if (action.type === "open-sector") {
    const sector = findSector(tree, action.sectorId);
    return sector
      ? {
          level: "sector",
          sectorId: sector.id,
          systemId: null,
          planetId: null,
          missionId: null,
          cursorIndex: 0,
        }
      : state;
  }

  if (action.type === "open-mission") {
    const path = findGalaxyMission(tree, action.missionId);
    return path
      ? {
          level: "mission",
          sectorId: path.sector.id,
          systemId: path.system.id,
          planetId: path.planet.id,
          missionId: path.mission.id,
          cursorIndex: 0,
        }
      : state;
  }

  if (action.type === "open-system") {
    const path = findSystem(tree, action.systemId);
    return path
      ? {
          level: "system",
          sectorId: path.sector.id,
          systemId: path.system.id,
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
          sectorId: path.sector.id,
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
    if (item.kind === "sector") {
      return reduceGalaxyNavigation(tree, state, {
        type: "open-sector",
        sectorId: item.id,
      });
    }
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
        sectorId: selection.sector?.id ?? null,
        systemId: selection.system?.id ?? null,
        planetId: selection.planet.id,
        missionId: null,
        cursorIndex,
      };
    }
    if (state.level === "planet" && selection.system && selection.planet) {
      return {
        level: "system",
        sectorId: selection.sector?.id ?? null,
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
    if (
      state.level === "system" &&
      selection.sector &&
      selection.system
    ) {
      return {
        level: "sector",
        sectorId: selection.sector.id,
        systemId: null,
        planetId: null,
        missionId: null,
        cursorIndex: Math.max(
          0,
          selection.sector.systems.findIndex(
            ({ id }) => id === selection.system?.id,
          ),
        ),
      };
    }
    if (state.level === "sector" && selection.sector) {
      return {
        level: "galaxy",
        sectorId: null,
        systemId: null,
        planetId: null,
        missionId: null,
        cursorIndex: Math.max(
          0,
          tree.sectors.findIndex(({ id }) => id === selection.sector?.id),
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
    selection.sector?.name,
    selection.system?.name,
    selection.planet?.name,
    selection.mission?.title,
  ].filter((label): label is string => Boolean(label));
}
