import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
const built=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarRegroupV144';",
 "export * from './app/game/systems/clanWarOuterRerouteV144';",
 "export * from './app/game/systems/clanWarStealthReinforcementV144';",
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarRtsSquadsV133';",
 "export * from './app/game/systems/clanWarOuterChoicesV142';",
 "export * from './app/game/systems/clanWarOuterWeightedProgressV141';",
 "export * from './app/game/systems/clanWarMissionTerrainV116';",
 "export * from './app/game/systems/clanWarBibleV6';",
 "export * from './app/game/systems/clanWarSourceMapsV128';",
 "export * from './app/game/systems/clanWarRtsSourceMissionsV129';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(built.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const at=p=>p.x+","+p.y;
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
function open(mode,teams=1) {
 const initial=api.createWarOperationsV115(rules);
 const ids=initial.teams.slice(0,teams).map(u=>u.id);
 const target=rules.territories.find(t=>t.id!==initial.baseId&&
   !api.warMissionEligibleV115(initial,rules,t.id,ids));
 assert.ok(target,"source W3 reachable territory required");
 const begun=api.beginWarOperationV115(initial,mode,target.id,ids,rules,1000);
 assert.equal(begun.accepted,true,begun.message);
 return {state:begun.state,ids,targetId:target.id};
}
function pairAssault(){
 const original=api.createWarOperationsV115(rules);
 let combo=null,target=null;
 for(let i=0;i<original.teams.length;i++){
  for(let j=i+1;j<original.teams.length;j++){
   const ids=[original.teams[i].id,original.teams[j].id];
   const t=rules.territories.find(x=>x.id!==original.baseId&&
    !api.warMissionEligibleV115(original,rules,x.id,ids));
   if(t){combo=ids;target=t.id;break;}
  }
  if(combo)break;
 }
 assert.ok(combo,"source roster must have two affordable teams");
 const begun=api.beginWarOperationV115(original,"assault",target,combo,rules,1000);
 assert.equal(begun.accepted,true,begun.message);
 let state={...begun.state,active:{...begun.state.active,assault:{
  ...begun.state.active.assault,ap:120}}};
 for(const id of combo){
  const r=api.deployAssaultUnitV115(state,id,rules);
  assert.equal(r.accepted,true,r.message);state=r.state;
 }
 state={...state,active:{...state.active,assault:{...state.active.assault,
  actors:state.active.assault.actors.map((u,i)=>({...u,x:22+3*i}))}}};
 return {state,ids:combo};
}
const startRts=id=>{
 const result=api.launchWarRtsSquadsV133(api.createWarRtsSquadsV133(id,rules));
 assert.equal(result.accepted,true,result.message);return result.state;
};
test("Assault V144: two real allies withdraw together, spend exactly 16 AP and retain IDs without an extra combat tick",()=>{
 const {state,ids}=pairAssault(),before=state.active.assault;
 const result=api.commandWarAssaultRegroupV144(state,ids[0],ids[1],rules);
 assert.equal(result.accepted,true,result.message);
 const next=result.state.active.assault;
 assert.equal(result.state.active.tick,state.active.tick);
 assert.equal(next.ap,before.ap-16);
 assert.equal(result.state.rav,state.rav);
 assert.equal(result.state.reports.length,0);
 assert.equal(result.state.teams.length,state.teams.length);
 for(const id of ids){
  const b=before.actors.find(a=>a.teamId===id);
  const a=next.actors.find(a=>a.teamId===id);
  assert.ok(a.x<b.x&&b.x-a.x<=3,id+" physically moved wrong way");
  assert.equal(a.id,b.id);assert.equal(a.hp,b.hp);
 }
 assert.deepEqual(next.regroupUsedIds,ids);
 assert.ok(api.readWarOperationsV115(JSON.stringify(result.state),rules));
 assert.equal(api.commandWarAssaultRegroupV144(result.state,ids[0],ids[1],rules).accepted,false);
});
test("Assault V144: a rear enemy, non-deployed team, cost shortage and forged receipt never yield a free regroup",()=>{
 const {state,ids}=pairAssault(),actor=state.active.assault.actors[0];
 const blocked={...state,active:{...state.active,assault:{
  ...state.active.assault,actors:[...state.active.assault.actors,
    {id:"RIVAL-REAR",teamId:null,side:"rival",unitId:actor.unitId,
     x:actor.x-1,hp:8}]}}};
 const no=api.commandWarAssaultRegroupV144(blocked,ids[0],ids[1],rules);
 assert.equal(no.accepted,false);assert.equal(no.state,blocked);
 const poor={...state,active:{...state.active,assault:{...state.active.assault,ap:15}}};
 assert.equal(api.commandWarAssaultRegroupV144(poor,ids[0],ids[1],rules).accepted,false);
 assert.equal(api.commandWarAssaultRegroupV144(state,ids[0],ids[0],rules).accepted,false);
 const bad={...state,active:{...state.active,assault:{
  ...state.active.assault,regroupUsedIds:["forged-team"]}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(bad),rules),null);
});

