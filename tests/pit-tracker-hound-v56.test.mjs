import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { build } from 'esbuild';

const bundle = await build({ stdin: { contents: ['pitCombat', 'pitReplay', 'pitCompanion', 'pitTraining'].map(name => `export * from './app/game/systems/${name}';`).join('\n'), resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'esm' });
const p = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
function setup(distance = 360) {
  const state = p.createPitCombatState('tracker', 'jungle-hunter', { mode: 'training' });
  state.fighters[0].x = 280; state.fighters[1].x = 280 + distance;
  return state;
}
function tick(state, count, inputs = [{}, {}]) {
  for (let i = 0; i < count; i++) {
    state = p.stepPitCombat(state, inputs);
    assert.deepEqual(p.deserializePitCombat(p.serializePitCombat(state)), state, 'every companion phase must survive a save round-trip');
  }
  return state;
}
function summon(state = setup()) {
  state = p.stepPitCombat(state, [{ attack: 'technique' }, {}]);
  return tick(state, p.PIT_FIGHTERS.tracker.attacks.technique.startup);
}

test('Tracker has a ground companion; a full visible telegraph precedes damage and movement', () => {
  let state = summon();
  const effect = state.techniqueEffects[0];
  assert.equal(effect.techniqueId, p.PIT_TRACKER_HOUND.id);
  assert.equal(effect.phase, 'arming');
  assert.equal(effect.y, 0);
  const x = effect.x, health = state.fighters[1].health;
  state = tick(state, p.PIT_TRACKER_HOUND.armFrames - effect.age - 1);
  assert.equal(state.techniqueEffects[0].phase, 'arming');
  assert.equal(state.techniqueEffects[0].x, x);
  assert.equal(state.fighters[1].health, health);
  state = tick(state, 1);
  assert.equal(state.techniqueEffects[0].phase, 'active');
  assert.equal(state.techniqueEffects[0].x, x + p.PIT_TRACKER_HOUND.speed);
});

test('a second command recalls the same creature without spawning a second id', () => {
  let state = summon(setup(580));
  state = tick(state, 46);
  const id = state.techniqueEffects[0].id;
  state = p.stepPitCombat(state, [{ attack: 'technique' }, {}]);
  state = tick(state, 8);
  assert.equal(state.techniqueEffects.length, 1);
  assert.equal(state.techniqueEffects[0].id, id);
  assert.equal(state.techniqueEffects[0].phase, 'returning');
  assert.equal(state.nextTechniqueEffectId, id + 1);
  state = tick(state, 150);
  assert.equal(state.techniqueEffects.length, 0);
});

test('one contact causes one hit; returning through the defender never deals another', () => {
  let state = summon(setup(210));
  let hits = 0, sawReturn = false;
  for (let i = 0; i < 190; i++) {
    state = tick(state, 1);
    hits += state.events.filter(event => event.type === 'hit' && event.attackerId === 'tracker').length;
    sawReturn ||= state.techniqueEffects.some(effect => effect.hitCount === 1 && effect.phase === 'returning');
  }
  assert.equal(hits, 1);
  assert(sawReturn);
  assert.equal(state.techniqueEffects.length, 0);
});

test('a real opposing melee strike interrupts the telegraph before the creature can strike', () => {
  let state = summon(setup(160));
  state = p.stepPitCombat(state, [{}, { attack: 'heavy' }]);
  let returned = false, trackerHits = 0;
  for (let i = 0; i < 90; i++) {
    state = tick(state, 1);
    returned ||= state.techniqueEffects.some(effect => effect.phase === 'returning');
    trackerHits += state.events.filter(event => event.type === 'hit' && event.attackerId === 'tracker').length;
  }
  assert(returned);
  assert.equal(trackerHits, 0);
});

test('owner KO removes the companion in the same frame, including training mode', () => {
  let state = summon(setup(400));
  state = tick(state, 40);
  state.fighters[0].health = 1;
  state.fighters[1].x = state.fighters[0].x + 65;
  state = p.stepPitCombat(state, [{}, { attack: 'heavy' }]);
  for (let i = 0; i < 40 && state.fighters[0].health > 0; i++) state = tick(state, 1);
  assert.equal(state.fighters[0].health, 0);
  assert.equal(state.techniqueEffects.length, 0);
});

test('normalizer refuses flying, duplicated or spent attacking hounds', () => {
  const state = summon();
  for (const alter of [
    next => { next.techniqueEffects[0].y = 20; },
    next => { next.techniqueEffects.push({ ...next.techniqueEffects[0], id: 2 }); next.nextTechniqueEffectId = 3; },
    next => { next.techniqueEffects[0].hitCount = 1; },
  ]) {
    const forged = structuredClone(state); alter(forged);
    assert.throws(() => p.deserializePitCombat(JSON.stringify(forged)), /Invalid or incompatible/);
  }
});

test('published engine6 Tracker counter replay is read unchanged, never replayed as a hound', () => {
  const historical = readFileSync(new URL('./fixtures/pit-replay-v6-tracker-counter.json', import.meta.url), 'utf8');
  const replay = p.deserializePitReplay(historical);
  assert.equal(replay.engineVersion, 6);
  assert.equal(replay.metadata.checksum, 'ad1d9cc9');
  assert.equal(p.serializePitReplay(replay), JSON.stringify(JSON.parse(historical)));
  const reader = p.createPitReplayReader(replay);
  let state = p.createPitCombatState(...replay.fighters, replay.rules), counters = 0;
  while (!reader.done) {
    state = p.stepPitReplayCombat(state, reader.next().value.inputs, replay.engineVersion);
    for (const effect of state.techniqueEffects) {
      assert.equal(p.getPitTechniqueDefinitionForEffect(state, effect).device, 'counter-blade');
      counters++;
    }
  }
  assert(counters > 0);
});

test('engine7 charge, recall and hits round-trip through deterministic input replay', () => {
  const options = { fighters: ['tracker', 'jungle-hunter'], rules: { mode: 'training' }, seed: 2010 };
  const recorder = p.createPitReplayRecorder(options);
  let state = p.createPitCombatState(...options.fighters, options.rules), hounds = 0;
  for (let i = 0; i < 650; i++) {
    const inputs = [{ attack: i % 100 === 0 ? 'technique' : undefined }, {}];
    recorder.append(inputs); state = p.stepPitCombat(state, inputs);
    hounds += state.techniqueEffects.filter(effect => effect.techniqueId === p.PIT_TRACKER_HOUND.id).length;
  }
  assert(hounds > 0);
  const replay = p.deserializePitReplay(p.serializePitReplay(recorder.finish()));
  assert.equal(replay.engineVersion, 10);
  assert.equal(p.serializePitCombat(p.playPitReplay(replay)), p.serializePitCombat(state));
});

test('both independently named appearances survive replay, save, rematch and training reset', () => {
  const finalHealth = [];
  for (const { id } of p.PIT_HOUND_VARIANTS) {
    const options = { fighters: ['tracker', 'jungle-hunter'], rules: { mode: 'training' }, houndVariantId: id };
    const recorder = p.createPitReplayRecorder(options);
    let state = p.createPitCombatState(...options.fighters, { ...options.rules, houndVariantId: id });
    for (let frame = 0; frame < 300; frame++) {
      const inputs = [{ attack: frame % 100 === 0 ? 'technique' : undefined }, {}];
      recorder.append(inputs); state = p.stepPitCombat(state, inputs);
    }
    const replay = p.deserializePitReplay(p.serializePitReplay(recorder.finish()));
    assert.equal(replay.houndVariantId, id);
    assert.deepEqual(p.playPitReplay(replay), state);
    assert.equal(p.deserializePitCombat(p.serializePitCombat(state)).houndVariantId, id);
    assert.equal(p.rematchPitCombat(state).houndVariantId, id);
    assert.equal(p.resetPitTrainingPositions(state).houndVariantId, id);
    finalHealth.push(state.fighters[1].health);
    assert.equal(p.normalizePitReplay({ ...replay, engineVersion: 6 }), null);
    assert.equal(p.normalizePitReplay({ ...replay, houndVariantId: 'user-original-companion' }), null);
    const opposite = id === 'tracker-hound' ? 'hellhound-longhorn' : 'tracker-hound';
    assert.equal(p.normalizePitReplay({ ...replay, houndVariantId: opposite }), null, 'appearance participates in the integrity checksum');
  }
  assert.equal(finalHealth[0], finalHealth[1], 'no strength bonus for a visual variant');
  assert.throws(() => p.createPitCombatState('jungle-hunter', 'berserker', { houndVariantId: 'tracker-hound' }));
  assert.throws(() => p.createPitReplayRecorder({ houndVariantId: 'hellhound-longhorn' }));
});

test('ground charge is blockable and cannot follow an airborne opponent', () => {
  let state = summon(setup(180));
  const health = state.fighters[1].health;
  let blocks = 0;
  for (let frame = 0; frame < 170; frame++) {
    state = tick(state, 1, [{}, { guardHigh: true }]);
    blocks += state.events.filter(event => event.type === 'block' && event.attackerId === 'tracker').length;
  }
  assert.equal(blocks, 1); assert.equal(state.fighters[1].health, health);
  state = summon(setup(160));
  state = tick(state, 20);
  state = p.stepPitCombat(state, [{}, { jump: true, left: true }]);
  let hits = 0;
  for (let frame = 0; frame < 130; frame++) {
    state = tick(state, 1, [{}, { left: frame < 23 }]);
    hits += state.events.filter(event => event.type === 'hit' && event.attackerId === 'tracker').length;
    assert(state.techniqueEffects.every(effect => effect.y === 0));
  }
  assert.equal(hits, 0);
});

test('round end clears the creature before result presentations', () => {
  let state = p.createPitCombatState('tracker', 'jungle-hunter');
  state = summon(state); state.roundFramesRemaining = 1;
  state = p.stepPitCombat(state);
  assert.equal(state.phase, 'round-over');
  assert.equal(state.techniqueEffects.length, 0);
});
