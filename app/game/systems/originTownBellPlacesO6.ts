import type { SaveGame } from "../types";
import type { HomeworldActor } from "./homeworldCity";
import type { HomeworldCheckpointV77 } from "./homeworldCheckpointV77";
import { homeworldCivicWalkableV80 } from "./homeworldCivicWorldV80";
import { homeworldBuildingDoorwayV64 } from "./homeworldGeometryV64";
import { homeworldInteriorForBuildingV64, isHomeworldInteriorWalkableV64, nearestHomeworldInteriorTargetV64 } from "./homeworldInteriorsV64";
import { homeworldRouteSegmentV109, homeworldWalkRouteV109 } from "./homeworldNavigationV109";
import { homeworldStreetContactV100 } from "./homeworldStreetContactsV100";
import { HOMEWORLD_BUILDINGS_V77, HOMEWORLD_COUNCIL_STAIR_LANDINGS_V77, type HomeworldLevelV77 } from "./homeworldWorldV77";
import { saarGuidePoseOnPathM003 } from "./youthCityGuideM003";
import { YOUTH_CITY_STREET_MARKERS_M003 } from "./youthCityStreetM003";
import { homeworldWayfindingInteriorSegmentV75 } from "./homeworldWayfindingV75";
import { townBellActionsO6, type TownBellActionO6 } from "./originTownBellO6";

const forge = HOMEWORLD_BUILDINGS_V77.find(building => building.id === "deep-forge")!;
const forgeDoor = homeworldBuildingDoorwayV64(forge).approach;
const council = HOMEWORLD_COUNCIL_STAIR_LANDINGS_V77.from;

type Point = { x: number; y: number };
type Site = { point: Point; levelId: HomeworldLevelV77; interiorId: string | null; near: number };
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const exterior = (point: Point, levelId = council.levelId as HomeworldLevelV77, near = 68): Site =>
  ({ point, levelId, interiorId: null, near });

/** Uses the actual public armorer room and the canonical handler's first route post. */
export function townBellSiteO6(action: TownBellActionO6): Site {
  switch (action) {
    case "begin": return exterior(council.point, council.levelId, 86);
    case "workshops": return exterior(YOUTH_CITY_STREET_MARKERS_M003[0].point);
    case "square": return exterior(YOUTH_CITY_STREET_MARKERS_M003[1].point);
    case "unlatch":
    case "regroup":
    case "postpone": return exterior(forgeDoor, forge.levelId, 72);
    case "kennel": {
      const handler = homeworldStreetContactV100("urban-v84:kennel-return");
      if (!handler) throw Error("Chenil des Pisteurs : poste natif introuvable.");
      return exterior(handler.path[0], handler.levelId, 86);
    }
    default: {
      const room = homeworldInteriorForBuildingV64(forge.id)!;
      const workbench = room.points.find(point => point.pointId === "forge-service")!;
      if (action !== "ring") return { point: workbench, levelId: forge.levelId, interiorId: room.buildingId, near: 79 };
      const candidates = [102, -102, 126, -126, 82, -82].map(dx => ({ x: room.spawn.x + dx, y: room.spawn.y - 28 }));
      const bell = candidates.find(point => isHomeworldInteriorWalkableV64(room, point) &&
        homeworldWayfindingInteriorSegmentV75(room, room.spawn, point));
      if (!bell) throw Error("Forge : point de cloche hors circulation.");
      return { point: bell, levelId: forge.levelId, interiorId: room.buildingId, near: 50 };
    }
  }
}

export function townBellAtSiteO6(action: TownBellActionO6, levelId: HomeworldLevelV77, actor: Point, interiorId: string | null) {
  const site = townBellSiteO6(action);
  if (site.levelId !== levelId || site.interiorId !== interiorId || distance(site.point, actor) > site.near) return false;
  if (!interiorId) return homeworldCivicWalkableV80(levelId, actor) && homeworldRouteSegmentV109(levelId, actor, site.point);
  const room = homeworldInteriorForBuildingV64(interiorId);
  if (!room || !isHomeworldInteriorWalkableV64(room, actor)) return false;
  if (action === "ring") return homeworldWayfindingInteriorSegmentV75(room, actor, site.point);
  const contact = nearestHomeworldInteriorTargetV64(room, actor);
  return contact?.kind === "point" && contact.pointId === "forge-service";
}

