import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
const bundle = await build({
  stdin:{contents:"export * from './app/game/systems/clanWarOperationsV115';export * from './app/game/systems/clanWarRtsScenariosV119';export * from './app/game/systems/clanWarMissionTerrainV116';export * from './app/game/systems/clanWarBibleV6';",resolveDir:process.cwd()},
  bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent",
});
const game=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const rules=game.DEFAULT_WAR_RULES_V6;
function setUpEscort(){
  const start=game.createWarOperationsV115(rules);
  const targetId="W3-K02",scoutId=start.teams.find(t=>t.unitId==="W3-U01").id;
  const pay=game.queueWarRecruitmentV115(start,"W3-U19",1000,rules);
  assert.equal(pay.accepted,true,pay.message);
  const arrival=game.settleWarRecruitmentsV115(pay.state,pay.state.pendingRecruits[0].dueAt,rules);
  assert.equal(arrival.accepted,true);
  const bearerId=arrival.state.teams.find(t=>t.unitId==="W3-U19").id;
  const ids=[scoutId,bearerId];
  assert.equal(game.warMissionEligibleV115(arrival.state,rules,targetId,ids),null);
  const launched=game.beginWarOperationV115(arrival.state,"rts",targetId,ids,rules,70000,"recon","W3-RTS01");
  assert.equal(launched.accepted,true,launched.message);
  return {started:launched.state,targetId,scoutId,bearerId};
}
test("six W3 RTS objective pilots preserve their authored maps; other 18 remain dossiers",()=>{
  const first=game.warSourceRtsScenarioV119("W3-RTS01",rules);
  const second=game.warSourceRtsScenarioV119("W3-RTS02",rules);
  assert.equal(first.title,"L’angle avant le pont");
  assert.equal(second.title,"Le sommet change de mains");
  assert.ok(first.sourceCells.includes("C"+rules.entries.find(e=>e.id==="W3-RTS01").row));
  assert.equal(first.sourceMapId,"W3-MAP01");
  assert.equal(second.sourceMapId,"W3-MAP01");
  assert.equal(first.objectiveKind,"cargo-escort");
  assert.equal(second.objectiveKind,"guard-relief");
  assert.equal(first.playability,"objective-exercise");
  const fourth=game.warSourceRtsScenarioV119("W3-RTS04",rules);
  assert.equal(fourth.sourceMapId,"W3-MAP02");
  assert.equal(fourth.objectiveKind,"circuit-defense");
  assert.equal(game.warSourceRtsScenarioV119("W3-RTS07",rules),null);
});
test("a source scenario requires real source-defined unit types and territory region",()=>{
  const state=game.createWarOperationsV115(rules);
  const target="W3-K02";
  assert.match(game.warRtsScriptedEligibilityV119("W3-RTS01",rules,target,["W3-U01"]),/porteur/);
  assert.match(game.warRtsScriptedEligibilityV119("W3-RTS02",rules,target,["W3-U01"]),/W3-U07/);
  assert.equal(game.warRtsScriptedEligibilityV119("W3-RTS02",rules,target,["W3-U07"]),null);
  assert.match(game.warRtsScriptedEligibilityV119("W3-RTS01",rules,"W3-K10",["W3-U01","W3-U19"]),/région/);
  const first=game.beginWarOperationV115(state,"rts",target,[state.teams[0].id],rules,90000,"recon","W3-RTS01");
  assert.equal(first.accepted,false);
  assert.equal(first.state,state);
});
test("W3-RTS01 has exactly one physically held cargo, persistent identities, and no instant victory",()=>{
  const {started,targetId,bearerId}=setUpEscort();
  const script=started.active.rts.scripted;
  assert.equal(script.kind,"cargo-escort");
  assert.equal(script.cargo.carrierTeamId,bearerId);
  assert.equal(script.cargo.x,1);
  assert.equal(script.cargo.y,2);
  assert.equal(script.scouted,false);
  const terrain=game.warMissionTerrainV116(targetId,rules);
  const stage=game.resolveWarRtsScriptedTickV119(script,started.active.rts.actors,terrain);
  assert.equal(stage.outcome,null);
  assert.equal(stage.objective.scouted,false);
  assert.deepEqual(game.readWarOperationsV115(JSON.stringify(started),rules),started);
});
test("scout sight plus living porter at the real extraction wins without killing every rival",()=>{
  const {started,scoutId,bearerId}=setUpEscort();
  const original=JSON.stringify(started),field=started.active.rts;
  const actors=field.actors.map(actor=>actor.teamId===scoutId?{...actor,x:4,y:1}:
    actor.teamId===bearerId?{...actor,x:7,y:4}:actor);
  const cargo={...field.scripted.cargo,x:7,y:4};
  const prepared={...started,active:{...started.active,rts:{...field,actors,scripted:{...field.scripted,cargo}}}};
  const issued=game.commandRtsV115(prepared,scoutId,4,0,rules);
  assert.equal(issued.accepted,true,issued.message);
  assert.equal(issued.state.active,null);
  assert.equal(issued.state.reports.length,1);
  assert.equal(issued.state.reports[0].outcome,"victory");
  assert.ok(issued.state.reports[0].sourceIds.includes("W3-RTS01"));
  assert.ok(issued.state.reports[0].summary.includes("W3-RTS01"));
  assert.ok(issued.state.reports[0].teamIds.includes(bearerId));
  assert.equal(original,JSON.stringify(started));
});
test("escort cargo falls with bearer and can be carried only by a remaining real porter",()=>{
  const {started,bearerId,targetId}=setUpEscort();
  const original=started.active.rts.scripted;
  const actors=started.active.rts.actors.map(actor=>actor.teamId===bearerId?{...actor,hp:0,x:5,y:4}:actor);
  const drop=game.resolveWarRtsScriptedTickV119(original,actors,game.warMissionTerrainV116(targetId,rules));
  assert.equal(drop.objective.kind,"cargo-escort");
  assert.equal(drop.objective.cargo.carrierTeamId,null);
  assert.deepEqual([drop.objective.cargo.x,drop.objective.cargo.y],[5,4]);
  assert.equal(drop.outcome,"defeat","a scout is not allowed to invent porter equipment");
  const newPorter={id:"ally-other",side:"ally",teamId:"second-porter",unitId:"W3-U17",x:5,y:4,hp:18};
  const recovery=game.resolveWarRtsScriptedTickV119(drop.objective,[...actors,newPorter],game.warMissionTerrainV116(targetId,rules));
  assert.equal(recovery.objective.cargo.carrierTeamId,"second-porter");
});
test("W3-RTS02 requires a present W3-U07 at the guard post for three uncontested ticks",()=>{
  const start=game.createWarOperationsV115(rules);
  const guard=start.teams.find(team=>team.unitId==="W3-U07");
  const opened=game.beginWarOperationV115(start,"rts","W3-K02",[guard.id],rules,1000,"recon","W3-RTS02");
  assert.equal(opened.accepted,true,opened.message);
  let script=opened.state.active.rts.scripted;
  assert.equal(script.kind,"guard-relief");
  const terrain=game.warMissionTerrainV116("W3-K02",rules);
  const allied={...opened.state.active.rts.actors.find(a=>a.teamId===guard.id),x:7,y:3};
  const enemy={id:"rival-remote",side:"rival",unitId:"W3-U01",teamId:null,x:1,y:5,hp:20};
  const noGuard=game.resolveWarRtsScriptedTickV119(script,[{...allied,x:5,y:5}],terrain);
  assert.equal(noGuard.outcome,null);
  assert.equal(noGuard.objective.reliefProgress,0);
  for(let round=1;round<=3;round++){
    const phase=game.resolveWarRtsScriptedTickV119(script,[allied,enemy],terrain);
    script=phase.objective;
    assert.equal(script.reliefProgress,round);
    assert.equal(phase.outcome,round===3?"victory":null);
  }
});
test("malformed scenario, forged cargo, impossible marker, and wrong local region are refused on import",()=>{
  const {started,bearerId}=setUpEscort();
  const corrupted=structuredClone(started);
  corrupted.active.rts.scripted.cargo.id="NOT-ORIGINAL-OBJECT";
  assert.equal(game.readWarOperationsV115(JSON.stringify(corrupted),rules),null);
  const noBearer=structuredClone(started);
  noBearer.active.rts.scripted.cargo.carrierTeamId="NOT-A-REAL-TEAM";
  assert.equal(game.readWarOperationsV115(JSON.stringify(noBearer),rules),null);
  const offMap=structuredClone(started);
  offMap.active.rts.scripted.cargo.x=99;
  assert.equal(game.readWarOperationsV115(JSON.stringify(offMap),rules),null);
  const valid=structuredClone(started);
  assert.ok(valid.active.rts.actors.some(a=>a.teamId===bearerId));
  assert.deepEqual(game.readWarOperationsV115(JSON.stringify(valid),rules),valid);
});


