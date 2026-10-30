/** PHG V129: original visual studies; official variant names but no game UV assets. */
import type { ChromaticMaterialV113 } from "./hunterChromaticsV113.ts";
import data from "./data/phgPatchV129References.json" with { type:"json" };
export const PHG_V129_ATLAS=Object.freeze({path:data.atlasPath,sha256:data.atlasSha256,authenticPHG:false});
export const PHG_V129_SOURCE_RECORDS=Object.freeze(data.records);
export const PHG_V129_PATCH_MATERIALS: readonly ChromaticMaterialV113[]=Object.freeze(
 data.records.filter(r=>r.selectable && r.channel!=="biomask").map((r):ChromaticMaterialV113=>({
  id:"phg-study-v129-"+r.id,channel:r.channel as ChromaticMaterialV113["channel"],
  label:"Étude V129 · "+r.label,
  status:"integrated",evidence:"provisional",src:data.atlasPath,
  sourceFile:"PHG_V129_Four_Missing_Studies.zip",atlas:r.atlas,
  note:"Matériau original reconstruit, pixels et UV non certifiés 1:1. "+r.note+". "+r.sourceUrl,
 }))
);
export const PHG_V129_OGRE_MASK=Object.freeze({
 id:"biomask_alpha_ogre",type:"biomask-tint",className:"Alpha Predator",patch:"2.19",
 sourceUrl:"https://forum.predator.illfonic.com/t/patch-notes-2-19/20975",
 atlas:{columns:2,rows:2,column:1,row:1},
 selectable:false,armorAllowed:false,pixelFaithfulPHG:false
});
export const PHG_V129_CLASSES=Object.freeze({
 mottleDread:["Scout","Hunter","Berserker"],
 gatorWaves:["Alpha Predator","Berserker","City Hunter ’97","Elder","Hunter","Jungle Hunter ’87","Scout"],
 tankOriginalUnlockLevelAfter240:150
} as const);
