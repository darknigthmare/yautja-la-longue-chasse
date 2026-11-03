import test from 'node:test';
import assert from 'node:assert/strict';
import { formationModel, formationCampaignRoute, stamp } from './helpers/solo-v90-played-route.mjs';
import { p } from './helpers/solo-v67-campaign-route.mjs';

const run = formationCampaignRoute(), key = p.SAVE_STORAGE_KEY;
const storage = save => {
  const values = new Map([[key, JSON.stringify(save)]]);
  return { values, getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
};

test('every played V90 checkpoint survives real save/export/import, with no Blooded, inventory or ship grant', () => {
  for (const save of [run.origin, ...run.commits.map(c => c.after)]) {
    const parsed = p.parseSaveImport(p.exportSave(save));
    assert.equal(parsed.failure, null);
    assert.deepEqual(parsed.save.soloV90, save.soloV90);
    for (const field of ['prologue', 'inventory', 'ships', 'trophies']) assert.deepEqual(parsed.save[field], run.origin[field], field);
    if (parsed.save.soloV90) assert.deepEqual(parsed.save.soloV90.checkpoint.replay, []);
  }
});

test('foreign owner, wrong source, orphan progression and persisted unconfirmed commands stay refused', () => {
  for (const edit of [
    s => s.soloV90.ownerCreatedAt = '2026-10-11T11:11:11.000Z',
    s => s.soloV90.sourceSha256 = '0'.repeat(64),
    s => s.soloV70 = null,
    s => s.soloV90.checkpoint.replay = [0],
    s => s.soloV90.receipts.pop(),
    s => s.soloV90.status = 'active',
  ]) {
    const save = structuredClone(run.save); edit(save);
    assert.equal(p.parseSaveImport(JSON.stringify(save)).failure, 'invalid-save');
  }
});

test('nested future V90 versions preserve primary bytes rather than downgrading or borrowing an old backup', () => {
  for (const edit of [s => s.soloV90.version = 2, s => s.soloV90.checkpoint.version = 2]) {
    const save = structuredClone(run.save); edit(save);
    const s = storage(save), raw = s.getItem(key);
    assert.equal(p.parseSaveImport(raw).failure, 'future-version');
    assert.equal(p.loadSaveWithStatus(s).failure, 'future-version');
    assert.equal(s.getItem(key), raw);
  }
});

test('quota and a dropped write never acknowledge physical progress, and retry consumes the same commands once', () => {
  for (const c of run.commits.filter(c => c.receipts.length)) for (const kind of ['quota', 'drop']) {
    const s = storage(c.before); p.loadSaveWithStatus(s);
    const raw = s.getItem(key), write = s.setItem;
    s.setItem = (k, v) => { if (k === key) { if (kind === 'quota') throw new DOMException('QA quota', 'QuotaExceededError'); return; } write(k, v); };
    const failure = p.writeSaveWithStatus(c.after, s);
    assert.equal(failure.persisted, false); assert.equal(s.getItem(key), raw);
    s.setItem = write;
    assert.equal(p.reconcileSaveWrite(failure, c.before.createdAt, s).status, 'retry');
    assert.equal(p.writeSaveWithStatus(c.after, s).persisted, true);
    const loaded = p.loadSaveWithStatus(s).save;
    // A refusal or an unchanged acknowledgement is safe; neither may replay
    // its physical commands, duplicate receipts or add play time again.
    const repeated = formationModel.withSoloV90Progress(loaded, c.receipts, c.state, stamp);
    if (repeated) {
      assert.deepEqual(repeated.soloV90, loaded.soloV90);
      assert.equal(repeated.profile.playTimeSeconds, loaded.profile.playTimeSeconds);
    }
    assert.deepEqual(loaded.soloV90, c.after.soloV90);
  }
});

test('uncertain readback confirms durable commands and a replaced campaign cannot receive them', () => {
  const c = run.commits.find(c => c.receipts.length), s = storage(c.before);
  p.loadSaveWithStatus(s); const write = s.setItem;
  s.setItem = (k, v) => { write(k, v); if (k === key) throw Error('QA after-write failure'); };
  const failure = p.writeSaveWithStatus(c.after, s); assert.equal(failure.persisted, false);
  s.setItem = write;
  const result = p.reconcileSaveWrite(failure, c.before.createdAt, s);
  assert.equal(result.status, 'confirmed'); assert.deepEqual(result.save.soloV90, c.after.soloV90);
  const target = storage(c.before); p.loadSaveWithStatus(target);
  target.values.set(key, JSON.stringify(p.defaultSave('2026-10-11T12:00:00.000Z')));
  const raw = target.getItem(key);
  assert.equal(p.writeSaveWithStatus(c.after, target).failure, 'save-conflict'); assert.equal(target.getItem(key), raw);
});

test('manual slots route an active preparation back to its scene and completed returns to the Homeworld', async () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: async (_n, _o, callback) => callback({}) } } });
  try {
    for (const save of [run.commits[4].after, run.save]) {
      const s = storage(save); assert.equal((await p.migrateLegacyCampaignSlot(s)).ok, true);
      let slot = JSON.parse(s.getItem(p.campaignSlotStorageKey(1)));
      const checkpoint = await p.saveCampaignCheckpoint(1, { kind: 'manual', index: 1, expectedRevision: slot.revision, location: 'youth-training' }, s);
      assert.equal(checkpoint.ok, true, checkpoint.message);
      assert.equal(checkpoint.checkpoint.resumeLocation, save.soloV90.status === 'completed' ? 'homeworld' : 'youth-training');
      slot = JSON.parse(s.getItem(p.campaignSlotStorageKey(1)));
      const active = await p.activateCampaignCheckpoint(1, checkpoint.checkpoint.id, { expectedRevision: slot.revision }, s);
      assert.equal(active.ok, true, active.message); assert.deepEqual(active.save.soloV90, save.soloV90);
    }
  } finally { if (old) Object.defineProperty(globalThis, 'navigator', old); else delete globalThis.navigator; }
});

test('old absent and explicit null preparation remain valid and do not infer a completed chapter', () => {
  for (const raw of [run.origin, { ...run.origin, soloV90: null }]) {
    const restored = p.parseSaveImport(JSON.stringify(raw)); assert.equal(restored.failure, null);
    assert.equal(restored.save.soloV90 ?? null, null);
    assert.deepEqual(restored.save.prologue.chronicle, raw.prologue.chronicle);
  }
});
