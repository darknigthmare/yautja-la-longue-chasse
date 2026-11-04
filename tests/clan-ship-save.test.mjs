import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const saves = qa.load('app/game/save.ts');
const docking = qa.load('app/game/systems/clanShipDocking.ts');
const archives = qa.load('app/game/systems/completeArchive.ts');
const cloud = qa.load('app/game/systems/cloudArchiveV71.ts');
const slots = qa.load('app/game/systems/campaignSlots.ts');
const progression = qa.load('app/game/systems/progression.ts');
const { ARCHIVE_TRANSFER_JOURNAL_KEY } = qa.load('app/game/systems/archiveTransferGuard.ts');
const OWNER = '2026-11-04T10:00:00.000Z';
const OTHER_OWNER = '2026-11-04T11:00:00.000Z';
const SHIP = 'classic-predator-spaceship';
const MAIN = saves.SAVE_STORAGE_KEY;

function store(entries = []) {
  const values = new Map(entries);
  return {
    values, writes: [], quotaKey: null, failReadbackKey: null, pendingReadbackKey: null,
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) {
      if (this.pendingReadbackKey === key) {
        this.pendingReadbackKey = null;
        throw Error('Uncertain readback');
      }
      return values.get(key) ?? null;
    },
    setItem(key, raw) {
      if (this.quotaKey === '*' || this.quotaKey === key) throw new DOMException('Full', 'QuotaExceededError');
      this.writes.push(['set', key]);
      values.set(key, raw);
      if (this.failReadbackKey === key) {
        this.failReadbackKey = null;
        this.pendingReadbackKey = key;
      }
    },
    removeItem(key) { this.writes.push(['remove', key]); values.delete(key); },
  };
}

function snapshot(storage) {
  return [...storage.values].sort(([a], [b]) => a.localeCompare(b));
}

async function withLocks(run) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { locks: { request: async (_name, _options, callback) => callback({}) } },
  });
  try { return await run(); }
  finally {
    if (previous) Object.defineProperty(globalThis, 'navigator', previous);
    else delete globalThis.navigator;
  }
}

function visitAt(status = 'aboard', roomId = 'hangar', ownerCreatedAt = OWNER, personalShipId = SHIP) {
  let state = docking.createClanShipDockingState(ownerCreatedAt, personalShipId);
  const context = { ownerCreatedAt, personalShipId };
  const commands = status === 'free-flight' ? [] : status === 'approach' ? ['approach']
    : status === 'docked' ? ['approach', 'dock'] : ['approach', 'dock', 'board'];
  const actions = commands.map(type => ({ type }));
  if (status === 'aboard' && roomId !== 'hangar') actions.push({ type: 'move-room', roomId });
  for (const action of actions) {
    const result = docking.actClanShipDocking(state, action, context);
    assert.equal(result.accepted, true, result.message);
    state = result.state;
  }
  return state;
}

function write(save, storage) {
  const result = saves.writeSaveWithStatus(save, storage, MAIN);
  assert.equal(result.persisted, true, result.failure);
  return result.save;
}

function fixture(status = 'aboard', roomId = 'hangar', owner = OWNER) {
  const base = saves.defaultSave(owner);
  base.profile.hunterName = owner === OWNER ? 'Visiteur du clan' : 'Autre chasseur';
  base.profile.playTimeSeconds = 77;
  const storage = store();
  const state = visitAt(status, roomId, owner);
  const save = write({ ...base, clanShipDocking: state }, storage);
  return { base, state, save, storage };
}

const document = (storage, id = 1) => JSON.parse(storage.getItem(slots.campaignSlotStorageKey(id)));
const revision = (storage, id = 1) => document(storage, id).revision;
const lastCheckpoint = (storage, id = 1) => {
  const doc = document(storage, id);
  return doc.checkpoints.find(checkpoint => checkpoint.id === doc.lastCheckpointId);
};
const autosave = (storage, location, id = 1) => slots.saveCampaignCheckpoint(id, {
  kind: 'auto', expectedRevision: revision(storage, id), ...(location ? { location } : {}),
}, storage);

