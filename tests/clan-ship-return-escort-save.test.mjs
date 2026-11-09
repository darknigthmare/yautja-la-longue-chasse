import test from 'node:test';
import assert from 'node:assert/strict';
import { qa, escort, motion, saves, OWNER, clone, fixture, started, medical, act, action, context, point, walk, settle } from './helpers/clan-ship-return-escort-fixture.mjs';
const archives = qa.load('app/game/systems/completeArchive.ts');
const slots = qa.load('app/game/systems/campaignSlots.ts');
const MAIN = saves.SAVE_STORAGE_KEY;
function storage(values = new Map()) {
  return { values, writes: [], quotaKey: null, failReadback: false, pendingReadback: false,
    get length() { return values.size; }, key: index => [...values.keys()][index] ?? null,
    getItem(key) { if (key === MAIN && this.pendingReadback) { this.pendingReadback = false; throw Error('Uncertain readback'); } return values.get(key) ?? null; },
    setItem(key, value) {
      if (key === this.quotaKey) throw new DOMException('Full', 'QuotaExceededError');
      values.set(key, value); this.writes.push(['set', key]);
      if (key === MAIN && this.failReadback) { this.failReadback = false; this.pendingReadback = true; }
    }, removeItem(key) { values.delete(key); this.writes.push(['remove', key]); },
  };
}
const bytes = store => [...store.values].sort(([a], [b]) => a.localeCompare(b));
function write(save, disk) { const result = saves.writeSaveWithStatus(save, disk, MAIN); assert.equal(result.persisted, true, result.failure); return result.save; }
function threshold() {
  const save = started(), marched = walk(save, motion.CLAN_SHIP_INTERIOR_ROOMS.hangar.servicePoint, { x: 128, y: 635 });
  return { save: settle(marched.save, marched.leader), observation: point('hangar', marched.leader) };
}
const transferred = (save, observation) => {
  const command = { type: 'transfer-room', roomId: 'soins' };
  const result = escort.actClanShipReturnEscort(action(save, command), context(save, command, observation));
  assert.equal(result.accepted, true, result.message);
  return { ...save, clanShipReturnEscort: result.state, clanShipDocking: result.dockingState };
};
async function withLocks(run) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: async (_name, _options, callback) => callback({}) } } });
  try { return await run(); }
  finally { if (previous) Object.defineProperty(globalThis, 'navigator', previous); else delete globalThis.navigator; }
}
const slotDocument = disk => JSON.parse(disk.getItem(slots.campaignSlotStorageKey(1)));

