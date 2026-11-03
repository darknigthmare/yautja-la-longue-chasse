import test from 'node:test';
import assert from 'node:assert/strict';
import { homeworldSceneSsrV78 } from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const saves = qa.load('app/game/save.ts');
const prep = qa.load('app/game/systems/shipPreparationV88.ts');
const progression = qa.load('app/game/systems/progression.ts');
const layout = qa.load('app/game/systems/shipLevelLayout.ts');
const archives = qa.load('app/game/systems/completeArchive.ts');
const cloud = qa.load('app/game/systems/cloudArchiveV71.ts');
const owner = '2026-10-07T21:00:00.000Z';
const key = saves.SAVE_STORAGE_KEY;
function store(entries = []) {
  const data = new Map(entries);
  return { data, full: false, failReadback: false, pendingReadback: false, writes: 0,
    get length() { return data.size; }, key(i) { return [...data.keys()][i] ?? null; },
    getItem(name) { if (name === key && this.pendingReadback) { this.pendingReadback = false; throw Error('Uncertain readback'); } return data.get(name) ?? null; },
    setItem(name, raw) { if (this.full) throw Error('Quota'); this.writes++; data.set(name, raw); if (name === key && this.failReadback) { this.failReadback = false; this.pendingReadback = true; } },
    removeItem(name) { data.delete(name); },
  };
}
function fixture() {
  const save = saves.defaultSave(owner);
  const fleet = progression.createDefaultShipProgression(save, owner);
  const context = { save, shipId: fleet.selectedShipId, fleet, selectedMissionId: 'jungle-vey', active: true, focused: true, suspended: false };
  const observation = layout.SHIP_LEVEL_STATIONS.find(station => station.id === 'clan-archives');
  const result = prep.inspectShipPreparationV88(undefined, {stationId: observation.id, x: observation.x, y: observation.y}, context);
  assert(result.accepted, result.message);
  return { save: {...save, shipPreparationV88: result.state}, fleet, context, observation, checkpoint: result.state };
}
const gameplay = save => ({ profile: save.profile, inventory: save.inventory, loadout: save.loadout,
  missionProgress: save.missionProgress, trophies: save.trophies, homeworld: save.homeworld, justice: save.justice });

test('old saves keep the optional inspection field absent; null remains compatible without a borrowed record', () => {
  const old = saves.defaultSave(owner);
  for (const raw of [JSON.stringify(old), saves.exportSave(old)]) {
    const result = saves.parseSaveImport(raw); assert(result.save, result.failure);
    assert.equal(Object.hasOwn(result.save, 'shipPreparationV88'), false);
  }
  const empty = saves.parseSaveImport(JSON.stringify({...old, shipPreparationV88: null}));
  assert(empty.save); assert.equal(empty.save.shipPreparationV88, null);
});

test('real station receipts survive durable write, readonly load, export and import without campaign rewards', () => {
  const {save, checkpoint} = fixture(), storage = store();
  const written = saves.writeSaveWithStatus(save, storage, key); assert(written.persisted, written.failure);
  const before = [...storage.data], writes = storage.writes;
  const loaded = saves.loadSaveWithStatus(storage, key); assert(loaded.loaded, loaded.failure);
  assert.deepEqual(loaded.save.shipPreparationV88, checkpoint);
  assert.deepEqual([...storage.data], before); assert.equal(storage.writes, writes);
  const imported = saves.parseSaveImport(saves.exportSave(loaded.save)); assert(imported.save, imported.failure);
  assert.deepEqual(imported.save.shipPreparationV88, checkpoint);
  assert.deepEqual(gameplay(imported.save), gameplay(saves.normalizeSave(save)));
});

test('malformed, future, duplicate and foreign receipts cannot replace existing save bytes', () => {
  const {save} = fixture(), storage = store(); assert(saves.writeSaveWithStatus(save, storage, key).persisted);
  const before = [...storage.data];
  for (const [change, failure] of [
    [s => {s.shipPreparationV88.version = 2;}, 'future-version'],
    [s => {s.shipPreparationV88.ownerSaveCreatedAt = '2026-10-08T00:00:00.000Z';}, 'invalid-save'],
    [s => {s.shipPreparationV88.hulls[0].inspections[0].signature = 'made-up';}, 'invalid-save'],
    [s => {s.shipPreparationV88.hulls.push(structuredClone(s.shipPreparationV88.hulls[0]));}, 'invalid-save'],
    [s => {s.shipPreparationV88.revision = 0;}, 'invalid-save'],
    [s => {s.createdAt = 'invalid-date'; s.shipPreparationV88.ownerSaveCreatedAt = 'invalid-date';}, 'invalid-save'],
  ]) {
    const bad = structuredClone(save); change(bad);
    assert.equal(saves.parseSaveImport(JSON.stringify(bad)).failure, failure);
    assert.equal(saves.importSaveWithStatus(JSON.stringify(bad), storage, key).failure, failure);
    assert.equal(saves.writeSaveWithStatus(bad, storage, key).persisted, false);
    assert.deepEqual([...storage.data], before);
  }
});

