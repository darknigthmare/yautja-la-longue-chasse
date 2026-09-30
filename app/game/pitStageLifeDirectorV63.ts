import type { PitArenaLifeEventContext } from "./pitArenaLifeEvents";
import type { PitStageLifeStageV63 } from "./pitStageLifeV63";
import type { PitStageLifePoseV60 } from "./pitStageLifeDirectorV60";

function hash(text: string): number { let value = 2166136261; for (const c of text) value = Math.imul(value ^ c.charCodeAt(0), 16777619) >>> 0; return value; }
function rawBag(stageId: string, round: number, cycle: number, count: number): number[] {
  const bag = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) { const j = hash(`${stageId}:${round}:${cycle}:${i}:v63`) % (i + 1); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  return bag;
}
/** A complete 3–6 event bag, bounded gaps, no consecutive repetition across cycles, no persistent RNG. */
export function getPitStageLifeScheduleV63(stageId: string, round: number, cycle: number, count: number) {
  if (!Number.isInteger(count) || count < 3 || count > 6) throw new Error("Invalid V63 event count");
  const bag = rawBag(stageId, round, cycle, count);
  if (cycle > 0 && bag[0] === rawBag(stageId, round, cycle - 1, count)[count - 1]) [bag[0], bag[1]] = [bag[1], bag[0]];
  const starts = bag.map((_, i) => i === 0 ? 0 : i * 555 + hash(`${stageId}:${round}:${cycle}:${i}:timing`) % 121 - 60);
  const cycleFrames = count * 555;
  return { firstDelay: 720 + hash(`${stageId}:${round}:first:v63`) % 331, starts,
    gaps: starts.map((start, i) => (starts[i + 1] ?? cycleFrames) - start), bag, cycleFrames };
}
export function getPitStageLifePosesV63(stage: PitStageLifeStageV63, context?: PitArenaLifeEventContext, reducedMotion = false): readonly PitStageLifePoseV60[] {
  const rest = () => stage.events.map(event => ({ eventId: event.id, nativeFrame: reducedMotion ? event.reducedMotionFrame : event.restFrame, active: false, cycle: -1, occurrence: -1 }));
  if (reducedMotion || !context || context.phase !== "round" || !Number.isInteger(context.round) || context.round < 1 || !Number.isSafeInteger(context.roundFrame) || context.roundFrame < 0) return rest();
  const first = getPitStageLifeScheduleV63(stage.stageId, context.round, 0, stage.events.length), elapsed = context.roundFrame - first.firstDelay;
  if (elapsed < 0) return rest();
  const cycle = Math.floor(elapsed / first.cycleFrames), clock = elapsed % first.cycleFrames;
  const schedule = getPitStageLifeScheduleV63(stage.stageId, context.round, cycle, stage.events.length);
  let occurrence = 0; for (let i = 1; i < schedule.starts.length; i++) if (clock >= schedule.starts[i]) occurrence = i;
  const selected = schedule.bag[occurrence], event = stage.events[selected], frame = Math.floor((clock - schedule.starts[occurrence]) * event.fps / 60);
  return stage.events.map((candidate, i) => ({ eventId: candidate.id, nativeFrame: i === selected && frame < event.frames.length ? frame : candidate.restFrame,
    active: i === selected && frame < event.frames.length, cycle, occurrence }));
}
