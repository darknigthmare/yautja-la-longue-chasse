import assert from 'node:assert/strict';
import test from 'node:test';
import { cageRoute, p } from './helpers/youth-cage-played-route.mjs';
import { solo, playSolo, stamp } from './helpers/solo-v66-played-route.mjs';
const origin = cageRoute().save, key = p.SAVE_STORAGE_KEY;
let current = solo.startSoloV66Campaign(origin, stamp);
const commits = [];
playSolo({ onStep(out) {
  const before = current;
  current = out.receipts.length ? solo.withSoloV66Progress(current, out.receipts, out.state, stamp) : solo.withSoloV66Checkpoint(current, out.state, stamp);
  assert(current);
  if (out.receipts.length) commits.push({ before, after: current, state: out.state, receipts: out.receipts });
} });
const complete = current;
function storage(save) {
  const values = new Map([[key, JSON.stringify(save)]]);
  return { values, getItem(k) { return values.get(k) ?? null; }, setItem(k, v) { values.set(k, v); }, removeItem(k) { values.delete(k); } };
}
test('the real parser accepts old, active and completed chapters but refuses orphan proofs or malformed/future data', () => {
  for (const save of [origin, ...commits.map(c => c.after)]) assert.equal(p.parseSaveImport(JSON.stringify(save)).failure, null);
  for (const edit of [s => s.soloV66 = null, s => s.soloV66.receipts.pop(), s => s.soloV66.checkpoint.milestones.observed = 0, s => s.soloV66.status = 'active']) {
    const save = structuredClone(complete); edit(save); assert.notEqual(p.parseSaveImport(JSON.stringify(save)).failure, null);
  }
  for (const edit of [s => s.soloV66.version = 2, s => s.soloV66.checkpoint.version = 2]) {
    const save = structuredClone(complete); edit(save); const bytes = JSON.stringify(save), s = storage(save);
    assert.notEqual(p.parseSaveImport(bytes).failure, null); p.loadSaveWithStatus(s); assert.equal(s.getItem(key), bytes, 'future raw data kept');
  }
});
test('quota and silent write loss at all seven receipts preserve the old chapter and retry exactly once', () => {
  for (const c of commits) for (const kind of ['quota', 'drop']) {
    const s = storage(c.before); p.loadSaveWithStatus(s); const bytes = s.getItem(key), set = s.setItem.bind(s);
    s.setItem = (name, value) => { if (name === key) { if (kind === 'quota') throw new DOMException('QA quota', 'QuotaExceededError'); return; } set(name, value); };
    const refused = p.writeSaveWithStatus(c.after, s); assert.equal(refused.persisted, false); assert.equal(s.getItem(key), bytes);
    s.setItem = set; assert.equal(p.reconcileSaveWrite(refused, c.before.createdAt, s).status, 'retry');
    const retried = p.writeSaveWithStatus(c.after, s); assert.equal(retried.persisted, true);
    const read = p.loadSaveWithStatus(s).save; assert.equal(read.soloV66.receipts.length, c.after.soloV66.receipts.length);
    const duplicate = solo.withSoloV66Progress(read, c.receipts, c.state, stamp); assert(duplicate);
    assert.equal(duplicate.soloV66.receipts.length, read.soloV66.receipts.length); assert.equal(duplicate.profile.playTimeSeconds, read.profile.playTimeSeconds);
  }
});
test('post-write exception reconciles the terminal proof and concurrent same/different owners cannot be overwritten', () => {
  const c = commits.at(-1), s = storage(c.before); p.loadSaveWithStatus(s); const set = s.setItem.bind(s);
  s.setItem = (name, value) => { set(name, value); if (name === key) throw Error('QA after durable write'); };
  const uncertain = p.writeSaveWithStatus(c.after, s); assert.equal(uncertain.persisted, false); s.setItem = set;
  const resolved = p.reconcileSaveWrite(uncertain, c.before.createdAt, s); assert.equal(resolved.status, 'confirmed');
  assert.equal(resolved.save.prologue.chronicle.evidence.filter(e => e.id === 'first-tracks').length, 1);
  for (const replacement of [complete, p.defaultSave('2026-10-01T08:00:00.000Z')]) {
    const c = commits[1], target = storage(c.before); p.loadSaveWithStatus(target); const restore = target.setItem.bind(target);
    target.setItem = () => { throw Error('QA refusal'); }; const pending = p.writeSaveWithStatus(c.after, target); assert.equal(pending.persisted, false); target.setItem = restore;
    const bytes = JSON.stringify(replacement); target.values.set(key, bytes);
    assert.equal(p.reconcileSaveWrite(pending, c.before.createdAt, target).status, 'refused');
    assert.equal(p.writeSaveWithStatus(c.after, target).failure, 'save-conflict'); assert.equal(target.getItem(key), bytes);
  }
});

test('manual campaign checkpoints route active Solo back to its scene and the completed assessment to Homeworld', async () => {
  let locked = false;
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { async request(_name, _options, callback) {
    if (locked) return callback(null); locked = true; try { return await callback({}); } finally { locked = false; }
  } } } });
  try {
    for (const save of [solo.startSoloV66Campaign(origin, stamp), ...commits.map(c => c.after)]) {
      const s = storage(save); const migration = await p.migrateLegacyCampaignSlot(s); assert.equal(migration.ok, true, migration.message);
      let slot = JSON.parse(s.getItem(p.campaignSlotStorageKey(1)));
      const stored = await p.saveCampaignCheckpoint(1, { kind: 'manual', index: 1, expectedRevision: slot.revision, location: 'youth-training' }, s);
      assert.equal(stored.ok, true, stored.message);
      assert.equal(stored.checkpoint.resumeLocation, save.soloV66.status === 'completed' ? 'homeworld' : 'youth-training');
      slot = JSON.parse(s.getItem(p.campaignSlotStorageKey(1)));
      const loaded = await p.activateCampaignCheckpoint(1, stored.checkpoint.id, { expectedRevision: slot.revision }, s);
      assert.equal(loaded.ok, true, loaded.message); assert.deepEqual(loaded.save.soloV66.receipts, save.soloV66.receipts);
      assert.equal(loaded.save.soloV66.checkpoint.phase, save.soloV66.checkpoint.phase);
    }
  } finally { if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator); else delete globalThis.navigator; }
});
