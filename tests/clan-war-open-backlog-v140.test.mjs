import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const bundle=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarOpenBacklogV140';",
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarMissionTerrainV116';",
 "export * from './app/game/systems/clanWarRtsSquadsV133';",
 "export * from './app/game/systems/clanWarSourceMapsV128';",
 "export * from './app/game/systems/clanWarBibleV6';",
 "export * from './app/game/systems/clanWarRtsSourceMissionsV129';",
].join("\n"),resolveDir:process.cwd()},
 bundle:true,write:false,platform:"node",format:"esm",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+
 Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const key=p=>p.x+","+p.y;
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const start=(mode)=>{
 const base=api.createWarOperationsV115(rules),teamId=base.teams[0].id;
 const site=rules.territories.find(t=>t.id!==base.baseId&&
  !api.warMissionEligibleV115(base,rules,t.id,[teamId]));
 assert.ok(site,"source-connected V6 territory required");
 const active=api.beginWarOperationV115(base,mode,site.id,[teamId],rules,1000);
 assert.equal(active.accepted,true,active.message);
 return {state:active.state,site,teamId};
};
const startRts=id=>{
 const result=api.launchWarRtsSquadsV133(api.createWarRtsSquadsV133(id,rules));
 assert.equal(result.accepted,true,result.message);
 return result.state;
};

test("Assault V140 — all 36 source territories have deterministic, PC-budgeted waves from real W3-U roles",()=>{
 let nonempty=0;
 for(const territory of rules.territories){
  const a=api.planWarAssaultWavesV140(territory.id,rules);
  assert.deepEqual(a,api.planWarAssaultWavesV140(territory.id,rules));
  if(a.length)nonempty++;
  assert.ok(a.length<=11,territory.id);
  assert.equal(new Set(a.map(w=>w.id)).size,a.length);
  assert.ok(a.reduce((sum,w)=>sum+w.commandPoints,0)<=territory.garrisonPc,
   territory.id+" exceeded its real garrison PC");
  for(const wave of a){
   const unit=rules.units.find(u=>u.id===wave.unitId);
   assert.ok(unit&&unit.fullMembers>0,territory.id+" invented unit");
   assert.equal(wave.commandPoints,unit.commandPoints);
   assert.equal(wave.sourceTerritoryId,territory.id);
   assert.equal(wave.sourceRegionId,territory.region);
   assert.equal(wave.unitRole,unit.role);
   assert.ok(wave.turn%8===0&&wave.turn>=8&&wave.turn<=88);
  }
 }
 assert.equal(nonempty,36,"V6 territories must have a source garrison quota");
 assert.throws(()=>api.planWarAssaultWavesV140("UNKNOWN-PLANET",rules),RangeError);
});

test("Assault V140 — a real scheduled enemy consumes quota and is archived, never generated each tick",()=>{
 const {state,site}=start("assault");
 const schedule=api.planWarAssaultWavesV140(site.id,rules);
 assert.ok(schedule.length>0);
 let current=state;
 for(let i=1;i<=8;i++){
  const advance=api.stepAssaultV115(current,rules);
  assert.equal(advance.accepted,true,advance.message);
  current=advance.state;
  assert.ok(current.active,"no assault completion before the first source wave");
 }
 const receipts=current.active.assault.spawnedWaves;
 assert.equal(receipts.length,1);
 assert.equal(receipts[0].id,schedule[0].id);
 assert.ok(current.active.assault.actors.some(u=>
   u.side==="rival"&&u.unitId===schedule[0].unitId));
 assert.ok(api.readWarOperationsV115(JSON.stringify(current),rules));
 assert.equal(state.active.assault.actors.length,0);
 const forged={...current,active:{...current.active,assault:{
  ...current.active.assault,spawnedWaves:[{...receipts[0],unitId:"UNKNOWN"}]}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(forged),rules),null);
});

test("Outer Ops V140 — passage incidents are purely sourced, bounded and deterministic",()=>{
 const {state}=start("outer");
 const order=state.outer[0];
 const first=api.planWarOuterIncidentsV140(order,rules);
 assert.deepEqual(first,api.planWarOuterIncidentsV140(order,rules));
 assert.ok(first.extraThreat>=0&&first.extraThreat<=4);
 assert.ok(first.incidents.length<=3);
 for(const item of first.incidents){
  const passage=rules.passages.find(p=>p.id===item.passageId);
  assert.ok(passage,"no invented alien route");
  assert.equal(item.passageName,passage.name);
  assert.equal(item.sourceNote,passage.incident.trim().slice(0,150));
  assert.ok(order.routeIds.includes(item.passageId));
 }
 const report=api.simulateWarOuterMissionV115(state,order,rules);
 assert.ok(report.engagementLog.some(line=>line.includes("aléas V140 source")));
 assert.equal(state.reports.length,0,"no battle outcome before deadline");
});

