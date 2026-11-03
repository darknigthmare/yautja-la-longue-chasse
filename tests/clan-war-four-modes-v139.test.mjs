import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
const compiled=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarParallelModesV139';",
 "export * from './app/game/systems/clanWarParallelModesV137';",
 "export * from './app/game/systems/clanWarRtsSourceMissionsV129';",
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarRtsSquadsV133';",
 "export * from './app/game/systems/clanWarBibleV6';",
 "export * from './app/game/systems/clanWarMissionTerrainV116';",
 "export * from './app/game/systems/clanWarSourceMapsV128';",
 ].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 platform:"node",format:"esm",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const make=(mode)=>{
 const state=api.createWarOperationsV115(rules);
 const team=state.teams[0].id;
 const site=rules.territories.find(t=>t.id!==state.baseId&&!api.warMissionEligibleV115(state,rules,t.id,[team]));
 assert.ok(site,"source route must exist");
 const opened=api.beginWarOperationV115(state,mode,site.id,[team],rules,1000);
 assert.equal(opened.accepted,true,opened.message);
 return {state:opened.state,team,site:site.id};
};
const assault=()=>{
 const m=make("assault"),setup={...m.state,active:{...m.state.active,
  assault:{...m.state.active.assault,ap:100}}};
 const joined=api.deployAssaultUnitV115(setup,m.team,rules);
 assert.equal(joined.accepted,true,joined.message);
 return {state:joined.state,team:m.team};
};
const rts=()=> {
 const s=api.createWarRtsSquadsV133("W3-RTS01",rules);
 const launch=api.launchWarRtsSquadsV133(s);
 assert.equal(launch.accepted,true,launch.message);
 return launch.state;
};

test("assault: controlled return advances only back toward real bastion, spends AP, retains member identity",()=>{
 const {state,team}=assault(),actor=state.active.assault.actors.find(u=>u.teamId===team);
 const start={...state,active:{...state.active,assault:{
  ...state.active.assault,actors:state.active.assault.actors.map(u=>u.teamId===team?{...u,x:45}:u)}}};
 const result=api.fallbackWarAssaultV139(start,team,rules);
 assert.equal(result.accepted,true,result.message);
 const current=result.state.active.assault;
 const moved=current.actors.find(u=>u.teamId===team);
 assert.ok(moved.x<45&&moved.x>=40,"physically bounded backward step");
 assert.equal(moved.id,actor.id);
 assert.equal(current.ap,start.active.assault.ap-8);
 assert.deepEqual(current.fallbackCounts,{[team]:1});
 assert.equal(result.state.rav,state.rav);
 assert.equal(result.state.clock,state.clock);
 assert.equal(result.state.reports.length,0);
 assert.equal(result.state.teams.length,state.teams.length);
 assert.ok(api.readWarOperationsV115(JSON.stringify(result.state),rules));
 assert.equal(start.active.assault.actors.find(u=>u.teamId===team).x,45);
 let next=result.state;
 for(let k=0;k<20&&next.active.assault.actors.find(u=>u.teamId===team).x>18;k++){
  const step=api.fallbackWarAssaultV139(next,team,rules);
  assert.equal(step.accepted,true,step.message);
  next=step.state;
 }
 assert.ok(next.active.assault.actors.find(u=>u.teamId===team).x<=18);
 const withdrawn=api.withdrawWarAssaultSquadV137(next,team,rules);
 assert.equal(withdrawn.accepted,true,withdrawn.message);
 assert.deepEqual(withdrawn.state.active.assault.extractedIds,[team]);
 assert.equal(api.fallbackWarAssaultV139(withdrawn.state,team,rules).accepted,false);
});

test("assault: a rear enemy is never crossed and forbidden orders preserve exactly same state",()=>{
 const {state,team}=assault();
 const first=state.active.assault.actors.find(u=>u.teamId===team);
 const withActor={...state,active:{...state.active,assault:{
  ...state.active.assault,actors:[
   {...first,x:40},{id:"rival-near",teamId:null,unitId:first.unitId,side:"rival",x:39,hp:12}]}}};
 const denied=api.fallbackWarAssaultV139(withActor,team,rules);
 assert.equal(denied.accepted,false);assert.equal(denied.state,withActor);
 const noAp={...state,active:{...state.active,assault:{
  ...state.active.assault,ap:7,actors:[{...first,x:40}]}}};
 assert.equal(api.fallbackWarAssaultV139(noAp,team,rules).accepted,false);
 const forged={...state,active:{...state.active,assault:{
  ...state.active.assault,fallbackCounts:{[team]:21}}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(forged),rules),null);
 const noRoster={...state,active:{...state.active,assault:{
  ...state.active.assault,fallbackCounts:{"outside-team":1}}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(noRoster),rules),null);
});