async function migrated(storage) {
  const result = await slots.migrateLegacyCampaignSlot(storage);
  assert.equal(result.ok, true, result.message);
  return storage;
}

function setVisit(storage, status, roomId = 'hangar') {
  const current = saves.loadSaveWithStatus(storage, MAIN);
  assert.equal(current.loaded, true, current.failure);
  return write({ ...current.save, clanShipDocking: visitAt(status, roomId, current.save.createdAt) }, storage);
}

const gameplay = save => ({
  profile: save.profile, inventory: save.inventory, loadout: save.loadout,
  missionProgress: save.missionProgress, trophies: save.trophies, homeworld: save.homeworld, justice: save.justice,
});

test('old campaign files and exports preserve absent or explicit null visits', () => {
  for (const save of [saves.defaultSave(OWNER), { ...saves.defaultSave(OWNER), clanShipDocking: null }]) {
    const present = Object.hasOwn(save, 'clanShipDocking');
    for (const raw of [JSON.stringify(save), saves.exportSave(save)]) {
      const parsed = saves.parseSaveImport(raw);
      assert(parsed.save, parsed.failure);
      assert.equal(Object.hasOwn(parsed.save, 'clanShipDocking'), present);
      if (present) assert.equal(parsed.save.clanShipDocking, null);
    }
    const storage = store();
    const saved = write(save, storage);
    const reloaded = saves.loadSaveWithStatus(store(snapshot(storage)), MAIN);
    assert.equal(reloaded.loaded, true, reloaded.failure);
    assert.equal(Object.hasOwn(reloaded.save, 'clanShipDocking'), present);
    const complete = archives.createCompleteArchive(saved, storage, OWNER);
    assert.equal(Object.hasOwn(complete.archive.campaign, 'clanShipDocking'), present);
  }
});

test('every docking stage and occupied room survive durable reload and portable export without rewards', () => {
  const cases = [
    ...['free-flight', 'approach', 'docked'].map(status => [status, 'hangar']),
    ...docking.CLAN_SHIP_ROOM_IDS.map(roomId => ['aboard', roomId]),
  ];
  for (const [status, roomId] of cases) {
    const { base, state, save, storage } = fixture(status, roomId);
    const reopened = store(snapshot(storage));
    const bytes = snapshot(reopened);
    const loaded = saves.loadSaveWithStatus(reopened, MAIN);
    assert.equal(loaded.loaded, true, loaded.failure);
    assert.deepEqual(loaded.save.clanShipDocking, state);
    assert.deepEqual(snapshot(reopened), bytes);
    assert.equal(reopened.writes.length, 0);
    const imported = saves.parseSaveImport(saves.exportSave(loaded.save));
    assert(imported.save, imported.failure);
    assert.deepEqual(imported.save.clanShipDocking, state);
    assert.deepEqual(gameplay(imported.save), gameplay(saves.normalizeSave(base)));
    assert.deepEqual(saves.normalizeSave(save).clanShipDocking, state);
  }
});

test('future, foreign and inconsistent visit payloads cannot overwrite a confirmed campaign', () => {
  const { save, storage } = fixture('aboard', 'archives');
  const before = snapshot(storage), writes = storage.writes.length;
  const changes = [
    [state => { state.version = 2; state.futureRoom = 'preserve'; }, 'future-version'],
    [state => { state.ownerCreatedAt = OTHER_OWNER; }, 'invalid-save'],
    [state => { state.clanShipId = SHIP; }, 'invalid-save'],
    [state => { state.personalShipId = 'invented-hull'; }, 'invalid-save'],
    [state => { state.status = 'docked'; }, 'invalid-save'],
    [state => { state.roomId = 'castle'; }, 'invalid-save'],
    [state => { delete state.roomId; }, 'invalid-save'],
  ];
  for (const [change, failure] of changes) {
    const invalid = structuredClone(save);
    change(invalid.clanShipDocking);
    const raw = JSON.stringify(invalid);
    assert.equal(saves.parseSaveImport(raw).failure, failure);
    assert.equal(saves.importSaveWithStatus(raw, storage, MAIN).failure, failure);
    assert.equal(saves.writeSaveWithStatus(invalid, storage, MAIN).persisted, false);
    assert.throws(() => saves.exportSave(invalid));
    assert.deepEqual(snapshot(storage), before);
    assert.equal(storage.writes.length, writes);
  }
});

