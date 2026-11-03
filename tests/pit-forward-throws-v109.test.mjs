import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';

const bundled = await build({stdin: {contents: [
  "export * from './app/game/systems/pitCombat';",
  "export * from './app/game/systems/pitReplay';",
  "export * from './app/game/systems/pitWorkbookCombatV109';",
  "export * from './app/game/systems/pitForwardThrowControlsV109';",
  "export * from './app/game/systems/controlBindings';",
  "export * from './app/game/hunterSpriteMotion';",
  "export * from './app/game/systems/pitTraining';",
].join('\n'), resolveDir: process.cwd()}, bundle: true, write: false, format: 'esm', platform: 'node'});
const p = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const neutral = [{}, {}];
const tick = (state, inputs = neutral, count = 1) => {
  for (let index = 0; index < count; index++) state = p.stepPitCombat(state, inputs);
  return state;
};
const valid = state => assert.deepEqual(p.deserializePitCombat(p.serializePitCombat(state)), state);

/** Declared model fixture only. Browser victories are obtained independently
 * by the production recipe, never inferred from these initial positions. */
function close({hero = 'feral-hunter', slot = 0, direction = 1, mode = 'training'} = {}) {
  const opponent = hero === 'scar' ? 'feral-hunter' : 'scar';
  const ids = slot === 0 ? [hero, opponent] : [opponent, hero];
  const state = p.createPitCombatState(...ids, {normalMoves: 'workbook-v109', mode});
  const attacker = state.fighters[slot], defender = state.fighters[1 - slot];
  attacker.x = direction === 1 ? 400 : 460;
  defender.x = attacker.x + direction * 60;
  attacker.facing = direction;
  defender.facing = -direction;
  return state;
}

function caught(options = {}, defenderInput = {}) {
  const slot = options.slot ?? 0;
  let state = close(options);
  state = tick(state, slot === 0 ? [{throw: true}, defenderInput] : [defenderInput, {throw: true}]);
  for (let step = 0; step < 12 && !state.sourceThrowV109; step++)
    state = tick(state, slot === 0 ? [{}, defenderInput] : [defenderInput, {}]);
  assert.ok(state.sourceThrowV109, 'the actual active body must catch the independent grounded target');
  assert.equal(state.sourceThrowV109.attackerSlot, slot);
  assert.equal(state.sourceThrowV109.age, 0);
  valid(state);
  return state;
}

test('V16 is opt-in, source 8/3/30 and 110/0, with an explicit unvaried native partner boundary', () => {
  assert.equal(close().version, 16);
  assert.equal(p.createPitCombatState('feral-hunter', 'scar', {normalMoves: 'workbook-v107'}).version, 15);
  for (const hero of ['feral-hunter', 'scar']) {
    const move = p.getPitWorkbookCombatMoveV109(hero, 'TH_F');
    assert.deepEqual([move.startup, move.active, move.recovery, move.damage, move.costPercent], [8, 3, 30, 110, 0]);
  }
  assert.throws(() => p.createPitCombatState('feral-hunter', 'wolf', {normalMoves: 'workbook-v109'}), /independently drawn/);
  assert.throws(() => p.createPitCombatState('feral-hunter', 'scar', {normalMoves: 'workbook-v109', variants: ['not-a-source-costume', null]}), /independently drawn/);
});

