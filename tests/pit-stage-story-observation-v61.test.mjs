import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyPitStoryIntroSamplesV61} from '../scripts/lib/pit-stage-story-observation-v61.mjs';
const definitions=[{id:'judge',trigger:'round-end',fps:3,frames:[0,1,2,3,4,5]}];
const fixture=()=>[
  {stage:'arena-185-training',round:1,phase:'round-over',presentation:'round-result',frame:1551,events:[{eventId:'judge',active:true,occurrence:'round:1:result',nativeFrame:5,elapsedFrames:116}]},
  {stage:'arena-185-training',round:2,phase:'round',presentation:'countdown',frame:1555,events:[{eventId:'judge',active:true,occurrence:'round:1:result',nativeFrame:5,elapsedFrames:119}]},
  {stage:'arena-185-training',round:2,phase:'round',presentation:'countdown',frame:1555,events:[{eventId:'judge',active:false,occurrence:null,nativeFrame:0,elapsedFrames:null}]},
];
test('one proven previous-round final pose followed immediately by the settled canvas is recorded explicitly',()=>{
  const report=verifyPitStoryIntroSamplesV61(fixture(),definitions);assert.equal(report.length,1);assert.equal(report[0].currentRound,2);assert(report[0].nextSampleInactive);
});
test('the observer still refuses a current-round cue or early native pose during countdown',()=>{
  for(const mutate of [s=>s[1].events[0].occurrence='round:2:result',s=>s[1].events[0].nativeFrame=4,s=>s[1].events[0].elapsedFrames=120,
    s=>s[1].presentation='intro-left',s=>s[1].round=1,s=>s[0].presentation='fight']){const samples=fixture();mutate(samples);assert.throws(()=>verifyPitStoryIntroSamplesV61(samples,definitions));}
});
test('missing, repeated, still-active or later-tick follow-up samples cannot be dismissed as render delay',()=>{
  for(const mutate of [s=>s.pop(),s=>s.splice(2,0,structuredClone(s[1])),s=>s[2].events[0].active=true,s=>s[2].frame++,s=>s[2].round=3]){
    const samples=fixture();mutate(samples);assert.throws(()=>verifyPitStoryIntroSamplesV61(samples,definitions));
  }
});
