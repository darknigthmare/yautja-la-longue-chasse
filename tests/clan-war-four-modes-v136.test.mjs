import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

/**
 * Source-bound V136 cross-mode regression. The only real state is an
 * exercise from the bundled Bible V6; V85 ownership/XP is never forged.
 */
const built=await build({
 stdin:{contents:[
  "export * from './app/game/systems/clanWarParallelModesV136';",
  "export * from './app/game/systems/clanWarOperationsV115';",
  "export * from './app/game/systems/clanWarRtsSquadsV133';",
  "export * from './app/game/systems/clanWarMissionTerrainV116';",
  "export * from './app/game/systems/clanWarSourceMapsV128';",
  "export * from './app/game/systems/clanWarBibleV6';",
 ].join("\n"),resolveDir:process.cwd()},
 bundle:true,write:false,platform:"node",format:"esm",target:"es2022",logLevel:"silent",
});
const api=await import("data:text/javascript;base64,"+
 Buffer.from(built.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const start=(mode,now=1000)=>{
 const s=api.createWarOperationsV115(rules),team=s.teams[0].id;
 const territory=rules.territories.find(v=>v.id!==s.baseId&&
   !api.warMissionEligibleV115(s,rules,v.id,[team]));
 assert.ok(territory,"Source V6 must have a real reachable target");
 const opened=api.beginWarOperationV115(s,mode,territory.id,[team],rules,now);
 assert.equal(opened.accepted,true,mode+" "+opened.message);
 return {state:opened.state,team,target:territory.id};
};
const coord=p=>p.x+","+p.y;
const manhattan=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const rts=()=>{
 const drafted=api.createWarRtsSquadsV133("W3-RTS01",rules);
 const started=api.launchWarRtsSquadsV133(drafted);
 assert.equal(started.accepted,true,started.message);
 return started.state;
};

test("Assault — V136 line hold has real deployed team, 15 AP cost and exactly three stationary ticks",()=>{
 const {state,team}=start("assault");
 const withAp={...state,active:{...state.active,assault:{...state.active.assault,ap:100}}};
 const deployed=api.deployAssaultUnitV115(withAp,team,rules);
 assert.equal(deployed.accepted,true,deployed.message);
 const s=deployed.state,original=s.active.assault.actors.find(a=>a.teamId===team);
 assert.ok(original&&original.x<=25);
 const held=api.orderWarAssaultHoldV136(s,team,rules);
 assert.equal(held.accepted,true,held.message);
 assert.equal(held.state.active.assault.ap,s.active.assault.ap-15);
 assert.equal(held.state.rav,s.rav);
 assert.equal(held.state.clock,s.clock);
 assert.deepEqual(held.state.active.assault.holdIssuedIds,[team]);
 assert.equal(held.state.active.assault.heldUntil[team],4);
 assert.equal(api.readWarOperationsV115(JSON.stringify(held.state),rules)?.active?.assault?.heldUntil?.[team],4);
 let ticked=held.state;
 for(let i=1;i<=3;i++){
  const advanced=api.stepAssaultV115(ticked,rules);
  assert.equal(advanced.accepted,true,advanced.message);
  ticked=advanced.state;
  assert.equal(ticked.active?.assault?.actors.find(a=>a.teamId===team)?.x,original.x,"hold "+i);
  assert.equal(ticked.active?.tick,i);
 }
 const released=api.stepAssaultV115(ticked,rules);
 assert.equal(released.accepted,true);
 assert.ok(released.state.active.assault.actors.find(a=>a.teamId===team).x>original.x,
  "physical lane is released on the fourth tick");
 assert.deepEqual(released.state.active.assault.heldUntil,{});
 assert.equal(api.orderWarAssaultHoldV136(released.state,team,rules).accepted,false,
  "no second hold/extra defense to farm");
 assert.equal(state.active.assault.actors.length,0,"input never changed");
});

test("Assault — no distant fortification, free standing unit or invented AP",()=>{
 const {state,team}=start("assault");
 const unused=api.orderWarAssaultHoldV136(state,team,rules);
 assert.equal(unused.accepted,false);assert.equal(unused.state,state);
 const provisioned={...state,active:{...state.active,assault:{...state.active.assault,ap:100}}};
 const launch=api.deployAssaultUnitV115(provisioned,team,rules);
 assert.equal(launch.accepted,true);
 const s=launch.state;
 const distant={...s,active:{...s.active,assault:{...s.active.assault,
  actors:s.active.assault.actors.map(u=>u.teamId===team?{...u,x:40}:u)}}};
 assert.equal(api.orderWarAssaultHoldV136(distant,team,rules).accepted,false);
 const broke={...s,active:{...s.active,assault:{...s.active.assault,ap:14}}};
 const low=api.orderWarAssaultHoldV136(broke,team,rules);
 assert.equal(low.accepted,false);assert.equal(low.state,broke);
 const forged={...s,active:{...s.active,assault:{...s.active.assault,
  heldUntil:{[team]:s.active.tick+100},holdIssuedIds:[team]}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(forged),rules),null);
});

test("Outer Ops — paid support preserves one true route/team and boosts only its final calculation",()=>{
 const {state,team}=start("outer");
 const original=state.outer[0];
 const before=api.simulateWarOuterMissionV115(state,original,rules);
 const supported=api.supplyWarOuterMissionV136(state,original.id,original.startedAt+500,rules);
 assert.equal(supported.accepted,true,supported.message);
 const s=supported.state,op=s.outer[0];
 assert.equal(s.rav,state.rav-2);
 assert.equal(op.fieldSupport.paidRav,2);
 assert.equal(op.fieldSupport.allocatedAt,original.startedAt+500);
 assert.deepEqual(op.teamIds,[team]);
 assert.deepEqual(op.routeIds,original.routeIds);
 assert.equal(op.dueAt,original.dueAt);
 assert.deepEqual(s.assignments,state.assignments);
 assert.equal(s.reports.length,0,"no victory/XP before real deadline");
 const withSupplies=api.simulateWarOuterMissionV115(s,op,rules);
 assert.equal(withSupplies.strength-before.strength,4);
 assert.equal(withSupplies.threat,before.threat);
 assert.ok(withSupplies.engagementLog.some(line=>line.includes("Soutien V136")));
 assert.equal(api.readWarOperationsV115(JSON.stringify(s),rules)?.outer?.[0]?.fieldSupport?.paidRav,2);
 const second=api.supplyWarOuterMissionV136(s,original.id,original.startedAt+600,rules);
 assert.equal(second.accepted,false);assert.equal(second.state,s);
 const closed=api.settleWarOuterOpsV115(s,op.dueAt,rules);
 assert.equal(closed.accepted,true);
 assert.equal(closed.state.outer.length,0);
 assert.equal(closed.state.reports.length,1);
 assert.ok(closed.state.reports[0].engagementLog.some(line=>line.includes("Soutien V136")));
 assert.equal(api.settleWarOuterOpsV115(closed.state,op.dueAt,rules).accepted,false);
 assert.equal(state.rav>=s.rav+2,true);
});

test("Outer Ops — support refuses expired time, no RAV, recall; no invalid archive replay",()=>{
 const {state}=start("outer");
 const op=state.outer[0],first=op.startedAt+1;
 for(const bad of [op.startedAt-1,op.dueAt,
  op.startedAt+Math.ceil((op.dueAt-op.startedAt)/2)]){
  const v=api.supplyWarOuterMissionV136(state,op.id,bad,rules);
  assert.equal(v.accepted,false);
  assert.equal(v.state,state);
 }
 const poor={...state,rav:1};
 assert.equal(api.supplyWarOuterMissionV136(poor,op.id,first,rules).accepted,false);
 const recall=api.recallWarOuterMissionV116(state,op.id,op.startedAt+100,rules);
 assert.equal(recall.accepted,true);
 assert.equal(api.supplyWarOuterMissionV136(recall.state,op.id,first,rules).accepted,false);
 const backed=api.supplyWarOuterMissionV136(state,op.id,first,rules);
 assert.equal(backed.accepted,true);
 const recalled=api.recallWarOuterMissionV116(backed.state,op.id,op.startedAt+200,rules);
 assert.equal(recalled.accepted,true);
 assert.ok(api.readWarOperationsV115(JSON.stringify(recalled.state),rules));
 const invalid={...backed.state,outer:[{...backed.state.outer[0],
  fieldSupport:{allocatedAt:op.dueAt+50,paidRav:2}}]};
 assert.equal(api.readWarOperationsV115(JSON.stringify(invalid),rules),null);
 const wrongExpense={...backed.state,outer:[{...backed.state.outer[0],
  fieldSupport:{allocatedAt:first,paidRav:0}}]};
 assert.equal(api.readWarOperationsV115(JSON.stringify(wrongExpense),rules),null);
});

test("Stealth — each mapped W3 region has physical cover reached by a legal source-ground path",()=>{
 for(const territory of rules.territories){
  const terrain=api.warMissionTerrainV116(territory.id,rules);
  assert.ok(terrain.cover.length>=2,territory.id+" no cover");
  assert.ok(terrain.cover.every(cell=>!terrain.walls.includes(cell)),territory.id+" cover inside wall");
  assert.ok(terrain.cover.some(cell=>{
   const [x,y]=cell.split(",").map(Number);
   return api.warTerrainPathLengthV116(terrain,terrain.extraction,{x,y})!==null;
  }),territory.id+" no reachable defensive hiding spot");
 }
});

test("Stealth — hide occurs ON an unused authored cover and reduces alert only when physically unseen",()=>{
 const {state,target}=start("stealth");
 const terrain=api.warMissionTerrainV116(target,rules);
 const cover=terrain.cover.find(c=>{
  const [x,y]=c.split(",").map(Number);
  return manhattan({x,y},{x:6,y:2})>2;
 });
 assert.ok(cover,"safe cover should exist in this region");
 const [x,y]=cover.split(",").map(Number);
 const staged={...state,active:{...state.active,stealth:{...state.active.stealth,
   x,y,alarm:2,energy:2,guardX:7,guardDirection:-1}}};
 const hidden=api.commandStealthV115(staged,"hide",rules);
 assert.equal(hidden.accepted,true,hidden.message);
 const next=hidden.state.active.stealth;
 assert.deepEqual(next.usedCoverIds,[cover]);
 assert.equal(next.x,x);assert.equal(next.y,y);
 assert.equal(hidden.state.clock,staged.clock+1);
 assert.equal(next.alarm,1);
 assert.equal(next.energy,3);
 assert.equal(hidden.state.rav,staged.rav);
 assert.equal(hidden.state.reports.length,0);
 assert.ok(api.readWarOperationsV115(JSON.stringify(hidden.state),rules));
 const again=api.commandStealthV115(hidden.state,"hide",rules);
 assert.equal(again.accepted,false);assert.equal(again.state,hidden.state);
 const initial=api.commandStealthV115(state,"hide",rules);
 assert.equal(initial.accepted,false);assert.equal(initial.state,state);
 const dup={...hidden.state,active:{...hidden.state.active,stealth:{
  ...next,usedCoverIds:[cover,cover]}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(dup),rules),null);
 const fake={...hidden.state,active:{...hidden.state.active,stealth:{
  ...next,usedCoverIds:["4,999"]}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(fake),rules),null);
});

test("Stealth — cover cannot make the hunter disappear in an adjacent guard's face",()=>{
 const {state,target}=start("stealth");
 const terrain=api.warMissionTerrainV116(target,rules);
 const point=terrain.cover.find(c=>{
  const [x,y]=c.split(",").map(Number);
  return y===2&&x>=5;
 });
 if(!point)return; // Some worlds correctly contain only distant cover.
 const [x,y]=point.split(",").map(Number);
 const staged={...state,active:{...state.active,stealth:{
  ...state.active.stealth,x,y,alarm:1,energy:2,guardX:6,guardDirection:-1}}};
 const action=api.commandStealthV115(staged,"hide",rules);
 assert.equal(action.accepted,true);
 const result=action.state.active?.stealth;
 assert.ok(result);
 if(manhattan(result,{x:result.guardX,y:2})<=1)
  assert.ok(result.alarm>=staged.active.stealth.alarm,
   "Adjacent guard should still see the hidden hunter");
});

test("RTS — two-tick overwatch never fires unseen, and never consumes unused RAV",()=>{
 const initial=rts(),squad=initial.squads[0];
 const hidden={...initial,enemies:[{...initial.enemies[0],x:initial.map.goal.x,y:initial.map.goal.y}]};
 assert.ok(manhattan(squad,hidden.enemies[0])>squad.range+2);
 const order=api.commandWarRtsOverwatchV136(hidden,squad.id);
 assert.equal(order.accepted,true,order.message);
 assert.equal(order.state.turn,1);
 assert.equal(order.state.ravRemaining,hidden.ravRemaining);
 assert.equal(order.state.overwatch.length,1);
 assert.equal(order.state.overwatch[0].expiresAt,2);
 const waited=api.commandWarRtsSquadsV133(order.state,{kind:"wait",squadId:squad.id});
 assert.equal(waited.accepted,true);
 assert.deepEqual(waited.state.overwatch,[],"expiring watch is cleared at second tick");
 assert.equal(waited.state.ravRemaining,hidden.ravRemaining,"no phantom ammo for unseen enemy");
 assert.equal(hidden.turn,0);
});

test("RTS — one real enemy enters LOS and watch fires once after the AI response",()=>{
 const state=rts(),squad=state.squads[0];
 const positions=new Set(state.squads.map(coord));
 const near=[
  {x:squad.x+1,y:squad.y},{x:squad.x-1,y:squad.y},
  {x:squad.x,y:squad.y+1},{x:squad.x,y:squad.y-1},
 ].find(p=>api.warMapWalkableV128(state.map,p)&&!positions.has(coord(p)));
 assert.ok(near);
 const enemy={...state.enemies[0],...near,hp:9,status:"active",id:"W136-VISIBLE-RIVAL"};
 const patched={...state,enemies:[enemy],ravRemaining:4};
 const watched=api.commandWarRtsOverwatchV136(patched,squad.id);
 assert.equal(watched.accepted,true,watched.message);
 assert.equal(watched.state.turn,1);
 assert.equal(watched.state.ravRemaining,3);
 assert.ok(watched.state.enemies[0].hp<enemy.hp);
 assert.equal(watched.state.overwatch.length,0);
 assert.equal(watched.state.report,null);
 assert.equal(watched.state.map.planetId,patched.map.planetId);
 assert.equal(watched.state.mission.id,patched.mission.id);
 assert.equal(patched.enemies[0].hp,9);
 const noAmmo={...patched,ravRemaining:0};
 const denied=api.commandWarRtsOverwatchV136(noAmmo,squad.id);
 assert.equal(denied.accepted,false);assert.equal(denied.state,noAmmo);
});

test("RTS — moving squad cancels its watch; no duplicate orders or free simultaneous fire",()=>{
 const s=rts(),squad=s.squads[0];
 const armed={...s,overwatch:[{squadId:squad.id,expiresAt:2}]};
 const duplicated=api.commandWarRtsOverwatchV136(armed,squad.id);
 assert.equal(duplicated.accepted,false);assert.equal(duplicated.state,armed);
 const dirs=[["up",0,-1],["right",1,0],["down",0,1],["left",-1,0]];
 const next=dirs.find(([,dx,dy])=>{
  const p={x:squad.x+dx,y:squad.y+dy};
  return api.warMapWalkableV128(s.map,p)&&
   !s.squads.some(u=>u.id!==squad.id&&u.status==="active"&&coord(u)===coord(p))&&
   !s.enemies.some(e=>e.hp>0&&coord(e)===coord(p));
 });
 assert.ok(next);
 const moved=api.commandWarRtsSquadsV133(armed,{
  kind:"move",squadId:squad.id,direction:next[0],
 });
 assert.equal(moved.accepted,true,moved.message);
 assert.ok(!moved.state.overwatch.some(w=>w.squadId===squad.id));
 assert.equal(manhattan(squad,moved.state.squads.find(u=>u.id===squad.id)),1);
 assert.equal(armed.turn,0);
});

test("Every V136 route remains scoped to the original planet, V6 units and V85 non-mutation",()=>{
 const sample=rts(),source=sample.sourceSha;
 assert.equal(api.auditWarRtsSquadsV133(rules).issues.length,0);
 for(const missionId of api.WAR_SOURCE_RTS_IDS_V129){
  const s=api.createWarRtsSquadsV133(missionId,rules);
  assert.equal(s.map.planetId,s.mission.planetId);
  assert.ok(!/Gunnison|Los Angeles|Bouvet/i.test(s.map.planetName));
  assert.equal(s.sourceSha,source);
  assert.equal(s.report,null);
 }
 const s=api.createWarOperationsV115(rules);
 assert.equal(s.context,"free");
 assert.equal(s.pressure&&Object.keys(s.pressure).length,0);
 assert.equal(s.intelIds.length,0);
});
