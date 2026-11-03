import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { build } from 'esbuild';

const bundle = await build({ stdin: { contents: [
  "export * from './app/game/systems/pitCombat';",
  "export * from './app/game/systems/pitAuthoredMovesetsV92';",
  "export * from './app/game/systems/pitReplay';",
  "export * from './app/game/systems/pitUserRoster';",
  "export * from './app/game/hunterSpriteMotion';",
  "export * from './app/game/systems/pitTraining';",
  "export * from './app/pit-lab/pitLabProduction';",
].join('\n'), resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false,
  platform: 'node', format: 'esm', logLevel: 'silent' });
const p = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const plain = value => JSON.parse(JSON.stringify(value));
const refs = { ahab: 'ahab-avec-casque-0c8ceb1c95', samurai: 'samurai-avec-casque-d75f93b15e' };
function bout(id, attack, distance, opponentInput = {}, legacy = false) {
  let state = p.createPitCombatState(id, 'jungle-hunter', { movesets: legacy ? 'legacy' : 'current', mode: 'training' });
  state.fighters[0].x = 300; state.fighters[1].x = 300 + distance;
  const events = [], effects = [], phases = [];
  for (let tick = 0; tick < 100; tick++) {
    state = p.stepPitCombat(state, [{ attack: tick === 0 ? attack : undefined }, opponentInput]);
    events.push(...plain(state.events)); effects.push(...plain(state.techniqueEffects));
    phases.push(state.fighters[0].phase);
  }
  return { state, events, effects, phases };
}

test('new duels assign only exact owned Ahab/Samurai recipes without rewriting historical registries', () => {
  const before = JSON.stringify(p.PIT_FIGHTERS), beforeUsers = JSON.stringify(p.PIT_USER_FIGHTERS);
  for (const [fighterId, expected] of [['user-ahab', 'ahab-spear-contact-v92'], ['user-samurai', 'samurai-katana-contact-v92']]) {
    for (const variant of p.getPitFighterVariants(fighterId)) {
      const state = p.createPitCombatState(fighterId, 'jungle-hunter', { variants: [variant.id, null] });
      assert.equal(state.version, 11);
      assert.equal(state.fighters[0].movesetId, expected);
      assert.equal(state.fighters[0].variantId, variant.id);
      assert.equal(p.getPitCombatFighterDefinition(state.fighters[0]).technique.id, expected);
      assert.equal(p.getPitAuthoredMovesetV92(fighterId, variant.id).certifiedOneToOne, false);
    }
  }
  assert.equal(p.getPitAuthoredMovesetV92('user-ahab', refs.samurai), null);
  assert.equal(p.getPitAuthoredMovesetV92('user-samurai', refs.ahab), null);
  assert.equal(p.getPitAuthoredMovesetV92('user-oni', refs.samurai), null);
  const unaffected = p.createPitCombatState('user-warp-adjutant', 'jungle-hunter');
  assert.equal(unaffected.fighters[0].movesetId, undefined);
  assert.equal(p.getPitCombatFighterDefinition(unaffected.fighters[0]).technique.id, 'user-balanced-contact-counter');
  assert.equal(JSON.stringify(p.PIT_FIGHTERS), before); assert.equal(JSON.stringify(p.PIT_USER_FIGHTERS), beforeUsers);
});

test('Ahab medium uses a real longer contact hitbox, not a renamed shared strike or projectile', () => {
  const current = bout('user-ahab', 'medium', 140), old = bout('user-ahab', 'medium', 140, {}, true);
  assert(current.events.some(event => event.type === 'hit' && event.attack === 'medium'));
  assert.equal(old.events.some(event => event.type === 'hit'), false);
  assert.equal(current.effects.length, 0);
  assert.equal(current.phases.filter(phase => phase === 'startup').length, 11);
  assert.equal(current.phases.filter(phase => phase === 'active').length, 3);
  const miss = bout('user-ahab', 'medium', 220);
  assert.equal(miss.events.some(event => event.type === 'hit'), false);
  assert.equal(miss.phases.filter(phase => phase === 'recovery').length, 20, 'whiff cannot cancel or shorten commitment');
});

test('the remaining199 runtime recipes stay byte-equivalent and no extension, boss, guest or original receives these weapons', () => {
  const owners = new Set(['user-ahab', 'user-samurai']);
  assert.equal(Object.keys(p.PIT_FIGHTERS).length, 201);
  let unchanged = 0;
  for (const [id, definition] of Object.entries(p.PIT_FIGHTERS)) {
    if (owners.has(id)) continue;
    assert.deepEqual(plain(p.getPitCurrentFighterDefinition(id)), plain(definition), id);
    assert.equal(p.getPitAuthoredMovesetV92(id, refs.ahab), null, id);
    assert.equal(p.getPitAuthoredMovesetV92(id, refs.samurai), null, id);
    unchanged++;
  }
  assert.equal(unchanged, 199);
});

test('Ahab technique thrust contacts an idle opponent and stays attached with no gun, wave or autonomous spear', () => {
  const current = bout('user-ahab', 'technique', 145), old = bout('user-ahab', 'technique', 145, {}, true);
  assert(current.events.some(event => event.type === 'hit' && event.attack === 'technique'));
  assert.equal(old.events.some(event => event.type === 'hit'), false, 'the historical imported recipe is a short counter');
  const whiff = bout('user-ahab', 'technique', 220);
  assert(whiff.effects.length > 0, 'observe the contact volume before it is consumed by a hit');
  assert(whiff.effects.every(effect => effect.techniqueId === 'ahab-spear-contact-v92' && effect.bolt === undefined));
  const definition = p.PIT_AUTHORED_MOVESETS_V92['ahab-spear-contact-v92'];
  assert.equal(definition.technique.motion, 'attached'); assert.equal(definition.technique.speed, 0);
  assert.equal(definition.technique.status, null); assert.equal(definition.technique.guardBreak, false);
  assert.equal(current.events.filter(event => event.type === 'hit').length, 1);
  assert.equal(current.state.techniqueEffects.length, 0);
});

test('Ahab low spear sweep and high Samurai heavy genuinely require different guard levels', () => {
  const high = bout('user-ahab', 'heavy', 100, { guardHigh: true });
  const low = bout('user-ahab', 'heavy', 100, { guardLow: true });
  assert(high.events.some(event => event.type === 'hit' && event.attack === 'heavy'));
  assert(low.events.some(event => event.type === 'block' && event.attack === 'heavy'));
  assert.equal(low.events.some(event => event.type === 'hit'), false);
  const swordHigh = bout('user-samurai', 'heavy', 80, { guardHigh: true });
  const swordLow = bout('user-samurai', 'heavy', 80, { guardLow: true });
  assert(swordHigh.events.some(event => event.type === 'block'));
  assert(swordLow.events.some(event => event.type === 'hit'));
});

test('Samurai katana counter requires an actual incoming contact and never hurts idle targets or distant attacks', () => {
  const empty = bout('user-samurai', 'technique', 75);
  assert.equal(empty.events.some(event => event.type === 'hit'), false);
  const counter = bout('user-samurai', 'technique', 75, { attack: 'medium' });
  assert(counter.events.some(event => event.type === 'hit' && event.attackerId === 'user-samurai' && event.attack === 'technique'));
  assert.equal(counter.events.some(event => event.type === 'hit' && event.attackerId === 'jungle-hunter'), false);
  const far = bout('user-samurai', 'technique', 220, { attack: 'medium' });
  assert.equal(far.events.some(event => event.type === 'hit'), false);
  assert.equal(counter.state.techniqueEffects.length, 0);
});

test('interrupting a new attached contact removes its volume instead of leaving a damaging loose weapon', () => {
  let state = p.createPitCombatState('user-ahab', 'jungle-hunter');
  state.fighters[0].x = 300; state.fighters[1].x = 560;
  for (let tick = 0; tick < 17; tick++) state = p.stepPitCombat(state, [{ attack: tick === 0 ? 'technique' : undefined }, {}]);
  assert.equal(state.techniqueEffects.length, 1);
  state.fighters[0].phase = 'hitstun'; state.fighters[0].action = null; state.fighters[0].stunFrames = 10;
  state = p.stepPitCombat(state, [{}, {}]);
  assert.equal(state.techniqueEffects.length, 0);
  assert.equal(state.events.some(event => event.type === 'hit'), false);
});

test('new active actions round-trip with their own durations and reject forged owners, variants and pre-V92 markers', () => {
  let state = p.createPitCombatState('user-ahab', 'jungle-hunter');
  state = p.stepPitCombat(state, [{ attack: 'medium' }, {}]);
  for (let tick = 0; tick < 9; tick++) state = p.stepPitCombat(state, [{}, {}]);
  assert.equal(state.fighters[0].phase, 'startup', 'V92 estoc startup differs from the shared move');
  assert.deepEqual(plain(p.deserializePitCombat(p.serializePitCombat(state))), plain(state));
  for (const mutate of [
    copy => { copy.fighters[0].movesetId = 'samurai-katana-contact-v92'; },
    copy => { copy.fighters[0].movesetId = '__proto__'; },
    copy => { copy.fighters[0].variantId = refs.samurai; },
    copy => { copy.version = 10; },
    copy => { copy.fighters[0].phase = 'active'; },
  ]) {
    const copy = plain(state); mutate(copy);
    assert.throws(() => p.deserializePitCombat(JSON.stringify(copy)), /Invalid or incompatible/);
  }
});

test('round transitions and training revives preserve the admitted recipe while legacy states stay legacy', () => {
  for (const movesets of ['current', 'legacy']) {
    let round = p.createPitCombatState('user-ahab', 'jungle-hunter', { movesets });
    const expected = round.fighters[0].movesetId;
    round.phase = 'round-over'; round.transitionFramesRemaining = 1;
    round = p.stepPitCombat(round, [{}, {}]);
    assert.equal(round.round, 2); assert.equal(round.fighters[0].movesetId, expected);
    let training = p.createPitCombatState('user-ahab', 'jungle-hunter', { mode: 'training', movesets });
    training.fighters[0].health = 0; training.fighters[0].phase = 'knockdown'; training.fighters[0].knockdownFrames = 1;
    training = p.stepPitCombat(training, [{}, {}]);
    assert.equal(training.fighters[0].health, p.PIT_FIGHTERS['user-ahab'].maxHealth);
    assert.equal(training.fighters[0].movesetId, expected);
  }
});

test('new two-equipment replay really records and reproduces the same contacts and complete state', () => {
  const options = { fighters: ['user-ahab', 'user-samurai'], seed: 92, rules: { mode: 'training' } };
  const frames = Array.from({ length: 420 }, (_, tick) => [
    { right: tick < 63, attack: [80, 145, 205, 260].includes(tick) ? tick === 205 ? 'heavy' : 'medium' : undefined },
    { left: tick < 62, attack: tick === 80 ? 'technique' : tick === 170 ? 'medium' : undefined },
  ]);
  const replay = p.recordPitReplay(frames, options);
  const direct = frames.reduce((state, inputs) => p.stepPitCombat(state, inputs),
    p.createPitCombatState(...options.fighters, options.rules));
  assert.equal(replay.engineVersion, 11); assert.equal(replay.version, 3);
  assert.deepEqual(plain(p.playPitReplay(replay)), plain(direct));
  assert(direct.fighters.some(fighter => fighter.health < p.PIT_FIGHTERS[fighter.definitionId].maxHealth));
  const tampered = plain(replay); tampered.engineVersion = 10;
  assert.equal(p.normalizePitReplay(tampered), null, 'new recipe cannot be relabelled as an old engine');
});

test('unchanged V91 engine10 Ahab/Samurai input archive preserves checksum, damage and full old recipe output', () => {
  const file = JSON.parse(fs.readFileSync('tests/fixtures/pit-replay-v91-user-equipment-v10.json', 'utf8'));
  const before = JSON.stringify(file), replay = p.normalizePitReplay(file.replay);
  assert.equal(file.provenance.sourceCommit, '1bee8ac');
  assert.equal(file.provenance.sourceSha256.pitCombat, '8170eb225f9130c5a47919cf688b150917829ba14a5ad9a0595e69c95496d36d');
  assert(replay); assert.equal(replay.engineVersion, 10); assert.equal(replay.metadata.checksum, 'c4308786');
  const initial = p.createPitReplayCombatState(replay);
  assert(initial.fighters.every(fighter => fighter.movesetId === undefined));
  assert(initial.fighters.every(fighter => p.getPitCombatFighterDefinition(fighter).technique.id === 'user-balanced-contact-counter'));
  const state = plain(p.playPitReplay(replay));
  assert.equal(state.version, 11, 'only the state container version advances; archived checksum canonicalizes engine10');
  state.version = 10;
  assert.deepEqual(state, file.finalState, 'compare every actor, resource, action, event and numeric output against the frozen published engine');
  assert.equal(JSON.stringify(file), before, 'no fixture normalization or rewrite');
});

test('V91 active Ahab checkpoint resumes legacy timing beyond a current-rematch boundary', () => {
  const file = JSON.parse(fs.readFileSync('tests/fixtures/pit-checkpoint-v91-ahab-active-v10.json', 'utf8'));
  const before = JSON.stringify(file);
  assert.equal(file.checkpoint.version, 10); assert.equal(file.checkpoint.fighters[0].action.frame, 9);
  assert.equal(file.checkpoint.fighters[0].phase, 'active', 'old shared startup is8; new spear startup is11');
  let restored = p.deserializePitCombat(JSON.stringify(file.checkpoint));
  assert.equal(restored.fighters[0].movesetId, undefined);
  const readout = p.getPitTrainingFrameReadout(restored, 0);
  assert.equal(readout.phaseTotalFrames, 4); assert.equal(readout.actionTotalFrames, 27);
  for (let tick = 0; tick < file.continuationTicks; tick++) restored = p.stepPitCombat(restored, [{}, {}]);
  const actual = plain(restored); actual.version = 10;
  assert.deepEqual(actual, file.resumed);
  assert.equal(p.resetPitTrainingPositions(restored).fighters[0].movesetId, undefined, 'training reset does not silently change imported recipe');
  assert.equal(p.rematchPitCombat(restored).fighters[0].movesetId, 'ahab-spear-contact-v92', 'only a fresh rematch admits the current equipment recipe');
  assert.equal(JSON.stringify(file), before);
});

test('real sprite-phase adapter and training readout follow admitted spear frames without claiming a new drawing', () => {
  let state = p.createPitCombatState('user-ahab', 'jungle-hunter', { mode: 'training' });
  state = p.stepPitCombat(state, [{ attack: 'medium' }, {}]);
  for (let tick = 0; tick < 9; tick++) state = p.stepPitCombat(state, [{}, {}]);
  const motion = p.describePitHunterSpriteMotion(state.fighters[0], state.frame);
  assert.equal(motion.clipId, 'pit.stand.medium.startup');
  assert.equal(motion.durationTicks, 11);
  const readout = p.getPitTrainingFrameReadout(state, 0);
  assert.match(readout.actionLabel, /Estoc de lance/); assert.equal(readout.actionTotalFrames, 34);
  assert.equal(readout.phaseTotalFrames, 11);
  const reset = p.resetPitTrainingPositions(state);
  assert.equal(reset.fighters[0].movesetId, 'ahab-spear-contact-v92');
  assert.equal(reset.fighters[0].action, null);
});

test('every published fixed replay V4–V9 remains accepted with its original engine and checksum', () => {
  for (const name of ['pit-replay-v4-throw', 'pit-replay-v5-reserve-throw', 'pit-replay-v6-tracker-counter',
    'pit-replay-v56-falconer-v7', 'pit-replay-v57-feral-v8', 'pit-replay-v58-feral-v9']) {
    const file = JSON.parse(fs.readFileSync(`tests/fixtures/${name}.json`, 'utf8'));
    const archive = file.replay ?? file;
    const replay = p.normalizePitReplay(archive);
    assert(replay, name); assert.equal(replay.engineVersion, archive.engineVersion);
    assert.equal(replay.metadata.checksum, archive.metadata.checksum);
    const state = p.playPitReplay(archive);
    assert(state.fighters.every(fighter => fighter.movesetId === undefined));
  }
});

test('actual production lab uses exact current variant timing and preserves old calls without appearance admission', () => {
  const clip = id => ({ id, facing: 'right', status: 'validated', ticksPerSecond: 60, loop: false,
    frames: [ { pageId: 'native', rect: [0,0,128,256], pivot: [64,250], durationTicks: 1 },
      { pageId: 'native', rect: [128,0,128,256], pivot: [64,250], durationTicks: 1 } ] });
  const startup = clip('pit.stand.medium.startup');
  assert.deepEqual([0,1].map(index => p.getPitLabFrameTicks('user-ahab', startup, index, refs.ahab)), [6,5]);
  assert.deepEqual([0,1].map(index => p.getPitLabFrameTicks('user-ahab', startup, index)), [4,4], 'unversioned old inspector calls remain at the historical8 ticks');
  const active = clip('pit.stand.medium.active');
  const current = p.createPitLabFrame('user-ahab', active, 0, refs.ahab);
  assert.equal(current.fighter.movesetId, 'ahab-spear-contact-v92');
  assert.equal(current.fighter.action.frame, 11);
  assert.equal(p.describePitHunterSpriteMotion(current.fighter, current.tick).clipId, active.id);
  const old = p.createPitLabFrame('user-ahab', active, 0);
  assert.equal(old.fighter.movesetId, undefined); assert.equal(old.fighter.action.frame, 8);
  assert.equal(p.describePitHunterSpriteMotion(old.fighter, old.tick).clipId, active.id);
  const sword = clip('pit.stand.technique.samurai-katana-contact-v92.active');
  assert.deepEqual([0,1].map(index => p.getPitLabFrameTicks('user-samurai', sword, index, refs.samurai)), [4,4]);
  const samurai = p.createPitLabFrame('user-samurai', sword, 1, refs.samurai);
  assert.equal(samurai.fighter.action.frame, 10);
  assert.equal(p.describePitHunterSpriteMotion(samurai.fighter, samurai.tick).techniqueId, 'samurai-katana-contact-v92');
  assert.throws(() => p.createPitLabFrame('user-ahab', active, 0, refs.samurai), /Apparence étrangère/);
});
