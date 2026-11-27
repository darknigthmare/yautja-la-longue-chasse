import { HOMEWORLD_BUILDINGS_V77, HOMEWORLD_COUNCIL_STAIR_LANDINGS_V77, type HomeworldLevelV77 } from "./homeworldWorldV77";
import { homeworldCivicWalkableV80 } from "./homeworldCivicWorldV80";
import { homeworldInteriorForBuildingV64, isHomeworldInteriorWalkableV64, nearestHomeworldInteriorTargetV64,
  type HomeworldInteriorV64, type InteriorGroundPointV64 } from "./homeworldInteriorsV64";
import { nextYouthCityStopV172, youthCityGuidePendingM003, type YouthCityErrandV172 } from "./youthCityErrandV172";
import type { HomeworldCheckpointV77 } from "./homeworldCheckpointV77";

export const YOUTH_CITY_HEARTH_M003 = "residence-terraces-1";
const forge = HOMEWORLD_BUILDINGS_V77.find(building => building.id === "deep-forge")!;
const hearth = HOMEWORLD_BUILDINGS_V77.find(building => building.id === YOUTH_CITY_HEARTH_M003)!;
const stair = HOMEWORLD_COUNCIL_STAIR_LANDINGS_V77.from;
export const YOUTH_CITY_SAAR_LANDING_M003 = stair;
const actions = {
  council: { kind: "council", label: "Retrouver Saar au pied de l’escalier",
    message: "Saar te montre la voie des Forges. Le chenil est un autre arrêt. Après les Terrasses, entre dans la maison de la promenade et repère sa table." },
  forge: { kind: "forge", label: "Observer les ligatures avec la maîtresse des parures",
    message: "La maîtresse te montre une ligature qui se desserre au refroidissement. Elle t’envoie lire le signe de la Mémoire avant de lui remettre la pièce." },
  hearth: { kind: "hearth", label: "Repérer la table du foyer",
    message: "Tu repères la table de la maison de la promenade. Le foyer des Terrasses est consigné. Tu peux retourner vers la salle des maîtres." },
} as const;
const near = (a: InteriorGroundPointV64, b: InteriorGroundPointV64, radius: number) =>
  Math.hypot(a.x - b.x, a.y - b.y) <= radius;

export function youthCityHearthTableM003(room: HomeworldInteriorV64 | null) {
  return room?.buildingId === YOUTH_CITY_HEARTH_M003 ? room.furniture?.find(fixture => fixture.artId === "meal-table") : undefined;
}

export function youthCityPlaceActionM003(errand: YouthCityErrandV172 | undefined, level: HomeworldLevelV77,
  point: InteriorGroundPointV64, room: HomeworldInteriorV64 | null) {
  if (!errand || youthCityGuidePendingM003(errand)) return null;
  if (errand.encounterM003 === "pending") {
    if (errand.route === "escort" && !room && level === stair.levelId && near(point, stair.point, 86) && homeworldCivicWalkableV80(level, point)) {
      return actions.council;
    }
    if (errand.route === "archives" && room?.buildingId === forge.id && level === forge.levelId) {
      const target = nearestHomeworldInteriorTargetV64(room, point);
      if (target?.kind === "point" && target.pointId === "forge-service" && isHomeworldInteriorWalkableV64(room, point)) return actions.forge;
    }
    return null;
  }
  if (!errand.hearthM003 && !nextYouthCityStopV172(errand) && room && level === hearth.levelId) {
    const table = youthCityHearthTableM003(room);
    if (table && near(point, table, 76) && isHomeworldInteriorWalkableV64(room, point)) return actions.hearth;
  }
  return null;
}

export function youthCityCouncilGuideVisibleM003(errand: YouthCityErrandV172 | undefined, level: HomeworldLevelV77) {
  return level === stair.levelId && errand?.route === "escort" && errand.encounterM003 === "pending" && !youthCityGuidePendingM003(errand);
}

export function youthCityPlaceMatchesWriteM003(before: YouthCityErrandV172 | undefined, after: YouthCityErrandV172 | undefined,
  location: HomeworldCheckpointV77 | undefined): boolean {
  if (!before || !after) return true;
  const meeting = before.encounterM003 === "pending" && after.encounterM003 === "met";
  const visited = !before.hearthM003 && after.hearthM003;
  if (!meeting && !visited) return true;
  if (!location || location.ownerCreatedAt !== before.ownerCreatedAt) return false;
  const room = location.interiorId ? homeworldInteriorForBuildingV64(location.interiorId) : null;
  const point = room ? location.local : location.exterior;
  if (!point || (location.interiorId && !room)) return false;
  const action = youthCityPlaceActionM003(before, location.levelId, point, room);
  return visited ? action?.kind === "hearth" : action?.kind === (before.route === "escort" ? "council" : "forge");
}
