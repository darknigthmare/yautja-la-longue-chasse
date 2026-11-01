import {gauntletRigSpriteV139,type GauntletRigPartV139} from "./gauntletRigSpritesV139.ts";

/** V141: cosmetic-only mission asset resolver. Loads the chosen model's real
 * V139 rig source and falls back to the existing V3 sprite if it is missing.
 * No access to player state, rewards, mission time or battle rules. */
export async function loadGauntletRigPartV141<T>(
  modelId:string,
  part:GauntletRigPartV139,
  load:(url:string)=>Promise<T|null>,
  legacyPath:string,
):Promise<T|null>{
  try{
    const preferred=await load(gauntletRigSpriteV139(modelId,part));
    if(preferred!==null) return preferred;
  }catch { /* Missing optional art should not abort the hunt. */ }
  try{return await load(legacyPath);}catch{return null;}
}