test('a future primary visit protects its bytes even beside a compatible older backup', () => {
  const { save } = fixture('aboard', 'conseil');
  const future = structuredClone(save);
  future.clanShipDocking.version = 2;
  future.clanShipDocking.futureProgress = { preserve: true };
  const storage = store([[MAIN, JSON.stringify(future)], [MAIN + '.backup', JSON.stringify(save)]]);
  const before = snapshot(storage);
  const loaded = saves.loadSaveWithStatus(storage, MAIN);
  assert.equal(loaded.loaded, false);
  assert.equal(loaded.failure, 'future-version');
  assert.equal(saves.writeSaveWithStatus(save, storage, MAIN).failure, 'protected-save');
  assert.deepEqual(snapshot(storage), before);
  assert.equal(storage.writes.length, 0);
});

test('quota refusal leaves the confirmed room intact and permits a later explicit retry', () => {
  const { save, storage } = fixture('aboard', 'conseil');
  const next = { ...save, clanShipDocking: visitAt('aboard', 'armurerie') };
  const before = snapshot(storage);
  storage.quotaKey = MAIN;
  const failed = saves.writeSaveWithStatus(next, storage, MAIN);
  assert.equal(failed.persisted, false);
  assert.deepEqual(snapshot(storage), before);
  assert.equal(saves.loadSaveWithStatus(storage, MAIN).save.clanShipDocking.roomId, 'conseil');
  storage.quotaKey = null;
  const saved = write(next, storage);
  assert.equal(saved.clanShipDocking.roomId, 'armurerie');
  assert.equal(saves.loadSaveWithStatus(store(snapshot(storage)), MAIN).save.clanShipDocking.roomId, 'armurerie');
});

test('an uncertain campaign write is reconciled without replaying a room change or writing again', () => {
  const { save, storage } = fixture('aboard', 'conseil');
  const moved = docking.actClanShipDocking(save.clanShipDocking,
    { type: 'move-room', roomId: 'soins' }, { ownerCreatedAt: OWNER, personalShipId: SHIP });
  assert.equal(moved.accepted, true);
  storage.failReadbackKey = MAIN;
  const pending = saves.writeSaveWithStatus({ ...save, clanShipDocking: moved.state }, storage, MAIN);
  assert.equal(pending.persisted, false);
  const before = snapshot(storage), writes = storage.writes.length;
  const recovered = saves.reconcileSaveWrite(pending, OWNER, storage, MAIN);
  assert.equal(recovered.status, 'confirmed', recovered.failure);
  assert.deepEqual(recovered.save.clanShipDocking, moved.state);
  assert.deepEqual(snapshot(storage), before);
  assert.equal(storage.writes.length, writes);
  const repeated = docking.actClanShipDocking(recovered.save.clanShipDocking,
    { type: 'move-room', roomId: 'soins' }, { ownerCreatedAt: OWNER, personalShipId: SHIP });
  assert.equal(repeated.accepted, false);
  assert.equal(repeated.changed, false);
  assert.deepEqual(repeated.state, moved.state);
});

