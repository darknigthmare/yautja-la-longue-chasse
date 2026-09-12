import type { ExplorationProgress } from "../types";
import type { WorldBlueprint, WorldRect } from "./worldBlueprints";
import { normalizeExplorationProgress } from "./explorationProgress";
import {
  PILOT_MISSION_ID,
  applyPilotWorld,
  discoverPilotRooms,
  pilotHint,
  pilotInteract,
} from "./metroidvaniaPilot";
import {
  ICE_MISSION_ID,
  applyIceExplorationWorld,
  discoverIceRooms,
  iceHint,
  iceInteract,
} from "./iceExplorationRegion";
import {
  applyExpansionExplorationWorld,
  discoverExpansionRegionRooms,
  expansionRegionHint,
  interactWithExpansionRegion,
  isExpansionExplorationMission,
} from "./expansionExplorationRegions";

function isExplorationFeature(id: string): boolean {
  return id.startsWith("jungle-pilot-")
    || id.startsWith("jungle-vertical-")
    || id.startsWith("ice-region-")
    || id.startsWith("volcano-forge-")
    || id.startsWith("swamp-brood-")
    || id.startsWith("desert-crypt-")
    || id.startsWith("ocean-pressure-")
    || id.startsWith("fungal-memory-")
    || id.startsWith("ruins-oracle-")
    || id === "jungle-resonance-seal"
    || id === "jungle-canopy-hatch"
    || id === "ice-mine-relay"
    || id === "ice-return-hatch";
}

/** Keep route references aligned with the actual replaced geometry, not removed ledges. */
export function applyExplorationWorld(
  base: WorldBlueprint,
  progress: ExplorationProgress,
): WorldBlueprint {
  const world = base.missionId === PILOT_MISSION_ID
    ? applyPilotWorld(base, progress)
    : base.missionId === ICE_MISSION_ID
      ? applyIceExplorationWorld(base, progress)
      : applyExpansionExplorationWorld(base, progress);
  if (world === base) return base;
  const features = [...world.platforms, ...world.climbables, ...world.hazards, ...world.covers];
  const ids = new Set(features.map((feature) => feature.id));
  return {
    ...world,
    routes: world.routes.map((route) => ({
      ...route,
      waypointIds: [...new Set([
        ...route.waypointIds.filter((id) => ids.has(id)),
        ...features
          .filter((feature) => feature.routeId === route.id && isExplorationFeature(feature.id))
          .map((feature) => feature.id),
      ])],
    })),
  };
}

export function discoverExplorationRooms(
  missionId: string,
  progress: ExplorationProgress,
  body: WorldRect,
): ExplorationProgress {
  if (missionId === PILOT_MISSION_ID) return discoverPilotRooms(progress, body);
  if (missionId === ICE_MISSION_ID) return discoverIceRooms(progress, body);
  if (isExpansionExplorationMission(missionId)) {
    return discoverExpansionRegionRooms(missionId, progress, body);
  }
  return normalizeExplorationProgress(progress);
}

export function interactWithExplorationRegion(
  missionId: string,
  progress: ExplorationProgress,
  body: WorldRect,
) {
  if (missionId === PILOT_MISSION_ID) return pilotInteract(progress, body);
  if (missionId === ICE_MISSION_ID) return iceInteract(progress, body);
  if (isExpansionExplorationMission(missionId)) {
    return interactWithExpansionRegion(missionId, progress, body);
  }
  return null;
}

export function explorationRegionHint(
  missionId: string,
  progress: ExplorationProgress,
  body: WorldRect,
): string | null {
  if (missionId === PILOT_MISSION_ID) return pilotHint(progress, body);
  if (missionId === ICE_MISSION_ID) return iceHint(progress, body);
  if (isExpansionExplorationMission(missionId)) {
    return expansionRegionHint(missionId, progress, body);
  }
  return null;
}
