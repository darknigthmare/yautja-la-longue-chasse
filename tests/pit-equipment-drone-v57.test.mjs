import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:['pitCombat','pitReplay','pitTraining','pitEquipmentV57','pitFalconerDrone','pitUserRoster'].map(m=>`export * from './app/game/systems/${m}';`).join('\n'),resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const p=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
function tick(state,count=1,inputs=[{},{}]) {
  for(let i=0;i<count;i++) {
    state=p.stepPitCombat(state,inputs);
    assert.deepEqual(p.deserializePitCombat(p.serializePitCombat(state)),state);
  }
  return state;
}
function setup(id='falconer',reversed=false) {
  const s=p.createPitCombatState(id,id==='falconer'?'jungle-hunter':'berserker',{mode:'training'});
  s.fighters[0].x=reversed?800:160;s.fighters[1].x=reversed?160:800;
  s.fighters[0].facing=reversed?-1:1;s.fighters[1].facing=reversed?1:-1;
  return s;
}
function launch(s=setup()) {return tick(tick(s,1,[{attack:'technique'},{}]),p.PIT_FIGHTERS.falconer.attacks.technique.startup);}

test('only the explicit final-duel costume disables Jungle plasma; unmasked and other incarnations remain unchanged',()=>{
  const variants=[undefined,...p.getPitFighterVariants('jungle-hunter').map(x=>x.id)];
  for(const variant of variants) {
    const s=p.createPitCombatState('jungle-hunter','berserker',{mode:'training',variants:[variant??null,null]});
    const final=variant===p.PIT_JUNGLE_FINAL_DUEL_VARIANT;
    const next=tick(tick(s,1,[{attack:'technique'},{}]),p.PIT_FIGHTERS['jungle-hunter'].attacks.technique.startup);
    assert.equal(next.techniqueEffects.length,final?0:1,variant);
    assert.equal(Boolean(p.pitTechniqueUnavailableReason('jungle-hunter',variant)),final);
    if(final){assert.equal(next.fighters[0].action,null);assert.equal(next.fighters[0].traque,tick(s,1+p.PIT_FIGHTERS['jungle-hunter'].attacks.technique.startup).fighters[0].traque);}
  }
  assert.equal(p.pitTechniqueUnavailableReason('wolf','wolf-sans-casque-cd5b844506'),null);
});

test('final-duel melee remains usable, and forged plasma state/effect is refused',()=>{
  const s=p.createPitCombatState('jungle-hunter','berserker',{mode:'training',variants:[p.PIT_JUNGLE_FINAL_DUEL_VARIANT,null]});
  const next=tick(s,1,[{attack:'light'},{}]);assert.equal(next.fighters[0].action.attack,'light');
  const forged=structuredClone(next);forged.fighters[0].action.attack='technique';
  assert.throws(()=>p.deserializePitCombat(JSON.stringify(forged)));
  let armed=setup('jungle-hunter');armed=tick(tick(armed,1,[{attack:'technique'},{}]),18);
  armed.fighters[0].variantId=p.PIT_JUNGLE_FINAL_DUEL_VARIANT;
  assert.throws(()=>p.deserializePitCombat(JSON.stringify(armed)));
});

test('explicit equipment survives round, rematch, reset and current input replay without a campaign grant',()=>{
  const options={fighters:['jungle-hunter','berserker'],rules:{mode:'training'},variants:[p.PIT_JUNGLE_FINAL_DUEL_VARIANT,null]};
  const inputs=Array.from({length:100},(_,i)=>[{attack:i%35===0?'technique':undefined},{}]);
  const replay=p.recordPitReplay(inputs,options);assert.equal(replay.engineVersion,p.PIT_STATE_VERSION);
  const final=p.playPitReplay(replay);assert.equal(final.techniqueEffects.length,0);
  for(const reset of [p.rematchPitCombat,p.resetPitTrainingPositions])assert.equal(reset(final).fighters[0].variantId,p.PIT_JUNGLE_FINAL_DUEL_VARIANT);
  assert.equal(p.normalizePitReplay({...replay,engineVersion:7}),null);
  let round=p.createPitCombatState(...options.fighters,{variants:options.variants});round.roundFramesRemaining=1;
  round=tick(round,1+p.PIT_ROUND_TRANSITION_FRAMES);assert.equal(round.fighters[0].variantId,p.PIT_JUNGLE_FINAL_DUEL_VARIANT);
});

test('Falconer calls and recalls one identical sensor in both directions, without a fresh id',()=>{
  for(const reversed of [false,true]) {
    let s=launch(setup('falconer',reversed));const id=s.techniqueEffects[0].id;
    s=tick(s,28);s=tick(s,1,[{attack:'technique'},{}]);s=tick(s,10);
    assert.equal(s.techniqueEffects.length,1);assert.equal(s.techniqueEffects[0].id,id);
    assert.equal(s.techniqueEffects[0].phase,'returning');assert.equal(s.nextTechniqueEffectId,id+1);
    s=tick(s,180);assert.equal(s.techniqueEffects.length,0);
  }
});

