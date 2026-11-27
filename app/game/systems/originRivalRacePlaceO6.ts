import type { HomeworldCheckpointV77 } from "./homeworldCheckpointV77";
import { homeworldCivicWalkableV80 } from "./homeworldCivicWorldV80";
import { homeworldRouteSegmentV109 } from "./homeworldNavigationV109";
import { townBellSiteO6 } from "./originTownBellPlacesO6";
import { nearestHomeworldDoorV77, type HomeworldLevelV77 } from "./homeworldWorldV77";

const forge = townBellSiteO6("regroup");
const stations = [[128, 0], [-128, 0], [128, 68], [-128, 68], [0, 136], [0, -136]]
  .map(([dx, dy]) => ({ x: forge.point.x + dx, y: forge.point.y + dy }));
const workshop = stations.find(point => homeworldCivicWalkableV80(forge.levelId, point) &&
  homeworldRouteSegmentV109(forge.levelId, forge.point, point) && !nearestHomeworldDoorV77(forge.levelId, point));
if (!workshop) throw Error("Le pari de Harek demande un accès libre à côté de la forge.");
export const RIVAL_WORKSHOP_O6 = { levelId: forge.levelId, point: workshop };

/** The roof gathering leaves the ordinary workshop door available. */
export function atRivalWorkshopO6(level: HomeworldLevelV77, actor: { x: number; y: number }, interiorId: string | null) {
  return interiorId === null && level === RIVAL_WORKSHOP_O6.levelId &&
    Math.hypot(actor.x - RIVAL_WORKSHOP_O6.point.x, actor.y - RIVAL_WORKSHOP_O6.point.y) < 52 &&
    !nearestHomeworldDoorV77(level, actor) && homeworldCivicWalkableV80(level, actor) &&
    homeworldRouteSegmentV109(level, actor, RIVAL_WORKSHOP_O6.point);
}

export function rivalWorkshopCheckpointO6(site: HomeworldCheckpointV77, owner: string) {
  return site.ownerCreatedAt === owner && site.local === null && atRivalWorkshopO6(site.levelId, site.exterior, site.interiorId);
}
