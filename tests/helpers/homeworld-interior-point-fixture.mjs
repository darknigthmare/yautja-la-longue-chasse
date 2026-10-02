import assert from 'node:assert/strict';

/** A unit fixture at a real reachable interaction socket. Browser recipes own
 * the door-to-NPC walk; this helper never changes a room or bypasses a collider. */
export function homeworldInteriorPointFixture(api, room, pointId) {
  const socket = room?.points.find(point => point.pointId === pointId);
  assert(socket, 'Real interior socket for ' + pointId);
  const directions = [[0, 1], [1, 0], [-1, 0], [0, -1], [.707, .707], [-.707, .707], [.707, -.707], [-.707, -.707]];
  const candidates = [36, 45, 54, 63, 72].flatMap(radius => directions.map(([dx, dy]) => ({ x: socket.x + dx * radius, y: socket.y + dy * radius })));
  const position = candidates.find(candidate => api.isHomeworldInteriorWalkableV64(room, candidate)
    && api.nearestHomeworldInteriorTargetV64(room, candidate)?.pointId === pointId);
  assert(position, 'Walkable full-body interaction position for ' + pointId);
  return position;
}