test('future primary bytes remain protected even when an older inspection backup is valid', () => {
  const {save} = fixture(), future = structuredClone(save); future.shipPreparationV88.version = 2;
  const storage = store([[key, JSON.stringify(future)], [key+'.backup', JSON.stringify(save)]]), before = [...storage.data];
  assert.equal(saves.loadSaveWithStatus(storage, key).failure, 'future-version');
  assert.equal(saves.writeSaveWithStatus(save, storage, key).failure, 'protected-save');
  assert.deepEqual([...storage.data], before);
});

test('failed quota and uncertain readback do not confirm an inspection twice or modify kit, honor or missions', () => {
  const {save, context, observation, checkpoint} = fixture(), storage = store();
  const original = saves.defaultSave(owner); assert(saves.writeSaveWithStatus(original, storage, key).persisted);
  const before = [...storage.data]; storage.full = true;
  assert.equal(saves.writeSaveWithStatus(save, storage, key).persisted, false);
  assert.deepEqual([...storage.data], before); storage.full = false; storage.failReadback = true;
  const pending = saves.writeSaveWithStatus(save, storage, key); assert.equal(pending.persisted, false);
  const afterWrite = [...storage.data], writeCount = storage.writes;
  const recovered = saves.reconcileSaveWrite(pending, owner, storage, key); assert.equal(recovered.status, 'confirmed', recovered.failure);
  assert.deepEqual([...storage.data], afterWrite); assert.equal(storage.writes, writeCount);
  const repeated = prep.inspectShipPreparationV88(recovered.save.shipPreparationV88, {stationId: observation.id, x: observation.x, y: observation.y}, {...context, save: recovered.save});
  assert(repeated.accepted); assert.equal(repeated.changed, false); assert.deepEqual(repeated.state, checkpoint);
  assert.deepEqual(gameplay(recovered.save), gameplay(saves.normalizeSave(original)));
});

test('complete and account archives retain actual inspection bytes and refuse incompatible nested versions', () => {
  const {save, fleet, checkpoint} = fixture(), storage = store();
  assert(saves.writeSaveWithStatus(save, storage, key).persisted);
  storage.setItem(progression.SHIP_PROGRESSION_STORAGE_KEY, JSON.stringify(fleet));
  const active = saves.loadSaveWithStatus(storage, key).save;
  const before = [...storage.data];
  const complete = archives.createCompleteArchive(active, storage, owner);
  const parsed = archives.parseCompleteArchive(complete.serialized); assert(parsed.archive, parsed.failure);
  assert.deepEqual(parsed.archive.campaign.shipPreparationV88, checkpoint);
  const snapshot = cloud.captureCloudArchiveV71(storage, owner);
  const parsedCloud = cloud.parseCloudArchiveV71(JSON.stringify(snapshot)); assert(parsedCloud.archive, parsedCloud.error);
  assert.deepEqual(JSON.parse(parsedCloud.archive.entries.find(entry => entry.key === key).raw).shipPreparationV88, checkpoint);
  assert.deepEqual([...storage.data], before);
  const future = JSON.parse(complete.serialized); future.campaign.shipPreparationV88.version = 2;
  assert.equal(archives.parseCompleteArchive(JSON.stringify(future)).failure, 'future-version');
  const badSnapshot = structuredClone(snapshot);
  const main = badSnapshot.entries.find(entry => entry.key === key), bad = JSON.parse(main.raw); bad.shipPreparationV88.version = 2; main.raw = JSON.stringify(bad);
  assert.equal(cloud.parseCloudArchiveV71(JSON.stringify(badSnapshot)).archive, null);
  assert.deepEqual([...storage.data], before);
});

test('new campaign replacement cannot adopt the previous owner inspection checkpoint', () => {
  const {save} = fixture(), storage = store(); assert(saves.writeSaveWithStatus(save, storage, key).persisted);
  const replacement = saves.defaultSave('2026-10-08T00:00:00.000Z');
  assert.equal(saves.writeSaveWithStatus(replacement, storage, key).failure, 'save-conflict');
  assert(saves.replaceSaveWithStatus(replacement, storage, key).persisted);
  const loaded = saves.loadSaveWithStatus(storage, key).save;
  assert.equal(Object.hasOwn(loaded, 'shipPreparationV88'), false);
  const wrong = {...replacement, shipPreparationV88: save.shipPreparationV88};
  assert.equal(saves.parseSaveImport(JSON.stringify(wrong)).failure, 'invalid-save');
});
