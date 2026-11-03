import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
const built=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarParallelModesV135';",
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarRtsSquadsV133';",
 "export * from './app/game/systems/clanWarBibleV6';",
 "export * from './app/game/systems/clanWarSourceMapsV128';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(built.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const baseline=()=>api.createWarOperationsV115(rules);
const valid=(s,teamId=s.teams[0].id)=>rules.territories.find(t=>
 t.id!==s.baseId&&!api.warMissionEligibleV115(s,rules,t.id,[teamId]))?.id;
const start=(mode,when=1000)=>{
 const s=baseline(),team=s.teams[0].id,target=valid(s,team);
 assert.ok(target,"W3 source route missing");
 const r=api.beginWarOperationV115(s,mode,target,[team],rules,when);
 assert.equal(r.accepted,true,mode+" "+r.message);
 return {state:r.state,team,target};
};

test("assault: a deployed, physically nearby V6 unit protects its own damaged bastion, never free recruits",()=>{
 const {state,team}=start("assault");
 const boosted={...state,active:{...state.active,assault:{...state.active.assault,ap:95,ownBase:69}}};
 const launched=api.deployAssaultUnitV115(boosted,team,rules);
 assert.equal(launched.accepted,true,launched.message);
 const staged={...launched.state,active:{...launched.state.active,
  assault:{...launched.state.active.assault,ap:50,ownBase:69}}};
 const applied=api.reinforceWarAssaultLineV135(staged,team,rules);
 assert.equal(applied.accepted,true,applied.message);
 assert.equal(applied.state.active.assault.ap,32);
 assert.ok(applied.state.active.assault.ownBase>69&&applied.state.active.assault.ownBase<=80);
 assert.deepEqual(applied.state.active.assault.fortifiedIds,[team]);
 assert.equal(applied.state.teams.length,state.teams.length);
 assert.equal(applied.state.rav,state.rav);
 assert.equal(applied.state.clock,state.clock);
 assert.equal(applied.state.reports.length,0);
 assert.equal(api.reinforceWarAssaultLineV135(applied.state,team,rules).accepted,false);
 assert.equal(api.readWarOperationsV115(JSON.stringify(applied.state),rules)?.active?.assault?.fortifiedIds?.length,1);
 const invalid={...applied.state,active:{...applied.state.active,
  assault:{...applied.state.active.assault,fortifiedIds:["nonexistent-team"]}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(invalid),rules),null);
 const distant={...staged,active:{...staged.active,
  assault:{...staged.active.assault,actors:staged.active.assault.actors.map(a=>({...a,x:35}))}}};
 assert.equal(api.reinforceWarAssaultLineV135(distant,team,rules).accepted,false);
 const broke={...staged,active:{...staged.active,assault:{...staged.active.assault,ap:17}}};
 const no=api.reinforceWarAssaultLineV135(broke,team,rules);
 assert.equal(no.accepted,false);assert.equal(no.state,broke);
});

test("Outer Ops: one early retask keeps clock, route, original participant identities and source upkeep",()=>{
 const {state,team}=start("outer");
 const original=state.outer[0];assert.ok(original);
 const beforeRav=state.rav;
 const updated=api.redirectWarOuterOpsV135(state,original.id,"escort",original.startedAt+1000,rules);
 assert.equal(updated.accepted,true,updated.message);
 const order=updated.state.outer[0];
 assert.equal(order.focus,"escort");
 assert.equal(order.retask.oldFocus,"recon");
 assert.equal(order.dueAt,original.dueAt);
 assert.deepEqual(order.routeIds,original.routeIds);
 assert.deepEqual(order.teamIds,[team]);
 assert.deepEqual(updated.state.assignments,state.assignments);
 assert.equal(updated.state.rav,beforeRav);
 assert.equal(updated.state.clock,state.clock);
 assert.equal(updated.state.reports.length,0);
 assert.equal(api.readWarOperationsV115(JSON.stringify(updated.state),rules)?.outer?.[0]?.focus,"escort");
 const doubled=api.redirectWarOuterOpsV135(updated.state,original.id,"intercept",original.startedAt+1001,rules);
 assert.equal(doubled.accepted,false);assert.equal(doubled.state,updated.state);
 const wrongTime=api.redirectWarOuterOpsV135(state,original.id,"escort",
  original.startedAt+Math.ceil((original.dueAt-original.startedAt)/2),rules);
 assert.equal(wrongTime.accepted,false);
 const wrongTarget=api.redirectWarOuterOpsV135(state,original.id,"random",original.startedAt+1000,rules);
 assert.equal(wrongTarget.accepted,false);
 const tampered={...updated.state,outer:[{...order,retask:{...order.retask,changedAt:original.dueAt}}]};
 assert.equal(api.readWarOperationsV115(JSON.stringify(tampered),rules),null);
 const resolved=api.settleWarOuterOpsV115(updated.state,order.dueAt,rules);
 assert.equal(resolved.accepted,true);
 assert.equal(resolved.state.outer.length,0);
 assert.equal(resolved.state.reports.length,1);
 assert.equal(resolved.state.reports[0].focus,"escort");
 assert.ok(resolved.state.reports[0].engagementLog.some(line=>line.includes("Réorientation V135")));
 assert.equal(api.settleWarOuterOpsV115(resolved.state,order.dueAt,rules).accepted,false);
});

