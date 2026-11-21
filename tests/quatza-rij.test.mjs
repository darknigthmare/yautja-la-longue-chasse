import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';
import { playShipAcquisitionV161 } from './helpers/ship-receipt-v161.mjs';
import { formationCampaignRoute } from './helpers/solo-v90-played-route.mjs';
import { playQuatzaAbsence, playQuatzaRescue } from './helpers/quatza-triage-route.mjs';

const qa = homeworldSceneSsrV78();
const engine = qa.load('app/game/systems/quatzaRij.ts');
const saves = qa.load('app/game/save.ts');
const { MISSIONS } = qa.load('app/game/data.ts');
const owner = '2026-11-21T12:00:00.000Z';
const { QUATZA_INPUT: I, QUATZA_POSTS: P } = engine;

function adult() {
  const save = saves.defaultSave(owner);
  save.profile = { ...save.profile, honor: 2000, rankId: 'blooded', acquiredRankIdV166: 'blooded' };
  for (const mission of MISSIONS) save.missionProgress[mission.id] = {
    ...save.missionProgress[mission.id], status: 'completed', attempts: 1, completions: 1,
  };
  return save;
}

function commit(save, command) {
  const previous = JSON.stringify(save);
  const result = engine.commitQuatzaRij(save, command);
  assert(result.ok, result.message);
  assert.equal(JSON.stringify(save), previous, 'command leaves the earlier save untouched');
  return { ...save, quatzaRij: result.state };
}

function playing(mode, kit = 'mobility') {
  let frame = engine.createQuatzaFrame(mode);
  const input = [];
  function step(code = 0) {
    const next = engine.stepQuatza(mode, frame, code);
    if (next !== frame) input.push(code);
    frame = next;
  }
  const key = bit => { step(); step(bit); step(); };
  function walk(target, tolerance = 4) {
    for (let n = 0; n < 400 && Math.abs(frame.player.x - target) > tolerance; n++) {
      step(frame.player.x < target ? I.right : I.left);
    }
    assert(Math.abs(frame.player.x - target) <= tolerance, 'ordinary movement arrived at ' + target);
  }
  function post(x) { walk(x); key(I.interact); }
  function prepare() {
    post(P.rack); post(P.map);
    if (mode === 'solo') post(kit === 'care' ? P.care : P.mobility);
    post(P.departure);
    assert.equal(frame.phase, 'field');
  }
  function fight() {
    post(P.trail);
    walk(845);
    const phases = new Set(), hits = [];
    for (let n = 0; n < 3900 && frame.phase === 'field' && frame.beast.stage !== 'dead'; n++) {
      const { beast, player, companions } = frame;
      phases.add(beast.stage);
      const distance = Math.abs(beast.x - player.x);
      const ready = bit => !(frame.previous & bit);
      if (mode === 'triad' && distance < 400 && ready(I.signal) &&
          (!frame.approachCalled || companions[0].contribution && !frame.blockCalled)) {
        step(I.signal);
      } else if (beast.stage === 'recover' && player.y > 368 && distance <= 122 &&
          player.cooldown === 0 && ready(I.strike) && companions.every(ally => ally.contribution)) {
        step(I.strike);
        hits.push(frame.beast.health);
      } else if ((beast.stage === 'warning' && beast.remaining < 16 && distance < 190 ||
          beast.stage === 'charge' && distance < 130) && player.vy === 0 && ready(I.jump)) {
        step(I.jump);
      } else {
        step(beast.stage !== 'charge' && distance > 103 ? beast.x > player.x ? I.right : I.left : 0);
      }
    }
    assert.equal(frame.beast.stage, 'dead');
    assert(phases.has('warning') && phases.has('charge') && phases.has('recover'));
    assert.equal(hits.at(-1), 0);
  }
  return { get frame() { return frame; }, input, step, key, walk, post, prepare, fight,
    gatherAndReturn() {
      walk(frame.beast.x, 35);
      for (let n = 0; n < 100 && frame.player.y < 385; n++) step();
      key(I.interact); assert.equal(frame.hide, true); assert.equal(frame.skull, false);
      key(I.interact); assert.equal(frame.skull, true);
      walk(P.refuge);
      for (let n = 0; n < 100 && frame.player.y < 385; n++) step();
      key(I.interact); assert.equal(frame.phase, 'return');
      post(P.witness);
      assert.equal(frame.phase, 'delivered');
    },
  };
}
function persistInputs(save, mode, input) {
  for (let offset = 0; offset < input.length; offset += 64) {
    const command = { type: 'advance', mode, expectedAttempts: 1, expectedTick: offset, input: input.slice(offset, offset + 64) };
    save = commit(save, command);
    assert.deepEqual(commit(save, command).quatzaRij, save.quatzaRij, 'exact replay acknowledgement is idempotent');
  }
  return save;
}

