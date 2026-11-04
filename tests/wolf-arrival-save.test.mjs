import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

// Bundle and execute the production save/archive modules, including their actual
// catalogue and campaign validation. No module or serializer is substituted.
const bundled = await build({
  stdin: {
    contents: [
      'export * as saves from "./app/game/save.ts";',
      'export * as castle from "./app/game/systems/wolfCastle.ts";',
      'export * as combat from "./app/game/systems/wolfCastleCombat.ts";',
      'export * as arrival from "./app/game/systems/planetArrival.ts";',
      'export * as arrivalRun from "./app/game/systems/planetArrivalRun.ts";',
      'export * as archives from "./app/game/systems/completeArchive.ts";',
      'export * as slots from "./app/game/systems/campaignSlots.ts";',
      'export * as fleet from "./app/game/systems/progression.ts";',
      'export * as hunts from "./app/game/systems/activeHuntSave.ts";',
      'export * as docking from "./app/game/systems/clanShipDocking.ts";',
      'export { captureHuntGauntletV142 } from "./app/game/systems/huntGauntletIdentityV142.ts";',
      'export { normalizeHuntAccessibilityV112 } from "./app/game/systems/huntAccessibilityV112.ts";',
    ].join('\n'),
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
    sourcefile: 'wolf-arrival-save-test-entry.ts', loader: 'ts',
  },
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
});
const { saves, castle, combat, arrival, arrivalRun, archives, slots, fleet, hunts, docking, captureHuntGauntletV142, normalizeHuntAccessibilityV112 } =
  await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const OWNER = '2026-11-04T08:00:00.000Z', OTHER = '2026-11-04T08:01:00.000Z', SHIP = 'classic-predator-spaceship';
const MAIN = saves.SAVE_STORAGE_KEY;

