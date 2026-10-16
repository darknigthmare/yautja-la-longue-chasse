/** A UI phase consumes only active time. Each scheduled callback owns a unique lease.
 * Re-entering the SAME phase must not revive a callback from an older timer. */
export function createPhaseClockV94() {
  let phase: string | null = null, remaining = 0, started: number | null = null, sounded = false;
  let token: symbol | null = null;
  const pause = (now: number) => {
    if (started !== null && Number.isFinite(now)) remaining = Math.max(0, remaining - Math.max(0, now - started));
    started = null; token = null;
  };
  return {
    resume(nextPhase: string, durationMs: number, now: number) {
      pause(now);
      if (phase !== nextPhase) {
        phase = nextPhase;
        remaining = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
        sounded = false;
      }
      started = Number.isFinite(now) ? now : 0;
      token = Symbol(nextPhase);
      const playSound = !sounded; sounded = true;
      return {remainingMs: remaining, playSound, token};
    },
    pause,
    finish(expectedPhase: string, expectedToken: symbol): boolean {
      if (phase !== expectedPhase || started === null || token !== expectedToken) return false;
      remaining = 0; started = null; token = null; return true;
    },
    reset() { phase = null; remaining = 0; started = null; sounded = false; token = null; },
  };
}
