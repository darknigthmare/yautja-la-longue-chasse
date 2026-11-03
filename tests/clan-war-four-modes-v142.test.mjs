import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const bundle=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarFocusV142';",
 "export * from './app/game/systems/clanWarOuterChoicesV142';",
 "export * from './app/game/systems/clanWarStealthPathV142';",
 "export * from './app/game/systems/clanWarRtsWaypointV142';",
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarAssaultContactV141';",
 "export * from './app/game/systems/clanWarRtsSquadsV133';",
 "export * from './app/game/systems/clanWarBibleV6';",
 "export * from './app/game/systems/clanWarMissionTerrainV116';",
 "export * from './app/game/systems/clanWarSourceMapsV128';",
 "export * from './app/game/systems/clanWarRtsSourceMissionsV129';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+
 Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const key=p=>p.x+","+p.y;
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
function open(mode){
 const s=api.createWarOperationsV115(rules),team=s.teams[0].id;
 const site=rules.territories.find(t=>t.id!==s.baseId&&!api.warMissionEligibleV115(s,rules,t.id,[team]));
 assert.ok(site);
 const result=api.beginWarOperationV115(s,mode,site.id,[team],rules,1000);
 assert.equal(result.accepted,true,result.message);
 return {state:result.state,team,site:site.id};
}
function openRts(id){
 const r=api.launchWarRtsSquadsV133(api.createWarRtsSquadsV133(id,rules));
 assert.equal(r.accepted,true,id+" "+r.message);return r.state;
}

test("Assault V142: real paid focus shot is V6 range-limited, spends 12 AP once, then expires",()=>{
 const {state,team}=open("assault");
 const staged={...state,active:{...state.active,assault:{...state.active.assault,ap:100}}};
 const deployed=api.deployAssaultUnitV115(staged,team,rules);
 assert.equal(deployed.accepted,true,deployed.message);
 const actor=deployed.state.active.assault.actors.find(a=>a.teamId===team);
 const rival={id:"V142-RIVAL",side:"rival",teamId:null,unitId:actor.unitId,x:actor.x+3,hp:36};
 const scene={...deployed.state,active:{...deployed.state.active,
  assault:{...deployed.state.active.assault,actors:[...deployed.state.active.assault.actors,rival]}}};
 const order=api.issueWarAssaultFocusV142(scene,team,rival.id,rules);
 assert.equal(order.accepted,true,order.message);
 assert.equal(order.state.active.assault.ap,scene.active.assault.ap-12);
 assert.equal(order.state.clock,scene.clock);
 assert.equal(order.state.rav,scene.rav);
 assert.deepEqual(order.state.active.assault.focusUsedIds,[team]);
 assert.ok(api.readWarOperationsV115(JSON.stringify(order.state),rules));
 const normal=api.warAssaultContactV141(scene.active.assault.actors,rules,{},1);
 const tick=api.stepAssaultV115(order.state,rules);
 assert.equal(tick.accepted,true,tick.message);
 const enemyNormal=normal.actors.find(a=>a.id===rival.id);
 const enemyFocused=tick.state.active.assault.actors.find(a=>a.id===rival.id);
 assert.equal(enemyNormal.hp-enemyFocused.hp,1,"only one extra physical point per focused salvo");
 assert.deepEqual(tick.state.active.assault.focusOrders,{});
 assert.deepEqual(tick.state.active.assault.focusUsedIds,[team]);
 assert.equal(api.issueWarAssaultFocusV142(tick.state,team,rival.id,rules).accepted,false);
 assert.equal(scene.active.assault.ap,100-(staged.active.assault.ap-deployed.state.active.assault.ap));
});

test("Assault V142: remote target, obscuring rival, KO group, absent AP and forged save all fail safely",()=>{
 const {state,team}=open("assault");
 const budget={...state,active:{...state.active,assault:{...state.active.assault,ap:100}}};
 const deployed=api.deployAssaultUnitV115(budget,team,rules).state;
 const actor=deployed.active.assault.actors.find(a=>a.teamId===team);
 const enemies=[{id:"A",side:"rival",unitId:actor.unitId,teamId:null,hp:20,x:actor.x+2},
                {id:"B",side:"rival",unitId:actor.unitId,teamId:null,hp:20,x:actor.x+4}];
 const staged={...deployed,active:{...deployed.active,assault:{...deployed.active.assault,
  actors:[...deployed.active.assault.actors,...enemies]}}};
 const blocked=api.issueWarAssaultFocusV142(staged,team,"B",rules);
 assert.equal(blocked.accepted,false);assert.equal(blocked.state,staged);
 const far={...staged,active:{...staged.active,assault:{...staged.active.assault,
  actors:staged.active.assault.actors.map(u=>u.id==="A"?{...u,x:90}:u)}}};
 assert.equal(api.issueWarAssaultFocusV142(far,team,"A",rules).accepted,false);
 const noAp={...staged,active:{...staged.active,assault:{...staged.active.assault,ap:11}}};
 assert.equal(api.issueWarAssaultFocusV142(noAp,team,"A",rules).accepted,false);
 const forged={...staged,active:{...staged.active,assault:{...staged.active.assault,
  focusUsedIds:[team],focusOrders:{[team]:{targetId:"A",expiresAtTick:99}}}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(forged),rules),null);
});