test('L+M resolves the current assigned keys, touch codes and actual pad buttons only in the opt-in recipe', () => {
  const bindings = structuredClone(p.DEFAULT_CONTROL_BINDINGS);
  for (const player of [1, 2]) {
    bindings[`pit.p${player}AttackLight`] = ['KeyV'];
    bindings[`pit.p${player}AttackMedium`] = ['KeyB'];
    const options = {recipe: 'workbook-v109', player, codes: new Set(['KeyV', 'KeyB']), bindings};
    const ordinary = p.pitInputFromControlCodes(player, options.codes, bindings);
    assert.equal(ordinary.attack, 'light', 'the historical attack resolver has already discarded the simultaneous medium');
    const source = p.pitForwardThrowInputV109(ordinary, options);
    assert.equal(source.throw, true); assert.equal(source.attack, undefined);
    assert.strictEqual(p.pitForwardThrowInputV109(ordinary, {...options, recipe: 'workbook-v107'}), ordinary);
    assert.strictEqual(p.pitForwardThrowInputV109(ordinary, {...options, codes: new Set(['KeyJ', 'KeyK'])}), ordinary);
    const pad = {buttons: Array.from({length: 16}, (_, index) => ({pressed: index === 2 || index === 3}))};
    assert.equal(p.pitForwardThrowInputV109({}, {...options, codes: new Set(), pad}).throw, true);
    assert.equal(p.pitForwardThrowInputV109({}, {...options, codes: new Set(), requested: true}).throw, true);
  }
});

test('both independent BODY roles reconstruct their actual source clocks on every tick and on an unobserved mid-flight seek', () => {
  for (const hero of ['feral-hunter', 'scar']) for (const slot of [0, 1]) for (const direction of [-1, 1]) {
    let state = close({hero, slot, direction});
    state = tick(state, slot === 0 ? [{throw: true}, {}] : [{}, {throw: true}]);
    let cursor;
    for (let step = 0; step < 85; step++) {
      const attacker = p.describePitCombatHunterSpriteMotion(state, slot, cursor);
      assert.ok(attacker);
      if (state.fighters[slot].action?.workbookMove === 'TH_F') assert.match(attacker.clipId, /^pit\.stand\.workbook-v109\.TH_F\./);
      cursor = attacker.cursor;
      if (state.sourceThrowV109) {
        const victim = p.describePitCombatHunterSpriteMotion(state, 1 - slot);
        assert.equal(victim.clipId, 'pit.stand.workbook-v109.TH_F.victim');
        assert.equal(victim.clock, 'throw-phase'); assert.equal(victim.elapsedTicks, state.sourceThrowV109.age);
        assert.equal(victim.durationTicks, 61); assert.equal(victim.facing, direction === 1 ? 'left' : 'right');
        const restored = p.deserializePitCombat(p.serializePitCombat(state));
        assert.deepEqual(p.describePitCombatHunterSpriteMotion(restored, 1 - slot), victim);
      }
      state = tick(state);
    }
    assert.equal(state.sourceThrowV109, null);
    assert.doesNotMatch(p.describePitCombatHunterSpriteMotion(state, 1 - slot).clipId, /TH_F/);
  }
});

test('a genuine training knockout holds the native landing drawing through its actual sixty-tick counter', () => {
  let state = close(); state.fighters[1].health = 9;
  state = tick(state, [{throw: true}, {}]);
  for (let step = 0; step < 90; step++) {
    state = tick(state); valid(state);
    if (state.sourceThrowV109 && state.fighters[1].health <= 0) {
      const victim = p.describePitCombatHunterSpriteMotion(state, 1);
      assert.equal(victim.clipId, 'pit.stand.workbook-v109.TH_F.victim.ko');
      assert.equal(victim.elapsedTicks, state.sourceThrowV109.age - 19);
      assert.equal(victim.durationTicks, 60);
    }
  }
  assert.equal(state.sourceThrowV109, null);
});

test('the real laboratory exposes the source windows, independent target clock and original V16 reset rules', () => {
  let state = close(); state = tick(state, [{throw: true}, {}]);
  let readout = p.getPitTrainingFrameReadout(state, 0);
  assert.equal(readout.actionTotalFrames, 41); assert.equal(readout.phaseTotalFrames, 8);
  state = tick(state, neutral, 8); readout = p.getPitTrainingFrameReadout(state, 1);
  assert.equal(readout.actionLabel, 'Cible saisie · déchoppe'); assert.equal(readout.framesRemaining, 8);
  state = tick(state, neutral, 8); readout = p.getPitTrainingFrameReadout(state, 1);
  assert.equal(readout.actionLabel, 'Cible projetée');
  state = tick(state, neutral, 11); readout = p.getPitTrainingFrameReadout(state, 1);
  assert.equal(readout.actionLabel, 'Chute de projection avant'); assert.equal(readout.framesRemaining, 42);
  const reset = p.resetPitTrainingPositions(state); valid(reset);
  assert.equal(reset.version, 16); assert.equal(reset.sourceThrowV109, null);
  assert.equal(reset.rules.normalMoves, 'workbook-v109');
});

