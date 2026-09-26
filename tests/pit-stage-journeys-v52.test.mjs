import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import { build } from 'esbuild';
import sharp from 'sharp';
const b=await build({stdin:{contents:[
  'export * from "./app/game/systems/pitCombat";',
  'export * from "./app/game/systems/pitReplay";',
  'export * from "./app/game/systems/pitStageJourney";',
  'export {resetPitTrainingPositions} from "./app/game/systems/pitTraining";',
  'export {getPitArenaArtPaths} from "./app/game/pitArenaRendering";',
  'export {resolvePitArenaProductionKit} from "./app/game/pitArenaProduction";',
].join('\n'),resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const p=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const routes=p.PIT_STAGE_JOURNEY_ROUTES.filter(r=>r.release==='V52');
const legacy=JSON.parse(await fs.readFile('tests/fixtures/pit-replay-v5-reserve-throw.json','utf8'));
const reader=p.createPitReplayReader(legacy),inputs=[];while(!reader.done)inputs.push(reader.next().value.inputs);
function create(route,side=1,mode='training'){
 const state=p.createPitCombatState('jungle-hunter','city-hunter',{arenaId:route.entry,stageJourney:route.id,mode});
 state.fighters[0].x=side===1?800:160;state.fighters[1].x=side===1?862:98;
 state.fighters[0].facing=side;state.fighters[1].facing=-side;return state;
}
function project(initial,tech=false){let s=p.stepPitCombat(initial,[{throw:true},{}]);const states=[s];let used=false;
 for(let i=0;i<55;i++){const second=tech&&s.pendingThrow&&!used?{throw:true}:{};if(s.pendingThrow)used=true;s=p.stepPitCombat(s,[{},second]);states.push(s);}return {state:s,states};}
test('exactly four original exhibition links extend the existing route without inventing images or collision layouts',async()=>{
 assert.equal(routes.length,4);assert.equal(p.PIT_STAGE_JOURNEY_ROUTES.length,5);
 assert.equal(new Set(p.PIT_STAGE_JOURNEY_ROUTES.map(r=>r.entry)).size,5);
 for(const route of routes){
  assert.equal(p.getPitStageJourneyForArena(route.entry).id,route.id);
  assert.deepEqual(p.pitStageJourneyArtIds(route.entry,route.id),[route.entry,route.destination]);
  for(const id of [route.entry,route.destination]){
   const arena=p.PIT_ARENAS[id];assert(arena);assert.deepEqual([arena.width,arena.height,arena.groundY,arena.leftWall,arena.rightWall],[960,540,430,54,906]);
   const kit=p.resolvePitArenaProductionKit(id);assert(kit);assert.deepEqual(kit.planes.map(v=>v.id),['P0','P1','P2','P3','P4','P5']);
   for(const src of p.getPitArenaArtPaths(id)){const meta=await sharp('public'+src).metadata();assert(meta.width>0&&meta.height>0,src);}
  }
  const neutral=p.createPitCombatState('jungle-hunter','city-hunter',{arenaId:route.entry});assert.equal(neutral.stageJourney,undefined);
 }
});
for(const route of routes){
 test(route.id+' transfers both slots at both sides, preserving damage and exact replay state',()=>{
  for(const side of [-1,1]){const initial=create(route,side),before=p.serializePitCombat(initial),neutral=structuredClone(initial);delete neutral.stageJourney;delete neutral.rules.stageJourney;
   const result=project(initial),control=project(neutral),committed=result.states.find(s=>s.events.some(e=>e.type==='stage-transfer'));
   assert(committed);assert.equal(p.serializePitCombat(initial),before);assert.equal(committed.stageJourney.id,route.id);assert.equal(committed.stageJourney.exitSide,side);
   assert.deepEqual(committed.fighters.map(f=>f.x),side===1?[300,660]:[660,300]);
   const same=control.states.find(s=>s.frame===committed.frame);for(const slot of [0,1])for(const key of ['health','traque','roundsWon','stunFrames','knockdownFrames'])assert.equal(committed.fighters[slot][key],same.fighters[slot][key],key);
   assert.equal(p.pitStageSceneArena(committed),route.destination);assert.equal(committed.arenaId,route.entry);assert.deepEqual(p.deserializePitCombat(p.serializePitCombat(committed)),committed);
  }
  const replay=p.recordPitReplay(inputs,{fighters:legacy.fighters,arenaId:route.entry,rules:{mode:'training',stageJourney:route.id}});
  assert.equal(replay.engineVersion,6);assert.equal(replay.version,3);assert.equal(p.playPitReplay(replay).stageJourney.sector,'court');assert.equal(p.pitStageSceneArena(p.playPitReplay(replay)),route.destination);
  assert.deepEqual(p.deserializePitReplay(p.serializePitReplay(replay)),replay);
 });
 test(route.id+' forbids tech, KO and forged endpoints; resets retain route ownership',()=>{
  assert.equal(project(create(route),true).state.stageJourney.sector,'sas');
  const ko=create(route,1,'match');ko.fighters[1].health=1;assert.equal(project(ko).state.stageJourney.sector,'sas');
  const done=project(create(route)).state;
  for(const reset of [p.rematchPitCombat,p.resetPitTrainingPositions]){const next=reset(done);assert.equal(next.stageJourney.id,route.id);assert.equal(next.stageJourney.sector,'sas');assert.equal(next.rules.stageJourney,route.id);assert.equal(next.frame,0);}
  let end=project(create(route,1,'match')).state;end.roundFramesRemaining=1;end=p.stepPitCombat(end,[{},{}]);for(let i=0;i<p.PIT_ROUND_TRANSITION_FRAMES;i++)end=p.stepPitCombat(end,[{},{}]);assert.equal(end.stageJourney.id,route.id);assert.equal(end.stageJourney.sector,'sas');
  for(const arenaId of [route.destination,'the-pit',routes.find(r=>r.id!==route.id).entry])assert.throws(()=>p.createPitCombatState('jungle-hunter','city-hunter',{arenaId,stageJourney:route.id}));
  for(const patch of [{arenaId:route.destination},{stageJourney:{...done.stageJourney,id:'reserve-passage-v1'}},{stageJourney:{...done.stageJourney,transferFrame:done.frame+1}}])assert.throws(()=>p.deserializePitCombat(JSON.stringify({...done,...patch})));
  const replay=p.recordPitReplay(inputs,{fighters:legacy.fighters,arenaId:route.entry,rules:{mode:'training',stageJourney:route.id}});
  assert.equal(p.normalizePitReplay({...replay,arenaId:route.destination}),null);assert.equal(p.normalizePitReplay({...replay,engineVersion:5}),null);
 });
}
test('published V6 reserve checksum stays byte-identical; V4/V5 fixtures remain readable and neutral',async()=>{
 const reserve=p.recordPitReplay(inputs,{fighters:legacy.fighters,arenaId:p.PIT_RESERVE_GATE,rules:{mode:'training',stageJourney:p.PIT_RESERVE_JOURNEY}});
 // Baseline independently regenerated with Git HEAD V51 source before this extension.
 assert.equal(reserve.metadata.checksum,'47ceba24');assert.equal(reserve.metadata.ticks,260);
 for(const name of ['pit-replay-v4-throw.json','pit-replay-v5-reserve-throw.json']){
  const fixture=JSON.parse(await fs.readFile('tests/fixtures/'+name,'utf8')),data=fixture.replay??fixture,normalized=p.normalizePitReplay(data);assert(normalized);assert.equal(normalized.metadata.checksum,data.metadata.checksum);assert.equal(p.playPitReplay(normalized).stageJourney,undefined);
 }
});
