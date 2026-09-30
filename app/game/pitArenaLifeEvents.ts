/** V54 workbook: 10_VIE_DES_STAGES rows206/263, columnsE/H/K; 16_REGLES row35.
 * This directs the six existing observer drawings. It adds no referee, hitbox or new animation art.
 */
export const PIT_DIRECTED_LIFE_ARENAS = [
  "arena-016-terrasse-des-jeunes-sangs",
  "arena-035-fosse-des-cent-masques",
] as const;

export interface PitArenaLifeEventContext {
  readonly round: number;
  /** Ticks since this round began; independent of render frequency and local wall time. */
  readonly roundFrame: number;
  readonly phase: "round" | "round-over" | "match-over";
  /** Round results use simulation ticks. The terminal result uses the existing, pausable presentation clock. */
  readonly resultElapsedFrames?: number;
}
export interface PitArenaLifeEventPose {
  readonly nativeFrame: number;
  readonly event: "rest" | "round-start" | "ambient" | "round-result";
}
const REST: PitArenaLifeEventPose = { nativeFrame: 0, event: "rest" };
const FRAME_TICKS = 20; // Existing native sheet: six distinct drawings at3fps, never a translated still.
const START_POSES = [0, 1, 0] as const;
const AMBIENT_POSES = [0, 1, 2, 3, 4, 5, 0] as const;
const RESULT_POSES = [2, 3, 4, 5, 0] as const;

function seedFor(arenaId: string, actorId: string, round: number): number {
  let seed = 2166136261;
  for (const character of `${arenaId}:${round}:${actorId}`) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  return seed;
}

/** A reproducible12–25second interval per venue, round and anonymous observer group. */
export function getPitArenaLifeEventTiming(arenaId: string, actorId: string, round: number) {
  const seed = seedFor(arenaId, actorId, round);
  return { intervalFrames: 720 + seed % 781, startDelayFrames: 8 + (seed >>> 8) % 20, resultDelayFrames: (seed >>> 16) % 12 };
}

function poseAt(elapsed: number, sequence: readonly number[], event: PitArenaLifeEventPose["event"]): PitArenaLifeEventPose {
  if (elapsed < 0 || elapsed >= sequence.length * FRAME_TICKS) return REST;
  return { nativeFrame: sequence[Math.floor(elapsed / FRAME_TICKS)], event };
}

/** Pure projection: seeking a replay or rendering twice cannot change the schedule or any combat state.
 * No hit, damage, fighter identity or winner input exists: the anonymous crowd never cheers every impact.
 * null preserves the historical loop in other explicitly authored casts (notably Ryushi).
 */
export function getPitArenaLifeEventPose(arenaId: string, actorId: string, context?: PitArenaLifeEventContext,
  reducedMotion = false): PitArenaLifeEventPose | null {
  if (!(PIT_DIRECTED_LIFE_ARENAS as readonly string[]).includes(arenaId)) return null;
  if (reducedMotion || !context || !Number.isInteger(context.round) || context.round < 1
    || !Number.isFinite(context.roundFrame) || context.roundFrame < 0) return REST;
  const timing = getPitArenaLifeEventTiming(arenaId, actorId, context.round);
  if (context.phase === "round-over" || context.phase === "match-over") {
    const elapsed = context.resultElapsedFrames;
    if (elapsed === undefined || !Number.isFinite(elapsed) || elapsed < 0) return REST;
    return poseAt(Math.floor(elapsed) - timing.resultDelayFrames, RESULT_POSES, "round-result");
  }
  if (context.phase !== "round") return REST;
  const frame = Math.floor(context.roundFrame);
  if (frame < timing.intervalFrames) return poseAt(frame - timing.startDelayFrames, START_POSES, "round-start");
  return poseAt(frame % timing.intervalFrames, AMBIENT_POSES, "ambient");
}
