import type { SaveGame } from "../types";
import { applyFirstShockO6, firstShockDepartedO6, type FirstShockOrderO6, type FirstShockRecordO6 } from "./originFirstShockO6";
import { atCohortPlatformO6, COHORT_COURSE_O6, COHORT_RALLY_X_O6, COHORT_SIGNAL_WAIT_O6,
  simulateCohortJumpO6, type CohortJumpO6, type CohortPlatformO6 } from "./cohortRaceCourseO6";

const posts = { lead: 188, observe: 124 } as const;
type ChoiceO6 = keyof typeof posts;
export const COHORT_CHOICE_POSTS_O6 = posts;
type PartnerO6 = "yena" | "tov" | "harek";
type OpeningO6 = Pick<FirstShockRecordO6, "choice" | "success" | "assisted">;
type SignalO6 = { type: "signal"; x: number; elapsed: number };
type HelpO6 = { type: "help"; x: number };
type RoundEvent = CohortJumpO6 | SignalO6 | HelpO6;
type OutcomeO6 = "completed" | "partial" | null;
type ObservationO6 = "signal-yena" | "signal-tov" | "fall";
export type CohortRaceOrderO6 = RoundEvent | { type: "choose"; x: number; choice: ChoiceO6 } |
  { type: "retry"; x: number } | { type: "partial"; x: number };

export interface CohortRaceRecordO6 {
  version: 1;
  ownerCreatedAt: string;
  opening: OpeningO6;
  choice: ChoiceO6 | null;
  roundsLost: number;
  lastFall: RoundEvent[] | null;
  rally: boolean;
  round: RoundEvent[];
  outcome: OutcomeO6;
  resolved: boolean;
  success: boolean;
  observations: ObservationO6[];
  transfers: string[];
  relation: { partner: PartnerO6; gesture: string } | null;
}

const data = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const close = (x: number, target: number, radius: number) => Math.abs(x - target) <= radius;
const identical = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const signalZone = (x: unknown) => atCohortPlatformO6("upper", x) && close(x, COHORT_COURSE_O6.upper.launch, 20);
const rallyZone = (x: unknown) => atCohortPlatformO6("start", x) && close(x, COHORT_RALLY_X_O6, 27);
const finishZone = (x: unknown) => atCohortPlatformO6("finish", x) && close(x, COHORT_COURSE_O6.finish.launch, 31);

function sourceOpening(save: SaveGame) {
  const origin = save.originV151;
  const opening = origin?.firstShockO6;
  if (origin?.originId !== "O6" || origin.source !== "creation" || !opening?.resolved || !opening.choice ||
      !firstShockDepartedO6(opening) || save.prologue?.status !== "completed" ||
      save.prologue.checkpoint.cohortV172?.steps !== 7) return null;
  return { ownerCreatedAt: save.createdAt,
    opening: { choice: opening.choice, success: opening.success, assisted: opening.assisted } };
}

export function canStartCohortRaceO6(save: SaveGame) {
  const origin = save.originV151;
  return !!sourceOpening(save) && !origin?.cohortRaceO6 && !save.youthTraining && !origin?.continuationO6 &&
    !origin?.soloReturnO6 && !origin?.ending?.selectionVisited && !Object.values(origin?.transitions ?? {}).some(row => row.resolved);
}
function makeRecord(source: NonNullable<ReturnType<typeof sourceOpening>>): CohortRaceRecordO6 {
  return { version: 1, ...source, choice: null, roundsLost: 0, lastFall: null, rally: false, round: [],
    outcome: null, resolved: false, success: false, observations: [], transfers: [], relation: null };
}
export function startCohortRaceO6(save: SaveGame): SaveGame {
  const source = sourceOpening(save);
  const origin = save.originV151;
  if (!source || !origin || !canStartCohortRaceO6(save)) return save;
  return { ...save, originV151: { ...origin, cohortRaceO6: makeRecord(source) } };
}
/** The completed M01 return and the empty M02 record are committed in one save. */
export function advanceFirstShockIntoCohortO6(save: SaveGame, order: FirstShockOrderO6, x: number) {
  const result = applyFirstShockO6(save, order, x);
  if (!result || order !== "return-weapon") return result;
  const candidate = startCohortRaceO6(result.save);
  return cohortRaceMatchesSaveO6(candidate) ? { ...result, save: candidate } : null;
}
export function activeCohortRaceO6(save: SaveGame) {
  const record = save.originV151?.cohortRaceO6;
  return record && !record.resolved ? record : null;
}

