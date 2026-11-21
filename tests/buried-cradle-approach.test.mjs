import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const approach = qa.load('app/game/systems/buriedCradleApproach.ts');
const campaign = qa.load('app/game/systems/buriedCradleCampaign.ts');
const saves = qa.load('app/game/save.ts');
const { MISSIONS } = qa.load('app/game/data.ts');
const { createCradleApproachRun: create, advanceCradleApproach: advance,
  buildCradleApproachReceipt: finish, parseCradleApproachReceipt: parse } = approach;
const owner = '2026-11-21T05:00:00.000Z';
const ship = 'classic-predator-spaceship';
const sameShip = { personalShipId: ship, ownedShipIds: [ship] };

function walk(run, steps) {
  const direction = steps < 0 ? 'left' : 'right';
  for (let i = 0; i < Math.abs(steps); i++) run = advance(run, direction);
  return run;
}
function preparedRoute() {
  let run = create();
  for (const steps of [2, 5, 5]) run = advance(walk(run, steps), 'observe');
  return run;
}
function adult() {
  const save = saves.defaultSave(owner);
  for (const mission of MISSIONS) {
    save.missionProgress[mission.id] = { ...save.missionProgress[mission.id], status: 'completed', attempts: 1, completions: 1 };
  }
  return save;
}
function submit(save, action, context = sameShip) {
  return campaign.actBuriedCradleCampaign(save, action, context);
}

test('preparation blocks the trail and checks every station at the actual position', () => {
  const initial = create();
  assert.equal(initial.x, 80);
  assert.equal(advance(initial, 'observe'), initial);
  assert.equal(advance(initial, 'scout'), initial);
  const barrier = walk(initial, 100);
  assert.equal(barrier.x, 195);
  assert.equal(finish(barrier), null);
  const first = advance(barrier, 'observe');
  assert.deepEqual(first.observations, [{ id: 'risks', x: 195 }]);
  assert.equal(advance(first, 'observe'), first);
  assert.equal(walk(first, 100).x, 395);
  const ready = preparedRoute();
  assert.deepEqual(finish(ready), { version: 1, route: 'direct', returnX: 560, observations: [
    { id: 'risks', x: 160 }, { id: 'container', x: 360 }, { id: 'beacon', x: 560 },
  ] });
  assert.equal(finish(walk(ready, -1)), null);
  assert.equal(walk(ready, 100).x, 595);
});

test('the scouting branch must observe the trace and carry it back to the beacon', () => {
  const ready = preparedRoute();
  assert.equal(advance(walk(ready, -1), 'scout').scouting, false);
  const scouting = advance(ready, 'scout');
  assert.equal(finish(scouting), null);
  const tracePosition = walk(scouting, 6);
  assert.equal(tracePosition.x, 800);
  const trace = advance(tracePosition, 'observe');
  assert.equal(finish(trace), null);
  assert.equal(finish(walk(trace, -5)), null);
  const receipt = finish(walk(trace, -6));
  assert.equal(receipt.route, 'reconnaissance');
  assert.equal(receipt.returnX, 560);
  assert.deepEqual(receipt.observations[3], { id: 'trace', x: 800 });
});

test('only the exact local report can be used as expedition preparation', () => {
  const receipt = finish(preparedRoute());
  for (const edited of [
    { ...receipt, route: 'reconnaissance' },
    { ...receipt, returnX: 596 },
    { ...receipt, observations: [...receipt.observations].reverse() },
    { ...receipt, observations: [{ id: 'risks', x: 196 }, ...receipt.observations.slice(1)] },
    { ...receipt, observations: [{ id: 'risks', x: '160' }, ...receipt.observations.slice(1)] },
    { ...receipt, observations: [{ id: 'risks', x: 160, visited: true }, ...receipt.observations.slice(1)] },
    { ...receipt, owner },
  ]) {
    assert.equal(parse(edited), null);
    assert.equal(submit(adult(), { type: 'prepare', approach: edited }).accepted, false);
  }
  const valid = parse(receipt);
  assert.notEqual(valid, receipt);
  assert.notEqual(valid.observations[0], receipt.observations[0]);
  assert.equal(submit(saves.defaultSave(owner), { type: 'prepare', approach: receipt }).accepted, false);
  assert.equal(submit(adult(), { type: 'prepare', approach: receipt }, { personalShipId: ship, ownedShipIds: [] }).accepted, false);
});

test('a prepared route round-trips and survives departure without granting rank or a crown', () => {
  const receipt = finish(preparedRoute());
  const original = adult();
  const prepared = submit(original, { type: 'prepare', approach: receipt });
  assert.equal(prepared.accepted, true);
  assert.equal(prepared.state.status, 'prepared');
  assert.equal(prepared.state.ownerCreatedAt, owner);
  assert.equal(prepared.state.personalShipId, ship);
  assert.deepEqual(prepared.state.approach, receipt);
  assert.equal(prepared.state.crownDelivered, false);
  const save = { ...original, buriedCradle: prepared.state };
  const imported = saves.parseSaveImport(saves.exportSave(save)).save;
  assert.deepEqual(imported.buriedCradle.approach, receipt);
  assert.deepEqual(imported.profile, saves.normalizeSave(original).profile);
  assert.equal(submit(imported, { type: 'prepare', approach: receipt }).accepted, false);
  const field = submit(imported, { type: 'depart' });
  assert.equal(field.state.status, 'active');
  assert.deepEqual(field.state.approach, receipt);
  const view = raw => campaign.inspectBuriedCradleCampaign(raw, owner).status;
  assert.equal(view({ ...prepared.state, approach: null }), 'invalid-save');
  assert.equal(view({ ...prepared.state, approach: { ...receipt, version: 2 } }), 'future-version');
  const previous = { ...prepared.state }; delete previous.approach;
  assert.equal(view(previous), 'valid');
  assert.equal(submit({ ...original, buriedCradle: previous }, { type: 'depart' }).accepted, true);
});