test("Outer Ops: dispatch freezes intel, sabotage, escort and pressure instead of retroactive cross-mode bonuses",()=>{
 const {state,site}=make("outer"),order=state.outer[0];
 assert.deepEqual(order.departureContext,{intel:false,weakened:false,escorted:false,pressure:0});
 const reference=api.simulateWarOuterMissionV115(state,order,rules);
 const later={...state,
  intelIds:[site],weakenedIds:[site],escortedIds:[site],pressure:{[site]:20}};
 const future=api.simulateWarOuterMissionV115(later,order,rules);
 assert.equal(future.strength,reference.strength);
 assert.equal(future.threat,reference.threat);
 assert.equal(future.outcome,reference.outcome);
 assert.deepEqual(future.woundedTeamIds,reference.woundedTeamIds);
 assert.ok(api.readWarOperationsV115(JSON.stringify(state),rules));
 const completed=api.settleWarOuterOpsV115(later,order.dueAt,rules);
 assert.equal(completed.accepted,true);
 assert.ok(completed.state.reports[0].engagementLog.some(s=>s.includes("Briefing V139")));
 assert.equal(completed.state.outer.length,0);
 assert.equal(completed.state.reports.length,1);
 assert.equal(api.settleWarOuterOpsV115(completed.state,order.dueAt,rules).accepted,false);
});

test("Outer Ops: a new mandate captures what is already known; old archive without snapshot still parses",()=>{
 const {state,site}=make("outer"),first=state.outer[0];
 const boosted={...state,intelIds:[site],weakenedIds:[site],
  escortedIds:[site],pressure:{[site]:3}};
 const originalContext=api.simulateWarOuterMissionV115(state,first,rules);
 const legacy={...first};delete legacy.departureContext;
 const v115Archive={...state,outer:[legacy]};
 assert.ok(api.readWarOperationsV115(JSON.stringify(v115Archive),rules),
  "pre-V139 persisted mandate remains readable");
 const legacyScore=api.simulateWarOuterMissionV115(boosted,legacy,rules);
 assert.ok(legacyScore.strength>originalContext.strength);
 // A fresh mandate in an already-informed world is source-bounded at dispatch.
 const other=api.createWarOperationsV115(rules),team=other.teams[0].id;
 const staged={...other,intelIds:[site],weakenedIds:[site],escortedIds:[site],pressure:{[site]:3}};
 const begun=api.beginWarOperationV115(staged,"outer",site,[team],rules,1500);
 assert.equal(begun.accepted,true,begun.message);
 assert.deepEqual(begun.state.outer[0].departureContext,{
  intel:true,weakened:true,escorted:true,pressure:3,
 });
 const corrupt={...begun.state,outer:[{...begun.state.outer[0],
  departureContext:{intel:1,weakened:true,escorted:true,pressure:3}}]};
 assert.equal(api.readWarOperationsV115(JSON.stringify(corrupt),rules),null);
 const over={...begun.state,outer:[{...begun.state.outer[0],
  departureContext:{intel:true,weakened:true,escorted:true,pressure:21}}]};
 assert.equal(api.readWarOperationsV115(JSON.stringify(over),rules),null);
});

test("stealth: quiet relay sabotage consumes exactly two energy and avoids automatic alarm if guard is far",()=>{
 const {state,site}=make("stealth"),terrain=api.warMissionTerrainV116(site,rules);
 const point={x:terrain.relay.x,y:terrain.relay.y-1};
 assert.equal(api.warTerrainCellBlockedV116(terrain,point.x,point.y),false);
 const positioned={...state,active:{...state.active,stealth:{
  ...state.active.stealth,...point,guardX:4,guardDirection:1,
  energy:5,alarm:0,cloaked:false}}};
 const result=api.commandStealthV115(positioned,"quiet-sabotage",rules);
 assert.equal(result.accepted,true,result.message);
 const after=result.state.active.stealth;
 assert.equal(after.sabotaged,true);
 assert.equal(after.silentSabotageUsed,true);
 assert.equal(after.energy,3);
 assert.equal(after.alarm,0);
 assert.equal(result.state.clock,state.clock+1);
 assert.equal(result.state.rav,state.rav);
 assert.equal(result.state.reports.length,0);
 assert.equal(result.state.intelIds.includes(site),false,"no victory before extraction");
 assert.ok(api.readWarOperationsV115(JSON.stringify(result.state),rules));
 const double=api.commandStealthV115(result.state,"quiet-sabotage",rules);
 assert.equal(double.accepted,false);assert.equal(double.state,result.state);
});

test("stealth: no remote, close-guard, invisible-resource or forged silent action",()=>{
 const {state}=make("stealth");
 const before=api.commandStealthV115(state,"quiet-sabotage",rules);
 assert.equal(before.accepted,false);assert.equal(before.state,state);
 const remote={...state,active:{...state.active,stealth:{
  ...state.active.stealth,x:7,y:0,guardX:7,energy:5}}};
 assert.equal(api.commandStealthV115(remote,"quiet-sabotage",rules).accepted,false);
 const empty={...remote,active:{...remote.active,stealth:{
  ...remote.active.stealth,guardX:4,energy:1}}};
 assert.equal(api.commandStealthV115(empty,"quiet-sabotage",rules).accepted,false);
 const forged={...remote,active:{...remote.active,stealth:{
  ...remote.active.stealth,silentSabotageUsed:true,sabotaged:false}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(forged),rules),null);
});