export function townBellLocationsMatchO6(save: SaveGame) {
  return save.originV151?.townBellO6?.journal.every(event => {
    const at: HomeworldCheckpointV77 = event.at;
    const actor = at.interiorId ? at.local : at.exterior;
    return !!actor && townBellAtSiteO6(event.action, at.levelId, actor, at.interiorId);
  }) ?? true;
}

export function townBellActionAtO6(save: SaveGame, levelId: HomeworldLevelV77, actor: Point, interiorId: string | null) {
  return townBellActionsO6(save).find(action => action !== "postpone" && townBellAtSiteO6(action, levelId, actor, interiorId));
}

const stages = {
  begin: "Saar · Au pied de l’escalier du Conseil",
  workshops: "Rue des ateliers",
  square: "Place du Marché des Clans",
  unlatch: "Grille extérieure de la forge",
  deliver: "Comptoir de l’artisane",
  ring: "Cloche de livraison",
  regroup: "Rassemblement devant la forge",
  workshop: "Yena · Atelier des parures",
  kennel: "Tov · Chenil des Pisteurs",
  postpone: "Saar · Rassemblement devant la forge",
} as const;
export const TOWN_BELL_MARKS_O6 = stages;
export const TOWN_BELL_LABELS_O6: Record<TownBellActionO6, string> = {
  begin: "Prendre la pièce auprès de Saar",
  workshops: "Suivre Saar dans la rue des ateliers",
  square: "S’arrêter auprès des étals du marché",
  unlatch: "Soulever le loquet de la grille",
  deliver: "Remettre la pièce à l’artisane",
  ring: "Tirer la corde de la cloche",
  regroup: "Retrouver la cohorte devant la forge",
  workshop: "Accompagner Yena à son établi",
  kennel: "Accompagner Tov au chenil",
  postpone: "Reporter les détours avec Saar",
};

export function townBellReplyO6(save: SaveGame, action: TownBellActionO6) {
  switch (action) {
    case "begin": {
      const race = save.originV151?.cohortRaceO6;
      if (!race?.success) return "Saar · « La manche attendra. Garde la pièce à deux mains et suis les repères de Yena. »";
      return race.relation?.partner === "yena"
        ? "Saar · « Yena te montre comment porter la pièce sans tirer sur sa ligature. Suivez-moi vers les ateliers. »"
        : "Saar · « Harek te montre l’appui qu’il a retenu de la course. Porte la pièce avec nous vers les ateliers. »";
    }
    case "workshops": return "Saar ralentit devant les étals. Les artisans chargent un convoi vers les Forges. La cohorte continue jusqu’au marché.";
    case "square": return "Un marchand signale le retour du convoi. La pièce passe par la grille de livraison des Forges.";
    case "unlatch": return "Le loquet tient en position ouverte. Entre dans l’atelier avec la pièce.";
    case "deliver": return "L’artisane reçoit la pièce au comptoir. Elle demande de faire sonner la cloche pour prévenir les équipes.";
    case "ring": return "La cloche retentit. L’artisane indique le rassemblement devant la grille.";
    case "regroup": return "Yena se rend à l’établi. Tov rejoint le chenil. Tu peux les accompagner dans l’ordre que tu choisis.";
    case "workshop": return "Yena recale sa ligature avec l’artisane. Elle conserve le repère que vous avez vérifié ensemble.";
    case "kennel": return "Tov demande au gardien comment dégager le couloir des chiens. Vous gardez la consigne pour la prochaine visite.";
    case "postpone": return "Saar consigne les gestes de livraison. L’atelier et le chenil t’attendent toujours.";
  }
}

export function townBellGuidePoseO6(save: SaveGame, levelId: HomeworldLevelV77, actor: HomeworldActor, interiorId: string | null) {
  if (interiorId) return null;
  const expected = townBellActionsO6(save)[0];
  if (!expected || !["begin", "workshops", "square", "unlatch", "regroup"].includes(expected)) return null;
  const target = townBellSiteO6(expected);
  if (target.levelId !== levelId || target.interiorId) return null;
  const previous = save.originV151?.townBellO6?.journal.at(-1)?.at;
  if (previous && !previous.interiorId && previous.levelId === levelId &&
      !["begin", "regroup"].includes(expected)) {
    const path = homeworldWalkRouteV109(levelId, previous.exterior, target.point);
    const pose = path.status === "reachable" && saarGuidePoseOnPathM003(path.points, actor);
    if (pose) return pose;
  }
  return { ...target.point, facing: actor.x < target.point.x ? -1 as const : 1 as const, moving: false, waiting: true };
}
