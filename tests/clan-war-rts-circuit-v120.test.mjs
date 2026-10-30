import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const output=await build({
 stdin:{contents:"export * from './app/game/systems/clanWarOperationsV115'; export * from './app/game/systems/clanWarRtsScenariosV119'; export * from './app/game/systems/clanWarMissionTerrainV116'; export * from './app/game/systems/clanWarBibleV6';",resolveDir:process.cwd()},
 bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent",
});
const game=await import("data:text/javascript;base64,"+Buffer.from(output.outputFiles[0].text).toString("base64"));
const rules=game.DEFAULT_WAR_RULES_V6;

function openDefense(){
 const state=game.createWarOperationsV115(rules);
 const guard=state.teams.find(team=>team.unitId==="W3-U07");
 assert.ok(guard);
 const targetId="W3-K07";
 assert.equal(game.warRtsScriptedEligibilityV119("W3-RTS04",rules,targetId,["W3-U07"]),null);
 const launched=game.beginWarOperationV115(state,"rts",targetId,[guard.id],rules,1000,"recon","W3-RTS04");
 assert.equal(launched.accepted,true,launched.message);
 return {state:launched.state,guardId:guard.id,targetId};
}

test("W3-RTS04 retains its proper original worksheet and requires real W3-U07 on W3-KR02",()=>{
 const source=game.warSourceRtsScenarioV119("W3-RTS04",rules);
 assert.equal(source.title,"Le bassin retourne le piège");
 assert.equal(source.sourceMapId,"W3-MAP02");
 assert.equal(source.objectiveKind,"circuit-defense");
 assert.equal(source.supportedRegionId,"W3-KR02");
 assert.equal(source.playability,"objective-exercise");
 assert.match(source.enemyPlan,/levier/);
 assert.match(game.warRtsScriptedEligibilityV119("W3-RTS04",rules,"W3-K07",["W3-U01"]),/W3-U07/);
 assert.match(game.warRtsScriptedEligibilityV119("W3-RTS04",rules,"W3-K02",["W3-U07"]),/W3-KR02/);
 const {state}=openDefense();
 assert.equal(state.active.rts.scripted.kind,"circuit-defense");
 assert.deepEqual(game.readWarOperationsV115(JSON.stringify(state),rules),state);
});

test("guarded and uncontested circuit must survive four separate turns; periodic steam is reported",()=>{
 const {state,guardId,targetId}=openDefense(),terrain=game.warMissionTerrainV116(targetId,rules);
 const guard={...state.active.rts.actors.find(actor=>actor.teamId===guardId),x:7,y:3};
 const farRival={id:"rival-far",teamId:null,side:"rival",unitId:"W3-U01",x:0,y:5,hp:12};
 let script=state.active.rts.scripted;
 for(let i=1;i<=4;i++){
  const result=game.resolveWarRtsScriptedTickV119(script,[guard,farRival],terrain);
  script=result.objective;
  assert.equal(script.heldTurns,i);
  assert.equal(script.integrity,3);
  assert.equal(script.pressurePhase,i%3);
  assert.equal(result.outcome,i===4?"victory":null);
 }
 assert.equal(state.active.rts.scripted.heldTurns,0);
});

test("rivals at the circuit invalidate control, and three unguarded attacks destroy its integrity",()=>{
 const {state,guardId,targetId}=openDefense(),terrain=game.warMissionTerrainV116(targetId,rules);
 let script=state.active.rts.scripted;
 const distant={...state.active.rts.actors.find(actor=>actor.teamId===guardId),x:1,y:1};
 const enemy={id:"rival-near",teamId:null,side:"rival",unitId:"W3-U01",x:7,y:3,hp:20};
 let phase=game.resolveWarRtsScriptedTickV119(script,[distant,enemy],terrain);
 assert.equal(phase.objective.heldTurns,0);
 assert.equal(phase.objective.integrity,2);
 assert.equal(phase.outcome,null);
 script=phase.objective;
 phase=game.resolveWarRtsScriptedTickV119(script,[distant,enemy],terrain);
 assert.equal(phase.objective.integrity,1);
 phase=game.resolveWarRtsScriptedTickV119(phase.objective,[distant,enemy],terrain);
 assert.equal(phase.objective.integrity,0);
 assert.equal(phase.outcome,"defeat");
 const wounded={...distant,hp:0,x:1,y:1};
 const withoutRealGuard=game.resolveWarRtsScriptedTickV119(script,[wounded],terrain);
 assert.equal(withoutRealGuard.outcome,"defeat");
});

test("eliminating every rival without holding the lever cannot score a scripted victory",()=>{
 const {state,guardId}=openDefense();
 const actors=state.active.rts.actors.filter(a=>a.side==="ally");
 assert.equal(actors.length,1);
 const modified={...state,active:{...state.active,rts:{...state.active.rts,actors}}};
 const outcome=game.holdWarRtsAlternatingV119(modified,guardId,rules);
 assert.equal(outcome.accepted,true);
 assert.ok(outcome.state.active,"eliminating the rivals cannot substitute an actual guarded lever");
 assert.equal(outcome.state.reports.length,0);
});

test("archive refuses fabricated integrity, altered turn counters and unexpected map identities",()=>{
 const {state}=openDefense(),raw=JSON.stringify(state);
 assert.deepEqual(game.readWarOperationsV115(raw,rules),state);
 for(const modify of [
  draft=>{draft.active.rts.scripted.integrity=0;},
  draft=>{draft.active.rts.scripted.pressurePhase=3;},
  draft=>{draft.active.rts.scripted.heldTurns=5;},
  draft=>{draft.active.rts.scripted.leverPoint={x:99,y:99};},
  draft=>{draft.active.rts.scripted.sourceMapId="W3-MAP01";},
  draft=>{draft.active.rts.scripted.requiredTurns=1;},
 ]){
  const payload=structuredClone(state);modify(payload);
  assert.equal(game.readWarOperationsV115(JSON.stringify(payload),rules),null);
 }
});
