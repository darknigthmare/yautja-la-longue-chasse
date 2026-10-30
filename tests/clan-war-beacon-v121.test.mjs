import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const compiled=await build({stdin:{
  contents:"export * from './app/game/systems/clanWarOperationsV115'; export * from './app/game/systems/clanWarRtsScenariosV119'; export * from './app/game/systems/clanWarMissionTerrainV116'; export * from './app/game/systems/clanWarBibleV6';",
  resolveDir:process.cwd()},bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const game=await import("data:text/javascript;base64,"+Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const rules=game.DEFAULT_WAR_RULES_V6;
function openBeacon(){
  const initial=game.createWarOperationsV115(rules);
  const scout=initial.teams.find(t=>t.unitId==="W3-U01");
  const tracker=initial.teams.find(t=>t.unitId==="W3-U04");
  assert.ok(scout&&tracker);
  const target=rules.territories.find(t=>t.region==="W3-KR03"&&
    game.warMissionEligibleV115(initial,rules,t.id,[scout.id,tracker.id])===null);
  assert.ok(target,"a source W3 route to a crater territory should be available");
  const launched=game.beginWarOperationV115(initial,"rts",target.id,[scout.id,tracker.id],rules,1000,"recon","W3-RTS05");
  assert.equal(launched.accepted,true,launched.message);
  return {state:launched.state,targetId:target.id,scoutId:scout.id,trackerId:tracker.id};
}

test("source W3-RTS05 references actual third-crater map, with two distinct source trackers",()=>{
 const source=game.warSourceRtsScenarioV119("W3-RTS05",rules);
 assert.equal(source.title,"Le porteur entre trois cratères");
 assert.equal(source.sourceMapId,"W3-MAP03");
 assert.equal(source.supportedRegionId,"W3-KR03");
 assert.equal(source.objectiveKind,"beacon-intercept");
 assert.match(source.situation,/balise/i);
 assert.equal(game.warRtsScriptedEligibilityV119("W3-RTS05",rules,"W3-K13",["W3-U01","W3-U04"]),null);
 assert.match(game.warRtsScriptedEligibilityV119("W3-RTS05",rules,"W3-K13",["W3-U01"]),/W3-U04/);
 assert.match(game.warRtsScriptedEligibilityV119("W3-RTS05",rules,"W3-K02",["W3-U01","W3-U04"]),/W3-KR03/);
 const {state}=openBeacon();
 assert.equal(state.active.rts.scripted.kind,"beacon-intercept");
 assert.equal(state.active.rts.scripted.beacon.enemyCarrierId,"rival-0");
 assert.ok(state.active.rts.actors.some(a=>a.id==="rival-0"&&a.side==="rival"));
 assert.deepEqual(game.readWarOperationsV115(JSON.stringify(state),rules),state);
});

test("the real beacon moves only with its identified enemy carrier; a decoy never counts",()=>{
 const {state,targetId,scoutId}=openBeacon(),terrain=game.warMissionTerrainV116(targetId,rules);
 const original=state.active.rts.scripted;
 const actor=state.active.rts.actors.map(a=>a.id==="rival-0"?{...a,x:7,y:1}:
   a.teamId===scoutId?{...a,x:5,y:4}:a);
 let phase=game.resolveWarRtsScriptedTickV119(original,actor,terrain);
 assert.equal(phase.objective.decoy.recognized,true);
 assert.equal(phase.objective.observed,false);
 assert.equal(phase.outcome,null);
 assert.equal(phase.objective.beacon.enemyCarrierId,"rival-0");
 const moved=actor.map(a=>a.id==="rival-0"?{...a,x:8,y:1}:a);
 phase=game.resolveWarRtsScriptedTickV119(phase.objective,moved,terrain);
 assert.equal(phase.objective.beacon.x,8);
 assert.equal(phase.objective.beacon.y,1);
 assert.equal(phase.objective.beacon.allyCarrierTeamId,null);
 assert.equal(phase.outcome,null);
});

test("observing an enemy, retrieving its fallen beacon and returning with a living tracker gives one real victory",()=>{
 const {state,targetId,scoutId,trackerId}=openBeacon(),terrain=game.warMissionTerrainV116(targetId,rules);
 const old=JSON.stringify(state),objective=state.active.rts.scripted;
 let actors=state.active.rts.actors
   .filter(a=>a.side==="ally"||a.id==="rival-0")
   .map(a=>a.teamId===scoutId?{...a,x:7,y:2}:
     a.teamId===trackerId?{...a,x:7,y:1}:
     a.id==="rival-0"?{...a,hp:0,x:7,y:1}:a);
 const pickup=game.resolveWarRtsScriptedTickV119(objective,actors,terrain);
 assert.equal(pickup.outcome,null);
 assert.equal(pickup.objective.observed,true);
 assert.equal(pickup.objective.beacon.enemyCarrierId,null);
 assert.equal(pickup.objective.beacon.allyCarrierTeamId,trackerId);
 assert.equal(pickup.objective.beacon.x,7);
 actors=actors.map(a=>a.teamId===trackerId?{...a,x:1,y:4}:a);
 const extracted=game.resolveWarRtsScriptedTickV119(pickup.objective,actors,terrain);
 assert.equal(extracted.outcome,"victory");
 assert.equal(extracted.objective.beacon.x,1);
 assert.equal(extracted.objective.beacon.y,4);
 assert.equal(JSON.stringify(state),old);
});

test("if the tracker falls en route, the original beacon stays on its actual last tile",()=>{
 const {state,targetId,scoutId,trackerId}=openBeacon(),terrain=game.warMissionTerrainV116(targetId,rules);
 const actors=state.active.rts.actors.filter(a=>a.side==="ally"||a.id==="rival-0")
   .map(a=>a.teamId===scoutId?{...a,x:7,y:2}:
    a.teamId===trackerId?{...a,x:7,y:1}:a.id==="rival-0"?{...a,hp:0,x:7,y:1}:a);
 const first=game.resolveWarRtsScriptedTickV119(state.active.rts.scripted,actors,terrain);
 const died=actors.map(a=>a.teamId===trackerId?{...a,hp:0,x:3,y:4}:a);
 const lost=game.resolveWarRtsScriptedTickV119(first.objective,died,terrain);
 assert.equal(lost.objective.beacon.allyCarrierTeamId,null);
 assert.equal(lost.objective.beacon.x,3);
 assert.equal(lost.objective.beacon.y,4);
 assert.equal(lost.outcome,"defeat");
});

test("save import rejects a fabricated beacon, double carriers, forged scouts or swapped map",()=>{
 const {state}=openBeacon();
 for(const change of [
  s=>{s.active.rts.scripted.beacon.id="FREE-FAKE-BEACON";},
  s=>{s.active.rts.scripted.beacon.enemyCarrierId="rival-1";},
  s=>{s.active.rts.scripted.beacon.allyCarrierTeamId="W115-TEAM-01";},
  s=>{s.active.rts.scripted.decoy.x=3;},
  s=>{s.active.rts.scripted.sourceMapId="W3-MAP01";},
  s=>{s.active.rts.scripted.extraction.y=99;},
 ]){
  const forged=structuredClone(state);change(forged);
  assert.equal(game.readWarOperationsV115(JSON.stringify(forged),rules),null);
 }
});


test("the seen enemy carrier flees along physical passable steps toward the less guarded crater exit",()=>{
 const {state,targetId,scoutId,trackerId}=openBeacon(),terrain=game.warMissionTerrainV116(targetId,rules);
 const source=state.active.rts.scripted;
 const unobserved=state.active.rts.actors.find(actor=>actor.id==="rival-0");
 assert.equal(game.warRtsBeaconEscapeStepV121(source,unobserved,state.active.rts.actors,terrain),null);
 const known={...source,observed:true};
 const scout={...state.active.rts.actors.find(actor=>actor.teamId===scoutId),x:3,y:1};
 const tracker={...state.active.rts.actors.find(actor=>actor.teamId===trackerId),x:2,y:4};
 let bearer={...unobserved};
 let reached=false;
 for(let i=0;i<25;i++){
  const prev={x:bearer.x,y:bearer.y};
  const choice=game.warRtsBeaconEscapeStepV121(known,bearer,[scout,tracker,bearer],terrain);
  if(!choice)break;
  assert.equal(game.warTerrainCellBlockedV116(terrain,choice.x,choice.y),false);
  assert.equal(Math.abs(choice.x-prev.x)+Math.abs(choice.y-prev.y),1,"a rival cannot jump over crater walls");
  bearer={...bearer,x:choice.x,y:choice.y};
  if((bearer.x===8&&bearer.y===5)||(bearer.x===0&&bearer.y===5)){reached=true;break;}
 }
 assert.equal(reached,true,"a usable source-grounded exit should be reachable");
 const final=game.resolveWarRtsScriptedTickV119(known,[scout,tracker,bearer],terrain);
 assert.equal(final.outcome,"defeat","an enemy bearing the real beacon must be able to escape");
 assert.equal(final.objective.beacon.enemyCarrierId,bearer.id);
});