test("Outer Ops V142: each offered itinerary is a feasible V6 directed-capacity route",()=>{
 let checked=0,alternates=0;
 for(const territory of rules.territories){
  if(territory.id===rules.territories[0].id)continue;
  for(const pc of [1,2,4,8]){
   if(pc>rules.parameters.pc_cap_1)continue;
   const primary=api.planWarRouteV6(rules.territories[0].id,territory.id,pc,[],rules);
   const choices=api.warOuterRouteChoicesV142(rules.territories[0].id,territory.id,pc,rules);
   if(!primary){assert.deepEqual(choices,[]);continue;}
   checked++;
   assert.ok(choices.length>=1&&choices.length<=3);
   assert.equal(choices.filter(o=>o.isPrimary).length,1);
   assert.ok(choices.some(o=>keyList(o.passageIds)===keyList(primary.passageIds)));
   assert.equal(new Set(choices.map(x=>keyList(x.passageIds))).size,choices.length);
   for(const choice of choices){
    assert.equal(choice.conditionLabels.length,choice.passageIds.length);
    assert.equal(api.warOuterRouteIsAuthorizedV142(rules.territories[0].id,territory.id,pc,choice.passageIds,rules),true);
    assert.ok(choice.passageIds.every(id=>rules.passages.some(p=>p.id===id&&p.capacityPc>=pc)));
   }
   if(choices.length>1)alternates++;
  }
 }
 assert.ok(checked>=12);
 assert.ok(alternates>=1,"the authored source V6 graph should offer at least one alternate itinerary");
});
const keyList=ids=>ids.join("|");

test("Outer Ops V142: chosen alternative actually dispatches, debits once, locks the route in archive",()=>{
 const base=api.createWarOperationsV115(rules),team=base.teams[0].id;
 const pc=rules.units.find(u=>u.id===base.teams[0].unitId).commandPoints;
 const candidate=rules.territories.map(t=>({
  t,choices:api.warOuterRouteChoicesV142(base.baseId,t.id,pc,rules)
 })).find(v=>v.t.id!==base.baseId&&v.choices.length>1&&
  !api.warMissionEligibleV115(base,rules,v.t.id,[team]));
 assert.ok(candidate,"at least one source route alternate is dispatchable");
 const chosen=candidate.choices.find(v=>!v.isPrimary);
 const begun=api.beginWarOperationV115(base,"outer",candidate.t.id,[team],rules,1000,"recon",null,chosen.passageIds);
 assert.equal(begun.accepted,true,begun.message);
 assert.deepEqual(begun.state.outer[0].routeIds,chosen.passageIds);
 assert.equal(begun.state.outer[0].routeChoiceId,chosen.id);
 assert.equal(begun.state.outer[0].dueAt>1000,true);
 assert.equal(begun.state.reports.length,0);
 assert.equal(begun.state.rav<base.rav,true);
 assert.ok(api.readWarOperationsV115(JSON.stringify(begun.state),rules));
 const invalid=api.beginWarOperationV115(base,"outer",candidate.t.id,[team],rules,1000,
   "recon",null,["fake-connected-passage"]);
 assert.equal(invalid.accepted,false);assert.equal(invalid.state,base);
 const corrupt={...begun.state,outer:[{...begun.state.outer[0],routeChoiceId:"W142-PATH-99"}]};
 assert.equal(api.readWarOperationsV115(JSON.stringify(corrupt),rules),null);
 const resolved=api.settleWarOuterOpsV115(begun.state,begun.state.outer[0].dueAt,rules);
 assert.equal(resolved.accepted,true);
 assert.equal(resolved.state.reports.length,1);
});

