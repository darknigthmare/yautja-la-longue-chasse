import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';

// Execute the actual fixture factory and current collision/save authorities.
const api = homeworldQaModelV64(process.cwd(), [
  '../../dev/destinations.ts', '../save.ts', '../data.ts', '../shipCatalogue.ts',
  'clanShipDocking.ts', 'clanShipInterior.ts', 'homeworldLocationV77.ts',
  'homeworldCivicWorldV80.ts', 'homeworldTransitionsV110.ts', 'homeworldCargoArrivalV108.ts',
  'homeworldGeometryRecoveryV112.ts', 'homeworldRegionsV68.ts', 'homeworldLiftStationV83.ts', 'homeworldWorldV77.ts',
  'wolfCastle.ts', 'planetArrival.ts', 'planetArrivalRun.ts', 'huntGauntletIdentityV142.ts',
  'planetInsertion.ts', 'shipInsertionEnergy.ts',
]);

function assertDetached(left, right, path = 'save') {
  if (left === null || typeof left !== 'object') return;
  assert.notEqual(left, right, `${path} must belong to its own test session`);
  for (const key of Object.keys(left)) assertDetached(left[key], right[key], `${path}.${key}`);
}

test('developer destination IDs are unique; unknown links cannot create a fixture', () => {
  assert.equal(new Set(api.DEV_DESTINATIONS.map(destination => destination.id)).size, api.DEV_DESTINATIONS.length);
  for (const destination of api.DEV_DESTINATIONS) assert.equal(api.resolveDevDestination(destination.id), destination);
  for (const id of [undefined, null, '', 'unknown', '__proto__', 'SHIP', '/dev', 12, {}]) {
    assert.equal(api.resolveDevDestination(id), undefined);
  }
  assert.throws(() => api.createDevSave({ id: 'unknown', kind: 'homeworld', point: { x: 0, y: 0 } }), /inconnue/);
  // The public ID selects the authored record, never caller-supplied coordinates.
  const destination = api.resolveDevDestination('homeworld-market');
  const expected = api.createDevSave(destination);
  assert.deepEqual(api.createDevSave({ ...destination, point: { x: NaN, y: -99999 }, levelId: 'invalid' }), expected);
});

test('fresh fixtures import through the real save parser without creating mission rewards or touching browser stores', () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const unavailableStorage = {};
  for (const key of ['localStorage', 'sessionStorage', 'indexedDB']) {
    Object.defineProperty(unavailableStorage, key, { get() { throw new Error(`Unexpected ${key} access`); } });
  }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: unavailableStorage });
  try {
    const owners = new Set();
    for (const destination of api.DEV_DESTINATIONS) {
      const save = api.createDevSave(destination);
      const imported = api.parseSaveImport(JSON.stringify(save));
      assert.equal(imported.failure, null, destination.id);
      assert(imported.save, destination.id);
      assert.equal(imported.save.createdAt, save.createdAt, destination.id);
      assert.equal(new Date(save.createdAt).toISOString(), save.createdAt);
      owners.add(save.createdAt);
      assert.equal(save.storyCompleted, false, destination.id);
      assert.deepEqual(save.trophies, [], destination.id);
      assert(Object.values(save.statistics).every(value => value === 0), destination.id);
      assert(Object.values(save.missionProgress).every(mission => mission.status !== 'completed'), destination.id);
    }
    assert.equal(owners.size, api.DEV_DESTINATIONS.length);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else delete globalThis.window;
  }
});

test('restarting or changing a destination never shares mutable save data with an earlier run', () => {
  const destination = api.resolveDevDestination('ship');
  const first = api.createDevSave(destination), second = api.createDevSave(destination);
  const original = JSON.stringify(second);
  assertDetached(first, second);
  first.inventory.unlockedWeaponIds.length = 0;
  first.inventory.weaponUpgrades.combistick = 2;
  first.homeworld.visitedDistrictIds.push('market');
  first.settings.controlBindings['hunt.moveLeft'] = [];
  first.appearance.biomaskId = 'none';
  assert.equal(JSON.stringify(second), original);
  assert.equal(JSON.stringify(api.createDevSave(destination)), original);
});