function store(entries = []) {
  const values = new Map(entries);
  return {
    values, writes: [], quotaKey: null, failReadbackKey: null, pendingReadbackKey: null,
    get length() { return values.size; }, key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { if (this.pendingReadbackKey === key) { this.pendingReadbackKey = null; throw Error('Readback refused'); } return values.get(key) ?? null; },
    setItem(key, value) {
      if (this.quotaKey === key || this.quotaKey === '*') throw new DOMException('Full', 'QuotaExceededError');
      this.writes.push(['set', key]); values.set(key, value);
      if (this.failReadbackKey === key) { this.failReadbackKey = null; this.pendingReadbackKey = key; }
    },
    removeItem(key) { this.writes.push(['remove', key]); values.delete(key); },
  };
}
const bytes = storage => [...storage.values].sort(([a], [b]) => a.localeCompare(b));
function write(save, storage) {
  const result = saves.writeSaveWithStatus(save, storage, MAIN);
  assert.equal(result.persisted, true, result.failure);
  return result.save;
}
function step(state, action) {
  const result = castle.actWolfCastle(state, action, { ownerCreatedAt: state.ownerCreatedAt, personalShipId: state.personalShipId });
  assert.equal(result.accepted, true, result.message); return result.state;
}
function castleAt(roomId = 'royal-berth', ship = SHIP) {
  let visit = step(castle.createWolfCastleVisit(OWNER, ship, { mode: 'audience', invitationId: 'wolf-protocol:introduction' }), { type: 'board' });
  for (const next of castle.wolfCastleRoute(visit.roomId, roomId).slice(1)) visit = step(visit, { type: 'move-room', roomId: next });
  return visit;
}
function castleFixture(roomId = 'royal-berth', ship = SHIP) {
  const storage = store(), state = castleAt(roomId, ship), save = write({ ...saves.defaultSave(OWNER), wolfCastle: state }, storage);
  return { state, save, storage };
}
// This is the GameClient.huntConfiguration payload, using its production helpers.
function frozenConfiguration(save) {
  return structuredClone({
    inventory: save.inventory, loadout: save.loadout, appearance: save.appearance,
    gauntletVariantId: captureHuntGauntletV142(undefined, save.profile.rankId, save.gauntletV134?.claimedStudies ?? []),
    visualOptions: { screenShake: save.settings.screenShake, reducedGore: save.settings.reducedGore,
      highContrastVision: save.settings.highContrastVision,
      huntAccessibility: normalizeHuntAccessibilityV112(save.settings.huntAccessibility) },
    elapsedSeconds: 0,
  });
}
function arrivalFixture(status = 'prepared', ship = SHIP) {
  const storage = store(), base = saves.defaultSave(OWNER), missionId = 'jungle-vey';
  const state = arrival.createPlanetArrival({ ownerCreatedAt: OWNER, runId: 'wolf-arrival-original-run',
    missionId, encounterRun: base.missionProgress[missionId].attempts, personalShipId: ship, hunterPresetId: base.appearance.presetId });
  if (status === 'playing' || status === 'paused') Object.assign(state, { status, elapsedMs: 35620 });
  else if (['handoff-pending', 'complete', 'recoverable-error'].includes(status)) Object.assign(state, { status, elapsedMs: 35620, completedBy: 'skipped' });
  const run = { version: 1, ownerCreatedAt: OWNER, runId: state.runId, startedAt: OWNER,
    difficultyId: base.settings.difficultyId, configuration: frozenConfiguration(base) };
  assert.equal(arrivalRun.inspectPlanetArrivalRun(run, state).status, 'valid');
  const save = write({ ...base, planetArrival: state, planetArrivalRun: run }, storage);
  return { save, state, run, storage };
}
function activeHunt(save, overrides = {}) {
  return { version: hunts.ACTIVE_HUNT_SAVE_VERSION, runtimeRevision: hunts.ACTIVE_HUNT_RUNTIME_REVISION,
    ownerSaveCreatedAt: save.createdAt, missionId: 'jungle-vey', difficultyId: save.settings.difficultyId,
    encounterRun: save.missionProgress['jungle-vey'].attempts, runId: save.planetArrival?.runId ?? 'existing-hunt',
    sequence: 1, startedAt: OWNER, savedAt: OWNER, configuration: frozenConfiguration(save), snapshot: { elapsed: 0 }, retryCheckpoint: null,
    ...overrides };
}
function installFleet(save, storage, ship = SHIP) {
  const original = fleet.createDefaultShipProgression(save, OWNER);
  const value = fleet.normalizeShipProgression({ ...original, selectedShipId: ship, unlockedShipIds: [...new Set([...original.unlockedShipIds, ship])] }, save, OWNER);
  assert(fleet.validateCanonicalShipProgression(value, save));
  storage.setItem(fleet.SHIP_PROGRESSION_STORAGE_KEY, JSON.stringify(value));
  return value;
}
async function withLocks(task) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: async (_name, _options, callback) => callback({}) } } });
  try { return await task(); } finally { if (previous) Object.defineProperty(globalThis, 'navigator', previous); else delete globalThis.navigator; }
}
const slotDocument = storage => JSON.parse(storage.getItem(slots.campaignSlotStorageKey(1)));
const revision = storage => slotDocument(storage).revision;
const last = storage => { const doc = slotDocument(storage); return doc.checkpoints.find(checkpoint => checkpoint.id === doc.lastCheckpointId); };

test('legacy saves and explicit null fields retain their exact optional-field semantics', () => {
  for (const original of [saves.defaultSave(OWNER), { ...saves.defaultSave(OWNER), wolfCastle: null, planetArrival: null, planetArrivalRun: null }]) {
    const storage = store(), save = write(original, storage), exported = archives.createCompleteArchive(save, storage, OWNER);
    for (const parsed of [saves.parseSaveImport(saves.exportSave(save)).save, saves.loadSaveWithStatus(store(bytes(storage)), MAIN).save, exported.archive.campaign]) {
      for (const key of ['wolfCastle', 'planetArrival', 'planetArrivalRun']) {
        assert.equal(Object.hasOwn(parsed, key), Object.hasOwn(original, key));
        if (Object.hasOwn(original, key)) assert.equal(parsed[key], null);
      }
    }
  }
});

