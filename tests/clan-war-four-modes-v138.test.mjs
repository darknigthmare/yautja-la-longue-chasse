import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const compiled=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarParallelModesV138';",
 "export * from './app/game/systems/clanWarParallelModesV137';",
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarRtsSquadsV133';",
 "export * from './app/game/systems/clanWarMissionTerrainV116';",
 "export * from './app/game/systems/clanWarBibleV6';",
 "export * from './app/game/systems/clanWarSourceMapsV128';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+
 Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const loc=p=>p.x+","+p.y;
function open(mode){
 const base=api.createWarOperationsV115(rules);
 const teamId=base.teams[0].id;
 const site=rules.territories.find(t=>t.id!==base.baseId&&
  !api.warMissionEligibleV115(base,rules,t.id,[teamId]));
 assert.ok(site,"source V6 route should exist");
 const r=api.beginWarOperationV115(base,mode,site.id,[teamId],rules,1000);
 assert.equal(r.accepted,true,r.message);
 return {state:r.state,teamId,siteId:site.id};
}
function beginMedic(){
 // Take REAL W3-U18 V6 cost from the source budget, not a fabricated test unit.
 for(const id of api.WAR_SOURCE_RTS_IDS_V129){
  let draft=api.createWarRtsSquadsV133(id,rules);
  const medic=rules.units.find(u=>u.id==="W3-U18");
  assert.ok(medic&&medic.fullMembers>0);
  // Make space in the source-defined command budget by replacing a default
  // planned group. At least one other real team must remain.
  while(draft.squads.length>=2){
   const possible=api.draftWarRtsSquadV133(draft,"W3-U18",rules);
   if(possible.accepted){
    const start=api.launchWarRtsSquadsV133(possible.state);
    if(start.accepted&&start.state.squads.some(u=>u.unitId!=="W3-U18"))
     return start.state;
   }
   if(draft.squads.length<=1)break;
   const removed=api.removeWarRtsSquadV133(draft,draft.squads.at(-1).id);
   assert.equal(removed.accepted,true,removed.message);
   draft=removed.state;
  }
 }
 assert.fail("No real V6 mission permits one source W3-U18 plus another squad");
}
function medicArena(){
 const origin=beginMedic();
 const med=origin.squads.find(s=>s.unitId==="W3-U18"&&s.status==="active");
 const patient=origin.squads.find(s=>s.id!==med.id&&s.status==="active");
 const available=[{x:med.x+1,y:med.y},{x:med.x-1,y:med.y},
  {x:med.x,y:med.y+1},{x:med.x,y:med.y-1}].find(p=>
  api.warMapWalkableV128(origin.map,p)&&
  !origin.squads.some(u=>u.id!==patient.id&&loc(u)===loc(p)));
 assert.ok(available,"medic should have a physical adjacent accessible tile");
 const state={...origin,enemies:[],map:{...origin.map,hazards:[]},
  squads:origin.squads.map(u=>u.id===patient.id?
   {...u,...available,hp:0,status:"down"}:u)};
 return {state,medicId:med.id,patientId:patient.id};
}

test("Assault: one actual V6 team surges a bounded distance for 12 AP",()=>{
 const {state,teamId}=open("assault");
 const budget={...state,active:{...state.active,
  assault:{...state.active.assault,ap:100}}};
 const spawned=api.deployAssaultUnitV115(budget,teamId,rules);
 assert.equal(spawned.accepted,true,spawned.message);
 const prepared=spawned.state;
 const actor=prepared.active.assault.actors.find(a=>a.teamId===teamId);
 const beforeAp=prepared.active.assault.ap;
 const surged=api.commandWarAssaultSurgeV138(prepared,teamId,rules);
 assert.equal(surged.accepted,true,surged.message);
 const after=surged.state.active.assault;
 const moved=after.actors.find(a=>a.teamId===teamId);
 assert.ok(moved.x>actor.x&&moved.x-actor.x<=5);
 assert.equal(after.ap,beforeAp-12);
 assert.equal(surged.state.rav,prepared.rav);
 assert.equal(surged.state.clock,prepared.clock);
 assert.deepEqual(after.surgeIssuedIds,[teamId]);
 assert.equal(surged.state.teams.length,prepared.teams.length);
 assert.equal(surged.state.reports.length,0);
 assert.ok(api.readWarOperationsV115(JSON.stringify(surged.state),rules));
 const twice=api.commandWarAssaultSurgeV138(surged.state,teamId,rules);
 assert.equal(twice.accepted,false);assert.equal(twice.state,surged.state);
 assert.equal(api.commandWarAssaultSurgeV138(state,teamId,rules).accepted,false);
});