test('every Homeworld start restores its exact floor and position, with a real walking exit and no migration', () => {
  for (const destination of api.DEV_DESTINATIONS.filter(entry => entry.kind === 'homeworld')) {
    const save = api.createDevSave(destination), checkpoint = save.homeworld.locationV77;
    assert(api.homeworldExteriorArrivalAllowedV110(destination.levelId, destination.point), destination.id);
    const restored = api.resolveHomeworldLocationV77(checkpoint, save.createdAt);
    assert.equal(restored.restored, true, destination.id);
    assert.equal(restored.levelId, destination.levelId, destination.id);
    assert.equal(restored.interiorId, null, destination.id);
    assert.deepEqual({ x: restored.actor.x, y: restored.actor.y }, destination.point, destination.id);
    const arrival = api.resolveCargoArrivalV108(checkpoint, save.createdAt, save.homeworld.cargoV108);
    assert.equal(arrival.migrationBackup, null, destination.id);
    assert.equal(arrival.cargoRecoveryMessage, '', destination.id);
    assert.equal(api.homeworldGeometryRecoveryRequiredV112(checkpoint, save.createdAt,
      api.homeworldGeometryRecoveryLedgersV112(save.homeworld)), false, destination.id);
    const exits = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([moveX, climb]) =>
      api.stepHomeworldCivicActorV80(restored.actor, { moveX, climb, jumpPressed: false }, .1, destination.levelId));
    assert(exits.some(actor => Math.hypot(actor.x - restored.actor.x, actor.y - restored.actor.y) > 1), `${destination.id} needs a walking exit`);
  }
});

test('all seven Clan Ship room fixtures use valid clan state and a safe spawn distinct from the personal ship', () => {
  const rooms = api.DEV_DESTINATIONS.filter(destination => destination.kind === 'clan' && destination.status === 'aboard');
  assert.deepEqual(rooms.map(destination => destination.roomId).sort(), [...api.CLAN_SHIP_ROOM_IDS].sort());
  for (const destination of api.DEV_DESTINATIONS.filter(entry => entry.kind === 'clan')) {
    const save = api.createDevSave(destination), state = save.clanShipDocking;
    assert.equal(api.inspectClanShipDocking(state, save.createdAt).status, 'valid', destination.id);
    assert.equal(state.roomId, destination.roomId);
    assert.equal(state.status, destination.status);
    assert.equal(state.personalShipId, api.DEFAULT_SHIP_ID);
    assert.notEqual(state.personalShipId, state.clanShipId);
    assert(api.isClanShipInteriorWalkable(state.roomId, api.clanShipInteriorSpawn(state.roomId)), destination.id);
  }
});

test('mission choices come from the real catalogue and ordinary village fixtures are admitted without a campaign', () => {
  const missions = api.DEV_DESTINATIONS.filter(destination => destination.kind === 'mission');
  assert.deepEqual(missions.map(destination => destination.missionId).sort(), api.MISSIONS.map(mission => mission.id).sort());
  const regions = api.DEV_DESTINATIONS.filter(destination => destination.kind === 'region');
  assert.equal(regions.length, api.HOMEWORLD_REGION_IDS_V68.length - 1);
  for (const destination of regions) {
    const save = api.createDevSave(destination), state = save.homeworldRegionV68;
    assert.notEqual(destination.regionId, 'forbidden-reserve');
    assert.equal(api.canEnterHomeworldRegionV68(save, destination.regionId).allowed, true, destination.id);
    assert(api.normalizeHomeworldRegionV68(state), destination.id);
    assert.equal(state.zone, 'village', destination.id);
    assert(api.isHomeworldRegionWalkableV68(state.regionId, state.zone, state.actor, state.tick, state.buildingId), destination.id);
    assert.equal(state.pendingFieldEvent, null);
    assert.deepEqual(state.eventReceipts, []);
  }
});

