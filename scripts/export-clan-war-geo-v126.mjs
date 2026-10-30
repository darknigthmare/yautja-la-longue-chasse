import {build} from "esbuild";
import {mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";

const bundler=await build({
 stdin:{contents:[
  "export * from './app/game/systems/clanWarEarthV126';",
  "export * from './app/game/systems/clanWarWorldClimateV126';",
  "export * from './app/game/systems/clanWarEnemyProfilesV126';",
  "export * from './app/game/systems/clanWarMultiplayerV126';",
 ].join("\n"),resolveDir:process.cwd()},
 bundle:true,write:false,platform:"node",target:"es2022",format:"esm",logLevel:"silent",
});
const api=await import("data:text/javascript;base64,"+Buffer.from(bundler.outputFiles[0].text).toString("base64"));
const geo=api.auditClanWarWorldsV126(),opposition=api.auditWarAiPresetsV126(),earth=api.auditEarthFilmSitesV126();
if(geo.count!==1200||geo.problems.length||opposition.encounterPresets!==6000||opposition.errors.length||earth.issues.length)
 throw Error("V126 catalogue inconsistent: "+JSON.stringify({geo,opposition,earth}));
const missions=api.CLAN_WAR_COHERENT_VARIANTS_V126.map(v=>({
 id:v.sourceId,mode:v.mode,family:v.original.family,status:"design-only",
 originalTitle:v.original.title,worldId:v.geography.worldId,worldKind:v.geography.worldKind,
 siteName:v.geography.siteName,regionName:v.geography.regionName,
 lat:v.geography.latitude,lon:v.geography.longitude,accuracy:v.geography.accuracy,
 mapAvailability:v.geography.mapAvailability,earthSiteId:v.geography.earthSiteId,
 climate:v.environment.climate,biome:v.environment.biome,
 terrain:v.environment.terrain,liquid:v.environment.liquid,
 weather:v.environment.weather,originalWeather:v.environment.originalWeather,
 weatherAdjusted:v.environment.weatherAdjusted,allowsNaturalSnow:v.environment.allowsNaturalSnow,
 light:v.environment.light,hazards:v.environment.hazards,
 objective:v.original.operation.primaryObjective,
 secondary:v.original.operation.secondaryObjective,
 outcomeReceipt:v.original.operation.resultReceipt,
 recommendedUnits:v.original.operation.recommendedUnitIds,
 sourceContinuity:v.original.referenceContinuity,
 sourceReference:v.original.referenceName,
 loreStatus:v.original.family==="lore"?"invented-in-continuity":v.original.family==="homage"?"real-Earth-homage":"original-world",
 originalGeo:v.geography.worldExplanation,
 environmentWarnings:v.auditWarnings,
}));
const presets=api.CLAN_WAR_COHERENT_VARIANTS_V126.flatMap(v=>api.allWarAiPresetsV126(v));
const columns=[
 "id","mode","family","status","originalTitle","worldId","worldKind","siteName","regionName",
 "lat","lon","accuracy","mapAvailability","earthSiteId","climate","biome","terrain","liquid",
 "weather","originalWeather","weatherAdjusted","allowsNaturalSnow","light","hazards","objective",
 "secondary","outcomeReceipt","recommendedUnits","sourceContinuity","sourceReference",
 "loreStatus","originalGeo","environmentWarnings",
];
const aiColumns=["scenarioId","subVariant","doctrine","threatLevel","playerCount","maxSimultaneous",
 "totalTeams","totalCombatants","difficultyBudgetPc","visibility","sourceWorldId","terrainTactics",
 "powerPolicy","objectiveCounterplay","roleGroups","canonStatus"];
const textCell=(v)=>Array.isArray(v)?v.map(item=>typeof item==="string"?item:JSON.stringify(item)).join(" | "):
 v===null?"":typeof v==="object"?JSON.stringify(v):String(v??"");
const csvQuote=(v)=>{
 const str=textCell(v);
 const formula=/^\s*[=+@-]/.test(str)?"'"+str:str;
 return '"'+formula.replace(/"/g,'""')+'"';
};
const toCsv=(rows,fields)=>"\ufeff"+fields.join(";")+"\r\n"+rows.map(row=>fields.map(key=>csvQuote(row[key])).join(";")).join("\r\n")+"\r\n";
const target=process.argv[2]??"outputs/clan-war-v126";
await mkdir(target,{recursive:true});
await Promise.all([
 writeFile(join(target,"Yautja_Guerres_Clans_V126_Geo_1200.csv"),toCsv(missions,columns),"utf8"),
 writeFile(join(target,"Yautja_Guerres_Clans_V126_IA_6000.csv"),toCsv(presets,aiColumns),"utf8"),
 writeFile(join(target,"Yautja_Guerres_Clans_V126_Complet.json"),JSON.stringify({
   version:126,status:"design-only",sourceAtlas:"V120",earth,geo,opposition,missions,presets,
   earthFilmSites:api.EARTH_FILM_SITES_V126,earthWorld:api.EARTH_WGS84_V126,
   multiplayerProtocol:"server-required; not yet live online multiplayer",
  },null,2)+"\n","utf8"),
 writeFile(join(target,"Yautja_Guerres_Clans_V126_Audit.json"),JSON.stringify({earth,geo,opposition},null,2)+"\n","utf8"),
]);
console.log("V126 exporter: 1200 world/climate corrections, 6000 AI profiles, real Earth globe and no fake coordinates");