test("Outer Ops V144: an author-legal route switch can be ordered ONLY before leaving the first passage",()=>{
 const original=api.createWarOperationsV115(rules);
 const team=original.teams[0],pc=rules.units.find(u=>u.id===team.unitId).commandPoints;
 const options=rules.territories.map(t=>({
  targetId:t.id,choices:api.warOuterRouteChoicesV142(original.baseId,t.id,pc,rules),
 })).find(x=>x.targetId!==original.baseId&&x.choices.length>1&&
   !api.warMissionEligibleV115(original,rules,x.targetId,[team.id]));
 assert.ok(options,"some V6 source territory has true alternative routes");
 const begin=api.beginWarOperationV115(original,"outer",options.targetId,[team.id],rules,1000);
 assert.equal(begin.accepted,true,begin.message);
 const order=begin.state.outer[0];
 const alternate=options.choices.find(c=>c.passageIds.join("|")!==order.routeIds.join("|"));
 assert.ok(alternate);
 const rerouted=api.commandWarOuterRerouteV144(begin.state,order.id,alternate.passageIds,order.startedAt,rules);
 assert.equal(rerouted.accepted,true,rerouted.message);
 const modified=rerouted.state.outer[0];
 assert.deepEqual(modified.routeIds,alternate.passageIds);
 assert.deepEqual(modified.teamIds,order.teamIds);
 assert.equal(modified.routeChoiceId,alternate.id);
 assert.equal(modified.dueAt,order.dueAt+5000);
 assert.equal(rerouted.state.rav,begin.state.rav-1);
 assert.equal(rerouted.state.reports.length,0);
 assert.deepEqual(rerouted.state.assignments,begin.state.assignments);
 assert.ok(api.readWarOperationsV115(JSON.stringify(rerouted.state),rules));
 assert.equal(api.commandWarOuterRerouteV144(rerouted.state,order.id,order.routeIds,order.startedAt+1,rules).accepted,false);
 const past=api.commandWarOuterRerouteV144(begin.state,order.id,alternate.passageIds,order.startedAt+20000,rules);
 assert.equal(past.accepted,false);assert.equal(past.state,begin.state);
});
test("Outer Ops V144: cannot forge passage IDs, RAV or the historical deadline after route change",()=>{
 const {state}=open("outer"),order=state.outer[0];
 const poor={...state,rav:0};
 assert.equal(api.commandWarOuterRerouteV144(poor,order.id,["invented"],order.startedAt,rules).accepted,false);
 const no=api.commandWarOuterRerouteV144(state,order.id,["invented"],order.startedAt,rules);
 assert.equal(no.accepted,false);assert.equal(no.state,state);
 const corrupt={...state,outer:[{...order,routeDiversion:{
  fromPassageIds:["fake"],originalDueAt:order.dueAt,
  changedAt:order.startedAt,paidRav:1}}]};
 assert.equal(api.readWarOperationsV115(JSON.stringify(corrupt),rules),null);
});
test("Infiltration V144: reinforcement is optional, uses a real walkable gate and acts on real ticks",()=>{
 const {state}=open("stealth");
 assert.equal(state.active.stealth.supportGuard,undefined);
 const staged={...state,active:{...state.active,stealth:{...state.active.stealth,alarm:1}}};
 const activated=api.commandWarStealthAlertReinforcementV144(staged,rules);
 assert.equal(activated.accepted,true,activated.message);
 assert.equal(activated.state.clock,state.clock+1);
 assert.equal(activated.state.active.tick,state.active.tick+1);
 const stealth=activated.state.active.stealth;
 assert.equal(stealth.reinforcementIssued,true);
 assert.ok(stealth.supportGuard);
 const map=api.warMissionTerrainV116(staged.active.targetId,rules);
 assert.equal(api.warTerrainCellBlockedV116(map,stealth.supportGuard.x,stealth.supportGuard.y),false);
 assert.equal(api.readWarOperationsV115(JSON.stringify(activated.state),rules)?.active?.stealth?.reinforcementIssued,true);
 const twice=api.commandWarStealthAlertReinforcementV144(activated.state,rules);
 assert.equal(twice.accepted,false);assert.equal(twice.state,activated.state);
 assert.equal(api.commandWarStealthAlertReinforcementV144(state,rules).accepted,false);
});
test("Infiltration V144: two guards move physically and fake guard placement is refused",()=>{
 const {state}=open("stealth"),alarm={...state,active:{...state.active,
  stealth:{...state.active.stealth,alarm:1}}};
 const activated=api.commandWarStealthAlertReinforcementV144(alarm,rules);
 assert.equal(activated.accepted,true);
 let last=activated.state;
 for(let i=0;i<3;i++){
  const before=last.active.stealth;
  const step=api.commandStealthV115(last,"wait",rules);
  if(!step.accepted||!step.state.active)break;
  const after=step.state.active.stealth;
  assert.ok(distance(before.supportGuard,after.supportGuard)<=1,"additional guard teleported");
  const map=api.warMissionTerrainV116(step.state.active.targetId,rules);
  assert.equal(api.warTerrainCellBlockedV116(map,after.supportGuard.x,after.supportGuard.y),false);
  last=step.state;
 }
 const invalid={...activated.state,active:{...activated.state.active,stealth:{
  ...activated.state.active.stealth,supportGuard:{x:0,y:3,direction:1}}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(invalid),rules),null);
 const old=api.readWarOperationsV115(JSON.stringify(state),rules);
 assert.ok(old,"legacy V143 save without extra guard still parses");
});
test("RTS V144: two physical shooters deal two hits for 2 RAV in exactly one AI turn",()=>{
 const src=startRts("W3-RTS01");
 assert.ok(src.squads.length>=2);
 const triple=src.map.tiles.flatMap(tile=>{
  if(!api.warMapWalkableV128(src.map,tile))return [];
  const neighbors=src.map.tiles.filter(t=>api.warMapWalkableV128(src.map,t)&&
    distance(t,tile)===1&&api.warMapLineOfSightV128(src.map,t,tile));
  return neighbors.length>=2?[{target:tile,a:neighbors[0],b:neighbors[1]}]:[];
 })[0];
 assert.ok(triple,"W3 source map needs three distinct traversable cells");
 const [first,second]=src.squads;
 const staged={...src,ravRemaining:8,enemies:[{...src.enemies[0],...triple.target,
   hp:20,status:"active",id:"V144-RIVAL"}],
   squads:src.squads.map(u=>u.id===first.id?{...u,...triple.a}:
      u.id===second.id?{...u,...triple.b}:u)};
 const shoot=api.commandWarRtsCrossfireV144(staged,first.id,second.id,"V144-RIVAL");
 assert.equal(shoot.accepted,true,shoot.message);
 assert.equal(shoot.state.turn,staged.turn+1);
 assert.equal(shoot.state.ravRemaining,6);
 assert.ok(shoot.state.enemies[0].hp<20);
 assert.equal(staged.enemies[0].hp,20);
 assert.equal(shoot.state.squads.length,staged.squads.length);
 assert.equal(shoot.state.report?.campaignMutation??false,false);
});
test("RTS V144: duplicate squad, invisible target, 1 RAV and inactive phase reject without mutation",()=>{
 const s=startRts("W3-RTS01"),ally=s.squads[0];
 for(const input of [
  [s,ally.id,ally.id,s.enemies[0].id],
  [{...s,ravRemaining:1},ally.id,s.squads[1].id,s.enemies[0].id],
  [{...s,phase:"defeat"},ally.id,s.squads[1].id,s.enemies[0].id],
 ]){
  const [state,a,b,c]=input;
  const result=api.commandWarRtsCrossfireV144(state,a,b,c);
  assert.equal(result.accepted,false);
  assert.equal(result.state,state);
 }
 const hidden={...s,enemies:[{...s.enemies[0],x:s.map.goal.x,y:s.map.goal.y,
   id:"HIDDEN-144"}]};
 const result=api.commandWarRtsCrossfireV144(hidden,s.squads[0].id,
   s.squads[1].id,"HIDDEN-144");
 assert.equal(result.accepted,false);
});
test("Source V6/W3: cross-mode V144 actions still cannot write a free mission result to the campaign",()=>{
 const audit=api.auditWarRtsSquadsV133(rules);
 assert.equal(audit.missions,24);assert.equal(audit.steps,72);
 assert.deepEqual(audit.issues,[]);
 const a=api.createWarOperationsV115(rules);
 assert.equal(a.context,"free");assert.equal(a.reports.length,0);
 assert.equal(Object.keys(a.pressure).length,0);
});
