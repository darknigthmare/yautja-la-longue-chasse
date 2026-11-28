import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';
import { forgeDeliveryQaGuidance } from '../scripts/mobility-qa-driver.mjs';

const qa = homeworldSceneSsrV78();
const ledger = qa.load('app/game/systems/mobility/ledger.ts');
const course = qa.load('app/game/systems/mobility/course.ts');
const catalogue = qa.load('app/game/systems/mobility/catalogue.ts');
const saves = qa.load('app/game/save.ts');
const { MobilityDriveController } = qa.load('app/game/systems/mobility/controller.ts');
const OWNER = '2026-11-28T10:00:00.000Z';
const MODEL = ledger.FORGE_DELIVERY_MODEL;
const START = { type: 'start', modelId: MODEL, loaned: false, route: 'forge-delivery' };
const BUY = { type: 'buy', modelId: MODEL, expectedCost: 420 };

function campaign() {
  const save = saves.defaultSave(OWNER);
  save.profile = { ...save.profile, clanMarks: 500, rankId: 'blooded', acquiredRankIdV166: 'blooded', honor: 300 };
  save.mobilityV1 = { ...ledger.createMobilityLedger(OWNER), circulationPermit: true };
  return save;
}

function command(save, order, allowed = true) {
  const before = JSON.stringify(save);
  const result = ledger.actMobility(save, {
    ...order, ownerCreatedAt: save.createdAt,
    expectedRevision: order.expectedRevision ?? save.mobilityV1?.revision ?? 0,
  });
  assert.equal(result.accepted, allowed, result.message);
  assert.equal(JSON.stringify(save), before);
  if (!allowed) {
    assert.equal(result.clanMarks, save.profile.clanMarks);
    return save;
  }
  return { ...save, mobilityV1: result.state, profile: { ...save.profile, clanMarks: result.clanMarks } };
}

test('only a paid personal motorcycle can start the delivery', () => {
  const initial = campaign();
  command({ ...initial, mobilityV1: undefined }, BUY, false);
  command(initial, START, false);
  command(initial, { ...START, modelId: 'scout_grav_sled', loaned: true }, false);
  command(initial, { ...BUY, expectedCost: 419 }, false);
  command({ ...initial, profile: { ...initial.profile, clanMarks: 419 } }, BUY, false);
  command({ ...initial, profile: { ...initial.profile, rankId: 'young-blood' } }, BUY, false);
  const bought = command(initial, BUY);
  assert.equal(bought.profile.clanMarks, 80);
  assert.equal(bought.mobilityV1.owned[0].acquiredBy, 'purchase');
  command(bought, BUY, false);
  command(bought, { ...START, expectedRevision: 0 }, false);
  command(bought, { ...START, route: 'other-route' }, false);
  const run = command(bought, START).mobilityV1.active;
  assert.equal(run.route, 'forge-delivery');
  assert.equal(run.modelId, MODEL);
  assert.equal(run.loaned, false);
});

test('route-specific loading and ordered unloading share the real driving physics', () => {
  const stopped = { throttle: 0, steer: 0, brake: true, boost: false, interact: true };
  const levels = catalogue.emptyMobilityLevels();
  const atWest = { ...course.createMobilityCourse(), x: 140, y: 130, checkpoint: 1 };
  const loaded = course.stepMobilityCourse(atWest, stopped, MODEL, levels, 'forge-delivery');
  assert.equal(loaded.cargoKg, 25);
  assert.equal(loaded.checkpoint, 2);
  assert.equal(course.stepMobilityCourse(atWest, stopped, MODEL, levels).cargoKg, 0);
  const atDepot = { ...loaded, x: 140, y: 490 };
  assert.equal(course.stepMobilityCourse(atDepot, stopped, MODEL, levels, 'forge-delivery').cargoKg, 25);
  const delivered = course.stepMobilityCourse({ ...atDepot, checkpoint: 3 }, stopped, MODEL, levels, 'forge-delivery');
  assert.equal(delivered.cargoKg, 0);
  assert.equal(delivered.cargoDelivered, true);
});

test('controller and campaign writer agree through a full route and a cold reload', () => {
  let save = command(command(campaign(), BUY), START);
  let controller = new MobilityDriveController(save.mobilityV1);
  const runId = save.mobilityV1.active.id;
  const status = () => controller.predicted;
  const write = order => {
    save = command(save, order);
    return { accepted: true, message: 'Confirmed', state: save.mobilityV1 };
  };
  let stage = 0, reloaded = false;
  for (let ticks = 0; ticks < 12000 && !course.mobilityCoursePassed(status()); ticks++) {
    const at = status();
    const { throttle, steer, brake, boost, interact, advance } = forgeDeliveryQaGuidance(at, stage);
    if (advance && stage !== 6 && (stage !== 1 || at.cargoKg === 25)) stage++;
    assert(controller.step({ throttle, steer, brake, boost, interact }));
    if (controller.pending.length === 30) assert(controller.flush(write), controller.message);
    if (!reloaded && status().cargoKg === 25) {
      assert(controller.flush(write), controller.message);
      const imported = saves.parseSaveImport(JSON.stringify(save));
      assert.equal(imported.failure, null);
      assert.equal(JSON.stringify(imported.save.mobilityV1), JSON.stringify(save.mobilityV1));
      save = imported.save;
      controller = new MobilityDriveController(save.mobilityV1);
      reloaded = true;
    }
  }
  assert(controller.flush(write), controller.message);
  assert(reloaded);
  assert(course.mobilityCoursePassed(status()), JSON.stringify(status()));
  const before = save.mobilityV1.owned[0];
  assert(before.distance > 1500 && before.energy < 100 && before.condition < 100);
  const final = command(save, { type: 'return', runId });
  assert.deepEqual(final.mobilityV1.forgeDelivery, { runId, marks: ledger.FORGE_DELIVERY_MARKS });
  assert.deepEqual(final.mobilityV1.owned[0], before);
  assert.deepEqual(final.profile, { ...save.profile, clanMarks: 80 + ledger.FORGE_DELIVERY_MARKS });
  command(final, { type: 'return', runId }, false);
  command(final, START, false);
  const imported = saves.parseSaveImport(JSON.stringify(final));
  assert.equal(imported.failure, null);
  assert.equal(JSON.stringify(imported.save.mobilityV1), JSON.stringify(final.mobilityV1));
});

test('early returns, recovery, and legacy reports pay nothing', () => {
  const bought = command(campaign(), BUY);
  const started = command(bought, START);
  const runId = started.mobilityV1.active.id;
  const returned = command(started, { type: 'return', runId });
  const recovered = command(started, { type: 'recover', runId });
  for (const state of [returned, recovered]) {
    assert.equal(state.profile.clanMarks, bought.profile.clanMarks);
    assert.equal(state.mobilityV1.forgeDelivery, undefined);
  }
  assert.equal(recovered.mobilityV1.recoveryDebt, 20);
  command(recovered, START, false);

  const historical = {
    ...returned.mobilityV1, lastReport: { ...returned.mobilityV1.lastReport, result: 'passed' },
  };
  const inspected = ledger.inspectMobilityLedger(historical, OWNER);
  assert.equal(inspected.status, 'valid');
  assert.equal(inspected.state.forgeDelivery, undefined);
  assert.equal(ledger.inspectMobilityLedger({
    ...historical, forgeDelivery: { runId, marks: 0 },
  }, OWNER).status, 'invalid-save');
});
