import type { HomeworldVec2 } from "./homeworldCity";
import { homeworldCivicWalkableV80 } from "./homeworldCivicWorldV80";
import { homeworldBuildingDoorwayV64 } from "./homeworldGeometryV64";
import { homeworldWalkRouteV109, homeworldRouteSegmentV109 } from "./homeworldNavigationV109";
import { homeworldNavigationRevisionV77 } from "./homeworldNavigationV77";
import { HOMEWORLD_BUILDINGS_V77, HOMEWORLD_COUNCIL_STAIR_LANDINGS_V77, type HomeworldLevelV77 } from "./homeworldWorldV77";
import { youthCityStreetLegM003, youthCityStreetRecoveredM003, type YouthCityErrandV172, type YouthCityStreetActionM003 } from "./youthCityErrandV172";

const forge = HOMEWORLD_BUILDINGS_V77.find(building => building.id === "deep-forge")!;
const market = HOMEWORLD_BUILDINGS_V77.find(building => building.id === "market-canopy")!;
const forgeApproach = homeworldBuildingDoorwayV64(forge).approach;
const marketApproach = homeworldBuildingDoorwayV64(market).approach;
const lowerLanding = HOMEWORLD_COUNCIL_STAIR_LANDINGS_V77.from;
const markerRadius = 62;
const workshops = { x: forgeApproach.x, y: forgeApproach.y + 240 };
const square = { x: marketApproach.x, y: marketApproach.y + 144 };

export const YOUTH_CITY_STREET_MARKERS_M003 = [
  { kind: "workshops", point: workshops, name: "Rue des ateliers", label: "Faire halte avec Saar dans la rue des ateliers",
    message: "Saar : la forge est repérée. Suis-moi à travers les étals jusqu’à la place du Marché des Clans." },
  { kind: "square", point: square, name: "Place du Marché des Clans", label: "Faire le point avec Saar sur la place",
    message: "Saar : les glyphes te ramènent aux Forges, aux archives et aux Terrasses. Garde ta pièce jusqu’au comptoir de la forge." },
] as const;
const junctions = [
  { x: forgeApproach.x, y: forgeApproach.y + 420 },
  { x: forgeApproach.x - 360, y: forgeApproach.y },
] as const;
const routeCache = new Map<string, ReturnType<typeof homeworldWalkRouteV109>>();
let geometryRevision = -1;

export function youthCityStreetPathM003(errand?: YouthCityErrandV172) {
  const leg = youthCityStreetLegM003(errand);
  if (!errand || leg === undefined) return null;
  const marker = YOUTH_CITY_STREET_MARKERS_M003[leg];
  const start = leg === 1 ? workshops : errand.route === "escort" ? lowerLanding.point : forgeApproach;
  const junction = junctions[leg];
  const nextRevision = homeworldNavigationRevisionV77();
  if (nextRevision !== geometryRevision) {
    routeCache.clear();
    geometryRevision = nextRevision;
  }
  const key = leg === 1 ? "square" : errand.route;
  let route = routeCache.get(key);
  if (!route) {
    route = homeworldWalkRouteV109(lowerLanding.levelId, start, marker.point);
    routeCache.set(key, route);
  }
  return { level: lowerLanding.levelId, marker, junction, route };
}

function reachesMarker(level: HomeworldLevelV77, actor: HomeworldVec2, mark: HomeworldVec2) {
  return Math.hypot(actor.x - mark.x, actor.y - mark.y) <= markerRadius &&
    homeworldCivicWalkableV80(level, actor) && homeworldRouteSegmentV109(level, actor, mark);
}

interface YouthCityStreetContactM003 { kind: YouthCityStreetActionM003; label: string; message: string }
export function youthCityStreetContactM003(errand: YouthCityErrandV172 | undefined, level: HomeworldLevelV77,
  actor: HomeworldVec2, interiorId: string | null): YouthCityStreetContactM003 | null {
  if (!errand || interiorId || level !== lowerLanding.levelId) return null;
  const path = youthCityStreetPathM003(errand);
  if (!path || path.route.status !== "reachable") return null;
  if (reachesMarker(level, actor, path.marker.point)) return path.marker;
  if (!youthCityStreetRecoveredM003(errand) && reachesMarker(level, actor, path.junction)) {
    return { kind: "directions", label: "Demander les repères à Yena",
      message: `Yena : suis le glyphe « ${path.marker.name} ». Saar attend sur cette voie. Je garde le croisement.` };
  }
  return null;
}

export function youthCityStreetBearingM003(actor: HomeworldVec2, target: HomeworldVec2) {
  const dx = target.x - actor.x, dy = target.y - actor.y;
  if (Math.hypot(dx, dy) <= markerRadius) return "ici";
  const northSouth = Math.abs(dy) > Math.abs(dx) / 2 ? dy < 0 ? "nord" : "sud" : "";
  const westEast = Math.abs(dx) > Math.abs(dy) / 2 ? dx < 0 ? "ouest" : "est" : "";
  return [northSouth, westEast].filter(Boolean).join("-");
}
