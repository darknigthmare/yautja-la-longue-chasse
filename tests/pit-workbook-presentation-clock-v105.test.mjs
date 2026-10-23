import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({stdin:{contents:[
 "export * from './app/game/systems/pitCombat.ts';",
 "export * from './app/game/systems/pitRoundPresentation.ts';",
 "export * from './app/game/systems/pitWorkbookPresentationClockV105.ts';",
].join('\n'),resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const p=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
function ended(recipe='workbook-v105'){
 const state=p.createPitCombatState('scar','feral-hunter',{...(recipe?{normalMoves:recipe}:{})});
 state.phase='round-over';state.transitionFramesRemaining=120;
 state.lastRoundResult={round:1,winnerId:'scar',reason:'ko',frame:0};state.fighters[0].roundsWon=1;state.fighters[1].health=0;
 return state;
}
const clock=(view,state,duration=5000)=>p.applyPitWorkbookPresentationClockV105(view,state,duration);
test('a complete native result holds the final transition tick, then starts the next round with exactly120 historical ticks',()=>{
 let state=ended(),view=clock(p.createPitRoundPresentation(state),state),engineTicks=0;
 for(let i=0;i<119;i++){
  view=clock(p.advancePitRoundPresentation(view,state,1000/60),state);
  assert.equal(view.blocksSimulation,false);
  state=p.stepPitCombat(state,[{},{}]);engineTicks++;
  view=clock(p.observePitRoundPresentation(view,state),state);
 }
 assert.equal(state.transitionFramesRemaining,1);assert.equal(state.round,1);assert.equal(view.phase,'round-result');assert.equal(view.blocksSimulation,true);
 const bytes=p.serializePitCombat(state);
 // Wall time still advances the complete300-tick native result. Pause/hidden
 // time does not advance it or consume the final replay input.
 const paused=p.advancePitRoundPresentation(view,state,100,true);assert.deepEqual(paused,view);
 while(view.elapsedMs<view.durationMs){
  view=clock(p.advancePitRoundPresentation(view,state,100),state);
  assert.equal(p.serializePitCombat(state),bytes);
  if(view.elapsedMs<5000)assert.equal(view.blocksSimulation,true);
 }
 assert.equal(view.elapsedMs,5000);assert.equal(view.blocksSimulation,false);assert.equal(engineTicks,119);
 state=p.stepPitCombat(state,[{},{}]);engineTicks++;view=clock(p.observePitRoundPresentation(view,state),state,null);
 assert.equal(engineTicks,120);assert.equal(state.round,2);assert.equal(view.phase,'countdown');assert.equal(view.blocksSimulation,true);
});
test('latest state in a multi-tick RAF batch stops before the next round and releases without deadlock at the native deadline',()=>{
 let state=ended(),view=clock({...p.createPitRoundPresentation(state),elapsedMs:1950},state);state.transitionFramesRemaining=4;
 let ticks=0;
 for(let batch=0;batch<8;batch++){
  state=p.stepPitCombat(state,[{},{}]);ticks++;
  view=clock(p.observePitRoundPresentation(view,state),state);
  if(view.blocksSimulation)break;
 }
 assert.equal(ticks,3);assert.equal(state.transitionFramesRemaining,1);assert.equal(state.round,1);
 view=clock({...view,elapsedMs:5000},state);assert.equal(view.blocksSimulation,false);
 state=p.stepPitCombat(state,[{},{}]);assert.equal(state.round,2);
});
test('historical V11/V12 theatre and engine bytes never acquire the V105 wall-time gate',()=>{
 for(const recipe of [undefined,'workbook-v104']){
  let state=ended(recipe??null),view=p.createPitRoundPresentation(state);assert.equal(clock(view,state),view);
  const original=state;
  for(let i=0;i<120;i++){
   view=p.advancePitRoundPresentation(view,state,1000/60);state=p.stepPitCombat(state,[{},{}]);view=p.observePitRoundPresentation(view,state);
  }
  assert.equal(state.round,2);assert.equal(view.phase,'countdown');
  let reference=original;for(let i=0;i<120;i++)reference=p.stepPitCombat(reference,[{},{}]);assert.equal(p.serializePitCombat(state),p.serializePitCombat(reference));
 }
});