test('all nine castle rooms survive durable reload, portable export and full archive without changing equipment or progression', () => {
  const baseline = saves.normalizeSave(saves.defaultSave(OWNER));
  for (const roomId of castle.WOLF_CASTLE_ROOM_IDS) {
    const { save, state, storage } = castleFixture(roomId);
    const before = bytes(storage), count = storage.writes.length;
    const reload = saves.loadSaveWithStatus(store(before), MAIN);
    assert.equal(reload.loaded, true, reload.failure); assert.deepEqual(reload.save.wolfCastle, state);
    const imported = saves.parseSaveImport(saves.exportSave(reload.save));
    assert(imported.save, imported.failure); assert.deepEqual(imported.save.wolfCastle, state);
    const complete = archives.createCompleteArchive(save, storage, OWNER);
    assert.deepEqual(complete.archive.campaign.wolfCastle, state);
    for (const field of ['inventory', 'loadout', 'appearance', 'missionProgress', 'trophies']) assert.deepEqual(complete.archive.campaign[field], baseline[field]);
    assert.deepEqual(bytes(storage), before); assert.equal(storage.writes.length, count);
  }
});

test('existing V1 castle visits migrate through the real save loader without losing rooms, audience or seals', () => {
  let { save, state } = castleFixture('royal-audience');
  state = step(state, { type: 'hear-audience' });
  state = step(state, { type: 'move-room', roomId: 'royal-council' });
  state = step(state, { type: 'decide-audience', decision: 'accepted' });
  for (const roomId of castle.wolfCastleRoute(state.roomId, 'royal-court').slice(1)) state = step(state, { type: 'move-room', roomId });
  state = step(state, { type: 'start-trial' });
  state = step(state, { type: 'activate-seal', sealId: 'threshold' });
  const legacy = { ...state, version: 1 };
  delete legacy.position; delete legacy.combat; delete legacy.revision;
  save = { ...save, wolfCastle: legacy };
  const storage = store([[MAIN, JSON.stringify(save)]]);
  const loaded = saves.loadSaveWithStatus(storage, MAIN);
  assert.equal(loaded.loaded, true, loaded.failure);
  const migrated = loaded.save.wolfCastle;
  assert.equal(migrated.version, castle.WOLF_CASTLE_VERSION);
  assert.equal(migrated.audience, 'accepted');
  assert.deepEqual(migrated.trial, legacy.trial);
  assert.deepEqual(migrated.visitedRooms, legacy.visitedRooms);
  assert.deepEqual(migrated.position, { ...castle.wolfCastleEntryPoint(legacy.roomId, legacy.entryFrom), facing: 1 });
  assert.equal(migrated.combat, null);
  assert.deepEqual(saves.parseSaveImport(saves.exportSave(loaded.save)).save.wolfCastle, migrated);
});

test('exact castle position and facing cross durable save, portable export and complete archive', () => {
  const { save, state, storage } = castleFixture('royal-archives');
  const position = { x: 957.25, y: 611.5, facing: -1 };
  const result = castle.applyWolfCastleCheckpoint(state, {
    ownerCreatedAt: OWNER, personalShipId: SHIP, roomId: state.roomId,
    expectedRevision: state.revision, position, combat: state.combat,
  }, { ownerCreatedAt: OWNER, personalShipId: SHIP });
  assert.equal(result.accepted, true, result.reason);
  const updated = write({ ...save, wolfCastle: result.state }, storage);
  const reloaded = saves.loadSaveWithStatus(store(bytes(storage)), MAIN);
  assert.equal(reloaded.loaded, true, reloaded.failure);
  assert.deepEqual(reloaded.save.wolfCastle.position, position);
  assert.deepEqual(saves.parseSaveImport(saves.exportSave(updated)).save.wolfCastle, result.state);
  assert.deepEqual(archives.createCompleteArchive(updated, storage, OWNER).archive.campaign.wolfCastle, result.state);
  const bad = structuredClone(updated); bad.wolfCastle.position.x = -100;
  const before = bytes(storage);
  assert.equal(saves.writeSaveWithStatus(bad, storage, MAIN).persisted, false);
  assert.deepEqual(bytes(storage), before);
});

