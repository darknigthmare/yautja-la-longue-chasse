import { ARMOR_BY_ID, GEAR_BY_ID, MISSION_BY_ID, WEAPON_BY_ID } from "../data";
import { GALAXY_SYSTEM_REGISTRY } from "../galaxyRegistry";
import type { ArmorId, GearId, MissionId, SaveGame, WeaponId } from "../types";
import { firstInterstellarReceiptV173 } from "./firstInterstellarV173";
import { shipReceiptV161 } from "./shipReceiptV161";
import { inspectSpaceRoutesV159, planSpaceRouteV159, PROPOSED_DEFAULT_SYSTEM_V159, SPACE_ROUTE_DESTINATIONS_V159 } from "./spaceRoutesV159";

export const ROUTE_OFFICER_M034 = { roomId: "dock-control", pointId: "dock-officer-point" } as const;
export const ROUTE_BOARDING_M034 = { roomId: null, pointId: "personal-ship" } as const;

const destinations = {
  "oseris-hunt": { kind: "hunt", systemId: "system-oseris", bodyId: "planet-oseris-iv", missionId: "jungle-vey" },
  "nivalis-hunt": { kind: "hunt", systemId: "system-nivalis", bodyId: "planet-nivalis-k", missionId: "ice-cryostalker" },
  "kaail-survey": { kind: "survey", systemId: "system-kaail", bodyId: "planet-kaail-prime" },
  "pilgrim-relay": { kind: "service", systemId: "system-serekh", bodyId: "station-pilgrim-relay" },
} as const;
type DestinationId = keyof typeof destinations;
type RouteSave = Pick<SaveGame, "createdAt" | "profile" | "prologue" | "shipAcquisitionV89" |
  "clanShipDocking" | "firstInterstellarV173" | "spaceRoutesV159" | "missionProgress" | "loadout">;

type FieldKit = { armorId: ArmorId; weaponId: WeaponId; gearId: GearId };
type RoutePlan = {
  version: 1;
  ownerCreatedAt: string;
  hullInstanceId: string;
  originSystemId: string;
  destinationId: DestinationId;
};
export type HomeworldRouteM034 =
  | (RoutePlan & { phase: "planned" })
  | (RoutePlan & { phase: "prepared"; fieldKit: FieldKit });

export type HomeworldRouteActionM034 =
  | { kind: "plan"; destinationId: DestinationId }
  | { kind: "seal" };
type RoutePlace = { roomId: string | null; pointId: string | null; suspended: boolean };

function isDestination(value: unknown): value is DestinationId {
  return typeof value === "string" && Object.hasOwn(destinations, value);
}

export function homeworldRouteFactsM034(originSystemId: string, destinationId: DestinationId) {
  const target = destinations[destinationId];
  const system = GALAXY_SYSTEM_REGISTRY.find(candidate => candidate.id === target.systemId);
  const body = system?.bodies.find(candidate => candidate.id === target.bodyId);
  const itinerary = planSpaceRouteV159(originSystemId, target.systemId);
  if (!body || !itinerary) return null;
  return { ...target, body, itinerary };
}

export function normalizeHomeworldRouteM034(raw: unknown): HomeworldRouteM034 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const { version, ownerCreatedAt, hullInstanceId, originSystemId, destinationId, phase, fieldKit } = raw as Record<string, unknown>;
  if (version !== 1 || typeof ownerCreatedAt !== "string" || !Number.isFinite(Date.parse(ownerCreatedAt)) ||
      typeof hullInstanceId !== "string" || !hullInstanceId || hullInstanceId.length > 150 ||
      typeof originSystemId !== "string" || !SPACE_ROUTE_DESTINATIONS_V159.includes(originSystemId) ||
      !isDestination(destinationId) || !homeworldRouteFactsM034(originSystemId, destinationId)) return null;
  const plan: RoutePlan = { version, ownerCreatedAt, hullInstanceId, originSystemId, destinationId };
  if (phase === "planned" && fieldKit === undefined) return { ...plan, phase };
  if (phase !== "prepared" || !fieldKit || typeof fieldKit !== "object" || Array.isArray(fieldKit)) return null;
  const { armorId, weaponId, gearId } = fieldKit as Partial<FieldKit>;
  if (!armorId || !weaponId || !gearId || !Object.hasOwn(ARMOR_BY_ID, armorId) ||
      !Object.hasOwn(WEAPON_BY_ID, weaponId) || !Object.hasOwn(GEAR_BY_ID, gearId)) return null;
  return { ...plan, phase, fieldKit: { armorId, weaponId, gearId } };
}

function routeAuthorityM034(save: RouteSave) {
  if (!firstInterstellarReceiptV173(save, save.firstInterstellarV173)) return null;
  return shipReceiptV161(save).receipt;
}

