/** A transform of an existing alpha image, never a new animation drawing. */
export interface PitArenaAmbientMotion {
  readonly kind: "drift-x";
  readonly amplitudePx: number;
  readonly periodFrames: number;
}

/** Simulation frames stop during pause; no wall clock or combat mutation is used. */
export function getPitArenaAmbientOffset(motion: PitArenaAmbientMotion | undefined, frame: number, reducedMotion = false): number {
  if (!motion || reducedMotion || motion.kind !== "drift-x" || !Number.isFinite(frame)
    || !Number.isFinite(motion.amplitudePx) || motion.amplitudePx < 0 || motion.amplitudePx > 24
    || !Number.isInteger(motion.periodFrames) || motion.periodFrames < 600 || motion.periodFrames > 3600) return 0;
  return Math.sin(Math.max(0, frame) % motion.periodFrames / motion.periodFrames * Math.PI * 2) * motion.amplitudePx;
}
