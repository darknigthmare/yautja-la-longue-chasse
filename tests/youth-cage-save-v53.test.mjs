import assert from 'node:assert/strict';
import test from 'node:test';
import { p, now, cageRoute } from './helpers/youth-cage-played-route.mjs';

const run = cageRoute();
const key = p.SAVE_STORAGE_KEY;
const transactions = [
  ['cage-briefing', 'cage-intro', 'youth-cage-entry'],
  ['cage-duel', 'cage-victory', 'youth-cage-victory'],
  ['cage-reward', 'cage-return', 'youth-cage-insignia'],
  ['cage-return', 'cage-complete', 'youth-cage-return'],
];
function storage(save) {
  const values = new Map([[key, JSON.stringify(save)]]);
  return {
    values,
    getItem(name) { return values.get(name) ?? null; },
    setItem(name, value) { values.set(name, value); },
    removeItem(name) { values.delete(name); },
  };
}
function candidate(beforePhase, afterPhase, receiptId) {
  const before = run.snapshots[beforePhase].save;
  const after = run.snapshots[afterPhase].state;
  const receipt = run.receipts.find(value => value.id === receiptId);
  const next = p.withYouthProgress(before, [receipt], after, now);
  assert(next);
  return { before, after, receipt, next };
}

test('quota and silent write loss at each of the four cage milestones preserve the old proof and retry once', () => {
  for (const args of transactions) for (const fault of ['quota', 'drop']) {
    const { before, after, receipt, next } = candidate(...args);
    const s = storage(before); p.loadSaveWithStatus(s);
    const bytes = s.getItem(key), set = s.setItem.bind(s);
    s.setItem = (name, value) => {
      if (name === key) {
        if (fault === 'quota') throw new DOMException('QA quota', 'QuotaExceededError');
        return;
      }
      set(name, value);
    };
    const refused = p.writeSaveWithStatus(next, s);
    assert.equal(refused.persisted, false); assert.equal(s.getItem(key), bytes);
    assert.equal(JSON.parse(bytes).youthTraining.receipts.some(value => value.id === receipt.id), false);
    s.setItem = set;
    assert.equal(p.reconcileSaveWrite(refused, before.createdAt, s).status, 'retry');
    const retry = p.writeSaveWithStatus(next, s); assert.equal(retry.persisted, true);
    const durable = p.loadSaveWithStatus(s).save;
    assert.equal(durable.youthTraining.receipts.filter(value => value.id === receipt.id).length, 1);
    const duplicate = p.withYouthProgress(durable, [receipt], after, now);
    assert(duplicate); assert.equal(duplicate.youthTraining.receipts.length, durable.youthTraining.receipts.length);
    assert.equal(duplicate.profile.playTimeSeconds, durable.profile.playTimeSeconds);
    assert.deepEqual(duplicate.inventory, before.inventory); assert.deepEqual(duplicate.statistics, before.statistics);
    assert.equal(p.getChronicleRank(duplicate.prologue.chronicle), 'unblooded');
  }
});

test('a reward written before a storage exception reconciles without awarding another insignia', () => {
  const { before, after, receipt, next } = candidate(...transactions[2]);
  const s = storage(before); p.loadSaveWithStatus(s);
  const set = s.setItem.bind(s);
  s.setItem = (name, value) => { set(name, value); if (name === key) throw new Error('QA after-write'); };
  const uncertain = p.writeSaveWithStatus(next, s); assert.equal(uncertain.persisted, false);
  assert.equal(JSON.parse(s.getItem(key)).youthTraining.checkpoint.cage.insignia, true);
  s.setItem = set;
  const resolved = p.reconcileSaveWrite(uncertain, before.createdAt, s);
  assert.equal(resolved.status, 'confirmed');
  const retried = p.withYouthProgress(resolved.save, [receipt], after, now);
  assert(retried); assert.equal(retried.youthTraining.receipts.length, 19);
  assert.equal(retried.profile.playTimeSeconds, resolved.save.profile.playTimeSeconds);
  assert.equal(p.withYouthProgress(resolved.save, [receipt, receipt], after, now), null);
});

test('a concurrent campaign or newer checkpoint cannot be overwritten by a pending cage reward', () => {
  for (const sameOwner of [true, false]) {
    const { before, next } = candidate(...transactions[2]);
    const s = storage(before); p.loadSaveWithStatus(s);
    const set = s.setItem.bind(s);
    s.setItem = () => { throw new DOMException('QA quota', 'QuotaExceededError'); };
    const pending = p.writeSaveWithStatus(next, s); assert.equal(pending.persisted, false);
    s.setItem = set;
    const replacement = sameOwner ? structuredClone(run.save) : p.defaultSave('2026-09-25T10:00:00.000Z');
    const bytes = JSON.stringify(replacement); s.values.set(key, bytes);
    assert.equal(p.reconcileSaveWrite(pending, before.createdAt, s).status, 'refused');
    assert.equal(p.writeSaveWithStatus(next, s).failure, 'save-conflict');
    assert.equal(s.getItem(key), bytes);
  }
});

let lockHeld = false;
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { async request(_name, _options, callback) {
  if (lockHeld) return callback(null);
  lockHeld = true;
  try { return await callback({}); } finally { lockHeld = false; }
} } } });

test('campaign-slot cold load routes every active cage phase back to youth and only completion to Homeworld', async () => {
  const defeated = cageRoute({ initial: run.snapshots['cage-duel'], stop: 'cage-defeat', input: () => ({}) });
  const snapshots = { ...run.snapshots, 'cage-defeat': defeated };
  for (const phase of p.YOUTH_CAGE_PHASES) {
    const saved = snapshots[phase].save, s = storage(saved);
    const migrated = await p.migrateLegacyCampaignSlot(s);
    assert.equal(migrated.ok, true, phase + ': ' + migrated.message);
    // Legacy migration has no screen context. The real scene explicitly saves
    // location youth-training, which resolves a completed chapter to Homeworld.
    let document = JSON.parse(s.getItem(p.campaignSlotStorageKey(1)));
    const checkpoint = await p.saveCampaignCheckpoint(1, { kind: 'manual', index: 1, expectedRevision: document.revision, location: 'youth-training' }, s);
    assert.equal(checkpoint.ok, true, phase + ': ' + checkpoint.message);
    assert.equal(checkpoint.checkpoint.resumeLocation, phase === 'cage-complete' ? 'homeworld' : 'youth-training', phase);
    document = JSON.parse(s.getItem(p.campaignSlotStorageKey(1)));
    const loaded = await p.activateCampaignCheckpoint(1, checkpoint.checkpoint.id, { expectedRevision: document.revision }, s);
    assert.equal(loaded.ok, true, phase + ': ' + loaded.message);
    assert.equal(loaded.save.youthTraining.checkpoint.phase, phase);
    assert.deepEqual(loaded.save.youthTraining.receipts, saved.youthTraining.receipts);
    assert.deepEqual(loaded.save.youthTraining.checkpoint.cage, saved.youthTraining.checkpoint.cage);
    assert.equal(p.parseSaveImport(JSON.stringify(loaded.save)).failure, null);
  }
});