export function homeworldRouteStateM034(raw: unknown, save: RouteSave): HomeworldRouteM034 | null {
  const state = normalizeHomeworldRouteM034(raw);
  return state?.ownerCreatedAt === save.createdAt && state.hullInstanceId === routeAuthorityM034(save)?.instanceId ? state : null;
}

export function homeworldRouteChoicesM034(save: RouteSave) {
  const owned = routeAuthorityM034(save);
  if (!owned) return null;
  const routes = inspectSpaceRoutesV159(save.spaceRoutesV159, save.createdAt);
  const currentSystemId = routes.state?.currentSystemId ?? PROPOSED_DEFAULT_SYSTEM_V159;
  const blocked = routes.status === "invalid-save" || routes.status === "future-version"
    ? "Le registre de route doit être repris."
    : routes.state?.trip ? "Termine d’abord la liaison en cours."
      : save.clanShipDocking && save.clanShipDocking.status !== "free-flight" ? "Libère ta coque du Clan Ship avant de préparer le départ." : null;
  const choices = (Object.keys(destinations) as DestinationId[]).flatMap(destinationId => {
    const facts = homeworldRouteFactsM034(currentSystemId, destinationId);
    if (!facts) return [];
    const mission = facts.kind === "hunt" ? save.missionProgress[facts.missionId] : undefined;
    const unlocked = facts.kind !== "hunt" || mission?.status === "available" || mission?.status === "completed";
    return [{ destinationId, unlocked, ...facts }];
  });
  return { currentSystemId, hullInstanceId: owned.instanceId, blocked, choices };
}

export function actHomeworldRouteM034(
  raw: unknown, save: RouteSave, action: HomeworldRouteActionM034, place: RoutePlace,
): { state?: HomeworldRouteM034; message: string } {
  const station = action.kind === "plan" ? ROUTE_OFFICER_M034 : ROUTE_BOARDING_M034;
  if (place.suspended || place.roomId !== station.roomId || place.pointId !== station.pointId) {
    return { message: "Rejoins le poste indiqué pour poursuivre la préparation." };
  }
  const briefing = homeworldRouteChoicesM034(save);
  if (!briefing) return { message: "Rapporte d’abord le reçu de la première traversée." };
  if (briefing.blocked) return { message: briefing.blocked };
  const prior = homeworldRouteStateM034(raw, save);
  if (raw != null && !prior) return { message: "Ce manifeste ne correspond pas à la campagne ou à la coque." };
  if (prior?.phase === "prepared") return { message: "Le manifeste de cette expédition est déjà scellé." };
  if (action.kind === "plan") {
    const choice = briefing.choices.find(row => row.destinationId === action.destinationId);
    if (!choice?.unlocked) return { message: "Cette destination n’est pas ouverte à ton équipage." };
    if (prior?.destinationId === action.destinationId && prior.originSystemId === briefing.currentSystemId) {
      return { message: "Cette route est déjà reportée. Rejoins le sas de transfert orbital." };
    }
    return {
      state: { version: 1, ownerCreatedAt: save.createdAt, hullInstanceId: briefing.hullInstanceId,
        originSystemId: briefing.currentSystemId, destinationId: action.destinationId, phase: "planned" },
      message: "Route désignée. Porte le manifeste au sas de transfert orbital.",
    };
  }
  if (!prior || prior.originSystemId !== briefing.currentSystemId) {
    return { message: "Confirme de nouveau l’origine et la destination auprès de l’officier." };
  }
  if (!briefing.choices.find(choice => choice.destinationId === prior.destinationId)?.unlocked) {
    return { message: "Le contrat porté au manifeste doit encore être ouvert." };
  }
  const { armorId } = save.loadout;
  const [weaponId] = save.loadout.weaponIds;
  const [gearId] = save.loadout.gearIds;
  const state = normalizeHomeworldRouteM034({ ...prior, phase: "prepared", fieldKit: { armorId, weaponId, gearId } });
  return state ? { state, message: "Équipement contrôlé et route confirmée. Le manifeste est scellé pour la prochaine expédition." }
    : { message: "Vérifie l’armure, l’arme principale et l’outil porté avant de sceller le manifeste." };
}

export function homeworldRouteReadyM034(raw: unknown, save: RouteSave) {
  return homeworldRouteStateM034(raw, save)?.phase === "prepared";
}

export function homeworldRouteKitM034(kit: FieldKit) {
  return [ARMOR_BY_ID[kit.armorId].name, WEAPON_BY_ID[kit.weaponId].name, GEAR_BY_ID[kit.gearId].name];
}

export function homeworldRouteHuntNameM034(missionId: MissionId) {
  return MISSION_BY_ID[missionId].title;
}
