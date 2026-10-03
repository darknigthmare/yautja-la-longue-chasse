import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
const p=homeworldQaModelV64(process.cwd(),['pitFinishersV80.ts','pitCombat.ts','pitRosterExpansion.ts']);
const options={mode:'stylized',reducedGore:false,reducedMotion:false,narrative:false,replay:false,cpuWinner:false};
function played(winner=0,left='jungle-hunter',right='city-hunter'){
 let c=p.createPitCombatState(left,right);
 for(let i=0;i<18000&&c.phase!=='match-over';i++){
  const a=c.fighters[winner],b=c.fighters[1-winner],input=[{},{}];
  if(c.phase==='round')input[winner]=Math.abs(a.x-b.x)>64?b.x>a.x?{right:true}:{left:true}:a.phase==='idle'&&b.phase!=='knockdown'&&!b.wakeInvulnerabilityFrames?{attack:'heavy'}:{};
  c=p.stepPitCombat(c,input);
 }
 assert.equal(c.phase,'match-over');assert.equal(c.fighters[winner].roundsWon,2);assert.deepEqual(p.deserializePitCombat(p.serializePitCombat(c)),c);return c;
}
const terminals=[played(0),played(1)];
const start=(c,patch={})=>p.observePitFinisherV80(p.createPitFinisherViewV80(),c,'valid-terminal', {...options,...patch});
const advance=(view,ms)=>{for(let remaining=ms;remaining>0;remaining-=100)view=p.advancePitFinisherV80(view,Math.min(remaining,100),true);return view;};

