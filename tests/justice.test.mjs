import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
const result=await build({entryPoints:["app/game/systems/justice.ts"],bundle:true,write:false,format:"esm",platform:"node",logLevel:"silent"});
const j=await import("data:text/javascript;base64,"+Buffer.from(result.outputFiles[0].text).toString("base64"));
const {defaultJusticeProgress,normalizeJusticeProgress,applyJusticeAction,advanceJusticeTime,getJusticeRouteControl,getJusticeStatus}=j;
const act=(p,a)=>applyJusticeAction(p,a);
const choose=(choice="resale")=>act(defaultJusticeProgress(),{type:"choose-origin",choice}).progress;
const warrant=(choice="resale")=>{
 let p=choose(choice);
 p=act(p,{type:"transmit-evidence",evidenceId:choice==="resale"?"cargo-recording":"forged-signature",jurisdictionId:"homeworld"}).progress;
 return act(p,{type:"identify",jurisdictionId:"homeworld",source:"transponder"}).progress;
};
const detain=(p=warrant())=>{
 p=act(p,{type:"request-control",jurisdictionId:"homeworld"}).progress;
 return act(p,{type:"answer-control",response:"surrender"}).progress;
};
test("honour, failed hunts and PIT results have no path into judicial facts",()=>{
 const p=normalizeJusticeProgress({version:1,honor:-999,pitWins:100,failedHunts:50});
 assert.deepEqual(p,defaultJusticeProgress());
 assert.equal(act(p,{type:"pit-result",result:"fatality"}).ok,false);
 assert.equal(act(p,{type:"hunt-failed"}).ok,false);
 assert.equal(getJusticeStatus(p).activeWarrantCount,0);
});
test("public rupture produces exile and a contact, never automatic Bad Blood or a warrant",()=>{
 const p=choose("rupture");assert.equal(p.declaration,"exiled");assert.equal(p.clandestineNotoriety,1);
 assert.equal(p.incidents.length,0);assert.equal(p.warrants.length,0);
 assert.equal(act(p,{type:"defy-warrant"}).ok,false);
 assert.deepEqual(act(p,{type:"choose-origin",choice:"rupture"}).progress,p);
 assert.equal(act(p,{type:"choose-origin",choice:"resale"}).ok,false);
});
test("a known offence, transmission and identification remain three separate requirements",()=>{
 const p=choose();assert.equal(p.incidents[0].actualOffender,"player");assert.equal(p.warrants.length,0);
 const transmitted=act(p,{type:"transmit-evidence",evidenceId:"cargo-recording",jurisdictionId:"homeworld"}).progress;
 assert.equal(transmitted.warrants.length,0);assert.equal(transmitted.pressure.homeworld,1);
 const identifiedFirst=act(p,{type:"identify",jurisdictionId:"homeworld",source:"biomask"}).progress;
 assert.equal(identifiedFirst.warrants.length,0);
 const a=act(transmitted,{type:"identify",jurisdictionId:"homeworld",source:"transponder"}).progress;
 const b=act(identifiedFirst,{type:"transmit-evidence",evidenceId:"cargo-recording",jurisdictionId:"homeworld"}).progress;
 assert.equal(a.warrants.length,1);assert.equal(b.warrants.length,1);
 assert.equal(a.warrants[0].policy,"capture-alive");assert.equal(a.declaration,"accused");
 const again=act(a,{type:"transmit-evidence",evidenceId:"cargo-recording",jurisdictionId:"homeworld"});
 assert.equal(again.changed,false);assert.equal(again.progress.warrants.length,1);
 assert.equal(p.evidence[0].transmittedTo.length,0,"input is immutable");
});
test("a forged accusation may issue a warrant without creating actual player guilt",()=>{
 const p=warrant("investigator");assert.equal(p.incidents[0].actualOffender,"unknown");
 assert.equal(p.evidence[0].reliability,"forged");assert.equal(p.warrants.length,1);
 assert.equal(p.declaration,"accused");
});
test("transmissions do not grant omniscient recognition in other jurisdictions",()=>{
 let p=warrant();assert.equal(getJusticeRouteControl(p,"clan-core").kind,"clear");
 p=act(p,{type:"share-warrant",warrantId:p.warrants[0].id,jurisdictionId:"clan-core"}).progress;
 assert.equal(getJusticeRouteControl(p,"clan-core").kind,"identity-check");
 p=act(p,{type:"identify",jurisdictionId:"clan-core",source:"transponder"}).progress;
 assert.equal(getJusticeRouteControl(p,"clan-core").kind,"summons");
 assert.equal(getJusticeRouteControl(p,"frontier").kind,"clear");
});
test("neutral and clandestine territories reject foreign warrants and retain a viable route",()=>{
 const p=warrant();
 for(const id of ["neutral-station","renegade-port"]){
  assert.equal(act(p,{type:"share-warrant",warrantId:p.warrants[0].id,jurisdictionId:id}).ok,false);
  const route=getJusticeRouteControl(p,id);assert.equal(route.kind,"clear");assert.equal(route.canContinue,true);assert.equal(route.covertRouteAvailable,true);
 }
});
test("the control identifies then summons; no warrant means a valid surrender cannot imprison",()=>{
 let p=act(defaultJusticeProgress(),{type:"request-control",jurisdictionId:"homeworld"}).progress;
 assert.equal(p.intervention.stage,"identity-requested");
 p=act(p,{type:"answer-control",response:"surrender"}).progress;
 assert.equal(p.detention,null);assert.equal(p.intervention.stage,"none");
 p=act(warrant(),{type:"request-control",jurisdictionId:"homeworld"}).progress;
 p=act(p,{type:"answer-control",response:"cooperate"}).progress;assert.equal(p.intervention.stage,"summoned");
 p=act(p,{type:"answer-control",response:"surrender"}).progress;assert.equal(p.intervention.stage,"detained");assert.equal(p.detention.equipmentPolicy,"retained");
});
test("real restitution releases immediately, does not touch inventory, and cannot rearrest for the same case",()=>{
 const detained=detain();assert(detained.detention);
 const r=act(detained,{type:"resolve-case",incidentId:"ritual-trophy-case",method:"restitution"});
 assert.equal(r.ok,true);assert.equal(r.progress.detention,null);assert.equal(r.progress.declaration,"conditional");
 assert.equal(r.progress.warrants[0].status,"resolved");assert.equal(r.progress.inventory,undefined);
 assert.equal(act(r.progress,{type:"resolve-case",incidentId:"ritual-trophy-case",method:"restitution"}).changed,false);
 let p=advanceJusticeTime(r.progress,1800);
 p=act(p,{type:"request-control",jurisdictionId:"homeworld"}).progress;
 p=act(p,{type:"answer-control",response:"surrender"}).progress;assert.equal(p.detention,null);
 assert.equal(p.warrants.length,1);
});
test("exoneration requires contradictory evidence and cannot erase a genuine offence",()=>{
 let p=detain(warrant("investigator"));
 assert.equal(act(p,{type:"resolve-case",incidentId:"falsified-mark-case",method:"exoneration"}).ok,false);
 p=act(p,{type:"inspect-alibi"}).progress;
 p=act(p,{type:"resolve-case",incidentId:"falsified-mark-case",method:"exoneration"}).progress;
 assert.equal(p.detention,null);assert.equal(p.declaration,"recognized");assert.equal(p.incidents[0].resolution,"exoneration");
 assert.equal(act(detain(),{type:"resolve-case",incidentId:"ritual-trophy-case",method:"exoneration"}).ok,false);
});
test("a valid contest can close a forged case before detention",()=>{
 let p=act(warrant("investigator"),{type:"inspect-alibi"}).progress;
 p=act(p,{type:"request-control",jurisdictionId:"homeworld"}).progress;
 const r=act(p,{type:"answer-control",response:"contest"});
 assert.equal(r.ok,true);assert.equal(r.progress.detention,null);assert.equal(r.progress.warrants[0].status,"resolved");
});
test("explicit refusal declares Bad Blood once without changing capture doctrine",()=>{
 const first=act(warrant(),{type:"defy-warrant"});assert.equal(first.ok,true);assert.equal(first.progress.declaration,"bad-blood");
 const again=act(first.progress,{type:"defy-warrant"});assert.equal(again.changed,false);assert.deepEqual(again.progress,first.progress);
 assert.equal(first.progress.warrants[0].policy,"capture-alive");assert.equal(first.progress.honor,undefined);
});
test("pressure and cooldown can fall while transmitted evidence and mandates persist",()=>{
 let p=act(warrant(),{type:"request-control",jurisdictionId:"homeworld"}).progress;
 p=act(p,{type:"answer-control",response:"evade"}).progress;
 assert.equal(p.pressure.homeworld,3);assert.equal(p.intervention.cooldownTicks,1800);
 assert.equal(act(p,{type:"request-control",jurisdictionId:"homeworld"}).ok,false);
 p=act(p,{type:"break-contact",jurisdictionId:"homeworld"}).progress;
 assert.equal(p.pressure.homeworld,2);assert.equal(p.warrants[0].status,"active");
 p=advanceJusticeTime(p,1800);assert.equal(p.intervention.cooldownTicks,0);assert.equal(p.intervention.remainingBudget,2);
 assert.equal(p.warrants[0].status,"active");assert.deepEqual(p.evidence[0].transmittedTo,["homeworld"]);
});
test("an escape creates one independent case without duplicating the original or losing property",()=>{
 const r=act(detain(),{type:"escape"});assert.equal(r.ok,true);
 assert.equal(r.progress.detention,null);assert.equal(r.progress.incidents.length,2);assert.equal(r.progress.warrants.length,2);
 assert.equal(r.progress.incidents[0].id,"ritual-trophy-case");assert.equal(r.progress.incidents[1].id,"custody-escape-case");
 assert.equal(act(r.progress,{type:"escape"}).changed,false);
 let p=detain(advanceJusticeTime(r.progress,1800));assert(p.detention);
 assert.equal(act(p,{type:"escape"}).ok,false);
 p=act(p,{type:"resolve-case",incidentId:"ritual-trophy-case",method:"restitution"}).progress;
 assert(p.detention,"the separate escape case still needs resolution");
 p=act(p,{type:"resolve-case",incidentId:"custody-escape-case",method:"conditional-release"}).progress;
 assert.equal(p.detention,null);assert.equal(p.warrants.filter(w=>w.status==="active").length,0);
});
test("a detention ignores pressure cooldown and always retains an immediate conditional exit",()=>{
 const p=detain();assert.deepEqual(advanceJusticeTime(p,3600),p);
 assert.equal(act(p,{type:"break-contact",jurisdictionId:"homeworld"}).ok,false);
 assert.equal(act(p,{type:"resolve-case",incidentId:"ritual-trophy-case",method:"conditional-release"}).progress.detention,null);
});
test("normalization rejects orphan mandates, forged seizure and duplicate bounded records",()=>{
 const valid=warrant();const p=normalizeJusticeProgress({...valid,incidents:[...valid.incidents,...valid.incidents],evidence:[...valid.evidence,...valid.evidence],warrants:[...valid.warrants,...valid.warrants],pressure:{"homeworld":Infinity,"frontier":100},clandestineNotoriety:999});
 assert.equal(p.incidents.length,1);assert.equal(p.evidence.length,1);assert.equal(p.warrants.length,1);
 assert.equal(p.pressure.homeworld,0);assert.equal(p.pressure.frontier,5);assert.equal(p.clandestineNotoriety,20);
 assert.equal(normalizeJusticeProgress({...valid,identifications:[]}).warrants.length,0);
 assert.equal(normalizeJusticeProgress({...valid,evidence:[]}).warrants.length,0);
 const captive=detain();assert.equal(normalizeJusticeProgress({...captive,detention:{...captive.detention,equipmentPolicy:"destroyed"}}).detention.equipmentPolicy,"retained");
 assert.deepEqual(normalizeJusticeProgress({...valid,version:2}),defaultJusticeProgress());
});
test("persistent states survive JSON round-trips without resurrection of a resolved case",()=>{
 const cases=[defaultJusticeProgress(),choose("rupture"),warrant(),warrant("investigator"),detain(),act(detain(),{type:"escape"}).progress,act(detain(),{type:"resolve-case",incidentId:"ritual-trophy-case",method:"restitution"}).progress];
 for(const p of cases)assert.deepEqual(normalizeJusticeProgress(JSON.parse(JSON.stringify(p))),p);
});

