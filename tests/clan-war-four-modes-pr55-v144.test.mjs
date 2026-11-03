import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const bundle=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarAssaultRegroupV144';",
 "export * from './app/game/systems/clanWarOuterInspectionV144';",
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarRtsSquadsV133';",
 "export * from './app/game/systems/clanWarStealthPatrolV140';",
 "export * from './app/game/systems/clanWarMissionTerrainV116';",
 "export * from './app/game/systems/clanWarBibleV6';",
 "export * from './app/game/systems/clanWarRtsSourceMissionsV129';",
 "export * from './app/game/systems/clanWarSourceMapsV128';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 platform:"node",format:"esm",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+
 Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const d=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const at=p=>p.x+","+p.y;
function start(mode,num=1){
 const s=api.createWarOperationsV115(rules),ids=s.teams.slice(0,num).map(t=>t.id);
 const dest=rules.territories.find(t=>t.id!==s.baseId&&
  !api.warMissionEligibleV115(s,rules,t.id,ids));
 assert.ok(dest,"source W3 mission route missing");
 const r=api.beginWarOperationV115(s,mode,dest.id,ids,rules,1000);
 assert.equal(r.accepted,true,mode+": "+r.message);
 return {state:r.state,ids,site:dest.id};
}
function stageAssault(){
 const {state,ids}=start("assault",2);
 const base=state.active.assault;
 const actors=ids.map((teamId,i)=>{
  const team=state.teams.find(t=>t.id===teamId);
  return {id:teamId,teamId,side:"ally",unitId:team.unitId,hp:16,x:10+i*6};
 });
 return {state:{...state,active:{...state.active,assault:{
  ...base,ap:70,actors,launched:[...ids]}}},ids};
}
function stageRts(){
 for(const id of api.WAR_SOURCE_RTS_IDS_V129){
  const r=api.launchWarRtsSquadsV133(api.createWarRtsSquadsV133(id,rules));
  if(!r.accepted)continue;
  const s=r.state;if(s.squads.length<2)continue;
  const task=s.mission.tasks[0];
  const pos=task.location;
  if(!api.warMapWalkableV128(s.map,pos))continue;
  const near=[{x:pos.x+1,y:pos.y},{x:pos.x-1,y:pos.y},
   {x:pos.x,y:pos.y+1},{x:pos.x,y:pos.y-1}].find(p=>
    api.warMapWalkableV128(s.map,p));
  if(!near)continue;
  const old=s.squads[0],fresh=s.squads[1];
  const positioned=s.squads.map((u,i)=>i===0?{...u,...pos}:i===1?{...u,...near}:u);
  const updated={...s,observed:true,power:true,airlockStable:true,
   enemies:[],turn:0,squads:positioned,
   hold:{taskId:task.id,squadId:old.id,progress:0,required:3}};
  return {state:updated,task,oldId:old.id,newId:fresh.id};
 }
 assert.fail("No W3 scripted map with physical adjacent positions at a post");
}

test("Assault V144: two source teams regroup physically against 10 AP, no cloning or turn farming",()=>{
 const {state,ids}=stageAssault();
 const original=state.active.assault.actors.find(a=>a.teamId===ids[1]);
 const r=api.regroupWarAssaultV144(state,ids[1],ids[0],rules);
 assert.equal(r.accepted,true,r.message);
 const moved=r.state.active.assault.actors.find(a=>a.teamId===ids[1]);
 assert.equal(original.x,16);assert.equal(moved.x,13);
 assert.equal(moved.id,original.id);assert.equal(moved.hp,original.hp);
 assert.equal(r.state.active.assault.ap,60);
 assert.equal(r.state.clock,state.clock);
 assert.equal(r.state.rav,state.rav);
 assert.equal(r.state.teams.length,state.teams.length);
 assert.deepEqual(r.state.active.assault.regroupUsedIds,[ids[1]]);
 assert.ok(api.readWarOperationsV115(JSON.stringify(r.state),rules));
 const repeated=api.regroupWarAssaultV144(r.state,ids[1],ids[0],rules);
 assert.equal(repeated.accepted,false);assert.equal(repeated.state,r.state);
 assert.equal(state.active.assault.actors.find(a=>a.teamId===ids[1]).x,16);
});