test('complete archive export and transaction import preserve the occupied room and personal fleet', () => {
  const { save, state, storage } = fixture('aboard', 'trophees');
  const fleet = progression.createDefaultShipProgression(save, OWNER);
  fleet.training.targeting.attempts = 3;
  storage.setItem(progression.SHIP_PROGRESSION_STORAGE_KEY, JSON.stringify(fleet));
  const before = snapshot(storage), writes = storage.writes.length;
  const exported = archives.createCompleteArchive(save, storage, OWNER);
  const parsed = archives.parseCompleteArchive(exported.serialized);
  assert(parsed.archive, parsed.failure);
  assert.deepEqual(parsed.archive.campaign.clanShipDocking, state);
  assert.deepEqual(parsed.archive.attachments.shipProgression, fleet);
  assert.deepEqual(snapshot(storage), before);
  assert.equal(storage.writes.length, writes);
  const destination = fixture('free-flight', 'hangar', OTHER_OWNER).storage;
  const plan = archives.prepareCompleteArchiveImport(parsed.archive, destination);
  const imported = archives.importCompleteArchive(plan, destination);
  assert.equal(imported.persisted, true, imported.recovery.message);
  const loaded = saves.loadSaveWithStatus(store(snapshot(destination)), MAIN);
  assert.equal(loaded.loaded, true, loaded.failure);
  assert.deepEqual(loaded.save.clanShipDocking, state);
  assert.equal(loaded.save.createdAt, OWNER);
  assert.deepEqual(JSON.parse(destination.getItem(progression.SHIP_PROGRESSION_STORAGE_KEY)), fleet);
  assert.equal(destination.getItem(ARCHIVE_TRANSFER_JOURNAL_KEY), null);
});

function nonDefaultHullFixture(status = 'aboard') {
  const { save: initial, storage } = fixture(status);
  const save = write({ ...initial, clanShipDocking: visitAt(status, 'hangar', OWNER, 'wolf-ship') }, storage);
  const baseFleet = progression.createDefaultShipProgression(save, OWNER);
  // Model a previously acquired, persistently owned hull. The portable campaign
  // format deliberately omits this separate fleet record.
  const fleet = progression.normalizeShipProgression({
    ...baseFleet, selectedShipId: 'wolf-ship', unlockedShipIds: [...baseFleet.unlockedShipIds, 'wolf-ship'],
  }, save, OWNER);
  assert(progression.validateCanonicalShipProgression(fleet, save));
  storage.setItem(progression.SHIP_PROGRESSION_STORAGE_KEY, JSON.stringify(fleet));
  return { save, storage, fleet };
}

test('a coherent complete archive keeps a nondefault engaged hull usable after import', () => {
  const { save, storage, fleet } = nonDefaultHullFixture();
  const full = archives.createCompleteArchive(save, storage, OWNER);
  const parsed = archives.parseCompleteArchive(full.serialized);
  assert(parsed.archive, parsed.failure);
  const destination = store();
  const plan = archives.prepareCompleteArchiveImport(parsed.archive, destination);
  assert.equal(archives.importCompleteArchive(plan, destination).persisted, true);
  const loaded = saves.loadSaveWithStatus(destination, MAIN);
  const restoredFleet = JSON.parse(destination.getItem(progression.SHIP_PROGRESSION_STORAGE_KEY));
  assert.deepEqual(restoredFleet, fleet);
  const returned = docking.actClanShipDocking(loaded.save.clanShipDocking, { type: 'return-to-personal' }, {
    ownerCreatedAt: loaded.save.createdAt, personalShipId: restoredFleet.selectedShipId,
  });
  assert.equal(returned.accepted, true, returned.message);
  assert.equal(returned.state.status, 'docked');
});

test('complete archives reject a different selected fleet hull during an engaged visit', () => {
  for (const status of ['approach', 'docked', 'aboard']) {
    const { save, storage } = nonDefaultHullFixture(status);
    const full = archives.createCompleteArchive(save, storage, OWNER);
    const invalid = structuredClone(full.archive);
    invalid.attachments.shipProgression = progression.createDefaultShipProgression(save, OWNER);
    const before = snapshot(storage), writes = storage.writes.length;
    const parsed = archives.parseCompleteArchive(JSON.stringify(invalid));
    assert.equal(Boolean(parsed.archive), false, `an engaged ${status} visit must not import with a different personal hull`);
    assert.throws(() => archives.prepareCompleteArchiveImport(invalid, storage));
    assert.deepEqual(snapshot(storage), before);
    assert.equal(storage.writes.length, writes);
  }
});