test('Wolf approach and all nine rooms use native valid visits, safe movement and the real return route', () => {
  const destinations = api.DEV_DESTINATIONS.filter(destination => destination.kind === 'wolf');
  const rooms = destinations.filter(destination => destination.status === 'aboard');
  assert.deepEqual(rooms.map(destination => destination.roomId).sort(), [...api.WOLF_CASTLE_ROOM_IDS].sort());
  assert.equal(destinations.filter(destination => destination.status === 'approach').length, 1);
  for (const destination of destinations) {
    const save = api.createDevSave(destination), visit = save.wolfCastle;
    assert.equal(api.inspectWolfCastleVisit(visit, save.createdAt).status, 'valid', destination.id);
    assert.equal(visit.locationId, api.WOLF_CASTLE_LOCATION_ID);
    assert.equal(visit.roomId, destination.roomId);
    assert.equal(visit.status, destination.status);
    assert.equal(visit.personalShipId, api.DEFAULT_SHIP_ID);
    assert(visit.invitationId, 'the temporary invitation makes the real audience available without a campaign reward');
    assert.equal(visit.audience, 'unheard');
    assert.equal(visit.archiveRead, false);
    assert.deepEqual(visit.trial, { status: 'idle', progress: 0, attempts: 0 });
    assert.equal(visit.combat, null);
    assert.equal(visit.dungeon, null);
    assert.deepEqual(visit.position, { ...api.wolfCastleEntryPoint(destination.roomId, null), facing: 1 });
    assert(api.isWolfCastlePosition(visit.roomId, visit.position), destination.id);
    const imports = api.parseSaveImport(JSON.stringify(save));
    assert.equal(imports.failure, null, destination.id);
    assert.deepEqual(imports.save.wolfCastle, visit);
    assert.deepEqual(api.createDevSave({ ...destination, roomId: 'unknown', status: 'departed' }).wolfCastle, visit);
    if (destination.status === 'approach') {
      const boarded = api.actWolfCastle(visit, { type: 'board' }, {
        ownerCreatedAt: save.createdAt, personalShipId: api.DEFAULT_SHIP_ID,
      });
      assert.equal(boarded.accepted, true);
      assert.equal(boarded.state.status, 'aboard');
      assert.equal(boarded.state.roomId, 'royal-berth');
    } else {
      const exits = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([x, y]) =>
        api.stepWolfCastleActor(visit.roomId, visit.position, { x, y }, 100));
      assert(exits.some(point => Math.hypot(point.x - visit.position.x, point.y - visit.position.y) > 1), destination.id);
      assert(exits.every(point => api.isWolfCastlePointWalkable(visit.roomId, point)), destination.id);
      const route = api.wolfCastleRoute(visit.roomId, 'royal-berth');
      assert.equal(route[0], visit.roomId);
      assert.equal(route.at(-1), 'royal-berth');
      for (let index = 1; index < route.length; index++) assert(api.wolfCastleNeighbours(route[index - 1]).includes(route[index]));
    }
  }
});

