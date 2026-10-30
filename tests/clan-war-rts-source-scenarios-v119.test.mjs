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
test("W3-RTS01 and W3-RTS02 are sourced from authored W3-MAP01 entries, other 22 remain dossiers",()=>{
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
  assert.equal(game.warSourceRtsScenarioV119("W3-RTS03",rules),null);
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
  const {started,scoutId,bearerId,targetId}=setUpEscort();
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