test('a lightweight engaged visit import cannot silently replace its omitted nondefault fleet', () => {
  const { save } = nonDefaultHullFixture();
  const destination = store();
  const preview = slots.prepareCampaignSlotImport(1, saves.exportSave(save), destination);
  assert.equal(preview.ok, false, 'a complete matching fleet archive is required before accepting this engaged visit');
  assert.equal(preview.preview, null);
  assert.equal(destination.writes.length, 0);
  assert.deepEqual(snapshot(destination), []);
  // After undocking, a missing sidecar may legitimately start at the default
  // fleet: the next approach binds the then-current hull.
  const free = { ...save, clanShipDocking: visitAt('free-flight', 'hangar', OWNER, 'wolf-ship') };
  const allowed = slots.prepareCampaignSlotImport(1, saves.exportSave(free), destination);
  assert.equal(allowed.ok, true, allowed.message);
});

test('complete and account archive boundaries reject nested incompatible visits without writes', () => {
  const { save, storage } = fixture('aboard', 'entrainement');
  const complete = archives.createCompleteArchive(save, storage, OWNER);
  const account = cloud.captureCloudArchiveV71(storage, OWNER);
  const before = snapshot(storage), writes = storage.writes.length;
  for (const [patch, expected] of [
    [{ version: 2 }, 'future-version'],
    [{ ownerCreatedAt: OTHER_OWNER }, 'invalid-save'],
    [{ roomId: 'unknown' }, 'invalid-save'],
  ]) {
    const changed = structuredClone(complete.archive);
    Object.assign(changed.campaign.clanShipDocking, patch);
    assert.equal(archives.parseCompleteArchive(JSON.stringify(changed)).failure, expected);
    assert.throws(() => archives.prepareCompleteArchiveImport(changed, storage));
    const changedAccount = structuredClone(account);
    const entry = changedAccount.entries.find(item => item.key === MAIN);
    const campaign = JSON.parse(entry.raw);
    Object.assign(campaign.clanShipDocking, patch);
    entry.raw = JSON.stringify(campaign);
    const parsed = cloud.parseCloudArchiveV71(JSON.stringify(changedAccount));
    assert.equal(parsed.archive, null);
    assert(parsed.error);
  }
  assert.deepEqual(snapshot(storage), before);
  assert.equal(storage.writes.length, writes);
});

test('a separate campaign cannot inherit the previous owner visit during replacement', () => {
  const { save, storage } = fixture('aboard', 'archives');
  const replacement = saves.defaultSave(OTHER_OWNER);
  assert.equal(saves.writeSaveWithStatus(replacement, storage, MAIN).failure, 'save-conflict');
  assert.equal(saves.parseSaveImport(JSON.stringify({ ...replacement, clanShipDocking: save.clanShipDocking })).failure, 'invalid-save');
  assert.equal(saves.replaceSaveWithStatus(replacement, storage, MAIN).persisted, true);
  const loaded = saves.loadSaveWithStatus(storage, MAIN);
  assert.equal(loaded.save.createdAt, OTHER_OWNER);
  assert.equal(Object.hasOwn(loaded.save, 'clanShipDocking'), false);
});