test("Assault V144: enemy block, low AP, inactive group, forged order all fail immutably",()=>{
 const {state,ids}=stageAssault();
 const soldier=state.active.assault.actors[1];
 const enemy={id:"source-rival",teamId:null,side:"rival",unitId:soldier.unitId,x:15,hp:12};
 const blocked={...state,active:{...state.active,assault:{
  ...state.active.assault,actors:[...state.active.assault.actors,enemy]}}};
 const fail=api.regroupWarAssaultV144(blocked,ids[1],ids[0],rules);
 assert.equal(fail.accepted,false);assert.equal(fail.state,blocked);
 const poor={...state,active:{...state.active,assault:{...state.active.assault,ap:9}}};
 assert.equal(api.regroupWarAssaultV144(poor,ids[1],ids[0],rules).accepted,false);
 assert.equal(api.regroupWarAssaultV144(state,ids[1],ids[1],rules).accepted,false);
 const forged={...state,active:{...state.active,assault:{
   ...state.active.assault,regroupUsedIds:["unknown-W3-team"]}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(forged),rules),null);
});

test("Outer Ops V144: one physical passage inspection spends one RAV and adds exactly +2 at final report",()=>{
 const {state}=start("outer"),order=state.outer[0];
 const now=order.startedAt+1;
 const before=api.simulateWarOuterMissionV115(state,order,rules);
 const checked=api.inspectWarOuterPassageV144(state,order.id,now,rules);
 assert.equal(checked.accepted,true,checked.message);
 const o=checked.state.outer[0];
 assert.ok(order.routeIds.includes(o.passageCheck.passageId));
 assert.equal(o.passageCheck.checkedAt,now);
 assert.equal(o.passageCheck.paidRav,1);
 assert.equal(checked.state.rav,state.rav-1);
 assert.equal(o.dueAt,order.dueAt);
 assert.deepEqual(o.teamIds,order.teamIds);
 assert.deepEqual(o.routeIds,order.routeIds);
 assert.equal(checked.state.reports.length,0);
 const after=api.simulateWarOuterMissionV115(checked.state,o,rules);
 assert.equal(after.strength-before.strength,2);
 assert.ok(after.engagementLog.some(x=>x.includes("Contrôle V144")));
 assert.ok(api.readWarOperationsV115(JSON.stringify(checked.state),rules));
 const result=api.settleWarOuterOpsV115(checked.state,o.dueAt,rules);
 assert.equal(result.accepted,true);
 assert.equal(result.state.reports.length,1);
 assert.equal(api.settleWarOuterOpsV115(result.state,o.dueAt,rules).accepted,false);
});

test("Outer Ops V144: duplicate check, recall, forged passage, low RAV and off-route time reject",()=>{
 const {state}=start("outer"),o=state.outer[0],now=o.startedAt+1;
 const checked=api.inspectWarOuterPassageV144(state,o.id,now,rules);
 assert.equal(checked.accepted,true);
 assert.equal(api.inspectWarOuterPassageV144(checked.state,o.id,now+1,rules).accepted,false);
 const poor={...state,rav:0};
 const rejected=api.inspectWarOuterPassageV144(poor,o.id,now,rules);
 assert.equal(rejected.accepted,false);assert.equal(rejected.state,poor);
 assert.equal(api.inspectWarOuterPassageV144(state,o.id,o.dueAt,rules).accepted,false);
 const recalled=api.recallWarOuterMissionV116(state,o.id,now,rules);
 assert.equal(recalled.accepted,true);
 assert.equal(api.inspectWarOuterPassageV144(recalled.state,o.id,now+1,rules).accepted,false);
 for(const broken of [
  {...checked.state.outer[0].passageCheck,passageId:"fake-passage"},
  {...checked.state.outer[0].passageCheck,sourceCondition:"secret enemy position"},
  {...checked.state.outer[0].passageCheck,paidRav:99}
 ]){
  const injected={...checked.state,outer:[{...checked.state.outer[0],passageCheck:broken}]};
  assert.equal(api.readWarOperationsV115(JSON.stringify(injected),rules),null);
 }
});

