import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { build } from 'esbuild';

const bundle = await build({stdin:{contents:['pitCombat','pitReplay','pitFeralBoltsV58','pitUserRoster'].map(m=>`export * from './app/game/systems/${m}';`).join('\n'),resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const p = await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
function setup(variant=null,reversed=false) {
  const s=p.createPitCombatState('feral-hunter','jungle-hunter',{mode:'training',variants:[variant,null]});
  s.fighters[0].x=reversed?790:160;s.fighters[1].x=reversed?160:790;
  s.fighters[0].facing=reversed?-1:1;s.fighters[1].facing=reversed?1:-1;
  return s;
}
function tick(s,count=1,inputs=[{},{}],step=p.stepPitCombat) {
  for(let i=0;i<count;i++) {
    s=step(s,inputs);
    assert.deepEqual(p.deserializePitCombat(p.serializePitCombat(s)),s);
  }
  return s;
}
function launch(s=setup(),defender={}) {
  return tick(tick(s,1,[{attack:'technique'},defender]),p.PIT_FIGHTERS['feral-hunter'].attacks.technique.startup,[{},defender]);
}

test('Feral launches three individual physical bolts in either direction, not a stationary floor trap',()=>{
  for(const reversed of [false,true]) {
    const s=launch(setup(null,reversed));
    assert.equal(s.techniqueEffects.length,3);
    assert.deepEqual(s.techniqueEffects.map(e=>e.bolt.index),[0,1,2]);
    assert.equal(new Set(s.techniqueEffects.map(e=>e.id)).size,3);
    assert.equal(new Set(s.techniqueEffects.map(e=>e.bolt.volleyId)).size,1);
    for(const e of s.techniqueEffects) {
      assert.equal(e.techniqueId,p.PIT_FERAL_GUIDED_BOLTS.id);
      assert.equal(e.bolt.guided,true);assert(e.y>0);
      assert.equal(Math.sign(e.bolt.velocityX),reversed?-1:1);
    }
    const next=tick(s);
    next.techniqueEffects.forEach((e,i)=>assert.notEqual(e.x,s.techniqueEffects[i].x));
    assert.equal(p.PIT_FERAL_GUIDED_BOLTS.status,null);
    assert.equal(p.PIT_FERAL_GUIDED_BOLTS.jumpLocked,false);
  }
});

test('the acquisition point and each flight vector stay fixed when the target moves and jumps',()=>{
  let s=launch();const flights=s.techniqueEffects.map(e=>structuredClone(e.bolt));
  for(let i=0;i<15;i++) {
    s=tick(s,1,[{},{left:true,jump:i===0}]);
    assert.equal(s.techniqueEffects.length,3);
    s.techniqueEffects.forEach((e,index)=>assert.deepEqual(e.bolt,flights[index]));
  }
  assert(s.fighters[1].y>0);
  assert.notEqual(s.fighters[1].x,flights[0].targetX);
});

test('only explicit unmasked Feral variants lose guided acquisition; no borrowed label heuristics',()=>{
  for(const variant of [undefined,...p.getPitFighterVariants('feral-hunter').map(v=>v.id)]) {
    let s=setup(variant);s.fighters[1].grounded=false;s.fighters[1].y=110;s.fighters[1].velocityY=0;
    s=launch(s);
    const masked=!p.PIT_FERAL_UNMASKED_VARIANTS.includes(variant);
    s.techniqueEffects.forEach(e=>{
      assert.equal(e.bolt.guided,masked,variant);
      if(masked) assert.notEqual(e.bolt.velocityY,0); else assert.equal(e.bolt.velocityY,0);
    });
  }
  assert.equal(p.pitFeralHasTargetingMask('invented-sans-casque-label'),true);
});

test('three bolts can strike at most once each and never pin, paralyse or disable jumping',()=>{
  let s=launch();const events=[];const initialHealth=s.fighters[1].health;
  for(let i=0;i<110;i++){s=tick(s);events.push(...s.events);assert.equal(s.fighters[1].techniqueStatus,null);}
  const hits=events.filter(e=>e.type==='hit'&&e.attackerId==='feral-hunter');
  assert.equal(hits.length,3);assert(s.fighters[1].health<initialHealth);
  assert.equal(s.techniqueEffects.length,0);
  s=tick(s,1,[{},{jump:true}]);assert.equal(s.fighters[1].grounded,false);
});

test('both standing and crouching guard block this mid-level volley; a jump after launch evades it',()=>{
  for(const guard of [{guardHigh:true},{guardLow:true,down:true}]) {
    let s=launch(setup(),guard),blocks=0;
    for(let i=0;i<105;i++){s=tick(s,1,[{},guard]);blocks+=s.events.filter(e=>e.type==='block').length;}
    assert.equal(blocks,3);
    assert(s.fighters[1].health>=970,'only chip damage');
  }
  let s=launch();const hp=s.fighters[1].health;
  for(let i=0;i<65;i++)s=tick(s,1,[{},{jump:i===25}]);
  assert.equal(s.fighters[1].health,hp);
});

test('fixed upward acquisition misses after the target drops; stray bolts expire out of the arena',()=>{
  const initial=setup();initial.fighters[1].grounded=false;initial.fighters[1].y=120;initial.fighters[1].velocityY=0;
  let s=launch(initial);const hp=s.fighters[1].health;
  s=tick(s,120);assert.equal(s.techniqueEffects.length,0);assert.equal(s.fighters[1].health,hp);
});

test('an airborne Feral volley starts at the owner altitude and stays deterministic across restoration',()=>{
  let s=tick(setup(),1,[{jump:true},{}]);s=launch(s);
  assert(s.techniqueEffects.every(e=>e.y>p.PIT_FERAL_GUIDED_BOLTS.verticalOffset));
  let restored=p.deserializePitCombat(p.serializePitCombat(s));
  for(let i=0;i<100;i++){const inputs=[{left:i<25},{jump:i===10}];s=tick(s,1,inputs);restored=tick(restored,1,inputs);}
  assert.deepEqual(restored,s);
});

test('malformed velocity, identity and unmasked tracking snapshots are rejected',()=>{
  const original=launch();
  for(const mutate of [
    s=>{s.techniqueEffects[0].bolt.velocityX=999;},
    s=>{s.techniqueEffects[0].bolt.targetY=NaN;},
    s=>{s.techniqueEffects[0].bolt.index=2;},
    s=>{delete s.techniqueEffects[0].bolt;},
    s=>{s.fighters[0].variantId=p.PIT_FERAL_UNMASKED_VARIANTS[0];},
    s=>{s.version=8;},
  ]) {const bad=structuredClone(original);mutate(bad);assert.throws(()=>p.deserializePitCombat(JSON.stringify(bad)));}
});

test('round and rematch discard all airborne bolts without touching campaign state',()=>{
  let s=launch();s.rules.mode='match';s.roundFramesRemaining=1;s=tick(s);
  assert.equal(s.phase,'round-over');assert.equal(s.techniqueEffects.length,0);
  assert.equal(p.rematchPitCombat(s).techniqueEffects.length,0);
});

test('a damaging V8 fixture captured before this change retains its original checksum and health',()=>{
  const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/pit-replay-v57-feral-v8.json',import.meta.url),'utf8'));
  assert.equal(fixture.engineVersion,8);assert.equal(fixture.metadata.checksum,'5733ca4f');
  const normalized=p.normalizePitReplay(fixture);assert(normalized);
  const final=p.playPitReplay(normalized);assert.deepEqual(final.fighters.map(f=>f.health),[960,782]);
  assert.equal(final.techniqueEffects.some(e=>e.bolt),false);
});

test('old active traps survive snapshot migration unchanged until expiry; future input uses the new volley',()=>{
  let s=tick(tick(setup(),1,[{attack:'technique'},{}],p.stepPitCombatV8Compatibility),10,[{},{}],p.stepPitCombatV8Compatibility);
  assert.equal(s.techniqueEffects[0].techniqueId,p.PIT_FERAL_LEGACY_TRAP.id);
  const effect=structuredClone(s.techniqueEffects[0]);
  s=p.deserializePitCombat(JSON.stringify({...s,version:8}));assert.deepEqual(s.techniqueEffects[0],effect);
  s=tick(s,35);s=launch(s);
  assert(s.techniqueEffects.some(e=>e.techniqueId===p.PIT_FERAL_LEGACY_TRAP.id));
  assert.equal(s.techniqueEffects.filter(e=>e.bolt).length,3);
  s=tick(s,200);assert.equal(s.techniqueEffects.length,0);
});

test('Current replay recording and playback preserve masked and unmasked salvos',()=>{
  for(const variant of [null,p.PIT_FERAL_UNMASKED_VARIANTS[0]]) {
    const inputs=Array.from({length:160},(_,i)=>[{attack:i%40===0?'technique':undefined},{left:i<70,jump:i===95}]);
    const replay=p.recordPitReplay(inputs,{fighters:['feral-hunter','jungle-hunter'],variants:[variant,null],rules:{mode:'training'},seed:19});
    assert.equal(replay.engineVersion,10);
    assert.deepEqual(p.playPitReplay(replay),p.playPitReplay(p.normalizePitReplay(JSON.parse(p.serializePitReplay(replay)))));
  }
});
