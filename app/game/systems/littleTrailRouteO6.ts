export const LITTLE_TRAIL_O6 = {
  width: 880, height: 388, bottom: 316, overlook: 194, start: 90,
  first: 286, far: 636, pebble: 368, rub: 486, blind: 190, old: 415, climb: 748, gather: 146,
} as const;

export type LittleTrailPlaneO6 = "trail" | "overlook";
export type LittleTrailCueO6 = "pebble" | "rub";
export type LittleTrailReportO6 = "map" | "behavior";
export type LittleTrailOrderO6 = (
  { type: "observe" | "lose" | "scan-anchor" | "scan-old" | "ascend" | "compare" } |
  { type: "sample" | "identify"; cue: LittleTrailCueO6 } |
  { type: "report"; choice: LittleTrailReportO6 }
) & { x: number; plane: LittleTrailPlaneO6 };

type Stage = "first" | "listen" | "far" | "search-anchor" | "search-old" | "rise" | "return" | "report" | "closed";
export type LittleTrailViewO6 = {
  stage: Stage; plane: LittleTrailPlaneO6; x: number; heard: LittleTrailCueO6[];
  lastConfirmed: "first" | "far" | null; loss: "startled" | "decoy" | null; choice: LittleTrailReportO6 | null;
};
export const LITTLE_TRAIL_OPENING_O6: LittleTrailViewO6 = {
  stage: "first", plane: "trail", x: LITTLE_TRAIL_O6.start, heard: [], lastConfirmed: null, loss: null, choice: null,
};

export const littleTrailCloseO6 = (x: number, goal: number, radius = 22) =>
  Number.isInteger(x) && Math.abs(x - goal) <= radius;
const limits = { trail: [44, 837], overlook: [68, LITTLE_TRAIL_O6.climb] } as const;

export function littleTrailOnPlaneO6(plane: LittleTrailPlaneO6, x: number) {
  return Number.isInteger(x) && x >= limits[plane][0] && x <= limits[plane][1];
}

export function walkLittleTrailO6(plane: LittleTrailPlaneO6, x: number, direction: -1 | 1) {
  return Math.max(limits[plane][0], Math.min(limits[plane][1], x + direction * 12));
}

export function littleTrailPreyX(view: LittleTrailViewO6) {
  return view.stage === "first" ? LITTLE_TRAIL_O6.first : view.stage === "listen" || view.stage === "far" ? LITTLE_TRAIL_O6.far : null;
}

export function littleTrailThreatO6(view: LittleTrailViewO6, x: number) {
  const prey = littleTrailPreyX(view);
  return prey !== null && littleTrailCloseO6(x, prey, 43);
}

export function littleTrailAnchorO6(view: LittleTrailViewO6) {
  return view.lastConfirmed ? LITTLE_TRAIL_O6[view.lastConfirmed] : LITTLE_TRAIL_O6.blind;
}

export function littleTrailOrdersAtO6(view: LittleTrailViewO6, x: number): LittleTrailOrderO6[] {
  const { plane, stage } = view;
  const at = { x, plane };
  if (!littleTrailOnPlaneO6(plane, x)) return [];
  if (littleTrailThreatO6(view, x)) return [{ type: "lose", ...at }];
  switch (stage) {
    case "first":
    case "far": {
      const distance = LITTLE_TRAIL_O6[stage] - x;
      return distance >= 52 && distance <= 108 ? [{ type: "observe", ...at }] : [];
    }
    case "listen": {
      const cue = littleTrailCloseO6(x, LITTLE_TRAIL_O6.pebble) ? "pebble" :
        littleTrailCloseO6(x, LITTLE_TRAIL_O6.rub) ? "rub" : null;
      if (cue === null) return [];
      if (!view.heard.includes(cue)) return [{ type: "sample", cue, ...at }];
      return view.heard.length === 2
        ? [{ type: "identify", cue: "rub", ...at }, { type: "identify", cue: "pebble", ...at }] : [];
    }
    case "search-anchor": return littleTrailCloseO6(x, littleTrailAnchorO6(view)) ? [{ type: "scan-anchor", ...at }] : [];
    case "search-old": return littleTrailCloseO6(x, LITTLE_TRAIL_O6.old) ? [{ type: "scan-old", ...at }] : [];
    case "rise": return littleTrailCloseO6(x, LITTLE_TRAIL_O6.climb) ? [{ type: "ascend", ...at }] : [];
    case "return": return littleTrailCloseO6(x, LITTLE_TRAIL_O6.gather) ? [{ type: "compare", ...at }] : [];
    case "report": return littleTrailCloseO6(x, LITTLE_TRAIL_O6.gather)
      ? [{ type: "report", choice: "map", ...at }, { type: "report", choice: "behavior", ...at }] : [];
    default: return [];
  }
}