test("Stealth V144: guard follows last genuinely observed location, never unseen current player",()=>{
 let base=null,first=null;
 for(const territory of rules.territories){
  const r=start("stealth");
  const terrain=api.warMissionTerrainV116(territory.id,rules);
  const spawn=api.warStealthPatrolSpawnV140(terrain);
  const adjacent=[{x:spawn.guardX-1,y:spawn.guardY},{x:spawn.guardX+1,y:spawn.guardY},
   {x:spawn.guardX,y:spawn.guardY-1},{x:spawn.guardX,y:spawn.guardY+1}].find(p=>
    !api.warTerrainCellBlockedV116(terrain,p.x,p.y));
  if(!adjacent)continue;
  const staged={...r.state,active:{...r.state.active,targetId:territory.id,
   stealth:{...r.state.active.stealth,...adjacent,guardX:spawn.guardX,
    guardY:spawn.guardY,guardDirection:spawn.guardDirection,cloaked:false,alarm:0,energy:5}}};
  const observed=api.commandStealthV115(staged,"wait",rules);
  if(observed.accepted&&observed.state.active?.stealth?.guardInvestigation){
   base=staged;first=observed.state;break;
  }
 }
 assert.ok(base&&first,"At least one authored W3 region must produce a genuine visual contact");
 const memo=first.active.stealth.guardInvestigation;
 assert.equal(memo.turns,2);
 assert.equal(memo.x,base.active.stealth.x);
 assert.equal(memo.y,base.active.stealth.y);
 assert.ok(api.readWarOperationsV115(JSON.stringify(first),rules));
 // Two different now-hidden locations should produce exactly the same patrol
 // pursuit when the last *seen* location is identical.
 function hidden(x,y){
  return {...first,active:{...first.active,stealth:{
   ...first.active.stealth,x,y,cloaked:true,energy:5}}};
 }
 const a=api.commandStealthV115(hidden(1,4),"wait",rules);
 const b=api.commandStealthV115(hidden(2,4),"wait",rules);
 assert.equal(a.accepted,true);assert.equal(b.accepted,true);
 const one=a.state.active.stealth,two=b.state.active.stealth;
 assert.equal(at({x:one.guardX,y:one.guardY}),at({x:two.guardX,y:two.guardY}));
 assert.equal(one.guardInvestigation?.turns,1);
 assert.equal(two.guardInvestigation?.turns,1);
});

test("Stealth V144: bad investigation records fail and legacy archives without field remain readable",()=>{
 const {state}=start("stealth");
 assert.ok(api.readWarOperationsV115(JSON.stringify(state),rules));
 for(const field of [
  {x:999,y:2,turns:1},{x:1,y:4,turns:99},{x:1,y:4,turns:0},
  {x:1,y:4,turns:"2"}
 ]){
  const v={...state,active:{...state.active,stealth:{
   ...state.active.stealth,guardInvestigation:field}}};
  assert.equal(api.readWarOperationsV115(JSON.stringify(v),rules),null);
 }
});

test("RTS V144: active adjacent replacement retains real objective progress and consumes one enemy turn",()=>{
 const {state,task,oldId,newId}=stageRts();
 const replaced=api.commandWarRtsReliefV144(state,newId);
 assert.equal(replaced.accepted,true,replaced.message);
 assert.equal(replaced.state.turn,state.turn+1);
 assert.equal(replaced.state.hold.taskId,task.id);
 assert.equal(replaced.state.hold.squadId,newId);
 assert.equal(replaced.state.hold.progress,1,"one genuine tick, not progress reset");
 assert.equal(replaced.state.ravRemaining,state.ravRemaining);
 assert.deepEqual(replaced.state.reliefUsedTaskIds,[task.id]);
 const old=state.squads.find(u=>u.id===oldId);
 const incoming=state.squads.find(u=>u.id===newId);
 assert.equal(incoming.memberCount,state.squads.find(u=>u.id===newId).memberCount);
 assert.equal(old.status,"active");
 assert.equal(replaced.state.report,null);
 assert.equal(api.commandWarRtsReliefV144(replaced.state,oldId).accepted,false);
});

test("RTS V144: no remote handoff, missing task, duplicate use, KO or unpowered bypass",()=>{
 const {state,newId,task}=stageRts();
 const remote={...state,squads:state.squads.map(u=>u.id===newId?
  {...u,x:state.map.start.x,y:state.map.start.y}:u)};
 assert.equal(api.commandWarRtsReliefV144(remote,newId).accepted,false);
 const unobserved={...state,observed:false};
 assert.equal(api.commandWarRtsReliefV144(unobserved,newId).accepted,false);
 const nonleader={...state,hold:null};
 assert.equal(api.commandWarRtsReliefV144(nonleader,newId).accepted,false);
 const duplicate={...state,reliefUsedTaskIds:[task.id]};
 assert.equal(api.commandWarRtsReliefV144(duplicate,newId).accepted,false);
 const down={...state,squads:state.squads.map(u=>u.id===newId?{
  ...u,status:"down",hp:0}:u)};
 assert.equal(api.commandWarRtsReliefV144(down,newId).accepted,false);
});

test("V144 source boundaries: W3 scenario catalog and V85 campaign nonmutation preserved",()=>{
 const a=api.auditWarRtsSquadsV133(rules);
 assert.equal(a.missions,24);
 assert.equal(a.steps,72);
 assert.deepEqual(a.issues,[]);
 const world=api.createWarOperationsV115(rules);
 assert.equal(world.context,"free");
 assert.equal(world.reports.length,0);
 assert.equal(Object.keys(world.pressure).length,0);
});