test('each hero, slot and native facing carries one independent body continuously and damages it only at landing', () => {
  for (const hero of ['feral-hunter', 'scar']) for (const slot of [0, 1]) for (const direction of [-1, 1]) {
    let state = caught({hero, slot, direction});
    const initial = structuredClone(state), target = 1 - slot;
    const health = state.fighters[target].health, sourceX = state.fighters[slot].x;
    let previous = {x: state.fighters[target].x, y: 0}, hits = 0, greatestY = 0;
    for (let age = 1; age <= p.PIT_WORKBOOK_THROW_LANDING_AGE_V109; age++) {
      state = tick(state); valid(state);
      const defender = state.fighters[target];
      greatestY = Math.max(greatestY, defender.y);
      assert.ok(Math.hypot(defender.x - previous.x, defender.y - previous.y) < 23, 'no target teleport');
      assert.equal(state.fighters[slot].x, sourceX);
      assert.equal(state.fighters[slot].facing, direction);
      assert.equal(defender.facing, -direction);
      assert.equal(state.fighters[slot].definitionId, hero);
      assert.equal(defender.definitionId, initial.fighters[target].definitionId);
      const thrown = state.events.filter(event => event.type === 'hit' && event.attack === 'throw'); hits += thrown.length;
      if (age < p.PIT_WORKBOOK_THROW_LANDING_AGE_V109) assert.equal(defender.health, health);
      else {assert.equal(defender.health, health - 110); assert.equal(thrown[0].damage, 110);}
      previous = {x: defender.x, y: defender.y};
    }
    assert.equal(hits, 1);
    assert.equal(greatestY, 64);
    assert.equal(state.fighters[target].x, initial.sourceThrowV109.destinationX);
    assert.equal(state.fighters[target].y, 0);
    assert.equal(state.fighters[target].phase, 'knockdown');
    assert.equal(state.fighters[slot].action.workbookMove, 'TH_F');
    assert.equal(state.fighters[slot].phase, 'recovery');
    assert.deepEqual(state.fighters.map(fighter => fighter.workbookDeviceV107), initial.fighters.map(fighter => fighter.workbookDeviceV107));
    state = tick(state, neutral, 43); valid(state); assert.equal(state.sourceThrowV109, null);
  }
});

test('fresh Projection escapes on the first and final reaction ticks, symmetrically, without damage or meter', () => {
  for (const slot of [0, 1]) for (const delay of [0, 7]) {
    let state = caught({slot}); const health = state.fighters.map(fighter => fighter.health);
    const positions = state.fighters.map(fighter => fighter.x);
    state = tick(state, neutral, delay);
    state = tick(state, slot === 0 ? [{}, {throw: true}] : [{throw: true}, {}]); valid(state);
    assert.equal(state.sourceThrowV109, null); assert.equal(state.pendingThrow, null);
    assert.deepEqual(state.fighters.map(fighter => fighter.health), health);
    assert.deepEqual(state.fighters.map(fighter => fighter.traque), [0, 0]);
    assert.deepEqual(state.fighters.map(fighter => fighter.x), positions, 'tech separation begins through movement, not a jump in position');
    assert.equal(state.events.filter(event => event.type === 'throw-tech').length, 1);
    const separated = tick(state); valid(separated);
    assert.ok(Math.abs(separated.fighters[0].x - separated.fighters[1].x) > Math.abs(positions[0] - positions[1]));
  }
});

