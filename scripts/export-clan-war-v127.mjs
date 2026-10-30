import {build} from "esbuild";
import {mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
const bundle=await build({
 stdin:{contents:[
  "export * from './app/game/systems/clanWarEarthMetricV127';",
  "export * from './app/game/systems/clanWarEncounterDirectorV127';",
  "export * from './app/game/systems/clanWarEarthV126';",
  "export * from './app/game/systems/clanWarWorldClimateV126';",
 ].join("\n"),resolveDir:process.cwd()},
 bundle:true,platform:"node",target:"es2022",format:"esm",write:false,logLevel:"silent",
});
const api=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const audit=api.auditWarEncounterSubVariantsV127();
const earthAudit=api.auditEarthMetricV127();
if(audit.subVariants!==6000||audit.sceneSections!==24000||audit.errors.length||earthAudit.issues.length)
 throw Error("V127 QA failed: "+JSON.stringify({audit,earthAudit}));
const base=process.argv[2]??"outputs/clan-war-v127";
await mkdir(base,{recursive:true});
const plans=api.CLAN_WAR_COHERENT_VARIANTS_V126.flatMap(api.warEncounterSubVariantsV127);
const columns=["id","sourceId","status","profile","players","worldId","worldKind",
 "climate","phaseCount","estimatedEnemyTeams","estimatedEnemyPersons","maximumVisibleEnemies",
 "hiddenOuterEstimate","sourceUnitPc","roleTypes","tactics","enemyWaves","victoryConditions",
 "failureConditions","warnings"];
const safe=(item)=>{
 const s=Array.isArray(item)?item.join(" | "):item===null?"":typeof item==="object"?JSON.stringify(item):String(item??"");
 return '"'+(/^\s*[=+@-]/.test(s)?"'"+s:s).replace(/"/g,'""')+'"';
};
const csv="\ufeff"+columns.join(";")+"\r\n"+plans.map(item=>columns.map(k=>safe(item[k])).join(";")).join("\r\n")+"\r\n";
const fileByMode=[];
for(const mode of ["assault","outer","stealth","rts"]){
 const modePlans=plans.filter(x=>x.sourceId.includes("-"+({assault:"A",outer:"O",stealth:"S",rts:"R"}[mode])+"-"));
 const filename="Yautja_V127_IA_"+mode+"_1500.json";
 fileByMode.push(writeFile(join(base,filename),JSON.stringify({status:"design-only",count:modePlans.length,plans:modePlans},null,2)+"\n","utf8"));
}
await Promise.all([
 writeFile(join(base,"Yautja_V127_IA_6000.csv"),csv,"utf8"),
 writeFile(join(base,"Yautja_V127_Terre_ancres_metrage.json"),JSON.stringify({
  earth:api.EARTH_WGS84_V126,
  anchors:api.EARTH_FILM_SCENE_ANCHORS_V127,
  gates:api.EARTH_LOCAL_ASSET_GATES_V127,
  status:"geodetic-reference-only; no 1:1 terrain scene",
 },null,2)+"\n","utf8"),
 writeFile(join(base,"Yautja_V127_Audit.json"),JSON.stringify({earthAudit,audit},null,2)+"\n","utf8"),
 ...fileByMode,
]);
console.log("V127 exports passed: 6000 AI plans, 24000 phase sections, WGS84 metric coordinates");