test("Outer Ops: recon-to-intercept retask and delayed recall remain mutually exclusive and nonduplicating",()=>{
 const {state}=start("outer");
 const before=state.outer[0];
 const rerouted=api.redirectWarOuterOpsV135(state,before.id,"intercept",before.startedAt+10,rules);
 assert.equal(rerouted.accepted,true);
 const recalled=api.recallWarOuterMissionV116(rerouted.state,before.id,before.startedAt+1000,rules);
 assert.equal(recalled.accepted,true);
 assert.equal(api.redirectWarOuterOpsV135(recalled.state,before.id,"escort",before.startedAt+1001,rules).accepted,false);
 const arrival=recalled.state.outer[0].dueAt;
 const settled=api.settleWarOuterOpsV115(recalled.state,arrival,rules);
 assert.equal(settled.accepted,true);
 assert.equal(settled.state.reports[0].outcome,"retreat");
 assert.equal(settled.state.reports[0].woundedIds.length,0);
 assert.equal(settled.state.outer.length,0);
});

test("stealth: real-position diversion draws one patrol for limited turns and is non-repeatable",()=>{
 const {state}=start("stealth");
 const original=state.active.stealth;
 const diversion=api.commandStealthV115(state,"decoy",rules);
 assert.equal(diversion.accepted,true,diversion.message);
 const next=diversion.state.active.stealth;
 assert.equal(next.decoyUsed,true);assert.equal(next.decoyX,original.x);
 assert.equal(next.energy,original.energy-2);
 assert.equal(next.decoyTurns,2);
 assert.equal(next.x,original.x);assert.equal(next.y,original.y);
 assert.equal(diversion.state.clock,state.clock+1);
 assert.equal(diversion.state.rav,state.rav);
 assert.equal(diversion.state.teams.length,state.teams.length);
 const again=api.commandStealthV115(diversion.state,"decoy",rules);
 assert.equal(again.accepted,false);assert.equal(again.state,diversion.state);
 const wait=api.commandStealthV115(diversion.state,"wait",rules);
 assert.equal(wait.accepted,true);
 const parked=wait.state.active?.stealth;
 assert.ok(parked);
 assert.equal(parked.x,original.x);assert.equal(parked.y,original.y);
 assert.ok(parked.energy>=next.energy);
 assert.ok(parked.guardX>=4&&parked.guardX<=7);
 assert.equal(api.readWarOperationsV115(JSON.stringify(wait.state),rules)?.active?.stealth?.decoyUsed,true);
 const corrupt={...wait.state,active:{...wait.state.active,
  stealth:{...parked,decoyTurns:50}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(corrupt),rules),null);
});

test("RTS: visible-source suppressing fire costs two RAV, stops one real hostile reaction and then expires",()=>{
 const s=api.createWarRtsSquadsV133("W3-RTS01",rules);
 const launched=api.launchWarRtsSquadsV133(s);assert.equal(launched.accepted,true);
 const startState=launched.state,actor=startState.squads[0];
 const occupied=new Set(startState.squads.map(u=>u.x+","+u.y));
 const p=[{x:actor.x+1,y:actor.y},{x:actor.x,y:actor.y+1},
  {x:actor.x-1,y:actor.y},{x:actor.x,y:actor.y-1}].find(p=>
  api.warMapWalkableV128(startState.map,p)&&!occupied.has(p.x+","+p.y));
 assert.ok(p);
 const threat={...startState.enemies[0],...p,id:"W135-ENEMY",hp:8,status:"active"};
 const actual={...startState,enemies:[threat],ravRemaining:6};
 assert.equal(api.visibleWarRtsEnemiesV133(actual).length,1);
 const suppressed=api.commandWarRtsSuppressV135(actual,actor.id,threat.id);
 assert.equal(suppressed.accepted,true,suppressed.message);
 assert.equal(suppressed.state.turn,actual.turn+1);
 assert.equal(suppressed.state.ravRemaining,4);
 assert.equal(suppressed.state.enemies[0].hp,8,"suppression deals no fictitious damage");
 assert.equal(suppressed.state.suppressedEnemyIds?.length,0);
 assert.equal(suppressed.state.squads[0].hp,actor.hp,"hostile did not shoot on suppressed turn");
 assert.equal(suppressed.state.report,null);
 assert.equal(actual.turn,0);assert.equal(actual.ravRemaining,6);
 const resumed=api.commandWarRtsSquadsV133(suppressed.state,{kind:"wait",squadId:actor.id});
 assert.equal(resumed.accepted,true);
 assert.ok(resumed.state.squads[0].hp<actor.hp,"enemy recovered after exactly one turn");
 const noSupply={...actual,ravRemaining:1};
 assert.equal(api.commandWarRtsSuppressV135(noSupply,actor.id,threat.id).accepted,false);
 const unseen={...actual,enemies:[{...threat,x:actual.map.goal.x,y:actual.map.goal.y}]};
 const denied=api.commandWarRtsSuppressV135(unseen,actor.id,threat.id);
 assert.equal(denied.accepted,false);assert.equal(denied.state,unseen);
});

test("four modes: no free V85 land, no duplicated reports, no cross-mode hidden rewards",()=>{
 const {state,team,target}=start("outer",1000);
 const first=state.outer[0];
 const redirected=api.redirectWarOuterOpsV135(state,first.id,"recon",first.startedAt+10,rules);
 assert.equal(redirected.accepted,false,"unchanged mandate must not be billed again");
 const separated=api.createWarOperationsV115(rules);
 assert.equal(separated.reports.length,0);
 assert.equal(Object.keys(separated.pressure).length,0);
 assert.equal(separated.teams.length,state.teams.length);
 const active=api.beginWarOperationV115(separated,"stealth",target,[team],rules,2000);
 assert.equal(active.accepted,true);
 const retreated=api.leaveWarOperationV115(active.state,rules);
 assert.equal(retreated.accepted,true);
 assert.equal(retreated.state.reports.length,1);
 assert.equal(retreated.state.intelIds.includes(target),false);
 assert.equal(retreated.state.weakenedIds.includes(target),false);
 assert.equal(retreated.state.active,null);
});