export function cohortSignalPartnerO6(record: CohortRaceRecordO6): "tov" | "yena" {
  return record.opening.success ? "tov" : "yena";
}
export function cohortHelpPartnerO6(choice: ChoiceO6 | null): PartnerO6 {
  return choice === "lead" ? "yena" : "harek";
}

function trace(events: readonly RoundEvent[]) {
  let platform: CohortPlatformO6 = "start", x = COHORT_RALLY_X_O6, signalled = false, fell = false, helped = false;
  for (const event of events) {
    if (fell || helped) return null;
    if (event.type === "signal") {
      if (platform !== "upper" || signalled || !signalZone(event.x) ||
          !Number.isSafeInteger(event.elapsed) || event.elapsed < COHORT_SIGNAL_WAIT_O6) return null;
      x = event.x;
      signalled = true;
    } else if (event.type === "help") {
      if (platform !== "finish" || !finishZone(event.x)) return null;
      x = event.x;
      helped = true;
    } else {
      if (platform === "finish") return null;
      const result = simulateCohortJumpO6(platform, event, signalled, false);
      if (!result || result.outcome === "same") return null;
      x = result.x;
      platform = result.platform;
      fell = result.outcome === "fall";
    }
  }
  return { platform, x, signalled, fell, helped };
}

function derive(record: CohortRaceRecordO6): CohortRaceRecordO6 {
  const observations: ObservationO6[] = [];
  if (record.lastFall) observations.push("fall");
  if (record.round.some(x => x.type === "signal") || record.lastFall?.some(x => x.type === "signal")) {
    observations.push(`signal-${cohortSignalPartnerO6(record)}`);
  }
  const success = record.outcome === "completed";
  const partner = cohortHelpPartnerO6(record.choice);
  const gesture = partner === "yena" ? "stabiliser-le-nœud" : "montrer-l’appui";
  return { ...record, resolved: record.outcome !== null, success, observations,
    transfers: success ? ["franchissement-signal", gesture] : [], relation: success ? { partner, gesture } : null };
}

export function cohortRaceViewO6(record: CohortRaceRecordO6) {
  const current = trace(record.round);
  const stage = record.resolved ? "done" : !record.choice ? "choice" : record.rally ? "rally" : current?.platform ?? "start";
  const platform: CohortPlatformO6 = stage === "choice" || stage === "rally" || stage === "done" ? "start" : stage;
  return { stage, platform, resumeX: stage === "rally" || stage === "choice" ? COHORT_COURSE_O6.start.left + 12
    : current?.x ?? COHORT_RALLY_X_O6, signalled: current?.signalled === true,
    signalPartner: cohortSignalPartnerO6(record), helpPartner: cohortHelpPartnerO6(record.choice) };
}

export function mayWaitCohortSignalO6(record: CohortRaceRecordO6, x: number) {
  const view = cohortRaceViewO6(record);
  return view.stage === "upper" && !view.signalled && signalZone(x);
}
export function atCohortChoiceO6(x: number): ChoiceO6 | null {
  if (!atCohortPlatformO6("start", x)) return null;
  if (close(x, posts.lead, 16)) return "lead";
  return close(x, posts.observe, 16) ? "observe" : null;
}
export function atCohortRallyO6(x: number) { return rallyZone(x); }
export function atCohortHelpO6(x: number) { return finishZone(x); }

function readEvents(value: unknown): RoundEvent[] | null {
  if (!Array.isArray(value) || value.length > 5) return null;
  const events: RoundEvent[] = [];
  for (const raw of value) {
    if (!data(raw) || typeof raw.x !== "number" || !Number.isInteger(raw.x)) return null;
    if (raw.type === "jump" && (raw.direction === 1 || raw.direction === -1)) {
      events.push({ type: "jump", x: raw.x, direction: raw.direction });
    } else if (raw.type === "signal" && typeof raw.elapsed === "number") {
      events.push({ type: "signal", x: raw.x, elapsed: raw.elapsed });
    } else if (raw.type === "help") events.push({ type: "help", x: raw.x });
    else return null;
  }
  return events;
}

