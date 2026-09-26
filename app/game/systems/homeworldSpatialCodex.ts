/** Read-only atlas: authored geometry is also the source of navigation and placement records. */
import {
  HOMEWORLD_ACTOR, HOMEWORLD_BUILDINGS, HOMEWORLD_DISTRICTS, HOMEWORLD_PLACEMENT_RULES,
  HOMEWORLD_PROPS, HOMEWORLD_WORLD, homeworldBuildingCollision, homeworldBuildingDoorPosition,
  homeworldPropArtPlacement, isHomeworldWalkable, type HomeworldVec2,
} from "./homeworldCity";

export const HOMEWORLD_CODEX_SOURCES = [{
  id: "predator2-trophy-wall", label: "NECA · réplique du mur de trophées de Predator 2",
  url: "https://store.necaonline.com/blogs/news/now-shipping-predator-trophy-wall-diorama",
  fact: "Le vaisseau de Predator 2 comporte un mur de trophées. Cette référence ne décrit ni les rues ni les institutions de notre cité.",
}] as const;

export const HOMEWORLD_SPATIAL_SITES = HOMEWORLD_DISTRICTS.map(district => {
  const building = HOMEWORLD_BUILDINGS.find(candidate => candidate.districtId === district.id)!;
  return {
    id: district.id, name: district.name, description: district.description,
    approach: homeworldBuildingDoorPosition(building), buildingId: building.id,
    lore: "original-adaptation" as const,
    sourceId: district.id === "esplanade" ? "predator2-trophy-wall" : null,
    access: "La promenade est accessible. Les services, le vaisseau personnel et les expéditions gardent leurs conditions de progression. Aucun intérieur supplémentaire ne s’ouvre par cette carte.",
    connectors: district.id === "convoy-works" ? "Deux accès : quai secondaire à l’ouest ; retour des forges au nord-est."
      : district.id === "rampart-walk" ? "Trois accès : citadelle au nord-ouest, bastion à l’ouest, galerie basse au sud-ouest."
      : "Suivre les rues obliques et l’approche de porte. Les volumes des façades et des objets restent solides.",
  };
});

/** Values displayed in the atlas are calculated by the same helpers as the actual scene. */
export function homeworldPlacementRecords(districtId: string) {
  return {
    rules: HOMEWORLD_PLACEMENT_RULES,
    actorFootprint: { halfWidth: HOMEWORLD_ACTOR.halfWidth, halfDepth: HOMEWORLD_ACTOR.halfDepth },
    buildings: HOMEWORLD_BUILDINGS.filter(b => b.districtId === districtId).map(building => ({
      id: building.id, label: building.label, anchor: { x: building.x, y: building.y },
      width: building.width, height: building.height, door: homeworldBuildingDoorPosition(building),
      collision: homeworldBuildingCollision(building), depth: Math.round(building.y),
    })),
    props: HOMEWORLD_PROPS.filter(p => p.districtId === districtId).map(prop => ({
      id: prop.id, anchor: { x: prop.x, y: prop.y }, plane: prop.plane, asset: prop.asset,
      paintedBox: { width: prop.width, height: prop.height }, image: homeworldPropArtPlacement(prop),
      depth: Math.round(prop.y) - (prop.plane === "rear" ? 180 : 0),
      fadeRadius: prop.plane === "front" ? prop.fadeRadius ?? 0 : 0,
    })),
  };
}

/** Sample the complete actor footprint; a route never grants collision or access exemptions. */
export function isHomeworldRouteSegmentWalkable(from: HomeworldVec2, to: HomeworldVec2): boolean {
  if (![from.x, from.y, to.x, to.y].every(Number.isFinite)) return false;
  const count = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / HOMEWORLD_PLACEMENT_RULES.routeSample));
  for (let index = 0; index <= count; index++) {
    const t = index / count;
    const point = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    // Endpoints can be close to a valid doorway. Grow clearance away from them;
    // grid nodes themselves always require the full margin. Do not alter physics.
    const clearance = Math.min(HOMEWORLD_PLACEMENT_RULES.routeClearance, Math.hypot(point.x - from.x, point.y - from.y), Math.hypot(point.x - to.x, point.y - to.y));
    if (!isRoutePositionClear(point, clearance)) return false;
  }
  return true;
}

function isRoutePositionClear(point: HomeworldVec2, clearance: number = HOMEWORLD_PLACEMENT_RULES.routeClearance): boolean {
  // Keep the actual footprint check as well: terrain is a union of irregular
  // polygons, so checking a larger sampled footprint alone is not sufficient.
  return isHomeworldWalkable(point) && isHomeworldWalkable(point, {
    halfWidth: HOMEWORLD_ACTOR.halfWidth + clearance,
    halfDepth: HOMEWORLD_ACTOR.halfDepth + clearance,
  });
}

