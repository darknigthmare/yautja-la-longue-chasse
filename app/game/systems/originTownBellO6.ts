import type { SaveGame } from "../types";
import { normalizeHomeworldCheckpointV77, type HomeworldCheckpointV77 } from "./homeworldCheckpointV77";

const procession = ["begin", "workshops", "square", "unlatch", "deliver", "ring", "regroup"] as const;
const visits = ["workshop", "kennel"] as const;
const kinds = [...procession, ...visits, "postpone"] as const;
export type TownBellActionO6 = typeof kinds[number];
type TownBellEventO6 = { action: TownBellActionO6; at: HomeworldCheckpointV77 };
type VisitO6 = typeof visits[number];
type RaceWitnessO6 = { choice: "lead" | "observe"; success: boolean; roundsLost: number; connected: "yena" | "harek" | null };

export interface TownBellRecordO6 {
  version: 1;
  ownerCreatedAt: string;
  race: RaceWitnessO6;
  journal: TownBellEventO6[];
  carriesPiece: boolean;
  resolved: boolean;
  success: boolean;
  choice: VisitO6 | null;
  observations: string[];
  transfers: string[];
}

const data = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const isAction = (value: unknown): value is TownBellActionO6 => kinds.some(kind => kind === value);

function raceWitness(save: SaveGame): RaceWitnessO6 | null {
  const origin = save.originV151;
  const race = origin?.cohortRaceO6;
  if (origin?.originId !== "O6" || origin.source !== "creation" || !race?.resolved ||
      race.ownerCreatedAt !== save.createdAt || !race.choice ||
      save.prologue?.status !== "completed" || save.prologue.checkpoint.cohortV172?.steps !== 7) return null;
  const connected = race.relation?.partner;
  if (race.success && connected !== "yena" && connected !== "harek") return null;
  return { choice: race.choice, success: race.success, roundsLost: race.roundsLost,
    connected: connected === "yena" || connected === "harek" ? connected : null };
}

export function townBellCanStartO6(save: SaveGame) {
  return !!raceWitness(save) && !save.originV151?.townBellO6 && !save.youthTraining &&
    !save.originV151?.ending?.selectionVisited && !save.originV151?.continuationO6 &&
    !save.originV151?.soloReturnO6 && !Object.values(save.originV151?.transitions ?? {}).some(record => record.resolved);
}

function nextFrom(journal: readonly TownBellEventO6[]): TownBellActionO6[] {
  if (journal.length < procession.length) return [procession[journal.length]];
  const remaining = visits.filter(visit => !journal.some(event => event.action === visit));
  return journal.length === procession.length ? [...remaining, "postpone"] : remaining;
}

export function townBellActionsO6(save: SaveGame): TownBellActionO6[] {
  const ledger = save.originV151?.townBellO6;
  return ledger ? nextFrom(ledger.journal) : townBellCanStartO6(save) ? ["begin"] : [];
}

function describe(ownerCreatedAt: string, race: RaceWitnessO6, journal: TownBellEventO6[]): TownBellRecordO6 {
  const firstVisit = journal.find(event => event.action === "workshop" || event.action === "kennel");
  const postponed = journal.some(event => event.action === "postpone");
  const done = (action: TownBellActionO6) => journal.some(event => event.action === action);
  const choice = firstVisit?.action === "workshop" || firstVisit?.action === "kennel" ? firstVisit.action : null;
  const observations = [race.success ? "parcours-de-cohorte-accompli" : "manche-de-cohorte-reportée"];
  if (done("workshops")) observations.push("rue-des-ateliers-rencontrée");
  if (done("square")) observations.push("marché-des-clans-rencontré");
  if (done("ring")) observations.push("signal-de-livraison-entendu");
  const transfers: string[] = [];
  if (done("deliver")) transfers.push("pièce-remise-aux-forges");
  if (done("ring")) transfers.push("appui-au-signal-de-livraison");
  for (const event of journal) {
    if (event.action === "workshop") transfers.push("ligature-observée-avec-yena");
    if (event.action === "kennel") transfers.push("consigne-du-chenil-avec-tov");
  }
  return { version: 1, ownerCreatedAt, race, journal, carriesPiece: done("begin") && !done("deliver"),
    resolved: postponed || choice !== null, success: !postponed && choice !== null, choice, observations, transfers };
}

function readRace(value: unknown): RaceWitnessO6 | null {
  if (!data(value) || (value.choice !== "lead" && value.choice !== "observe") || typeof value.success !== "boolean" ||
      typeof value.roundsLost !== "number" || !Number.isSafeInteger(value.roundsLost) || value.roundsLost < 0) return null;
  const connected = value.success ? value.choice === "lead" ? "yena" : "harek" : null;
  if (value.connected !== connected) return null;
  return { choice: value.choice, success: value.success, roundsLost: value.roundsLost, connected };
}

export function normalizeTownBellO6(raw: unknown): TownBellRecordO6 | null {
  if (!data(raw) || raw.version !== 1 || typeof raw.ownerCreatedAt !== "string" || !raw.ownerCreatedAt ||
      !Array.isArray(raw.journal) || raw.journal.length < 1 || raw.journal.length > 10) return null;
  const race = readRace(raw.race);
  if (!race) return null;
  const journal: TownBellEventO6[] = [];
  for (const row of raw.journal) {
    if (!data(row) || !isAction(row.action) || !nextFrom(journal).includes(row.action)) return null;
    const at = normalizeHomeworldCheckpointV77(row.at);
    if (!at || at.ownerCreatedAt !== raw.ownerCreatedAt) return null;
    journal.push({ action: row.action, at });
  }
  const active = describe(raw.ownerCreatedAt, race, journal);
  return active.carriesPiece === raw.carriesPiece && active.resolved === raw.resolved && active.success === raw.success &&
    active.choice === raw.choice && same(active.observations, raw.observations) && same(active.transfers, raw.transfers) ? active : null;
}

export function townBellMatchesSaveO6(save: SaveGame) {
  const record = save.originV151?.townBellO6;
  if (!record) return true;
  return record.ownerCreatedAt === save.createdAt && same(record.race, raceWitness(save));
}

export function recordTownBellOrderO6(save: SaveGame, action: TownBellActionO6, location: HomeworldCheckpointV77) {
  const source = raceWitness(save), prior = save.originV151?.townBellO6;
  const at = normalizeHomeworldCheckpointV77(location);
  if (!source || !townBellMatchesSaveO6(save) || !at || at.ownerCreatedAt !== save.createdAt ||
      !townBellActionsO6(save).includes(action)) return null;
  return describe(save.createdAt, source, [...(prior?.journal ?? []), { action, at }]);
}

export function keepsTownBellO6(previous: SaveGame, next: SaveGame) {
  const before = previous.originV151?.townBellO6, after = next.originV151?.townBellO6;
  if (!after) return !before;
  if (same(before, after)) return true;
  if (!townBellMatchesSaveO6(next) || after.journal.length !== (before?.journal.length ?? 0) + 1) return false;
  const last = after.journal.at(-1)!;
  return same(next.homeworld.locationV77, last.at) && same(recordTownBellOrderO6(previous, last.action, last.at), after);
}
