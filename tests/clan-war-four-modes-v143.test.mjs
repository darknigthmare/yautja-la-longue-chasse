import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
const compiled=await build({
 stdin:{contents:[
 "export * from './app/game/systems/clanWarBraceV143';",
 "export * from './app/game/systems/clanWarOuterIncidentV143';",
 "export * from './app/game/systems/clanWarStealthDashV143';",
 "export * from './app/game/systems/clanWarRtsMarchV143';",
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarAssaultContactV141';",
 "export * from './app/game/systems/clanWarOuterWeightedProgressV141';",
 "export * from './app/game/systems/clanWarRtsSquadsV133';",
 "export * from './app/game/systems/clanWarRtsWaypointV142';",
 "export * from './app/game/systems/clanWarMissionTerrainV116';",
 "export * from './app/game/systems/clanWarBibleV6';",
 "export * from './app/game/systems/clanWarRtsSourceMissionsV129';",
 ].join("\n"),resolveDir:process.cwd()},
 bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent",
});
const api=await import("data:text/javascript;base64,"+
 Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const at=p=>p.x+","+p.y,dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const start=(mode)=>{
 const original=api.createWarOperationsV115(rules);
 const team=original.teams[0].id;
 const target=rules.territories.find(t=>t.id!==original.baseId&&
   !api.warMissionEligibleV115(original,rules,t.id,[team]));
 assert.ok(target,"actual source V6 route is required");
 const begun=api.beginWarOperationV115(original,mode,target.id,[team],rules,1000);
 assert.equal(begun.accepted,true,begun.message);
 return {state:begun.state,team,site:target.id};
};
const deployed=()=>{
 const {state,team}=start("assault");
 const boost={...state,active:{...state.active,
  assault:{...state.active.assault,ap:100}}};
 const joined=api.deployAssaultUnitV115(boost,team,rules);
 assert.equal(joined.accepted,true,joined.message);
 return {state:joined.state,team};
};
const rts=(id="W3-RTS01")=>{
 const result=api.launchWarRtsSquadsV133(api.createWarRtsSquadsV133(id,rules));
 assert.equal(result.accepted,true,result.message);
 return result.state;
};
const sourceIncident=(s)=>{
 const order=s.outer[0];
 for(let time=order.startedAt+1;time<order.dueAt;time+=250){
  const source=api.warOuterIncidentV143(order,time,rules);
  if(source)return {order,time,source};
 }
 return null;
};

test("Assault V143: paid 14-AP stance mitigates actual incoming fire for two exchanges only",()=>{
 const {state,team}=deployed();
 const actor=state.active.assault.actors.find(a=>a.teamId===team);
 const rival={id:"V143-rival",teamId:null,side:"rival",unitId:actor.unitId,
  x:actor.x+3,hp:34};
 const combat={...state,active:{...state.active,
  assault:{...state.active.assault,actors:[...state.active.assault.actors,rival]}}};
 const braced=api.commandWarAssaultBraceV143(combat,team,rules);
 assert.equal(braced.accepted,true,braced.message);
 assert.equal(braced.state.active.assault.ap,combat.active.assault.ap-14);
 assert.equal(braced.state.rav,combat.rav);
 assert.equal(braced.state.clock,combat.clock);
 assert.deepEqual(braced.state.active.assault.braceUsedIds,[team]);
 assert.equal(braced.state.active.assault.bracedUntil[team],3);
 assert.ok(api.readWarOperationsV115(JSON.stringify(braced.state),rules));
 const pure=api.warAssaultContactV141(combat.active.assault.actors,rules,{},1);
 const guarded=api.warAssaultContactV141(combat.active.assault.actors,rules,{},1,{},{
  [team]:3,
 });
 const normalHp=pure.actors.find(a=>a.teamId===team).hp;
 const bracedHp=guarded.actors.find(a=>a.teamId===team).hp;
 assert.equal(bracedHp-normalHp,1,"exactly one point mitigated per physical strike");
 const next=api.stepAssaultV115(braced.state,rules);
 assert.equal(next.accepted,true,next.message);
 assert.equal(next.state.active.assault.actors.find(a=>a.teamId===team).hp,bracedHp);
 const noRepeat=api.commandWarAssaultBraceV143(next.state,team,rules);
 assert.equal(noRepeat.accepted,false);assert.equal(noRepeat.state,next.state);
 const third={...braced.state,active:{...braced.state.active,tick:3}};
 const expired=api.warAssaultContactV141(combat.active.assault.actors,rules,{},4,{},{
  [team]:3,
 });
 assert.equal(expired.actors.find(a=>a.teamId===team).hp,normalHp);
 assert.equal(third.active.tick,3);
});

test("Assault V143: fake source, remote base, depleted AP, forged guard until all reject safely",()=>{
 const {state,team}=deployed();
 const outOfRange={...state,active:{...state.active,
  assault:{...state.active.assault,actors:state.active.assault.actors.map(a=>({
   ...a,x:67,
  }))}}};
 assert.equal(api.commandWarAssaultBraceV143(outOfRange,team,rules).accepted,false);
 const broke={...state,active:{...state.active,
  assault:{...state.active.assault,ap:13}}};
 const denied=api.commandWarAssaultBraceV143(broke,team,rules);
 assert.equal(denied.accepted,false);assert.equal(denied.state,broke);
 const forged={...state,active:{...state.active,assault:{
  ...state.active.assault,braceUsedIds:[team],bracedUntil:{[team]:99}}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(forged),rules),null);
 const alien={...state,sourceSha:"fabricated"};
 assert.equal(api.commandWarAssaultBraceV143(alien,team,rules).accepted,false);
});

test("Outer Ops V143: only actual current V6 source-passage incidents can be resolved",()=>{
 let found=null;
 const original=api.createWarOperationsV115(rules),team=original.teams[0].id;
 for(const territory of rules.territories){
  if(territory.id===original.baseId||
     api.warMissionEligibleV115(original,rules,territory.id,[team]))continue;
  const r=api.beginWarOperationV115(original,"outer",territory.id,[team],rules,1000);
  if(!r.accepted)continue;
  const encounter=sourceIncident(r.state);
  if(encounter){found={state:r.state,...encounter};break;}
 }
 assert.ok(found,"at least one of the actual source V6 passages contains public incident/condition");
 assert.ok(rules.passages.some(p=>p.id===found.source.passageId&&
  (p.incident?.trim()||p.condition?.trim())));
 assert.ok(found.order.routeIds.includes(found.source.passageId));
 const earlier=api.warOuterIncidentV143(found.order,found.order.startedAt,rules);
 assert.equal(earlier,null);
 const before=api.simulateWarOuterMissionV115(found.state,found.order,rules);
 const result=api.commandWarOuterIncidentV143(found.state,found.order.id,
  "secure",found.time,rules);
 assert.equal(result.accepted,true,result.message);
 assert.equal(result.state.rav,found.state.rav-2);
 const updated=result.state.outer[0];
 assert.equal(updated.dueAt,found.order.dueAt);
 assert.equal(updated.routeIncident.kind,"secure");
 assert.equal(updated.routeIncident.paidRav,2);
 assert.equal(updated.routeIncident.passageId,found.source.passageId);
 assert.deepEqual(updated.teamIds,found.order.teamIds);
 assert.deepEqual(updated.routeIds,found.order.routeIds);
 assert.equal(result.state.reports.length,0);
 assert.ok(api.readWarOperationsV115(JSON.stringify(result.state),rules));
 const after=api.simulateWarOuterMissionV115(result.state,updated,rules);
 assert.equal(after.strength-before.strength,3);
 assert.ok(after.engagementLog.some(t=>t.includes("Incident de passage V143")));
 const repeated=api.commandWarOuterIncidentV143(result.state,updated.id,
  "detour",found.time+1,rules);
 assert.equal(repeated.accepted,false);assert.equal(repeated.state,result.state);
});

test("Outer Ops V143: physically delayed detour spends no RAV and freezes route for ten seconds",()=>{
 const {state}=start("outer"),encounter=sourceIncident(state);
 assert.ok(encounter,"baseline W3 passage has a public incident");
 const {order,time}=encounter;
 const result=api.commandWarOuterIncidentV143(state,order.id,"detour",time,rules);
 assert.equal(result.accepted,true,result.message);
 const delayed=result.state.outer[0];
 assert.equal(delayed.dueAt,order.dueAt+10000);
 assert.equal(delayed.routeIncident.originalDueAt,order.dueAt);
 assert.equal(delayed.routeIncident.paidRav,0);
 assert.equal(result.state.rav,state.rav);
 const startProgress=api.warOuterWeightedProgressV141(delayed,time,rules);
 const pauseProgress=api.warOuterWeightedProgressV141(delayed,time+3000,rules);
 assert.equal(startProgress.legProgress,pauseProgress.legProgress,"detour advanced as if no pause");
 assert.equal(api.settleWarOuterOpsV115(result.state,order.dueAt,rules).accepted,false);
 assert.ok(api.readWarOperationsV115(JSON.stringify(result.state),rules));
 const settled=api.settleWarOuterOpsV115(result.state,delayed.dueAt,rules);
 assert.equal(settled.accepted,true);
 assert.equal(settled.state.reports.length,1);
 assert.equal(settled.state.outer.length,0);
});

test("Outer Ops V143: forged incident, wrong resource cost, recall and second response are rejected",()=>{
 const {state}=start("outer"),encounter=sourceIncident(state);
 assert.ok(encounter);
 const done=api.commandWarOuterIncidentV143(state,encounter.order.id,
  "secure",encounter.time,rules);
 assert.equal(done.accepted,true);
 for(const receipt of [
  {...done.state.outer[0].routeIncident,sourceIncident:"injected enemy radio"},
  {...done.state.outer[0].routeIncident,paidRav:0},
  {...done.state.outer[0].routeIncident,originalDueAt:1}
 ]){
  const forged={...done.state,outer:[{...done.state.outer[0],routeIncident:receipt}]};
  assert.equal(api.readWarOperationsV115(JSON.stringify(forged),rules),null);
 }
 const recall=api.recallWarOuterMissionV116(state,encounter.order.id,encounter.time,rules);
 assert.equal(recall.accepted,true);
 assert.equal(api.commandWarOuterIncidentV143(recall.state,encounter.order.id,"secure",
  encounter.time+1,rules).accepted,false);
 const invalid=api.commandWarOuterIncidentV143(state,encounter.order.id,"magic",
  encounter.time,rules);
 assert.equal(invalid.accepted,false);assert.equal(invalid.state,state);
});

test("Stealth V143: a two-tile dash burns two energy and triggers two actual patrol decisions",()=>{
 const {state}=start("stealth");
 const dash=api.commandWarStealthDashV143(state,"up",rules);
 assert.equal(dash.accepted,true,dash.message);
 assert.equal(dash.state.clock,state.clock+2);
 assert.equal(dash.state.active.tick,state.active.tick+2);
 assert.equal(dash.state.active.stealth.y,state.active.stealth.y-2);
 assert.equal(dash.state.active.stealth.x,state.active.stealth.x);
 assert.equal(dash.state.active.stealth.energy,state.active.stealth.energy-2);
 assert.equal(dash.state.active.stealth.dashUsed,true);
 assert.equal(dash.state.active.stealth.sabotaged,false);
 assert.equal(dash.state.reports.length,0);
 assert.ok(api.readWarOperationsV115(JSON.stringify(dash.state),rules));
 const second=api.commandWarStealthDashV143(dash.state,"up",rules);
 assert.equal(second.accepted,false);assert.equal(second.state,dash.state);
});

test("Stealth V143: no unauthorized wall-skipping, cloaked dash, no-energy dash or forged archive",()=>{
 const {state}=start("stealth");
 const failed=api.commandWarStealthDashV143(state,"left",rules);
 assert.equal(failed.accepted,false);assert.equal(failed.state,state);
 const cloak={...state,active:{...state.active,stealth:{
  ...state.active.stealth,cloaked:true}}};
 assert.equal(api.commandWarStealthDashV143(cloak,"up",rules).accepted,false);
 const low={...state,active:{...state.active,stealth:{
  ...state.active.stealth,energy:1}}};
 assert.equal(api.commandWarStealthDashV143(low,"up",rules).accepted,false);
 const forged={...state,active:{...state.active,stealth:{
  ...state.active.stealth,dashUsed:"yes"}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(forged),rules),null);
 const next=api.commandWarStealthDashV143(state,"up",rules);
 assert.equal(next.accepted,true);
 assert.equal(state.active.stealth.dashUsed,undefined,"original state not mutated");
});

test("RTS V143: three-step march advances physical tiles, enemy turns and preserves RAV",()=>{
 let count=0;
 for(const id of api.WAR_SOURCE_RTS_IDS_V129){
  const s=rts(id),ally=s.squads[0];
  const plan=api.planWarRtsWaypointV142(s,ally.id,"observation");
  if(!plan)continue;
  const result=api.commandWarRtsMarchV143(s,ally.id,"observation",3);
  assert.equal(result.accepted,true,id+": "+result.message);
  const turns=result.state.turn-s.turn;
  assert.ok(turns>=1&&turns<=3,"max 3 real enemy ticks");
  const next=result.state.squads.find(a=>a.id===ally.id);
  assert.ok(dist(next,ally)<=3,"no free teleport");
  assert.equal(result.state.ravRemaining,s.ravRemaining);
  assert.equal(result.state.map.planetId,s.map.planetId);
  assert.equal(result.state.mission.id,s.mission.id);
  assert.equal(result.state.report?.campaignMutation??false,false);
  count++;
 }
 assert.ok(count>=6,"multiple physical source maps need guided movement");
});

test("RTS V143: no hidden-objective autopilot, phase bypass, fake squad or new territory control",()=>{
 const s=rts(),unit=s.squads[0];
 assert.equal(s.observed,false);
 const hidden=api.commandWarRtsMarchV143(s,unit.id,"objective",3);
 assert.equal(hidden.accepted,false);assert.equal(hidden.state,s);
 const wrong=api.commandWarRtsMarchV143(s,unit.id,"magic",3);
 assert.equal(wrong.accepted,false);assert.equal(wrong.state,s);
 const fake=api.commandWarRtsMarchV143(s,"not-a-real-team","observation",3);
 assert.equal(fake.accepted,false);assert.equal(fake.state,s);
 const ended={...s,phase:"defeat"};
 assert.equal(api.commandWarRtsMarchV143(ended,unit.id,"observation",3).accepted,false);
 assert.equal(api.createWarOperationsV115(rules).context,"free");
});

test("V143 still preserves all 24 W3 scenarios and the V6 source without a campaign mutation",()=>{
 const audit=api.auditWarRtsSquadsV133(rules);
 assert.equal(audit.missions,24);
 assert.equal(audit.steps,72);
 assert.deepEqual(audit.issues,[]);
 const s=api.createWarOperationsV115(rules);
 assert.equal(Object.keys(s.pressure).length,0);
 assert.equal(s.reports.length,0);
});
