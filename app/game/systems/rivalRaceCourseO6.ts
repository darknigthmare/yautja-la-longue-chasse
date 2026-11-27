export const RIVAL_ROOF_O6 = { width: 900, height: 430, cycle: 120 } as const;

export const RIVAL_SUPPORTS_O6 = {
  start: { left: 68, right: 245, y: 220 },
  beam: { left: 320, right: 425, y: 199 },
  bridgeA: { left: 282, right: 437, y: 274 },
  bridgeB: { left: 475, right: 619, y: 255 },
  flag: { left: 550, right: 845, y: 225 },
  lower: { left: 74, right: 879, y: 370 },
} as const;
export const RIVAL_HAREK_POST_O6 = 210;
export const RIVAL_LADDER_O6 = 757;
export const RIVAL_FLAG_O6 = 795;

export type RivalPlatformO6 = keyof typeof RIVAL_SUPPORTS_O6;
export type RivalTravelPlatformO6 = Exclude<RivalPlatformO6, "lower" | "flag">;
export type RivalChoiceO6 = "race" | "warn";
export type RivalDirectionO6 = -1 | 1;
export type RivalJumpO6 = { type: "jump"; x: number; direction: RivalDirectionO6; beat: number };
export type RivalFrameO6 = { x: number; y: number; beat: number };

export function rivalBeamShiftO6(beat: number) {
  return Math.round(46 * Math.sin(beat / RIVAL_ROOF_O6.cycle * Math.PI * 2));
}

export function rivalPoseO6(platform: RivalPlatformO6, x: number, beat: number): RivalFrameO6 {
  return { x: x + (platform === "beam" ? rivalBeamShiftO6(beat) : 0), y: RIVAL_SUPPORTS_O6[platform].y, beat };
}

export function rivalOnSupportO6(platform: RivalPlatformO6, x: unknown): x is number {
  const { left, right } = RIVAL_SUPPORTS_O6[platform];
  return typeof x === "number" && Number.isInteger(x) && x >= left && x <= right;
}

export function rivalWalkO6(platform: RivalPlatformO6, x: number, direction: RivalDirectionO6) {
  const { left, right } = RIVAL_SUPPORTS_O6[platform];
  return Math.min(right, Math.max(left, x + direction * 12));
}

export function rivalNearO6(x: unknown, point: number, reach = 18): x is number {
  return typeof x === "number" && Number.isInteger(x) && Math.abs(x - point) <= reach;
}

export function rivalNextSupportO6(platform: RivalTravelPlatformO6, choice: RivalChoiceO6) {
  if (platform === "start") return choice === "race" ? "beam" : "bridgeA";
  return platform === "bridgeA" ? "bridgeB" : "flag";
}

export function simulateRivalJumpO6(platform: RivalTravelPlatformO6, choice: RivalChoiceO6, order: RivalJumpO6, draw = true) {
  if (!rivalOnSupportO6(platform, order.x) || (order.direction !== 1 && order.direction !== -1) ||
      !Number.isInteger(order.beat) || order.beat < 0 || order.beat >= RIVAL_ROOF_O6.cycle) return null;
  const travel = rivalNextSupportO6(platform, choice);
  const source = rivalPoseO6(platform, order.x, order.beat);
  const frames: RivalFrameO6[] = [];
  let y = source.y, velocity = -11.5;
  for (let tick = 1; tick <= 64; tick++) {
    const beat = (order.beat + tick) % RIVAL_ROOF_O6.cycle;
    const lower = RIVAL_SUPPORTS_O6.lower;
    const x = Math.max(lower.left, Math.min(lower.right, source.x + order.direction * tick * 7));
    const before = y;
    velocity += .9;
    y += velocity;
    if (velocity >= 0) {
      for (const [surface, outcome] of [[travel, "land"], [platform, "same"], ["lower", "fall"]] as const) {
        const local = x - (surface === "beam" ? rivalBeamShiftO6(beat) : 0);
        const altitude = RIVAL_SUPPORTS_O6[surface].y;
        if (before <= altitude && y >= altitude && rivalOnSupportO6(surface, local)) {
          if (draw) frames.push({ x, y: altitude, beat });
          return { platform: surface, outcome, x: local, beat, frames };
        }
      }
    }
    if (draw) frames.push({ x, y, beat });
  }
  return null;
}
