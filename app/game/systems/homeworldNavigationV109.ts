import './homeworldStreetCompositionMountV92';
import type { HomeworldVec2 } from './homeworldCity';
import { homeworldCivicWalkableV80 } from './homeworldCivicWorldV80';
import { cargoCaseCollisionV108, cargoLotsV108 } from './homeworldCargoV108';
import type { HomeworldCargoV108 } from './homeworldCargoLedgerV108';
import { HOMEWORLD_CARGO_V108 } from './homeworldCargoDefinitionV108';
import { HOMEWORLD_COURT_ART_V80 } from './homeworldCourtArtV80';
import { HOMEWORLD_GEOMETRY_V64 } from './homeworldGeometryV64';
import { homeworldNavigationRevisionV77, homeworldRouteSegmentV77, type HomeworldWalkRouteV77 } from './homeworldNavigationV77';
import { homeworldWalkRouteV99 } from './homeworldNavigationV99';
import { HOMEWORLD_WORLD_V77, type HomeworldLevelV77 } from './homeworldWorldV77';

const distance = (a: HomeworldVec2, b: HomeworldVec2) => Math.hypot(a.x - b.x, a.y - b.y);
const copied = (points: readonly HomeworldVec2[]) => points.map(point => ({ x: point.x, y: point.y }));
const length = (points: readonly HomeworldVec2[]) => points.slice(1).reduce((sum, point, index) => sum + distance(points[index], point), 0);
const routes = new Map<string, HomeworldWalkRouteV77>();

/** Walking revisions and carried coordinates do not change ground geometry.
 * The key describes the two physical lots only; campaign ownership is checked
 * independently by the worker host. */
export function homeworldCargoGeometryKeyV109(ledger?: HomeworldCargoV108): string {
  return JSON.stringify(cargoLotsV108(ledger).map(lot => lot.place === 'carried'
    ? [lot.id, 'carried'] : [lot.id, lot.place, lot.x, lot.y]));
}

/** Same independent native case footprint as the runtime collider. Coordinates
 * come from confirmed placements, never an inferred delivery or a map click. */
export function homeworldCargoMapLotsV109(ledger?: HomeworldCargoV108) {
  const art = HOMEWORLD_COURT_ART_V80[HOMEWORLD_CARGO_V108.caseArtId];
  return cargoLotsV108(ledger).map(lot => {
    const definition = HOMEWORLD_CARGO_V108.lots.find(item => item.id === lot.id)!;
    const scale = definition.height / art.alphaBounds.height;
    const polygon = art.nativeGroundSupport!.map(point => ({
      x: lot.x + (point.x - art.pivot.x) * scale,
      y: lot.y + (point.y - art.pivot.y) * scale / HOMEWORLD_GEOMETRY_V64.depthScale,
    }));
    return { ...lot, label: definition.label, polygon };
  });
}

/** Retain V77's full body and clearance exactly, then sample cargo at the
 * three-unit interval of the live cargo motor. A long waypoint cannot jump
 * through a parked load or cut a corner that the durable walk would refuse. */
export function homeworldRouteSegmentV109(level: HomeworldLevelV77, from: HomeworldVec2, to: HomeworldVec2, ledger?: HomeworldCargoV108): boolean {
  if (![from.x, from.y, to.x, to.y].every(Number.isFinite)) return false;
  if (level !== '0') return homeworldRouteSegmentV77(level, from, to);
  const total = distance(from, to), samples = Math.max(1, Math.ceil(total / 3));
  for (let index = 0; index <= samples; index++) {
    const ratio = index / samples, point = { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio };
    const margin = Math.min(12, total * ratio, total * (1 - ratio));
    if (cargoCaseCollisionV108(ledger, point, { halfWidth: 24 + margin, halfDepth: 14 + margin })) return false;
  }
  return homeworldRouteSegmentV77(level, from, to);
}

function simplify(level: HomeworldLevelV77, points: readonly HomeworldVec2[], ledger?: HomeworldCargoV108): HomeworldVec2[] {
  if (points.length < 3) return copied(points);
  const result = [{ ...points[0] }];
  for (let index = 0; index < points.length - 1;) {
    let chosen = index + 1;
    for (let next = points.length - 1; next > index + 1; next--) {
      if (homeworldRouteSegmentV109(level, points[index], points[next], ledger)) { chosen = next; break; }
    }
    result.push({ ...points[chosen] }); index = chosen;
  }
  return result;
}

/** Small visibility search repairs the existing verified street path. Its
 * vertices are native path bends and clearance sockets around the real case
 * footprints. Every edge is resampled with both the native and cargo collider;
 * failure returns no route rather than reusing the obstructed static path. */
