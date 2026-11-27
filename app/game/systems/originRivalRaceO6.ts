import type { SaveGame } from "../types";
import { normalizeHomeworldCheckpointV77, type HomeworldCheckpointV77 } from "./homeworldCheckpointV77";
import { rivalWorkshopCheckpointO6 } from "./originRivalRacePlaceO6";
import { RIVAL_FLAG_O6, RIVAL_HAREK_POST_O6, RIVAL_LADDER_O6, RIVAL_ROOF_O6, rivalNearO6, simulateRivalJumpO6,
  type RivalChoiceO6, type RivalJumpO6, type RivalPlatformO6 } from "./rivalRaceCourseO6";

type TownWitnessO6 = { outcome: "visit" | "postpone"; firstVisit: "workshop" | "kennel" | null };
export type RivalRaceOrderO6 = RivalJumpO6 |
  { type: "observe" | "climb" | "finish"; x: number } |
  { type: "choose"; x: number; choice: RivalChoiceO6 };
type Stage = "observe" | "choice" | "cross" | "lower" | "flag" | "closed";
type RivalViewO6 = { stage: Stage; platform: RivalPlatformO6; x: number; beat: number; falls: number; choice: RivalChoiceO6 | null };

export interface RivalRaceRecordO6 {
  version: 1;
  ownerCreatedAt: string;
  town: TownWitnessO6;
  at: HomeworldCheckpointV77;
  journal: RivalRaceOrderO6[];
  resolved: boolean;
  success: boolean;
  choice: RivalChoiceO6 | null;
  observations: string[];
  transfers: string[];
  harek: "warning" | "lead" | "return" | null;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const isData = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const roofOpening: RivalViewO6 = { stage: "observe", platform: "start", x: 126, beat: 0, falls: 0, choice: null };

function townWitness(save: SaveGame): TownWitnessO6 | null {
  const origin = save.originV151;
  const town = origin?.townBellO6;
  if (origin?.originId !== "O6" || origin.source !== "creation" || !town?.resolved ||
      town.ownerCreatedAt !== save.createdAt || save.prologue?.status !== "completed" ||
      save.prologue.checkpoint.cohortV172?.steps !== 7) return null;
  const resolution = town.journal.find(row => row.action === "workshop" || row.action === "kennel" || row.action === "postpone");
  if (resolution?.action === "postpone" && !town.success) return { outcome: "postpone", firstVisit: null };
  if ((resolution?.action === "workshop" || resolution?.action === "kennel") && town.success) {
    return { outcome: "visit", firstVisit: resolution.action };
  }
  return null;
}

export function rivalRaceCanStartO6(save: SaveGame) {
  const origin = save.originV151;
  return Boolean(townWitness(save) && !origin?.rivalRaceO6 && !save.youthTraining && !origin?.ending?.selectionVisited &&
    !origin?.continuationO6 && !origin?.soloReturnO6 && !Object.values(origin?.transitions ?? {}).some(record => record.resolved));
}

function readOrder(raw: unknown): RivalRaceOrderO6 | null {
  if (!isData(raw) || typeof raw.x !== "number" || !Number.isInteger(raw.x)) return null;
  const type = raw.type, x = raw.x;
  if (type === "observe" || type === "climb" || type === "finish") return { type, x };
  if (type === "choose" && (raw.choice === "race" || raw.choice === "warn")) return { type, x, choice: raw.choice };
  if (type === "jump" && (raw.direction === -1 || raw.direction === 1) && typeof raw.beat === "number" &&
      Number.isInteger(raw.beat) && raw.beat >= 0 && raw.beat < RIVAL_ROOF_O6.cycle) {
    return { type, x, direction: raw.direction, beat: raw.beat };
  }
  return null;
}

function advance(view: RivalViewO6, order: RivalRaceOrderO6): RivalViewO6 | null {
  switch (order.type) {
    case "observe": return view.stage === "observe" && rivalNearO6(order.x, RIVAL_HAREK_POST_O6)
      ? { ...view, stage: "choice", x: order.x } : null;
    case "choose": return view.stage === "choice" && rivalNearO6(order.x, RIVAL_HAREK_POST_O6)
      ? { ...view, stage: "cross", x: order.x, choice: order.choice } : null;
    case "jump": {
      if (view.stage !== "cross" || !view.choice || view.platform === "lower" || view.platform === "flag") return null;
      const jump = simulateRivalJumpO6(view.platform, view.choice, order, false);
      if (!jump || jump.outcome === "same") return null;
      const platform = jump.platform;
      return { ...view, platform, x: jump.x, beat: jump.beat,
        falls: view.falls + Number(jump.outcome === "fall"),
        stage: platform === "lower" ? "lower" : platform === "flag" ? "flag" : "cross" };
    }
    case "climb": return view.stage === "lower" && rivalNearO6(order.x, RIVAL_LADDER_O6, 20)
      ? { ...view, stage: "flag", platform: "flag", x: RIVAL_LADDER_O6 } : null;
    case "finish": return view.stage === "flag" && rivalNearO6(order.x, RIVAL_FLAG_O6, 24)
      ? { ...view, stage: "closed", x: order.x } : null;
  }
}

function describe(ownerCreatedAt: string, town: TownWitnessO6, at: HomeworldCheckpointV77, journal: RivalRaceOrderO6[], view: RivalViewO6): RivalRaceRecordO6 {
  const observations = [town.outcome === "visit" ? "détour-de-la-ville-vécu" : "détour-de-la-ville-reporté"];
  if (journal.some(order => order.type === "observe")) observations.push("hésitation-de-harek-observée");
  if (view.falls > 0) observations.push("palier-inférieur-atteint");
  const transfers: string[] = [];
  if (view.choice === "warn") transfers.push("danger-signalé-à-harek");
  if (journal.some(order => order.type === "climb")) transfers.push("retour-au-fanion-par-le-palier");
  const resolved = view.stage === "closed", success = resolved && view.falls === 0;
  if (resolved) transfers.push("fanion-atteint");
  if (success && view.choice === "race") transfers.push("avantage-pris-au-fanion");
  const harek = resolved ? (view.choice === "warn" ? "warning" : success ? "lead" : "return") : null;
  return { version: 1, ownerCreatedAt, town, at, journal, resolved, success, choice: view.choice, observations, transfers, harek };
}

function replay(journal: readonly RivalRaceOrderO6[]) {
  let view = roofOpening;
  for (const order of journal) {
    const next = advance(view, order);
    if (!next) return null;
    view = next;
  }
  return view;
}

export function rivalRaceViewO6(record: RivalRaceRecordO6) {
  return replay(record.journal) ?? roofOpening;
}

export function beginRivalRaceO6(save: SaveGame, location: HomeworldCheckpointV77) {
  const town = townWitness(save), at = normalizeHomeworldCheckpointV77(location);
  if (!town || !rivalRaceCanStartO6(save) || !at || !rivalWorkshopCheckpointO6(at, save.createdAt)) return null;
  return describe(save.createdAt, town, at, [], roofOpening);
}

export function playRivalRaceO6(save: SaveGame, event: RivalRaceOrderO6): RivalRaceRecordO6 | null {
  const before = activeRivalRaceO6(save);
  const order = readOrder(event), view = before && order ? advance(rivalRaceViewO6(before), order) : null;
  return before && order && view ? describe(before.ownerCreatedAt, before.town, before.at, [...before.journal, order], view) : null;
}

export function normalizeRivalRaceO6(raw: unknown): RivalRaceRecordO6 | null {
  if (!isData(raw) || raw.version !== 1 || typeof raw.ownerCreatedAt !== "string" ||
      !Array.isArray(raw.journal) || raw.journal.length > 6 || !isData(raw.town)) return null;
  const firstVisit = raw.town.firstVisit;
  const town: TownWitnessO6 | null = raw.town.outcome === "visit" && (firstVisit === "workshop" || firstVisit === "kennel")
    ? { outcome: "visit", firstVisit }
    : raw.town.outcome === "postpone" && firstVisit === null ? { outcome: "postpone", firstVisit } : null;
  const at = normalizeHomeworldCheckpointV77(raw.at);
  if (!town || !at || !rivalWorkshopCheckpointO6(at, raw.ownerCreatedAt)) return null;
  const journal: RivalRaceOrderO6[] = [];
  for (const event of raw.journal) {
    const order = readOrder(event);
    if (!order) return null;
    journal.push(order);
  }
  const view = replay(journal);
  if (!view) return null;
  const record = describe(raw.ownerCreatedAt, town, at, journal, view);
  return record.resolved === raw.resolved && record.success === raw.success && record.choice === raw.choice &&
    record.harek === raw.harek && same(record.observations, raw.observations) && same(record.transfers, raw.transfers) ? record : null;
}

export function rivalRaceMatchesSaveO6(save: SaveGame) {
  const record = save.originV151?.rivalRaceO6;
  return !record || (record.ownerCreatedAt === save.createdAt && same(record.town, townWitness(save)) &&
    rivalWorkshopCheckpointO6(record.at, save.createdAt) &&
    (record.resolved || (!save.youthTraining && same(save.homeworld.locationV77, record.at))));
}

export function activeRivalRaceO6(save: SaveGame) {
  const record = save.originV151?.rivalRaceO6;
  return record && !record.resolved && rivalRaceMatchesSaveO6(save) ? record : null;
}

export function keepsRivalRaceO6(before: SaveGame, after: SaveGame) {
  const previous = before.originV151?.rivalRaceO6, next = after.originV151?.rivalRaceO6;
  if (!next) return !previous;
  if (!rivalRaceMatchesSaveO6(after)) return false;
  if (same(previous, next)) return true;
  if (!previous) return same(beginRivalRaceO6(before, next.at), next);
  if (!same(after.homeworld.locationV77, previous.at) || next.journal.length !== previous.journal.length + 1) return false;
  const order = next.journal.at(-1);
  return !!order && same(playRivalRaceO6(before, order), next);
}
