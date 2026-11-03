import type { HomeworldVec2 } from './homeworldCity';
import { isHomeworldInteriorWalkableV64, nearestHomeworldInteriorTargetV64, type HomeworldInteriorV64 } from './homeworldInteriorsV64';
import type { HomeworldSpatialRoute } from './homeworldSpatialCodex';

/** Preserve the complete native 24x14 half-body. One-unit samples also carry
 * .75 units of extra clearance between their exact endpoints, so a short
 * furniture corner cannot disappear between the old four-unit samples. */
export function homeworldInteriorSegmentV112(room: HomeworldInteriorV64, from: HomeworldVec2, to: HomeworldVec2): boolean {
  if (![from.x, from.y, to.x, to.y].every(Number.isFinite)) return false;
  const distance = Math.hypot(to.x - from.x, to.y - from.y), samples = Math.max(1, Math.ceil(distance));
  for (let index = 0; index <= samples; index++) {
    const ratio = index / samples, margin = Math.min(.75, distance * ratio, distance * (1 - ratio));
    const point = {x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio};
    if (!isHomeworldInteriorWalkableV64(room, point, {halfWidth: 24 + margin, halfDepth: 14 + margin})) return false;
  }
  return true;
}

/** A requested interaction still ends at the exact room's public target.
 * This bounded integer-offset search changes no fixture or collision volume.
 * It is only needed when an old simplified interior leg cuts a native corner. */
export function homeworldInteriorRouteV112(room: HomeworldInteriorV64, from: HomeworldVec2, targetId: string | 'exit'): HomeworldSpatialRoute {
  const unavailable: HomeworldSpatialRoute = {status: 'unavailable', points: [], distance: 0};
  if (![from.x, from.y].every(Number.isFinite) || !isHomeworldInteriorWalkableV64(room, from)) return unavailable;
  const goal = (point: HomeworldVec2) => {
    const nearest = nearestHomeworldInteriorTargetV64(room, point);
    return targetId === 'exit'
      ? nearest?.kind === 'exit' && Math.hypot(point.x - room.exit.x, point.y - room.exit.y) < 12
      : nearest?.kind === 'point' && nearest.pointId === targetId && Math.hypot(point.x - nearest.position.x, point.y - nearest.position.y) < 48;
  };
  const queue = [{point: {...from}, ix: 0, iy: 0}], previous = new Map<number, number>(), visited = new Set(['0,0']);
  const budget = Math.ceil(room.width / 12 + 2) * Math.ceil(room.depth / 12 + 2);
  for (let index = 0; index < queue.length && index < budget; index++) {
    const {point, ix, iy} = queue[index];
    if (goal(point)) {
      const raw: HomeworldVec2[] = [];
      let cursor: number | undefined = index;
      while (cursor !== undefined) {raw.push(queue[cursor].point); cursor = previous.get(cursor);}
      raw.reverse();
      const points = [raw[0]];
      for (let current = 1; current < raw.length; current++) {
        let next = current;
        while (next + 1 < raw.length && homeworldInteriorSegmentV112(room, points.at(-1)!, raw[next + 1])) next++;
        points.push(raw[next]); current = next;
      }
      return {status: 'reachable', points, distance: points.slice(1).reduce((total, point, n) => total + Math.hypot(point.x - points[n].x, point.y - points[n].y), 0)};
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = ix + dx, ny = iy + dy, next = {x: from.x + nx * 12, y: from.y + ny * 12}, key = `${nx},${ny}`;
      if (visited.has(key) || !homeworldInteriorSegmentV112(room, point, next)) continue;
      // A refused edge does not prove that its endpoint is inaccessible from
      // another corridor. Mark only the nodes actually admitted to the queue.
      visited.add(key);
      previous.set(queue.length, index); queue.push({point: next, ix: nx, iy: ny});
    }
  }
  return unavailable;
}