export function normalizeCohortRaceO6(raw: unknown): CohortRaceRecordO6 | null {
  if (!data(raw) || raw.version !== 1 || typeof raw.ownerCreatedAt !== "string" || !raw.ownerCreatedAt ||
      !data(raw.opening) || (raw.opening.choice !== "listen-harek" && raw.opening.choice !== "review-saar") ||
      typeof raw.opening.success !== "boolean" || typeof raw.opening.assisted !== "boolean" ||
      (raw.opening.choice === "listen-harek" && !raw.opening.success) ||
      (raw.choice !== null && raw.choice !== "lead" && raw.choice !== "observe") ||
      typeof raw.roundsLost !== "number" || !Number.isSafeInteger(raw.roundsLost) || raw.roundsLost < 0 || typeof raw.rally !== "boolean" ||
      (raw.outcome !== null && raw.outcome !== "completed" && raw.outcome !== "partial")) return null;
  const round = readEvents(raw.round);
  const failed = raw.lastFall === null ? null : readEvents(raw.lastFall);
  const current = round && trace(round);
  if (!round || !current || current.fell || (raw.roundsLost > 0 ? !failed || !trace(failed)?.fell : raw.lastFall !== null) ||
      (!raw.choice && (round.length || failed || raw.outcome || raw.rally)) ||
      (raw.rally && (!failed || round.length > 0)) ||
      (raw.outcome === "partial" && !raw.rally) || (raw.outcome === "completed") !== current.helped) return null;
  const result = derive({
    version: 1, ownerCreatedAt: raw.ownerCreatedAt,
    opening: { choice: raw.opening.choice, success: raw.opening.success, assisted: raw.opening.assisted },
    choice: raw.choice, roundsLost: raw.roundsLost, lastFall: failed, rally: raw.rally, round, outcome: raw.outcome,
    resolved: false, success: false, observations: [], transfers: [], relation: null,
  });
  return result.resolved === raw.resolved && result.success === raw.success && identical(result.observations, raw.observations) &&
    identical(result.transfers, raw.transfers) && identical(result.relation, raw.relation) ? result : null;
}

export function cohortRaceMatchesSaveO6(save: SaveGame) {
  const record = save.originV151?.cohortRaceO6;
  const firstShock = save.originV151?.firstShockO6;
  if (!record) return firstShock?.version !== 2 || !firstShockDepartedO6(firstShock);
  const source = sourceOpening(save);
  return source?.ownerCreatedAt === record.ownerCreatedAt && identical(record.opening, source.opening) &&
    (record.resolved || !save.youthTraining);
}

function play(record: CohortRaceRecordO6, order: CohortRaceOrderO6) {
  if (record.resolved || !Number.isInteger(order.x)) return null;
  const view = cohortRaceViewO6(record);
  if (order.type === "choose") {
    return view.stage === "choice" && atCohortChoiceO6(order.x) === order.choice
      ? derive({ ...record, choice: order.choice }) : null;
  }
  if (order.type === "retry" || order.type === "partial") {
    return view.stage === "rally" && rallyZone(order.x)
      ? derive({ ...record, rally: order.type === "partial", outcome: order.type === "partial" ? "partial" : null }) : null;
  }
  if (view.stage === "choice" || view.stage === "rally") return null;
  if (order.type === "jump") {
    const flight = simulateCohortJumpO6(view.platform, order, view.signalled, false);
    if (!flight || flight.outcome === "same" || view.stage === "finish") return null;
    if (flight.outcome === "fall") {
      return derive({ ...record, lastFall: [...record.round, order], roundsLost: record.roundsLost + 1, round: [], rally: true });
    }
  }
  const next = [...record.round, order];
  const result = trace(next);
  return result && !result.fell ? derive({ ...record, round: next, outcome: result.helped ? "completed" : null }) : null;
}

export function keepsCohortRaceO6(previous: SaveGame, next: SaveGame) {
  const before = previous.originV151?.cohortRaceO6, after = next.originV151?.cohortRaceO6;
  if (!before) return !after || !previous.youthTraining && identical(startCohortRaceO6({
    ...next, originV151: next.originV151 ? { ...next.originV151, cohortRaceO6: undefined } : null,
  }).originV151?.cohortRaceO6, after);
  if (!after || !cohortRaceMatchesSaveO6(next)) return false;
  if (identical(before, after)) return true;
  const meaningful = after.roundsLost > before.roundsLost ? after.lastFall?.at(-1) : after.round.at(-1);
  const order = !before.choice && after.choice ? { type: "choose" as const, x: posts[after.choice], choice: after.choice } :
    before.rally ? { type: after.outcome === "partial" ? "partial" as const : "retry" as const, x: COHORT_RALLY_X_O6 } : meaningful;
  return !!order && identical(play(before, order), after);
}

export function playCohortRaceO6(save: SaveGame, order: CohortRaceOrderO6): SaveGame | null {
  const origin = save.originV151;
  const before = activeCohortRaceO6(save);
  if (!origin || !before || !cohortRaceMatchesSaveO6(save)) return null;
  const result = play(before, order);
  return result ? { ...save, originV151: { ...origin, cohortRaceO6: result } } : null;
}