test("Outer Ops V140 — route incident impact changes only the resolved threat, not passage ownership or upkeep",()=>{
 const {state}=start("outer"),order=state.outer[0];
 const nonempty=rules.passages.filter(p=>p.incident.trim()&&
   !/^(aucun|sans incident|néant|none)$/i.test(p.incident.trim()));
 assert.ok(nonempty.length>0,"V6 passage sheet must have at least one authored incident");
 const withSource={...order,routeIds:nonempty.slice(0,3).map(p=>p.id)};
 const incidents=api.planWarOuterIncidentsV140(withSource,rules);
 assert.ok(incidents.incidents.length>0);
 assert.ok(incidents.extraThreat>0);
 const score=api.simulateWarOuterMissionV115(state,withSource,rules);
 const empty={...withSource,routeIds:[]};
 const noEvent=api.simulateWarOuterMissionV115(state,empty,rules);
 assert.ok(score.threat>=noEvent.threat);
 assert.equal(score.strength,noEvent.strength);
 assert.equal(state.rav,state.rav);
 assert.ok(score.engagementLog.some(line=>line.includes("aléas V140 source")));
 assert.throws(()=>api.planWarOuterIncidentsV140(
  {...order,routeIds:["NONEXISTENT-W3-PASSAGE"]},rules),RangeError);
});

test("Stealth V140 — six regional maps have reachable original control panels and powered gate tiles",()=>{
 assert.equal(rules.territories.length,36);
 for(const t of rules.territories){
  const map=api.warMissionTerrainV116(t.id,rules);
  assert.equal(key(map.controlPanel),"7,3");
  assert.equal(key(map.poweredDoor),"7,2");
  assert.equal(api.warTerrainCellBlockedV116(map,7,3),false);
  assert.equal(api.warTerrainCellBlockedV116(map,7,2),false);
  assert.ok(api.warTerrainPathLengthV116(map,map.extraction,map.controlPanel)!==null,
   t.id+" inaccessible physical panel");
 }
});

test("Stealth V140 — cutting the physical circuit locks the motorized door; restore reopens it",()=>{
 const {state,site}=start("stealth"),map=api.warMissionTerrainV116(site.id,rules);
 const staged={...state,active:{...state.active,stealth:{
  ...state.active.stealth,x:map.controlPanel.x,y:map.controlPanel.y,
  energy:5,guardX:4,guardDirection:1,alarm:0}}};
 const cut=api.commandStealthV115(staged,"cut-grid",rules);
 assert.equal(cut.accepted,true,cut.message);
 assert.equal(cut.state.active.stealth.gridPowered,false);
 assert.equal(cut.state.active.stealth.gridSwitches,1);
 assert.equal(cut.state.active.stealth.energy,4);
 assert.equal(cut.state.clock,staged.clock+1);
 assert.equal(cut.state.reports.length,0);
 assert.equal(cut.state.rav,staged.rav);
 assert.ok(api.readWarOperationsV115(JSON.stringify(cut.state),rules));
 const shut=api.commandStealthV115(cut.state,"up",rules);
 assert.equal(shut.accepted,false);
 assert.equal(shut.state,cut.state,"a powered gate must remain physically blocked");
 const restored=api.commandStealthV115(cut.state,"restore-grid",rules);
 assert.equal(restored.accepted,true,restored.message);
 assert.equal(restored.state.active.stealth.gridPowered,true);
 assert.equal(restored.state.active.stealth.gridSwitches,2);
 assert.equal(restored.state.active.stealth.energy,3);
 const opened=api.commandStealthV115(restored.state,"up",rules);
 assert.equal(opened.accepted,true,opened.message);
 assert.equal(key(opened.state.active.stealth),key(map.poweredDoor));
 assert.equal(api.commandStealthV115(opened.state,"cut-grid",rules).accepted,false);
});

test("Stealth V140 — no remote switch, no fake blackout, no zero-energy free commands",()=>{
 const {state}=start("stealth");
 const remote=api.commandStealthV115(state,"cut-grid",rules);
 assert.equal(remote.accepted,false);assert.equal(remote.state,state);
 const local={...state,active:{...state.active,stealth:{
  ...state.active.stealth,x:7,y:3,energy:0}}};
 assert.equal(api.commandStealthV115(local,"cut-grid",rules).accepted,false);
 const forged={...state,active:{...state.active,stealth:{
  ...state.active.stealth,gridPowered:false,gridSwitches:0}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(forged),rules),null);
 const tooMany={...state,active:{...state.active,stealth:{
  ...state.active.stealth,gridPowered:true,gridSwitches:3}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(tooMany),rules),null);
 assert.ok(api.readWarOperationsV115(JSON.stringify(state),rules),
  "pre-V140 archived game remains compatible");
});