test('solo requires the actual V89 hull entry and eight missions, then a physical kit choice', () => {
  const profile = adult();
  assert.equal(engine.canEnterQuatza(profile, 'solo'), false);
  const rights = playShipAcquisitionV161(qa, profile, 'rights');
  assert.equal(engine.canEnterQuatza(rights, 'solo'), false);
  const owned = playShipAcquisitionV161(qa, profile);
  assert.equal(engine.canEnterQuatza(owned, 'solo'), true);
  assert.equal(owned.loadout.weaponIds.includes('wristblades'), false, 'The rack verifies possessions, not the travelling set.');
  const unarmed = { ...owned, inventory: { ...owned.inventory,
    unlockedWeaponIds: owned.inventory.unlockedWeaponIds.filter(item => item !== 'wristblades') } };
  assert.equal(engine.canEnterQuatza(unarmed, 'solo'), false);
  const locked = structuredClone(owned);
  locked.missionProgress[MISSIONS[0].id].status = 'available';
  assert.equal(engine.canEnterQuatza(locked, 'solo'), false);
  const run = playing('solo', 'care');
  run.post(P.map);
  assert.equal(run.frame.route, false);
  run.prepare();
  assert.equal(run.frame.checked, true);
  assert.equal(run.frame.route, true);
  assert.equal(run.frame.kit, 'care');
  const preparation = persistInputs(commit(owned, { type: 'begin', mode: 'solo', expectedAttempts: 0 }), 'solo', run.input);
  const resumed = saves.parseSaveImport(saves.exportSave(preparation));
  assert(resumed.save, resumed.failure);
  assert.deepEqual(resumed.save.quatzaRij, preparation.quatzaRij);
});

test('real triad replay resolves separately placed roles, both trophies and witness return', () => {
  const { save: origin } = formationCampaignRoute();
  assert.equal(engine.canEnterQuatza(origin, 'triad'), true);
  assert.equal(engine.canEnterQuatza(origin, 'solo'), false);
  const run = playing('triad');
  run.prepare(); run.fight();
  assert.equal(run.frame.companions.length, 2);
  assert(run.frame.companions.every(ally => ally.contribution && ally.health > 0));
  run.gatherAndReturn();
  const save = persistInputs(commit(origin, { type: 'begin', mode: 'triad', expectedAttempts: 0 }), 'triad', run.input);
  assert.equal(engine.hasQuatzaReturn(save.quatzaRij, save.createdAt, 'triad'), true);
  assert.equal(engine.hasQuatzaReturn(save.quatzaRij, save.createdAt, 'solo'), false);
  assert.deepEqual(save.prologue, origin.prologue);
  const restored = saves.parseSaveImport(saves.exportSave(save));
  assert(restored.save, restored.failure);
  assert.deepEqual(restored.save.quatzaRij, save.quatzaRij);
});

