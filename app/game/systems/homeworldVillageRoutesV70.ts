import { HOMEWORLD_REGIONS_V68, isHomeworldRegionWalkableV68, type HomeworldRegionIdV68 } from './homeworldRegionsV68';
import { HOMEWORLD_VILLAGE_ACTIVITIES_V70 } from './homeworldVillageActivitiesV70';
import { homeworldBuildingDoorwayV64 } from './homeworldGeometryV64';
import type { HomeworldVec2 } from './homeworldCity';

export interface VillageDestinationV70 extends HomeworldVec2 { id: string; name: string; kind: 'door' | 'activity' | 'field' | 'city'; detail: string }
export function villageDestinationsV70(regionId: HomeworldRegionIdV68): VillageDestinationV70[] {
  return [
    ...HOMEWORLD_REGIONS_V68[regionId].buildings.map(b => ({ id: 'door:' + b.id, name: b.label, ...homeworldBuildingDoorwayV64(b).approach, kind: 'door' as const, detail: b.role === 'residence' ? 'Demeure du clan · entrée au sud' : 'Service du village · entrée au sud' })),
    ...HOMEWORLD_VILLAGE_ACTIVITIES_V70[regionId].map(a => ({ id: 'activity:' + a.id, name: a.name, ...a.approach, kind: 'activity' as const, detail: a.material })),
    { id: 'field', name: 'Poste extérieur', x: 3900, y: 2300, kind: 'field', detail: 'Chemin vers les trois relevés et la faune ; aucun déplacement automatique' },
    { id: 'city', name: 'Retour à la cité', x: 520, y: 2800, kind: 'city', detail: 'Corniche du retour · trajet à pied' },
  ];
}
/** A visual route on the existing whole-body floor. This helper never changes
 * an actor, a checkpoint or an access gate. Closed doors remain interactions. */
export function villageGroundRouteV70(regionId: HomeworldRegionIdV68, start: HomeworldVec2, target: HomeworldVec2): HomeworldVec2[] | null {
  const size = 45;
  const walkable = (p: HomeworldVec2) => (Math.hypot(p.x - start.x, p.y - start.y) < 12 || Math.hypot(p.x - target.x, p.y - target.y) < 12 ? [[0, 0]] : [[0, 0], [8, 0], [-8, 0], [0, 8], [0, -8]]).every(([x, y]) => isHomeworldRegionWalkableV68(regionId, 'village', { x: p.x + x, y: p.y + y }, 0));
  if (!walkable(start) || !walkable(target)) return null;
  const visible = (a: HomeworldVec2, b: HomeworldVec2) => { const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12); for (let i = 1; i <= n; i++) if (!walkable({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n })) return false; return true; };
  if (visible(start, target)) return [{ ...start }, { ...target }];
  const origin = { x: Math.round(start.x / size) * size, y: Math.round(start.y / size) * size }, alternatives = [];
  for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) alternatives.push({ x: origin.x + x * size, y: origin.y + y * size });
  const first = alternatives.sort((a, b) => Math.hypot(a.x - start.x, a.y - start.y) - Math.hypot(b.x - start.x, b.y - start.y)).find(p => walkable(p) && visible(start, p));
  if (!first) return null;
  type Node = { p: HomeworldVec2; f: number };
  const heap: Node[] = [], seen = new Set<string>(), previous = new Map<string, string>(), costs = new Map<string, number>(), positions = new Map<string, HomeworldVec2>();
  const push = (n: Node) => { heap.push(n); for (let i = heap.length - 1; i > 0;) { const p = (i - 1) >> 1; if (heap[p].f <= heap[i].f) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], tail = heap.pop()!; if (heap.length) { heap[0] = tail; for (let i = 0;;) { let n = i; const l = i * 2 + 1, r = l + 1; if (l < heap.length && heap[l].f < heap[n].f) n = l; if (r < heap.length && heap[r].f < heap[n].f) n = r; if (n === i) break; [heap[i], heap[n]] = [heap[n], heap[i]]; i = n; } } return top; };
  const key = (p: HomeworldVec2) => `${p.x},${p.y}`, heuristic = (p: HomeworldVec2) => Math.hypot(target.x - p.x, target.y - p.y);
  costs.set(key(first), 0); push({ p: first, f: heuristic(first) }); let last: string | undefined;
  while (heap.length && seen.size < 90000) {
    const { p } = pop(), k = key(p); if (seen.has(k)) continue; seen.add(k); positions.set(k, p);
    if (heuristic(p) < size * 2 && visible(p, target)) { last = k; break; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const n = { x: p.x + dx * size, y: p.y + dy * size }, nk = key(n), cost = costs.get(k)! + Math.hypot(dx, dy) * size;
      if (seen.has(nk) || !walkable(n) || !visible(p, n) || cost >= (costs.get(nk) ?? Infinity)) continue;
      previous.set(nk, k); costs.set(nk, cost); push({ p: n, f: cost + heuristic(n) });
    }
  }
  if (!last) return null;
  const points = [{ ...target }]; while (last) { points.push(positions.get(last)!); last = previous.get(last); } points.push({ ...start }); points.reverse();
  const simplified = [points[0]];
  for (let i = 0; i < points.length - 1;) { let n = i + 1; while (n + 1 < points.length && visible(points[i], points[n + 1])) n++; simplified.push(points[n]); i = n; }
  return simplified;
}
export function villageRouteRemainingV70(route: readonly HomeworldVec2[], actor: HomeworldVec2) {
  let best = Infinity, segment = 0, fraction = 0;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i], dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
    const t = length2 ? Math.max(0, Math.min(1, ((actor.x - a.x) * dx + (actor.y - a.y) * dy) / length2)) : 1;
    const distance = Math.hypot(actor.x - a.x - dx * t, actor.y - a.y - dy * t);
    if (distance < best) { best = distance; segment = i; fraction = t; }
  }
  const next = route[segment] ?? actor;
  let distance = Math.hypot(next.x - actor.x, next.y - actor.y);
  for (let i = segment + 1; i < route.length; i++) distance += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
  return { next, metres: Math.round(distance * .023), arrived: route.length > 0 && Math.hypot(actor.x - route.at(-1)!.x, actor.y - route.at(-1)!.y) < 65, offRoute: best > 180, segment, fraction };
}