test("RTS V140 — all 24 W3 missions accept traffic plans without spending RAV or leaking invisible patrols",()=>{
 let moved=0;
 for(const id of api.WAR_SOURCE_RTS_IDS_V129){
  const state=startRts(id),selected=state.squads.filter(u=>u.status==="active").map(u=>u.id);
  const target=state.map.goal;
  const plan=api.planWarRtsTrafficV140(state,selected,target);
  assert.equal(plan.valid,true,id+": "+plan.reason);
  assert.ok(plan.steps.length+plan.holdingIds.length+plan.blockedIds.length<=selected.length,id);
  const expectedDestinations=plan.steps.map(item=>key(item.to));
  assert.equal(new Set(expectedDestinations).size,expectedDestinations.length,id+" reserved destinations");
  for(const step of plan.steps){
   assert.equal(dist(step.from,step.to),1,id+" teleported");
   assert.ok(api.warMapWalkableV128(state.map,step.to),id+" walked through a wall/liquid");
  }
  if(!plan.steps.length)continue;
  moved++;
  const advanced=api.commandWarRtsTrafficV140(state,selected,target);
  assert.equal(advanced.accepted,true,id+" "+advanced.message);
  assert.equal(advanced.state.turn,state.turn+1,id+" multiple opponent turns");
  assert.equal(advanced.state.ravRemaining,state.ravRemaining,id+" invented RAV cost");
  assert.equal(advanced.state.mission.planetId,state.mission.planetId);
  assert.equal(advanced.state.report?.campaignMutation??false,false);
  const units=advanced.state.squads.filter(u=>u.status==="active");
  assert.equal(new Set(units.map(key)).size,units.length,id+" team overlap");
  for(const old of state.squads){
   const current=advanced.state.squads.find(u=>u.id===old.id);
   assert.ok(current);
   assert.ok(dist(old,current)<=1,id+" multi-tile move");
   assert.equal(current.memberCount,old.memberCount);
  }
  assert.equal(state.turn,0,"input mutated");
 }
 assert.ok(moved>=12,"convoy improvements should run on diverse W3 maps");
});

test("RTS V140 — invalid traffic orders are rejected without a combat tick",()=>{
 const state=startRts("W3-RTS01"),id=state.squads[0].id;
 for(const [ids,target] of [
  [[],state.map.goal],[[id,id],state.map.goal],[["unknown"],state.map.goal],
  [[id],{x:-1,y:2}],[[id],{x:state.map.width+1,y:1}],
 ]){
  const plan=api.planWarRtsTrafficV140(state,ids,target);
  assert.equal(plan.valid,false);
  const refused=api.commandWarRtsTrafficV140(state,ids,target);
  assert.equal(refused.accepted,false);
  assert.equal(refused.state,state);
 }
 assert.equal(state.turn,0);
});

test("RTS V140 — the vacated leader tile can be used by a follower in the same tick",()=>{
 let found=false;
 for(const id of api.WAR_SOURCE_RTS_IDS_V129){
  const seed=startRts(id),route=seed.map.mandatoryPaths[0];
  const active=seed.squads.filter(u=>u.status==="active");
  if(active.length<2)continue;
  for(let i=6;i<route.length-8&&!found;i++){
   const follower=route[i],leader=route[i+1],target=route[i+7];
   if(dist(follower,leader)!==1||dist(leader,target)<=2)continue;
   const rest=active.slice(2).map(u=>({x:u.x,y:u.y}));
   if(rest.some(p=>key(p)===key(follower)||key(p)===key(leader)))continue;
   const state={...seed,enemies:[],map:{...seed.map,hazards:[]},
    squads:seed.squads.map((u,n)=>n===0?{...u,...follower}:n===1?{...u,...leader}:u)};
   const plan=api.planWarRtsTrafficV140(state,[active[0].id,active[1].id],target);
   const tail=plan.steps.find(step=>step.squadId===active[0].id);
   const head=plan.steps.find(step=>step.squadId===active[1].id);
   if(!tail||!head||key(tail.to)!==key(head.from))continue;
   const r=api.commandWarRtsTrafficV140(state,[active[0].id,active[1].id],target);
   assert.equal(r.accepted,true,r.message);
   assert.equal(r.state.turn,state.turn+1);
   assert.equal(new Set(r.state.squads.map(key)).size,r.state.squads.length);
   assert.equal(key(r.state.squads[0]),key(head.from),"follower advanced into vacated cell");
   found=true;
  }
  if(found)break;
 }
 assert.equal(found,true,"need one real W3 source corridor demonstrating a useful convoy order");
});