const step = HOMEWORLD_PLACEMENT_RULES.routeGrid;
const cols = Math.ceil(HOMEWORLD_WORLD.width / step);
const rows = Math.ceil(HOMEWORLD_WORLD.height / step);
const walkableNodes = new Map<number, boolean>();
const walkableEdges = new Map<string, boolean>();
const position = (key: number): HomeworldVec2 => ({ x: (key % cols) * step, y: Math.floor(key / cols) * step });
const isNode = (key: number) => {
  if (!walkableNodes.has(key)) walkableNodes.set(key, isRoutePositionClear(position(key)));
  return walkableNodes.get(key)!;
};
function anchorNode(point: HomeworldVec2): number | null {
  const candidates: { key: number; distance: number }[] = [];
  const cx = Math.round(point.x / step), cy = Math.round(point.y / step);
  for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) {
    if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
    const key = y * cols + x;
    candidates.push({ key, distance: Math.hypot(point.x - x * step, point.y - y * step) });
  }
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates.find(({ key }) => isNode(key) && isHomeworldRouteSegmentWalkable(point, position(key)))?.key ?? null;
}

export interface HomeworldSpatialRoute { points: HomeworldVec2[]; distance: number; status: "reachable" | "unavailable" }
/** A bounded A* on authored terrain. It computes guidance only; no actor, save or service is mutated. */
export function homeworldSpatialRoute(from: HomeworldVec2, to: HomeworldVec2): HomeworldSpatialRoute {
  const unavailable: HomeworldSpatialRoute = { points: [], distance: 0, status: "unavailable" };
  if (!isHomeworldWalkable(from) || !isHomeworldWalkable(to)) return unavailable;
  if (isHomeworldRouteSegmentWalkable(from, to)) return { points: [{ x: from.x, y: from.y }, { x: to.x, y: to.y }], distance: Math.hypot(to.x - from.x, to.y - from.y), status: "reachable" };
  const start = anchorNode(from), goal = anchorNode(to);
  if (start === null || goal === null) return unavailable;
  const goalPoint = position(goal);
  const score = new Map<number, number>([[start, 0]]), previous = new Map<number, number>();
  const open = new Set([start]), closed = new Set<number>();
  const heuristic = (key: number) => { const p = position(key); return Math.hypot(p.x - goalPoint.x, p.y - goalPoint.y); };
  while (open.size && closed.size < cols * rows) {
    let current = -1, best = Infinity;
    for (const key of open) { const value = score.get(key)! + heuristic(key); if (value < best) { best = value; current = key; } }
    if (current === goal) {
      const raw = [to, position(goal)];
      let cursor = goal;
      while (previous.has(cursor)) { cursor = previous.get(cursor)!; raw.push(position(cursor)); }
      raw.push(from); raw.reverse();
      const points: HomeworldVec2[] = [{ x: raw[0].x, y: raw[0].y }];
      for (let index = 1; index < raw.length; index++) {
        let furthest = index;
        while (furthest + 1 < raw.length && isHomeworldRouteSegmentWalkable(points.at(-1)!, raw[furthest + 1])) furthest++;
        points.push({ x: raw[furthest].x, y: raw[furthest].y }); index = furthest;
      }
      return { points, distance: points.slice(1).reduce((length, point, i) => length + Math.hypot(point.x - points[i].x, point.y - points[i].y), 0), status: "reachable" };
    }
    open.delete(current); closed.add(current);
    const p = position(current), cx = current % cols, cy = Math.floor(current / cols);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = cx + dx, y = cy + dy, next = y * cols + x;
      if (x < 0 || x >= cols || y < 0 || y >= rows || closed.has(next) || !isNode(next)) continue;
      const edge = current < next ? `${current}:${next}` : `${next}:${current}`;
      if (!walkableEdges.has(edge)) walkableEdges.set(edge, isHomeworldRouteSegmentWalkable(p, position(next)));
      if (!walkableEdges.get(edge)) continue;
      const candidate = score.get(current)! + Math.hypot(dx, dy) * step;
      if (candidate >= (score.get(next) ?? Infinity)) continue;
      previous.set(next, current); score.set(next, candidate); open.add(next);
    }
  }
  return unavailable;
}

/** A held route is useful until arrival; refresh on the next atlas opening, never every frame. */
export function homeworldRouteGuidance(actor: HomeworldVec2, route: HomeworldSpatialRoute) {
  if (route.status !== "reachable" || !route.points.length) return null;
  const target = route.points.at(-1)!;
  if (Math.hypot(actor.x - target.x, actor.y - target.y) <= 80) return { arrived: true, direction: "Arrivée", waypoint: target };
  // The80-unit final arrival radius must not skip a nearby turning point.
  const candidates = route.points.filter(point => Math.hypot(actor.x - point.x, actor.y - point.y) > 8);
  // Prefer the furthest visible waypoint. Never aim through a building when the player takes a detour.
  const waypoint = [...candidates].reverse().find(point => isHomeworldRouteSegmentWalkable(actor, point));
  if (!waypoint) return { arrived: false, direction: "Rouvrir l’atlas pour recalculer le chemin", waypoint: null };
  const angle = Math.atan2(waypoint.y - actor.y, waypoint.x - actor.x);
  const directions = ["Est →", "Sud-est ↘", "Sud ↓", "Sud-ouest ↙", "Ouest ←", "Nord-ouest ↖", "Nord ↑", "Nord-est ↗"];
  return { arrived: false, direction: directions[(Math.round(angle / (Math.PI / 4)) + 8) % 8], waypoint };
}