test("Assault: no burst through a rival, no free AP, no bypassing a defensive hold",()=>{
 const {state,teamId}=open("assault");
 const funded={...state,active:{...state.active,assault:{...state.active.assault,ap:100}}};
 const placed=api.deployAssaultUnitV115(funded,teamId,rules).state;
 const actor=placed.active.assault.actors.find(a=>a.teamId===teamId);
 const blocked={...placed,active:{...placed.active,assault:{
  ...placed.active.assault,
  actors:[...placed.active.assault.actors,{id:"RIVAL",teamId:null,unitId:actor.unitId,side:"rival",x:actor.x,hp:8}],
 }}};
 const denied=api.commandWarAssaultSurgeV138(blocked,teamId,rules);
 assert.equal(denied.accepted,false);assert.equal(denied.state,blocked);
 const low={...placed,active:{...placed.active,assault:{...placed.active.assault,ap:11}}};
 assert.equal(api.commandWarAssaultSurgeV138(low,teamId,rules).accepted,false);
 const hold={...placed,active:{...placed.active,assault:{
  ...placed.active.assault,heldUntil:{[teamId]:placed.active.tick+3}}}};
 assert.equal(api.commandWarAssaultSurgeV138(hold,teamId,rules).accepted,false);
 const forged={...placed,active:{...placed.active,assault:{
  ...placed.active.assault,surgeIssuedIds:["unknown"]}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(forged),rules),null);
});

test("Outer Ops: mid-route bulletin shows public terrain and existing fit members, never a victory forecast",()=>{
 const {state,teamId}=open("outer"),order=state.outer[0];
 const original=JSON.stringify(state);
 const due=order.dueAt;
 const mid=order.startedAt+Math.ceil((due-order.startedAt)/2);
 const early=api.requestWarOuterSignalV138(state,order.id,mid-1,rules);
 assert.equal(early.accepted,false);
 assert.equal(early.state,state);
 const received=api.requestWarOuterSignalV138(state,order.id,mid,rules);
 assert.equal(received.accepted,true,received.message);
 const packet=received.state.outer[0].fieldSignal;
 assert.ok(["voie-stable","terrain-expose","transit-complexe"].includes(packet.assessment));
 assert.equal(packet.transmittedAt,mid);
 assert.equal(packet.passages,order.routeIds.length);
 assert.equal(packet.fitMembers,state.teams.find(t=>t.id===teamId).members.filter(p=>p.status==="fit").length);
 assert.equal(received.state.outer[0].dueAt,due);
 assert.equal(received.state.rav,state.rav);
 assert.deepEqual(received.state.assignments,state.assignments);
 assert.deepEqual(received.state.intelIds,state.intelIds);
 assert.equal(received.state.reports.length,0);
 assert.ok(!/victoire|vainqueur|adversaire connu/i.test(received.message));
 assert.ok(api.readWarOperationsV115(JSON.stringify(received.state),rules));
 assert.equal(api.requestWarOuterSignalV138(received.state,order.id,mid+1,rules).accepted,false);
 const settled=api.settleWarOuterOpsV115(received.state,due,rules);
 assert.equal(settled.accepted,true);
 assert.equal(settled.state.reports.length,1);
 assert.ok(settled.state.reports[0].engagementLog.some(t=>t.includes("Bulletin V138")));
 assert.equal(JSON.stringify(state),original,"source object must remain immutable");
});

test("Outer Ops: recall or falsified time, source and packet cannot reveal distant opposition",()=>{
 const {state}=open("outer"),m=state.outer[0];
 const afterDue=api.requestWarOuterSignalV138(state,m.id,m.dueAt,rules);
 assert.equal(afterDue.accepted,false);assert.equal(afterDue.state,state);
 const recalled=api.recallWarOuterMissionV116(state,m.id,m.startedAt+1000,rules);
 assert.equal(recalled.accepted,true);
 assert.equal(api.requestWarOuterSignalV138(recalled.state,m.id,m.startedAt+3000,rules).accepted,false);
 const mid=m.startedAt+Math.ceil((m.dueAt-m.startedAt)/2);
 const sent=api.requestWarOuterSignalV138(state,m.id,mid,rules);
 assert.equal(sent.accepted,true);
 for(const signal of [
  {...sent.state.outer[0].fieldSignal,passages:999},
  {...sent.state.outer[0].fieldSignal,transmittedAt:m.startedAt},
  {...sent.state.outer[0].fieldSignal,fitMembers:0},
  {...sent.state.outer[0].fieldSignal,assessment:"canonic-aliens-position"}
 ]){
  const forged={...sent.state,outer:[{...sent.state.outer[0],fieldSignal:signal}]};
  assert.equal(api.readWarOperationsV115(JSON.stringify(forged),rules),null);
 }
});

test("Stealth: acoustic contact is available only from a real W3 covered location and returns bearing, not x",()=>{
 const {state,siteId}=open("stealth");
 const terrain=api.warMissionTerrainV116(siteId,rules);
 const cover=terrain.cover.find(c=>{
  const [x,y]=c.split(",").map(Number);
  return distance({x,y},{x:6,y:2})<=5;
 });
 assert.ok(cover);
 const [x,y]=cover.split(",").map(Number);
 const staged={...state,active:{...state.active,
  stealth:{...state.active.stealth,x,y,guardX:6,guardDirection:-1,energy:5,alarm:0}}};
 const listen=api.commandStealthV115(staged,"listen",rules);
 assert.equal(listen.accepted,true,listen.message);
 const hunter=listen.state.active.stealth;
 assert.equal(hunter.energy,4);
 assert.equal(hunter.acousticUsed,1);
 assert.ok(["est","ouest","proche"].includes(hunter.heardBearing));
 assert.equal(hunter.heardAtTick,listen.state.active.tick);
 assert.equal(listen.state.clock,staged.clock+1);
 assert.equal(listen.state.rav,staged.rav);
 assert.ok(api.readWarOperationsV115(JSON.stringify(listen.state),rules));
 assert.equal(api.warStealthSoundBearingV138(hunter,listen.state.active.tick),hunter.heardBearing);
 assert.equal(api.warStealthSoundBearingV138(hunter,listen.state.active.tick+3),null);
 assert.ok(!listen.message.includes("("+hunter.guardX+",2)"),"no exact source position in acoustic report");
});