test('all eight arrivals keep the campaign unchanged and pass the native state/run boundaries separately', () => {
  const destinations = api.DEV_DESTINATIONS.filter(destination => destination.kind === 'arrival' && !destination.insertion);
  assert.deepEqual(destinations.map(destination => destination.missionId).sort(), api.MISSIONS.map(mission => mission.id).sort());
  const runIds = new Set();
  for (const destination of destinations) {
    const save = api.createDevSave(destination), before = JSON.stringify(save);
    const { state, run } = api.createDevArrival(destination, save);
    const canonical = api.planetArrivalDestination(destination.missionId);
    assert(canonical, destination.id);
    assert.equal(state.missionId, destination.missionId);
    assert.equal(state.destinationId, canonical.body.id);
    assert.equal(state.ownerCreatedAt, save.createdAt);
    assert.equal(state.personalShipId, api.DEFAULT_SHIP_ID);
    assert.equal(state.hunterPresetId, save.appearance.presetId);
    assert.equal(state.encounterRun, 1);
    assert.equal(state.status, 'prepared');
    assert.equal(state.elapsedMs, 0);
    assert.equal(state.completedBy, null);
    assert.equal(Object.hasOwn(state, 'insertion'), false, 'Legacy arrivals preserve their original DTO.');
    assert.equal(Object.hasOwn(run.configuration, 'insertion'), false);
    assert.equal(Object.hasOwn(run.configuration, 'insertionShipId'), false);
    assert.equal(api.inspectPlanetArrival(state, save.createdAt, run.runId).status, 'valid');
    assert.equal(api.inspectPlanetArrivalRun(run, state).status, 'valid');
    assert.equal(run.ownerCreatedAt, save.createdAt);
    assert.equal(run.runId, state.runId);
    assert.equal(run.difficultyId, save.settings.difficultyId);
    assert.equal(run.configuration.elapsedSeconds, 0);
    assert.deepEqual(run.configuration.inventory, save.inventory);
    assert.deepEqual(run.configuration.loadout, save.loadout);
    assert.deepEqual(run.configuration.appearance, save.appearance);
    assert.equal(run.configuration.gauntletVariantId, api.captureHuntGauntletV142(
      save.gauntletV134.equippedId, save.profile.rankId, save.gauntletV134.claimedStudies));
    assert.equal(JSON.stringify(save), before, destination.id);
    assert.equal(save.planetArrival ?? null, null);
    assert.equal(save.planetArrivalRun ?? null, null);
    assert.deepEqual(save.missionProgress, api.defaultSave(save.createdAt).missionProgress);
    // Campaign repair must remain authoritative: later missions stay locked,
    // and a second import must not expose a hidden invalid arrival checkpoint.
    const imported = api.parseSaveImport(before);
    assert.equal(imported.failure, null, destination.id);
    const roundTrip = api.parseSaveImport(JSON.stringify(imported.save));
    assert.equal(roundTrip.failure, null, destination.id);
    assert.deepEqual(roundTrip.save.missionProgress, save.missionProgress, destination.id);
    const transported = JSON.parse(JSON.stringify({ state, run }));
    assert.equal(api.inspectPlanetArrival(transported.state, save.createdAt, state.runId).status, 'valid');
    assert.equal(api.inspectPlanetArrivalRun(transported.run, transported.state).status, 'valid');
    runIds.add(state.runId);
  }
  assert.equal(runIds.size, destinations.length);
});