test('castle progression crosses the real complete-archive import transaction intact', () => {
  let { save, state, storage } = castleFixture('royal-audience');
  state = step(state, { type: 'hear-audience' }); state = step(state, { type: 'move-room', roomId: 'royal-council' });
  state = step(state, { type: 'decide-audience', decision: 'accepted' });
  for (const roomId of castle.wolfCastleRoute(state.roomId, 'royal-court').slice(1)) state = step(state, { type: 'move-room', roomId });
  state = step(state, { type: 'start-trial' }); state = step(state, { type: 'activate-seal', sealId: 'threshold' });
  save = write({ ...save, wolfCastle: state }, storage);
  const complete = archives.createCompleteArchive(save, storage, OWNER);
  const destination = store(), plan = archives.prepareCompleteArchiveImport(complete.archive, destination);
  const imported = archives.importCompleteArchive(plan, destination);
  assert.equal(imported.persisted, true, imported.recovery.message);
  assert.deepEqual(saves.loadSaveWithStatus(store(bytes(destination)), MAIN).save.wolfCastle, state);
  assert.equal(saves.loadSaveWithStatus(destination, MAIN).save.wolfCastle.trial.progress, 1);
});

test('a live royal fight resumes with identical health, stamina, position and enemy anticipation through save and full archive', () => {
  let { save, state, storage } = castleFixture('royal-court');
  state = step(state, { type: 'start-combat' });
  let live = state.combat;
  const input = { moveX: 0, moveY: 0, attack: false, parry: false, evade: false };
  for (let i = 0; i < 100 && live.enemy.phase !== 'windup'; i++) live = combat.stepWolfCastleCombat(live, input, 50);
  assert.equal(live.enemy.phase, 'windup');
  const result = castle.applyWolfCastleCheckpoint(state, {
    ownerCreatedAt: OWNER, personalShipId: SHIP, roomId: state.roomId, expectedRevision: state.revision,
    position: { x: live.player.x, y: live.player.y, facing: live.player.facing }, combat: live,
  }, { ownerCreatedAt: OWNER, personalShipId: SHIP });
  assert.equal(result.accepted, true, result.reason);
  save = write({ ...save, wolfCastle: result.state }, storage);
  const loaded = saves.loadSaveWithStatus(store(bytes(storage)), MAIN);
  assert.equal(loaded.loaded, true, loaded.failure);
  const exported = archives.createCompleteArchive(save, storage, OWNER);
  const destination = store();
  const plan = archives.prepareCompleteArchiveImport(exported.archive, destination);
  const imported = archives.importCompleteArchive(plan, destination);
  assert.equal(imported.persisted, true, imported.recovery.message);
  for (const visit of [loaded.save.wolfCastle, saves.loadSaveWithStatus(destination, MAIN).save.wolfCastle]) {
    assert.deepEqual(visit, result.state);
    assert.deepEqual(combat.stepWolfCastleCombat(visit.combat, input, 50), combat.stepWolfCastleCombat(live, input, 50));
    assert.equal(castle.actWolfCastle(visit, { type: 'move-room', roomId: 'royal-service-pass' }, { ownerCreatedAt: OWNER, personalShipId: SHIP }).accepted, false);
  }
  const failed = structuredClone(save); failed.wolfCastle.combat.version += 1;
  assert.equal(saves.parseSaveImport(JSON.stringify(failed)).failure, 'future-version');
  assert.deepEqual(saves.loadSaveWithStatus(destination, MAIN).save.wolfCastle, result.state);
});

test('foreign or future castle data cannot overwrite an existing campaign or be silently stripped', () => {
  const { save, storage } = castleFixture('royal-archives'), before = bytes(storage), count = storage.writes.length;
  for (const [patch, failure] of [[{ ownerCreatedAt: OTHER }, 'invalid-save'], [{ version: castle.WOLF_CASTLE_VERSION + 1, futureRoom: 'keep' }, 'future-version'], [{ roomId: 'missing' }, 'invalid-save'], [{ personalShipId: 'invented' }, 'invalid-save']]) {
    const candidate = structuredClone(save); Object.assign(candidate.wolfCastle, patch);
    assert.equal(saves.parseSaveImport(JSON.stringify(candidate)).failure, failure);
    assert.equal(saves.importSaveWithStatus(JSON.stringify(candidate), storage, MAIN).failure, failure);
    assert.equal(saves.writeSaveWithStatus(candidate, storage, MAIN).persisted, false);
    assert.throws(() => saves.exportSave(candidate));
    assert.deepEqual(bytes(storage), before); assert.equal(storage.writes.length, count);
  }
});