test('witnesses record either triad presentation order once and preserve the completed field replay', () => {
  const { save: origin } = formationCampaignRoute();
  const begun = commit(origin, { type: 'begin', mode: 'triad', expectedAttempts: 0 });
  const choice = (subject, expectedPresentations) => ({
    type: 'present-return', mode: 'triad', expectedAttempts: 1, expectedPresentations, subject,
  });
  assert.equal(engine.commitQuatzaRij(begun, choice('companions', 0)).ok, false);
  const played = playing('triad');
  played.prepare(); played.fight(); played.gatherAndReturn();
  const delivered = persistInputs(begun, 'triad', played.input);
  assert.equal(delivered.quatzaRij.expeditions.triad.presentations, undefined);
  const originalAttempts = delivered.quatzaRij.expeditions.triad.attempts;
  const oldRoundtrip = saves.parseSaveImport(saves.exportSave(delivered));
  assert(oldRoundtrip.save, oldRoundtrip.failure);
  assert.equal(oldRoundtrip.save.quatzaRij.expeditions.triad.presentations, undefined);

  for (const order of [['companions', 'trophy'], ['trophy', 'companions']]) {
    const first = commit(oldRoundtrip.save, choice(order[0], 0));
    assert.equal(engine.isQuatzaRijSuccessor(delivered.quatzaRij, first.quatzaRij), true);
    assert.equal(engine.commitQuatzaRij(first, choice(order[1], 0)).ok, false);
    assert.equal(engine.commitQuatzaRij(first, choice(order[0], 1)).ok, false);
    const loaded = saves.parseSaveImport(saves.exportSave(first));
    assert(loaded.save, loaded.failure);
    const second = commit(loaded.save, choice(order[1], 1));
    assert.equal(engine.isQuatzaRijSuccessor(first.quatzaRij, second.quatzaRij), true);
    assert.equal(engine.isQuatzaRijSuccessor(delivered.quatzaRij, second.quatzaRij), false);
    assert.deepEqual(second.quatzaRij.expeditions.triad.presentations, order);
    assert.deepEqual(second.quatzaRij.expeditions.triad.attempts, originalAttempts);
    assert.deepEqual(second.profile, delivered.profile);
    assert.deepEqual(second.inventory, delivered.inventory);
    assert.deepEqual(second.prologue, delivered.prologue);
    assert.equal(engine.commitQuatzaRij(second, choice(order[1], 2)).ok, false);
    const duplicate = structuredClone(second);
    duplicate.quatzaRij.expeditions.triad.presentations = [order[0], order[0]];
    assert.equal(saves.parseSaveImport(JSON.stringify(duplicate)).failure, 'invalid-save');
  }
  const premature = structuredClone(begun);
  premature.quatzaRij.expeditions.triad.presentations = ['trophy'];
  assert.equal(saves.parseSaveImport(JSON.stringify(premature)).failure, 'invalid-save');
});

test('solo returns the same trophies after independent attack cycles and rejects receipt tampering', () => {
  const owned = playShipAcquisitionV161(qa, adult());
  const run = playing('solo');
  run.prepare(); assert.equal(run.frame.kit, 'mobility');
  run.fight(); run.gatherAndReturn();
  assert.deepEqual(run.frame.companions, []);
  const save = persistInputs(commit(owned, { type: 'begin', mode: 'solo', expectedAttempts: 0 }), 'solo', run.input);
  const restored = saves.parseSaveImport(saves.exportSave(save));
  assert(restored.save, restored.failure);
  assert(engine.hasQuatzaReturn(restored.save.quatzaRij, owned.createdAt, 'solo'));
  const forged = structuredClone(save);
  forged.quatzaRij.expeditions.solo.attempts[0].input = [];
  assert.equal(saves.parseSaveImport(JSON.stringify(forged)).failure, 'invalid-save');
  delete forged.shipAcquisitionV89;
  assert.equal(engine.quatzaCampaignMatchesSave(forged), false);
});

test('retreat preserves the preceding outcome and a stale checkpoint cannot advance the new hunt', () => {
  const save = playShipAcquisitionV161(qa, adult());
  const command = { type: 'begin', mode: 'solo', expectedAttempts: 0 };
  const begun = commit(save, command);
  assert.deepEqual(commit(begun, command), begun);
  const run = playing('solo');
  run.prepare(); run.post(P.refuge);
  assert.equal(run.frame.phase, 'retreated');
  const retreated = persistInputs(begun, 'solo', run.input);
  assert.equal(engine.hasQuatzaReturn(retreated.quatzaRij, save.createdAt, 'solo'), false);
  const retry = commit(retreated, { ...command, expectedAttempts: 1 });
  assert.equal(retry.quatzaRij.expeditions.solo.attempts.length, 2);
  const stale = { type: 'advance', mode: 'solo', expectedAttempts: 1, expectedTick: 0, input: [I.left] };
  assert.equal(engine.commitQuatzaRij(retry, stale).ok, false);
  assert.equal(engine.inspectQuatzaRij(retreated.quatzaRij, save.createdAt).status, 'valid');
  assert.equal(engine.inspectQuatzaRij({ ...retreated.quatzaRij, version: 2 }, save.createdAt).status, 'future-version');
});

test('original Quatza sheet and separate field trophies retain their runtime dimensions', () => {
  for (const [name, width, height] of [['poses', 1104, 336], ['hide', 164, 120], ['skull', 164, 120]]) {
    const binary = readFileSync('public/game/quatza-rij/' + name + '.png');
    assert.equal(binary.toString('ascii', 12, 16), 'IHDR');
    assert.equal(binary.readUInt32BE(16), width);
    assert.equal(binary.readUInt32BE(20), height);
  }
});

