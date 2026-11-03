import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';

const bundle=await build({stdin:{contents:'export * from "./app/game/pitArenaLifeEvents"; export * from "./app/game/pitArenaLife"; export * from "./app/game/pitArenaLifeRendering"; export {drawPitArenaBackdrop} from "./app/game/pitArenaRendering"; export {createPitCombatState,serializePitCombat,PIT_ROUND_FRAMES} from "./app/game/systems/pitCombat";',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const stages=['arena-016-terrasse-des-jeunes-sangs','arena-035-fosse-des-cent-masques'];
const actor='left-clan-observers';
const state=(roundFrame,extra={})=>({round:1,phase:'round',roundFrame,...extra});
const pose=(frame,extra={})=>api.getPitArenaLifeEventPose(stages[0],actor,state(frame,extra));

test('only the two workbook observer venues opt into direction; Ryushi retains its authored loop',()=>{
  assert.deepEqual(api.PIT_DIRECTED_LIFE_ARENAS,stages);
  for(const id of ['arena-138-avp-ryushi-prosperity-wells','arena-139-gotham-rooftops','unknown','constructor'])assert.equal(api.getPitArenaLifeEventPose(id,actor,state(100)),null);
  assert.deepEqual(pose(300),{nativeFrame:0,event:'rest'});
});

test('all actor/round schedules stay within12–25seconds and are reproducible without random state',()=>{
  const distinct=new Set();
  for(const stage of stages)for(let round=1;round<=5;round++)for(const entry of api.getPitArenaLifeCast(stage)){
    const timing=api.getPitArenaLifeEventTiming(stage,entry.id,round);
    assert(timing.intervalFrames>=720&&timing.intervalFrames<=1500);assert(timing.startDelayFrames>=8&&timing.startDelayFrames<28);assert(timing.resultDelayFrames>=0&&timing.resultDelayFrames<12);
    assert.deepEqual(timing,api.getPitArenaLifeEventTiming(stage,entry.id,round));distinct.add(timing.intervalFrames);
  }
  assert(distinct.size>=15,'Independent observer groups, venues and rounds do not move in lockstep');
});

test('native posture events are brief, separated by long rests, and not a continuous2second loop',()=>{
  const {intervalFrames,startDelayFrames}=api.getPitArenaLifeEventTiming(stages[0],actor,1);
  assert.equal(pose(startDelayFrames+20).nativeFrame,1);
  for(let f=startDelayFrames+60;f<intervalFrames;f++)assert.deepEqual(pose(f),{nativeFrame:0,event:'rest'});
  assert.deepEqual([0,20,40,60,80,100,120].map(offset=>pose(intervalFrames+offset).nativeFrame),[0,1,2,3,4,5,0]);
  for(let f=intervalFrames+140;f<intervalFrames*2;f++)assert.equal(pose(f).event,'rest');
  assert.equal(pose(intervalFrames*2+40).nativeFrame,2);
});

test('round result interrupts ambient movement once, returns to rest, and never depends on winner or hits',()=>{
  const {intervalFrames,resultDelayFrames}=api.getPitArenaLifeEventTiming(stages[0],actor,1);
  const result=elapsed=>pose(intervalFrames+60,{phase:'round-over',resultElapsedFrames:elapsed});
  assert.deepEqual([0,20,40,60,80].map(offset=>result(resultDelayFrames+offset).nativeFrame),[2,3,4,5,0]);
  assert.equal(result(resultDelayFrames+100).event,'rest');assert.equal(result(99999).event,'rest');
  const frozen=Object.freeze(state(999,{phase:'match-over',resultElapsedFrames:45}));
  const before=JSON.stringify(frozen);assert.deepEqual(api.getPitArenaLifeEventPose(stages[0],actor,frozen),api.getPitArenaLifeEventPose(stages[0],actor,{...frozen,hits:99,winnerId:'city-hunter'}));assert.equal(JSON.stringify(frozen),before);
});

test('pause and replay seeking are pure, including a terminal result whose simulation frame is stopped',()=>{
  const {intervalFrames}=api.getPitArenaLifeEventTiming(stages[0],actor,1);
  const wanted=pose(intervalFrames+42);for(const frame of [9999,0,721,1])pose(frame);assert.deepEqual(pose(intervalFrames+42),wanted);
  const paused=state(600,{phase:'match-over',resultElapsedFrames:48});
  for(let i=0;i<100;i++)assert.deepEqual(api.getPitArenaLifeEventPose(stages[0],actor,paused),api.getPitArenaLifeEventPose(stages[0],actor,{...paused}));
  assert.notEqual(pose(600,{phase:'match-over',resultElapsedFrames:48}).nativeFrame,pose(600,{phase:'match-over',resultElapsedFrames:220}).nativeFrame);
});

test('reduced motion and invalid clocks always select the calm native pose',()=>{
  for(const phase of ['round','round-over','match-over'])for(const frame of [0,800,9999])assert.deepEqual(api.getPitArenaLifeEventPose(stages[0],actor,state(frame,{phase,resultElapsedFrames:50}),true),{nativeFrame:0,event:'rest'});
  for(const input of [undefined,state(NaN),state(Infinity),state(-1),state(10,{round:0}),state(10,{round:1.2}),state(10,{phase:'match-over',resultElapsedFrames:NaN})])assert.deepEqual(api.getPitArenaLifeEventPose(stages[0],actor,input),{nativeFrame:0,event:'rest'});
});

function drawingContext(){return {globalAlpha:1,calls:[],save(){},restore(){},fillRect(){},translate(...args){this.calls.push(['translate',...args]);},scale(...args){this.calls.push(['scale',...args]);},drawImage(...args){this.calls.push(['draw',...args]);}};}
const sheet=api.PIT_ARENA_LIFE_SHEETS.find(s=>s.id==='yautja-spectators');
const images=new Map([[sheet.src,{naturalWidth:1536,naturalHeight:1024}]]);
test('renderer changes actual source cells and keeps measured feet anchored during every event',()=>{
  const {intervalFrames}=api.getPitArenaLifeEventTiming(stages[0],actor,1);
  for(const frame of [300,...[0,20,40,60,80,100,120].map(offset=>intervalFrames+offset)]){
    const ctx=drawingContext();const report=api.drawPitArenaLife(ctx,{arenaId:stages[0],frame,groundY:430,images,transform:()=>({scale:1,translateX:0,translateY:0}),eventContext:state(frame)});
    assert.equal(report.actorsDrawn,2);assert.equal(report.nativeFrames[0],pose(frame).nativeFrame);assert.deepEqual(report.missingPaths,[]);
    const draw=ctx.calls.filter(c=>c[0]==='draw')[0],index=report.nativeFrames[0];assert.equal(draw[2],index%3*512);assert.equal(draw[3],Math.floor(index/3)*512);
    assert.equal(draw[7]+98*sheet.nativePivots[index][1]/512,0);assert.deepEqual(ctx.calls.filter(c=>c[0]==='translate'),[['translate',130,430],['translate',830,430]]);
  }
});

test('production renderer derives round-local time and pausable terminal time without mutating saves or replay',()=>{
  const combat=api.createPitCombatState('jungle-hunter','city-hunter',{mode:'match',arenaId:stages[0]});
  const bank={arenaId:stages[0],images,requestedPaths:new Set([sheet.src]),failedPaths:new Set(),cancelled:false,productionKit:{catalogueId:stages[0],planes:[{id:'P3',assets:[]}]}};
  const camera={arenaId:stages[0],centerX:480,centerY:270,zoom:1};
  const timing=api.getPitArenaLifeEventTiming(stages[0],actor,2),elapsed=timing.intervalFrames+40;
  combat.frame=12345;combat.round=2;combat.roundFramesRemaining=api.PIT_ROUND_FRAMES-elapsed;
  const before=api.serializePitCombat(combat),report=api.drawPitArenaBackdrop(drawingContext(),combat,camera,bank);
  assert.equal(report.life.nativeFrames[0],2,'Round2 uses its timer, not the global replay frame');assert.equal(api.serializePitCombat(combat),before);
  combat.phase='round-over';combat.lastRoundResult={round:2,reason:'ko',winnerId:'jungle-hunter',frame:combat.frame-50};
  const roundResult=api.drawPitArenaBackdrop(drawingContext(),combat,camera,bank,{lifeResultElapsedMs:99999});
  assert.equal(roundResult.life.nativeFrames[0],api.getPitArenaLifeEventPose(stages[0],actor,state(elapsed,{round:2,phase:'round-over',resultElapsedFrames:50})).nativeFrame,'Round-over remains tied to simulation');
  combat.phase='match-over';combat.lastRoundResult.frame=combat.frame;
  const terminal=api.drawPitArenaBackdrop(drawingContext(),combat,camera,bank,{lifeResultElapsedMs:1000});
  const finished=api.drawPitArenaBackdrop(drawingContext(),combat,camera,bank,{lifeResultElapsedMs:2200});
  assert.notEqual(terminal.life.nativeFrames[0],0);assert.deepEqual(finished.life.nativeFrames,[0,0]);
});