test('explicit ship and triad destinations freeze one matching plan through the cinematic and the real hunt configuration', () => {
  const variants = [
    ['arrival-ship-jungle-vey', { version: 1, method: 'ship', team: 'solo' }],
    ['arrival-triad-jungle-vey', { version: 1, method: 'pod', team: 'triad' }],
    ['arrival-ship-triad-jungle-vey', { version: 1, method: 'ship', team: 'triad' }],
    ['arrival-ship-cloaked-triad-jungle-vey', { version: 1, method: 'ship', team: 'triad', shipCloak: true }],
  ];
  assert.equal(api.DEV_DESTINATIONS.filter(destination => destination.kind === 'arrival' && destination.insertion).length, variants.length);
  for (const [id, plan] of variants) {
    const destination = api.resolveDevDestination(id);
    const save = api.createDevSave(destination), before = JSON.stringify(save);
    const first = api.createDevArrival(destination, save), second = api.createDevArrival(destination, save);
    assertDetached(first, second);
    assert.deepEqual(first.state.insertion, plan);
    assert.deepEqual(first.run.configuration.insertion, plan);
    assert.equal(first.run.configuration.insertionShipId, first.state.personalShipId);
    if (plan.shipCloak) {
      assert.equal(first.run.configuration.insertionEnergyRunId, first.state.runId);
      assert.equal(api.shipInsertionCharge(save.shipInsertionEnergy, save.createdAt, api.DEFAULT_SHIP_ID), 70);
      assert.equal(api.hasShipInsertionDebit(save.shipInsertionEnergy, save.createdAt, first.state.runId, api.DEFAULT_SHIP_ID), true);
      assert.equal(save.shipInsertionEnergy.departures.length, 1);
    } else assert.equal(Object.hasOwn(first.run.configuration, 'insertionEnergyRunId'), false);
    assert.notEqual(first.state.insertion, first.run.configuration.insertion);
    assert.notEqual(first.state.insertion, destination.insertion);
    assert.equal(api.inspectPlanetArrivalRun(first.run, first.state).status, 'valid');
    assert.deepEqual(api.createDevArrival({ ...destination, insertion: { version: 1, method: 'pod', team: 'solo' } }, save), first,
      'The public ID resolves its authored plan, never a caller-supplied alternative.');
    const otherPlan = { ...plan, team: plan.team === 'solo' ? 'triad' : 'solo' };
    assert.equal(api.inspectPlanetArrivalRun({ ...first.run,
      configuration: { ...first.run.configuration, insertion: otherPlan } }, first.state).status, 'invalid-save');
    assert.equal(api.inspectPlanetArrivalRun({ ...first.run,
      configuration: { ...first.run.configuration, insertionShipId: 'wolf-ship' } }, first.state).status, 'invalid-save');
    first.state.insertion.team = otherPlan.team;
    first.run.configuration.insertion.method = plan.method === 'ship' ? 'pod' : 'ship';
    assert.deepEqual(second.state.insertion, plan);
    assert.deepEqual(second.run.configuration.insertion, plan);
    assert.deepEqual(api.createDevArrival(destination, save), second);
    assert.equal(JSON.stringify(save), before);
  }
});

test('the cloaked developer fixture pays the real auxiliary budget once and refuses an unpaid arrival context', () => {
  const destination = api.resolveDevDestination('arrival-ship-cloaked-triad-jungle-vey');
  const save = api.createDevSave(destination), initial = JSON.stringify(save.shipInsertionEnergy);
  const first = api.createDevArrival(destination, save);
  api.createDevArrival(destination, save);
  assert.equal(JSON.stringify(save.shipInsertionEnergy), initial);
  assert.equal(api.expeditionTrioReady(save.expeditionRoster, save.createdAt, api.DEFAULT_SHIP_ID), true);
  assert.equal(api.parseSaveImport(JSON.stringify(save)).failure, null);
  assert.throws(() => api.createDevArrival(destination, { ...save, shipInsertionEnergy: null }), /débit d’énergie/);
  const reset = api.createDevSave(destination);
  assertDetached(save.shipInsertionEnergy, reset.shipInsertionEnergy);
  assert.deepEqual(reset.shipInsertionEnergy, save.shipInsertionEnergy);
  assert.equal(api.createDevArrival(destination, reset).state.runId, first.state.runId);
});

test('arrival construction resolves canonical IDs and refuses a foreign owner or invalid native context', () => {
  const destination = api.resolveDevDestination('arrival-jungle-vey');
  const save = api.createDevSave(destination);
  const expected = api.createDevArrival(destination, save);
  assert.deepEqual(api.createDevArrival({ ...destination, missionId: 'unknown' }, save), expected);
  assert.throws(() => api.createDevArrival({ ...destination, id: 'unknown' }, save), /inconnue/);
  assert.throws(() => api.createDevArrival({ ...destination, id: 'ship' }, save), /inconnue/);
  assert.throws(() => api.createDevArrival(destination, api.createDevSave(api.resolveDevDestination('arrival-ice-cryostalker'))), /autre session/);
  assert.throws(() => api.createDevArrival(destination, { ...save, loadout: null }), /invalide/);
  assert.throws(() => api.createDevArrival(destination, { ...save, appearance: { ...save.appearance, presetId: 'unknown' } }), /invalide/);
});