test("a lone W3-U07 can deliberately hold its real position for three alternating turns",()=>{
  const initial=game.createWarOperationsV115(rules);
  const guard=initial.teams.find(team=>team.unitId==="W3-U07");
  const start=game.beginWarOperationV115(initial,"rts","W3-K02",[guard.id],rules,1000,"recon","W3-RTS02");
  assert.equal(start.accepted,true);
  const source=start.state;
  const protectedActor={...source.active.rts.actors.find(actor=>actor.teamId===guard.id),x:7,y:3};
  let simulated={...source,active:{...source.active,rts:{...source.active.rts,actors:[protectedActor]}}};
  assert.equal(game.commandRtsV115(simulated,guard.id,7,3,rules).accepted,false,"existing move API must not silently become a hold action");
  for(let i=1;i<=3;i++){
    const action=game.holdWarRtsAlternatingV119(simulated,guard.id,rules);
    assert.equal(action.accepted,true,action.message);
    simulated=action.state;
    if(i<3){
      assert.ok(simulated.active);
      assert.equal(simulated.active.rts.scripted.reliefProgress,i);
      assert.equal(simulated.reports.length,0);
    }
  }
  assert.equal(simulated.active,null);
  assert.equal(simulated.reports.length,1);
  assert.equal(simulated.reports[0].outcome,"victory");
  assert.ok(simulated.reports[0].sourceIds.includes("W3-RTS02"));
  assert.equal(game.holdWarRtsAlternatingV119(simulated,guard.id,rules).accepted,false);
  assert.deepEqual(game.readWarOperationsV115(JSON.stringify(simulated),rules),simulated);
});