test('nondefault castle and arrival hulls require their matching owned fleet in complete archives', () => {
  for (const fixture of [() => castleFixture('royal-gallery', 'wolf-ship'), () => arrivalFixture('paused', 'wolf-ship')]) {
    const { save, storage } = fixture();
    assert.throws(() => archives.createCompleteArchive(save, storage, OWNER), /invalid-sidecar/);
    const matchingFleet = installFleet(save, storage, 'wolf-ship');
    const complete = archives.createCompleteArchive(save, storage, OWNER);
    assert.deepEqual(complete.archive.attachments.shipProgression, matchingFleet);
    const invalid = structuredClone(complete.archive);
    invalid.attachments.shipProgression = fleet.createDefaultShipProgression(save, OWNER);
    assert.equal(archives.parseCompleteArchive(JSON.stringify(invalid)).failure, 'invalid-sidecar');
    assert.equal(slots.prepareCampaignSlotImport(1, saves.exportSave(save), store()).ok, false, 'a lightweight file cannot invent its omitted fleet');
  }
});

test('every arrival phase preserves the frozen destination, ship, hunter, encounter and run on reload/export', () => {
  for (const status of ['prepared', 'playing', 'paused', 'handoff-pending', 'recoverable-error', 'complete']) {
    const { save, state, run, storage } = arrivalFixture(status);
    const reloaded = saves.loadSaveWithStatus(store(bytes(storage)), MAIN);
    assert.equal(reloaded.loaded, true, reloaded.failure);
    assert.deepEqual(reloaded.save.planetArrival, state); assert.deepEqual(reloaded.save.planetArrivalRun, run);
    const imported = saves.parseSaveImport(saves.exportSave(save));
    assert(imported.save, imported.failure); assert.deepEqual(imported.save.planetArrival, state); assert.deepEqual(imported.save.planetArrivalRun, run);
    const complete = archives.createCompleteArchive(save, storage, OWNER);
    assert.deepEqual(complete.archive.campaign.planetArrival, state); assert.deepEqual(complete.archive.campaign.planetArrivalRun, run);
    assert.equal(complete.archive.attachments.activeHunt, null, 'a montage does not fabricate a hunt snapshot');
  }
});

test('arrival and its frozen run must be validated together, including owner, version and original configuration', () => {
  const { save, storage } = arrivalFixture('paused'), before = bytes(storage), writes = storage.writes.length;
  const mutations = [
    [value => { delete value.planetArrivalRun; }, 'invalid-save'],
    [value => { delete value.planetArrival; }, 'invalid-save'],
    [value => { value.planetArrivalRun = null; }, 'invalid-save'],
    [value => { value.planetArrival.ownerCreatedAt = OTHER; }, 'invalid-save'],
    [value => { value.planetArrival.version = 2; }, 'future-version'],
    [value => { value.planetArrivalRun.version = 2; }, 'future-version'],
    [value => { value.planetArrivalRun.ownerCreatedAt = OTHER; }, 'invalid-save'],
    [value => { value.planetArrivalRun.runId = 'other-run'; }, 'invalid-save'],
    [value => { value.planetArrivalRun.difficultyId = 'elder'; }, 'invalid-save'],
    [value => { value.planetArrivalRun.configuration = {}; }, 'invalid-save'],
    [value => { value.planetArrivalRun.configuration.appearance.presetId = 'missing-hunter'; }, 'invalid-save'],
    [value => { value.planetArrivalRun.configuration.visualOptions.screenShake = 'yes'; }, 'invalid-save'],
    [value => { value.planetArrivalRun.configuration.elapsedSeconds = 1; }, 'invalid-save'],
    [value => { value.planetArrival.destinationDisplayName = 'Somewhere else'; }, 'invalid-save'],
    [value => { value.missionProgress['jungle-vey'].attempts++; }, 'invalid-save'],
  ];
  for (const [mutate, failure] of mutations) {
    const candidate = structuredClone(save); mutate(candidate);
    assert.equal(saves.parseSaveImport(JSON.stringify(candidate)).failure, failure);
    assert.equal(saves.writeSaveWithStatus(candidate, storage, MAIN).persisted, false);
    assert.throws(() => saves.exportSave(candidate));
    assert.deepEqual(bytes(storage), before); assert.equal(storage.writes.length, writes);
  }
});