test('the CPU can react to the visible V16 capture after five ticks, including when its old resource condition would be true', () => {
  for (const delay of [0, 1, 2]) {
    let state = close(); state = tick(state, neutral, delay);
    state = tick(state, [{throw: true}, {}]);
    while (!state.sourceThrowV109) state = tick(state);
    const frame = state.sourceThrowV109.capturedFrame, health = state.fighters[1].health; state.fighters[1].traque = 1000; state.fighters[1].comboHitsReceived = 2;
    for (let age = 0; age < 6; age++) {
      const response = p.pitForwardThrowCpuInputV109(state);
      assert.equal(Boolean(response.throw), age === 5 && frame % 3 !== 0);
      state = tick(state, [{}, response]);
    }
    assert.equal(state.sourceThrowV109 === null, frame % 3 !== 0);
    assert.equal(state.fighters[1].health, health);
  }
});

test('held Projection cannot escape, and a new press after the deadline cannot undo a real landing', () => {
  for (const slot of [0, 1]) {
    let held = caught({slot}, {guardHigh: true, throw: true}); const target = 1 - slot;
    const health = held.fighters[target].health;
    for (let index = 0; index < 20; index++) held = tick(held, slot === 0 ? [{}, {throw: true}] : [{throw: true}, {}]);
    assert.equal(held.fighters[target].health, health - 110);
    assert.ok(!held.events.some(event => event.type === 'throw-tech'));
    let late = caught({slot}); late = tick(late, neutral, 8);
    late = tick(late, slot === 0 ? [{}, {throw: true}] : [{throw: true}, {}]);
    assert.ok(!late.events.some(event => event.type === 'throw-tech'));
    late = tick(late, neutral, 20); assert.equal(late.fighters[target].health, health - 110);
  }
});

test('punishing a genuinely played5H recovery does not grant a fresh tech after its original action has been interrupted', () => {
  let state = close(); const health = state.fighters[0].health;
  state = tick(state, [{left: true}, {attack: 'heavy'}]);
  state = tick(state, [{left: true}, {}], 15); state = tick(state, neutral, 6);
  assert.equal(state.fighters[1].action.normalMove, '5H'); assert.equal(state.fighters[1].phase, 'recovery');
  state = tick(state, [{right: true}, {}], 16);
  assert.equal(state.fighters[0].health, health, 'the actual backstep dodged the heavy before walking back');
  state = tick(state, [{throw: true}, {}]); state = tick(state, neutral, 8); valid(state);
  assert.ok(state.sourceThrowV109); assert.equal(state.sourceThrowV109.techEligible, false);
  state = tick(state, [{}, {throw: true}]); valid(state);
  assert.ok(state.sourceThrowV109); assert.ok(!state.events.some(event => event.type === 'throw-tech'));
  assert.equal(p.pitForwardThrowCpuInputV109(state).throw, undefined);
  assert.equal(p.getPitTrainingFrameReadout(state, 1).actionLabel, 'Récupération punie · saisie');
});

test('capture consumes input edges and grants no free resource action, jump or queued attack', () => {
  let state = caught(); state.fighters[1].traque = 500;
  const held = [{}, {jump: true, attack: 'heavy', resource: true}];
  state = tick(state, held, 70); valid(state);
  assert.equal(state.fighters[1].grounded, true);
  assert.equal(state.fighters[1].action, null);
  assert.equal(state.fighters[1].cloakPhase, 'inactive');
  assert.ok(state.fighters[1].traque >= 555, 'only the actual received damage and normal later pressure award meter');
});