test('autosave, reload and Continue prioritize an aboard or approaching visit over an older deck location', async () => withLocks(async () => {
  for (const [status, roomId] of [['approach', 'hangar'], ['aboard', 'archives']]) {
    const { storage } = fixture('free-flight');
    await migrated(storage);
    assert.equal(lastCheckpoint(storage).resumeLocation, 'deck');
    const changed = setVisit(storage, status, roomId);
    const currentBytes = storage.getItem(MAIN);
    const resumed = await slots.continueCampaignSlot(1, { expectedRevision: revision(storage) }, storage);
    assert.equal(resumed.ok, true, resumed.message);
    assert.equal(resumed.checkpoint.resumeLocation, 'clan-ship');
    assert.deepEqual(resumed.save.clanShipDocking, changed.clanShipDocking);
    assert.equal(storage.getItem(MAIN), currentBytes, 'Continue must not replace newer working progress');
    const reopened = store(snapshot(storage));
    const catalog = slots.loadCampaignSlots(reopened);
    assert.equal(catalog.activeSlotId, 1);
    const observed = catalog.slots[0];
    assert.equal(observed.status, 'ready');
    assert.equal(observed.checkpoints.find(item => item.id === observed.lastCheckpointId).resumeLocation, 'clan-ship');
    const loaded = await slots.activateCampaignCheckpoint(1, observed.lastCheckpointId,
      { expectedRevision: observed.revision }, reopened);
    assert.equal(loaded.ok, true, loaded.message);
    assert.equal(loaded.checkpoint.resumeLocation, 'clan-ship');
    assert.deepEqual(loaded.save.clanShipDocking, changed.clanShipDocking);
  }
}));

test('loading a historical deck-labelled checkpoint keeps its aboard room and Continue corrects resume metadata', async () => withLocks(async () => {
  const { storage, state } = fixture('aboard', 'armurerie');
  await migrated(storage);
  const slotKey = slots.campaignSlotStorageKey(1);
  const historical = document(storage);
  historical.checkpoints[0].resumeLocation = 'deck';
  const historicalRaw = JSON.stringify(historical);
  storage.values.set(slotKey, historicalRaw);
  const catalog = slots.loadCampaignSlots(storage);
  assert.equal(catalog.slots[0].status, 'ready');
  assert.equal(storage.getItem(slotKey), historicalRaw, 'read-only enumeration keeps historical bytes intact');
  const loaded = await slots.activateCampaignCheckpoint(1, historical.lastCheckpointId,
    { expectedRevision: historical.revision }, storage);
  assert.equal(loaded.ok, true, loaded.message);
  assert.deepEqual(loaded.save.clanShipDocking, state);
  assert.deepEqual(saves.loadSaveWithStatus(storage, MAIN).save.clanShipDocking, state);
  const resumed = await slots.continueCampaignSlot(1, { expectedRevision: revision(storage) }, storage);
  assert.equal(resumed.ok, true, resumed.message);
  assert.equal(resumed.checkpoint.resumeLocation, 'clan-ship');
  assert.deepEqual(resumed.save.clanShipDocking, state);
}));

test('return to the personal ship retains docking while an explicit deck checkpoint resumes the deck', async () => withLocks(async () => {
  const { save, storage } = fixture('aboard', 'conseil');
  await migrated(storage);
  const returned = docking.actClanShipDocking(save.clanShipDocking,
    { type: 'return-to-personal' }, { ownerCreatedAt: OWNER, personalShipId: SHIP });
  assert.equal(returned.accepted, true);
  const persisted = write({ ...saves.loadSaveWithStatus(storage, MAIN).save, clanShipDocking: returned.state }, storage);
  assert.equal(persisted.clanShipDocking.status, 'docked');
  const saved = await autosave(storage, 'deck');
  assert.equal(saved.ok, true, saved.message);
  assert.equal(saved.checkpoint.resumeLocation, 'deck');
  const reopened = store(snapshot(storage));
  const continued = await slots.continueCampaignSlot(1, { expectedRevision: revision(reopened) }, reopened);
  assert.equal(continued.ok, true, continued.message);
  assert.equal(continued.checkpoint.resumeLocation, 'deck');
  assert.deepEqual(continued.save.clanShipDocking, returned.state);
  const loaded = await slots.activateCampaignCheckpoint(1, continued.checkpoint.id,
    { expectedRevision: revision(reopened) }, reopened);
  assert.equal(loaded.ok, true, loaded.message);
  assert.equal(loaded.checkpoint.resumeLocation, 'deck');
  assert.deepEqual(loaded.save.clanShipDocking, returned.state);
}));