test("RTS: an actual living squad may leave at real exit but another must remain",()=>{
 const source=rts(),unit=source.squads[0];
 const staged={...source,enemies:[],map:{...source.map,hazards:[]},
  squads:source.squads.map(u=>u.id===unit.id?
   {...u,x:source.map.extraction.x,y:source.map.extraction.y}:u)};
 const result=api.evacuateWarRtsSquadV139(staged,unit.id);
 assert.equal(result.accepted,true,result.message);
 assert.equal(result.state.turn,staged.turn+1);
 assert.equal(result.state.ravRemaining,staged.ravRemaining);
 assert.equal(result.state.squads.length,staged.squads.length);
 const left=result.state.squads.find(u=>u.id===unit.id);
 assert.equal(left.status,"evacuated");
 assert.equal(left.unitId,unit.unitId);
 assert.equal(left.memberCount,unit.memberCount);
 assert.ok(result.state.squads.some(u=>u.status==="active"));
 assert.equal(result.state.report,null);
 assert.equal(api.evacuateWarRtsSquadV139(result.state,unit.id).accepted,false);
 assert.equal(staged.squads.find(u=>u.id===unit.id).status,"active");
});

test("RTS: completed objectives grant a unique receipt including evacuated allies, never free victory",()=>{
 const all=api.WAR_SOURCE_RTS_IDS_V129.map(id=>{
  const v=api.launchWarRtsSquadsV133(api.createWarRtsSquadsV133(id,rules));
  return v.accepted?v.state:null;
 });
 const noCargo=all.find(s=>s&&!s.tracked);
 assert.ok(noCargo,"need a W3 objective chain without escort for isolated receipt test");
 const id=noCargo.squads[0].id;
 const clean={...noCargo,enemies:[],map:{...noCargo.map,hazards:[]},
  squads:noCargo.squads.map((u,i)=>i===0?
    {...u,x:noCargo.map.extraction.x,y:noCargo.map.extraction.y}:u)};
 const evac=api.evacuateWarRtsSquadV139(clean,id);
 assert.equal(evac.accepted,true);
 const active=evac.state.squads.find(u=>u.status==="active");
 const ready={...evac.state,completedTaskIds:evac.state.mission.tasks.map(t=>t.id),
   squads:evac.state.squads.map(u=>u.id===active.id?
    {...u,x:evac.state.map.extraction.x,y:evac.state.map.extraction.y}:u)};
 const final=api.commandWarRtsSquadsV133(ready,{kind:"extract",squadId:active.id});
 assert.equal(final.accepted,true,final.message);
 assert.equal(final.state.report.outcome,"victory");
 assert.ok(final.state.report.evacuatedSquadIds.includes(id));
 assert.equal(final.state.report.downSquadIds.includes(id),false);
 assert.equal(final.state.report.campaignMutation,false);
 assert.equal(api.commandWarRtsSquadsV133(final.state,{kind:"extract",squadId:active.id}).accepted,false);
});

test("RTS: no remote evacuation, last team, holding or abandoning tracked physical cargo",()=>{
 const s=rts(),id=s.squads[0].id;
 const remote={...s,squads:s.squads.map(u=>u.id===id?{...u,x:s.map.goal.x,y:s.map.goal.y}:u)};
 const denied=api.evacuateWarRtsSquadV139(remote,id);
 assert.equal(denied.accepted,false);assert.equal(denied.state,remote);
 const near={...s,enemies:[],map:{...s.map,hazards:[]},
  squads:s.squads.map(u=>u.id===id?{...u,x:s.map.extraction.x,y:s.map.extraction.y}:u)};
 const hold={...near,hold:{taskId:near.mission.tasks[0].id,squadId:id,progress:0,required:2}};
 assert.equal(api.evacuateWarRtsSquadV139(hold,id).accepted,false);
 const cargo={...near,tracked:near.tracked?{...near.tracked,secured:true,
   carrierSquadId:id,hp:8}:null};
 assert.ok(cargo.tracked,"source escort must exist");
 assert.equal(api.evacuateWarRtsSquadV139(cargo,id).accepted,false);
 const alone={...near,squads:near.squads.map(u=>u.id===id?u:{...u,hp:0,status:"down"})};
 assert.equal(api.evacuateWarRtsSquadV139(alone,id).accepted,false);
 const far={...near,squads:near.squads.map(u=>u.id===id?{...u,x:s.map.goal.x,y:s.map.goal.y}:u)};
 assert.equal(api.evacuateWarRtsSquadV139(far,id).accepted,false);
});

test("source: all 24 W3 scripts, 72 physical objectives and no V85 mutation remain",()=>{
 const a=api.auditWarRtsSquadsV133(rules);
 assert.equal(a.missions,24);assert.equal(a.steps,72);assert.deepEqual(a.issues,[]);
 const s=api.createWarOperationsV115(rules);
 assert.equal(s.context,"free");
 assert.equal(s.reports.length,0);
 assert.equal(Object.keys(s.pressure).length,0);
});
