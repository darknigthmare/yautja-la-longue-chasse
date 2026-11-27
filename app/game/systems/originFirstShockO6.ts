import type { SaveGame } from "../types";
import { NURSERY_COHORT_STOPS } from "./nurseryCohortV172";
import { nurseryOpeningNetX } from "./nurseryOpening";

const orders = ["retrieve", "reach-harek", "hear-harek", "choose-saar", "test-brace", "postpone", "return-weapon"] as const;
export type FirstShockOrderO6 = typeof orders[number];
type EventO6 = { order: FirstShockOrderO6; x: number };
type ChoiceO6 = "listen-harek" | "review-saar";
type ObservationO6 = "harek-cohort" | "harek-assistance";
type TransferO6 = "harek-lesson" | "saar-brace";
export interface FirstShockRecordO6 {
  version: 1;
  ownerCreatedAt: string;
  netX: number;
  assisted: boolean;
  journal: EventO6[];
  resolved: boolean;
  success: boolean;
  choice: ChoiceO6 | null;
  observations: ObservationO6[];
  transfers: TransferO6[];
}

const minX = 336;
const maxX = 876;
export const FIRST_SHOCK_HAREK_O6 = NURSERY_COHORT_STOPS[2].x;
const position = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x) && x >= minX && x <= maxX;
const near = (x: number, target: number, radius = 28) => Math.abs(x - target) <= radius;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isOrder = (v: unknown): v is FirstShockOrderO6 => orders.some(order => order === v);

function firstShockFoundation(save: SaveGame) {
  const origin = save.originV151;
  const opening = save.prologue?.checkpoint.opening;
  if (origin?.originId !== "O6" || origin.source !== "creation" || save.prologue?.status !== "completed" ||
      save.prologue.checkpoint.cohortV172?.steps !== 7 || !opening?.openingResolved ||
      !save.prologue.chronicle.evidence.some(item => item.id === "intro-completed")) return null;
  return { ownerCreatedAt: save.createdAt, netX: nurseryOpeningNetX(opening), assisted: !opening.openingSuccess };
}

function initialRecord(foundation: NonNullable<ReturnType<typeof firstShockFoundation>>): FirstShockRecordO6 {
  return { version: 1, ...foundation, journal: [], resolved: false, success: false, choice: null, observations: [], transfers: [] };
}
function seen(record: FirstShockRecordO6, order: FirstShockOrderO6) {
  return record.journal.some(event => event.order === order);
}
export function firstShockDepartedO6(record: FirstShockRecordO6) {
  return seen(record, "return-weapon");
}
export function firstShockActiveO6(save: SaveGame) {
  const record = save.originV151?.firstShockO6;
  return record && !firstShockDepartedO6(record) ? record : null;
}

export function startFirstShockO6(save: SaveGame): SaveGame {
  const foundation = firstShockFoundation(save);
  const origin = save.originV151;
  if (!foundation || !origin || origin.firstShockO6 || origin.continuationO6 || origin.soloReturnO6 ||
      origin.ending?.selectionVisited || Object.values(origin.transitions).some(record => record.resolved) || save.youthTraining) return save;
  return { ...save, originV151: { ...origin, firstShockO6: initialRecord(foundation) } };
}

export function firstShockBraceX(record: FirstShockRecordO6) {
  return record.netX - 19;
}
export function firstShockResumeX(record: FirstShockRecordO6) {
  if (!seen(record, "retrieve") || record.choice === "review-saar") return record.netX - 56;
  return seen(record, "reach-harek") ? FIRST_SHOCK_HAREK_O6 : record.journal[0].x;
}
export function moveFirstShockO6(x: number, direction: -1 | 1, distance = 12) {
  return Math.max(minX, Math.min(maxX, x + direction * distance));
}
export function firstShockCourtO6(record: FirstShockRecordO6, x: number) {
  const stage = firstShockDepartedO6(record) ? "departed" : record.resolved ? "return"
    : record.choice === "review-saar" ? "drill" : seen(record, "reach-harek") ? "choice"
      : seen(record, "retrieve") ? "escort" : "retrieve";
  const harek = FIRST_SHOCK_HAREK_O6;
  const net = record.netX;
  const choosing = stage === "choice";
  const saarX = stage === "escort" ? Math.max(harek + 58, Math.min(net + 28, x - 45))
    : choosing ? harek + 58 : net + 28;
  const targetX = stage === "escort" || choosing ? harek : stage === "drill" ? firstShockBraceX(record) : net;
  return { stage, saarX, targetX, held: seen(record, "retrieve") && !firstShockDepartedO6(record),
    missed: record.journal.some(event => event.order === "test-brace" && !near(event.x, firstShockBraceX(record), 11)) };
}

