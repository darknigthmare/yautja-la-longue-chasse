import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const arrival = qa.load('app/game/systems/planetArrival.ts');
const { MISSIONS } = qa.load('app/game/data.ts');
const { SHIP_IDS, shipProfileAssetPath } = qa.load('app/game/shipCatalogue.ts');
const { appearanceForPreset } = qa.load('app/game/hunterLore.ts');
const { worldBlueprintFor } = qa.load('app/game/systems/worldBlueprints.ts');
const ownerCreatedAt = '2026-11-04T08:30:00.000Z';
const input = { ownerCreatedAt, runId: 'arrival-run-01', missionId: 'jungle-vey', encounterRun: 3,
  personalShipId: 'classic-predator-spaceship', hunterPresetId: 'jungle-hunter' };
const fresh = (overrides = {}) => arrival.createPlanetArrival({ ...input, ...overrides });
const playing = (elapsedMs = 0) => ({ ...arrival.startPlanetArrival(fresh()), elapsedMs });
const inspect = value => arrival.inspectPlanetArrival(value, ownerCreatedAt, input.runId);

test('the eight continuous shots last exactly 62 seconds with no gap or overlap', () => {
  assert.equal(arrival.PLANET_ARRIVAL_SHOTS.length, 8);
  assert.equal(arrival.PLANET_ARRIVAL_SHOTS[0].startMs, 0);
  assert.equal(arrival.PLANET_ARRIVAL_SHOTS.at(-1).endMs, 62_000);
  let total = 0;
  for (const [index, shot] of arrival.PLANET_ARRIVAL_SHOTS.entries()) {
    if (index > 0) assert.equal(shot.startMs, arrival.PLANET_ARRIVAL_SHOTS[index - 1].endMs);
    total += shot.endMs - shot.startMs;
  }
  assert.equal(total, 62_000);
});

test('each shot starts inclusively and yields to the next at its exact end', () => {
  for (const [index, shot] of arrival.PLANET_ARRIVAL_SHOTS.entries()) {
    assert.equal(arrival.planetArrivalShotAt(shot.startMs).id, shot.id);
    assert.equal(arrival.planetArrivalShotAt(shot.startMs).progress, 0);
    assert.equal(arrival.planetArrivalShotAt(shot.endMs - .001).id, shot.id);
    if (index < 7) assert.equal(arrival.planetArrivalShotAt(shot.endMs).id, arrival.PLANET_ARRIVAL_SHOTS[index + 1].id);
  }
  assert.equal(arrival.planetArrivalShotAt(62_000).id, 'egress');
  assert.equal(arrival.planetArrivalShotAt(62_000).progress, 1);
});

test('invalid and out-of-range presentation times stay within the storyboard', () => {
  for (const milliseconds of [NaN, Infinity, -Infinity, -100]) {
    assert.equal(arrival.planetArrivalShotAt(milliseconds).id, 'orbit');
    assert.equal(arrival.planetArrivalShotAt(milliseconds).progress, 0);
  }
  assert.equal(arrival.planetArrivalShotAt(120_000).progress, 1);
});

test('all campaign missions resolve their own planet, biome, spawn and encounter seed', () => {
  const planets = new Set();
  for (const mission of MISSIONS) {
    const state = fresh({ missionId: mission.id });
    const destination = arrival.planetArrivalDestination(mission.id);
    assert.equal(state.destinationId, destination.body.id);
    assert.equal(state.destinationDisplayName, mission.planetName);
    assert.equal(state.biomeId, mission.biome);
    assert.equal(state.seed, input.encounterRun);
    assert.equal(state.spawnId, `${mission.id}:spawn`);
    assert.equal(arrival.planetArrivalLanding(state).spawnX, worldBlueprintFor(mission.id).spawn.x);
    assert.equal(arrival.planetArrivalLanding(state).floorY, worldBlueprintFor(mission.id).floorY);
    assert.equal(inspect(state).status, 'valid');
    planets.add(state.destinationId);
  }
  assert.equal(planets.size, MISSIONS.length);
});

test('each owned-catalogue hull keeps its real profile path during arrival', () => {
  for (const personalShipId of SHIP_IDS) {
    const state = fresh({ personalShipId });
    assert.equal(arrival.planetArrivalAssets(state).carrier, shipProfileAssetPath(personalShipId));
    assert.equal(inspect(state).status, 'valid');
  }
});

test('missing legacy arrival is absent, not a new run invented by normalization', () => {
  for (const raw of [undefined, null]) {
    assert.equal(inspect(raw).status, 'absent');
    assert.equal(arrival.normalizePlanetArrival(raw, ownerCreatedAt), null);
  }
});

