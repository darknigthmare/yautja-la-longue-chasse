#!/usr/bin/env node
/**
 * Export all V120 design-only scenarios to a semicolon-delimited UTF-8 BOM CSV,
 * compatible with Excel's French locale. No runtime mission is unlocked.
 *
 * Usage: node scripts/export-clan-war-variants-v120.mjs [output/path.csv]
 */
import { build } from "esbuild";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const bundle=await build({
  stdin:{contents:"export * from './app/game/systems/clanWarVariantAtlasV120';",resolveDir:process.cwd()},
  bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent",
});
const api=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const variants=api.CLAN_WAR_VARIANT_ATLAS_V120;
if(variants.length!==1200)throw Error("Refusing partial CSV: "+variants.length+" != 1200");
const fields=[
 ["id","Identifiant"],["mode","Gameplay"],["family","Catégorie"],["status","Statut"],
 ["title","Titre"],["settingName","Lieu créé"],["zoneName","Type de zone"],
 ["referenceName","Lieu / univers de référence"],["referenceWork","Œuvre de référence"],
 ["referenceContinuity","Continuité"],["inspirationNote","Contexte / fidélité au lore"],
 ["environment.biome","Biome"],["environment.terrain","Texture sol"],["environment.liquid","Texture liquide"],
 ["environment.sky","Ciel"],["environment.layout","Géométrie"],["environment.cover","Couvert"],
 ["environment.weather","Météo"],["environment.timeOfDay","Moment"],
 ["environment.environmentalHazard","Danger dynamique"],
 ["environment.powerFailure","Sans courant"],["environment.hazardsReaction","Réaction du terrain"],
 ["environment.mapScaleHint","Gabarit carte"],["environment.territoryShapeRequest","Forme région demandée"],
 ["environment.islandShapeRequest","Forme île demandée"],["environment.worldSize","Taille planète"],
 ["operation.missionType","Type d'objectif"],["operation.setup","Briefing"],
 ["operation.primaryObjective","Objectif principal"],["operation.secondaryObjective","Objectif annexe"],
 ["operation.gameplayHook","Mécanique"],["operation.twist","Imprévu"],
 ["operation.failure","Échec"],["operation.victoryProof","Preuve de succès"],
 ["operation.fallback","Alternative"],["operation.extraction","Sortie"],
 ["operation.recommendedUnitIds","Équipes conseillées"],["operation.threat","Menace"],
 ["operation.dynamicPhases","Étapes"],["production.neededSprites","Sprites à produire"],
 ["production.neededTiles","Textures / tiles"],["production.missingSystems","Systèmes manquants"],
 ["production.gameplayBackend","Gameplay source"],["production.uniquenessSignature","Signature diversité"]
];
function select(object,key){
 return key.split(".").reduce((value,segment)=>value!=null?value[segment]:undefined,object);
}
function cell(text){
 const value=Array.isArray(text)?text.join(" | "):String(text??"");
 const safe=/^\s*[=+\-@]/.test(value)?"'"+value:value;
 return '"'+safe.replace(/"/g,'""')+'"';
}
const lines=[fields.map(([,label])=>cell(label)).join(";"),
  ...variants.map(variant=>fields.map(([key])=>cell(select(variant,key))).join(";"))];
const target=process.argv[2]??"outputs/clan-war-v120/Yautja_Guerres_de_clans_1200_variantes_V120.csv";
mkdirSync(dirname(target),{recursive:true});
writeFileSync(target,"\uFEFF"+lines.join("\r\n")+"\r\n","utf8");
console.log(JSON.stringify({rows:variants.length,columns:fields.length,path:target}));
