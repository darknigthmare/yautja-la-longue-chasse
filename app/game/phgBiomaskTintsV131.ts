/** V131 — PHG mask tints are a fifth, physically distinct surface, never armor. */
import type { ChromaticMaterialV113 } from "./hunterChromaticsV113.ts";
import { PHG_V129_ATLAS } from "./phgPatchStudiesV129.ts";

export const PHG_OGRE_BIOMASK_ID_V131 = "phg-study-v131-alpha-ogre-biomask" as const;
export const PHG_OGRE_BIOMASK_SOURCE_V131 =
  "https://forum.predator.illfonic.com/t/patch-notes-2-19/20975";

/** Source names confirmed by patch 2.19. Other seven finishes have no verified art. */
export const PHG_BIOMASK_REFERENCES_V131 = Object.freeze([
  {name:"Requiem",classes:["Samurai","Alpha Predator"],available:false},
  {name:"Nova",classes:["Samurai","Alpha Predator"],available:false},
  {name:"Ogre",classes:["Alpha Predator"],available:true},
  {name:"Instinct",classes:["Alpha Predator"],available:false},
  {name:"Glypic",classes:["Alpha Predator"],available:false},
  {name:"Tyrant",classes:["Alpha Predator"],available:false},
  {name:"Warlord",classes:["Alpha Predator"],available:false},
  {name:"Paroxysm",classes:["Alpha Predator"],available:false},
] as const);

/** Original Ogre visual STUDY already lives in V129's final atlas cell.
 * This is not a PHG texture extraction or an authentic PHG mask silhouette.
 */
export const PHG_OGRE_BIOMASK_MATERIAL_V131: ChromaticMaterialV113 = Object.freeze({
  id:PHG_OGRE_BIOMASK_ID_V131,
  channel:"biomask",
  label:"Étude Ogre · biomask Alpha",
  status:"integrated",
  evidence:"provisional",
  src:PHG_V129_ATLAS.path,
  atlas:{columns:2,rows:2,column:1,row:1},
  sourceFile:"PHG_V129_Four_Missing_Studies.zip",
  note:"Finition exclusivement sur la coque du biomask; patch officiel 2.19. "
    + "Motif réinterprété, couleurs, pixels et UV 1:1 non certifiés. " + PHG_OGRE_BIOMASK_SOURCE_V131,
});

/** Do not lose Alpha identity when a chromatic change correctly sets the save
 * presetId to "custom". A different mask geometry never inherits Ogre.
 */
export function alphaMaskEligibleV131(appearance: {
  presetId?: string;
  biomaskId?: string | null;
  chromaticsV113?: unknown;
}): boolean {
  const palette = appearance.chromaticsV113;
  const origin = palette && typeof palette === "object" && !Array.isArray(palette)
    && "maskOriginId" in palette ? palette.maskOriginId : null;
  return appearance.biomaskId === "feral"
    && (appearance.presetId === "alpha" || origin === "alpha");
}