test('constructor refuses foreign content identifiers and unbounded identity or seed', () => {
  for (const changes of [
    { ownerCreatedAt: '' }, { ownerCreatedAt: ' owner' }, { ownerCreatedAt: 'a'.repeat(161) },
    { runId: 'run\n' }, { runId: null }, { encounterRun: -1 }, { encounterRun: 1.5 },
    { encounterRun: 1_000_000_001 }, { encounterRun: Infinity },
    { missionId: '__proto__' }, { missionId: '/game/foo.png' }, { personalShipId: 'wolf-castle' },
    { hunterPresetId: '__proto__' }, { hunterPresetId: 'other-hunter' },
  ]) assert.throws(() => fresh(changes), TypeError);
  assert.equal(inspect(fresh({ hunterPresetId: 'custom' })).status, 'valid');
});

test('future versions are refused without normalizing their data away', () => {
  assert.equal(inspect({ ...fresh(), version: 2 }).status, 'future-version');
  assert.equal(arrival.normalizePlanetArrival({ ...fresh(), version: 2 }, ownerCreatedAt), null);
});

test('owner and run checks cannot attach another campaign or run to the montage', () => {
  assert.equal(inspect(fresh({ ownerCreatedAt: 'another-campaign' })).reason, 'owner');
  assert.equal(inspect(fresh({ runId: 'another-run' })).reason, 'run');
});

test('inspection rejects swapped destination, title, biome, seed and spawn', () => {
  for (const [key, value] of Object.entries({
    destinationId: 'planet-nivalis-k', destinationDisplayName: 'Nivalis-K', biomeId: 'ice',
    spawnId: 'jungle-vey:other', seed: 19,
  })) assert.equal(inspect({ ...fresh(), [key]: value }).status, 'invalid-save', key);
});

test('inspection rejects executable properties, custom prototypes and extra payloads', () => {
  const withGetter = { ...fresh() };
  Object.defineProperty(withGetter, 'elapsedMs', { enumerable: true, get() { throw Error('Getter must not run'); } });
  assert.equal(inspect(withGetter).status, 'invalid-save');
  assert.equal(inspect(Object.assign(Object.create({}), fresh())).status, 'invalid-save');
  assert.equal(inspect({ ...fresh(), injectedPath: '/foreign-ship.png' }).status, 'invalid-save');
  const symbol = { ...fresh(), [Symbol('payload')]: 'unexpected' };
  assert.equal(inspect(symbol).status, 'invalid-save');
});

test('inspection bounds timeline and enforces consistent handoff receipts', () => {
  for (const changes of [
    { elapsedMs: -1 }, { elapsedMs: NaN }, { elapsedMs: Infinity }, { elapsedMs: 62_001 },
    { elapsedMs: 1 }, { status: 'playing', elapsedMs: 62_000 }, { status: 'paused', elapsedMs: 62_000 },
    { status: 'complete', completedBy: null }, { completedBy: 'skipped' },
    { status: 'handoff-pending', completedBy: 'natural', elapsedMs: 61_999 }, { status: 'other' },
  ]) assert.equal(inspect({ ...fresh(), ...changes }).status, 'invalid-save', JSON.stringify(changes));
});

test('serialization round trip preserves the immutable launch identity', () => {
  const initial = playing(33_500);
  const actual = arrival.normalizePlanetArrival(JSON.parse(JSON.stringify(initial)), ownerCreatedAt);
  assert.deepEqual(actual, initial);
  assert.notEqual(actual, initial);
});

test('active time advances only while playing and does not mutate input state', () => {
  const initial = playing(1_000);
  const before = JSON.stringify(initial);
  const advanced = arrival.advancePlanetArrival(initial, 16);
  assert.equal(advanced.elapsedMs, 1_016);
  assert.equal(JSON.stringify(initial), before);
  const paused = arrival.pausePlanetArrival(advanced);
  assert.equal(arrival.advancePlanetArrival(paused, 16), paused);
  assert.equal(arrival.advancePlanetArrival(fresh(), 16).elapsedMs, 0);
});

test('bad deltas cannot advance or rewind arrival time', () => {
  const state = playing(5_000);
  for (const delta of [NaN, Infinity, -Infinity, -1, 0]) assert.equal(arrival.advancePlanetArrival(state, delta), state);
});

test('short frame drops are bounded and a long suspension pauses without consuming time', () => {
  const state = playing(10_000);
  assert.equal(arrival.advancePlanetArrival(state, 700).elapsedMs, 10_100);
  const afterSuspend = arrival.advancePlanetArrival(state, 60_000);
  assert.equal(afterSuspend.elapsedMs, 10_000);
  assert.equal(afterSuspend.status, 'paused');
  assert.equal(arrival.advancePlanetArrival(afterSuspend, 16), afterSuspend);
});

test('reload restarts each current shot paused while retaining the exact run and mission', () => {
  for (const shot of arrival.PLANET_ARRIVAL_SHOTS) {
    const state = playing(shot.startMs + 200);
    const resumed = arrival.resumePlanetArrival(state);
    assert.equal(resumed.elapsedMs, shot.startMs);
    assert.equal(resumed.status, 'paused');
    assert.equal(resumed.runId, input.runId);
    assert.equal(resumed.seed, input.encounterRun);
    assert.equal(resumed.personalShipId, input.personalShipId);
    assert.equal(arrival.startPlanetArrival(resumed).status, 'playing');
  }
});