test('old absent/null visits cannot acquire a clan resume label solely from a checkpoint request', async () => withLocks(async () => {
  for (const save of [saves.defaultSave(OWNER), { ...saves.defaultSave(OWNER), clanShipDocking: null }]) {
    const storage = store();
    write(save, storage);
    await migrated(storage);
    const result = await autosave(storage, 'clan-ship');
    assert.equal(result.ok, true, result.message);
    assert.equal(result.checkpoint.resumeLocation, 'deck');
    const corrupted = document(storage);
    corrupted.checkpoints[0].resumeLocation = 'clan-ship';
    const key = slots.campaignSlotStorageKey(1), raw = JSON.stringify(corrupted);
    storage.values.set(key, raw);
    const writes = storage.writes.length;
    assert.equal(slots.loadCampaignSlots(storage).slots[0].status, 'blocked');
    assert.equal(storage.getItem(key), raw);
    assert.equal(storage.writes.length, writes);
  }
}));

test('incompatible nested visits protect existing slot and backup bytes', async () => withLocks(async () => {
  for (const [patch, expected] of [[{ version: 2 }, 'future-version'], [{ ownerCreatedAt: OTHER_OWNER }, 'invalid-archive']]) {
    const { storage } = fixture('aboard', 'soins');
    await migrated(storage);
    const key = slots.campaignSlotStorageKey(1), invalid = document(storage);
    Object.assign(invalid.checkpoints[0].archive.campaign.clanShipDocking, patch);
    storage.values.set(key, JSON.stringify(invalid));
    const before = snapshot(storage), writes = storage.writes.length;
    const summary = slots.loadCampaignSlots(storage).slots[0];
    assert.equal(summary.status, 'blocked');
    assert.equal(summary.failure, expected);
    const result = await slots.saveCampaignCheckpoint(1, { kind: 'auto', expectedRevision: 1 }, storage);
    assert.equal(result.ok, false);
    assert.equal(result.failure, expected);
    assert.equal(cloud.parseCloudArchiveV71(JSON.stringify({
      format: 'yautja-account-archive', version: 1, contentVersion: 'test', capturedAt: OWNER,
      entries: snapshot(storage).filter(([key]) => cloud.isCloudArchiveStorageKeyV71(key)).map(([key, raw]) => ({ key, raw })),
    })).archive, null);
    assert.deepEqual(snapshot(storage), before);
    assert.equal(storage.writes.length, writes);
  }
}));

test('slot quota refusal leaves the old checkpoint and newer confirmed aboard room independently recoverable', async () => withLocks(async () => {
  const { storage } = fixture('docked');
  await migrated(storage);
  const changed = setVisit(storage, 'aboard', 'trophees');
  const key = slots.campaignSlotStorageKey(1), priorSlot = storage.getItem(key), current = storage.getItem(MAIN);
  storage.quotaKey = key;
  const failed = await autosave(storage, 'clan-ship');
  assert.equal(failed.ok, false);
  assert.equal(failed.failure, 'quota-exceeded');
  assert.equal(storage.getItem(key), priorSlot);
  assert.equal(storage.getItem(MAIN), current);
  assert.equal(lastCheckpoint(storage).archive.campaign.clanShipDocking.status, 'docked');
  storage.quotaKey = null;
  const retried = await autosave(storage, 'clan-ship');
  assert.equal(retried.ok, true, retried.message);
  assert.deepEqual(lastCheckpoint(storage).archive.campaign.clanShipDocking, changed.clanShipDocking);
}));