function repair(base: HomeworldWalkRouteV77, ledger?: HomeworldCargoV108): HomeworldVec2[] | null {
  const start = base.points[0], goal = base.points.at(-1);
  if (!start || !goal) return null;
  const candidates: HomeworldVec2[] = [start, goal];
  const safe = (point: HomeworldVec2) => point.x >= 0 && point.y >= 0 && point.x <= HOMEWORLD_WORLD_V77.width && point.y <= HOMEWORLD_WORLD_V77.height
    && homeworldCivicWalkableV80(base.levelId, point, { halfWidth: 36, halfDepth: 26 })
    && !cargoCaseCollisionV108(ledger, point, { halfWidth: 36, halfDepth: 26 });
  candidates.push(...base.points.slice(1, -1).filter(safe));
  for (const lot of homeworldCargoMapLotsV109(ledger).filter(item => item.place !== 'carried')) {
    const minX = Math.min(...lot.polygon.map(point => point.x)), maxX = Math.max(...lot.polygon.map(point => point.x));
    const minY = Math.min(...lot.polygon.map(point => point.y)), maxY = Math.max(...lot.polygon.map(point => point.y));
    for (const padding of [4, 36, 96]) {
      const left = minX - 36 - padding, right = maxX + 36 + padding, top = minY - 26 - padding, bottom = maxY + 26 + padding;
      for (const point of [{ x: left, y: top }, { x: right, y: top }, { x: left, y: bottom }, { x: right, y: bottom },
        { x: (left + right) / 2, y: top }, { x: (left + right) / 2, y: bottom }, { x: left, y: (top + bottom) / 2 }, { x: right, y: (top + bottom) / 2 }]) {
        if (safe(point)) candidates.push(point);
      }
    }
  }
  const unique = new Map<string, HomeworldVec2>();
  for (const candidate of candidates) unique.set(candidate.x + ':' + candidate.y, candidate);
  const nodes = [...unique.values()], destination = nodes.findIndex(point => point.x === goal.x && point.y === goal.y);
  const costs = new Map<number, number>([[0, 0]]), previous = new Map<number, number>(), closed = new Set<number>(), edgeCache = new Map<string, boolean>();
  while (closed.size < nodes.length) {
    const current = [...costs.keys()].filter(index => !closed.has(index)).sort((a, b) => costs.get(a)! + distance(nodes[a], goal) - costs.get(b)! - distance(nodes[b], goal))[0];
    if (current === undefined) return null;
    if (current === destination) {
      const result = [nodes[current]]; let cursor = current;
      while (previous.has(cursor)) { cursor = previous.get(cursor)!; result.push(nodes[cursor]); }
      return simplify(base.levelId, result.reverse(), ledger);
    }
    closed.add(current);
    for (let next = 0; next < nodes.length; next++) {
      if (next === current || closed.has(next)) continue;
      const cost = costs.get(current)! + distance(nodes[current], nodes[next]);
      if (cost >= (costs.get(next) ?? Infinity)) continue;
      const key = [Math.min(current, next), Math.max(current, next)].join(':');
      let clear = edgeCache.get(key);
      if (clear === undefined) { clear = homeworldRouteSegmentV109(base.levelId, nodes[current], nodes[next], ledger); edgeCache.set(key, clear); }
      if (!clear) continue;
      costs.set(next, cost); previous.set(next, current);
    }
  }
  return null;
}

export function homeworldWalkRouteV109(level: HomeworldLevelV77, from: HomeworldVec2, to: HomeworldVec2, ledger?: HomeworldCargoV108): HomeworldWalkRouteV77 {
  const refusal: HomeworldWalkRouteV77 = { levelId: level, status: 'unavailable', points: [], distance: 0 };
  if (![from.x, from.y, to.x, to.y].every(Number.isFinite)) return refusal;
  if (level !== '0') return homeworldWalkRouteV99(level, from, to);
  if (cargoCaseCollisionV108(ledger, from) || cargoCaseCollisionV108(ledger, to)) return refusal;
  const key = [homeworldNavigationRevisionV77(), homeworldCargoGeometryKeyV109(ledger), from.x, from.y, to.x, to.y].join(':');
  const cached = routes.get(key);
  if (cached) return { ...cached, points: copied(cached.points) };
  const base = homeworldWalkRouteV99(level, from, to);
  if (base.status !== 'reachable') return refusal;
  const clear = base.points.slice(1).every((point, index) => homeworldRouteSegmentV109(level, base.points[index], point, ledger));
  const points = clear ? copied(base.points) : repair(base, ledger);
  const result = points ? { levelId: level, status: 'reachable' as const, points, distance: length(points) } : refusal;
  if (routes.size >= 128) routes.delete(routes.keys().next().value!);
  routes.set(key, result);
  return { ...result, points: copied(result.points) };
}
