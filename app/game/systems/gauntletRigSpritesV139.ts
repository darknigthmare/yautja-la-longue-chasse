import {gauntletByIdV132,DEFAULT_GAUNTLET_ID_V132} from "./clanWarGauntletCatalogV132.ts";

/** Full-canvas 256x384 rig sprites, one independent shell/lid pair per catalogue identity.
 * These remain original vector prototypes, not cinema-verified props. */
export const GAUNTLET_RIG_VERSION_V139 = 139;
export const GAUNTLET_RIG_REGISTRATION_V139 = {
  canvasWidth:256,canvasHeight:384,hingeX:51,hingeY:202,
} as const;
export type GauntletRigPartV139 = "base" | "lid";
export function gauntletRigSpriteV139(modelId:string,part:GauntletRigPartV139):string {
  const id=gauntletByIdV132(modelId)?.id??DEFAULT_GAUNTLET_ID_V132;
  return `/game/assets/v139/rig-gauntlets/${id}/${part}.svg`;
}