test('both actual consumed mission devices stay consumed throughout the new source throw', () => {
  for (const hero of ['feral-hunter', 'scar']) {
    let state = close({hero}); state.fighters[0].traque = 1000;
    state = tick(state, [{workbookAction: hero === 'scar' ? 'shuriken' : 'mine'}, {}]);
    const events = [];
    for (let index = 0; index < 170; index++) {state = tick(state); events.push(...state.events); valid(state);}
    assert.ok(events.some(event => event.type === 'workbook-device-v107' && ['placed', 'launched'].includes(event.event)));
    assert.equal(state.fighters[0].workbookDeviceV107.status, 'spent');
    for (let index = 0; index < 150 && Math.abs(state.fighters[1].x - state.fighters[0].x) > 60; index++)
      state = tick(state, [state.fighters[1].x > state.fighters[0].x ? {right: true} : {left: true}, {}]);
    state = tick(state);
    const inventory = structuredClone(state.fighters[0].workbookDeviceV107), nextId = state.nextTechniqueEffectId;
    state = tick(state, [{throw: true}, {}]);
    let caughtBody = false, landed = false;
    for (let index = 0; index < 70; index++) {
      state = tick(state); valid(state); caughtBody ||= Boolean(state.sourceThrowV109);
      landed ||= state.events.some(event => event.type === 'hit' && event.attack === 'throw');
    }
    assert.ok(caughtBody && landed); assert.deepEqual(state.fighters[0].workbookDeviceV107, inventory);
    assert.equal(state.nextTechniqueEffectId, nextId);
  }
});

test('an actual already-placed enemy mine retains its finite identity, age and stock across the bounded pair pause', () => {
  let state = close(); state.fighters[1].x = 600; state.fighters[0].traque = 1000;
  state = tick(state, [{workbookAction: 'mine'}, {}]); state = tick(state, neutral, 24);
  assert.equal(state.workbookDevicesV107.length, 1);
  for (let step = 0; step < 100 && state.fighters[1].x - state.fighters[0].x > 60; step++)
    state = tick(state, [{}, {left: true}]);
  state = tick(state); state = tick(state, [{}, {throw: true}]);
  for (let step = 0; step < 14 && !state.sourceThrowV109; step++) state = tick(state);
  assert.ok(state.sourceThrowV109); assert.equal(state.sourceThrowV109.attackerSlot, 1);
  const original = structuredClone(state.workbookDevicesV107), inventory = structuredClone(state.fighters[0].workbookDeviceV107);
  for (let age = 1; age <= 19; age++) {
    state = tick(state); valid(state);
    assert.deepEqual(state.workbookDevicesV107, original, 'pair pause does not secretly arm, expire or duplicate a physical device');
    assert.deepEqual(state.fighters[0].workbookDeviceV107, inventory);
  }
  state = tick(state); valid(state);
  assert.equal(state.workbookDevicesV107[0].id, original[0].id);
  assert.equal(state.workbookDevicesV107[0].age, original[0].age + 1);
  assert.equal(state.nextTechniqueEffectId, original[0].id + 1);
});

test('whiff keeps all source windows and recovery, without damage or a cancel into a held button', () => {
  let state = close(); state.fighters[1].x = 900;
  state = tick(state, [{throw: true}, {}]); const phases = [];
  for (let frame = 0; frame < 41; frame++) {
    assert.equal(state.fighters[0].action?.frame, frame); phases.push(state.fighters[0].phase);
    state = tick(state, [{throw: true, jump: true, attack: 'heavy', resource: true}, {}]); valid(state);
  }
  assert.deepEqual(phases.reduce((counts, phase) => ({...counts, [phase]: (counts[phase] ?? 0) + 1}), {}), {startup: 8, active: 3, recovery: 30});
  assert.equal(state.fighters[0].action, null); assert.equal(state.sourceThrowV109, null);
  assert.equal(state.fighters[1].health, p.PIT_FIGHTERS.scar.maxHealth);
  state = tick(state, [{throw: true, jump: true, attack: 'heavy', resource: true}, {}]);
  assert.equal(state.fighters[0].action, null); assert.equal(state.fighters[0].grounded, true);
});