test('uncertain slot readback never announces success and cannot create a second autosave on replay', async () => withLocks(async () => {
  const { storage } = fixture('docked');
  await migrated(storage);
  const changed = setVisit(storage, 'aboard', 'archives');
  const expectedRevision = revision(storage), key = slots.campaignSlotStorageKey(1);
  storage.failReadbackKey = key;
  const pending = await slots.saveCampaignCheckpoint(1, { kind: 'auto', expectedRevision, location: 'clan-ship' }, storage);
  assert.equal(pending.ok, false);
  assert.equal(pending.failure, 'unconfirmed-write');
  const reopened = store(snapshot(storage));
  assert.equal(revision(reopened), expectedRevision + 1);
  assert.deepEqual(lastCheckpoint(reopened).archive.campaign.clanShipDocking, changed.clanShipDocking);
  const before = snapshot(reopened);
  const repeated = await slots.saveCampaignCheckpoint(1, { kind: 'auto', expectedRevision, location: 'clan-ship' }, reopened);
  assert.equal(repeated.failure, 'save-conflict');
  assert.deepEqual(snapshot(reopened), before);
  const confirmed = await slots.continueCampaignSlot(1, { expectedRevision: revision(reopened) }, reopened);
  assert.equal(confirmed.ok, true, confirmed.message);
  assert.equal(revision(reopened), expectedRevision + 1, 'unchanged confirmation must not rotate the autosave');
  assert.deepEqual(confirmed.save.clanShipDocking, changed.clanShipDocking);
}));

test('two campaigns retain independent clan rooms through switching and account archive roundtrip', async () => withLocks(async () => {
  const first = fixture('aboard', 'conseil');
  const storage = first.storage;
  await migrated(storage);
  const second = { ...saves.defaultSave(OTHER_OWNER), clanShipDocking: visitAt('aboard', 'soins', OTHER_OWNER) };
  const prepared = slots.prepareCampaignSlotImport(2, saves.exportSave(second), storage);
  assert.equal(prepared.ok, true, prepared.message);
  assert.equal(prepared.preview.resumeLocation, 'clan-ship');
  const imported = await slots.importCampaignSlot(prepared.preview, storage);
  assert.equal(imported.ok, true, imported.message);
  assert.equal(saves.loadSaveWithStatus(storage, MAIN).save.createdAt, OWNER, 'slot import must not activate its owner');
  const activatedSecond = await slots.activateCampaignCheckpoint(2, 'auto-1', { expectedRevision: revision(storage, 2) }, storage);
  assert.equal(activatedSecond.ok, true, activatedSecond.message);
  assert.equal(activatedSecond.save.createdAt, OTHER_OWNER);
  assert.deepEqual(activatedSecond.save.clanShipDocking, second.clanShipDocking);
  const changedSecond = setVisit(storage, 'aboard', 'entrainement');
  const secondAuto = await autosave(storage, 'clan-ship', 2);
  assert.equal(secondAuto.ok, true, secondAuto.message);
  const firstCheckpoint = document(storage, 1).lastCheckpointId;
  const returned = await slots.activateCampaignCheckpoint(1, firstCheckpoint,
    { expectedRevision: revision(storage, 1) }, storage);
  assert.equal(returned.ok, true, returned.message);
  assert.equal(returned.save.createdAt, OWNER);
  assert.deepEqual(returned.save.clanShipDocking, first.state);
  assert.deepEqual(lastCheckpoint(storage, 2).archive.campaign.clanShipDocking, changedSecond.clanShipDocking);
  assert.equal(JSON.parse(storage.getItem(progression.SHIP_PROGRESSION_STORAGE_KEY)).ownerSaveCreatedAt, OWNER);
  const before = snapshot(storage), writes = storage.writes.length;
  const account = cloud.captureCloudArchiveV71(storage, OWNER);
  const parsed = cloud.parseCloudArchiveV71(JSON.stringify(account));
  assert(parsed.archive, parsed.error);
  const copied = store(parsed.archive.entries.map(({ key, raw }) => [key, raw]));
  const catalog = slots.loadCampaignSlots(copied);
  assert.equal(catalog.activeSlotId, 1);
  assert.equal(catalog.slots[0].ownerCreatedAt, OWNER);
  assert.equal(catalog.slots[1].ownerCreatedAt, OTHER_OWNER);
  assert.deepEqual(lastCheckpoint(copied, 1).archive.campaign.clanShipDocking, first.state);
  assert.deepEqual(lastCheckpoint(copied, 2).archive.campaign.clanShipDocking, changedSecond.clanShipDocking);
  assert.deepEqual(snapshot(storage), before);
  assert.equal(storage.writes.length, writes);
}));
