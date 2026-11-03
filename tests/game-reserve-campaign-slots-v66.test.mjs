import assert from 'node:assert/strict';
import test from 'node:test';
import { p } from './helpers/youth-cage-played-route.mjs';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';
const reserve = homeworldQaModelV64(process.cwd(), ['gameReserveV66.ts']);
function storage(save) { const values = new Map([[p.SAVE_STORAGE_KEY, JSON.stringify(save)]]); return { values, getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) }; }
async function withLocks(run) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: async (_name, _options, callback) => callback({}) } } });
  try { await run(); } finally { if (previous) Object.defineProperty(globalThis, 'navigator', previous); else delete globalThis.navigator; }
}
test('reserve active and physically returned checkpoints roundtrip, while explicit Homeworld/deck choices remain independent', async () => withLocks(async () => {
  const active = reserve.createGameReserveV66(66); let returned = reserve.stepGameReserveV66(active);
  for (let n = 0; n < 200; n++) returned = reserve.stepGameReserveV66(returned, { interact: true });
  assert.equal(returned.status, 'returned');
  for (const state of [active, returned]) for (const location of ['game-reserve', 'homeworld', 'deck']) {
    const save = { ...p.defaultSave('2026-10-01T06:00:00.000Z'), gameReserveV66: state }, s = storage(save);
    const migrated = await p.migrateLegacyCampaignSlot(s); assert(migrated.ok, migrated.message);
    let doc = JSON.parse(s.getItem(p.campaignSlotStorageKey(1)));
    const stored = await p.saveCampaignCheckpoint(1, { kind: 'manual', index: 1, expectedRevision: doc.revision, location }, s);
    assert(stored.ok, stored.message); assert.equal(stored.checkpoint.resumeLocation, location);
    doc = JSON.parse(s.getItem(p.campaignSlotStorageKey(1)));
    const loaded = await p.activateCampaignCheckpoint(1, stored.checkpoint.id, { expectedRevision: doc.revision }, s);
    assert(loaded.ok, loaded.message); assert.equal(loaded.checkpoint.resumeLocation, location); assert.deepEqual(loaded.save.gameReserveV66, state);
  }
}));
test('old archives preserve normal locations, absent reserve cannot mint its entry, and a forged reserve location is protected', async () => withLocks(async () => {
  for (const location of ['homeworld', 'deck', 'game-reserve']) {
    const save = p.defaultSave('2026-10-01T06:00:00.000Z'), s = storage(save);
    assert((await p.migrateLegacyCampaignSlot(s)).ok);
    let doc = JSON.parse(s.getItem(p.campaignSlotStorageKey(1)));
    const stored = await p.saveCampaignCheckpoint(1, { kind: 'manual', index: 1, expectedRevision: doc.revision, location }, s);
    assert(stored.ok, stored.message); assert.equal(stored.checkpoint.resumeLocation, location === 'game-reserve' ? 'deck' : location);
    doc = JSON.parse(s.getItem(p.campaignSlotStorageKey(1))); doc.checkpoints.find(c => c.id === 'manual-1').resumeLocation = 'game-reserve';
    const raw = JSON.stringify(doc); s.setItem(p.campaignSlotStorageKey(1), raw);
    const summary = p.loadCampaignSlots(s).slots.find(slot => slot.id === 1); assert.equal(summary.status, 'blocked');
    assert.equal(s.getItem(p.campaignSlotStorageKey(1)), raw);
  }
}));