test("Stealth: fog of war hides an unobservable guard, and hearing has no permanent omniscience",()=>{
 const {state,siteId}=open("stealth");
 const map=api.warMissionTerrainV116(siteId,rules);
 const far={...state.active.stealth,x:1,y:4,guardX:7};
 assert.equal(api.warStealthGuardVisibleV138(far,map),false);
 const clear={...far,x:7,y:2};
 assert.equal(api.warStealthGuardVisibleV138(clear,map),true);
 const noCover=api.commandStealthV115(state,"listen",rules);
 assert.equal(noCover.accepted,false);assert.equal(noCover.state,state);
 const inCover=map.cover[0].split(",").map(Number);
 const capped={...state,active:{...state.active,
  stealth:{...state.active.stealth,x:inCover[0],y:inCover[1],energy:5,acousticUsed:2}}};
 assert.equal(api.commandStealthV115(capped,"listen",rules).accepted,false);
 const corrupt={...state,active:{...state.active,
  stealth:{...state.active.stealth,acousticUsed:4}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(corrupt),rules),null);
});

test("RTS: real W3-U18 can stabilize a down squad at one physical step, spending 3 RAV",()=>{
 const {state,medicId,patientId}=medicArena();
 const from=state.squads.find(u=>u.id===patientId);
 const medic=state.squads.find(u=>u.id===medicId);
 assert.equal(distance(from,medic),1);
 const before=state.ravRemaining;
 const report=api.commandWarRtsMedicV138(state,medicId,patientId,rules);
 assert.equal(report.accepted,true,report.message);
 assert.equal(report.state.turn,state.turn+1);
 assert.equal(report.state.ravRemaining,before-3);
 const rescued=report.state.squads.find(u=>u.id===patientId);
 assert.equal(rescued.status,"active");
 assert.ok(rescued.hp>=2&&rescued.hp<=4);
 assert.equal(rescued.memberCount,from.memberCount);
 assert.equal(rescued.unitId,from.unitId);
 assert.equal(rescued.id,from.id);
 assert.equal(report.state.squads.length,state.squads.length);
 assert.deepEqual(report.state.triageReceipts.map(r=>r.rescuedSquadId),[patientId]);
 assert.equal(report.state.report,null);
 assert.equal(state.squads.find(u=>u.id===patientId).hp,0);
 assert.equal(api.commandWarRtsMedicV138(report.state,medicId,patientId,rules).accepted,false);
});

test("RTS: no remote medical teleport, unavailable RAV, false medic role or repeated rescue",()=>{
 const {state,medicId,patientId}=medicArena();
 const med=state.squads.find(u=>u.id===medicId);
 const down=state.squads.find(u=>u.id===patientId);
 const far={...state,squads:state.squads.map(u=>u.id===patientId?
  {...u,x:state.map.goal.x,y:state.map.goal.y}:u)};
 assert.ok(distance(med,far.squads.find(u=>u.id===patientId))>1);
 const d=api.commandWarRtsMedicV138(far,medicId,patientId,rules);
 assert.equal(d.accepted,false);assert.equal(d.state,far);
 const noSupply={...state,ravRemaining:2};
 assert.equal(api.commandWarRtsMedicV138(noSupply,medicId,patientId,rules).accepted,false);
 const spoof={...state,squads:state.squads.map(u=>u.id===medicId?
  {...u,unitId:"W3-U01"}:u)};
 assert.equal(api.commandWarRtsMedicV138(spoof,medicId,patientId,rules).accepted,false);
 const used={...state,triageReceipts:[{medicSquadId:medicId,
   rescuedSquadId:patientId,atTurn:1,memberCount:down.memberCount}]};
 assert.equal(api.commandWarRtsMedicV138(used,medicId,patientId,rules).accepted,false);
 const mismatched={...state,sourceSha:"evil"};
 assert.equal(api.commandWarRtsMedicV138(mismatched,medicId,patientId,rules).accepted,false);
});

test("Provenance: 24 real W3 missions and 12 distinct maps remain, free V6 practice cannot capture V85",()=>{
 const audit=api.auditWarRtsSquadsV133(rules);
 assert.deepEqual(audit.issues,[]);
 assert.equal(audit.missions,24);assert.equal(audit.steps,72);
 const world=api.createWarOperationsV115(rules);
 assert.equal(world.context,"free");
 assert.equal(world.reports.length,0);
 assert.equal(Object.keys(world.pressure).length,0);
});
