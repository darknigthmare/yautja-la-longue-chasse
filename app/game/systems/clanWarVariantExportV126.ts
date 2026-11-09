import type {ClanWarVariantFamilyV120,ClanWarVariantModeV120,ClanWarVariantV120} from "./clanWarVariantAtlasV120";
import {coherentClanWarVariantV126,type WarCoherentVariantV126} from "./clanWarWorldClimateV126";

export interface WarVariantExportFiltersV126 {
  mode:ClanWarVariantModeV120|"all";
  family:ClanWarVariantFamilyV120|"all";
  query:string;
}

/** Export the same V126 geography/climate shown in the atlas. Keep the entire
 * historical V120 design under original, including replaced weather and its
 * fictional assumptions. This is no mission receipt or geographic admission. */
export function clanWarVariantExportV126(
  rows:readonly ClanWarVariantV120[],filteredBy:WarVariantExportFiltersV126,
){
  return {schema:126,sourceSchema:120,status:"design-only" as const,
    total:rows.length,filteredBy:{...filteredBy},
    variants:rows.map(coherentClanWarVariantV126)};
}

const columns:readonly [string,(row:WarCoherentVariantV126)=>string][]=[
  ["ID",r=>r.sourceId],["Gameplay",r=>r.mode],["Famille",r=>r.original.family],
  ["Mission",r=>r.original.operation.missionType],["Lieu",r=>r.geography.siteName],
  ["Monde",r=>r.geography.worldId],["Type de monde",r=>r.geography.worldKind],
  ["Région",r=>r.geography.regionName],["Latitude",r=>r.geography.latitude===null?"":String(r.geography.latitude)],
  ["Longitude",r=>r.geography.longitude===null?"":String(r.geography.longitude)],
  ["Précision géographique",r=>r.geography.accuracy],
  ["Référence",r=>r.original.referenceName??""],["Œuvre de référence",r=>r.original.referenceWork??""],
  ["Biome",r=>r.environment.biome],["Climat",r=>r.environment.climate],
  ["Sol",r=>r.environment.terrain],["Zone liquide",r=>r.environment.liquid],
  ["Géométrie de conception V120",r=>r.original.environment.layout],
  ["Météo",r=>r.environment.weather],["Danger",r=>r.environment.effectiveHazard],
  ["Sans électricité — conception V120",r=>r.original.environment.powerFailure],
  ["Objectif",r=>r.original.operation.primaryObjective],
  ["Objectif secondaire",r=>r.original.operation.secondaryObjective.replaceAll(
    r.original.environment.biome,r.environment.biome)],
  ["Mécanique — conception V120",r=>r.original.operation.gameplayHook],
  ["Événement",r=>r.environment.effectiveTwist],
  ["Échec — conception V120",r=>r.original.operation.failure],
  ["Preuve de réussite prévue",r=>r.original.operation.victoryProof],
  ["Solution alternative — conception V120",r=>r.original.operation.fallback],
  ["Extraction prévue",r=>r.original.operation.extraction],
  ["Moteur",r=>r.original.production.gameplayBackend],["Statut",r=>r.original.status],
  ["Interprétation du lieu",r=>r.geography.worldExplanation],
  ["Vérifications restantes",r=>r.auditWarnings.join(" | ")],
  ["Titre source V120",r=>r.original.title],
  ["Lieu source V120",r=>r.original.settingName],
  ["Météo source V120 remplacée",r=>r.environment.originalWeather],
];

function csvCell(value:string):string {
  // Excel executable prefixes are neutralized before quoting; ordinary signed
  // coordinates remain readable as text rather than executable spreadsheet input.
  const safe=/^[\s]*[=+\-@]/.test(value)?"'"+value:value;
  return '"'+safe.replace(/"/g,'""')+'"';
}

export function clanWarVariantCsvV126(rows:readonly ClanWarVariantV120[]):string {
  const header=columns.map(([label])=>csvCell(label)).join(";");
  const lines=rows.map(row=>{
    const coherent=coherentClanWarVariantV126(row);
    return columns.map(([,value])=>csvCell(value(coherent))).join(";");
  });
  return [header,...lines].join("\r\n");
}
