/** V128 PHG platform cosmetic studies. Original fan-game reconstructions, not UV/PBR source. */
import type { ChromaticMaterialV113 } from "./hunterChromaticsV113.ts";
export const PHG_V128_ATLAS = Object.freeze({
  path:"/game/assets/v128/phg-platform/atlas.webp",
  sha256:"7ea43242987fe99abaae5cbe884ce7f428be586543f48fd9221fcd197654933a",
  width:1024,height:1024,authenticPHGUV:false,
} as const);
const references=[
  {id:"exiled-marbled-bronze",name:"Exiled · Marbled/Bronze",channel:"dreads",column:0,row:0,
    source:"https://forum.predator.illfonic.com/t/predlocks-elder/27425",
    status:"menu-label-confirmed-texture-not-verified"},
  {id:"steam-light-metal",name:"Steam Exclusive · métal clair",channel:"armor",column:1,row:0,
    source:"https://forum.predator.illfonic.com/t/what-happened-to-the-steam-exclusive-shader-and-why-not-for-the-masks/26467",
    status:"community-description-palette-estimate"},
  {id:"epic-copper",name:"Epic Exclusive · cuivre",channel:"armor",column:0,row:1,
    source:"https://forum.predator.illfonic.com/t/predator-customization-bugs-and-missing-stuff-as-of-patch-2-20/22242",
    status:"color-not-evidenced"},
  {id:"playstation-graphite",name:"PlayStation Exclusive · graphite",channel:"armor",column:1,row:1,
    source:"https://forum.predator.illfonic.com/t/predator-customization-bugs-and-missing-stuff-as-of-patch-2-20/22242",
    status:"color-not-evidenced"},
] as const;
export const PHG_V128_REFERENCES = Object.freeze(references);
export const PHG_PLATFORM_STUDIES_V128: readonly ChromaticMaterialV113[] = Object.freeze(
 references.map((r):ChromaticMaterialV113=>({
  id:"phg-study-v128-"+r.id,channel:r.channel,status:"integrated",evidence:"provisional",
  label:"Étude V128 · "+r.name,src:PHG_V128_ATLAS.path,
  sourceFile:"PHG_V128_Platform_Materials_Studies.zip",
  atlas:{columns:2,rows:2,column:r.column,row:r.row},
  note:"Étude originale non certifiée 1:1 ; "+r.status+". UV officiels indisponibles. "+r.source,
 }))
);
export const PHG_OGRE_MASK_CORRECTION_V128=Object.freeze({
  previousAuditId:"armure_v2_ogre_pending",
  correctType:"biomask-tint",class:"Alpha Predator",patch:"2.19",
  source:"https://forum.predator.illfonic.com/t/patch-notes-2-19/20975",
  renderAsArmor:false,requiresMaskLayer:true,officialPixelsVerified:false,
} as const);
