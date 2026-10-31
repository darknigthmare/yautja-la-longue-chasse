import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const bundled=await build({
 stdin:{contents:[
  "export * from './app/game/systems/clanWarRtsSquadsV133';",
  "export * from './app/game/systems/clanWarRtsSourceMissionsV129';",
  "export * from './app/game/systems/clanWarSourceMapsV128';",
  "export * from './app/game/systems/clanWarBibleV6';",
 ].join("\n"),resolveDir:process.cwd()},
 bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent",
});
const api=await import("data:text/javascript;base64,"+Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const coord=p=>p.x+","+p.y;
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const start=(id)=>{
 const draft=api.createWarRtsSquadsV133(id,rules);
 const launched=api.launchWarRtsSquadsV133(draft);
 assert.equal(launched.accepted,true,launched.message);
 return launched.state;
};
const live=s=>s.squads.filter(u=>u.status==="active");

test("24 missions W3: synchronized rally steps are physical, nonoverlapping and spend ONE enemy turn",()=>{
 let changed=0;
 for(const id of api.WAR_SOURCE_RTS_IDS_V129){
  const state=start(id),ids=live(state).map(u=>u.id);
  const target=state.map.goal;
  const beforeEnemies=state.enemies.map(e=>({...e}));
  const plan=api.planWarRtsRallyV134(state,ids,target);
  assert.equal(plan.valid,true,id+" "+plan.reason);
  assert.ok(plan.steps.length+plan.blockedIds.length+plan.holdingIds.length<=ids.length,id);
  for(const step of plan.steps){
   assert.equal(dist(step.from,step.to),1,id+" attempted to teleport");
   assert.ok(api.warMapWalkableV128(state.map,step.to),id+" crossed blocked surface");
   assert.ok(!state.enemies.some(e=>e.hp>0&&coord(e)===coord(step.to)),id+" occupied enemy tile");
  }
  if(!plan.steps.length)continue;
  changed++;
  const update=api.commandWarRtsRallyV134(state,ids,target);
  assert.equal(update.accepted,true,id+" "+update.message);
  const after=update.state;
  assert.equal(after.turn,state.turn+1,id+" extra enemy turn for group");
  assert.equal(after.ravRemaining,state.ravRemaining,id+" free movement must not consume ammo");
  assert.equal(after.sourceSha,state.sourceSha,id+" source SHA changed");
  assert.equal(after.map.planetId,state.map.planetId,id+" planet changed");
  assert.equal(after.report?.campaignMutation??false,false,id+" invalid permanent gain");
  const squares=live(after).map(coord);
  assert.equal(new Set(squares).size,squares.length,id+" allied stack");
  const newPositions=new Map(after.squads.map(u=>[u.id,u]));
  for(const original of state.squads){
   const next=newPositions.get(original.id);
   assert.ok(next,id+" identity disappeared");
   assert.ok(dist(original,next)<=1,id+" group teleported "+original.id);
   assert.equal(original.unitId,next.unitId);
   assert.equal(original.memberCount,next.memberCount);
  }
  for(const enemy of beforeEnemies){
   const next=after.enemies.find(e=>e.id===enemy.id);
   assert.ok(next);
   assert.ok(dist(enemy,next)<=1,id+" enemy moved multiple tiles on single tick");
  }
  assert.equal(state.turn,0,id+" mutated input state");
 }
 assert.ok(changed>=12,"Rally command should move actual squads across diverse W3 worlds");
});

test("invalid group orders never consume a tick, ammo or intelligence",()=>{
 const state=start("W3-RTS01"),one=state.squads[0].id;
 const bad=[
  {ids:[],target:state.map.goal},
  {ids:[one,one],target:state.map.goal},
  {ids:["fake-team"],target:state.map.goal},
  {ids:[one],target:{x:-1,y:3}},
  {ids:[one],target:{x:Number.NaN,y:4}},
  {ids:[one],target:{x:state.map.width+100,y:1}},
 ];
 for(const item of bad){
  const plan=api.planWarRtsRallyV134(state,item.ids,item.target);
  assert.equal(plan.valid,false,plan.reason);
  const rejected=api.commandWarRtsRallyV134(state,item.ids,item.target);
  assert.equal(rejected.accepted,false);
  assert.equal(rejected.state,state);
  assert.equal(state.turn,0);
  assert.equal(state.ravRemaining,state.initialRav);
 }
 const already={...state,phase:"victory"};
 assert.equal(api.commandWarRtsRallyV134(already,[one],already.map.goal).accepted,false);
 assert.equal(api.planWarRtsRallyV134(state,undefined,state.map.goal).valid,false);
 assert.equal(api.planWarRtsRallyV134(state,[one],null).valid,false);
});

test("powered doors, water, lava and active hazards are not crossed by group pathfinding",()=>{
 for(const id of api.WAR_SOURCE_RTS_IDS_V129){
  const state=start(id);
  const plan=api.planWarRtsRallyV134(state,[state.squads[0].id],state.map.goal);
  for(const step of plan.steps)assert.ok(api.warMapWalkableV128(state.map,step.to));
 }
 const orbital=start("W3-RTS23");
 assert.equal(orbital.map.worldStratum,"orbital-vessel");
 assert.ok(orbital.map.poweredDoors.length>0,"orbital W3 should have motorized airlock");
 const off={...orbital,power:false};
 const target=off.map.poweredDoors[0];
 assert.equal(api.planWarRtsRallyV134(off,[off.squads[0].id],target).valid,false);
 const rejected=api.commandWarRtsRallyV134(off,[off.squads[0].id],target);
 assert.equal(rejected.accepted,false);
 assert.equal(rejected.state,off);
 const open=api.planWarRtsRallyV134(orbital,[orbital.squads[0].id],target);
 assert.equal(open.valid,true);
 const hazardMap={...orbital.map,hazards:[...orbital.map.mandatoryPaths[0].slice(1,8)]};
 const timed={...orbital,map:hazardMap,turn:2}; // T3 is a live hazard window
 const unsafe=new Set(hazardMap.hazards.map(coord));
 const hazardPlan=api.planWarRtsRallyV134(timed,[timed.squads[0].id],timed.map.goal);
 assert.equal(hazardPlan.valid,true);
 assert.ok(hazardPlan.steps.every(step=>!unsafe.has(coord(step.to))),"Rally walked into a live warning");
});

test("a survivor or a neutral witness can receive a physically adjacent escort leader after a casualty",()=>{
 for(const [id,neutral] of [["W3-RTS06",false],["W3-RTS24",true]]){
  const original=start(id);
  assert.ok(original.tracked);
  const [leader,replacement]=original.squads;
  const abandoned={
   ...original,enemies:[],map:{...original.map,hazards:[]},
   squads:original.squads.map(u=>u.id===leader.id?{...u,hp:0,status:"down"}:u),
   tracked:{...original.tracked,secured:true,hp:8,
    x:replacement.x,y:replacement.y,carrierSquadId:leader.id},
  };
  assert.equal(abandoned.tracked.isNeutral,neutral);
  const update=api.commandWarRtsSquadsV133(abandoned,{kind:"pickup",squadId:replacement.id});
  assert.equal(update.accepted,true,id+" "+update.message);
  assert.equal(update.state.turn,abandoned.turn+1);
  assert.equal(update.state.tracked?.carrierSquadId,replacement.id);
  assert.equal(update.state.tracked?.isNeutral,neutral);
  assert.equal(update.state.tracked?.hp,8);
  assert.equal(update.state.squads.length,abandoned.squads.length,"no free recruit");
  assert.equal(update.state.report,null);
  assert.equal(abandoned.tracked.carrierSquadId,leader.id,"input mutated");
  const again=api.commandWarRtsSquadsV133(update.state,{kind:"pickup",squadId:replacement.id});
  assert.equal(again.accepted,false,"cannot claim same handoff twice");
 }
});

test("handoff is rejected remotely and cargo never duplicates between squads",()=>{
 const s=start("W3-RTS05"),[leader,next]=s.squads;
 assert.equal(s.tracked?.kind,"beacon");
 const remote={...s,enemies:[],map:{...s.map,hazards:[]},
  tracked:{...s.tracked,secured:true,carrierSquadId:leader.id,
    x:s.map.goal.x,y:s.map.goal.y}};
 const denied=api.commandWarRtsSquadsV133(remote,{kind:"pickup",squadId:next.id});
 assert.equal(denied.accepted,false);
 assert.equal(denied.state,remote);
 assert.equal(remote.turn,0);
 const adjacent={...remote,tracked:{...remote.tracked,x:next.x,y:next.y}};
 const moved=api.commandWarRtsSquadsV133(adjacent,{kind:"pickup",squadId:next.id});
 assert.equal(moved.accepted,true,moved.message);
 assert.equal(moved.state.tracked?.carrierSquadId,next.id);
 assert.equal(coord(moved.state.tracked),coord(moved.state.squads.find(u=>u.id===next.id)));
 assert.equal(moved.state.squads.length,s.squads.length);
 assert.equal(moved.state.report,null);
});