test('an actual missing companion opens a separate, resumable rescue with no trophy or rank', () => {
  const { save: origin } = formationCampaignRoute();
  const begin = expectedAttempts => ({ type: 'begin', mode: 'triad', expectedAttempts });
  const open = { type: 'begin-rescue', mode: 'triad', expectedAttempts: 1 };
  const begun = commit(origin, begin(0));
  assert.equal(engine.commitQuatzaRij(begun, open).ok, false);
  const hunt = playQuatzaAbsence(engine);
  const retreated = persistInputs(begun, 'triad', hunt.input);
  const last = save => save.quatzaRij.expeditions.triad.attempts.at(-1);
  assert.equal(last(retreated).phase, 'retreated');
  assert.equal(engine.canRetryQuatza('triad', last(retreated)), false);
  assert.equal(engine.commitQuatzaRij(retreated, begin(1)).ok, false);
  assert.equal(engine.commitQuatzaRij(retreated, {
    type: 'present-return', mode: 'triad', expectedAttempts: 1, subject: 'companions', expectedPresentations: 0,
  }).ok, false);
  const legacy = structuredClone(retreated);
  delete last(legacy).rescueRules;
  assert(engine.canRetryQuatza('triad', last(legacy)));
  const restoredLegacy = saves.parseSaveImport(saves.exportSave(legacy));
  assert(restoredLegacy.save, restoredLegacy.failure);
  assert.deepEqual(last(restoredLegacy.save), last(legacy));
  assert(engine.commitQuatzaRij(legacy, open).ok);

  let save = commit(retreated, open);
  assert(engine.isQuatzaRijSuccessor(retreated.quatzaRij, save.quatzaRij));
  const id = last(save).rescue.id;
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(engine.commitQuatzaRij(save, open).ok, false);
  const operation = playQuatzaRescue(engine, hunt.frame);
  const advance = (expectedTick, input, nextId = id) => ({
    type: 'advance-rescue', mode: 'triad', expectedAttempts: 1, id: nextId, expectedTick, input,
  });
  assert.equal(engine.commitQuatzaRij(save, advance(0, operation.input.slice(0, 1), id.replace(/^./, 'e'))).ok, false);
  assert.equal(engine.commitQuatzaRij(save, advance(0, [I.jump])).ok, false);
  const starts = [0, operation.admissionTick, operation.carryTick, operation.input.length];
  for (let leg = 0; leg < starts.length - 1; leg++) {
    for (let tick = starts[leg]; tick < starts[leg + 1]; tick += 60) {
      const command = advance(tick, operation.input.slice(tick, Math.min(tick + 60, starts[leg + 1])));
      const next = commit(save, command);
      assert(engine.isQuatzaRijSuccessor(save.quatzaRij, next.quatzaRij));
      assert.deepEqual(commit(next, command), next);
      assert.equal(engine.commitQuatzaRij(next, advance(tick, [I.signal])).ok, false);
      const imported = saves.parseSaveImport(saves.exportSave(next));
      assert(imported.save, imported.failure);
      save = imported.save;
    }
  }
  assert.equal(last(save).rescue.phase, 'reunited');
  assert.equal(last(save).phase, 'retreated');
  assert.deepEqual(last(save).input, hunt.input);
  assert.deepEqual(engine.replayQuatzaRescue(hunt.frame, last(save).rescue.input), operation.frame);
  assert.equal(engine.hasQuatzaReturn(save.quatzaRij, save.createdAt, 'triad'), false);
  assert.deepEqual(save.profile, retreated.profile);
  assert.deepEqual(save.prologue, retreated.prologue);
  assert.deepEqual(save.inventory, retreated.inventory);
  assert.deepEqual(save.trophies, retreated.trophies);
  const forged = structuredClone(save);
  last(forged).rescue.id = '00000000-0000-8000-a000-000000000000';
  assert.equal(saves.parseSaveImport(JSON.stringify(forged)).failure, 'invalid-save');
  last(forged).rescue.id = id;
  last(forged).rescue.input = [];
  assert.equal(saves.parseSaveImport(JSON.stringify(forged)).failure, 'invalid-save');
  const retry = commit(save, begin(1));
  assert(engine.isQuatzaRijSuccessor(save.quatzaRij, retry.quatzaRij));
  assert.deepEqual(retry.quatzaRij.expeditions.triad.attempts[0], last(save));
  assert.equal(engine.commitQuatzaRij(retry, advance(operation.frame.tick, [0])).ok, false);
});
