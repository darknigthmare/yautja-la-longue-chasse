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

const alternateStations = [
  {
    partner: "tov", name: "Tov", roomId: "deep-forge", pointId: "forge-service", district: "Forges",
    lesson: "Soutenir la charge", demonstration: ["Regarder Tov placer l’appui", "Observer la retenue sous charge"],
    cues: ["Pièce au repos", "Appui engagé", "Passage tenu"],
    speech: [
      "La prise est trop lourde pour celui qui doit lire la piste.",
      "Je pose l’appui sous la charge. Passe sur mon signal.",
      "Je tiens la ligne. Si quelqu’un chute, je reviens le chercher.",
      "Yena peut trouver l’approche. Retrouve-nous auprès du maître des terrasses.",
    ],
  },
  {
    partner: "yena", name: "Yena", roomId: "training-hall", pointId: "training-service", district: "Terrasses",
    lesson: "Éprouver le passage", demonstration: ["Comparer l’appui léger", "Chercher l’issue masquée", "Attendre son signal"],
    cues: ["Passage à lire", "Appui léger repéré", "Issue dégagée", "Signal de progression"],
    speech: [
      "Une voie ouverte ne veut pas dire qu’elle est sûre.",
      "Le premier appui tient. La poussière cache la seconde prise.",
      "L’issue est libre si l’on arrive de biais.",
      "J’appelle l’ouverture quand nous sommes tous en place.",
      "Avec Tov à l’ouverture, je prends l’approche. Confirme le départ auprès du maître.",
    ],
  },
] as const;

const allStations = [...TRIAD_CITY_STATIONS_M016, ...alternateStations];
type RegularStation = typeof TRIAD_CITY_STATIONS_M016[number];
type AlternateStation = typeof alternateStations[number];
export type TriadCityStationM016 = RegularStation | AlternateStation;
export type TriadCityPartnerM016 = RegularStation["partner"];
type TriadCityAlternateM016 = AlternateStation["partner"];
export type TriadCityRosterChoiceM016 = "historic" | "yena-tov";

export interface TriadCityM016 {
  version: 1;
  ownerCreatedAt: string;
  steps: Record<TriadCityPartnerM016, number>;
  alternates?: Record<TriadCityAlternateM016, number>;
  roster?: "yena-tov";
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export const triadCityStationM016 = (roomId: string | null | undefined) =>
  TRIAD_CITY_STATIONS_M016.find(station => station.roomId === roomId);

export const triadCityStationsM016 = (roomId: string | null | undefined) =>
  allStations.filter(station => station.roomId === roomId);

export const triadCityStepM016 = (ledger: TriadCityM016 | undefined, station: TriadCityStationM016) =>
  station.partner === "saar" || station.partner === "vek"
    ? ledger?.steps[station.partner] ?? 0 : ledger?.alternates?.[station.partner] ?? 0;

export const triadCityInvitationReadyM016 = (station: TriadCityStationM016, steps: number) =>
  steps > station.demonstration.length;

export const triadCityRemainingM016 = (ledger?: TriadCityM016) =>
  TRIAD_CITY_STATIONS_M016.filter(station => !triadCityInvitationReadyM016(station, triadCityStepM016(ledger, station)));

export const triadCityMayChooseAlternateM016 = (ledger?: TriadCityM016) =>
  alternateStations.every(station => triadCityInvitationReadyM016(station, triadCityStepM016(ledger, station)));

export interface TriadCityRouteM016 {
  station: TriadCityStationM016;
  purpose: "meeting" | "gallery";
}

/** The next stop follows the actual invitations and room, including a save
 * made at the first doorway. The atlas still owns routing and physical entry. */
export function triadCityRoutesM016(ledger?: TriadCityM016, roomId?: string | null): TriadCityRouteM016[] {
  if (ledger?.roster !== "yena-tov") {
    const alternatePending = ledger?.alternates
      ? alternateStations.filter(station => !triadCityInvitationReadyM016(station, triadCityStepM016(ledger, station))) : [];
    const next = [...triadCityRemainingM016(ledger), ...alternatePending];
    if (next.length) return next.map(station => ({ station, purpose: "meeting" }));
  }
  const terraces = ledger?.roster === "yena-tov" ? alternateStations[1] : TRIAD_CITY_STATIONS_M016[1];
  return roomId === terraces.roomId ? [] : [{ station: terraces, purpose: "gallery" }];
}

export const triadCityAtlasTargetM016 = (route: TriadCityRouteM016) => "point:" + route.station.pointId;

export function triadCityFollowupM016(ledger: TriadCityM016 | undefined, station: TriadCityStationM016) {
  const routes = triadCityRoutesM016(ledger, station.roomId).filter(route => route.station.roomId !== station.roomId);
  if (station.partner === "tov" || station.partner === "yena") {
    return routes.find(route => route.station.partner === "tov" || route.station.partner === "yena") ?? routes[0];
  }
  return routes[0];
}

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
  const alternates = { yena: 0, tov: 0 };
  if (value.alternates !== undefined) {
    if (!isRecord(value.alternates) || Object.keys(value.alternates).length !== alternateStations.length) return null;
    for (const station of alternateStations) {
      const step = value.alternates[station.partner];
      if (typeof step !== "number" || !Number.isInteger(step) || step < 0 ||
          step > station.demonstration.length + 1) return null;
      alternates[station.partner] = step;
    }
    if (!alternates.yena && !alternates.tov) return null;
  }
  if (!steps.saar && !steps.vek && !alternates.yena && !alternates.tov) return null;
  const ledger: TriadCityM016 = { version: 1, ownerCreatedAt: value.ownerCreatedAt, steps,
    ...(value.alternates ? { alternates } : {}) };
  if (value.roster !== undefined) {
    if (value.roster !== "yena-tov" || !triadCityMayChooseAlternateM016(ledger)) return null;
    ledger.roster = value.roster;
  }
  return ledger;
}

