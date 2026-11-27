import type { SaveGame } from "../types";
import { normalizeHomeworldCheckpointV77, type HomeworldCheckpointV77 } from "./homeworldCheckpointV77";
import { rivalWorkshopCheckpointO6 } from "./originRivalRacePlaceO6";
import { LITTLE_TRAIL_O6, LITTLE_TRAIL_OPENING_O6, littleTrailOrdersAtO6, type LittleTrailOrderO6,
  type LittleTrailReportO6, type LittleTrailViewO6 } from "./littleTrailRouteO6";

type RivalWitnessO6 = { success: boolean; choice: "race" | "warn"; memory: "lead" | "warning" | "return" };

export interface LittleTrailRecordO6 {
  version: 1;
  ownerCreatedAt: string;
  rival: RivalWitnessO6;
  at: HomeworldCheckpointV77;
  journal: LittleTrailOrderO6[];
  resolved: boolean;
  success: boolean;
  choice: LittleTrailReportO6 | null;
  lastConfirmed: { point: "first" | "far"; x: number } | null;
  observations: string[];
  transfers: string[];
}

const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const data = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

function rivalWitness(save: SaveGame): RivalWitnessO6 | null {
  const origin = save.originV151, race = origin?.rivalRaceO6;
  if (origin?.originId !== "O6" || origin.source !== "creation" || !race?.resolved ||
      !race.choice || !race.harek || race.ownerCreatedAt !== save.createdAt ||
      save.prologue?.status !== "completed" || save.prologue.checkpoint.cohortV172?.steps !== 7) return null;
  return { success: race.success, choice: race.choice, memory: race.harek };
}

function beforeLaterProgressO6(save: SaveGame) {
  const origin = save.originV151;
  return !save.youthTraining && !origin?.ending?.selectionVisited && !origin?.continuationO6 && !origin?.soloReturnO6 &&
    !Object.values(origin?.transitions ?? {}).some(record => record.resolved);
}

export function littleTrailCanStartO6(save: SaveGame) {
  return Boolean(rivalWitness(save) && !save.originV151?.littleTrailO6 && beforeLaterProgressO6(save));
}

function readOrder(raw: unknown): LittleTrailOrderO6 | null {
  if (!data(raw) || typeof raw.x !== "number" || !Number.isInteger(raw.x) ||
      (raw.plane !== "trail" && raw.plane !== "overlook")) return null;
  const type = raw.type, x = raw.x, plane = raw.plane;
  if (type === "observe" || type === "lose" || type === "scan-anchor" || type === "scan-old" ||
      type === "ascend" || type === "compare") return { type, x, plane };
  if ((type === "sample" || type === "identify") && (raw.cue === "pebble" || raw.cue === "rub")) return { type, cue: raw.cue, x, plane };
  if (type === "report" && (raw.choice === "map" || raw.choice === "behavior")) return { type, choice: raw.choice, x, plane };
  return null;
}

function turn(view: LittleTrailViewO6, order: LittleTrailOrderO6): LittleTrailViewO6 | null {
  if (!littleTrailOrdersAtO6(view, order.x).some(candidate => equal(candidate, order))) return null;
  const current = { ...view, x: order.x };
  switch (order.type) {
    case "observe": return { ...current, stage: view.stage === "first" ? "listen" : "rise",
      lastConfirmed: view.stage === "first" ? "first" : "far" };
    case "lose": return { ...current, stage: "search-anchor", loss: "startled" };
    case "sample": return { ...current, heard: [...view.heard, order.cue] };
    case "identify": return order.cue === "rub" ? { ...current, stage: "far" } :
      { ...current, stage: "search-anchor", loss: "decoy" };
    case "scan-anchor": return { ...current, stage: "search-old" };
    case "scan-old": return { ...current, stage: "rise" };
    case "ascend": return { ...current, stage: "return", plane: "overlook", x: LITTLE_TRAIL_O6.climb };
    case "compare": return { ...current, stage: "report" };
    case "report": return { ...current, stage: "closed", choice: order.choice };
  }
}

function replay(journal: LittleTrailOrderO6[]) {
  let view = LITTLE_TRAIL_OPENING_O6;
  for (const order of journal) {
    const next = turn(view, order);
    if (!next) return null;
    view = next;
  }
  return view;
}

export function littleTrailViewO6(record: LittleTrailRecordO6) {
  return replay(record.journal) ?? LITTLE_TRAIL_OPENING_O6;
}

