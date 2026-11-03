import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
const compiled=await build({stdin:{
 contents:"export * from './app/game/systems/clanWarOperationsV115';export * from './app/game/systems/clanWarRtsScenariosV119';export * from './app/game/systems/clanWarMissionTerrainV116';export * from './app/game/systems/clanWarBibleV6';",
 resolveDir:process.cwd()},bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const game=await import("data:text/javascript;base64,"+Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const rules=game.DEFAULT_WAR_RULES_V6;
function openExtraction(){
 let state=game.createWarOperationsV115(rules);
 const scout=state.teams.find(team=>team.unitId==="W3-U02");
 assert.ok(scout);
 const recruit=game.queueWarRecruitmentV115(state,"W3-U17",1000,rules);
 assert.equal(recruit.accepted,true,recruit.message);
 const due=recruit.state.pendingRecruits[0].dueAt;
 state=game.settleWarRecruitmentsV115(recruit.state,due,rules).state;
 const escort=state.teams.find(team=>team.unitId==="W3-U17");
 const group=[scout.id,escort.id];
 const target=rules.territories.find(item=>item.region==="W3-KR03"&&game.warMissionEligibleV115(state,rules,item.id,group)===null);
 assert.ok(target);
 const launched=game.beginWarOperationV115(state,"rts",target.id,group,rules,65000,"recon","W3-RTS06");
 assert.equal(launched.accepted,true,launched.message);
 return {state:launched.state,scoutId:scout.id,escortId:escort.id,targetId:target.id};
}
test("W3-RTS06 source belongs to W3-MAP03 and requires source V6 guide plus real extraction crew",()=>{
 const source=game.warSourceRtsScenarioV119("W3-RTS06",rules);
 assert.equal(source.title,"Les chasseurs derrière le vent");
 assert.equal(source.sourceMapId,"W3-MAP03");
 assert.equal(source.supportedRegionId,"W3-KR03");
 assert.equal(source.objectiveKind,"wind-extraction");
 assert.match(source.completion,/survivants/i);
 assert.match(game.warRtsScriptedEligibilityV119("W3-RTS06",rules,"W3-K13",["W3-U02"]),/W3-U17/);
 assert.match(game.warRtsScriptedEligibilityV119("W3-RTS06",rules,"W3-K02",["W3-U02","W3-U17"]),/W3-KR03/);
 const {state}=openExtraction();
 const scripted=state.active.rts.scripted;
 assert.equal(scripted.kind,"wind-extraction");
 assert.equal(scripted.nominatedTeamIds.length,2);
 assert.deepEqual(game.readWarOperationsV115(JSON.stringify(state),rules),state);
});

test("a team standing at the ship cannot be evacuated before an actual ridge survey",()=>{
 const {state,targetId,scoutId,escortId}=openExtraction(),terrain=game.warMissionTerrainV116(targetId,rules);
 const scenario=state.active.rts.scripted;
 const actors=state.active.rts.actors.map(actor=>actor.teamId===escortId?{...actor,x:1,y:4}:actor);
 let tick=game.resolveWarRtsScriptedTickV119(scenario,actors,terrain);
 assert.equal(tick.outcome,null);
 assert.equal(tick.objective.ridgeConfirmed,false);
 assert.deepEqual(tick.objective.extractedTeamIds,[]);
 assert.deepEqual(tick.extractedThisTick,[]);
 assert.equal(tick.objective.windPhase,1);
 const surveyed=actors.map(actor=>actor.teamId===scoutId?{...actor,x:7,y:0}:actor);
 tick=game.resolveWarRtsScriptedTickV119(tick.objective,surveyed,terrain);
 assert.equal(tick.objective.ridgeConfirmed,true);
 assert.deepEqual(tick.extractedThisTick,[escortId]);
 assert.deepEqual(tick.objective.extractedTeamIds,[escortId]);
 assert.equal(tick.outcome,null,"scout has not physically returned yet");
 const arrived=surveyed.filter(actor=>actor.teamId!==escortId)
   .map(actor=>actor.teamId===scoutId?{...actor,x:1,y:4}:actor);
 const final=game.resolveWarRtsScriptedTickV119(tick.objective,arrived,terrain);
 assert.equal(final.outcome,"victory");
 assert.deepEqual(final.objective.extractedTeamIds,[escortId,scoutId]);
 assert.deepEqual(final.extractedThisTick,[scoutId]);
});

test("an explicit alternating ship arrival removes only that living team, not all battlefield actors",()=>{
 const {state,scoutId,escortId}=openExtraction(),original=JSON.stringify(state);
 let prepared=structuredClone(state);
 prepared.active.rts.scripted.ridgeConfirmed=true;
 prepared.active.rts.actors=prepared.active.rts.actors.map(actor=>actor.teamId===escortId?{...actor,x:1,y:4}:actor);
 const action=game.holdWarRtsAlternatingV119(prepared,scoutId,rules);
 assert.equal(action.accepted,true,action.message);
 assert.ok(action.state.active);
 assert.ok(action.state.active.rts.scripted.extractedTeamIds.includes(escortId));
 assert.ok(!action.state.active.rts.actors.some(actor=>actor.teamId===escortId));
 assert.ok(action.state.active.rts.actors.some(actor=>actor.teamId===scoutId));
 assert.equal(JSON.stringify(state),original);
 assert.deepEqual(game.readWarOperationsV115(JSON.stringify(action.state),rules),action.state);
});

test("isolation or loss of the guide is not covered by invented extraction or teleportation",()=>{
 const {state,targetId,scoutId,escortId}=openExtraction(),terrain=game.warMissionTerrainV116(targetId,rules);
 const scenario=state.active.rts.scripted;
 const dead=state.active.rts.actors.filter(actor=>actor.side==="ally")
   .map(actor=>actor.teamId===scoutId?{...actor,hp:0}:actor.teamId===escortId?{...actor,x:1,y:4}:actor);
 const failure=game.resolveWarRtsScriptedTickV119(scenario,dead,terrain);
 assert.equal(failure.outcome,"defeat");
 assert.equal(failure.objective.ridgeConfirmed,false);
 assert.deepEqual(failure.objective.extractedTeamIds,[]);
 assert.deepEqual(failure.objective.lostTeamIds,[scoutId]);
});

test("wind reduces ranged visibility during one known phase, not physical routes or shelter",()=>{
 const {state,targetId}=openExtraction(),terrain=game.warMissionTerrainV116(targetId,rules);
 const scenario=state.active.rts.scripted;
 const distant={x:1,y:0},target={x:8,y:0};
 assert.equal(game.warTerrainLineOfSightV116(terrain,distant,target),true);
 assert.equal(game.warRtsSourceSightV120(scenario,distant,target,terrain),true);
 assert.equal(game.warRtsSourceSightV120({...scenario,windPhase:2},distant,target,terrain),false);
 assert.equal(game.warRtsSourceSightV120({...scenario,windPhase:2},{x:6,y:0},{x:8,y:0},terrain),true);
 assert.equal(game.warTerrainCellBlockedV116(terrain,7,0),false);
});

test("reloaded W3-RTS06 excludes fabricated extractions, duplicate teams, impossible wind and changed source",()=>{
 const {state}=openExtraction();
 for(const tamper of [
  draft=>{draft.active.rts.scripted.windPhase=5;},
  draft=>{draft.active.rts.scripted.nominatedTeamIds.push("FAKE");},
  draft=>{draft.active.rts.scripted.extractedTeamIds=[draft.active.teamIds[0]];},
  draft=>{draft.active.rts.scripted.extractedTeamIds=["UNKNOWN"];},
  draft=>{draft.active.rts.scripted.lostTeamIds=["UNKNOWN"];},
  draft=>{draft.active.rts.scripted.ship.x=99;},
  draft=>{draft.active.rts.scripted.sourceMapId="W3-MAP01";},
 ]){
  const payload=structuredClone(state);tamper(payload);
  assert.equal(game.readWarOperationsV115(JSON.stringify(payload),rules),null);
 }
});
