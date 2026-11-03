/** V127 original game-inspired swatch studies, NOT original PHG UV/PBR textures. */
import type { ChromaticMaterialV113 } from "./hunterChromaticsV113.ts";
export const PHG_V127_ATLAS_PATH = "/game/assets/v127/phg-historical/atlas.webp";
export const PHG_V127_ATLAS_SHA256 = "8be3538f63b9ff4b990361f603d57f91040f3039c4c9c45486409224c17b4e2c";
const names = [
  {id:"aurora",label:"Aurora",patch:"2.39",row:0,column:0,reference:"https://forum.predator.illfonic.com/t/patch-notes-2-39/27316"},
  {id:"terror",label:"Terror",patch:"2.08",row:0,column:1,reference:"https://forum.predator.illfonic.com/t/patch-notes-2-08/15883"},
  {id:"slice",label:"Slice",patch:"2.08",row:1,column:0,reference:"https://forum.predator.illfonic.com/t/patch-notes-2-08/15883"},
  {id:"virus",label:"Virus",patch:"2.08",row:1,column:1,reference:"https://forum.predator.illfonic.com/t/patch-notes-2-08/15883"},
] as const;
export const PHG_HISTORICAL_STUDIES_V127: readonly ChromaticMaterialV113[] = Object.freeze(
  names.map((s): ChromaticMaterialV113 => ({
    id:"phg-study-v127-" + s.id,
    channel:"skin",
    label:"Étude V127 · " + s.label,
    status:"integrated",
    evidence:"provisional",
    src:PHG_V127_ATLAS_PATH,
    atlas:{columns:2,rows:2,column:s.column,row:s.row},
    sourceFile:"PHG_V127_Historical_Studies.zip",
    note:"Motif nommé dans le patch " + s.patch + ". Étude originale : couleurs, géométrie et UV non certifiés 1:1. " + s.reference,
  }))
);
const all208 = ["Scout","Hunter","Berserker","Alpha","Elder","JH87","CH90","Samurai"] as const;
export const PHG_CLASS_PATTERN_EVIDENCE_V127 = Object.freeze([
  {name:"Terror",classes:all208,patch:"2.08"},
  {name:"Slice",classes:all208,patch:"2.08"},
  {name:"Virus",classes:all208,patch:"2.08"},
  {name:"Mottle Grape",classes:all208,patch:"2.08"},
  {name:"Mottle Dread",classes:["Scout","Hunter","Berserker"] as const,patch:"2.08"},
] as const);
/** Original PHG levels are documentary, NOT our game's rank requirements. */
export const PHG_HISTORICAL_UNLOCKS_V127 = Object.freeze([
 {id:"aurora",label:"Peau Aurora",patch:"2.39",level:500,kind:"skin",
  sourceUrl:"https://forum.predator.illfonic.com/t/patch-notes-2-39/27316"},
 {id:"tank-predlocks-v239",label:"Predlocks Tank (sortie)",patch:"2.39",level:500,kind:"dread-style",
  sourceUrl:"https://forum.predator.illfonic.com/t/patch-notes-2-39/27316"},
 {id:"tank-predlocks-v240",label:"Predlocks Tank (corrigé)",patch:"2.40",level:150,kind:"dread-style",
  sourceUrl:"https://forum.predator.illfonic.com/t/patch-notes-2-40/28174"},
 {id:"tank-mask-v240",label:"Biomask Tank",patch:"2.40",level:87,kind:"mask",
  sourceUrl:"https://forum.predator.illfonic.com/t/patch-notes-2-40/28174"},
 {id:"exiled-predlock-tint",label:"Teinte Exiled",patch:"2.39",level:null,kind:"dread-color",
  sourceUrl:"https://forum.predator.illfonic.com/t/patch-notes-2-39/27316"},
] as const);
export const PHG_MENU_SCREENSHOTS_V127 = Object.freeze([
 {name:"Gator · Virus",url:"https://forum.predator.illfonic.com/t/female-predator-nuke-skin-and-waves-skin/19720",uvReference:false},
 {name:"Classic · Slice",url:"https://forum.predator.illfonic.com/t/female-predator-nuke-skin-and-waves-skin/19720",uvReference:false},
 {name:"Raptor · Nuke",url:"https://forum.predator.illfonic.com/t/female-predator-nuke-skin-and-waves-skin/19720",uvReference:false},
 {name:"Raptor · Fierce",url:"https://forum.predator.illfonic.com/t/alpha-predator-customizations/12074",uvReference:false},
 {name:"Wolf · Tension",url:"https://forum.predator.illfonic.com/t/how-to-fix-skin-bug-for-wolf-predator-without-asking-illfonic/27024",uvReference:false},
] as const);
