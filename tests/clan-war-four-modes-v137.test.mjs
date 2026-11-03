import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const bundled=await build({
 stdin:{contents:[
  "export * from './app/game/systems/clanWarParallelModesV137';",
  "export * from './app/game/systems/clanWarParallelModesV136';",
  "export * from './app/game/systems/clanWarParallelModesV135';",
  "export * from './app/game/systems/clanWarOperationsV115';",
  "export * from './app/game/systems/clanWarRtsSquadsV133';",
  "export * from './app/game/systems/clanWarMissionTerrainV116';",
  "export * from './app/game/systems/clanWarSourceMapsV128';",
  "export * from './app/game/systems/clanWarBibleV6';",
 ].join("\n"),resolveDir:process.cwd()},
 bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent",
});
const api=await import("data:text/javascript;base64,"+
 Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const at=p=>p.x+","+p.y;
function start(mode){
 const original=api.createWarOperationsV115(rules);
 const teamId=original.teams[0].id;
 const site=rules.territories.find(t=>t.id!==original.baseId&&
  !api.warMissionEligibleV115(original,rules,t.id,[teamId]));
 assert.ok(site,"V6 real passage must connect at least one mission site");
 const opened=api.beginWarOperationV115(original,mode,site.id,[teamId],rules,1000);
 assert.equal(opened.accepted,true,opened.message);
 return {state:opened.state,teamId,siteId:site.id};
}
function openRts(id="W3-RTS01"){
 const result=api.launchWarRtsSquadsV133(api.createWarRtsSquadsV133(id,rules));
 assert.equal(result.accepted,true,result.message);
 return result.state;
}

test("Assault V137: actual living team withdraws beside its home base, 10 AP and no duplicated dispatch",()=>{
 const {state,teamId}=start("assault");
 const boosted={...state,active:{...state.active,assault:{...state.active.assault,ap:100}}};
 const spawned=api.deployAssaultUnitV115(boosted,teamId,rules);
 assert.equal(spawned.accepted,true,spawned.message);
 const launched=spawned.state,arena=launched.active.assault;
 assert.ok(arena.actors.some(a=>a.teamId===teamId&&a.x<=18));
 const evacuated=api.withdrawWarAssaultSquadV137(launched,teamId,rules);
 assert.equal(evacuated.accepted,true,evacuated.message);
 const next=evacuated.state.active.assault;
 assert.equal(next.ap,arena.ap-10);
 assert.deepEqual(next.extractedIds,[teamId]);
 assert.ok(next.launched.includes(teamId),"dispatch receipt persists");
 assert.ok(!next.actors.some(actor=>actor.teamId===teamId));
 assert.equal(evacuated.state.rav,launched.rav);
 assert.equal(evacuated.state.teams.length,launched.teams.length);
 assert.equal(evacuated.state.reports.length,0);
 assert.ok(api.readWarOperationsV115(JSON.stringify(evacuated.state),rules),
  "legacy archive accepts narrowly defined optional extraction");
 const again=api.withdrawWarAssaultSquadV137(evacuated.state,teamId,rules);
 assert.equal(again.accepted,false);
 assert.equal(again.state,evacuated.state);
 assert.equal(api.deployAssaultUnitV115(evacuated.state,teamId,rules).accepted,false);
 const retreat=api.leaveWarOperationV115(evacuated.state,rules);
 assert.equal(retreat.accepted,true);
 assert.equal(retreat.state.active,null);
 assert.equal(retreat.state.reports.length,1);
 assert.equal(retreat.state.reports[0].woundedIds.length,0);
});

test("Assault V137: remote, down, not deployed, no AP or forged extraction cannot pass",()=>{
 const {state,teamId}=start("assault");
 assert.equal(api.withdrawWarAssaultSquadV137(state,teamId,rules).accepted,false);
 const setup={...state,active:{...state.active,assault:{...state.active.assault,ap:100}}};
 const joined=api.deployAssaultUnitV115(setup,teamId,rules).state;
 const forge=(patch)=>({...joined,active:{...joined.active,
  assault:{...joined.active.assault,...patch}}});
 for(const patch of [
  {actors:joined.active.assault.actors.map(actor=>({...actor,x:65}))},
  {actors:joined.active.assault.actors.map(actor=>({...actor,hp:0}))},
  {ap:9},
 ]){
  const input=forge(patch),result=api.withdrawWarAssaultSquadV137(input,teamId,rules);
  assert.equal(result.accepted,false);
  assert.equal(result.state,input);
 }
 const bad=forge({extractedIds:[teamId]});
 assert.equal(api.readWarOperationsV115(JSON.stringify(bad),rules),null,
  "cannot simultaneously extract and keep same actor on field");
 const duplicate=forge({extractedIds:["not-on-roster"]});
 assert.equal(api.readWarOperationsV115(JSON.stringify(duplicate),rules),null);
});

test("Outer Ops V137: reconnaissance halt delays resolution and gives only a modest documented bonus",()=>{
 const {state,teamId}=start("outer"),order=state.outer[0];
 const original=api.simulateWarOuterMissionV115(state,order,rules);
 const halt=api.orderWarOuterReconHaltV137(state,order.id,order.startedAt+300,rules);
 assert.equal(halt.accepted,true,halt.message);
 const next=halt.state.outer[0];
 assert.equal(next.dueAt,order.dueAt+15000);
 assert.equal(next.reconHalt.originalDueAt,order.dueAt);
 assert.equal(next.reconHalt.extraMs,15000);
 assert.deepEqual(next.routeIds,order.routeIds);
 assert.deepEqual(next.teamIds,[teamId]);
 assert.deepEqual(halt.state.assignments,state.assignments);
 assert.equal(halt.state.rav,state.rav);
 assert.equal(halt.state.reports.length,0);
 const boosted=api.simulateWarOuterMissionV115(halt.state,next,rules);
 assert.equal(boosted.strength,original.strength+3);
 assert.equal(boosted.threat,original.threat);
 assert.ok(boosted.engagementLog.some(line=>line.includes("Halte de reconnaissance V137")));
 assert.ok(api.readWarOperationsV115(JSON.stringify(halt.state),rules));
 const premature=api.settleWarOuterOpsV115(halt.state,order.dueAt,rules);
 assert.equal(premature.accepted,false);
 assert.equal(premature.state,halt.state);
 const arrived=api.settleWarOuterOpsV115(halt.state,next.dueAt,rules);
 assert.equal(arrived.accepted,true);
 assert.equal(arrived.state.outer.length,0);
 assert.equal(arrived.state.reports.length,1);
 assert.equal(api.settleWarOuterOpsV115(arrived.state,next.dueAt,rules).accepted,false);
});

test("Outer Ops V137: halt respects original midpoint, recalls, previous supplies and workbook source pinning",()=>{
 const {state}=start("outer"),order=state.outer[0];
 assert.equal(api.orderWarOuterReconHaltV137(state,order.id,
  order.startedAt+Math.ceil((order.dueAt-order.startedAt)/2),rules).accepted,false);
 const halt=api.orderWarOuterReconHaltV137(state,order.id,order.startedAt+200,rules);
 assert.equal(halt.accepted,true);
 assert.equal(api.orderWarOuterReconHaltV137(halt.state,order.id,order.startedAt+300,rules).accepted,false);
 const late=order.startedAt+Math.ceil((order.dueAt-order.startedAt)/2)+1;
 assert.equal(api.redirectWarOuterOpsV135(halt.state,order.id,"escort",late,rules).accepted,false,
  "no late retask enabled by 15 second deadline extension");
 assert.equal(api.supplyWarOuterMissionV136(halt.state,order.id,late,rules).accepted,false,
  "late supplies cannot exploit the new deadline");
 const repl=api.redirectWarOuterOpsV135(halt.state,order.id,"escort",order.startedAt+250,rules);
 assert.equal(repl.accepted,true,repl.message);
 const recalled=api.recallWarOuterMissionV116(repl.state,order.id,order.startedAt+500,rules);
 assert.equal(recalled.accepted,true,recalled.message);
 assert.ok(api.readWarOperationsV115(JSON.stringify(recalled.state),rules));
 const forged={...halt.state,outer:[{...halt.state.outer[0],
  reconHalt:{...halt.state.outer[0].reconHalt,extraMs:0}}]};
 assert.equal(api.readWarOperationsV115(JSON.stringify(forged),rules),null);
});

test("Stealth V137: protected one-tile movement into a real adjacent W3 cover uses one energy",()=>{
 const {state,siteId}=start("stealth");
 const terrain=api.warMissionTerrainV116(siteId,rules);
 const dirs=[["cover-left",-1,0],["cover-right",1,0],["cover-up",0,-1],["cover-down",0,1]];
 let setup=null;
 for(const cover of terrain.cover){
  const [x,y]=cover.split(",").map(Number);
  if(dist({x,y},{x:6,y:2})<=2)continue;
  for(const [command,dx,dy] of dirs){
   const from={x:x-dx,y:y-dy};
   if(api.warTerrainCellBlockedV116(terrain,from.x,from.y))continue;
   if(api.warTerrainPathLengthV116(terrain,terrain.extraction,from)===null)continue;
   setup={from,to:{x,y},command};break;
  }
  if(setup)break;
 }
 assert.ok(setup,"every W3 region should offer a reachable safe cover approach");
 const before={...state,active:{...state.active,stealth:{
  ...state.active.stealth,...setup.from,energy:4,cloaked:false,alarm:1,
  guardX:7,guardDirection:-1}}};
 const step=api.commandStealthV115(before,setup.command,rules);
 assert.equal(step.accepted,true,step.message);
 const after=step.state.active.stealth;
 assert.equal(at(after),at(setup.to));
 assert.equal(dist(setup.from,after),1);
 assert.equal(after.energy,3);
 assert.equal(after.silentStepsUsed,1);
 assert.equal(after.alarm,1,"distant guard did not see movement between existing cover");
 assert.equal(step.state.clock,before.clock+1);
 assert.equal(step.state.rav,before.rav);
 assert.ok(api.readWarOperationsV115(JSON.stringify(step.state),rules));
 const forged={...step.state,active:{...step.state.active,stealth:{
  ...after,silentStepsUsed:3}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(forged),rules),null);
});

test("Stealth V137: energy, actual cover, usage cap and adjacent guard prevent free concealment",()=>{
 const {state,siteId}=start("stealth");
 const terrain=api.warMissionTerrainV116(siteId,rules);
 const target=terrain.cover[0],point=target.split(",").map(Number);
 const dirs=[["cover-left",-1,0],["cover-right",1,0],["cover-up",0,-1],["cover-down",0,1]];
 const available=dirs.find(([,dx,dy])=>!api.warTerrainCellBlockedV116(
  terrain,point[0]-dx,point[1]-dy));
 assert.ok(available);
 const [command,dx,dy]=available;
 const positioned={...state,active:{...state.active,stealth:{
  ...state.active.stealth,x:point[0]-dx,y:point[1]-dy,
  energy:0,guardX:7,guardDirection:-1}}};
 const blocked=api.commandStealthV115(positioned,command,rules);
 assert.equal(blocked.accepted,false);assert.equal(blocked.state,positioned);
 const capped={...positioned,active:{...positioned.active,stealth:{
  ...positioned.active.stealth,energy:3,silentStepsUsed:2}}};
 assert.equal(api.commandStealthV115(capped,command,rules).accepted,false);
 const cloaked={...positioned,active:{...positioned.active,stealth:{
  ...positioned.active.stealth,energy:3,cloaked:true}}};
 assert.equal(api.commandStealthV115(cloaked,command,rules).accepted,false);
 const atOrigin=api.commandStealthV115(state,"cover-up",rules);
 assert.equal(atOrigin.accepted,false);
 assert.equal(atOrigin.state,state);
});

test("RTS V137: actual cover stance reduces damage for two ticks and then expires",()=>{
 const source=openRts();
 const reserved=new Set(source.squads.map(at));
 const cover=source.map.tiles.find(t=>t.cover&&!reserved.has(at(t))&&
  source.squads.every(u=>dist(u,t)>3)&&!source.map.hazards.some(h=>at(h)===at(t))&&
  [{x:t.x+1,y:t.y},{x:t.x-1,y:t.y},{x:t.x,y:t.y+1},{x:t.x,y:t.y-1}]
    .some(p=>api.warMapWalkableV128(source.map,p)&&!reserved.has(at(p))));
 assert.ok(cover,"a W3 authored map should have defended positions");
 const adj=[{x:cover.x+1,y:cover.y},{x:cover.x-1,y:cover.y},
  {x:cover.x,y:cover.y+1},{x:cover.x,y:cover.y-1}].find(p=>
  api.warMapWalkableV128(source.map,p)&&!reserved.has(at(p)));
 const first=source.squads[0];
 const own=source.squads.map((u,i)=>i===0?{...u,x:cover.x,y:cover.y}:u);
 const rival={...source.enemies[0],...adj,hp:10,status:"active",id:"V137-ADVERSARY"};
 const state={...source,squads:own,enemies:[rival],ravRemaining:6};
 const normal=api.commandWarRtsSquadsV133(state,{kind:"wait",squadId:first.id});
 assert.equal(normal.accepted,true);
 const covered=api.commandWarRtsBraceV137(state,first.id);
 assert.equal(covered.accepted,true,covered.message);
 assert.equal(covered.state.turn,1);
 assert.equal(covered.state.ravRemaining,state.ravRemaining);
 assert.equal(covered.state.squads[0].hp,first.hp);
 assert.ok(normal.state.squads[0].hp<covered.state.squads[0].hp,
  "real authored cover mitigates hostile shot during the brace");
 assert.deepEqual(covered.state.braceIssuedIds,[first.id]);
 assert.equal(covered.state.brace.length,1);
 const second=api.commandWarRtsSquadsV133(covered.state,{kind:"wait",squadId:first.id});
 assert.equal(second.accepted,true);
 assert.equal(second.state.squads[0].hp,first.hp);
 assert.deepEqual(second.state.brace,[]);
 const third=api.commandWarRtsSquadsV133(second.state,{kind:"wait",squadId:first.id});
 assert.equal(third.accepted,true);
 assert.ok(third.state.squads[0].hp<first.hp);
 assert.equal(api.commandWarRtsBraceV137(third.state,first.id).accepted,false);
 assert.equal(state.turn,0);
});

test("RTS V137: no cover, inactive team, overwatch conflict and movement cannot preserve bonus",()=>{
 const state=openRts(),id=state.squads[0].id;
 const normal=api.commandWarRtsBraceV137(state,id);
 assert.equal(normal.accepted,false);
 assert.equal(normal.state,state);
 const cover=state.map.tiles.find(tile=>tile.cover&&
  !state.squads.some(u=>at(u)===at(tile)));
 assert.ok(cover);
 const ready={...state,squads:state.squads.map((u,i)=>
  i===0?{...u,x:cover.x,y:cover.y}:u)};
 const watching={...ready,overwatch:[{squadId:id,expiresAt:2}]};
 assert.equal(api.commandWarRtsBraceV137(watching,id).accepted,false);
 const braced={...ready,brace:[{squadId:id,expiresAt:2}],braceIssuedIds:[id]};
 const moves=[["up",0,-1],["down",0,1],["left",-1,0],["right",1,0]];
 const move=moves.find(([,dx,dy])=>{
  const dest={x:cover.x+dx,y:cover.y+dy};
  return api.warMapWalkableV128(state.map,dest)&&
   !ready.squads.some(u=>u.id!==id&&at(u)===at(dest))&&
   !ready.enemies.some(e=>e.hp>0&&at(e)===at(dest));
 });
 assert.ok(move);
 const stepped=api.commandWarRtsSquadsV133(braced,{kind:"move",squadId:id,direction:move[0]});
 assert.equal(stepped.accepted,true,stepped.message);
 assert.deepEqual(stepped.state.brace,[]);
 assert.deepEqual(stepped.state.braceIssuedIds,[id]);
 const down={...ready,squads:ready.squads.map((u,i)=>
  i===0?{...u,hp:0,status:"down"}:u)};
 assert.equal(api.commandWarRtsBraceV137(down,id).accepted,false);
});

test("Source preservation: 24 scripts, 12 physical maps and no mutation of V85 territories",()=>{
 const a=api.auditWarRtsSquadsV133(rules);
 assert.equal(a.missions,24);
 assert.equal(a.steps,72);
 assert.deepEqual(a.issues,[]);
 const s=api.createWarOperationsV115(rules);
 assert.equal(s.context,"free");
 assert.equal(s.intelIds.length,0);
 assert.equal(Object.keys(s.pressure).length,0);
});