function describe(ownerCreatedAt: string, rival: RivalWitnessO6, at: HomeworldCheckpointV77, journal: LittleTrailOrderO6[], view: LittleTrailViewO6): LittleTrailRecordO6 {
  const observations: string[] = [];
  const transfers: string[] = [];
  let watched = 0;
  for (const event of journal) {
    switch (event.type) {
      case "observe": observations.push(watched++ === 0 ? "arrêt-au-talus-observé" : "arrêt-près-du-tronc-observé"); break;
      case "sample": observations.push(event.cue === "pebble" ? "chute-de-gravillon-écoutée" : "frottement-sur-écorce-écouté"); break;
      case "identify": observations.push(event.cue === "rub" ? "frottement-authentifié" : "bruit-trompeur-suivi"); break;
      case "lose": observations.push("proie-aperçue-en-fuite"); break;
      case "scan-anchor": observations.push(view.lastConfirmed ? "dernier-lieu-confirmé-relu" : "trace-à-lisière-relevée"); break;
      case "scan-old": observations.push("empreintes-anciennes-reconnues"); break;
      case "ascend": observations.push("retour-par-le-surplomb"); break;
      case "compare": observations.push("observations-de-la-cohorte-comparées"); break;
      case "report": transfers.push(event.choice === "map" ? "relevé-de-piste" : "lecture-du-comportement"); break;
    }
  }
  const lastConfirmed = view.lastConfirmed ? { point: view.lastConfirmed, x: LITTLE_TRAIL_O6[view.lastConfirmed] } : null;
  const resolved = view.stage === "closed", success = resolved && view.loss === null && watched === 2;
  return { version: 1, ownerCreatedAt, rival, at, journal, resolved, success, choice: view.choice, lastConfirmed, observations, transfers };
}

export function beginLittleTrailO6(save: SaveGame, checkpoint: HomeworldCheckpointV77) {
  const rival = rivalWitness(save), at = normalizeHomeworldCheckpointV77(checkpoint);
  if (!rival || !littleTrailCanStartO6(save) || !at || !rivalWorkshopCheckpointO6(at, save.createdAt)) return null;
  return describe(save.createdAt, rival, at, [], LITTLE_TRAIL_OPENING_O6);
}

export function playLittleTrailO6(save: SaveGame, event: LittleTrailOrderO6) {
  const prior = activeLittleTrailO6(save), order = readOrder(event);
  if (!prior || !order) return null;
  const view = turn(littleTrailViewO6(prior), order);
  return view ? describe(prior.ownerCreatedAt, prior.rival, prior.at, [...prior.journal, order], view) : null;
}

export function normalizeLittleTrailO6(raw: unknown): LittleTrailRecordO6 | null {
  if (!data(raw) || raw.version !== 1 || typeof raw.ownerCreatedAt !== "string" ||
      !Array.isArray(raw.journal) || raw.journal.length > 10 || !data(raw.rival)) return null;
  const { success, choice, memory } = raw.rival;
  if (typeof success !== "boolean" || (choice !== "race" && choice !== "warn")) return null;
  const expectedMemory = choice === "warn" ? "warning" : success ? "lead" : "return";
  if (memory !== expectedMemory) return null;
  const at = normalizeHomeworldCheckpointV77(raw.at);
  if (!at || !rivalWorkshopCheckpointO6(at, raw.ownerCreatedAt)) return null;
  const journal: LittleTrailOrderO6[] = [];
  for (const row of raw.journal) {
    const order = readOrder(row);
    if (!order) return null;
    journal.push(order);
  }
  const view = replay(journal);
  if (!view) return null;
  const result = describe(raw.ownerCreatedAt, { success, choice, memory: expectedMemory }, at, journal, view);
  return result.resolved === raw.resolved && result.success === raw.success && result.choice === raw.choice &&
    equal(result.lastConfirmed, raw.lastConfirmed) && equal(result.observations, raw.observations) &&
    equal(result.transfers, raw.transfers) ? result : null;
}

export function littleTrailMatchesSaveO6(save: SaveGame) {
  const record = save.originV151?.littleTrailO6;
  return !record || (record.ownerCreatedAt === save.createdAt && equal(record.rival, rivalWitness(save)) &&
    rivalWorkshopCheckpointO6(record.at, save.createdAt) &&
    (record.resolved || (beforeLaterProgressO6(save) && equal(save.homeworld.locationV77, record.at))));
}

export function activeLittleTrailO6(save: SaveGame) {
  const record = save.originV151?.littleTrailO6;
  return record && !record.resolved && littleTrailMatchesSaveO6(save) ? record : null;
}

export function keepsLittleTrailO6(previous: SaveGame, requested: SaveGame) {
  const before = previous.originV151?.littleTrailO6, after = requested.originV151?.littleTrailO6;
  if (!after) return !before;
  if (!littleTrailMatchesSaveO6(requested)) return false;
  if (equal(before, after)) return true;
  if (!before) return equal(beginLittleTrailO6(previous, after.at), after);
  const last = after.journal.at(-1);
  return !!last && after.journal.length === before.journal.length + 1 && equal(requested.homeworld.locationV77, before.at) &&
    equal(playLittleTrailO6(previous, last), after);
}
