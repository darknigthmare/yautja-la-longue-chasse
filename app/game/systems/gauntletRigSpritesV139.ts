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
/**
 * V145: the wrist computer moves to the FRONT forearm (wristblades take the
 * back one). Both the V139 shells and the V3 fallback were drawn on the back
 * forearm (axis about 98 deg); this turns them onto the front forearm axis
 * (elbow 185,161 to wrist 212,216, about 64 deg) and seats them at mid
 * forearm, with per-morph offsets measured on lower-arm-front. The result is
 * applied after the armFrontLower bone; the lid still pivots on the source
 * hinge because the hinge rotation is composed after this matrix.
 */
export const GAUNTLET_FRONT_ARM_V145 = {
  turn: Math.atan2(216 - 161, 212 - 185) - Math.atan2(219 - 149, 45 - 55),
  // Mid forearm (45 % from the elbow), slightly smaller than on the back arm
  // because the front forearm is shorter in this 3/4 view.
  target: { x: 197.2, y: 185.8 },
  scale: 0.82,
  shiftXByMorph: { classic: 0, elder: -0.9, super: 4.2, feral: 3.3, huntress: -0.3, young: 1.3 } as Record<string, number>,
} as const;
export function gauntletFrontArmMatrixV145(morphId: string, v139Shell: boolean): { a: number; b: number; c: number; d: number; e: number; f: number } {
  // Centre of the shell on the back arm: V139 after its arm fit, or the V3 webp.
  const fit = v139Shell ? gauntletRigArmFitMatrixV139() : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const src = v139Shell ? { x: 55, y: 197.5 } : { x: 50.5, y: 202.5 };
  const centre = { x: fit.a * src.x + fit.c * src.y + fit.e, y: fit.b * src.x + fit.d * src.y + fit.f };
  const { turn, target, shiftXByMorph, scale } = GAUNTLET_FRONT_ARM_V145;
  const cos = Math.cos(turn) * scale, sin = Math.sin(turn) * scale;
  // T(target) * R(turn) * T(-centre) * fit
  const r = { a: cos, b: sin, c: -sin, d: cos,
    e: target.x + (shiftXByMorph[morphId] ?? 0) - cos * centre.x + sin * centre.y,
    f: target.y - sin * centre.x - cos * centre.y };
  return { a: r.a * fit.a + r.c * fit.b, b: r.b * fit.a + r.d * fit.b, c: r.a * fit.c + r.c * fit.d, d: r.b * fit.c + r.d * fit.d,
    e: r.a * fit.e + r.c * fit.f + r.e, f: r.b * fit.e + r.d * fit.f + r.f };
}
/** True when an image or URL is one of the V139 vector shells (not the V3 fallback). */
export function isGauntletRigSpriteV139(source: string): boolean {
  return source.includes("/game/assets/v139/rig-gauntlets/");
}
export function gauntletRigSpriteV139(modelId:string,part:GauntletRigPartV139):string {
  const id=gauntletByIdV132(modelId)?.id??DEFAULT_GAUNTLET_ID_V132;
  return `/game/assets/v139/rig-gauntlets/${id}/${part}.svg`;
}
