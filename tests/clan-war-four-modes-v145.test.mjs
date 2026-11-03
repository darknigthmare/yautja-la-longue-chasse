import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const built=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarInterposeV145';",
 "export * from './app/game/systems/clanWarTravelLedgerV145';",
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarAssaultContactV141';",
 "export * from './app/game/systems/clanWarOuterRerouteV144';",
 "export * from './app/game/systems/clanWarOuterChoicesV142';",
 "export * from './app/game/systems/clanWarOuterWeightedProgressV141';",
 "export * from './app/game/systems/clanWarStealthReinforcementV144';",
 "export * from './app/game/systems/clanWarMissionTerrainV116';",
 "export * from './app/game/systems/clanWarRtsSquadsV133';",
 "export * from './app/game/systems/clanWarRtsSourceMissionsV129';",
 "export * from './app/game/systems/clanWarSourceMapsV128';",
 "export * from './app/game/systems/clanWarBibleV6';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 platform:"node",format:"esm",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+
 Buffer.from(built.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const same=p=>p.x+","+p.y;
function open(mode,ids){
 const base=api.createWarOperationsV115(rules);
 const teams=ids??[base.teams[0].id];
 const territory=rules.territories.find(t=>t.id!==base.baseId&&
  !api.warMissionEligibleV115(base,rules,t.id,teams));
 assert.ok(territory,"Actual reachable source territory required");
 const start=api.beginWarOperationV115(base,mode,territory.id,teams,rules,1000);
 assert.equal(start.accepted,true,start.message);
 return {state:start.state,teams,targetId:territory.id};
}
function pair(){
 const original=api.createWarOperationsV115(rules);
 for(let i=0;i<original.teams.length;i++)for(let j=i+1;j<original.teams.length;j++){
  const teams=[original.teams[i].id,original.teams[j].id];
  const target=rules.territories.find(t=>t.id!==original.baseId&&
   !api.warMissionEligibleV115(original,rules,t.id,teams));
  if(!target)continue;
  const start=api.beginWarOperationV115(original,"assault",target.id,teams,rules,1000);
  assert.equal(start.accepted,true);
  let state={...start.state,active:{...start.state.active,assault:{...start.state.active.assault,ap:120}}};
  for(const id of teams){
   const deployed=api.deployAssaultUnitV115(state,id,rules);
   assert.equal(deployed.accepted,true,deployed.message);state=deployed.state;
  }
  const [guardian,targetId]=teams;
  state={...state,active:{...state.active,assault:{...state.active.assault,
   actors:state.active.assault.actors.map(u=>u.teamId===guardian?{...u,x:18,hp:28}:
    u.teamId===targetId?{...u,x:22,hp:28}:u)}}};
  return {state,guardian,target:targetId};
 }
 assert.fail("No affordable pair from source V6");
}
function altOuter(){
 const state=api.createWarOperationsV115(rules),team=state.teams[0];
 const pc=rules.units.find(u=>u.id===team.unitId).commandPoints;
 const choice=rules.territories.map(t=>({t,
   options:api.warOuterRouteChoicesV142(state.baseId,t.id,pc,rules)}))
  .find(x=>x.t.id!==state.baseId&&x.options.length>1&&
   !api.warMissionEligibleV115(state,rules,x.t.id,[team.id]));
 assert.ok(choice,"V6 graph needs a real alternative");
 const launched=api.beginWarOperationV115(state,"outer",choice.t.id,[team.id],rules,1000);
 assert.equal(launched.accepted,true,launched.message);
 return {state:launched.state,choice,team:team.id};
}
function rtsMissionWithHold(){
 for(const id of api.WAR_SOURCE_RTS_IDS_V129){
  const launched=api.launchWarRtsSquadsV133(api.createWarRtsSquadsV133(id,rules));
  if(!launched.accepted||launched.state.squads.length<2)continue;
  const state=launched.state;
  for(const [i,task] of state.mission.tasks.entries()){
   if((task.holdTurns??1)<2)continue;
   const positions=[task.location,
    {x:task.location.x+1,y:task.location.y},
    {x:task.location.x-1,y:task.location.y},
    {x:task.location.x,y:task.location.y+1},
    {x:task.location.x,y:task.location.y-1}]
    .filter(p=>api.warMapWalkableV128(state.map,p));
   if(positions.length<2)continue;
   const [first,second]=positions;
   const [leader,replacement]=state.squads;
   const staged={...state,observed:true,power:true,airlockStable:true,
    enemies:[],map:{...state.map,hazards:[]},
    squads:state.squads.map(u=>u.id===leader.id?{...u,...first}:
     u.id===replacement.id?{...u,...second}:u),
    completedTaskIds:state.mission.tasks.slice(0,i).map(t=>t.id),
    hold:{taskId:task.id,squadId:leader.id,progress:0,required:task.holdTurns}};
   return {state:staged,leader,replacement,task};
  }
 }
 assert.fail("No genuine source W3 hold task usable for physical relief");
}

test("V145 assault: guardian receives one actual damage point from his nearby protected ally; total damage conserved",()=>{
 const {state,guardian,target}=pair(),original=state.active.assault.actors;
 const rear=original.find(u=>u.teamId===guardian),front=original.find(u=>u.teamId===target);
 const rival={id:"V145-RIVAL",side:"rival",teamId:null,unitId:front.unitId,x:front.x+2,hp:35};
 const actors=[...original,rival];
 const base=api.warAssaultContactV141(actors,rules,{},1);
 const protectedShot=api.warAssaultContactV141(actors,rules,{},1,{}, {},{
  [target]:{guardianTeamId:guardian,expiresAtTick:3}});
 const baseRear=base.actors.find(u=>u.id===rear.id),newRear=protectedShot.actors.find(u=>u.id===rear.id);
 const baseFront=base.actors.find(u=>u.id===front.id),newFront=protectedShot.actors.find(u=>u.id===front.id);
 assert.equal(newFront.hp-baseFront.hp,1);
 assert.equal(baseRear.hp-newRear.hp,1);
 assert.equal(newRear.hp+newFront.hp,baseRear.hp+baseFront.hp);
 assert.equal(state.active.assault.actors.length,original.length);
});
test("V145 assault: real paid interposition persists for two ticks, expires and rejects duplicate",()=>{
 const {state,guardian,target}=pair();
 const sent=api.commandWarAssaultInterposeV145(state,guardian,target,rules);
 assert.equal(sent.accepted,true,sent.message);
 assert.equal(sent.state.active.assault.ap,state.active.assault.ap-10);
 assert.equal(sent.state.rav,state.rav);
 assert.deepEqual(sent.state.active.assault.interposeUsedIds,[guardian]);
 assert.equal(sent.state.active.assault.interposeOrders[target].expiresAtTick,state.active.tick+3);
 assert.ok(api.readWarOperationsV115(JSON.stringify(sent.state),rules));
 const denied=api.commandWarAssaultInterposeV145(sent.state,guardian,target,rules);
 assert.equal(denied.accepted,false);assert.equal(denied.state,sent.state);
 const forged={...sent.state,active:{...sent.state.active,assault:{
  ...sent.state.active.assault,interposeOrders:{[target]:{
   guardianTeamId:guardian,expiresAtTick:999}}}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(forged),rules),null);
});
test("V145 assault: no free damage-redirection from far, duplicate, down or counterfeit squads",()=>{
 const {state,guardian,target}=pair();
 const far={...state,active:{...state.active,assault:{
  ...state.active.assault,actors:state.active.assault.actors.map(u=>
   u.teamId===guardian?{...u,x:5}:u)}}};
 assert.equal(api.commandWarAssaultInterposeV145(far,guardian,target,rules).accepted,false);
 const low={...state,active:{...state.active,assault:{...state.active.assault,ap:9}}};
 assert.equal(api.commandWarAssaultInterposeV145(low,guardian,target,rules).accepted,false);
 assert.equal(api.commandWarAssaultInterposeV145(state,guardian,guardian,rules).accepted,false);
 assert.equal(api.commandWarAssaultInterposeV145({...state,sourceSha:"invalid"},guardian,target,rules).accepted,false);
});

test("V145 Outer Ops: a V144 legal reroute consumes FIVE seconds without entering a source passage",()=>{
 const {state,choice}=altOuter(),original=state.outer[0];
 const alternative=choice.options.find(o=>o.passageIds.join("|")!==original.routeIds.join("|"));
 const changed=api.commandWarOuterRerouteV144(state,original.id,alternative.passageIds,original.startedAt,rules);
 assert.equal(changed.accepted,true,changed.message);
 const order=changed.state.outer[0];
 assert.equal(order.routeDiversion.originalDueAt,original.dueAt);
 assert.equal(order.dueAt,original.dueAt+5000);
 const atStart=api.warOuterTravelLedgerV145(order,original.startedAt,rules);
 const during=api.warOuterTravelLedgerV145(order,original.startedAt+3000,rules);
 const after=api.warOuterTravelLedgerV145(order,original.startedAt+6000,rules);
 assert.equal(atStart.currentPassageProgress,during.currentPassageProgress);
 assert.equal(during.workable,false);
 assert.ok(during.pauseReasons.some(x=>x.includes("V144")));
 assert.equal(during.pausedMs,3000);
 assert.equal(after.pausedMs,5000);
 assert.equal(after.workable,true);
 assert.ok(after.currentPassageProgress>atStart.currentPassageProgress||
   after.currentPassageId!==atStart.currentPassageId);
 assert.equal(changed.state.reports.length,0);
 assert.ok(api.readWarOperationsV115(JSON.stringify(changed.state),rules));
});
test("V145 Outer Ops: source passage and delayed return dates survive weighted route and unique settlement",()=>{
 const {state,choice}=altOuter(),m=state.outer[0];
 const alternative=choice.options.find(o=>o.passageIds.join("|")!==m.routeIds.join("|"));
 const re=api.commandWarOuterRerouteV144(state,m.id,alternative.passageIds,m.startedAt,rules);
 assert.equal(re.accepted,true);
 const o=re.state.outer[0],end=api.warOuterTravelLedgerV145(o,o.dueAt,rules);
 assert.equal(end.phase,"arrived");
 assert.equal(end.remainingMs,0);
 assert.deepEqual(end.routeIds,o.routeIds);
 assert.equal(end.hiddenEnemiesRevealed,false);
 const early=api.settleWarOuterOpsV115(re.state,m.dueAt,rules);
 assert.equal(early.accepted,false);
 const finished=api.settleWarOuterOpsV115(re.state,o.dueAt,rules);
 assert.equal(finished.accepted,true);
 assert.equal(finished.state.reports.length,1);
});

test("V145 stealth: second guard blocks silent sabotage when primary is far from physical relay",()=>{
 const {state}=open("stealth"),map=api.warMissionTerrainV116(state.active.targetId,rules);
 const guardPositions=[{x:7,y:2},{x:7,y:1},{x:6,y:1},{x:6,y:2}]
  .filter(p=>!api.warTerrainCellBlockedV116(map,p.x,p.y)&&dist(p,map.relay)<=2);
 assert.ok(guardPositions.length>0);
 const support=guardPositions[0];
 const own={...state,active:{...state.active,stealth:{
  ...state.active.stealth,...map.relay,guardX:4,guardY:2,alarm:0,
  supportGuard:{...support,direction:-1},reinforcementIssued:true,energy:5}}};
 const blocked=api.commandStealthV115(own,"quiet-sabotage",rules);
 assert.equal(blocked.accepted,false);assert.equal(blocked.state,own);
 const invalid={...own,active:{...own.active,stealth:{
  ...own.active.stealth,supportGuard:{x:99,y:2,direction:1}}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(invalid),rules),null);
});
test("V145 stealth: acoustic listening recognizes physically nearby secondary patrol, never cheats original guard",()=>{
 const base=open("stealth");
 let scenario=null;
 for(const t of rules.territories){
  const map=api.warMissionTerrainV116(t.id,rules);
  const primary=[{x:7,y:2},{x:7,y:3},{x:6,y:2}].find(p=>
   !api.warTerrainCellBlockedV116(map,p.x,p.y));
  const secondary=[{x:4,y:2},{x:5,y:2},{x:4,y:1},{x:5,y:1}].find(p=>
   !api.warTerrainCellBlockedV116(map,p.x,p.y)&&
   map.cover.some(c=>{
    const [x,y]=c.split(",").map(Number);
    return dist({x,y},p)<=5&&dist({x,y},primary)>5;
   }));
  if(!primary||!secondary)continue;
  const cover=map.cover.find(c=>{
   const [x,y]=c.split(",").map(Number);
   return dist({x,y},secondary)<=5&&dist({x,y},primary)>5;
  });
  if(cover){scenario={t,primary,secondary,cover};break;}
 }
 assert.ok(scenario,"V6 map should have cover audible by a second but not first guard");
 const [x,y]=scenario.cover.split(",").map(Number);
 const state={...base.state,active:{...base.state.active,targetId:scenario.t.id,
  stealth:{...base.state.active.stealth,x,y,guardX:scenario.primary.x,
   guardY:scenario.primary.y,supportGuard:{...scenario.secondary,direction:-1},
   reinforcementIssued:true,energy:5,alarm:0}}};
 const listened=api.commandStealthV115(state,"listen",rules);
 assert.equal(listened.accepted,true,listened.message);
 assert.equal(listened.state.active.stealth.energy,4);
 assert.equal(listened.state.active.stealth.acousticUsed,1);
 assert.equal(listened.state.clock,state.clock+1);
});
test("V145 stealth: two guards never merge into the same solid tile on a regular reaction",()=>{
 const {state}=open("stealth"),map=api.warMissionTerrainV116(state.active.targetId,rules);
 const base=api.commandStealthV115({...state,active:{...state.active,
  stealth:{...state.active.stealth,alarm:1}}},"wait",rules);
 assert.equal(base.accepted,true);
 let current=api.commandWarStealthAlertReinforcementV144({...state,
  active:{...state.active,stealth:{...state.active.stealth,alarm:1}}},rules);
 assert.equal(current.accepted,true);
 for(let i=0;i<10;i++){
  if(!current.state.active)break;
  const st=current.state.active.stealth;
  assert.notEqual(same(st.supportGuard),same({x:st.guardX,y:st.guardY}));
  assert.equal(api.warTerrainCellBlockedV116(map,st.supportGuard.x,st.supportGuard.y),false);
  const stage={...current.state,active:{...current.state.active,stealth:{
   ...st,alarm:0}}};
  current=api.commandStealthV115(stage,"wait",rules);
  assert.equal(current.accepted,true,current.message);
 }
});

test("V145 RTS: an actual W3 post can be physically transferred and its existing hold progress preserved",()=>{
 const {state,leader,replacement,task}=rtsMissionWithHold();
 assert.equal(state.hold.squadId,leader.id);
 const r=api.commandWarRtsPostHandoverV145(state,replacement.id);
 assert.equal(r.accepted,true,r.message);
 assert.equal(r.state.turn,state.turn+1);
 assert.equal(r.state.ravRemaining,state.ravRemaining);
 assert.deepEqual(r.state.handoverUsedIds,[leader.id]);
 assert.ok(r.state.hold&&r.state.hold.squadId===replacement.id);
 assert.equal(r.state.hold.progress,1);
 assert.equal(r.state.completedTaskIds.length,state.completedTaskIds.length);
 assert.equal(r.state.report?.campaignMutation??false,false);
 assert.equal(state.hold.progress,0);
 assert.equal(r.state.map.planetId,state.map.planetId);
 assert.equal(task.id,r.state.hold.taskId);
});
test("V145 RTS: same, distant, down, twice-relieved or missing holder cannot claim a free hold",()=>{
 const {state,leader,replacement}=rtsMissionWithHold();
 const sameTeam=api.commandWarRtsPostHandoverV145(state,leader.id);
 assert.equal(sameTeam.accepted,false);assert.equal(sameTeam.state,state);
 const far={...state,squads:state.squads.map(u=>u.id===replacement.id?
  {...u,x:state.map.extraction.x,y:state.map.extraction.y}:u)};
 if(dist(far.squads.find(u=>u.id===replacement.id),state.mission.tasks[state.completedTaskIds.length].location)>1){
  assert.equal(api.commandWarRtsPostHandoverV145(far,replacement.id).accepted,false);
 }
 const down={...state,squads:state.squads.map(u=>u.id===replacement.id?
   {...u,hp:0,status:"down"}:u)};
 assert.equal(api.commandWarRtsPostHandoverV145(down,replacement.id).accepted,false);
 const used={...state,handoverUsedIds:[leader.id]};
 assert.equal(api.commandWarRtsPostHandoverV145(used,replacement.id).accepted,false);
 const noHold={...state,hold:null};
 assert.equal(api.commandWarRtsPostHandoverV145(noHold,replacement.id).accepted,false);
});
test("V145 source boundaries: 24 RTS briefs, 72 goals, and untouched V85 results",()=>{
 const audit=api.auditWarRtsSquadsV133(rules);
 assert.deepEqual(audit.issues,[]);
 assert.equal(audit.missions,24);assert.equal(audit.steps,72);
 const initial=api.createWarOperationsV115(rules);
 assert.equal(initial.context,"free");
 assert.equal(initial.reports.length,0);
});