test('simultaneous throws and an actual strike do not give slot one a capture advantage', () => {
  let state = close(); state = tick(state, [{throw: true}, {throw: true}]); state = tick(state, neutral, 8); valid(state);
  assert.equal(state.sourceThrowV109, null); assert.equal(state.events.filter(event => event.type === 'throw-tech').length, 1);
  assert.deepEqual(state.fighters.map(fighter => fighter.health), [960, 1010]);
  state = close(); state.fighters[1].x = 450;
  state.fighters[0].action = {kind: 'throw', attack: null, workbookMove: 'TH_F', frame: 7, connected: false}; state.fighters[0].phase = 'startup';
  state.fighters[1].action = {kind: 'attack', attack: 'light', normalMove: '5L', frame: 4, connected: false}; state.fighters[1].phase = 'startup';
  state = tick(state); valid(state);
  assert.ok(state.fighters[0].health < 960); assert.equal(state.fighters[1].health, 1010); assert.equal(state.sourceThrowV109, null);
});

test('air, wake invulnerability, knockdown and existing hitstun are not source capture openings', () => {
  for (const condition of ['air', 'wake', 'knockdown', 'hitstun']) {
    let state = close(); const target = state.fighters[1];
    if (condition === 'air') {target.grounded = false; target.y = 120; target.velocityY = 0;}
    if (condition === 'wake') target.wakeInvulnerabilityFrames = 30;
    if (condition === 'knockdown') {target.phase = 'knockdown'; target.knockdownFrames = 30;}
    if (condition === 'hitstun') {target.phase = 'hitstun'; target.stunFrames = 30;}
    state = tick(state, [{throw: true}, {}]); state = tick(state, neutral, 12); valid(state);
    assert.equal(state.sourceThrowV109, null, condition); assert.equal(state.fighters[1].health, 1010);
  }
});

test('either wall truncates the trajectory safely and leaves actual pushboxes separate', () => {
  for (const hero of ['feral-hunter', 'scar']) for (const direction of [-1, 1]) {
    let state = close({hero, direction}); const target = state.fighters[1], attacker = state.fighters[0];
    target.x = direction === 1 ? p.PIT_ARENA.rightWall - p.getPitCombatFighterDefinition(target).bodyWidth / 2 : p.PIT_ARENA.leftWall + p.getPitCombatFighterDefinition(target).bodyWidth / 2;
    attacker.x = target.x - direction * 60;
    state = tick(state, [{throw: true}, {}]);
    for (let index = 0; index < 80; index++) {state = tick(state); valid(state); const boxes = state.fighters.map(p.getPitFighterBoxes); assert.ok(boxes.every(box => box.pushbox.x >= p.PIT_ARENA.leftWall && box.pushbox.x + box.pushbox.width <= p.PIT_ARENA.rightWall));}
    const [a, b] = state.fighters.map(p.getPitFighterBoxes).map(box => box.pushbox).sort((a, b) => a.x - b.x);
    assert.ok(a.x + a.width <= b.x + 1e-7); assert.equal(state.fighters[1].health, p.PIT_FIGHTERS[state.fighters[1].definitionId].maxHealth - 110);
  }
});

test('every source capture/flight/landing snapshot is exact and forged lifecycles are rejected', () => {
  let state = caught();
  for (let index = 0; index < 61; index++) {valid(state); state = tick(state);}
  state = caught();
  for (const mutate of [
    s => delete s.sourceThrowV109, s => s.sourceThrowV109 = null,
    s => s.sourceThrowV109.age++, s => s.sourceThrowV109.capturedFrame--,
    s => s.sourceThrowV109.techEligible = 'true',
    s => s.sourceThrowV109.actionFrame = 7, s => s.sourceThrowV109.direction *= -1,
    s => s.sourceThrowV109.destinationX += 1, s => s.sourceThrowV109.defenderX += 5,
    s => s.sourceThrowV109.extra = true, s => s.fighters[1].x++,
    s => s.fighters[0].action.frame++, s => s.fighters[1].action = {kind: 'throw', attack: null, frame: 0, connected: false},
    s => s.version = 15,
  ]) {const forged = structuredClone(state); mutate(forged); assert.throws(() => p.deserializePitCombat(JSON.stringify(forged)));}
  const plain = p.createPitCombatState('feral-hunter', 'scar', {normalMoves: 'workbook-v107'});
  plain.sourceThrowV109 = null; assert.throws(() => p.deserializePitCombat(JSON.stringify(plain)));
});