export function firstShockOptionsO6(record: FirstShockRecordO6, x: number): FirstShockOrderO6[] {
  if (!position(x)) return [];
  const court = firstShockCourtO6(record, x);
  switch (court.stage) {
    case "retrieve": return near(x, record.netX) ? ["retrieve"] : [];
    case "escort": return near(x, FIRST_SHOCK_HAREK_O6) ? ["reach-harek"] : [];
    case "choice": return near(x, FIRST_SHOCK_HAREK_O6) ? ["hear-harek", "choose-saar"] : [];
    case "drill": return near(x, record.netX, 48) ? court.missed ? ["test-brace", "postpone"] : ["test-brace"] : [];
    case "return": return near(x, record.netX) ? ["return-weapon"] : [];
    default: return [];
  }
}

function applyEvent(record: FirstShockRecordO6, event: EventO6) {
  if (!firstShockOptionsO6(record, event.x).includes(event.order)) return null;
  const missed = event.order === "test-brace" && !near(event.x, firstShockBraceX(record), 11);
  if (missed && firstShockCourtO6(record, event.x).missed) return record;
  const next = { ...record, journal: [...record.journal, event] };
  switch (event.order) {
    case "reach-harek":
      next.observations = [next.assisted ? "harek-assistance" : "harek-cohort"];
      break;
    case "hear-harek":
      next.choice = "listen-harek"; next.resolved = true; next.success = true; next.transfers = ["harek-lesson"];
      break;
    case "choose-saar":
      next.choice = "review-saar";
      break;
    case "test-brace":
      if (!missed) { next.resolved = true; next.success = true; next.transfers = ["saar-brace"]; }
      break;
    case "postpone":
      next.resolved = true;
      break;
  }
  return next;
}

export function normalizeFirstShockO6(raw: unknown): FirstShockRecordO6 | null {
  if (!isRecord(raw) || raw.version !== 1 || typeof raw.ownerCreatedAt !== "string" || !raw.ownerCreatedAt ||
      !position(raw.netX) || typeof raw.assisted !== "boolean" ||
      !Array.isArray(raw.journal) || raw.journal.length > 6) return null;
  let record = initialRecord({ ownerCreatedAt: raw.ownerCreatedAt, netX: raw.netX, assisted: raw.assisted });
  for (const event of raw.journal) {
    if (!isRecord(event) || !isOrder(event.order) || !position(event.x)) return null;
    const next = applyEvent(record, { order: event.order, x: event.x });
    if (!next || next === record) return null;
    record = next;
  }
  if (raw.resolved !== record.resolved || raw.success !== record.success || raw.choice !== record.choice ||
      JSON.stringify(raw.observations) !== JSON.stringify(record.observations) ||
      JSON.stringify(raw.transfers) !== JSON.stringify(record.transfers)) return null;
  return record;
}

export function firstShockMatchesSaveO6(save: SaveGame) {
  const record = save.originV151?.firstShockO6;
  if (!record) return true;
  const foundation = firstShockFoundation(save);
  return foundation?.ownerCreatedAt === record.ownerCreatedAt && foundation.netX === record.netX &&
    foundation.assisted === record.assisted;
}

export function keepsFirstShockO6(previous: SaveGame, requested: SaveGame) {
  const before = previous.originV151?.firstShockO6;
  const after = requested.originV151?.firstShockO6;
  if (!before) {
    if (!after) return true;
    const completed = previous.prologue?.status === "active" && requested.prologue?.status === "completed";
    return completed && firstShockMatchesSaveO6(requested) && after.journal.length === 0;
  }
  if (!after || !firstShockMatchesSaveO6(requested) || before.ownerCreatedAt !== after.ownerCreatedAt ||
      before.netX !== after.netX || before.assisted !== after.assisted ||
      after.journal.length < before.journal.length || after.journal.length > before.journal.length + 1) return false;
  return before.journal.every((event, i) => after.journal[i].order === event.order && after.journal[i].x === event.x);
}

export function applyFirstShockO6(save: SaveGame, order: FirstShockOrderO6, x: number) {
  const origin = save.originV151;
  const record = firstShockActiveO6(save);
  if (!origin || !record || !firstShockMatchesSaveO6(save)) return null;
  const next = applyEvent(record, { order, x });
  if (!next) return null;
  return { retryAt: order === "test-brace" && !next.success ? record.netX - 56 : null,
    save: next === record ? save : { ...save, originV151: { ...origin, firstShockO6: next } } };
}