function setUpRepair(){
  let state=game.createWarOperationsV115(rules);
  for(const unitId of ["W3-U19","W3-U20"]){
    const prepared=game.queueWarRecruitmentV115(state,unitId,1000,rules);
    assert.equal(prepared.accepted,true,prepared.message);
    state=prepared.state;
  }
  const due=Math.max(...state.pendingRecruits.map(order=>order.dueAt));
  const arrived=game.settleWarRecruitmentsV115(state,due,rules);
  assert.equal(arrived.accepted,true,arrived.message);
  const teamIds=["W3-U19","W3-U20"].map(unitId=>arrived.state.teams.find(team=>team.unitId===unitId).id);
  const target="W3-K07";
  assert.equal(game.warRtsScriptedEligibilityV119("W3-RTS03",rules,target,["W3-U19","W3-U20"]),null);
  const start=game.beginWarOperationV115(arrived.state,"rts",target,teamIds,rules,65000,"recon","W3-RTS03");
  assert.equal(start.accepted,true,start.message);
  return {state:start.state,porterId:teamIds[0],artisansId:teamIds[1],target};
}

test("W3-RTS03 keeps its original W3-MAP02 source and needs real logistics and artisan teams",()=>{
  const source=game.warSourceRtsScenarioV119("W3-RTS03",rules);
  assert.equal(source.title,"La conduite sous les lances");
  assert.equal(source.sourceMapId,"W3-MAP02");
  assert.equal(source.supportedRegionId,"W3-KR02");
  assert.equal(source.objectiveKind,"filter-repair");
  assert.ok(source.sourceCells.length>8);
  assert.match(game.warRtsScriptedEligibilityV119("W3-RTS03",rules,"W3-K07",["W3-U19"]),/W3-U20/);
  assert.match(game.warRtsScriptedEligibilityV119("W3-RTS03",rules,"W3-K02",["W3-U19","W3-U20"]),/W3-KR02/);
  const {state,porterId}=setUpRepair();
  assert.equal(state.active.rts.scripted.kind,"filter-repair");
  assert.equal(state.active.rts.scripted.cargo.carrierTeamId,porterId);
  assert.deepEqual(game.readWarOperationsV115(JSON.stringify(state),rules),state);
});

