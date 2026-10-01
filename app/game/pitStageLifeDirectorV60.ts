import type { PitArenaLifeEventContext } from "./pitArenaLifeEvents";
import type { PitStageLifeStageV60 } from "./pitStageLifeV60";
import { pitStageLifeKeyV66 } from "./pitStageLifeLaunchV66";

export interface PitStageLifePoseV60 {
  readonly eventId: string;
  readonly nativeFrame: number;
  readonly active: boolean;
  readonly cycle: number;
  readonly occurrence: number;
}

export const PIT_STAGE_LIFE_CYCLE_V60 = 3330;
const PERMUTATIONS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]] as const;
function hash(text: string): number {
  let value = 2166136261;
  for (const character of text) value = Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0;
  return value;
}
function rawBag(stageId: string, round: number, cycle: number): number[] {
  return [...PERMUTATIONS[hash(`${stageId}:${round}:${cycle}:bag`) % PERMUTATIONS.length]];
}

/** Each bag contains all three native events. The last member stays untouched so seeking needs no history. */
export function getPitStageLifeBagV60(stageId: string, round: number, cycle: number, launchSeed?: number): readonly number[] {
  stageId = pitStageLifeKeyV66(stageId, launchSeed);
  const bag = rawBag(stageId, round, cycle);
  if (cycle > 0 && bag[0] === rawBag(stageId, round, cycle - 1)[2]) [bag[0], bag[1]] = [bag[1], bag[0]];
  return bag;
}

/** Three gaps are bounded to12.5–24.5seconds, and sum to a constant55.5second block. */
export function getPitStageLifeScheduleV60(stageId: string, round: number, cycle: number, launchSeed?: number) {
  stageId = pitStageLifeKeyV66(stageId, launchSeed);
  const seed = hash(`${stageId}:${round}:${cycle}:timing`);
  const a = seed % 361 - 180;
  const b = (seed >>> 12) % 361 - 180;
  const starts = [0, 1110 + a, 2220 + a + b] as const;
  return {
    firstDelay: launchSeed ? 180 + hash(`${stageId}:${round}:first`) % 181 : 720 + hash(`${stageId}:${round}:first`) % 781,
    starts,
    gaps: [starts[1], starts[2] - starts[1], PIT_STAGE_LIFE_CYCLE_V60 - starts[2]] as const,
    bag: getPitStageLifeBagV60(stageId, round, cycle),
  };
}

/** Presentation only: no wall clock, random stream, damage, fighter identity or persistent mutation. */
export function getPitStageLifePosesV60(stage: PitStageLifeStageV60, context?: PitArenaLifeEventContext,
  reducedMotion = false): readonly PitStageLifePoseV60[] {
  const rest = () => stage.events.map(event => ({ eventId: event.id, nativeFrame: reducedMotion ? event.reducedMotionFrame : event.restFrame,
    active: false, cycle: -1, occurrence: -1 }));
  if (reducedMotion || !context || context.phase !== "round" || !Number.isInteger(context.round) || context.round < 1
    || !Number.isSafeInteger(context.roundFrame) || context.roundFrame < 0) return rest();
  const firstDelay = getPitStageLifeScheduleV60(stage.stageId, context.round, 0, context.launchSeed).firstDelay;
  const elapsed = context.roundFrame - firstDelay;
  if (elapsed < 0) return rest();
  const cycle = Math.floor(elapsed / PIT_STAGE_LIFE_CYCLE_V60);
  const clock = elapsed % PIT_STAGE_LIFE_CYCLE_V60;
  const schedule = getPitStageLifeScheduleV60(stage.stageId, context.round, cycle, context.launchSeed);
  const occurrence = clock >= schedule.starts[2] ? 2 : clock >= schedule.starts[1] ? 1 : 0;
  const selected = schedule.bag[occurrence];
  const event = stage.events[selected];
  const frame = Math.floor((clock - schedule.starts[occurrence]) * event.fps / 60);
  return stage.events.map((candidate, index) => ({ eventId: candidate.id,
    nativeFrame: index === selected && frame < event.frames.length ? frame : candidate.restFrame,
    active: index === selected && frame < event.frames.length, cycle, occurrence,
  }));
}
