import type { MissionId } from "../types";
import { getWorldScreenAtX, worldScreensFor } from "../worldScreens";

/** Keep only authored sector ids, in map order, from an untrusted save field. */
export function normalizeVisitedScreenIds(
  missionId: MissionId,
  value: unknown,
): string[] {
  const candidateIds = new Set(
    Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [],
  );
  return worldScreensFor(missionId).screens
    .filter((screen) => candidateIds.has(screen.id))
    .map((screen) => screen.id);
}

/** Discovery follows the real player location; crossing elsewhere is never inferred. */
export function discoverWorldScreen(
  missionId: MissionId,
  visitedScreenIds: readonly string[],
  playerX: number,
): string[] {
  const current = getWorldScreenAtX(missionId, playerX);
  return normalizeVisitedScreenIds(missionId, [...visitedScreenIds, current.id]);
}

export function explorationMapSnapshot(
  missionId: MissionId,
  playerX: number,
  visitedScreenIds: readonly string[],
) {
  const layout = worldScreensFor(missionId);
  const x = Math.max(0, Math.min(layout.worldWidth, Number.isFinite(playerX) ? playerX : 0));
  const current = getWorldScreenAtX(layout, x);
  const visited = new Set(discoverWorldScreen(missionId, visitedScreenIds, x));
  const rooms = layout.screens.map((screen) => ({
    id: screen.id,
    order: screen.order,
    startRatio: screen.startX / layout.worldWidth,
    endRatio: screen.endX / layout.worldWidth,
    visited: visited.has(screen.id),
    current: screen.id === current.id,
    // Do not leak names or objectives in accessible text before discovery.
    label: visited.has(screen.id) ? screen.label : null,
  }));
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const connections = layout.connections.flatMap((connection) => {
    const from = roomById.get(connection.fromScreenId);
    const to = roomById.get(connection.toScreenId);
    if (!from || !to || (!from.visited && !to.visited)) return [];
    return [{
      id: connection.id,
      fromScreenId: from.id,
      toScreenId: to.id,
      positionRatio: connection.transitionX / layout.worldWidth,
      explored: from.visited && to.visited,
    }];
  });
  return {
    missionId,
    rooms,
    connections,
    currentScreenId: current.id,
    currentScreenLabel: current.label,
    playerRatio: x / layout.worldWidth,
    visitedCount: visited.size,
    totalCount: rooms.length,
    percent: Math.round(visited.size / rooms.length * 100),
  };
}
