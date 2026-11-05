import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const bundled = await build({ stdin: { contents: [
  'export * as insertion from "./app/game/systems/planetInsertion.ts";',
  'export * as arrival from "./app/game/systems/planetArrival.ts";',
  'export * as runs from "./app/game/systems/planetArrivalRun.ts";',
  'export * as saves from "./app/game/save.ts";',
  'export * as archives from "./app/game/systems/completeArchive.ts";',
  'export { createNurseryCampaign } from "./app/game/systems/nurseryCampaign.ts";',
  'export { evaluateClanShipAccess } from "./app/game/systems/clanShipOperations.ts";',
  'export { SHIP_IDS } from "./app/game/shipCatalogue.ts";',
  'export { carrierArtForShip } from "./app/game/systems/planetArrivalArt.ts";',
].join('\n'), resolveDir: fileURLToPath(new URL('../', import.meta.url)), loader: 'ts' },
bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const { insertion: p, arrival: a, runs, saves, archives } = api;
const OWNER = '2026-11-05T12:00:00.000Z', OTHER = '2026-11-05T12:01:00.000Z';
const SHIP = 'classic-predator-spaceship', RUN = 'insertion-test-run';
const plans = ['pod', 'ship'].flatMap(method => ['solo', 'triad'].map(team => ({ version: 1, method, team })));
const trioPlan = plans.find(plan => plan.method === 'ship' && plan.team === 'triad');
function roster() {
  return p.TRIO_MEMBERS.reduce((state, { id }) => p.assignExpeditionMember(state, OWNER, SHIP, id), null);
}
function store() {
  const values = new Map();
  return { values, get length() { return values.size; }, key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
function fixture(plan) {
  const save = saves.defaultSave(OWNER);
  if (plan?.team === 'triad') save.expeditionRoster = roster();
  const state = a.createPlanetArrival({ ownerCreatedAt: OWNER, runId: RUN, missionId: 'jungle-vey',
    encounterRun: save.missionProgress['jungle-vey'].attempts, personalShipId: SHIP,
    hunterPresetId: save.appearance.presetId, ...(plan ? { insertion: plan } : {}) });
  const run = { version: 1, ownerCreatedAt: OWNER, runId: RUN, startedAt: OWNER,
    difficultyId: save.settings.difficultyId, configuration: {
      inventory: save.inventory, loadout: save.loadout, appearance: save.appearance,
      gauntletVariantId: 'standard', elapsedSeconds: 0,
      visualOptions: { screenShake: true, reducedGore: false, highContrastVision: false },
      ...(plan ? { insertion: plan, insertionShipId: SHIP } : {}),
    } };
  return { ...save, planetArrival: state, planetArrivalRun: run };
}
function outcome(patch = {}) {
  return { version: 1, runId: RUN, plan: trioPlan,
    members: [{ id: 'karhek', status: 'extracted', health: 70, maxHealth: 100 },
      { id: 'saketh', status: 'left-behind', health: 0, maxHealth: 120 }],
    extracted: ['karhek'], leftBehind: ['saketh'], injured: ['karhek'], ...patch };
}
const settle = (current, result = outcome()) => p.settleExpeditionOutcome(current, OWNER, RUN, trioPlan, SHIP, result);

test('legacy absence means solo capsule; explicit malformed choices are refused', () => {
  assert.deepEqual(p.normalizePlanetInsertionPlan(undefined), p.DEFAULT_PLAN);
  for (const raw of [null, {}, [], { version: 2, method: 'ship', team: 'triad' },
    { version: 1, method: 'teleport', team: 'solo' }, { version: 1, method: 'pod', team: 'duo' },
    { ...p.DEFAULT_PLAN, quiet: true }]) assert.equal(p.normalizePlanetInsertionPlan(raw), null);
  for (const plan of plans) assert.deepEqual(p.normalizePlanetInsertionPlan(plan), plan);
});

test('landing raises both suspicion and actual patrol budget for either party size', () => {
  for (const team of ['solo', 'triad']) {
    const pod = p.planetInsertionPressure({ version: 1, method: 'pod', team });
    const ship = p.planetInsertionPressure({ version: 1, method: 'ship', team });
    assert(ship.initialSuspicion > pod.initialSuspicion);
    assert(ship.extraPatrols > pod.extraPatrols);
    assert(ship.searchSeconds > pod.searchSeconds);
  }
  assert.equal(p.planetInsertionPressure(p.DEFAULT_PLAN).extraPatrols, 0);
});

test('individual pods, mother ships and fleet identities cannot land as a personal surface ship', () => {
  for (const personalShipId of ['avp-predator-drop-pod', 'project-original-avp-predator-drop-pod', 'emergency-escape-pod', 'avp-predator-mothership', 'lost-tribe-spaceship', 'predator-fleet']) {
    assert.equal(p.shipSupportsSurfaceInsertion(personalShipId), false, personalShipId);
    assert.throws(() => a.createPlanetArrival({ ...fixture().planetArrival, personalShipId, insertion: trioPlan }), TypeError);
  }
  for (const ship of ['classic-predator-spaceship', 'wolf-ship', 'avpr-scout-ship']) assert(p.shipSupportsSurfaceInsertion(ship));
});

test('every allowed hull has an inspected, bounded ground contact below its exit', () => {
  for (const ship of api.SHIP_IDS.filter(p.shipSupportsSurfaceInsertion)) {
    const art = api.carrierArtForShip(ship);
    assert.equal(art.review, 'inspected-source-art', ship);
    for (const point of [art.groundContact, art.groundExit]) assert(point.x > 0 && point.x < 1 && point.y > 0 && point.y < 1, ship);
    assert(art.groundContact.y >= art.groundExit.y, `${ship}: underside exit cannot be below its contact`);
  }
});

test('recruitment grants no automatic members and both actual assignments are required', () => {
  assert.equal(p.inspectExpeditionRoster(undefined, OWNER).status, 'absent');
  assert.equal(p.expeditionTrioReady(null, OWNER, SHIP), false);
  const first = p.assignExpeditionMember(null, OWNER, SHIP, 'karhek');
  assert.equal(first.members.length, 1);
  assert.equal(p.expeditionTrioReady(first, OWNER, SHIP), false);
  const both = p.assignExpeditionMember(first, OWNER, 'wolf-ship', 'saketh');
  assert.equal(p.expeditionTrioReady(both, OWNER, SHIP), false);
  assert.equal(p.expeditionTrioReady(roster(), OWNER, SHIP), true);
  assert.equal(p.expeditionTrioReady(roster(), OTHER, SHIP), false);
});

test('roster inspection refuses foreign owners, duplicate identities, future versions and invented availability', () => {
  const good = roster();
  const cases = [{ ...good, ownerCreatedAt: OTHER }, { ...good, members: [good.members[0], good.members[0]] },
    { ...good, members: [{ ...good.members[0], availability: 'immortal' }] },
    { ...good, members: [{ ...good.members[0], assignedShipId: 'unknown' }] }, { ...good, bonus: 5 },
    { ...good, settledRunIds: [RUN, RUN] }];
  for (const raw of cases) assert.equal(p.inspectExpeditionRoster(raw, OWNER).status, 'invalid-save');
  assert.equal(p.inspectExpeditionRoster({ ...good, version: 2 }, OWNER).status, 'future-version');
});

test('real extraction consequences are bound to the live run and applied only once', () => {
  const before = roster(), next = settle(before);
  assert.deepEqual(next.members.map(member => member.availability), ['recovering', 'missing']);
  assert.deepEqual(next.settledRunIds, [RUN]);
  assert.equal(p.expeditionTrioReady(next, OWNER, SHIP), false);
  assert.equal(settle(next), null);
  assert.equal(settle(before, outcome({ runId: 'old-lease' })), null);
  assert.equal(settle(before, outcome({ plan: p.DEFAULT_PLAN })), null);
  assert.equal(settle(before, outcome({ extracted: ['karhek', 'saketh'] })), null);
  assert.equal(settle(before, outcome({ injured: [] })), null);
  assert.equal(settle(before, outcome({ members: [{ id: 'karhek', status: 'extracted', health: 10_000, maxHealth: 10_000 },
    { id: 'saketh', status: 'left-behind', health: 0, maxHealth: 120 }], injured: [] })), null);
  assert.equal(settle(before, outcome({ members: [{ id: 'karhek', status: 'extracted', health: 0, maxHealth: 100 },
    { id: 'saketh', status: 'left-behind', health: 0, maxHealth: 120 }] })), null);
  assert.deepEqual(before, roster(), 'pure settlement never mutates an uncommitted campaign');
});

test('reassigning or recruiting again cannot restore injured or missing companions', () => {
  const wounded = settle(roster());
  const reassigned = p.assignExpeditionMember(wounded, OWNER, 'wolf-ship', 'saketh');
  assert.equal(reassigned.members.find(member => member.id === 'saketh').availability, 'missing');
  assert.equal(p.expeditionTrioReady(reassigned, OWNER, 'wolf-ship'), false);
});

test('clan care spends real marks and separates rescue from medical recovery', () => {
  const wounded = settle(roster());
  assert.equal(p.careForExpeditionMember(wounded, OWNER, 'saketh', 59, 'missing'), null);
  assert.equal(p.careForExpeditionMember(wounded, OTHER, 'saketh', 100, 'missing'), null);
  const rescue = p.careForExpeditionMember(wounded, OWNER, 'saketh', 100, 'missing');
  assert.equal(rescue.clanMarks, 40);
  assert.equal(rescue.roster.members.find(member => member.id === 'saketh').availability, 'recovering');
  assert.equal(p.careForExpeditionMember(rescue.roster, OWNER, 'saketh', rescue.clanMarks, 'missing'), null,
    'a queued duplicate rescue click cannot silently pay for the next medical action');
  const healed = p.careForExpeditionMember(rescue.roster, OWNER, 'saketh', rescue.clanMarks, 'recovering');
  assert.equal(healed.clanMarks, 20);
  assert.equal(healed.roster.members.find(member => member.id === 'saketh').availability, 'ready');
  assert.equal(p.careForExpeditionMember(healed.roster, OWNER, 'saketh', 100, 'recovering'), null);
  const allReady = p.careForExpeditionMember(healed.roster, OWNER, 'karhek', healed.clanMarks, 'recovering');
  assert.equal(allReady.clanMarks, 0);
  assert(p.expeditionTrioReady(allReady.roster, OWNER, SHIP));
});

test('all four plans survive durable save, portable export and full archive', () => {
  for (const plan of plans) {
    const storage = store(), candidate = fixture(plan);
    const written = saves.writeSaveWithStatus(candidate, storage);
    assert(written.persisted, written.failure);
    const exported = archives.createCompleteArchive(written.save, storage, OWNER);
    for (const copy of [saves.loadSaveWithStatus(storage).save, saves.parseSaveImport(saves.exportSave(written.save)).save,
      archives.parseCompleteArchive(exported.serialized).archive?.campaign]) {
      assert(copy, 'round trip must retain campaign');
      assert.deepEqual(copy.planetArrival.insertion, plan);
      assert.deepEqual(copy.planetArrivalRun.configuration.insertion, plan);
      assert.equal(copy.planetArrivalRun.configuration.insertionShipId, SHIP);
      if (plan.team === 'triad') assert.deepEqual(copy.expeditionRoster, roster());
    }
  }
});

test('legacy arrival archives do not gain a team, plan or roster during normalization', () => {
  const original = fixture();
  const copy = saves.parseSaveImport(saves.exportSave(original)).save;
  assert(copy);
  assert.equal(Object.hasOwn(copy, 'expeditionRoster'), false);
  assert.equal(Object.hasOwn(copy.planetArrival, 'insertion'), false);
  assert.equal(Object.hasOwn(copy.planetArrivalRun.configuration, 'insertion'), false);
});

test('skipping or pausing preserves the exact frozen plan and group', () => {
  for (const plan of plans) {
    const { planetArrival: state, planetArrivalRun: run } = fixture(plan);
    const playing = a.startPlanetArrival(state);
    const skipped = a.requestPlanetArrivalHandoff(playing, 'skipped');
    assert.deepEqual(skipped.insertion, plan);
    assert.deepEqual(a.pausePlanetArrival(playing).insertion, plan);
    assert.equal(runs.inspectPlanetArrivalRun(run, skipped).status, 'valid');
    assert.equal(runs.inspectPlanetArrivalRun({ ...run, configuration: { ...run.configuration,
      insertion: { ...plan, method: plan.method === 'pod' ? 'ship' : 'pod' } } }, skipped).status, 'invalid-save');
  }
});

test('incompatible plan and roster bytes are rejected before they can replace the campaign', () => {
  const storage = store(), valid = fixture(trioPlan);
  assert(saves.writeSaveWithStatus(valid, storage).persisted);
  const before = [...storage.values];
  const bad = [
    { ...valid, expeditionRoster: null },
    { ...valid, expeditionRoster: { ...valid.expeditionRoster, ownerCreatedAt: OTHER } },
    { ...valid, expeditionRoster: { ...valid.expeditionRoster, version: 2 } },
    { ...valid, planetArrival: { ...valid.planetArrival, insertion: null } },
    { ...valid, planetArrivalRun: { ...valid.planetArrivalRun, configuration: {
      ...valid.planetArrivalRun.configuration, insertion: p.DEFAULT_PLAN } } },
  ];
  for (const value of bad) {
    const result = saves.writeSaveWithStatus(value, storage);
    assert.equal(result.persisted, false);
    assert.deepEqual([...storage.values], before);
  }
});

test('high honor cannot substitute for the actual Blooded rite in a prologue campaign', () => {
  const original = fixture(trioPlan);
  const young = { ...original, prologue: api.createNurseryCampaign(),
    profile: { ...original.profile, honor: 1_000_000, rankId: 'elder' } };
  assert.equal(api.evaluateClanShipAccess(young).allowed, false);
  assert.equal(saves.parseSaveImport(JSON.stringify(young)).failure, 'invalid-save');
  assert.equal(api.evaluateClanShipAccess(saves.defaultSave(OWNER)).allowed, true, 'legacy adult access retained');
});

test('campaign triad preserves original identities and uses distinct modular appearances', () => {
  assert.deepEqual(p.TRIO_MEMBERS.map(member => member.name), ['Ka’rhek', 'Sa’keth']);
  const left = p.expeditionMemberAppearance('karhek'), right = p.expeditionMemberAppearance('saketh');
  assert.equal(left.presetId, 'custom'); assert.equal(right.presetId, 'custom');
  assert.notDeepEqual(left, right);
  assert.deepEqual(p.expeditionMemberLoadout('karhek').weaponIds, ['combistick', 'wristblades']);
  assert.equal(p.triadRecommendedForMission('jungle-vey'), false);
  for (const id of ['fungal-hivemind', 'ruins-ancient-guardian', 'volcano-bad-blood']) assert(p.triadRecommendedForMission(id));
});
