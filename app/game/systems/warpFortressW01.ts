/** W-01 / WU-E05 · Le deuxième relevé du fjord de 841. */
export const W01_FORTRESS_LIMIT = 16;
export const W01_FORTRESS_HALL_START = 10;
export const W01_FORTRESS_HALL_ART = "/game/warp-universe/20261109-p1/179_viking_halle_fond.png";
export const W01_FORTRESS_TIDE_POST = 4;
export const W01_FORTRESS_TABLE = 14;

export const W01_FORTRESS_APPROACH = {
  quai: { name: "Grève", gate: 8, landmark: "Treuil de service", open: "Abaisser la passerelle de service" },
  falaise: { name: "Gorge", gate: 9, landmark: "Poterne de la gorge", open: "Ouvrir la poterne dégagée" },
} as const;

export const W01_FORTRESS_STAGES = ["sounded", "entered", "copied", "returned"] as const;

export type WarpFortressStage = (typeof W01_FORTRESS_STAGES)[number];
export type WarpFortressAction = { kind: WarpFortressStage; at: number };
export type WarpFortressRecord = { tripId: string; stage: WarpFortressStage };

export function warpFortressInReach(at: number, target: number): boolean {
  return Number.isInteger(at) && at >= 0 && at <= W01_FORTRESS_LIMIT && at === target;
}

export function warpFortressNextStage(stage: WarpFortressStage | undefined): WarpFortressStage | undefined {
  return W01_FORTRESS_STAGES[stage ? W01_FORTRESS_STAGES.indexOf(stage) + 1 : 0];
}

export function normalizeWarpFortressRecord(value: unknown): WarpFortressRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== 2 ||
      !("tripId" in value) || typeof value.tripId !== "string" || !/^warp-trip-[1-9]\d{0,6}$/.test(value.tripId) ||
      !("stage" in value)) return null;
  const rawStage = value.stage;
  const stage = W01_FORTRESS_STAGES.find(candidate => candidate === rawStage);
  return stage ? { tripId: value.tripId, stage } : null;
}