test("W3-RTS03 delivery does not finish or work on the same tick; artisans must operate in a safe area",()=>{
  const {state,porterId,artisansId,target}=setUpRepair();
  const objective=state.active.rts.scripted;
  const field=game.warMissionTerrainV116(target,rules);
  const ready=state.active.rts.actors.map(actor=>actor.teamId===porterId?{...actor,x:7,y:3}:
    actor.teamId===artisansId?{...actor,x:6,y:3}:actor.side==="rival"?{...actor,x:0,y:5}:actor);
  let phase=game.resolveWarRtsScriptedTickV119(objective,ready,field);
  assert.equal(phase.outcome,null);
  assert.equal(phase.objective.delivered,true);
  assert.equal(phase.objective.workProgress,0);
  assert.equal(phase.objective.cargo.carrierTeamId,null);
  assert.equal(phase.objective.cargo.x,7);
  assert.equal(phase.objective.cargo.y,3);
  const interrupted=game.resolveWarRtsScriptedTickV119(phase.objective,
    ready.map(actor=>actor.teamId===artisansId?{...actor,x:1,y:1}:actor),field);
  assert.equal(interrupted.objective.workProgress,0,"no remote construction");
  phase=game.resolveWarRtsScriptedTickV119(phase.objective,ready,field);
  assert.equal(phase.objective.workProgress,1);
  assert.equal(phase.outcome,null);
  const complete=game.resolveWarRtsScriptedTickV119(phase.objective,ready,field);
  assert.equal(complete.objective.workProgress,2);
  assert.equal(complete.outcome,"victory");
  assert.equal(state.active.rts.scripted.delivered,false);
});
test("W3-RTS03 cannot finish by wiping enemies or by forging instant repair in local archives",()=>{
  const {state,porterId,target}=setUpRepair();
  const noEnemies={...state,active:{...state.active,rts:{...state.active.rts,
    actors:state.active.rts.actors.filter(actor=>actor.side==="ally")}}};
  const held=game.holdWarRtsAlternatingV119(noEnemies,porterId,rules);
  assert.equal(held.accepted,true);
  assert.ok(held.state.active,"empty enemy roster is not a repair receipt");
  assert.equal(held.state.reports.length,0);
  assert.equal(held.state.active.rts.scripted.delivered,false);
  const forged=structuredClone(state);
  forged.active.rts.scripted.workProgress=99;
  assert.equal(game.readWarOperationsV115(JSON.stringify(forged),rules),null);
  const fakeDelivery=structuredClone(state);
  fakeDelivery.active.rts.scripted.delivered=true;
  assert.equal(game.readWarOperationsV115(JSON.stringify(fakeDelivery),rules),null);
  assert.equal(game.warMissionTerrainV116(target,rules).regionId,"W3-KR02");
});


test("W3 defenders prioritize visible objectives without selecting a hidden preferred target",()=>{
  const terrain=game.warMissionTerrainV116("W3-K02",rules);
  const rival={id:"rival-1",teamId:null,unitId:"W3-U01",side:"rival",x:7,y:1,hp:20};
  const scout={id:"ally-1",teamId:"scout",unitId:"W3-U01",side:"ally",x:7,y:2,hp:20};
  const porter={id:"ally-2",teamId:"porter",unitId:"W3-U19",side:"ally",x:5,y:1,hp:20};
  const guard={id:"ally-3",teamId:"guard",unitId:"W3-U07",side:"ally",x:7,y:3,hp:20};
  const escort={scenarioId:"W3-RTS01",kind:"cargo-escort",sourceMapId:"W3-MAP01",
    scouted:false,cargo:{id:"W115-OPS-0001-cargo",carrierTeamId:"porter",x:5,y:1},exit:{x:7,y:4}};
  const relief={scenarioId:"W3-RTS02",kind:"guard-relief",sourceMapId:"W3-MAP01",
    reliefProgress:0,requiredTurns:3,guardPoint:{x:7,y:3}};
  assert.equal(game.warRtsRivalTargetV120(escort,rival,[scout,porter],terrain)?.id,porter.id);
  assert.equal(game.warRtsRivalTargetV120(relief,rival,[scout,guard],terrain)?.id,guard.id);
  assert.equal(game.warRtsRivalTargetV120(undefined,rival,[scout,porter],terrain)?.id,scout.id,
    "free RTS preserves nearest visible target rather than inventing a clan bias");
  const side={...rival,x:1,y:2};
  const hiddenPorter={...porter,x:5,y:2};
  const localScout={...scout,x:1,y:3};
  assert.equal(game.warTerrainLineOfSightV116(terrain,side,hiddenPorter),false);
  assert.equal(game.warRtsRivalTargetV120(escort,side,[hiddenPorter,localScout],terrain)?.id,localScout.id);
  assert.equal(game.warRtsRivalTargetV120(escort,side,[],terrain),null);
});

test("W3-RTS03 switches defender priority from the regulator porter to repair artisans only after delivery",()=>{
  const {state,porterId,artisansId,target}=setUpRepair();
  const terrain=game.warMissionTerrainV116(target,rules);
  const rival={id:"rival-1",teamId:null,unitId:"W3-U01",side:"rival",x:7,y:1,hp:20};
  const porter={id:"porter",teamId:porterId,unitId:"W3-U19",side:"ally",x:7,y:3,hp:20};
  const artisans={id:"artisans",teamId:artisansId,unitId:"W3-U20",side:"ally",x:7,y:2,hp:20};
  const script=state.active.rts.scripted;
  assert.equal(script.kind,"filter-repair");
  assert.equal(game.warRtsRivalTargetV120(script,rival,[porter,artisans],terrain)?.id,porter.id,
    "the visible regulator is guarded before delivery");
  assert.equal(game.warRtsRivalTargetV120({...script,delivered:true},rival,[porter,artisans],terrain)?.id,artisans.id,
    "workers on the circuit become the local threat only after delivery");
  assert.equal(game.warRtsRivalTargetV120(script,rival,[{...porter,hp:0},artisans],terrain)?.id,artisans.id);
});