test('a campaign cannot be aboard castle or Clan Ship while an arrival is pending', () => {
  const { save } = arrivalFixture('prepared');
  assert.equal(saves.parseSaveImport(JSON.stringify({ ...save, wolfCastle: castleAt('royal-gallery') })).failure, 'invalid-save');
  const clan = docking.actClanShipDocking(docking.createClanShipDockingState(OWNER, SHIP), { type: 'approach' }, { ownerCreatedAt: OWNER, personalShipId: SHIP }).state;
  assert.equal(saves.parseSaveImport(JSON.stringify({ ...save, clanShipDocking: clan })).failure, 'invalid-save');
  const departed = step(castleAt(), { type: 'depart' });
  assert(saves.parseSaveImport(JSON.stringify({ ...save, wolfCastle: departed })).save, 'past visits remain as history');
});

test('pending arrival plus active hunt is refused; completed arrival permits only a coherent mission sidecar', () => {
  for (const status of ['prepared', 'playing', 'paused', 'handoff-pending', 'recoverable-error']) {
    const { save, storage } = arrivalFixture(status), full = archives.createCompleteArchive(save, storage, OWNER).archive;
    full.attachments.activeHunt = activeHunt(save);
    assert.equal(archives.parseCompleteArchive(JSON.stringify(full)).failure, 'incompatible-hunt');
  }
  const { save, storage } = arrivalFixture('complete'), full = archives.createCompleteArchive(save, storage, OWNER).archive;
  full.attachments.activeHunt = activeHunt(save);
  assert(archives.parseCompleteArchive(JSON.stringify(full)).archive);
  full.attachments.activeHunt.encounterRun++;
  assert.equal(archives.parseCompleteArchive(JSON.stringify(full)).failure, 'incompatible-hunt');
  const atCastle = castleFixture('royal-berth'), castleArchive = archives.createCompleteArchive(atCastle.save, atCastle.storage, OWNER).archive;
  castleArchive.attachments.activeHunt = activeHunt(atCastle.save);
  assert.equal(archives.parseCompleteArchive(JSON.stringify(castleArchive)).failure, 'incompatible-hunt');
});

test('quota refusal and uncertain readback preserve room/arrival changes until confirmed by the real save writer', () => {
  for (const setup of [
    () => { const fixture = castleFixture('royal-gallery'); return { ...fixture, next: { ...fixture.save, wolfCastle: step(fixture.state, { type: 'move-room', roomId: 'royal-audience' }) } }; },
    () => { const fixture = arrivalFixture('playing'); return { ...fixture, next: { ...fixture.save, planetArrival: arrival.pausePlanetArrival(fixture.state) } }; },
  ]) {
    const { save, storage, next } = setup(), before = bytes(storage);
    storage.quotaKey = MAIN;
    assert.equal(saves.writeSaveWithStatus(next, storage, MAIN).persisted, false);
    assert.deepEqual(bytes(storage), before);
    assert.deepEqual(saves.loadSaveWithStatus(storage, MAIN).save.wolfCastle, save.wolfCastle);
    assert.deepEqual(saves.loadSaveWithStatus(storage, MAIN).save.planetArrival, save.planetArrival);
    storage.quotaKey = null; storage.failReadbackKey = MAIN;
    const attempted = saves.writeSaveWithStatus(next, storage, MAIN);
    assert.equal(attempted.persisted, false);
    const written = bytes(storage), count = storage.writes.length;
    const recovered = saves.reconcileSaveWrite(attempted, OWNER, storage, MAIN);
    assert.equal(recovered.status, 'confirmed', recovered.failure);
    assert.deepEqual(recovered.save.wolfCastle, next.wolfCastle); assert.deepEqual(recovered.save.planetArrival, next.planetArrival);
    assert.deepEqual(bytes(storage), written); assert.equal(storage.writes.length, count);
  }
});

