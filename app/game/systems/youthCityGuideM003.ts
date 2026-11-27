import type { HomeworldActor, HomeworldVec2 } from "./homeworldCity";
import { HOMEWORLD_BUILDINGS_V77, HOMEWORLD_CONNECTORS_V77, type HomeworldLevelV77 } from "./homeworldWorldV77";
import { homeworldBuildingDoorwayV64 } from "./homeworldGeometryV64";
import { homeworldWalkRouteV109 } from "./homeworldNavigationV109";
import { homeworldNavigationRevisionV77 } from "./homeworldNavigationV77";
import { homeworldCivicWalkableV80 } from "./homeworldCivicWorldV80";
import type { HomeworldCheckpointV77 } from "./homeworldCheckpointV77";
import { youthCityGuidePendingM003, type YouthCityErrandV172 } from "./youthCityErrandV172";

const audience = HOMEWORLD_BUILDINGS_V77.find(building => building.id === "throne-audience")!;
const steps = HOMEWORLD_CONNECTORS_V77.find(connector => connector.id === "acropolis-stair")!;
export const SAAR_GUIDE_LEVEL_M003 = steps.to.levelId;
export const SAAR_GUIDE_MARKS_M003 = [
  { position: homeworldBuildingDoorwayV64(audience).approach, label: "Retrouver Saar au seuil de l’audience" },
  { position: steps.to.point, label: "Faire le point avec Saar au degré monumental" },
] as const;
const close = (a: HomeworldVec2, b: HomeworldVec2) => Math.hypot(a.x - b.x, a.y - b.y) <= 82;
const distance = (a: HomeworldVec2, b: HomeworldVec2) => Math.hypot(a.x - b.x, a.y - b.y);

let nativeRoute: ReturnType<typeof homeworldWalkRouteV109> | undefined;
let previousGeometry = -1;
export function saarGuidePathM003() {
  const geometry = homeworldNavigationRevisionV77();
  if (!nativeRoute || geometry !== previousGeometry) {
    nativeRoute = homeworldWalkRouteV109(SAAR_GUIDE_LEVEL_M003, SAAR_GUIDE_MARKS_M003[0].position, SAAR_GUIDE_MARKS_M003[1].position);
    previousGeometry = geometry;
  }
  return nativeRoute;
}

export function saarGuideMarkM003(errand: YouthCityErrandV172 | undefined, level: HomeworldLevelV77,
  point: HomeworldVec2, interiorId: string | null) {
  if (interiorId || SAAR_GUIDE_LEVEL_M003 !== level || (errand?.guideM003 !== 0 && errand?.guideM003 !== 1)) return null;
  const mark = SAAR_GUIDE_MARKS_M003[errand.guideM003];
  return close(point, mark.position) && homeworldCivicWalkableV80(level, point) && saarGuidePathM003().status === "reachable" ? mark : null;
}

/** Ordinary location saves may continue throughout the city. The two guide
 * journal advances themselves must be written from their observed landmarks. */
export function saarGuideLocationMatchesWriteM003(before: YouthCityErrandV172 | undefined, after: YouthCityErrandV172 | undefined,
  location: HomeworldCheckpointV77 | undefined): boolean {
  if (!before || before.guideM003 === after?.guideM003) return true;
  return !!location && location.ownerCreatedAt === before.ownerCreatedAt &&
    !!saarGuideMarkM003(before, location.levelId, location.exterior, location.interiorId);
}

/** Put Saar one short distance ahead on the native walkable route. The body
 * waits when the player takes a side street or reaches the last landing. */
export function saarGuidePoseM003(errand: YouthCityErrandV172 | undefined, actor: HomeworldActor,
  level: HomeworldLevelV77, interiorId: string | null) {
  if (!youthCityGuidePendingM003(errand) || interiorId || level !== SAAR_GUIDE_LEVEL_M003) return null;
  const route = saarGuidePathM003();
  if (route.status !== "reachable" || route.points.length < 2) return null;
  return saarGuidePoseOnPathM003(route.points, actor, errand?.guideM003 === 0);
}

export function saarGuidePoseOnPathM003(points: readonly HomeworldVec2[], actor: HomeworldActor, waitingAtStart = false) {
  if (points.length < 2) return null;
  const standing = { ...points[0], facing: points[1].x < points[0].x ? -1 as const : 1 as const, moving: false, waiting: true };
  if (waitingAtStart) return standing;
  let walked = 0;
  let nearest = { distance: Infinity, along: 0 };
  for (let i = 1; i < points.length; i++) {
    const start = points[i - 1], end = points[i], size = distance(start, end);
    if (size <= 0) continue;
    const ratio = Math.max(0, Math.min(1, ((actor.x - start.x) * (end.x - start.x) + (actor.y - start.y) * (end.y - start.y)) / (size * size)));
    const offset = distance(actor, { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio });
    if (offset < nearest.distance) nearest = { distance: offset, along: walked + ratio * size };
    walked += size;
  }
  const waiting = nearest.distance > 150;
  let along = Math.min(walked, nearest.along + (waiting ? 0 : 96));
  for (let i = 1; i < points.length; i++) {
    const start = points[i - 1], end = points[i], size = distance(start, end);
    if (size <= 0) continue;
    if (along <= size || i === points.length - 1) {
      const ratio = Math.min(1, along / size);
      return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio,
        facing: end.x < start.x ? -1 as const : 1 as const, waiting,
        moving: !waiting && ratio < 1 && Math.hypot(actor.vx, actor.vy) > 5 };
    }
    along -= size;
  }
  return standing;
}
