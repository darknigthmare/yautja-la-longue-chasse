import {gauntletByIdV132,DEFAULT_GAUNTLET_ID_V132} from "./clanWarGauntletCatalogV132.ts";

/** Full-canvas 256x384 rig sprites, one independent shell/lid pair per catalogue identity.
 * These remain original vector prototypes, not cinema-verified props. */
export const GAUNTLET_RIG_VERSION_V139 = 139;
export const GAUNTLET_RIG_REGISTRATION_V139 = {
  canvasWidth:256,canvasHeight:384,hingeX:51,hingeY:202,
} as const;
export type GauntletRigPartV139 = "base" | "lid";
/**
 * The 54 V139 vector shells all span about x 20-90 / y 164-231 of the rig
 * canvas: wider than the back forearm (x 34-73) and overlapping the hand,
 * which starts at y 211. This uniform fit shrinks them to the forearm width and
 * lifts them between elbow (55,149) and wrist (45,219), like the film's left
 * wrist computer. It is a scale about a fixed point, so the lid hinge
 * (GAUNTLET_RIG_REGISTRATION_V139) stays in source coordinates and keeps
 * pivoting on the shell. Only V139 sources take it; the legacy V3 webp
 * gauntlet is already drawn to forearm size.
 */
export const GAUNTLET_RIG_ARM_FIT_V139 = { pivot: { x: 40.5, y: 171.2 }, scale: 0.62 } as const;
export function gauntletRigArmFitMatrixV139(): { a: number; b: number; c: number; d: number; e: number; f: number } {
  const { pivot: { x, y }, scale } = GAUNTLET_RIG_ARM_FIT_V139;
  return { a: scale, b: 0, c: 0, d: scale, e: x * (1 - scale), f: y * (1 - scale) };
}
/** True when an image or URL is one of the V139 vector shells (not the V3 fallback). */
export function isGauntletRigSpriteV139(source: string): boolean {
  return source.includes("/game/assets/v139/rig-gauntlets/");
}
export function gauntletRigSpriteV139(modelId:string,part:GauntletRigPartV139):string {
  const id=gauntletByIdV132(modelId)?.id??DEFAULT_GAUNTLET_ID_V132;
  return `/game/assets/v139/rig-gauntlets/${id}/${part}.svg`;
}