test('timeout clears a captured or airborne pair without inventing damage or freezing the next round', () => {
  for (const delay of [0, 11]) {
    let state = caught({mode: 'match'}); state = tick(state, neutral, delay); const health = state.fighters.map(f => f.health);
    state.roundFramesRemaining = 1; state = tick(state); valid(state);
    assert.equal(state.phase, 'round-over'); assert.equal(state.sourceThrowV109, null);
    assert.deepEqual(state.fighters.map(f => f.health), health);
    state = tick(state, neutral, p.PIT_ROUND_TRANSITION_FRAMES); valid(state);
    assert.equal(state.phase, 'round'); assert.equal(state.sourceThrowV109, null); assert.ok(state.fighters.every(f => f.grounded));
  }
});

test('V16 replays retain real input edges and reject relabelled V15 archives', () => {
  const options = {fighters: ['feral-hunter', 'scar'], rules: {mode: 'training', normalMoves: 'workbook-v109'}};
  let actual = p.createPitCombatState(...options.fighters, options.rules), thrown = false;
  const frames = [], events = [];
  for (let index = 0; index < 280; index++) {
    let input = {};
    if (!thrown) {
      if (Math.abs(actual.fighters[1].x - actual.fighters[0].x) > 60) input = {right: true};
      else {input = {throw: true}; thrown = true;}
    }
    const inputs = [input, {guardHigh: true}]; frames.push(inputs);
    actual = tick(actual, inputs); events.push(...actual.events);
  }
  assert.ok(events.some(event => event.type === 'throw-caught'));
  assert.ok(events.some(event => event.type === 'hit' && event.attack === 'throw' && event.damage === 110));
  const replay = p.recordPitReplay(frames, options);
  assert.equal(replay.engineVersion, 16);
  // V17 is newly supported; this recorded V16 archive still owns its exact engine.
  assert.equal(p.PIT_REPLAY_MAX_ENGINE_VERSION, 17);
  const restored = p.deserializePitReplay(p.serializePitReplay(replay));
  assert.deepEqual(p.playPitReplay(restored), p.playPitReplay(replay));
  assert.deepEqual(p.playPitReplay(restored), actual);
  assert.equal(p.normalizePitReplay({...replay, engineVersion: 15}), null);
  assert.equal(p.normalizePitReplay({...replay, rules: {...replay.rules, normalMoves: 'workbook-v107'}}), null);
  const old = p.recordPitReplay(frames, {...options, rules: {mode: 'training', normalMoves: 'workbook-v107'}});
  assert.equal(old.engineVersion, 15); assert.equal(p.normalizePitReplay({...old, engineVersion: 16}), null);
});

test('a complete two-round V16 match reached only by actual walking and source throws round-trips its real winning archive', () => {
  const options = {fighters: ['feral-hunter', 'scar'], rules: {mode: 'match', normalMoves: 'workbook-v109'}};
  let state = p.createPitCombatState(...options.fighters, options.rules);
  const inputs = [];
  for (let step = 0; step < 12000 && state.phase !== 'match-over'; step++) {
    const actor = state.fighters[0], target = state.fighters[1]; let first = {};
    if (state.phase === 'round' && !state.sourceThrowV109 && !actor.action && actor.phase === 'idle') {
      first = Math.abs(target.x - actor.x) > 60 ? target.x > actor.x ? {right: true} : {left: true} : {throw: true};
    }
    const pair = [first, {}]; inputs.push(pair); state = p.stepPitCombat(state, pair); valid(state);
  }
  assert.equal(state.phase, 'match-over'); assert.equal(state.matchWinnerId, 'feral-hunter');
  assert.equal(state.fighters[0].roundsWon, 2);
  const replay = p.recordPitReplay(inputs, options), restored = p.deserializePitReplay(p.serializePitReplay(replay));
  assert.equal(restored.engineVersion, 16); assert.deepEqual(p.playPitReplay(restored), state);
});
