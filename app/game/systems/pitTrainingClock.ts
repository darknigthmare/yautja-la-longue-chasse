import { PIT_TICK_RATE } from "./pitCombat";

export interface PitTrainingClock {
  readonly paused: boolean;
  readonly remainderMs: number;
  readonly pendingTicks: number;
}

export function createPitTrainingClock(paused = false): PitTrainingClock {
  return { paused, remainderMs: 0, pendingTicks: 0 };
}

/** Changing transport discards wall time and pending clicks, never combat state. */
export function pausePitTrainingClock(clock: PitTrainingClock, paused: boolean): PitTrainingClock {
  return clock.paused === paused ? clock : createPitTrainingClock(paused);
}

export function requestPitTrainingTick(clock: PitTrainingClock): PitTrainingClock {
  return clock.paused ? { ...clock, pendingTicks: clock.pendingTicks + 1 } : clock;
}

/** A frozen clock consumes only explicit clicks; RAF delays cannot become catch-up ticks. */
export function advancePitTrainingClock(
  clock: PitTrainingClock,
  elapsedMs: number,
): { clock: PitTrainingClock; ticks: number } {
  if (clock.paused) {
    return { clock: { ...clock, pendingTicks: 0, remainderMs: 0 }, ticks: clock.pendingTicks };
  }
  const total = clock.remainderMs + (Number.isFinite(elapsedMs) ? Math.min(250, Math.max(0, elapsedMs)) : 0);
  const step = 1_000 / PIT_TICK_RATE;
  const ticks = Math.floor((total + 1e-8) / step);
  return { clock: { ...clock, remainderMs: Math.max(0, total - ticks * step), pendingTicks: 0 }, ticks };
}