test('each arrival owns its full frozen equipment context independently of later mutations and resets', () => {
  const destination = api.resolveDevDestination('arrival-jungle-vey');
  const save = api.createDevSave(destination);
  const first = api.createDevArrival(destination, save), second = api.createDevArrival(destination, save);
  assertDetached(first, second);
  for (const key of ['inventory', 'loadout', 'appearance']) assertDetached(first.run.configuration[key], save[key], key);
  assertDetached(first.run.configuration.visualOptions.huntAccessibility, save.settings.huntAccessibility);
  const originalFirst = JSON.stringify(first), originalSecond = JSON.stringify(second);
  save.inventory.unlockedWeaponIds.length = 0;
  save.loadout.weaponIds.length = 0;
  save.appearance.presetId = 'custom';
  save.settings.screenShake = !save.settings.screenShake;
  assert.equal(JSON.stringify(first), originalFirst);
  first.run.configuration.inventory.unlockedGearIds.length = 0;
  first.run.configuration.loadout.gearIds.length = 0;
  first.run.configuration.appearance.presetId = 'custom';
  first.state.elapsedMs = 1234;
  assert.equal(JSON.stringify(second), originalSecond);
  assert.equal(JSON.stringify(api.createDevArrival(destination, api.createDevSave(destination))), originalSecond);
});

test('every fixture can finish or skip its native montage without changing the campaign or the accepted run', () => {
  for (const destination of api.DEV_DESTINATIONS.filter(entry => entry.kind === 'arrival')) {
    const save = api.createDevSave(destination), before = JSON.stringify(save);
    const { state, run } = api.createDevArrival(destination, save), frozenRun = JSON.stringify(run);
    const skipped = api.completePlanetArrivalHandoff(api.requestPlanetArrivalHandoff(state, 'skipped'));
    assert.equal(skipped.status, 'complete');
    assert.equal(skipped.completedBy, 'skipped');
    assert.equal(api.inspectPlanetArrival(skipped, save.createdAt, run.runId).status, 'valid');
    let natural = api.startPlanetArrival(state);
    for (let elapsed = 0; elapsed < api.PLANET_ARRIVAL_DURATION_MS; elapsed += api.PLANET_ARRIVAL_MAX_STEP_MS) {
      natural = api.advancePlanetArrival(natural, api.PLANET_ARRIVAL_MAX_STEP_MS);
    }
    assert.equal(natural.status, 'handoff-pending');
    natural = api.completePlanetArrivalHandoff(natural);
    assert.equal(natural.completedBy, 'natural');
    assert.equal(natural.elapsedMs, api.PLANET_ARRIVAL_DURATION_MS);
    assert.equal(api.inspectPlanetArrival(natural, save.createdAt, run.runId).status, 'valid');
    assert.equal(api.inspectPlanetArrivalRun(run, natural).status, 'valid');
    assert.equal(JSON.stringify(save), before);
    assert.equal(JSON.stringify(run), frozenRun);
    assert.equal(state.status, 'prepared');
    assert.equal(state.elapsedMs, 0);
  }
});

test('each memory backup store is isolated and supports literal storage keys without prototype collisions', () => {
  const first = api.createMemoryStorage(), second = api.createMemoryStorage();
  assert.equal(first.getItem('missing'), null);
  assert.equal(first.length, 0);
  first.setItem('__proto__', 'record');
  first.setItem('checkpoint', 'first');
  first.setItem('checkpoint', 'second');
  assert.equal(first.length, 2);
  assert.equal(first.getItem('checkpoint'), 'second');
  assert.equal(first.getItem('__proto__'), 'record');
  assert.equal(second.getItem('checkpoint'), null);
  assert.equal(second.length, 0);
  assert.equal(first.key(0), '__proto__');
  assert.equal(first.key(-1), null);
  assert.equal(first.key(9), null);
  first.removeItem('__proto__');
  assert.equal(first.length, 1);
  second.setItem('keep', 'independent');
  first.clear();
  assert.equal(first.length, 0);
  assert.equal(second.getItem('keep'), 'independent');
});

