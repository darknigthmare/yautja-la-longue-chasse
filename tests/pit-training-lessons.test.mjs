import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
const bundle = await build({
  stdin: { contents: [
    'export * from "./app/game/systems/pitTraining";',
    'export * from "./app/game/systems/pitTrainingClock";',
    'export * from "./app/game/systems/pitTrainingLessons";',
    'export * from "./app/game/systems/pitCombat";',
  ].join("\n"), resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, platform: "node", format: "esm",
});
const pit = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const training = () => pit.createPitCombatState("berserker", "wolf", { mode: "training", arenaId: "glass-terrace" });
function exercise(id, policy, ticks = 1800) {
  let { state, lesson } = pit.preparePitTrainingLesson(training(), id);
  const events = [];
  for (let i = 0; i < ticks && lesson.status === "running"; i++) {
    const next = pit.stepPitCombat(state, [policy(state, lesson), pit.resolvePitTrainingLessonInput(lesson, state)]);
    events.push(...next.events);
    lesson = pit.evaluatePitTrainingLesson(lesson, state, next);
    state = next;
  }
  return { state, lesson, events };
}
test("frozen transport consumes exactly requested ticks without wall-clock catch-up", () => {
  let clock = pit.createPitTrainingClock(true);
  for (const delay of [16, 500, 60_000, Number.NaN]) {
    const result = pit.advancePitTrainingClock(clock, delay);
    assert.equal(result.ticks, 0);
    clock = result.clock;
  }
  clock = pit.requestPitTrainingTick(clock);
  let result = pit.advancePitTrainingClock(clock, 5000);
  assert.equal(result.ticks, 1);
  result = pit.advancePitTrainingClock(result.clock, 5000);
  assert.equal(result.ticks, 0);
  clock = pit.pausePitTrainingClock(result.clock, false);
  assert.equal(pit.advancePitTrainingClock(clock, 1).ticks, 0);
  assert.deepEqual(pit.requestPitTrainingTick(clock), clock);
});
test("N manual ticks match uninterrupted 60Hz combat and consume N sequence inputs", () => {
  const sequence = pit.recordPitTrainingSequence(Array.from({length:120}, (_, i) => ({attack:i%30===0 ? "light" : undefined, right:i<25})));
  const reader = pit.createPitTrainingSequenceReader(sequence, "once");
  let manual = training();
  let clock = pit.createPitTrainingClock(true);
  for (let i = 0; i < 120; i++) {
    const frozen = pit.advancePitTrainingClock(clock, 2000);
    assert.equal(frozen.ticks, 0);
    assert.equal(reader.tick, i);
    clock = pit.requestPitTrainingTick(frozen.clock);
    const transport = pit.advancePitTrainingClock(clock, 2000);
    clock = transport.clock;
    assert.equal(transport.ticks, 1);
    const input = reader.next().value.input;
    manual = pit.stepPitCombat(manual, [input, {}]);
  }
  let replayed = training();
  const replay = pit.createPitTrainingSequenceReader(sequence, "once");
  for(let i=0;i<120;i++) replayed=pit.stepPitCombat(replayed,[replay.next().value.input,{}]);
  assert.deepEqual(manual, replayed);
  assert.equal(manual.frame,120);
  assert.equal(reader.tick,120);
});
test("transport clears fractional time on pause and retains stable 60Hz ticks", () => {
  let clock=pit.createPitTrainingClock();
  let total=0;
  for(let i=0;i<600;i++){
    const result=pit.advancePitTrainingClock(clock,1000/60);
    total+=result.ticks; clock=result.clock;
  }
  assert.equal(total,600);
  clock=pit.advancePitTrainingClock(clock,8).clock;
  clock=pit.pausePitTrainingClock(clock,true);
  clock=pit.pausePitTrainingClock(clock,false);
  assert.equal(pit.advancePitTrainingClock(clock,9).ticks,0);
});
test("training reset preserves selected arena and does not modify the source", () => {
  const original=training();
  original.fighters[0].health=300;
  const before=JSON.stringify(original);
  const reset=pit.resetPitTrainingPositions(original);
  assert.equal(reset.arenaId,"glass-terrace");
  assert.equal(reset.frame,0);
  assert.equal(JSON.stringify(original),before);
});
test("guided scenarios are transient, deterministic, and reject match mode", () => {
  const original=training(), before=JSON.stringify(original);
  for(const definition of pit.PIT_TRAINING_LESSONS){
    assert.deepEqual(pit.preparePitTrainingLesson(original,definition.id),pit.preparePitTrainingLesson(original,definition.id));
    const prepared=pit.preparePitTrainingLesson(original,definition.id);
    assert.equal(prepared.state.arenaId,original.arenaId);
    assert.equal(prepared.state.version,pit.PIT_STATE_VERSION);
    assert.doesNotMatch(JSON.stringify(prepared.lesson),/reward|save|campaign|palette/);
    assert.equal(pit.evaluatePitTrainingLesson(prepared.lesson,prepared.state,prepared.state),prepared.lesson);
  }
  assert.equal(JSON.stringify(original),before);
  assert.throws(()=>pit.preparePitTrainingLesson(pit.createPitCombatState(),"guard-low"),/training/);
  assert.throws(()=>pit.preparePitTrainingLesson(original,"not-a-lesson"),/training/);
});
test("low guard requires real low blocks and rejects high guard", () => {
  const good=exercise("guard-low",()=>({guardLow:true,down:true}));
  assert.equal(good.lesson.status,"success",JSON.stringify(good.lesson));
  assert.equal(good.lesson.progress,3);
  assert.ok(good.events.filter(e=>e.type==="block").length>=3);
  const bad=exercise("guard-low",()=>({guardHigh:true}));
  assert.equal(bad.lesson.status,"failed");
  assert.equal(bad.lesson.progress,0);
});
test("anti-air progress requires actual airborne hits", () => {
  const good=exercise("anti-air",(state,lesson)=>({attack:lesson.elapsedTicks%120===22 ? "heavy" : undefined}));
  assert.equal(good.lesson.status,"success",JSON.stringify(good.lesson));
  assert.ok(good.events.filter(e=>e.type==="hit"&&e.antiAir).length>=3);
  const idle=exercise("anti-air",()=>({}));
  assert.equal(idle.lesson.status,"failed");
  assert.equal(idle.lesson.progress,0);
});
test("corner escape requires real displacement and fifteen controlled ticks", () => {
  const good=exercise("corner-escape",(state,lesson)=>({
    attack:lesson.elapsedTicks%45===5 ? "heavy" : undefined,
    right:state.fighters[0].x < pit.PIT_ARENAS[state.arenaId].leftWall+285,
  }));
  assert.equal(good.lesson.status,"success",JSON.stringify(good.lesson));
  assert.equal(good.lesson.progress,15);
  assert.equal(good.state.fighters[0].grounded,true);
  assert.equal(good.lesson.openingCreated,true);
  const guardWalk=exercise("corner-escape",()=>({right:true,guardHigh:true}));
  assert.equal(guardWalk.lesson.status,"failed");
  assert.equal(guardWalk.lesson.openingCreated,false);
  const idle=exercise("corner-escape",()=>({}));
  assert.equal(idle.lesson.status,"failed");
});
test("Traque lesson requires cloak, attack cancellation and a confirmed hit", () => {
  const good=exercise("traque",(state,lesson)=>({
    resource:lesson.elapsedTicks===0,
    attack:lesson.elapsedTicks===20 ? "medium" : undefined,
    right:lesson.elapsedTicks>8&&lesson.elapsedTicks<14,
  }));
  assert.equal(good.lesson.status,"success",JSON.stringify(good.lesson));
  assert.equal(good.lesson.progress,3);
  const idle=exercise("traque",()=>({}));
  assert.equal(idle.lesson.status,"failed");
  assert.equal(idle.lesson.progress,0);
});

test("lesson evaluation is idempotent and completed exercises stop producing dummy inputs", () => {
  const complete=exercise("guard-low",()=>({guardLow:true,down:true}));
  assert.deepEqual(pit.resolvePitTrainingLessonInput(complete.lesson,complete.state),{});
  const next=pit.stepPitCombat(complete.state,[{},{}]);
  assert.equal(pit.evaluatePitTrainingLesson(complete.lesson,complete.state,next),complete.lesson);
  let prepared=pit.preparePitTrainingLesson(training(),"traque");
  const after=pit.stepPitCombat(prepared.state,[{resource:true},{}]);
  const observed=pit.evaluatePitTrainingLesson(prepared.lesson,prepared.state,after);
  assert.equal(observed.progress,1);
  assert.equal(pit.evaluatePitTrainingLesson(observed,prepared.state,after),observed);
});

test("every selectable fighter can launch all lessons with a distinct dummy", () => {
  for(const id of pit.PIT_PLAYABLE_FIGHTER_IDS){
    const original=pit.createPitCombatState(id,id==="jungle-hunter"?"berserker":"jungle-hunter",{mode:"training"});
    for(const definition of pit.PIT_TRAINING_LESSONS){
      const prepared=pit.preparePitTrainingLesson(original,definition.id);
      assert.equal(prepared.state.fighters[0].definitionId,id);
      assert.notEqual(prepared.state.fighters[1].definitionId,id);
    }
    let {state,lesson}=pit.preparePitTrainingLesson(original,"guard-low");
    for(let tick=0;tick<1800&&lesson.status==="running";tick++){
      const next=pit.stepPitCombat(state,[{guardLow:true,down:true},pit.resolvePitTrainingLessonInput(lesson,state)]);
      lesson=pit.evaluatePitTrainingLesson(lesson,state,next);state=next;
    }
    assert.equal(lesson.status,"success",id+": "+JSON.stringify(lesson));
  }
});
