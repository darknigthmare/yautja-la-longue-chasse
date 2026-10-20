import type { HomeworldVec2 } from './homeworldCity';
import { homeworldCivicWalkableV80 } from './homeworldCivicWorldV80';
import { homeworldNavigationRevisionV77, homeworldRouteSegmentV77, homeworldWalkRouteV77, type HomeworldWalkRouteV77 } from './homeworldNavigationV77';
import { HOMEWORLD_WORLD_V77, type HomeworldLevelV77 } from './homeworldWorldV77';

const SPACING = 96;
const COLUMNS = Math.ceil(HOMEWORLD_WORLD_V77.width / SPACING);
const ROWS = Math.ceil(HOMEWORLD_WORLD_V77.height / SPACING);
const CACHE_LIMIT = 256;
const routes = new Map<string, HomeworldWalkRouteV77>();
const nodes = new Map<string, boolean>();
const edges = new Map<string, boolean>();
let revision = -1;
const position = (key: number): HomeworldVec2 => ({ x: key % COLUMNS * SPACING, y: Math.floor(key / COLUMNS) * SPACING });
const distance = (a: HomeworldVec2, b: HomeworldVec2) => Math.hypot(a.x - b.x, a.y - b.y);
const routeLength = (points: readonly HomeworldVec2[]) => points.slice(1).reduce((sum, point, index) => sum + distance(points[index], point), 0);
const copied = (points: readonly HomeworldVec2[]) => points.map(point => ({ x: point.x, y: point.y }));

interface Candidate { key: number; cost: number }
function push(heap: Candidate[], node: Candidate) {
  heap.push(node);
  let index = heap.length - 1;
  while (index > 0) {
    const parent = (index - 1) >> 1;
    if (heap[parent].cost <= node.cost) break;
    heap[index] = heap[parent]; index = parent;
  }
  heap[index] = node;
}
function pop(heap: Candidate[]): Candidate {
  const result = heap[0], last = heap.pop()!;
  if (heap.length) {
    let index = 0;
    while (index * 2 + 1 < heap.length) {
      let child = index * 2 + 1;
      if (child + 1 < heap.length && heap[child + 1].cost < heap[child].cost) child++;
      if (heap[child].cost >= last.cost) break;
      heap[index] = heap[child]; index = child;
    }
    heap[index] = last;
  }
  return result;
}
function isNode(level: HomeworldLevelV77, key: number): boolean {
  const id = level + ':' + key;
  const cached = nodes.get(id);
  if (cached !== undefined) return cached;
  const point = position(key);
  const walkable = homeworldCivicWalkableV80(level, point) && homeworldCivicWalkableV80(level, point, { halfWidth: 36, halfDepth: 26 });
  nodes.set(id, walkable);
  return walkable;
}
function isEdge(level: HomeworldLevelV77, a: number, b: number): boolean {
  const id = [level, Math.min(a, b), Math.max(a, b)].join(':');
  const cached = edges.get(id);
  if (cached !== undefined) return cached;
  const walkable = homeworldRouteSegmentV77(level, position(a), position(b));
  edges.set(id, walkable);
  return walkable;
}
function anchors(level: HomeworldLevelV77, point: HomeworldVec2) {
  const x = Math.round(point.x / SPACING), y = Math.round(point.y / SPACING);
  const candidates: { key: number; distance: number }[] = [];
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const column = x + dx, row = y + dy;
    if (column < 0 || column >= COLUMNS || row < 0 || row >= ROWS) continue;
    const key = row * COLUMNS + column;
    candidates.push({ key, distance: distance(position(key), point) });
  }
  return candidates.sort((a, b) => a.distance - b.distance)
    .filter(candidate => isNode(level, candidate.key) && homeworldRouteSegmentV77(level, point, position(candidate.key)));
}

/** Every coarse edge is checked by the same full-body, four-unit sampler as
 * V77. Wider grid spacing changes search effort, never the permitted surface. */
