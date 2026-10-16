/** A UI phase consumes only active time. No timers, browser globals or save writes. */
export function createPhaseClockV94() {
  let phase: string | null = null, remaining = 0, started: number | null = null, sounded = false;
  const pause = (now: number) => {
    if (started !== null) remaining = Math.max(0, remaining - Math.max(0, now - started));
    started = null;
  };
  return {
    resume(nextPhase: string, durationMs: number, now: number) {
      pause(now);
      if (phase !== nextPhase) { phase = nextPhase; remaining = durationMs; sounded = false; }
      started = now;
      const playSound = !sounded; sounded = true;
      return {remainingMs: remaining, playSound};
    },
    pause,
    finish(expectedPhase: string): boolean {
      if (phase !== expectedPhase || started === null) return false;
      remaining = 0; started = null; return true;
    },
    reset() { phase = null; remaining = 0; started = null; sounded = false; },
  };
}