// Execute the Hub's actual lift lifecycle and update callback, as the existing
// recovery integration tests do; only React refs/setters and the frame are ports.
const hubSource = fs.readFileSync('app/game/HomeworldHub.tsx', 'utf8');
const hubTree = ts.createSourceFile('HomeworldHub.tsx', hubSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function liftControllerPart(name, environment) {
  let implementation;
  function visit(node) {
    if (name === 'mount' && ts.isCallExpression(node) && node.expression.getText(hubTree) === 'useEffect'
      && node.arguments[0]?.getText(hubTree).includes('restoreHomeworldLiftStationV83')) implementation = node.arguments[0];
    if (ts.isVariableDeclaration(node) && node.name.getText(hubTree) === name) implementation = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(hubTree);
  assert(implementation, `Execute actual HomeworldHub ${name}`);
  const compiled = ts.transpileModule(`const handler = ${implementation.getText(hubTree)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return runInNewContext(`(() => { ${compiled}; return handler; })()`, environment);
}

function mountLift(owner, ephemeralSession) {
  const frames = new Map();
  const environment = {
    ...api, ephemeralSession, save: { createdAt: owner }, saveRef: { current: { createdAt: owner } },
    liftSessionReadyRefV83: { current: false },
    liftRefV83: { current: api.createHomeworldLiftStationV83(owner) },
    transitRefV77: { current: null },
    setLiftStateV83() {}, setLiftSessionOwnerV83() {}, setTransitV77() {},
    requestAnimationFrame(handler) { frames.set(1, handler); return 1; },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  const unmount = liftControllerPart('mount', environment)();
  for (const frame of frames.values()) frame();
  return { environment, unmount, update: liftControllerPart('updateLiftStationV83', environment),
    get state() { return environment.liftRefV83.current; } };
}

test('the actual Homeworld lift remains playable but never reads, writes or restores another session during a dev run', () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const disk = api.createMemoryStorage(), access = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { sessionStorage: {
    getItem(key) { access.push(['read', key]); return disk.getItem(key); },
    setItem(key, value) { access.push(['write', key]); disk.setItem(key, value); },
  } } });
  try {
    const owner = api.createDevSave(api.resolveDevDestination('homeworld-port')).createdAt;
    // Seed the ordinary module cache and its store under the same identity.
    // Dev mounting must ignore both, even if an earlier run left the cabin up.
    api.rememberHomeworldLiftStationV83({ ...api.createHomeworldLiftStationV83(owner), position: 1 }, true);
    const savedBytes = disk.getItem(disk.key(0));
    access.length = 0;
    const run = mountLift(owner, true);
    assert.equal(run.state.position, 0);
    const connector = api.HOMEWORLD_CONNECTORS_V77.find(row => row.id === 'clan-lift');
    run.update(api.callHomeworldLiftV83(run.state, connector, true));
    for (let step = 0; step < 60 && run.state.journey; step++) {
      run.update(api.stepHomeworldLiftCallV83(run.state, .1).state);
    }
    assert.equal(run.state.position, 1, 'the real cabin still travels inside the test scene');
    assert.equal(run.state.journey, null);
    run.unmount();
    const reset = mountLift(owner, true);
    assert.equal(reset.state.position, 0, 'reset clears the earlier cabin position');
    reset.unmount();
    assert.deepEqual(access, [], 'neither mounting, moving, unmounting nor reset accesses sessionStorage');
    assert.equal(disk.getItem(disk.key(0)), savedBytes);
    const campaign = mountLift(owner, false);
    assert.equal(campaign.state.position, 1, 'the ordinary cached cabin was never replaced by the test');
    campaign.update(api.callHomeworldLiftV83(campaign.state, connector, false));
    for (let step = 0; step < 60 && campaign.state.journey; step++) {
      campaign.update(api.stepHomeworldLiftCallV83(campaign.state, .1).state);
    }
    campaign.unmount();
    assert.equal(JSON.parse(disk.getItem(disk.key(0))).position, 0, 'ordinary campaign persistence still works');
    assert(access.some(([kind]) => kind === 'write'));
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else delete globalThis.window;
  }
});