function coarseRoute(level: HomeworldLevelV77, from: HomeworldVec2, to: HomeworldVec2): HomeworldWalkRouteV77 | null {
  const starts = anchors(level, from), goals = anchors(level, to);
  if (!starts.length || !goals.length) return null;
  const goalKeys = new Set(goals.map(goal => goal.key));
  const goalPoints = goals.map(goal => position(goal.key));
  const heuristic = (point: HomeworldVec2) => Math.min(...goalPoints.map(goal => distance(point, goal)));
  const scores = new Map(starts.map(start => [start.key, start.distance]));
  const previous = new Map<number, number>(), closed = new Set<number>(), heap: Candidate[] = [];
  for (const start of starts) push(heap, { key: start.key, cost: start.distance + heuristic(position(start.key)) });
  while (heap.length && closed.size < COLUMNS * ROWS) {
    const current = pop(heap).key;
    if (closed.has(current)) continue;
    if (goalKeys.has(current)) {
      const points = [{ ...to }, position(current)];
      let cursor = current;
      while (previous.has(cursor)) { cursor = previous.get(cursor)!; points.push(position(cursor)); }
      points.push({ ...from }); points.reverse();
      return { levelId: level, status: 'reachable', points, distance: routeLength(points) };
    }
    closed.add(current);
    const x = current % COLUMNS, y = Math.floor(current / COLUMNS);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const column = x + dx, row = y + dy, key = row * COLUMNS + column;
      if (column < 0 || column >= COLUMNS || row < 0 || row >= ROWS || closed.has(key) || !isNode(level, key) || !isEdge(level, current, key)) continue;
      const score = scores.get(current)! + Math.hypot(dx, dy) * SPACING;
      if (score >= (scores.get(key) ?? Infinity)) continue;
      scores.set(key, score); previous.set(key, current);
      push(heap, { key, cost: score + heuristic(position(key)) });
    }
  }
  return null;
}

/** A bounded look-ahead reduces redundant waypoints while checking each
 * replacement against the live V77 sampler. Door and connector endpoints stay
 * exact. Narrow turns remain present when the straight chord is blocked. */
export function homeworldSimplifyRouteV99(route: HomeworldWalkRouteV77): HomeworldWalkRouteV77 {
  if (route.status !== 'reachable' || route.points.length < 3) return { ...route, points: copied(route.points) };
  const points: HomeworldVec2[] = [{ ...route.points[0] }];
  let index = 0;
  while (index < route.points.length - 1) {
    let chosen = index + 1, traversed = 0, limit = chosen;
    for (let next = index + 1; next < route.points.length; next++) {
      traversed += distance(route.points[next - 1], route.points[next]);
      if (traversed > 768 && next > index + 1) break;
      limit = next;
    }
    for (let next = limit; next > index + 1; next--) {
      if (homeworldRouteSegmentV77(route.levelId, route.points[index], route.points[next])) { chosen = next; break; }
    }
    points.push({ ...route.points[chosen] }); index = chosen;
  }
  return { ...route, points, distance: routeLength(points) };
}

/** Fast public navigation with an unchanged V77 fallback for narrow streets,
 * alcoves and disconnected coarse nodes. No coordinate, body, gate or collision
 * is changed to obtain a route. Returned arrays cannot mutate the cached plan. */
export function homeworldWalkRouteV99(level: HomeworldLevelV77, from: HomeworldVec2, to: HomeworldVec2): HomeworldWalkRouteV77 {
  const currentRevision = homeworldNavigationRevisionV77();
  if (revision !== currentRevision) { routes.clear(); nodes.clear(); edges.clear(); revision = currentRevision; }
  const refusal: HomeworldWalkRouteV77 = { levelId: level, status: 'unavailable', points: [], distance: 0 };
  if (![from.x, from.y, to.x, to.y].every(Number.isFinite) || !homeworldCivicWalkableV80(level, from) || !homeworldCivicWalkableV80(level, to)) return refusal;
  const key = [level, from.x, from.y, to.x, to.y].join(':');
  const cached = routes.get(key);
  if (cached) return { ...cached, points: copied(cached.points) };
  const route = homeworldRouteSegmentV77(level, from, to)
    ? { levelId: level, status: 'reachable' as const, points: copied([from, to]), distance: distance(from, to) }
    : coarseRoute(level, from, to) ?? homeworldWalkRouteV77(level, from, to);
  const simplified = homeworldSimplifyRouteV99(route);
  if (routes.size >= CACHE_LIMIT) routes.delete(routes.keys().next().value!);
  routes.set(key, simplified);
  return { ...simplified, points: copied(simplified.points) };
}