test("Stealth V142: all 6 regions give deterministic one-step path without consulting guard position",()=>{
 let total=0,regions=new Set();
 for(const territory of rules.territories){
  const original=open("stealth");
  const s={...original.state,active:{...original.state.active,targetId:territory.id}};
  const map=api.warMissionTerrainV116(territory.id,rules);
  regions.add(territory.region);
  const before=api.planWarStealthStepV142(s,"relay",rules);
  if(!before)continue;
  const forgedGuard={...s,active:{...s.active,stealth:{...s.active.stealth,
   guardX:7,guardY:3,guardDirection:1}}};
  const after=api.planWarStealthStepV142(forgedGuard,"relay",rules);
  assert.deepEqual(before,after,territory.id+" leaked guard's unseen location");
  assert.equal(distance(before.from,before.to),1);
  assert.equal(api.warTerrainCellBlockedV116(map,before.to.x,before.to.y),false);
  const moved=api.commandWarStealthStepV142(s,"relay",rules);
  assert.equal(moved.accepted,true,moved.message);
  assert.equal(moved.state.clock,s.clock+1);
  assert.equal(distance(before.from,moved.state.active.stealth),1);
  assert.equal(moved.state.reports.length,0);
  total++;
 }
 assert.ok(total>=12);
 assert.ok(regions.size>=6);
});

test("Stealth V142: no teleport, automatic sabotage, external source, or action at completed waypoint",()=>{
 const {state}=open("stealth");
 const planned=api.planWarStealthStepV142(state,"relay",rules);
 assert.ok(planned);
 const bad=api.commandWarStealthStepV142({...state,sourceSha:"altered"},"relay",rules);
 assert.equal(bad.accepted,false);
 const terrain=api.warMissionTerrainV116(state.active.targetId,rules);
 const finished={...state,active:{...state.active,stealth:{...state.active.stealth,
   x:terrain.relay.x,y:terrain.relay.y}}};
 const stop=api.commandWarStealthStepV142(finished,"relay",rules);
 assert.equal(stop.accepted,false);assert.equal(stop.state,finished);
 assert.equal(api.commandWarStealthStepV142(state,"invented",rules).accepted,false);
 const next=api.commandWarStealthStepV142(state,"relay",rules);
 assert.equal(next.accepted,true);
 assert.equal(next.state.active.stealth.sabotaged,false);
});

test("RTS V142: guided step obeys source map, power, next-turn weather and one enemy reaction",()=>{
 let moved=0;
 for(const id of api.WAR_SOURCE_RTS_IDS_V129){
  const s=openRts(id),unit=s.squads[0];
  const plan=api.planWarRtsWaypointV142(s,unit.id,"observation");
  if(!plan)continue;
  assert.equal(distance(plan.from,plan.to),1);
  assert.equal(api.warMapWalkableV128(s.map,plan.to),true);
  assert.ok(!s.squads.some(u=>u.id!==unit.id&&u.status==="active"&&key(u)===key(plan.to)));
  assert.ok(!api.visibleWarRtsEnemiesV133(s).some(e=>key(e)===key(plan.to)));
  const result=api.commandWarRtsWaypointV142(s,unit.id,"observation");
  assert.equal(result.accepted,true,id+": "+result.message);
  assert.equal(result.state.turn,s.turn+1);
  assert.equal(result.state.ravRemaining,s.ravRemaining);
  const movedUnit=result.state.squads.find(u=>u.id===unit.id);
  assert.ok(distance(unit,movedUnit)<=1,"one command = one physical tile");
  assert.equal(result.state.map.planetId,s.map.planetId);
  assert.equal(result.state.report?.campaignMutation??false,false);
  moved++;
 }
 assert.ok(moved>=8,"multiple W3 missions should require actual observation movement");
});

test("RTS V142: hidden mission objective cannot be used as a waypoint before observing it",()=>{
 const s=openRts("W3-RTS01"),actor=s.squads[0];
 assert.equal(s.observed,false);
 assert.equal(api.planWarRtsWaypointV142(s,actor.id,"objective"),null);
 const denied=api.commandWarRtsWaypointV142(s,actor.id,"objective");
 assert.equal(denied.accepted,false);assert.equal(denied.state,s);
 const unknown=api.commandWarRtsWaypointV142(s,actor.id,"phantom");
 assert.equal(unknown.accepted,false);assert.equal(unknown.state,s);
 const stale={...s,phase:"defeat"};
 assert.equal(api.commandWarRtsWaypointV142(stale,actor.id,"observation").accepted,false);
});