test('scan marks once, does zero damage or guard damage, and return cannot mark a second time',()=>{
  for(const guarding of [false,true]) {
    let s=setup();s.fighters[1].x=380;
    const passiveOnly=structuredClone(s);
    const hp=s.fighters[1].health,events=[];s=launch(s);let id,returned=false,previousStatus=0;
    for(let i=0;i<140;i++) {
      s=tick(s,1,[{},guarding?{guardHigh:true}:{}]);events.push(...s.events);
      const e=s.techniqueEffects[0];
      if(e?.hitCount===1){id=e.id;returned=true;assert.equal(e.phase,'returning');}
      if(id&&e)assert.equal(e.id,id);
      const remaining=s.fighters[1].techniqueStatus?.framesRemaining??0;
      if(previousStatus>0)assert(remaining<previousStatus,'return must not refresh the mark');
      previousStatus=remaining;
    }
    assert(returned);assert.equal(s.fighters[1].health,hp);
    assert.equal(events.filter(e=>['hit','block'].includes(e.type)).length,0);
    assert.equal(s.fighters[1].stunFrames,0);assert.equal(s.fighters[1].comboHitsReceived,0);
    const passiveFinal=tick(passiveOnly,s.frame);
    assert.deepEqual(s.fighters.map(f=>f.traque),passiveFinal.fighters.map(f=>f.traque),'scan and return earn no resource beyond passive pressure');
    assert(events.filter(e=>e.type==='traque-gain').every(e=>e.source==='pressure'));
  }
});

test('sensor returns after its patrol deadline and a real strike interrupts its telegraph',()=>{
  let s=launch();s=tick(s,72);assert.equal(s.techniqueEffects[0].phase,'returning');s=tick(s,180);assert.equal(s.techniqueEffects.length,0);
  s=setup();s.fighters[1].x=230;s=launch(s);
  s=tick(s,1,[{},{attack:'light'}]);let recalled=false;
  for(let i=0;i<25;i++){s=tick(s);recalled||=s.techniqueEffects.some(e=>e.phase==='returning');}
  assert(recalled);assert.equal(s.fighters[1].techniqueStatus,null);
});

test('KO and round end stop the drone; no duplicated or spent attacking sensor state is accepted',()=>{
  let s=launch();const duplicate=structuredClone(s);duplicate.techniqueEffects.push({...duplicate.techniqueEffects[0],id:2});duplicate.nextTechniqueEffectId=3;
  assert.throws(()=>p.deserializePitCombat(JSON.stringify(duplicate)));
  const spent=structuredClone(s);spent.techniqueEffects[0].phase='active';spent.techniqueEffects[0].age=12;spent.techniqueEffects[0].hitCount=1;
  assert.throws(()=>p.deserializePitCombat(JSON.stringify(spent)));
  s=tick(s,28);s.fighters[0].health=1;s.fighters[1].x=s.fighters[0].x+65;
  s=tick(s,1,[{},{attack:'heavy'}]);for(let i=0;i<30&&s.fighters[0].health;i++)s=tick(s);
  assert.equal(s.fighters[0].health,0);assert.equal(s.techniqueEffects.length,0);
  s=launch(p.createPitCombatState('falconer','jungle-hunter'));s.roundFramesRemaining=1;s=tick(s);assert.equal(s.techniqueEffects.length,0);
});

test('published V7 Falconer archive retains its pre-change checksum and source bytes',()=>{
  const file='tests/fixtures/pit-replay-v56-falconer-v7.json',bytes=fs.readFileSync(file,'utf8'),fixture=JSON.parse(bytes);
  assert.equal(fixture.metadata.checksum,'823e993e');assert.equal(fixture.engineVersion,7);
  const replay=p.normalizePitReplay(fixture);assert(replay);assert.equal(replay.metadata.checksum,'823e993e');
  assert.equal(p.playPitReplay(replay).version,p.PIT_STATE_VERSION);assert.equal(fs.readFileSync(file,'utf8'),bytes);
});

test('current sensor replay is deterministic across outbound, scan, recall and disappearance',()=>{
  const inputs=Array.from({length:260},(_,i)=>[{attack:i%35===0?'technique':undefined},{}]);
  const options={fighters:['falconer','jungle-hunter'],rules:{mode:'training'},seed:77};
  const replay=p.recordPitReplay(inputs,options);
  const direct=inputs.reduce((s,input)=>tick(s,1,input),p.createPitCombatState(...options.fighters,options.rules));
  assert.deepEqual(p.playPitReplay(p.deserializePitReplay(p.serializePitReplay(replay))),direct);
});

test('resuming a V7 combat snapshot consolidates its old simultaneous sensors without rewriting input archives',()=>{
  let state=setup();
  for(let i=0;i<50;i++)state=p.stepPitCombatV7Compatibility(state,[{attack:i%35===0?'technique':undefined},{}]);
  assert.equal(state.techniqueEffects.length,2);
  const serialized=JSON.stringify({...state,version:7}),snapshot=p.deserializePitCombat(serialized);
  assert.equal(snapshot.techniqueEffects.length,1);
  assert.equal(snapshot.techniqueEffects[0].id,state.techniqueEffects[0].id);
  assert.equal(snapshot.techniqueEffects[0].techniqueId,p.PIT_FALCONER_RECON_DRONE.id);
  assert.deepEqual(snapshot.fighters,state.fighters);
  assert.doesNotThrow(()=>tick(snapshot,200));
});