test('legacy absent and explicit-null escort fields survive portable and complete archives without creating a group', () => {
  for (const source of [saves.defaultSave(OWNER), { ...saves.defaultSave(OWNER), clanShipReturnEscort: null }]) {
    const present = Object.hasOwn(source, 'clanShipReturnEscort'), disk = storage(), confirmed = write(source, disk);
    for (const raw of [JSON.stringify(confirmed), saves.exportSave(confirmed)]) {
      const result = saves.parseSaveImport(raw); assert.ok(result.save, result.failure);
      assert.equal(Object.hasOwn(result.save, 'clanShipReturnEscort'), present);
      if (present) assert.equal(result.save.clanShipReturnEscort, null);
    }
    const before = bytes(disk), result = archives.parseCompleteArchive(archives.createCompleteArchive(confirmed, disk, OWNER).serialized);
    assert.ok(result.archive, result.failure); assert.equal(Object.hasOwn(result.archive.campaign, 'clanShipReturnEscort'), present);
    assert.deepEqual(bytes(disk), before);
  }
});
test('acceptance, preparation, partial walking, threshold, medical return and final report retain exact confirmed poses after reopening', () => {
  const accepted = act(fixture(), { type: 'accept' }), prepared = act(accepted, { type: 'prepare-route', post: 'medical-terminal' });
  const mid = walk(started(), motion.CLAN_SHIP_INTERIOR_ROOMS.hangar.servicePoint, { x: 128, y: 635 }, 57).save;
  const edge = threshold(), arrived = transferred(edge.save, edge.observation), med = medical(), report = act(med, { type: 'report' });
  for (const source of [accepted, prepared, mid, edge.save, arrived, med, report]) {
    const disk = storage(), saved = write(source, disk);
    const reopened = saves.loadSaveWithStatus(storage(new Map(bytes(disk))), MAIN); assert.equal(reopened.loaded, true, reopened.failure);
    const portable = saves.parseSaveImport(saves.exportSave(saved)); assert.ok(portable.save, portable.failure);
    const complete = archives.parseCompleteArchive(archives.createCompleteArchive(saved, disk, OWNER).serialized); assert.ok(complete.archive, complete.failure);
    for (const restored of [reopened.save, portable.save, complete.archive.campaign]) {
      assert.deepEqual(restored.clanShipReturnEscort, saved.clanShipReturnEscort);
      assert.deepEqual(restored.clanShipDocking, saved.clanShipDocking);
      assert.deepEqual(restored.profile, saved.profile);
    }
    const portableDisk = storage(); write(saves.defaultSave('2026-11-09T13:00:00.000Z'), portableDisk);
    const portableImport = saves.importSaveWithStatus(saves.exportSave(saved), portableDisk, MAIN);
    assert.equal(portableImport.persisted, true, portableImport.failure);
    assert.deepEqual(saves.loadSaveWithStatus(portableDisk, MAIN).save.clanShipReturnEscort, saved.clanShipReturnEscort);
    const archiveDisk = storage(); write(saves.defaultSave('2026-11-09T13:00:00.000Z'), archiveDisk);
    const plan = archives.prepareCompleteArchiveImport(complete.archive, archiveDisk);
    assert.equal(archives.importCompleteArchive(plan, archiveDisk).persisted, true);
    const imported = saves.loadSaveWithStatus(archiveDisk, MAIN).save;
    assert.deepEqual(imported.clanShipReturnEscort, saved.clanShipReturnEscort);
    assert.deepEqual(imported.clanShipDocking, saved.clanShipDocking);
  }
});
test('a safely waiting group remains loadable after the player changes room or leaves the ship; no offline time advances it', () => {
  const source = walk(started(), motion.CLAN_SHIP_INTERIOR_ROOMS.hangar.servicePoint, { x: 128, y: 635 }, 40).save;
  for (const docking of [ { ...source.clanShipDocking, roomId: 'archives' },
    { ...source.clanShipDocking, status: 'docked', roomId: 'hangar' }, { ...source.clanShipDocking, status: 'free-flight', roomId: 'hangar' } ]) {
    const disk = storage(), saved = write({ ...source, clanShipDocking: docking }, disk);
    const loaded = saves.loadSaveWithStatus(storage(new Map(bytes(disk))), MAIN); assert.equal(loaded.loaded, true);
    assert.deepEqual(loaded.save.clanShipReturnEscort, saved.clanShipReturnEscort);
    const result = escort.actClanShipReturnEscort(action(saved, { type: 'report' }), { save: saved, active: false, observation: null });
    assert.equal(result.accepted, false); assert.deepEqual(result.state, saved.clanShipReturnEscort);
  }
});
test('future, foreign, malformed and unbound escort states cannot overwrite the current save or enter complete archives', () => {
  const disk = storage(), confirmed = write(started(), disk), complete = archives.createCompleteArchive(confirmed, disk, OWNER).archive;
  for (const [failure, edit] of [
    ['future-version', s => s.clanShipReturnEscort.version = 2],
    ['invalid-save', s => s.clanShipReturnEscort.ownerCreatedAt = 'other-owner'],
    ['invalid-save', s => s.clanShipReturnEscort.actors[0].x = -100],
    ['invalid-save', s => s.clanShipReturnEscort.sourceRecoveryRevision++],
    ['invalid-save', s => s.clanShipReturnEscort.actors.pop()],
  ]) {
    const invalid = clone(confirmed); edit(invalid); const before = bytes(disk), count = disk.writes.length;
    assert.equal(saves.parseSaveImport(JSON.stringify(invalid)).failure, failure);
    assert.equal(saves.writeSaveWithStatus(invalid, disk, MAIN).persisted, false);
    assert.equal(saves.importSaveWithStatus(JSON.stringify(invalid), disk, MAIN).persisted, false);
    assert.throws(() => saves.exportSave(invalid));
    const badArchive = clone(complete); badArchive.campaign = invalid;
    assert.equal(archives.parseCompleteArchive(JSON.stringify(badArchive)).failure, failure);
    assert.throws(() => archives.prepareCompleteArchiveImport(badArchive, disk));
    assert.deepEqual(bytes(disk), before); assert.equal(disk.writes.length, count);
  }
});
test('a future escort primary is protected beside an older valid backup', () => {
  const old = started(), future = clone(old); future.clanShipReturnEscort.version = 2;
  const disk = storage(new Map([[MAIN, JSON.stringify(future)], [MAIN + '.backup', JSON.stringify(old)]])), before = bytes(disk);
  const loaded = saves.loadSaveWithStatus(disk, MAIN); assert.equal(loaded.loaded, false); assert.equal(loaded.failure, 'future-version');
  assert.equal(saves.writeSaveWithStatus(old, disk, MAIN).failure, 'protected-save');
  assert.deepEqual(bytes(disk), before); assert.equal(disk.writes.length, 0);
});
test('quota denial preserves group and docking together; retry confirms the same doorway without currency or care changes', () => {
  const edge = threshold(), disk = storage(), original = write(edge.save, disk), proposed = transferred(original, edge.observation);
  const before = bytes(disk); disk.quotaKey = MAIN;
  const failed = saves.writeSaveWithStatus(proposed, disk, MAIN); assert.equal(failed.persisted, false); assert.equal(failed.failure, 'write-failed');
  assert.deepEqual(bytes(disk), before);
  const reload = saves.loadSaveWithStatus(storage(new Map(bytes(disk))), MAIN).save;
  assert.deepEqual(reload.clanShipReturnEscort, original.clanShipReturnEscort); assert.equal(reload.clanShipDocking.roomId, 'hangar');
  disk.quotaKey = null;
  const retried = write(proposed, disk); assert.equal(retried.clanShipDocking.roomId, 'soins');
  assert.ok(retried.clanShipReturnEscort.actors.every(a => a.roomId === 'soins'));
  assert.deepEqual(retried.profile, original.profile); assert.deepEqual(retried.expeditionRoster, original.expeditionRoster);
});
test('uncertain doorway acknowledgement is reconciled without replaying motion or transferring twice', () => {
  const edge = threshold(), disk = storage(), original = write(edge.save, disk), proposed = transferred(original, edge.observation);
  disk.failReadback = true;
  const pending = saves.writeSaveWithStatus(proposed, disk, MAIN); assert.equal(pending.persisted, false);
  const before = bytes(disk), count = disk.writes.length, recovered = saves.reconcileSaveWrite(pending, OWNER, disk, MAIN);
  assert.equal(recovered.status, 'confirmed', recovered.failure);
  assert.deepEqual(recovered.save.clanShipReturnEscort, proposed.clanShipReturnEscort);
  assert.deepEqual(recovered.save.clanShipDocking, proposed.clanShipDocking);
  assert.deepEqual(bytes(disk), before); assert.equal(disk.writes.length, count);
  const stale = escort.actClanShipReturnEscort(action(original, { type: 'transfer-room', roomId: 'soins' }),
    { save: recovered.save, active: true, observation: point('soins', motion.clanShipInteriorSpawn('soins', 'hangar')) });
  assert.equal(stale.accepted, false);
});
test('a second storage view cannot replace a newer group checkpoint with stale movement', () => {
  const disk = storage(), original = write(started(), disk), mirror = storage(disk.values);
  const a = saves.loadSaveWithStatus(disk, MAIN).save, b = saves.loadSaveWithStatus(mirror, MAIN).save;
  const moved = walk(a, motion.CLAN_SHIP_INTERIOR_ROOMS.hangar.servicePoint, { x: 128, y: 635 }, 20).save;
  write(moved, disk);
  const stale = walk(b, motion.CLAN_SHIP_INTERIOR_ROOMS.hangar.servicePoint, { x: 900, y: 645 }, 15).save;
  const before = bytes(disk), rejected = saves.writeSaveWithStatus(stale, mirror, MAIN);
  assert.equal(rejected.persisted, false); assert.equal(rejected.failure, 'save-conflict'); assert.deepEqual(bytes(disk), before);
  assert.deepEqual(original.profile, moved.profile);
});
test('manual checkpoints and Continue restore a partial group route before subsequent movement', async () => withLocks(async () => {
  const source = walk(started(), motion.CLAN_SHIP_INTERIOR_ROOMS.hangar.servicePoint, { x: 128, y: 635 }, 45).save;
  const disk = storage(), original = write(source, disk);
  const migrated = await slots.migrateLegacyCampaignSlot(disk); assert.equal(migrated.ok, true, migrated.message);
  const checkpoint = await slots.saveCampaignCheckpoint(1, { kind: 'manual', index: 1,
    expectedRevision: slotDocument(disk).revision, location: 'clan-ship' }, disk);
  assert.equal(checkpoint.ok, true, checkpoint.message);
  const full = medical(); write(full, disk);
  const restored = await slots.activateCampaignCheckpoint(1, 'manual-1', { expectedRevision: slotDocument(disk).revision }, disk);
  assert.equal(restored.ok, true, restored.message); assert.equal(restored.checkpoint.resumeLocation, 'clan-ship');
  assert.deepEqual(restored.save.clanShipReturnEscort, original.clanShipReturnEscort);
  const reopened = storage(new Map(bytes(disk))), resumed = await slots.continueCampaignSlot(1, { expectedRevision: slotDocument(reopened).revision }, reopened);
  assert.equal(resumed.ok, true, resumed.message); assert.deepEqual(resumed.save.clanShipReturnEscort, original.clanShipReturnEscort);
}));
