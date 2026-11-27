import { NURSERY_ARENA } from "./nurseryPrologue";

const floor = NURSERY_ARENA.groundY;
export const COHORT_COURSE_O6 = {
  start: { left: 96, right: 224, y: floor, launch: 165 },
  lower: { left: 267, right: 360, y: floor - 67, launch: 320 },
  upper: { left: 413, right: 524, y: floor - 136, launch: 493 },
  finish: { left: 650, right: 811, y: floor - 136, launch: 746 },
} as const;
export const COHORT_RALLY_X_O6 = 152;
export const COHORT_SIGNAL_WAIT_O6 = 920;
export type CohortPlatformO6 = keyof typeof COHORT_COURSE_O6;
export type CohortDirectionO6 = -1 | 1;
export type CohortJumpO6 = { type: "jump"; x: number; direction: CohortDirectionO6 };
type FrameO6 = { x: number; y: number };
const nextPlatform = { start: "lower", lower: "upper", upper: "finish", finish: null } as const;

export function atCohortPlatformO6(platform: CohortPlatformO6, x: unknown): x is number {
  return typeof x === "number" && Number.isInteger(x) &&
    x >= COHORT_COURSE_O6[platform].left && x <= COHORT_COURSE_O6[platform].right;
}
export function walkCohortPlatformO6(platform: CohortPlatformO6, x: number, direction: CohortDirectionO6) {
  const { left, right } = COHORT_COURSE_O6[platform];
  return Math.min(right, Math.max(left, x + direction * 12));
}

export function simulateCohortJumpO6(platform: CohortPlatformO6, jump: CohortJumpO6, signalled: boolean, drawFrames = true) {
  if (!atCohortPlatformO6(platform, jump.x) || (jump.direction !== 1 && jump.direction !== -1)) return null;
  const source = COHORT_COURSE_O6[platform];
  const target = nextPlatform[platform];
  let y: number = source.y;
  let velocity = -10.7;
  const frames: FrameO6[] = [];
  for (let tick = 1; tick <= 60; tick++) {
    const x = Math.max(NURSERY_ARENA.left, Math.min(NURSERY_ARENA.right, jump.x + jump.direction * tick * 5));
    const beforeY = y;
    velocity += NURSERY_ARENA.gravity;
    y += velocity;
    if (velocity >= 0) {
      const lands = (row: (typeof COHORT_COURSE_O6)[CohortPlatformO6]) =>
        beforeY <= row.y && y >= row.y && x >= row.left && x <= row.right;
      if (target && (target !== "finish" || signalled) && lands(COHORT_COURSE_O6[target])) {
        if (drawFrames) frames.push({ x, y: COHORT_COURSE_O6[target].y });
        return { outcome: "next" as const, platform: target, x, frames };
      }
      if (lands(source)) {
        if (drawFrames) frames.push({ x, y: source.y });
        return { outcome: "same" as const, platform, x, frames };
      }
      if (y >= floor) {
        if (drawFrames) frames.push({ x, y: floor });
        return { outcome: "fall" as const, platform: "start" as const, x, frames };
      }
    }
    if (drawFrames) frames.push({ x, y });
  }
  return null;
}