test('natural ending and skipping converge on one handoff state without a gameplay effect', () => {
  const natural = arrival.advancePlanetArrival(playing(61_990), 16);
  assert.equal(natural.status, 'handoff-pending');
  assert.equal(natural.elapsedMs, 62_000);
  assert.equal(natural.completedBy, 'natural');
  const skipped = arrival.requestPlanetArrivalHandoff(playing(12_000));
  assert.equal(skipped.status, natural.status);
  assert.equal(skipped.completedBy, 'skipped');
  assert.equal(skipped.elapsedMs, 12_000);
  for (const state of [natural, skipped]) {
    assert.equal(state.runId, input.runId);
    assert.equal(inspect(state).status, 'valid');
    assert.equal(arrival.advancePlanetArrival(state, 100), state);
    assert.equal(arrival.requestPlanetArrivalHandoff(state), state);
  }
});

test('skip is available from all eight shots and before visual preload finishes', () => {
  for (const state of [fresh(), ...arrival.PLANET_ARRIVAL_SHOTS.map(shot => playing(shot.startMs + 300))]) {
    const pending = arrival.requestPlanetArrivalHandoff(state);
    assert.equal(pending.status, 'handoff-pending');
    assert.equal(pending.completedBy, 'skipped');
    assert.equal(pending.elapsedMs, state.elapsedMs);
    assert.equal(inspect(pending).status, 'valid');
  }
});

test('early natural completion is refused and completed arrivals never replay', () => {
  const state = playing(2_000);
  assert.equal(arrival.requestPlanetArrivalHandoff(state, 'natural'), state);
  const complete = arrival.completePlanetArrivalHandoff(arrival.requestPlanetArrivalHandoff(state));
  assert.equal(complete.status, 'complete');
  assert.equal(arrival.requestPlanetArrivalHandoff(complete), complete);
  assert.equal(arrival.completePlanetArrivalHandoff(complete), complete);
  assert.equal(arrival.resumePlanetArrival(complete), complete);
  assert.equal(arrival.startPlanetArrival(complete), complete);
});

test('failed durable handoff can retry the same run, reason and presentation time', () => {
  const pending = arrival.advancePlanetArrival(playing(61_999), 2);
  const failed = arrival.failPlanetArrivalHandoff(pending);
  assert.equal(failed.status, 'recoverable-error');
  assert.equal(inspect(failed).status, 'valid');
  const retry = arrival.requestPlanetArrivalHandoff(failed);
  assert.equal(retry.status, 'handoff-pending');
  assert.equal(retry.completedBy, 'natural');
  assert.equal(retry.elapsedMs, 62_000);
  assert.equal(retry.runId, input.runId);
  const acknowledged = arrival.completePlanetArrivalHandoff(retry);
  assert.equal(acknowledged.status, 'complete');
  assert.equal(inspect(acknowledged).status, 'valid');
});

test('only pending handoffs can be acknowledged or failed', () => {
  for (const state of [fresh(), playing(), arrival.pausePlanetArrival(playing())]) {
    assert.equal(arrival.completePlanetArrivalHandoff(state), state);
    assert.equal(arrival.failPlanetArrivalHandoff(state), state);
  }
});

test('rendered arrival identifies real destination, hull, selected rig and spawn', () => {
  const state = fresh({ personalShipId: 'wolf-ship', missionId: 'ice-cryostalker', hunterPresetId: 'wolf' });
  const html = qa.render('app/game/PlanetArrivalCinematic.tsx', {
    state, appearance: appearanceForPreset('wolf'),
    loadout: { armorId: 'hunter', weaponIds: ['wristblades', 'plasma-caster'], gearIds: ['netgun', 'motion-sensor'] },
    onCheckpoint: () => true, onHandoff: () => true, onExit: () => {},
  });
  assert.match(html, /data-arrival-planet="planet-nivalis-k"/);
  assert.match(html, /data-arrival-ship="wolf-ship"/);
  assert.match(html, /data-arrival-hunter="wolf"/);
  assert.match(html, /data-arrival-spawn="ice-cryostalker:spawn"/);
  assert.match(html, /Nivalis-K/);
  assert.match(html, /Passer l’arrivée/);
  assert.doesNotMatch(html, /<canvas/);
});

test('reduced-motion view keeps the same elapsed time and mission contract', () => {
  const state = playing(41_800);
  const before = JSON.stringify(state);
  const html = qa.render('app/game/PlanetArrivalCinematic.tsx', {
    state, appearance: appearanceForPreset('jungle-hunter'), reducedMotion: true,
    loadout: { armorId: 'hunter', weaponIds: ['wristblades', 'plasma-caster'], gearIds: ['netgun', 'motion-sensor'] },
    onCheckpoint: () => true, onHandoff: () => true, onExit: () => {},
  });
  assert.match(html, /data-arrival-reduced-motion="true"/);
  assert.match(html, /data-arrival-shot="atmosphere"/);
  assert.match(html, /data-arrival-elapsed="41000"/);
  assert.equal(JSON.stringify(state), before);
});
