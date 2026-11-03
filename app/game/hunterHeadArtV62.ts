import type { HunterBodyMorphId } from "./types";

export interface HunterLayerPlacement { x: number; y: number; width: number; height: number }

/** Move the existing strand root to the rear scalp, shared by both articulated renderers. */
export const HUNTER_HEAD_DREAD_OFFSET_V62 = { x: -33, y: 0 } as const;

// Measured detached island in the old Super upper-arm plate: 50 opaque pixels
// at (182..189,94..104) belonged to the former jaw, not to the arm.
export function hunterBodyPartClipV62(morphId: HunterBodyMorphId, partId: string) {
  return morphId === "super" && partId === "upper-arm-front"
    ? [[0, 0, 182, 384], [190, 0, 66, 384], [182, 105, 8, 279]] as const : undefined;
}
export function hunterBodyPartClipCssV62(morphId: HunterBodyMorphId, partId: string): string | undefined {
  return hunterBodyPartClipV62(morphId, partId)
    ? "polygon(0% 0%, 71.09375% 0%, 71.09375% 27.34375%, 74.21875% 27.34375%, 74.21875% 0%, 100% 0%, 100% 100%, 0% 100%)" : undefined;
}

/** Old body plates had scarlet Super skin and bleached Feral skin. This shared
 * runtime grade brings them closer to the referenced heads without editing art. */
export function hunterBodyPartColorV62(morphId: HunterBodyMorphId, partId: string, skinFilter: string): string {
  const grade = partId === "head" ? "none" : morphId === "super"
    ? "grayscale(.9) sepia(.32) saturate(.65) brightness(.76)"
    : morphId === "feral" ? "sepia(.55) saturate(1.45) brightness(.80)" : "none";
  return [grade, skinFilter].filter(value => value !== "none").join(" ") || "none";
}

/** Native alpha cutouts: measured rectangles, never resized source files. */
export const HUNTER_HEAD_ART_V62 = {
  classic: { path: "/game/sprites/v62/heads/classic-head.png", placement: { x: 88.83758, y: 11.42584, width: 96.98817, height: 96.98817 } },
  elder: { path: "/game/sprites/v62/heads/elder-head.png", placement: { x: 89.98429, y: 12.35368, width: 95.68223, height: 95.68223 } },
  super: { path: "/game/sprites/v62/heads/super-head.png", placement: { x: 94.66194, y: 13.31720, width: 85.07095, height: 93.08848 } },
  feral: { path: "/game/sprites/v62/heads/feral-head.png", placement: { x: 96.29784, y: 11.91847, width: 79.34276, height: 99.14309 } },
} as const;

// Young and huntress share the classic anatomical family; this is not six unique heads.
// These modular morphologies are reference-based adaptations, not named film portraits.
export const HUNTER_HEAD_FAMILY_V62 = {
  classic: "classic", elder: "elder", super: "super", feral: "feral", huntress: "classic", young: "classic",
} as const satisfies Record<HunterBodyMorphId, keyof typeof HUNTER_HEAD_ART_V62>;

export function hunterHeadArtV62(morphId: HunterBodyMorphId) {
  return HUNTER_HEAD_ART_V62[HUNTER_HEAD_FAMILY_V62[morphId]];
}
