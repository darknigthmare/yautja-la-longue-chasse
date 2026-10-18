import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const built=await build({stdin:{contents:"export {createPitLabFrame,createPitLabPresentationV93} from './app/pit-lab/pitLabProduction'; export {getPitFighterPresentationCue} from './app/game/pitFighterPresentation';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent'});
const {createPitLabFrame,createPitLabPresentationV93,getPitFighterPresentationCue}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const frames=[3,7,11].map((durationTicks,index)=>({pageId:'fixture',rect:[index*8,0,8,8],pivot:[4,7],durationTicks}));
const clip=kind=>({id:'pit.presentation.'+kind,facing:'left',status:'validated',loop:kind==='dizzy',ticksPerSecond:30,frames});

test('lifecycle inspector clocks the selected native frame at its own rate without manufacturing combat results',()=>{
 for(const kind of ['intro','victory','defeat','dizzy','taunt'])for(let index=0;index<frames.length;index++){
  const c=clip(kind),sample=createPitLabFrame('jungle-hunter',c,index,'jungle-hunter-avec-casque-53f4eb349a'),before=JSON.stringify(sample.combat);
  const view=createPitLabPresentationV93(c,index),cue=getPitFighterPresentationCue(0,view);
  assert.equal(cue.kind,kind);assert.equal(cue.elapsedMs,[0,100,1000/3][index]);
  assert.equal(view.durationMs,700);assert.equal(sample.fighter.facing,-1);
  assert.equal(JSON.stringify(sample.combat),before);assert.equal(sample.combat.phase,'round');assert.equal(sample.combat.matchWinnerId,null);
  if(kind==='dizzy')assert.equal(getPitFighterPresentationCue(1,view).kind,'finisher-ready');
  if(kind==='taunt')assert.equal(getPitFighterPresentationCue(1,view),null,'The opponent keeps actual gameplay instead of being made dizzy');
 }
});
test('unknown gameplay clips and malformed source rates cannot invent lifecycle views',()=>{
 for(const id of ['idle','pit.stand.hitstun','pit.presentation.intro.foreign'])assert.equal(createPitLabPresentationV93({...clip('intro'),id},1),undefined);
 for(const ticksPerSecond of [0,-1,NaN,Infinity])assert.equal(createPitLabPresentationV93({...clip('intro'),ticksPerSecond},1),undefined);
 assert.equal(createPitLabPresentationV93({...clip('intro'),frames:[]},0),undefined);
 assert.equal(getPitFighterPresentationCue(0,createPitLabPresentationV93(clip('intro'),NaN)).elapsedMs,0);
 assert.equal(getPitFighterPresentationCue(0,createPitLabPresentationV93(clip('intro'),99)).elapsedMs,1000/3);
});
