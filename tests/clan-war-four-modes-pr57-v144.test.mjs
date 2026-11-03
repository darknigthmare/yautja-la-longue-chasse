// PR57 behavior assertions adapted to the explicit PR67 supportGuard migration.
import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const built=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarBaseScreenV144';",
 "export * from './app/game/systems/clanWarOuterPaceV144';",
 "export * from './app/game/systems/clanWarStealthReinforcementV144';",
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarRtsSquadsV133';",
 "export * from './app/game/systems/clanWarParallelModesV137';",
 "export * from './app/game/systems/clanWarOuterIncidentV143';",
 "export * from './app/game/systems/clanWarMissionTerrainV116';",
 "export * from './app/game/systems/clanWarStealthPatrolV140';",
 "export * from './app/game/systems/clanWarSourceMapsV128';",
 "export * from './app/game/systems/clanWarRtsSourceMissionsV129';",
 "export * from './app/game/systems/clanWarBibleV6';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 platform:"node",format:"esm",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+
 Buffer.from(built.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const xy=x=>x.x+","+x.y;
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
function start(mode){
 const original=api.createWarOperationsV115(rules);
 const teamId=original.teams[0].id;
 const t=rules.territories.find(x=>x.id!==original.baseId&&
  !api.warMissionEligibleV115(original,rules,x.id,[teamId]));
 assert.ok(t,"real V6 target route missing");
 const opened=api.beginWarOperationV115(original,mode,t.id,[teamId],rules,1000);
 assert.equal(opened.accepted,true,opened.message);
 return {state:opened.state,teamId,targetId:t.id};
}
function assault(){
 const a=start("assault"),s={...a.state,active:{...a.state.active,
  assault:{...a.state.active.assault,ap:100}}};
 const deployed=api.deployAssaultUnitV115(s,a.teamId,rules);
 assert.equal(deployed.accepted,true,deployed.message);
 return {s:deployed.state,id:a.teamId};
}
function rts(){
 const s=api.createWarRtsSquadsV133("W3-RTS01",rules);
 const started=api.launchWarRtsSquadsV133(s);
 assert.equal(started.accepted,true,started.message);
 return started.state;
}

test("Assault V144: actual enemy hit consumes a real 16-AP base screen, never heals or recruits",()=>{
 const {s,id}=assault(),actor=s.active.assault.actors.find(u=>u.teamId===id);
 const defender={...s,active:{...s.active,assault:{...s.active.assault,
  actors:[...s.active.assault.actors,{id:"rival-144",teamId:null,
   unitId:actor.unitId,side:"rival",x:6,hp:45}]}}};
 const screened=api.commandWarAssaultBaseScreenV144(defender,id,rules);
 assert.equal(screened.accepted,true,screened.message);
 assert.equal(screened.state.active.assault.ap,defender.active.assault.ap-16);
 assert.equal(screened.state.rav,defender.rav);
 assert.equal(screened.state.clock,defender.clock);
 assert.deepEqual(screened.state.active.assault.baseScreenUsedIds,[id]);
 const ordinary=api.stepAssaultV115(defender,rules);
 const protectedTurn=api.stepAssaultV115(screened.state,rules);
 assert.equal(ordinary.accepted,true,ordinary.message);
 assert.equal(protectedTurn.accepted,true,protectedTurn.message);
 assert.equal(protectedTurn.state.active.assault.ownBase-
  ordinary.state.active.assault.ownBase,6,"screen absorbs exactly six real incoming base damage");
 assert.equal(protectedTurn.state.active.assault.baseScreen,undefined);
 assert.equal(protectedTurn.state.teams.length,s.teams.length);
 assert.equal(api.commandWarAssaultBaseScreenV144(protectedTurn.state,id,rules).accepted,false);
 assert.equal(s.active.assault.ownBase,80);
});

test("Assault V144: screen expires after three ticks, forged screen or no AP is rejected",()=>{
 const {s,id}=assault();
 const screened=api.commandWarAssaultBaseScreenV144(s,id,rules);
 assert.equal(screened.accepted,true,screened.message);
 assert.ok(api.readWarOperationsV115(JSON.stringify(screened.state),rules));
 let current=screened.state;
 for(let t=1;t<=3;t++){
  const next=api.stepAssaultV115(current,rules);
  assert.equal(next.accepted,true);
  current=next.state;
 }
 assert.equal(current.active.assault.baseScreen,undefined);
 assert.deepEqual(current.active.assault.baseScreenUsedIds,[id]);
 const broke={...s,active:{...s.active,assault:{...s.active.assault,ap:15}}};
 const no=api.commandWarAssaultBaseScreenV144(broke,id,rules);
 assert.equal(no.accepted,false);assert.equal(no.state,broke);
 const fake={...screened.state,active:{...screened.state.active,
  assault:{...screened.state.active.assault,baseScreen:{teamId:id,expiresAtTick:99}}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(fake),rules),null);
});

test("Outer V144: forced pace pays 3 RAV once, advances real deadline 8s but adds +2 threat",()=>{
 const {state}=start("outer"),order=state.outer[0];
 const original=api.simulateWarOuterMissionV115(state,order,rules);
 const paced=api.commandWarOuterPaceV144(state,order.id,order.startedAt+100,rules);
 assert.equal(paced.accepted,true,paced.message);
 const changed=paced.state.outer[0];
 assert.equal(paced.state.rav,state.rav-3);
 assert.equal(changed.dueAt,order.dueAt-8000);
 assert.deepEqual(changed.teamIds,order.teamIds);
 assert.deepEqual(changed.routeIds,order.routeIds);
 assert.equal(changed.forcedPace.originalDueAt,order.dueAt);
 assert.equal(changed.forcedPace.paidRav,3);
 assert.equal(paced.state.reports.length,0);
 const result=api.simulateWarOuterMissionV115(paced.state,changed,rules);
 assert.equal(result.threat,original.threat+2);
 assert.equal(result.strength,original.strength);
 assert.ok(result.engagementLog.some(x=>x.includes("Marche forcée V144")));
 assert.ok(api.readWarOperationsV115(JSON.stringify(paced.state),rules));
 assert.equal(api.commandWarOuterPaceV144(paced.state,order.id,order.startedAt+200,rules).accepted,false);
 assert.equal(api.orderWarOuterReconHaltV137(paced.state,order.id,order.startedAt+200,rules).accepted,false);
 assert.equal(api.warOuterIncidentV143(changed,order.startedAt+200,rules),null);
 const early=api.settleWarOuterOpsV115(paced.state,changed.dueAt-1,rules);
 assert.equal(early.accepted,false);
 const settled=api.settleWarOuterOpsV115(paced.state,changed.dueAt,rules);
 assert.equal(settled.accepted,true);
 assert.equal(settled.state.reports.length,1);
});

test("Outer V144: forged risk, spent funds, recall or late departure cannot be exploited",()=>{
 const {state}=start("outer"),order=state.outer[0];
 for(const at of [order.startedAt-1,order.dueAt,
  order.startedAt+Math.ceil((order.dueAt-order.startedAt)/3)]){
  const r=api.commandWarOuterPaceV144(state,order.id,at,rules);
  assert.equal(r.accepted,false);assert.equal(r.state,state);
 }
 const poor={...state,rav:2};
 assert.equal(api.commandWarOuterPaceV144(poor,order.id,order.startedAt+100,rules).accepted,false);
 const recalled=api.recallWarOuterMissionV116(state,order.id,order.startedAt+100,rules);
 assert.equal(recalled.accepted,true);
 assert.equal(api.commandWarOuterPaceV144(recalled.state,order.id,order.startedAt+100,rules).accepted,false);
 const good=api.commandWarOuterPaceV144(state,order.id,order.startedAt+100,rules);
 assert.equal(good.accepted,true);
 const wrong={...good.state,outer:[{...good.state.outer[0],
  forcedPace:{...good.state.outer[0].forcedPace,paidRav:0}}]};
 assert.equal(api.readWarOperationsV115(JSON.stringify(wrong),rules),null);
 const ret=api.recallWarOuterMissionV116(good.state,order.id,order.startedAt+200,rules);
 assert.equal(ret.accepted,true);
 assert.ok(api.readWarOperationsV115(JSON.stringify(ret.state),rules));
});

test("Stealth V144: second patrol is spawned on real terrain after alert and moves one step",()=>{
 const {state,targetId}=start("stealth");
 const terrain=api.warMissionTerrainV116(targetId,rules);
 const original={...state,active:{...state.active,stealth:{
  ...state.active.stealth,x:6,y:2,guardX:6,guardY:2,guardDirection:-1,
  alarm:0,energy:5,reinforcementMode:"decoy",decoyUsed:true,decoyTurns:0}}};
 const alert=api.commandStealthV115(original,"wait",rules);
 assert.equal(alert.accepted,true,alert.message);
 const enemy=alert.state.active?.stealth;
 assert.ok(enemy);
 assert.ok(enemy.alarm>=1);
 assert.ok(enemy.supportGuard,"alert following a previously used sonic decoy should summon a local patrol");
 assert.equal(api.warTerrainCellBlockedV116(terrain,enemy.supportGuard.x,
  enemy.supportGuard.y),false);
 assert.notEqual(xy({x:enemy.supportGuard.x,y:enemy.supportGuard.y}),
  xy({x:enemy.guardX,y:enemy.guardY}));
 const legacy={...alert.state,active:{...alert.state.active,stealth:{...enemy}}};
 delete legacy.active.stealth.supportGuard;
 delete legacy.active.stealth.reinforcementIssued;
 delete legacy.active.stealth.reinforcementMode;
 assert.ok(api.readWarOperationsV115(JSON.stringify(legacy),rules));
 assert.ok(api.readWarOperationsV115(JSON.stringify(alert.state),rules));
 const invalid={...alert.state,active:{...alert.state.active,stealth:{
  ...enemy,supportGuard:{...enemy.supportGuard,y:99}}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(invalid),rules),null);
});

test("Stealth V144: guards use separate actual movement, no off-map or walls on source regions",()=>{
 for(const territory of rules.territories){
  const terrain=api.warMissionTerrainV116(territory.id,rules);
  const first=api.warStealthPatrolSpawnV140(terrain);
  const second=api.warStealthReinforcementV144(terrain,first,{x:1,y:4});
  if(!second)continue;
  assert.equal(api.warTerrainCellBlockedV116(terrain,second.guardX,second.guardY),false);
  let p=second,lead=first;
  for(let turn=0;turn<12;turn++){
   const next=api.warStealthSecondGuardStepV144(terrain,lead,p,null);
   assert.ok(dist({x:p.guardX,y:p.guardY},{x:next.guardX,y:next.guardY})<=1);
   assert.equal(api.warTerrainCellBlockedV116(terrain,next.guardX,next.guardY),false);
   assert.ok(next.guardX>=4&&next.guardX<=7&&next.guardY>=1&&next.guardY<=3);
   assert.notEqual(xy({x:next.guardX,y:next.guardY}),xy({x:lead.guardX,y:lead.guardY}));
   p=next;
  }
 }
});

test("RTS V144: two real adjacent squads exchange their physical cells in one enemy tick",()=>{
 const s=rts();
 const a=s.squads[0],b=s.squads[1];
 const locations=s.map.tiles.filter(p=>api.warMapWalkableV128(s.map,p)&&
  !s.map.hazards.some(h=>xy(h)===xy(p))&&
  !s.enemies.some(e=>e.hp>0&&xy(e)===xy(p)));
 let pair=null;
 for(const p of locations){
  const other=locations.find(q=>dist(p,q)===1&&xy(q)!==xy(p));
  if(other){pair=[p,other];break;}
 }
 assert.ok(pair,"real source map needs a pair of adjacent walkable tiles");
 const staged={...s,enemies:[],squads:s.squads.map(u=>
  u.id===a.id?{...u,x:pair[0].x,y:pair[0].y}:
  u.id===b.id?{...u,x:pair[1].x,y:pair[1].y}:u)};
 const result=api.commandWarRtsSwapV144(staged,a.id,b.id);
 assert.equal(result.accepted,true,result.message);
 assert.equal(result.state.turn,s.turn+1);
 assert.equal(result.state.ravRemaining,staged.ravRemaining);
 assert.equal(xy(result.state.squads.find(u=>u.id===a.id)),xy(pair[1]));
 assert.equal(xy(result.state.squads.find(u=>u.id===b.id)),xy(pair[0]));
 assert.equal(result.state.squads.length,staged.squads.length);
 assert.equal(result.state.report,null);
 assert.equal(xy(staged.squads.find(u=>u.id===a.id)),xy(pair[0]));
});

test("RTS V144: nonadjacent, carrier, held post and powered-door restrictions reject without mutation",()=>{
 const s=rts(),a=s.squads[0],b=s.squads[1];
 assert.equal(api.commandWarRtsSwapV144(s,a.id,a.id).accepted,false);
 const far={...s,squads:s.squads.map(u=>u.id===b.id?
  {...u,x:s.map.goal.x,y:s.map.goal.y}:u)};
 assert.equal(api.commandWarRtsSwapV144(far,a.id,b.id).accepted,false);
 const neigh={...s,squads:s.squads.map(u=>u.id===b.id?
  {...u,x:a.x+1,y:a.y}:u),enemies:[]};
 const holding={...neigh,hold:{taskId:s.mission.tasks[0].id,squadId:a.id,progress:0,required:2}};
 assert.equal(api.commandWarRtsSwapV144(holding,a.id,b.id).accepted,false);
 const carried={...neigh,tracked:{id:"escort",kind:"survivor",x:a.x,y:a.y,
  hp:8,secured:true,extracted:false,isNeutral:true,carrierSquadId:a.id}};
 assert.equal(api.commandWarRtsSwapV144(carried,a.id,b.id).accepted,false);
});

test("Source QA: W3 missions and V85 campaign ownership remain unchanged",()=>{
 const audit=api.auditWarRtsSquadsV133(rules);
 assert.equal(audit.missions,24);assert.equal(audit.steps,72);
 assert.deepEqual(audit.issues,[]);
 const s=api.createWarOperationsV115(rules);
 assert.equal(s.context,"free");assert.equal(s.reports.length,0);
 assert.equal(Object.keys(s.pressure).length,0);
});