export function triadCityMatchesSaveM016(save: Pick<SaveGame, "createdAt" | "homeworld" | "soloV70" | "prologue">) {
  const ledger = save.homeworld.triadCityM016;
  return !!ledger && ledger.ownerCreatedAt === save.createdAt &&
    save.prologue?.status === "completed" && save.soloV70?.status === "completed";
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
  const step = triadCityStepM016(prior, station);
  if (step !== expectedStep || triadCityInvitationReadyM016(station, step) ||
      (prior && prior.ownerCreatedAt !== owner) || checkpoint.ownerCreatedAt !== owner ||
      !triadCityStationReachedM016(station, checkpoint)) return null;
  const ledger: TriadCityM016 = prior ?? { version: 1, ownerCreatedAt: owner, steps: { saar: 0, vek: 0 } };
  if (station.partner === "saar" || station.partner === "vek") {
    return normalizeTriadCityM016({ ...ledger, steps: { ...ledger.steps, [station.partner]: step + 1 } });
  }
  const alternates = { ...(ledger.alternates ?? { yena: 0, tov: 0 }), [station.partner]: step + 1 };
  return normalizeTriadCityM016({ ...ledger, alternates });
}

export function selectTriadCityRosterM016(prior: TriadCityM016 | undefined, owner: string,
    choice: TriadCityRosterChoiceM016, checkpoint: HomeworldCheckpointV77) {
  if (!prior || prior.ownerCreatedAt !== owner || checkpoint.ownerCreatedAt !== owner ||
      !triadCityMayChooseAlternateM016(prior) || !triadCityStationReachedM016(alternateStations[1], checkpoint)) return null;
  const roster = choice === "yena-tov" ? choice : undefined;
  return prior.roster === roster ? null : normalizeTriadCityM016({ ...prior, roster });
}

/** A durable write may add one observed gesture at its actual room checkpoint. */
export function triadCityMatchesWriteM016(previous: Pick<SaveGame, "homeworld" | "soloV90">, requested: Pick<SaveGame, "homeworld" | "soloV90">) {
  const before = previous.homeworld.triadCityM016, after = requested.homeworld.triadCityM016;
  if (!after) return !before;
  if (before && before.ownerCreatedAt !== after.ownerCreatedAt) return false;
  const changes = allStations.map(station => ({ station, delta: triadCityStepM016(after, station) - triadCityStepM016(before, station) }))
    .filter(change => change.delta !== 0);
  const pickedDifferentRoster = before?.roster !== after.roster;
  if (!changes.length && !pickedDifferentRoster) return true;
  const checkpoint = requested.homeworld.locationV77;
  if (previous.soloV90 || requested.soloV90 || !checkpoint || checkpoint.ownerCreatedAt !== after.ownerCreatedAt) return false;
  if (pickedDifferentRoster) {
    return !changes.length && triadCityMayChooseAlternateM016(before) &&
      triadCityStationReachedM016(alternateStations[1], checkpoint);
  }
  return changes.length === 1 && changes[0].delta === 1 && triadCityStationReachedM016(changes[0].station, checkpoint);
}