test('future castle or arrival data protects the primary bytes even with a valid older backup', () => {
  for (const [fixture, key] of [[castleFixture('royal-archives'), 'wolfCastle'], [arrivalFixture('paused'), 'planetArrival']]) {
    const future = structuredClone(fixture.save); future[key].version += 1; future[key].unrecognizedProgress = { keep: true };
    const storage = store([[MAIN, JSON.stringify(future)], [MAIN + '.backup', JSON.stringify(fixture.save)]]), before = bytes(storage);
    const loaded = saves.loadSaveWithStatus(storage, MAIN);
    assert.equal(loaded.loaded, false); assert.equal(loaded.failure, 'future-version');
    assert.equal(saves.writeSaveWithStatus(fixture.save, storage, MAIN).failure, 'protected-save');
    assert.deepEqual(bytes(storage), before); assert.equal(storage.writes.length, 0);
  }
});

test('checkpoint migration, Continue and activation preserve every castle room and replace stale deck metadata', async () => withLocks(async () => {
  for (const roomId of castle.WOLF_CASTLE_ROOM_IDS) {
    const { state, storage } = castleFixture(roomId);
    const migrated = await slots.migrateLegacyCampaignSlot(storage);
    assert.equal(migrated.ok, true, migrated.message);
    assert.equal(last(storage).resumeLocation, 'wolf-castle');
    const saved = await slots.saveCampaignCheckpoint(1, { kind: 'manual', index: 1, expectedRevision: revision(storage), location: 'deck' }, storage);
    assert.equal(saved.ok, true, saved.message); assert.equal(saved.checkpoint.resumeLocation, 'wolf-castle');
    const continued = await slots.continueCampaignSlot(1, { expectedRevision: revision(storage), location: 'deck' }, storage);
    assert.equal(continued.ok, true, continued.message); assert.equal(continued.checkpoint.resumeLocation, 'wolf-castle');
    assert.deepEqual(continued.save.wolfCastle, state);
    const reloaded = store(bytes(storage)), activated = await slots.activateCampaignCheckpoint(1, 'manual-1', { expectedRevision: revision(reloaded) }, reloaded);
    assert.equal(activated.ok, true, activated.message); assert.deepEqual(activated.save.wolfCastle, state);
  }
}));

test('prepared, paused and completed arrivals without a Canvas snapshot retain their recoverable start after Continue', async () => withLocks(async () => {
  for (const status of ['prepared', 'paused', 'complete']) {
    const { state, run, storage } = arrivalFixture(status);
    const migrated = await slots.migrateLegacyCampaignSlot(storage);
    assert.equal(migrated.ok, true, migrated.message); assert.equal(last(storage).resumeLocation, 'planet-arrival');
    const continued = await slots.continueCampaignSlot(1, { expectedRevision: revision(storage), location: 'deck' }, storage);
    assert.equal(continued.ok, true, continued.message); assert.equal(continued.checkpoint.resumeLocation, 'planet-arrival');
    assert.deepEqual(continued.save.planetArrival, state); assert.deepEqual(continued.save.planetArrivalRun, run);
    assert.equal(storage.getItem(hunts.ACTIVE_HUNT_STORAGE_KEY), null, 'the pending/recoverable mount never fabricates a Canvas snapshot');
  }
}));

test('a confirmed hunt sidecar wins after handoff and a departed castle returns to the personal deck', async () => withLocks(async () => {
  const started = arrivalFixture('complete');
  started.storage.setItem(hunts.ACTIVE_HUNT_STORAGE_KEY, JSON.stringify(activeHunt(started.save)));
  const migrated = await slots.migrateLegacyCampaignSlot(started.storage);
  assert.equal(migrated.ok, true, migrated.message); assert.equal(last(started.storage).resumeLocation, 'mission');
  const continued = await slots.continueCampaignSlot(1, { expectedRevision: revision(started.storage) }, started.storage);
  assert.equal(continued.ok, true, continued.message); assert.equal(continued.checkpoint.resumeLocation, 'mission');
  const visited = castleFixture();
  assert.equal((await slots.migrateLegacyCampaignSlot(visited.storage)).ok, true);
  const departed = step(visited.state, { type: 'depart' });
  write({ ...visited.save, wolfCastle: departed }, visited.storage);
  const returned = await slots.continueCampaignSlot(1, { expectedRevision: revision(visited.storage), location: 'wolf-castle' }, visited.storage);
  assert.equal(returned.ok, true, returned.message); assert.equal(returned.checkpoint.resumeLocation, 'deck');
  assert.deepEqual(returned.save.wolfCastle, departed);
}));
