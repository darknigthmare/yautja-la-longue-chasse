import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import { build } from "esbuild";
const bundle=await build({stdin:{contents:[
 'export * from "./app/game/systems/pitCombat";',
 'export * from "./app/game/systems/pitReplay";',
 'export * from "./app/game/systems/pitTrainingLessons";',
 'export * from "./app/game/systems/pitTrainingClock";',
].join("\n"),resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,platform:"node",format:"esm"});
const p=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const neutral=[{},{}];
const tick=(s,inputs=neutral,n=1)=>{for(let i=0;i<n;i++)s=p.stepPitCombat(s,inputs);return s;};
function close(mode="training"){
 const s=p.createPitCombatState("jungle-hunter","berserker",{mode});
 s.fighters[0].x=380;s.fighters[1].x=438;return s;
}
function caught(attacker=0,defenderInput={}){
 const inputs=attacker===0?[{throw:true},defenderInput]:[defenderInput,{throw:true}];
 let s=tick(close(),inputs);
 const release=attacker===0?[{},defenderInput]:[defenderInput,{}];
 for(let i=0;i<20&&!s.pendingThrow;i++)s=tick(s,release);
 assert(s.pendingThrow,"grounded neutral victim must be captured");
 assert.equal(s.pendingThrow.attackerSlot,attacker);return s;
}
test("capture opens eight 60Hz ticks without damage or resource rewards",()=>{
 const s=caught();assert.equal(s.pendingThrow.framesRemaining,8);
 assert.equal(p.PIT_THROW_TECH_WINDOW_FRAMES,8);
 assert.deepEqual(s.fighters.map(f=>f.health),[1000,1040]);
 assert.deepEqual(s.fighters.map(f=>f.traque),[0,0]);
 assert(s.events.some(e=>e.type==="throw-caught"));
 const seven=tick(s,neutral,7);assert.equal(seven.pendingThrow.framesRemaining,1);
 assert.equal(seven.fighters[1].health,1040);
 const expired=tick(seven);assert.equal(expired.pendingThrow,null);
 assert.equal(expired.fighters[1].health,935);assert.equal(expired.fighters[1].phase,"knockdown");
 assert(expired.events.some(e=>e.type==="hit"&&e.attack==="throw"));
});
test("fresh input succeeds on the first and final window ticks for either slot",()=>{
 for(const attacker of [0,1])for(const delay of [0,7]){
  let s=caught(attacker);const health=s.fighters.map(f=>f.health),distance=Math.abs(s.fighters[0].x-s.fighters[1].x);
  s=tick(s,neutral,delay);s=tick(s,attacker===0?[{},{throw:true}]:[{throw:true},{}]);
  assert.equal(s.pendingThrow,null);assert.deepEqual(s.fighters.map(f=>f.health),health);
  assert(s.events.some(e=>e.type==="throw-tech"&&e.defenderId===s.fighters[1-attacker].definitionId));
  assert.deepEqual(s.fighters.map(f=>f.stunFrames),[12,12]);assert.deepEqual(s.fighters.map(f=>f.traque),[0,0]);
  assert(Math.abs(s.fighters[0].x-s.fighters[1].x)>distance);
 }
});
test("holding Projection is not a tech; release and new press are required",()=>{
 let held=caught(0,{guardHigh:true,throw:true});
 held=tick(held,[{},{throw:true}],8);assert.equal(held.fighters[1].health,935);
 const tooLate=tick(held,[{},{}]);const late=tick(tooLate,[{},{throw:true}]);
 assert(!late.events.some(e=>e.type==="throw-tech"));assert.equal(late.fighters[1].health,935);
 let released=caught(0,{guardHigh:true,throw:true});released=tick(released);
 const success=tick(released,[{},{throw:true}]);assert(success.events.some(e=>e.type==="throw-tech"));
});
test("capture input edges do not auto-attack, jump or spend Traque after release",()=>{
 let s=caught();s.fighters[1].traque=500;
 s=tick(s,[{},{throw:true,jump:true,attack:"heavy",resource:true}]);
 s=tick(s,[{},{throw:true,jump:true,attack:"heavy",resource:true}],20);
 assert.equal(s.fighters[1].phase,"idle");assert.equal(s.fighters[1].grounded,true);
 assert.equal(s.fighters[1].action,null);assert.equal(s.fighters[1].traque,500);
});
test("simultaneous active throws break symmetrically instead of preferring player one",()=>{
 let s=tick(close(),[{throw:true},{throw:true}]);s=tick(s,neutral,7);
 assert.equal(s.pendingThrow,null);assert.equal(s.events.filter(e=>e.type==="throw-tech").length,1);
 assert.deepEqual(s.fighters.map(f=>f.health),[1000,1040]);assert.deepEqual(s.fighters.map(f=>f.stunFrames),[12,12]);
 assert.equal(Math.abs(380-s.fighters[0].x),Math.abs(s.fighters[1].x-438));
});
test("airborne, invulnerable and attack-recovery targets do not gain a tech window",()=>{
 let air=tick(close(),[{throw:true},{jump:true}]);air=tick(air,neutral,7);
 assert.equal(air.pendingThrow,null);assert.equal(air.fighters[1].health,1040);
 let wake=close();wake.fighters[1].wakeInvulnerabilityFrames=25;
 wake=tick(wake,[{throw:true},{}]);wake=tick(wake,neutral,10);assert.equal(wake.pendingThrow,null);assert.equal(wake.fighters[1].health,1040);
 let recovery=close();recovery.fighters[1].action={kind:"attack",attack:"heavy",frame:22,connected:false};
 recovery.fighters[1].phase="recovery";recovery=tick(recovery,[{throw:true},{}]);recovery=tick(recovery,neutral,7);
 assert.equal(recovery.pendingThrow,null);assert.equal(recovery.fighters[1].health,935);
});
test("throw capture freezes existing projectiles for a bounded interval and still counts match time",()=>{
 let projectile=tick(p.createPitCombatState(),[{attack:"technique"},{}]);
 for(let i=0;i<30&&!projectile.techniqueEffects.length;i++)projectile=tick(projectile);
 assert.equal(projectile.techniqueEffects.length,1,"test uses a real spawned disc");
 let s=caught();s.rules.mode="match";const before=s.roundFramesRemaining;
 s.techniqueEffects=[{...projectile.techniqueEffects[0],x:120,y:50}];
 s.nextTechniqueEffectId=projectile.nextTechniqueEffectId;
 assert.doesNotThrow(()=>p.deserializePitCombat(p.serializePitCombat(s)));
 const frozen=JSON.stringify(s.techniqueEffects),positions=s.fighters.map(f=>f.x);
 s=tick(s,neutral,4);
 assert.equal(s.roundFramesRemaining,before-4);assert.equal(JSON.stringify(s.techniqueEffects),frozen);
 assert.deepEqual(s.fighters.map(f=>f.x),positions);assert.equal(s.pendingThrow.framesRemaining,4);
});
test("timeout clears a pending capture and never leaves a frozen next round",()=>{
 let s=caught();s.rules.mode="match";s.roundFramesRemaining=1;
 s=tick(s);assert.equal(s.phase,"round-over");assert.equal(s.pendingThrow,null);
 s=tick(s,neutral,p.PIT_ROUND_TRANSITION_FRAMES);assert.equal(s.phase,"round");assert.equal(s.pendingThrow,null);
});
test("captured snapshots clone, round-trip and reject forged timing or fighter states",()=>{
 const s=caught(),serialized=p.serializePitCombat(s);
 assert.deepEqual(p.deserializePitCombat(serialized),s);
 const next=tick(s);assert.equal(s.pendingThrow.framesRemaining,8);assert.equal(next.pendingThrow.framesRemaining,7);
 for(const mutate of [
  c=>c.pendingThrow.framesRemaining=0,c=>c.pendingThrow.framesRemaining=9,
  c=>c.pendingThrow.attackerSlot=2,c=>c.pendingThrow.capturedFrame-=1,
  c=>c.pendingThrow.ignored=true,c=>c.fighters[1].grounded=false,
  c=>c.fighters[1].stunFrames=2,c=>delete c.pendingThrow,
 ]){const c=JSON.parse(serialized);mutate(c);assert.throws(()=>p.deserializePitCombat(JSON.stringify(c)));}
 const old=JSON.parse(serialized);old.version=4;delete old.pendingThrow;
 const migrated=p.deserializePitCombat(JSON.stringify(old));assert.equal(migrated.version,5);assert.equal(migrated.pendingThrow,null);
});
test("manual single ticks preserve the full throw-tech window with arbitrary wall delays",()=>{
 let s=caught(),clock=p.createPitTrainingClock(true);
 for(let i=0;i<7;i++){
  let a=p.advancePitTrainingClock(clock,60000);assert.equal(a.ticks,0);
  clock=p.requestPitTrainingTick(a.clock);a=p.advancePitTrainingClock(clock,60000);assert.equal(a.ticks,1);
  clock=a.clock;s=tick(s);
 }
 assert.equal(s.pendingThrow.framesRemaining,1);
 s=tick(s,[{},{throw:true}]);assert(s.events.some(e=>e.type==="throw-tech"));
});
const historical=JSON.parse(await fs.readFile("tests/fixtures/pit-replay-v4-throw.json","utf8"));
test("a real archived V29/V4 throw replay preserves bytes, checksum and original damage",()=>{
 const original=JSON.stringify(historical.replay);
 const restored=p.normalizePitReplay(historical.replay);assert(restored);
 assert.equal(JSON.stringify(restored),original);assert.equal(restored.metadata.checksum,"f975e201");
 const state=p.playPitReplay(restored);assert.deepEqual(state.fighters.map(f=>f.health),historical.health);
 const reader=p.createPitReplayReader(restored);let displayed=p.createPitCombatState(...restored.fighters,restored.rules);
 while(!reader.done)displayed=p.stepPitReplayCombat(displayed,reader.next().value.inputs,restored.engineVersion);
 assert.deepEqual(displayed,state);
});
test("new V5 replays record real techs; relabelling V4 input cannot pass the old checksum",()=>{
 const reader=p.createPitReplayReader(historical.replay),frames=[];
 while(!reader.done)frames.push(reader.next().value.inputs);
 const replay=p.recordPitReplay(frames,{rules:historical.replay.rules});
 assert.equal(replay.engineVersion,5);assert.equal(replay.version,3);
 const result=p.playPitReplay(replay);assert.deepEqual(result.fighters.map(f=>f.health),[1000,1040]);
 assert.notEqual(replay.metadata.checksum,historical.replay.metadata.checksum);
 assert.equal(p.normalizePitReplay({...historical.replay,engineVersion:5}),null);
 assert.equal(p.normalizePitReplay({...replay,engineVersion:4}),null);
 assert.deepEqual(p.playPitReplay(p.deserializePitReplay(p.serializePitReplay(replay))),result);
});
function lessonRun(policy,id="berserker"){
 let {state,lesson}=p.preparePitTrainingLesson(p.createPitCombatState(id,id==="jungle-hunter"?"berserker":"jungle-hunter",{mode:"training"}),"throw-tech");
 const events=[];for(let i=0;i<1800&&lesson.status==="running";i++){
  const next=tick(state,[policy(state,lesson),p.resolvePitTrainingLessonInput(lesson,state)]);
  events.push(...next.events);lesson=p.evaluatePitTrainingLesson(lesson,state,next);state=next;
 }return{state,lesson,events};
}
test("fifth lesson requires three actual defensive tech events and fails a missed capture",()=>{
 const good=lessonRun(s=>s.pendingThrow?.framesRemaining===3?{throw:true}:{});
 assert.equal(good.lesson.status,"success");assert.equal(good.lesson.progress,3);
 assert.equal(good.events.filter(e=>e.type==="throw-tech"&&e.defenderId==="berserker").length,3);
 const bad=lessonRun(()=>({}));assert.equal(bad.lesson.status,"failed");assert.equal(bad.lesson.progress,0);
 const held=lessonRun(()=>({guardHigh:true,throw:true}));assert.equal(held.lesson.status,"failed");assert.equal(held.lesson.progress,0);
});
test("every selectable hunter can complete the real defensive-tech lesson",()=>{
 for(const id of p.PIT_PLAYABLE_FIGHTER_IDS){
  const result=lessonRun(s=>s.pendingThrow?{throw:true}:{},id);
  assert.equal(result.lesson.status,"success",id+JSON.stringify(result.lesson));
 }
});


test("an already active strike beats a capture; the historical V4 trade stays historical", () => {
  const s=close();
  s.fighters[0].action={kind:"throw",attack:null,frame:6,connected:false};
  s.fighters[0].phase="startup";
  s.fighters[1].action={kind:"attack",attack:"light",frame:p.PIT_FIGHTERS.berserker.attacks.light.startup-1,connected:false};
  s.fighters[1].phase="startup";
  const modern=p.stepPitCombat(s);
  assert.equal(modern.pendingThrow,null);
  assert(modern.fighters[0].health<1000);
  assert.equal(modern.fighters[1].health,1040);
  assert(!modern.events.some(e=>e.type==="throw-caught"||e.type==="throw-tech"));
  const old=p.stepPitCombatV4Compatibility(s);
  assert(old.fighters[0].health<1000);
  assert.equal(old.fighters[1].health,935);
});
test("tech separation respects either arena wall and keeps the two pushboxes apart", () => {
  for(const edge of ["left","right"]){
    let s=caught();
    const arena=p.PIT_ARENAS[s.arenaId];
    if(edge==="left"){s.fighters[0].x=arena.leftWall+p.PIT_FIGHTERS["jungle-hunter"].bodyWidth/2;s.fighters[1].x=s.fighters[0].x+58;}
    else{s.fighters[1].x=arena.rightWall-p.PIT_FIGHTERS.berserker.bodyWidth/2;s.fighters[0].x=s.fighters[1].x-58;}
    s=p.stepPitCombat(s,[{},{throw:true}]);
    const boxes=s.fighters.map(f=>p.getPitFighterBoxes(f).pushbox);
    assert(boxes[0].x>=arena.leftWall);assert(boxes[1].x+boxes[1].width<=arena.rightWall);
    assert(boxes[0].x+boxes[0].width<=boxes[1].x);
    assert.doesNotThrow(()=>p.deserializePitCombat(p.serializePitCombat(s)));
  }
});
test("the playback stepper fails closed for unknown engine versions", () => {
  for(const version of [0,2,3,6,undefined]){
    assert.throws(()=>p.stepPitReplayCombat(close(),neutral,version),e=>e.code==="incompatible-engine");
  }
});