test("a corrupt import cannot exonerate a proven offence or detain under a rejected foreign warrant",()=>{
 const captive=detain();
 const forged=normalizeJusticeProgress({...captive,incidents:captive.incidents.map(i=>({...i,resolved:true,resolution:"exoneration"}))});
 assert.equal(forged.incidents[0].resolved,false);assert.equal(forged.warrants[0].status,"active");
 const foreign=normalizeJusticeProgress({...captive,detention:{...captive.detention,jurisdictionId:"neutral-station"}});
 assert.equal(foreign.detention,null);
});
test("a neutral station cannot decide a foreign case merely because an alibi exists",()=>{
 let p=act(warrant("investigator"),{type:"inspect-alibi"}).progress;
 p=act(p,{type:"request-control",jurisdictionId:"neutral-station"}).progress;
 const r=act(p,{type:"answer-control",response:"contest"});
 assert.equal(r.ok,false);assert.equal(r.progress.incidents[0].resolved,false);
});
test("the actual panel renders the conscious entry choices and a detention with immediate exits",async()=>{
 const {createRequire}=await import("node:module");
 const compiled=await build({
  stdin:{contents:'import React from "react"; import {renderToStaticMarkup} from "react-dom/server"; import Panel from "./app/game/JusticePanel"; export function render(progress){return renderToStaticMarkup(<Panel progress={progress} onProgress={()=>true} onClose={()=>{}}/>)}',resolveDir:process.cwd(),loader:"tsx"},
  bundle:true,write:false,format:"cjs",platform:"node",logLevel:"silent",external:["react","react-dom/server","react/jsx-runtime"],
  plugins:[{name:"css-modules",setup(builder){builder.onLoad({filter:/\.module\.css$/},()=>({contents:"export default {}",loader:"js"}));}}],
 });
 const runtime={exports:{}};
 new Function("require","module","exports",compiled.outputFiles[0].text)(createRequire(import.meta.url),runtime,runtime.exports);
 const fresh=runtime.exports.render(defaultJusticeProgress());
 assert.match(fresh,/Examiner ce choix/);assert.match(fresh,/Dossier des Enforcers/);
 const captive=runtime.exports.render(detain());
 assert.match(captive,/Reddition acceptée/);assert.match(captive,/libération sous conditions/);
 assert.match(captive,/restitution par l/);assert.match(captive,/Conservé/);
 assert.doesNotMatch(captive,/Confirmer ce choix/);
});

test("a conscious public refusal relays active warrants only to allied routes, with identification still required",()=>{
 const before=warrant();
 const result=act(before,{type:"defy-warrant"});
 assert.deepEqual(result.progress.warrants[0].jurisdictionIds,["homeworld","clan-core"]);
 assert.equal(getJusticeRouteControl(result.progress,"clan-core").kind,"identity-check");
 for(const territory of ["frontier","neutral-station","renegade-port"]){
  assert.equal(getJusticeRouteControl(result.progress,territory).kind,"clear");
  assert.equal(result.progress.warrants[0].jurisdictionIds.includes(territory),false);
 }
 assert.equal(act(result.progress,{type:"defy-warrant"}).changed,false);
 assert.deepEqual(before.warrants[0].jurisdictionIds,["homeworld"]);
});
