import type { SaveGame } from "../types";
import type { HomeworldCheckpointV77 } from "./homeworldCheckpointV77";
import { homeworldInteriorForBuildingV64, isHomeworldInteriorWalkableV64, nearestHomeworldInteriorTargetV64 } from "./homeworldInteriorsV64";

export const TRIAD_CITY_STATIONS_M016 = [
  {
    partner: "saar", name: "Saar", roomId: "deep-forge", pointId: "forge-service", district: "Forges",
    lesson: "Tenir le verrou", demonstration: ["Regarder Saar bloquer le verrou", "Observer le moment de l’ouverture"],
    cues: ["Verrou libre", "Verrou retenu sous tension", "Passage ouvert au signal"],
    speech: [
      "Le verrou doit tenir pendant que le pisteur avance.",
      "Je tiens la charge. Attends mon regard avant de faire passer le groupe.",
      "Quand tu donnes le signal, j’ouvre et je tiens le passage.",
      "Je te rejoins au repère de la galerie avec Vek.",
    ],
  },
  {
    partner: "vek", name: "Vek", roomId: "training-hall", pointId: "training-service", district: "Terrasses",
    lesson: "Lire une piste", demonstration: ["Comparer l’empreinte profonde", "Repérer la déviation", "Suivre le dernier appui"],
    cues: ["Piste à lire", "Appui lourd repéré", "Déviation repérée", "Approche dégagée"],
    speech: [
      "Je m’entraîne à retrouver l’approche sur ces trois repères.",
      "Le premier appui porte le poids. La foulée suivante repart sur le côté.",
      "La déviation annonce un changement de direction. Compare le dernier appui.",
      "Je prends la piste et je te signale le passage ouvert.",
      "Je viens au repère avec Saar. On règlera les postes sur place.",
    ],
  },
] as const;

export type TriadCityStationM016 = typeof TRIAD_CITY_STATIONS_M016[number];
export type TriadCityPartnerM016 = TriadCityStationM016["partner"];

export interface TriadCityM016 {
  version: 1;
  ownerCreatedAt: string;
  steps: Record<TriadCityPartnerM016, number>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export const triadCityStationM016 = (roomId: string | null | undefined) =>
  TRIAD_CITY_STATIONS_M016.find(station => station.roomId === roomId);

export const triadCityInvitationReadyM016 = (station: TriadCityStationM016, steps: number) =>
  steps > station.demonstration.length;

export const triadCityRemainingM016 = (ledger?: TriadCityM016) =>
  TRIAD_CITY_STATIONS_M016.filter(station => !triadCityInvitationReadyM016(station, ledger?.steps[station.partner] ?? 0));

export interface TriadCityRouteM016 {
  station: TriadCityStationM016;
  purpose: "meeting" | "gallery";
}

/** The next stop follows the actual invitations and room, including a save
 * made at the first doorway. The atlas still owns routing and physical entry. */
export function triadCityRoutesM016(ledger?: TriadCityM016, roomId?: string | null): TriadCityRouteM016[] {
  const next = triadCityRemainingM016(ledger);
  if (next.length) return next.map(station => ({ station, purpose: "meeting" }));
  const terraces = TRIAD_CITY_STATIONS_M016[1];
  return roomId === terraces.roomId ? [] : [{ station: terraces, purpose: "gallery" }];
}

export const triadCityAtlasTargetM016 = (route: TriadCityRouteM016) => "point:" + route.station.pointId;

export function normalizeTriadCityM016(value: unknown): TriadCityM016 | null {
  if (!isRecord(value) || value.version !== 1 || typeof value.ownerCreatedAt !== "string" ||
      !Number.isFinite(Date.parse(value.ownerCreatedAt)) || !isRecord(value.steps) ||
      Object.keys(value.steps).length !== TRIAD_CITY_STATIONS_M016.length) return null;
  const steps = { saar: 0, vek: 0 };
  for (const station of TRIAD_CITY_STATIONS_M016) {
    const step = value.steps[station.partner];
    if (typeof step !== "number" || !Number.isInteger(step) || step < 0 ||
        step > station.demonstration.length + 1) return null;
    steps[station.partner] = step;
  }
  return steps.saar || steps.vek ? { version: 1, ownerCreatedAt: value.ownerCreatedAt, steps } : null;
}

export function triadCityMatchesSaveM016(save: Pick<SaveGame, "createdAt" | "homeworld" | "soloV69" | "soloV70" | "prologue">) {
  const ledger = save.homeworld.triadCityM016;
  const preparationChapter = save.prologue?.templeTriadFirstM017 ? save.soloV69 : save.soloV70;
  return !!ledger && ledger.ownerCreatedAt === save.createdAt &&
    save.prologue?.status === "completed" && preparationChapter?.status === "completed";
}

export function triadCityStationReachedM016(station: TriadCityStationM016, checkpoint?: HomeworldCheckpointV77) {
  if (checkpoint?.interiorId !== station.roomId || !checkpoint.local) return false;
  const room = homeworldInteriorForBuildingV64(station.roomId);
  if (!room || !isHomeworldInteriorWalkableV64(room, checkpoint.local)) return false;
  const target = nearestHomeworldInteriorTargetV64(room, checkpoint.local);
  return target?.kind === "point" && target.pointId === station.pointId;
}

export function advanceTriadCityM016(
  prior: TriadCityM016 | undefined,
  owner: string,
  station: TriadCityStationM016,
  expectedStep: number,
  checkpoint: HomeworldCheckpointV77,
) {
  const step = prior?.steps[station.partner] ?? 0;
  if (step !== expectedStep || triadCityInvitationReadyM016(station, step) ||
      (prior && prior.ownerCreatedAt !== owner) || checkpoint.ownerCreatedAt !== owner ||
      !triadCityStationReachedM016(station, checkpoint)) return null;
  const steps = { ...(prior?.steps ?? { saar: 0, vek: 0 }), [station.partner]: step + 1 };
  return normalizeTriadCityM016({ version: 1, ownerCreatedAt: owner, steps });
}

/** A durable write may add one observed gesture at its actual room checkpoint. */
export function triadCityMatchesWriteM016(previous: Pick<SaveGame, "homeworld" | "soloV90">, requested: Pick<SaveGame, "homeworld" | "soloV90">) {
  const before = previous.homeworld.triadCityM016, after = requested.homeworld.triadCityM016;
  if (!after) return !before;
  if (before && (before.ownerCreatedAt !== after.ownerCreatedAt || before.steps.saar > after.steps.saar ||
      before.steps.vek > after.steps.vek)) return false;
  const delta = after.steps.saar - (before?.steps.saar ?? 0) + after.steps.vek - (before?.steps.vek ?? 0);
  if (delta === 0) return true;
  const station = TRIAD_CITY_STATIONS_M016.find(item => after.steps[item.partner] > (before?.steps[item.partner] ?? 0));
  return delta === 1 && !previous.soloV90 && !requested.soloV90 &&
    !!station && !!requested.homeworld.locationV77 &&
    requested.homeworld.locationV77.ownerCreatedAt === after.ownerCreatedAt &&
    triadCityStationReachedM016(station, requested.homeworld.locationV77);
}
