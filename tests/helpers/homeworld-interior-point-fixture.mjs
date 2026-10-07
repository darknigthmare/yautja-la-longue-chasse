import assert from 'node:assert/strict';

const body = Object.freeze({ halfWidth: 28, halfDepth: 18 });
const reachableRooms = new WeakMap();

/** Model fixture only: flood the actual spawn component with the complete body
 * plus four-unit margin. Every intermediate unit is checked, so a thin solid
 * cannot be crossed between grid cells. No room, collider or save is changed. */
function reachableRoom(api, room) {
  assert(room && Number.isFinite(room.width) && Number.isFinite(room.depth), 'Real finite interior');
  if (reachableRooms.has(room)) return reachableRooms.get(room);
  assert(api.isHomeworldInteriorWalkableV64(room, room.spawn, body), 'Walkable spawn for ' + room.buildingId);
  const queue = [{ point: { ...room.spawn }, ix: 0, iy: 0, parent: -1 }];
  const seen = new Set(['0,0']), targets = new Map();
  for (let index = 0; index < queue.length; index++) {
    const cell = queue[index], target = api.nearestHomeworldInteriorTargetV64(room, cell.point);
    const id = target?.kind === 'exit' ? 'exit' : target?.kind === 'point' ? target.pointId : null;
    if (id && !targets.has(id)) targets.set(id, index);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ix = cell.ix + dx, iy = cell.iy + dy, key = ix + ',' + iy;
      if (seen.has(key)) continue;
      if (![1, 2, 3, 4].every(unit => api.isHomeworldInteriorWalkableV64(room,
        { x: cell.point.x + dx * unit, y: cell.point.y + dy * unit }, body))) continue;
      // A refused edge must not exclude a cell reachable by another edge.
      seen.add(key);
      queue.push({ point: { x: room.spawn.x + ix * 4, y: room.spawn.y + iy * 4 }, ix, iy, parent: index });
    }
  }
  const result = { queue, targets };
  reachableRooms.set(room, result);
  return result;
}

/** Returns a copied constructive route for physical verification, including
 * exits. An isolated locally walkable position is never a valid fixture. */
export function homeworldInteriorPointPathFixture(api, room, pointId) {
  if (pointId !== 'exit') assert(room?.points.some(point => point.pointId === pointId), 'Real interior socket for ' + pointId);
  const { queue, targets } = reachableRoom(api, room), index = targets.get(pointId);
  assert(index !== undefined, 'Reachable full-body interaction position for ' + pointId);
  const points = [];
  for (let cursor = index; cursor >= 0; cursor = queue[cursor].parent) points.push({ ...queue[cursor].point });
  return points.reverse();
}

/** Reducer tests use the endpoint of the proven path; browser recipes still
 * own the actual door-to-NPC input and interaction checks. */
export function homeworldInteriorPointFixture(api, room, pointId) {
  return homeworldInteriorPointPathFixture(api, room, pointId).at(-1);
}
