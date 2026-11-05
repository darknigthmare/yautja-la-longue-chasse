import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const bundled = await build({ stdin: { contents: [
  'export * as energy from "./app/game/systems/shipInsertionEnergy.ts";',
  'export * as insertion from "./app/game/systems/planetInsertion.ts";',
  'export * as arrival from "./app/game/systems/planetArrival.ts";',
  'export * as runs from "./app/game/systems/planetArrivalRun.ts";',
  'export * as saves from "./app/game/save.ts";',
  'export * as archives from "./app/game/systems/completeArchive.ts";',
].join('\n'), resolveDir: fileURLToPath(new URL('../', import.meta.url)), loader: 'ts' },
bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const { energy: e, insertion: p, arrival: a, runs, saves, archives } = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const OWNER = '2026-11-05T12:00:00.000Z', OTHER = '2026-11-05T12:01:00.000Z';
const SHIP = 'classic-predator-spaceship', WOLF = 'wolf-ship', RUN = 'cloak-approach-1';
const CLOAK = { version: 1, method: 'ship', team: 'solo', shipCloak: true };
const debit = (state, runId = RUN, shipId = SHIP) => e.debitShipInsertionCloak(state, OWNER, shipId, runId, CLOAK);
function fixture(team = 'solo') {
  const save = saves.defaultSave(OWNER);
  const plan = { ...CLOAK, team };
  if (team === 'triad') save.expeditionRoster = p.TRIO_MEMBERS.reduce((roster, member) =>
    p.assignExpeditionMember(roster, OWNER, SHIP, member.id), null);
  const state = a.createPlanetArrival({ ownerCreatedAt: OWNER, runId: RUN, missionId: 'jungle-vey',
    encounterRun: save.missionProgress['jungle-vey'].attempts, personalShipId: SHIP,
    hunterPresetId: save.appearance.presetId, insertion: plan });
  return { ...save, shipInsertionEnergy: e.debitShipInsertionCloak(undefined, OWNER, SHIP, RUN, plan).state, planetArrival: state,
    planetArrivalRun: { version: 1, ownerCreatedAt: OWNER, runId: RUN, startedAt: OWNER,
      difficultyId: save.settings.difficultyId, configuration: {
        inventory: save.inventory, loadout: save.loadout, appearance: save.appearance,
        gauntletVariantId: 'standard', elapsedSeconds: 0,
        visualOptions: { screenShake: true, reducedGore: false, highContrastVision: false },
        insertion: plan, insertionShipId: SHIP, insertionEnergyRunId: RUN,
      } } };
}

test('legacy plans and campaigns preserve their shape and receive no automatic debit', () => {
  const old = saves.defaultSave(OWNER);
  assert.equal(Object.hasOwn(saves.normalizeSave(old), 'shipInsertionEnergy'), false);
  assert.deepEqual(p.normalizePlanetInsertionPlan(undefined), p.DEFAULT_PLAN);
  assert.equal(e.shipInsertionCharge(undefined, OWNER, SHIP), 100);
  assert.equal(e.inspectShipInsertionEnergy(undefined, OWNER).status, 'absent');
  assert.equal(e.debitShipInsertionCloak(undefined, OWNER, SHIP, RUN, p.DEFAULT_PLAN), null);
  assert.equal(e.debitShipInsertionCloak(undefined, OWNER, SHIP, RUN, { version: 1, method: 'ship', team: 'solo' }), null);
});

test('optical approach is an explicit ship-only frozen choice, with absent and false equivalent', () => {
  assert.deepEqual(p.normalizePlanetInsertionPlan(CLOAK), CLOAK);
  const unmasked = { version: 1, method: 'ship', team: 'solo' };
  assert(p.samePlanetInsertion(unmasked, { ...unmasked, shipCloak: false }));
  assert.equal(p.samePlanetInsertion(unmasked, CLOAK), false);
  for (const raw of [{ ...CLOAK, method: 'pod' }, { ...CLOAK, shipCloak: 1 }, { ...CLOAK, shipCloak: 'true' },
    { ...CLOAK, shipCloak: undefined }, { ...CLOAK, version: 2 }, { ...CLOAK, freePower: true }]) {
    assert.equal(p.normalizePlanetInsertionPlan(raw), null);
  }
});

test('camouflage lowers actual presence and awareness but does not erase the arrival or engines', () => {
  for (const team of ['solo', 'triad']) {
    const quiet = p.planetInsertionPressure({ ...CLOAK, team });
    const normal = p.planetInsertionPressure({ ...CLOAK, team, shipCloak: false });
    const pod = p.planetInsertionPressure({ version: 1, method: 'pod', team });
    assert.equal(quiet.extraPatrols, team === 'triad' ? 2 : 1);
    assert.equal(quiet.searchSeconds, 18);
    assert(quiet.initialSuspicion > pod.initialSuspicion && quiet.initialSuspicion < normal.initialSuspicion);
    assert(quiet.searchSeconds > pod.searchSeconds && quiet.searchSeconds < normal.searchSeconds);
    assert(quiet.extraPatrols > pod.extraPatrols && quiet.extraPatrols < normal.extraPatrols);
  }
});

test('one confirmed approach costs thirty once and keeps a separate hull budget', () => {
  const first = debit(undefined);
  assert.equal(first.changed, true);
  assert.equal(e.shipInsertionCharge(first.state, OWNER, SHIP), 70);
  const repeated = debit(first.state);
  assert.equal(repeated.changed, false);
  assert.deepEqual(repeated.state, first.state);
  assert.equal(debit(first.state, RUN, WOLF), null);
  assert.equal(e.shipInsertionCharge(first.state, OWNER, WOLF), 100);
  const secondHull = debit(first.state, 'wolf-approach', WOLF).state;
  assert.equal(e.shipInsertionCharge(secondHull, OWNER, WOLF), 70);
  assert.equal(e.shipInsertionCharge(secondHull, OWNER, SHIP), 70);
});

test('the safety reserve stops a third cloaked approach before any mutation', () => {
  const second = debit(debit(undefined).state, 'cloak-approach-2').state;
  const before = JSON.stringify(second);
  assert.equal(e.shipInsertionCharge(second, OWNER, SHIP), 40);
  assert.equal(debit(second, 'cloak-approach-3'), null);
  assert.equal(JSON.stringify(second), before);
  assert.equal(e.shipInsertionCharge({ ...second, hulls: [{ shipId: SHIP, charge: 50 }] }, OWNER, SHIP), 50);
  assert.equal(debit({ ...second, hulls: [{ shipId: SHIP, charge: 50 }] }, 'at-reserve').state.hulls[0].charge, 20);
});

test('paid recharge preserves departure receipts and refuses insufficient funds and stale double clicks', () => {
  const before = debit(undefined).state;
  assert.equal(e.rechargeShipInsertionEnergy(before, OWNER, SHIP, 19, 70), null);
  assert.equal(e.rechargeShipInsertionEnergy(before, OWNER, SHIP, 100, 40), null);
  const charged = e.rechargeShipInsertionEnergy(before, OWNER, SHIP, 25, 70);
  assert.equal(charged.cost, 20);
  assert.equal(charged.clanMarks, 5);
  assert.equal(e.shipInsertionCharge(charged.state, OWNER, SHIP), 100);
  assert.deepEqual(charged.state.departures, before.departures);
  assert.equal(e.rechargeShipInsertionEnergy(charged.state, OWNER, SHIP, 100, 70), null);
  assert.equal(e.rechargeShipInsertionEnergy(charged.state, OWNER, SHIP, 100, 100), null);
  assert.deepEqual(debit(charged.state).state, charged.state, 'replaying an old arrival cannot drain a newly charged reserve');
});

test('invalid, foreign and future ledgers are rejected rather than refilled', () => {
  const good = debit(undefined).state;
  const bad = [{ ...good, ownerCreatedAt: OTHER }, { ...good, extra: 1 }, { ...good, hulls: [good.hulls[0], good.hulls[0]] },
    { ...good, hulls: [{ shipId: SHIP, charge: 101 }] }, { ...good, hulls: [{ shipId: SHIP, charge: -1 }] },
    { ...good, hulls: [{ shipId: SHIP, charge: 70.5 }] }, { ...good, hulls: [{ shipId: 'unknown', charge: 70 }] },
    { ...good, hulls: [] }, { ...good, departures: [good.departures[0], good.departures[0]] },
    { ...good, departures: [{ ...good.departures[0], cost: 0 }] },
    { ...good, departures: [{ ...good.departures[0], runId: 'bad\nrun' }] }];
  for (const value of bad) {
    assert.equal(e.inspectShipInsertionEnergy(value, OWNER).status, 'invalid-save');
    assert.equal(e.shipInsertionCharge(value, OWNER, SHIP), null);
    assert.equal(debit(value), null);
  }
  assert.equal(e.inspectShipInsertionEnergy({ ...good, version: 2 }, OWNER).status, 'future-version');
  assert.equal(e.shipInsertionCharge({ ...good, version: 2 }, OWNER, SHIP), null);
  assert.equal(e.shipInsertionCharge(undefined, OWNER, 'avp-predator-mothership'), null);
});

test('ledger receipt identity and owner are required independently of the current reserve', () => {
  const good = debit(undefined).state;
  assert(e.hasShipInsertionDebit(good, OWNER, RUN, SHIP));
  assert.equal(e.hasShipInsertionDebit(good, OTHER, RUN, SHIP), false);
  assert.equal(e.hasShipInsertionDebit(good, OWNER, 'another-run', SHIP), false);
  assert.equal(e.hasShipInsertionDebit(good, OWNER, RUN, WOLF), false);
  assert.equal(e.hasShipInsertionDebit(undefined, OWNER, RUN, SHIP), false);
});

test('cloaked campaign and frozen arrival round-trip with the paid seventy-unit reserve', () => {
  const original = fixture();
  const imported = saves.parseSaveImport(JSON.stringify(original));
  assert.equal(imported.failure, null);
  assert.deepEqual(imported.save.shipInsertionEnergy, original.shipInsertionEnergy);
  assert.deepEqual(imported.save.planetArrival.insertion, CLOAK);
  assert.equal(imported.save.planetArrivalRun.configuration.insertionEnergyRunId, RUN);
  assert.equal(e.shipInsertionCharge(imported.save.shipInsertionEnergy, OWNER, SHIP), 70);
});

test('solo and trio cloak budgets survive durable storage, portable export and the complete archive', () => {
  for (const team of ['solo', 'triad']) {
    const values = new Map();
    const storage = { get length() { return values.size; }, key: index => [...values.keys()][index] ?? null,
      getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
    const original = fixture(team);
    const written = saves.writeSaveWithStatus(original, storage);
    assert.equal(written.persisted, true, written.failure);
    const archive = archives.createCompleteArchive(written.save, storage, OWNER);
    for (const restored of [saves.loadSaveWithStatus(storage).save,
      saves.parseSaveImport(saves.exportSave(written.save)).save,
      archives.parseCompleteArchive(archive.serialized).archive?.campaign]) {
      assert(restored);
      assert.equal(restored.planetArrival.insertion.shipCloak, true);
      assert.equal(restored.planetArrival.insertion.team, team);
      assert.deepEqual(restored.shipInsertionEnergy, written.save.shipInsertionEnergy);
      assert.equal(e.shipInsertionCharge(restored.shipInsertionEnergy, OWNER, SHIP), 70);
      assert.equal(debit(restored.shipInsertionEnergy).changed, false);
    }
  }
});

test('missing, foreign or substituted energy receipts cannot import a free cloaked arrival', () => {
  for (const mutate of [
    save => { delete save.shipInsertionEnergy; },
    save => { save.shipInsertionEnergy.ownerCreatedAt = OTHER; },
    save => { save.shipInsertionEnergy.departures = []; },
    save => { save.shipInsertionEnergy.departures[0].runId = 'another-run'; },
    save => { delete save.planetArrivalRun.configuration.insertionEnergyRunId; },
    save => { save.planetArrivalRun.configuration.insertionEnergyRunId = 'another-run'; },
    save => { save.planetArrivalRun.configuration.insertion.shipCloak = false; },
  ]) {
    const save = structuredClone(fixture()); mutate(save);
    assert.equal(saves.parseSaveImport(JSON.stringify(save)).failure, 'invalid-save');
  }
  const future = fixture(); future.shipInsertionEnergy.version = 2;
  assert.equal(saves.parseSaveImport(JSON.stringify(future)).failure, 'future-version');
});

test('pause, skipped handoff, completed arrival and reload never spend the cycle twice', () => {
  const save = fixture();
  const before = JSON.stringify(save.shipInsertionEnergy);
  for (const state of [a.resumePlanetArrival({ ...save.planetArrival, status: 'playing', elapsedMs: 35_000 }),
    a.requestPlanetArrivalHandoff(save.planetArrival, 'skipped'),
    a.completePlanetArrivalHandoff(a.requestPlanetArrivalHandoff(save.planetArrival, 'skipped'))]) {
    const next = { ...save, planetArrival: state };
    assert.equal(runs.inspectPlanetArrivalRun(next.planetArrivalRun, state).status, 'valid');
    const imported = saves.parseSaveImport(JSON.stringify(next));
    assert.equal(imported.failure, null);
    assert.equal(JSON.stringify(imported.save.shipInsertionEnergy), before);
  }
});
