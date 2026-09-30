import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { build } from 'esbuild';

const bundle = await build({ stdin: { contents: ['pitCombat','pitReplay','pitFeralBoltsV58','pitFeralMuzzleV59']
  .map(name => `export * from './app/game/systems/${name}';`).join('\n') + "\nexport * from './app/game/hunterSpriteMotion';", resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'esm', write: false });
const p = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

function setup({ facing = 1, slot = 0, gap = 420, variant = null, corner = false } = {}) {
  const ids = slot === 0 ? ['feral-hunter', 'jungle-hunter'] : ['jungle-hunter', 'feral-hunter'];
  const s = p.createPitCombatState(...ids, { mode: 'training', variants: slot ? [null,variant] : [variant,null] });
  const owner = s.fighters[slot], target = s.fighters[1-slot];
  owner.x = facing === 1 ? 250 : 750;
  target.x = owner.x + facing * gap;
  if (corner) { target.x = facing === 1 ? p.PIT_ARENA.rightWall - 30 : p.PIT_ARENA.leftWall + 30; owner.x = target.x - facing * gap; }
  owner.facing = facing; target.facing = -facing;
  return s;
}
function tick(s, count=1, inputs=[{},{}], step=p.stepPitCombat) {
  for (let i=0; i<count; i++) {
    s = step(s,inputs);
    assert.deepEqual(p.deserializePitCombat(p.serializePitCombat(s)),s);
  }
  return s;
}
function fire(s, {slot=0, targetInput={}, ownerInput={}, step=p.stepPitCombat}={}) {
  const inputs = slot ? [targetInput,{...ownerInput,attack:'technique'}] : [{...ownerInput,attack:'technique'},targetInput];
  const hold = slot ? [targetInput,ownerInput] : [ownerInput,targetInput];
  return tick(tick(s,1,inputs,step),p.PIT_FIGHTERS['feral-hunter'].attacks.technique.startup,hold,step);
}
const approx = (a,b) => assert(Math.abs(a-b)<1e-8, `${a} differs from ${b}`);
function withoutLaunchPresentation(state) {
  const result=structuredClone(state);
  for(const fighter of result.fighters) if(fighter.action) delete fighter.action.feralLauncherOrigin;
  return result;
}

test('default standing Feral fires from each independently measured barrel, in both player slots',()=>{
  for (const facing of [1,-1]) for (const slot of [0,1]) {
    const s=fire(setup({facing,slot}),{slot});
    const owner=s.fighters[slot], muzzle=p.getPitFeralNativeMuzzle(owner,119);
    assert.equal(s.techniqueEffects.length,3);
    s.techniqueEffects.forEach((effect,index)=>{
      // Undo precisely one simulation tick, rather than hiding a render offset.
      approx(effect.x+11-effect.bolt.velocityX,muzzle.x);
      approx(effect.y+2.5-effect.bolt.velocityY,muzzle.y+(index-1)*muzzle.railSpacing);
      assert.equal(effect.direction,facing);
      assert.equal(Math.sign(effect.bolt.velocityX),facing);
      assert(Math.abs(effect.x+11-owner.x)>110,'not the old body-centered origin');
    });
  }
});

test('point-blank opponents inside the barrel are hit once per bolt, not skipped in either facing or corner',()=>{
  for (const facing of [1,-1]) for (const slot of [0,1]) for (const corner of [false,true]) {
    let s=fire(setup({facing,slot,gap:66,corner}),{slot});
    assert.equal(s.events.filter(e=>e.type==='hit').length,3);
    assert.equal(s.techniqueEffects.length,0);
    const health=s.fighters[1-slot].health;
    assert(health< p.PIT_FIGHTERS['jungle-hunter'].maxHealth);
    s=tick(s,60); assert.equal(s.fighters[1-slot].health,health,'no second launch contact');
  }
});

test('launch sweeps obey standing/crouching guards and retain chip-only damage',()=>{
  for (const facing of [1,-1]) for (const guard of [{guardHigh:true},{guardLow:true,down:true}]) {
    const s=fire(setup({facing,gap:66}),{targetInput:guard});
    assert.equal(s.events.filter(e=>e.type==='block').length,3);
    assert.equal(s.events.filter(e=>e.type==='hit').length,0);
    assert(s.fighters[1].health>=970); assert.equal(s.techniqueEffects.length,0);
  }
});

test('invulnerability prevents launch contacts and close acquisition never sends a bolt backward',()=>{
  for (const facing of [1,-1]) {
    let s=setup({facing,gap:66});
    s.fighters[1].wakeInvulnerabilityFrames=40;
    const health=s.fighters[1].health;
    s=fire(s); assert.equal(s.fighters[1].health,health);
    assert.equal(s.techniqueEffects.length,3);
    for (const e of s.techniqueEffects) {
      assert.equal(Math.sign(e.bolt.velocityX),facing);
      assert.equal(e.bolt.velocityY,0);
      assert.equal(e.direction,facing);
    }
    s=tick(s,100); assert.equal(s.fighters[1].health,health);
  }
});

test('a jumping opponent above the launch segment is not hit through empty diagonal space',()=>{
  for (const facing of [1,-1]) {
    const initial=setup({facing,gap:66});
    initial.fighters[1].grounded=false; initial.fighters[1].y=190;
    const s=fire(initial);
    assert(s.fighters[1].y>100);
    assert.equal(s.fighters[1].health,initial.fighters[1].health);
    assert.equal(s.events.filter(e=>e.type==='hit').length,0);
  }
  // A broad bounding rectangle would falsely include this off-path corner.
  const start={x:0,y:0,width:2,height:2}, end={...start,x:100,y:100};
  assert.equal(p.pitFeralLaunchSweepTouches(start,end,{x:0,y:90,width:5,height:5}),false);
  assert.equal(p.pitFeralLaunchSweepTouches(start,end,{x:49,y:49,width:5,height:5}),true);
});

test('far salvos keep their acquired vectors when the target moves, and restoration is deterministic',()=>{
  for (const facing of [1,-1]) {
    let s=fire(setup({facing})), restored=p.deserializePitCombat(p.serializePitCombat(s));
    const flights=s.techniqueEffects.map(e=>structuredClone(e.bolt));
    for(let i=0;i<14;i++) {
      const inputs=[{}, {left:facing===1,right:facing===-1,jump:i===0}];
      s=tick(s,1,inputs);restored=tick(restored,1,inputs);
      assert.deepEqual(s,restored);assert.equal(s.techniqueEffects.length,3);
      s.techniqueEffects.forEach((e,index)=>assert.deepEqual(e.bolt,flights[index]));
    }
  }
});

test('other costumes, crouching and airborne firing keep V9 geometry and physics',()=>{
  for (const facing of [1,-1]) for (const posture of ['variant','crouch','air']) {
    let initial=setup({facing,variant:posture==='variant'?'feral-avec-casque-b99fbf82fe':null});
    if (posture==='air') { initial.fighters[0].grounded=false;initial.fighters[0].y=160; }
    const ownerInput=posture==='crouch'?{down:true}:{};
    const current=fire(initial,{ownerInput});
    const previous=fire(structuredClone(initial),{ownerInput,step:p.stepPitCombatV9Compatibility});
    assert.deepEqual(withoutLaunchPresentation(current),previous,posture);
    assert.equal(current.techniqueEffects.length,3);
  }
});

test('crouch release and an airborne attack landing before firing use the same posture as the visible clip',()=>{
  const initial=setup();
  let crouched=tick(initial,1,[{down:true,attack:'technique'},{}]);
  let old=structuredClone(crouched);
  crouched=tick(crouched,9,[{},{}]);
  old=tick(old,9,[{},{}],p.stepPitCombatV9Compatibility);
  assert.equal(crouched.fighters[0].crouching,true,'posture is held by the active action');
  assert.equal(p.describePitCombatHunterSpriteMotion(crouched,0).posture,'crouch');
  assert.equal(p.pitFeralUsesNativeLauncher(crouched.fighters[0]),false);
  assert.deepEqual(withoutLaunchPresentation(crouched),old);

  const airborne=setup(); airborne.fighters[0].grounded=false;
  airborne.fighters[0].y=12;airborne.fighters[0].velocityY=-1;
  const landed=fire(airborne);
  const motion=p.describePitCombatHunterSpriteMotion(landed,0);
  assert.equal(landed.fighters[0].grounded,true);
  assert.equal(motion.clipId,'pit.stand.technique.feral-guided-bolts-v58.active');
  assert.equal(p.pitFeralUsesNativeLauncher(landed.fighters[0]),true);
  assert.equal(landed.fighters[0].action.feralLauncherOrigin,'native');
  const muzzle=p.getPitFeralNativeMuzzle(landed.fighters[0],119);
  landed.techniqueEffects.forEach(e=>approx(e.x+11-e.bolt.velocityX,muzzle.x));
});

test('active V9 snapshot projectiles keep every position and flight field through migration',()=>{
  let previous=fire(setup(),{step:p.stepPitCombatV9Compatibility});
  const legacy=JSON.parse(p.serializePitCombat(previous)); legacy.version=9;
  let current=p.deserializePitCombat(JSON.stringify(legacy));
  assert.deepEqual(current.techniqueEffects,previous.techniqueEffects);
  for(let i=0;i<90;i++) {
    current=tick(current);previous=tick(previous,1,[{},{}],p.stepPitCombatV9Compatibility);
    assert.deepEqual(withoutLaunchPresentation(current),previous);
  }
});

test('a shot fired in the air retains its launch origin after landing, restoration and disappearance of all bolts',()=>{
  for(const facing of [1,-1]) {
    const initial=setup({facing,gap:66});
    initial.fighters[0].grounded=false;initial.fighters[0].y=45;
    let s=fire(initial);
    assert.equal(s.fighters[0].grounded,false);
    assert.equal(s.fighters[0].action.feralLauncherOrigin,'legacy');
    assert.equal(s.techniqueEffects.length,0,'all bolts hit before the landing');
    let restored=p.deserializePitCombat(p.serializePitCombat(s));
    const health=s.fighters[1].health;
    for(let i=0;i<20;i++) {
      s=tick(s); restored=tick(restored);
      assert.deepEqual(restored,s);
      assert.equal(s.fighters[0].grounded,true);
      assert.equal(s.fighters[0].action.feralLauncherOrigin,'legacy');
      assert.equal(s.fighters[1].health,health);
    }
  }
});

test('launch provenance rejects foreign actions and forged pre-V10 snapshots',()=>{
  const original=fire(setup());
  for(const mutate of [
    s=>{s.version=9;},
    s=>{s.fighters[0].action.feralLauncherOrigin='invented';},
    s=>{s.fighters[0].variantId='feral-avec-casque-b99fbf82fe';},
    s=>{s.fighters[0].grounded=false;s.fighters[0].y=20;},
    s=>{s.fighters[0].action.attack='heavy';},
  ]) {const bad=structuredClone(original);mutate(bad);assert.throws(()=>p.deserializePitCombat(JSON.stringify(bad)));}
});

test('pre-change V9 replay preserves the independently captured checksum and damage',()=>{
  const file=new URL('./fixtures/pit-replay-v58-feral-v9.json',import.meta.url);
  const bytes=fs.readFileSync(file,'utf8'), fixture=JSON.parse(bytes);
  assert.equal(fixture.engineVersion,9);assert.equal(fixture.metadata.checksum,'b3244626');
  const normalized=p.normalizePitReplay(fixture);assert(normalized);
  const final=p.playPitReplay(normalized);
  assert.deepEqual(final.fighters.map(f=>f.health),[960,438]);
  assert.equal(final.frame,360);assert.equal(fs.readFileSync(file,'utf8'),bytes);
});

test('V10 recording and playback retain muzzle salvos without serializing an invisible collision extension',()=>{
  const inputs=Array.from({length:200},(_,i)=>[{right:i<40,attack:i%45===0?'technique':undefined},{left:i<40,guardHigh:i>100}]);
  const replay=p.recordPitReplay(inputs,{fighters:['feral-hunter','jungle-hunter'],rules:{mode:'training'},seed:59});
  assert.equal(replay.engineVersion,10);
  assert.deepEqual(p.playPitReplay(replay),p.playPitReplay(p.deserializePitReplay(p.serializePitReplay(replay))));
  const state=fire(setup());
  assert(!p.serializePitCombat(state).includes('launchSweep'));
});
