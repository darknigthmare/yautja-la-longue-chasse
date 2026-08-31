import type { ExplorationProgress } from "../types";
import type { WorldBlueprint, WorldRect } from "./worldBlueprints";
import { normalizeExplorationProgress } from "./explorationProgress";
import { PILOT_MISSION_ID, applyPilotWorld, discoverPilotRooms, pilotInteract, pilotHint } from "./metroidvaniaPilot";
import { ICE_MISSION_ID, applyIceExplorationWorld, discoverIceRooms, iceInteract, iceHint } from "./iceExplorationRegion";

/** Keep route references aligned with the actual replaced geometry, not removed ledges. */
export function applyExplorationWorld(base: WorldBlueprint, progress: ExplorationProgress): WorldBlueprint {
  const world = base.missionId === PILOT_MISSION_ID ? applyPilotWorld(base, progress)
    : base.missionId === ICE_MISSION_ID ? applyIceExplorationWorld(base, progress) : base;
  if (world === base) return base;
  const features = [...world.platforms, ...world.climbables, ...world.hazards, ...world.covers];
  const ids = new Set(features.map(feature => feature.id));
  return {
    ...world,
    routes: world.routes.map(route => ({ ...route, waypointIds: [...new Set([
      ...route.waypointIds.filter(id => ids.has(id)),
      ...features.filter(feature => feature.routeId === route.id && (feature.id.startsWith("jungle-pilot-") || feature.id.startsWith("ice-region-") || feature.id === "jungle-resonance-seal" || feature.id === "jungle-canopy-hatch" || feature.id === "ice-mine-relay" || feature.id === "ice-return-hatch")).map(feature => feature.id),
    ])] })),
  };
}

export function discoverExplorationRooms(missionId: string, progress: ExplorationProgress, body: WorldRect): ExplorationProgress {
  if (missionId === PILOT_MISSION_ID) return discoverPilotRooms(progress, body);
  if (missionId === ICE_MISSION_ID) return discoverIceRooms(progress, body);
  return normalizeExplorationProgress(progress);
}

export function interactWithExplorationRegion(missionId: string, progress: ExplorationProgress, body: WorldRect) {
  if (missionId === PILOT_MISSION_ID) return pilotInteract(progress, body);
  if (missionId === ICE_MISSION_ID) return iceInteract(progress, body);
  return null;
}

export function explorationRegionHint(missionId: string, progress: ExplorationProgress, body: WorldRect): string | null {
  if (missionId === PILOT_MISSION_ID) return pilotHint(progress, body);
  if (missionId === ICE_MISSION_ID) return iceHint(progress, body);
  return null;
}