test('201 exact identities and804 playable choices keep equipment evidence and original compositions explicit',()=>{
 assert.equal(p.PIT_FINISHER_PROFILES_V80.length,201);assert.deepEqual(new Set(p.PIT_FINISHER_PROFILES_V80.map(x=>x.fighterId)),new Set(p.PIT_VERSUS_FIGHTER_IDS));
 assert.equal(p.PIT_FINISHER_COUNTS_V80.playableSequences,804);assert.equal(p.PIT_FINISHER_COUNTS_V80.attestedEquipment,18);assert.equal(p.PIT_FINISHER_COUNTS_V80.identityDerived,13);assert.equal(p.PIT_FINISHER_COUNTS_V80.originalContact,170);
 for(const profile of p.PIT_FINISHER_PROFILES_V80){assert.equal(profile.canonical,false);assert.equal(profile.nativeFinisherAnimation,false);assert(profile.sourceFiles.length);
  if(profile.evidence==='attested-equipment')assert(profile.sourceUrls.every(url=>/^https:\/\/(necaonline\.com|store\.necaonline\.com|lumiere-a\.akamaihd\.net)\//.test(url))&&profile.sourceUrls.length);
  if(profile.evidence==='original-contact')assert.deepEqual(profile.equipment,[]);
 }
 assert.equal(p.getPitFinisherProfileV80('unknown'),null);
 assert.equal(p.getPitFinisherProfileV80('jungle-hunter','jungle-hunter-final-duel-v57').family,'blades');
 assert.equal(p.getPitFinisherProfileV80('feral-hunter').family,'bolt');
 assert(!p.getPitFinisherProfileV80('user-stalker-kenner').equipment.includes('smart-disc'));
 assert(!p.getPitFinisherProfileV80('user-assassin').equipment.includes('shoulder-plasma'));
});

test('only real final KO with two won rounds starts; intermediate/draw/timeout/malformed terminals reject',()=>{
 for(const c of terminals){let view=start(c);assert.equal(view.phase,'ready');assert.equal(view.winnerSlot,c.fighters.find(f=>f.roundsWon===2).slot);
  for(const patch of [{phase:'round-over'},{matchWinnerId:null},{lastRoundResult:{...c.lastRoundResult,reason:'timeout'}},{lastRoundResult:{...c.lastRoundResult,round:c.round-1}}])assert.notEqual(start({...c,...patch}).phase,'ready');
  const malformed=structuredClone(c);malformed.fighters.forEach(f=>f.roundsWon=0);assert.equal(start(malformed).outcome,'ineligible');
 }
 // Published legacy replays can contain mirror identities; new V10 bouts cannot.
 const mirror=structuredClone(terminals[1]);mirror.fighters[0].definitionId=mirror.fighters[1].definitionId;assert.equal(start(mirror).winnerSlot,1);
});

test('off, replays, training and stage journeys never add a sequence to historical receipts',()=>{
 for(const patch of [{mode:'off'},{replay:true}])assert.equal(start(terminals[0],patch).outcome,'disabled');
 const training=structuredClone(terminals[0]);training.rules.mode='training';assert.equal(start(training).outcome,'ineligible');
 const journey=structuredClone(terminals[0]);journey.rules.stageJourney='physical-route';assert.equal(start(journey).outcome,'disabled');
});

test('ceremony completes before window, losing slot cannot trigger, repeat input cannot restart',()=>{
 const c=terminals[1];let v=start(c);
 assert.strictEqual(p.advancePitFinisherV80(v,100,false),v);
 v=p.advancePitFinisherV80(v,100,true);assert.equal(v.phase,'window');assert.equal(v.durationMs,5000);
 assert.strictEqual(p.triggerPitFinisherV80(v,0,2),v);
 v=p.triggerPitFinisherV80(v,1,2);assert.equal(v.phase,'approach');assert.equal(v.choice,2);
 assert.strictEqual(p.triggerPitFinisherV80(v,1,0),v);assert.strictEqual(p.observePitFinisherV80(v,c,v.key,options),v);
 v=advance(v,15000);assert.equal(v.phase,'complete');assert.equal(v.outcome,'finished');assert.equal(p.pitFinisherBlocksResultV80(v),false);
});

test('pause/hidden/loading freezes and bounded dt prevent skipping phases after tab suspension',()=>{
 let v=p.advancePitFinisherV80(start(terminals[0]),100,true);v=p.triggerPitFinisherV80(v,0,0);v=advance(v,200);
 assert.strictEqual(p.advancePitFinisherV80(v,60000,true,true),v);
 for(const dt of [0,-1,NaN,Infinity])assert.strictEqual(p.advancePitFinisherV80(v,dt,true),v);
 assert.equal(p.advancePitFinisherV80(v,60000,true).elapsedMs,v.elapsedMs+100);
 const skipped=p.skipPitFinisherV80(v);assert.equal(skipped.outcome,'skipped');assert.strictEqual(p.skipPitFinisherV80(skipped),skipped);
});

test('window timeout/CPU auto presentation and rematch reset remain presentation-only',()=>{
 let v=advance(start(terminals[0]),5100);assert.equal(v.phase,'complete');assert.equal(v.outcome,'skipped');
 v=advance(start(terminals[1],{cpuWinner:true}),900);assert.equal(v.phase,'approach');
 assert.equal(p.observePitFinisherV80(v,p.createPitCombatState('jungle-hunter','city-hunter'),'next',options).phase,'idle');
});

test('four choices produce distinct trajectories for every identity, not four labels on one motion',()=>{
 for(const profile of p.PIT_FINISHER_PROFILES_V80){
  const c=p.createPitCombatState(profile.fighterId,profile.fighterId==='jungle-hunter'?'city-hunter':'jungle-hunter');const before=p.serializePitCombat(c);const trajectories=[];
  for(const choice of [0,1,2,3]){
   const v={...start(terminals[0]),profile,winnerSlot:0,choice,phase:'signature',durationMs:profile.signatureMs};
   const path=[.25,.5,.8,1].map(progress=>p.samplePitFinisherSceneV80({...v,elapsedMs:progress*v.durationMs},c));
   for(const scene of path){assert.equal(scene.nativeAnimationClaimed,false);for(const actor of scene.actors){assert(Number.isFinite(actor.x)&&Number.isFinite(actor.y));const half=p.PIT_FIGHTERS[actor.definitionId].bodyWidth/2;assert(actor.x>=p.PIT_ARENAS[c.arenaId].leftWall+half&&actor.x<=p.PIT_ARENAS[c.arenaId].rightWall-half);assert(actor.y>=0);}}
   trajectories.push(JSON.stringify(path.map(s=>[s.actors.map(a=>[a.x,a.y,a.crouching]),s.rotation])));
  }
  assert.equal(new Set(trajectories).size,4,profile.fighterId);assert.equal(p.serializePitCombat(c),before);
 }
});

test('chronicles/reduced gore disallow lethal arsenal and reduced motion holds both actual body positions',()=>{
 const c=terminals[0],before=p.serializePitCombat(c);
 for(const patch of [{narrative:true},{reducedGore:true}]){
  const v={...start(c,patch),phase:'signature',durationMs:2000,elapsedMs:1000};const scene=p.samplePitFinisherSceneV80(v,c);
  assert.equal(scene.nonlethal,true);assert.equal(scene.family,'capture');
 }
 for(const choice of [0,1,2,3])for(const phase of ['approach','signature','settle']){
  const v={...start(c,{reducedMotion:true}),choice,phase,durationMs:2000,elapsedMs:1500},scene=p.samplePitFinisherSceneV80(v,c);
  assert.deepEqual(scene.actors.map(a=>[a.x,a.y]),c.fighters.map(a=>[a.x,0]));assert.deepEqual(scene.rotation,[0,0]);
 }
 assert.equal(p.serializePitCombat(c),before);
});

test('live accessibility upgrades do not restart, weaken neutralization or change the recorded terminal',()=>{
 const c=terminals[0],v={...start(c),phase:'signature',durationMs:2000,elapsedMs:900},before=p.serializePitCombat(c);
 const safer=p.observePitFinisherV80(v,c,v.key,{...options,reducedGore:true,reducedMotion:true});
 assert.equal(safer.phase,v.phase);assert.equal(safer.elapsedMs,900);assert.equal(safer.nonlethal,true);assert.equal(safer.options.reducedMotion,true);
 assert.strictEqual(p.observePitFinisherV80(safer,c,v.key,options),safer);assert.equal(p.serializePitCombat(c),before);
});

test('render-only approaches interpolate BOTH actors, without engine ticks, teleport or altered receipts',()=>{
 const c=terminals[0],before=p.serializePitCombat(c),v={...start(c),phase:'approach',durationMs:2000,elapsedMs:0};
 const initial=p.samplePitFinisherSceneV80(v,c);assert.deepEqual(initial.actors.map(a=>a.x),c.fighters.map(a=>a.x));
 const last=p.samplePitFinisherSceneV80({...v,elapsedMs:2000},c),middle=p.samplePitFinisherSceneV80({...v,elapsedMs:1000},c);
 for(let i=0;i<2;i++)assert(Math.abs(middle.actors[i].x-(initial.actors[i].x+last.actors[i].x)/2)<1e-9);
 assert.equal(p.serializePitCombat(c),before);
});

test('Canvas owns an independent frozen-clock presentation and keeps receipt/replay engine boundaries untouched',()=>{
 const source=fs.readFileSync('app/game/PitCanvas.tsx','utf8');
 assert.match(source,/advancePitFinisherV80\(finisherRefV80.current, delta, roundPresentationRef.current.resultVisible,[\s\S]{0,100}pausedRef.current \|\| document.hidden/);
 assert.match(source,/finisherV80.key === finisherKeyV80 && finisherV80.phase === 'complete'/);
 assert.match(source,/if \(!combat \|\| playbackReplay \|\| combat.phase !== "match-over"/);
 assert.match(source,/reportedMatchFrameRef.current !== null/);assert.match(source,/Promise.resolve\(\)\.then\(\(\) => onNarrativeComplete/);
 assert.match(source,/const finisherDrawn = finisher \? drawPitFinisherActorsV80/);
 assert.match(source,/\(finisherDrawn \? \[\] : state.fighters\)/);
 const engine=fs.readFileSync('app/game/systems/pitCombat.ts','utf8'),replay=fs.readFileSync('app/game/systems/pitReplay.ts','utf8');
 assert(!engine.includes('FinisherV80'));assert(!replay.includes('FinisherV80'));
});

test('assigned-controller edges are fenced by neutral, hotplug revision, winner slot, pause and CPU ownership',()=>{
 const view={...start(terminals[0]),phase:'window'},sample={present:true,revision:1,buttons:[false,false,false,false],neutral:true,down:false,horizontal:0};
 let pad=p.createPitFinisherPadStateV80();pad=p.readPitFinisherPadV80(pad,sample,0,view,1,true).next;
 const press={...sample,neutral:false,buttons:[true,false,false,false]};let action=p.readPitFinisherPadV80(pad,press,0,view,1,true);assert.equal(action.choice,0);
 assert.equal(p.readPitFinisherPadV80(action.next,press,0,view,1,true).choice,null);
 for(const horizontal of [-1,1])assert.equal(p.readPitFinisherPadV80(pad,{...press,horizontal},0,view,1,true).choice,horizontal===1?2:3);
 assert.equal(p.readPitFinisherPadV80(pad,{...press,down:true},0,view,1,true).choice,1);
 assert.equal(p.readPitFinisherPadV80(pad,press,1,view,1,true).choice,null);
 assert.equal(p.readPitFinisherPadV80(pad,press,0,view,1,false).choice,null);
 assert.equal(p.readPitFinisherPadV80(pad,press,0,{...view,options:{...options,cpuWinner:true}},1,true).choice,null);
 action=p.readPitFinisherPadV80(pad,{...press,revision:2},0,view,1,true);assert.equal(action.choice,null);assert.equal(action.next.ready,false);
 action=p.readPitFinisherPadV80(action.next,{...sample,revision:2},0,view,1,true);assert.equal(action.next.ready,true);
 assert.equal(p.readPitFinisherPadV80(action.next,{...press,revision:2},0,view,1,true).choice,0);
 assert.equal(p.readPitFinisherPadV80(pad,{...sample,buttons:[false,true,false,false],neutral:false},1,view,1,true).skip,true);
 assert.equal(p.readPitFinisherPadV80(pad,{...sample,buttons:[false,false,false,true],neutral:false},1,view,1,true).pause,true);
});
