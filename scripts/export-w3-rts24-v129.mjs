import {build} from "esbuild";
import {mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
const compiled=await build({
 stdin:{contents:[
  "export * from './app/game/systems/clanWarRtsSourceMissionsV129';",
  "export * from './app/game/systems/clanWarBibleV6';",
 ].join("\n"),resolveDir:process.cwd()},platform:"node",format:"esm",target:"es2022",
 bundle:true,write:false,logLevel:"silent",
});
const api=await import("data:text/javascript;base64,"+
 Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const audit=api.auditWarRtsSourceMissionsV129(rules);
if(audit.scripts!==24||audit.steps!==72||audit.sourceMaps!==12||audit.issues.length)
 throw Error("Incomplete W3-RTS24 export: "+JSON.stringify(audit));
const folder=process.argv[2]??"outputs/w3-rts24-v129";
await mkdir(folder,{recursive:true});
const missions=api.WAR_SOURCE_RTS_IDS_V129.map(id=>api.buildWarRtsMissionV129(id,rules));
const columns=["id","name","mapId","planetId","rank","pcMaximum","initialRav",
 "sourceObjective","sourceEnemyPlan","sourceConditions","sourceAlternatives",
 "sourceVictory","sourceReentry","sourceCampaignLink","sourceRewardXpDesign",
 "sourceProvenance","sourceCells","suggestedV6Units","escortKind","tasks","status","playableEngine"];
const encode=(value)=>{
 const text=Array.isArray(value)?value.map(item=>typeof item==="object"?JSON.stringify(item):item).join(" | "):
  value===null?"":typeof value==="object"?JSON.stringify(value):String(value??"");
 const safe=/^\s*[=+@-]/.test(text)?"'"+text:text;
 return '"'+safe.replace(/"/g,'""')+'"';
};
const csv="\ufeff"+columns.join(";")+"\r\n"+
 missions.map(row=>columns.map(key=>encode(row[key])).join(";")).join("\r\n")+"\r\n";
await Promise.all([
 ...missions.map(row=>writeFile(join(folder,row.id+".json"),
  JSON.stringify(row,null,2)+"\n","utf8")),
 writeFile(join(folder,"Yautja_V129_24_Missions_RTS_W3.csv"),csv,"utf8"),
 writeFile(join(folder,"Yautja_V129_24_Missions_RTS_W3_complet.json"),JSON.stringify({
  version:129,status:"source-faithful-objective-study",
  source:"Yautja_V6_Bible_Cumulative_et_Dialogues.xlsx",
  missions,
  caveat:"Three scripted physical checkpoints per RTS brief; not the 24 full RTS armies/campaigns",
  campaignMutation:false,
 },null,2)+"\n","utf8"),
 writeFile(join(folder,"Yautja_V129_24_Missions_RTS_W3_audit.json"),JSON.stringify(audit,null,2)+"\n","utf8"),
]);
console.log("V129: 24 source missions / 12 W3 maps / 72 interactable objective stages exported without false RTS claims");
