import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';

const built = await build({stdin: {contents: "export * from './app/game/systems/gameReserveV66';export * from './app/game/systems/gameReserveGrandHunt';export * from './app/game/systems/campaignSlots';export * from './app/game/systems/completeArchive';export {defaultSave,parseSaveImport,SAVE_STORAGE_KEY} from './app/game/save';", resolveDir: process.cwd()}, bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
const api = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const saveWith = gameReserveV66 => ({...api.defaultSave('2026-11-02T05:30:00.000Z'), gameReserveV66});
function storage(save) {
  const values = new Map([[api.SAVE_STORAGE_KEY, JSON.stringify(save)]]); let refused = false;
  return {get length() {return values.size;}, key: index => [...values.keys()][index] ?? null, getItem: key => values.get(key) ?? null,
    setItem(key, raw) {if (refused) throw new DOMException('V6 quota fixture', 'QuotaExceededError'); values.set(key, raw);}, removeItem: key => values.delete(key),
    refuse: value => {refused = value;}, bytes: () => JSON.stringify([...values])};
}
async function locked(run) {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {locks: {request: async (_name, _options, callback) => callback({})}}});
  try {await run();} finally {if (old) Object.defineProperty(globalThis, 'navigator', old); else delete globalThis.navigator;}
}
async function roundtrip(state) {
  const original = saveWith(state), disk = storage(original);
  assert.deepEqual(api.parseSaveImport(JSON.stringify(original)).save?.gameReserveV66, state);
  assert.equal((await api.migrateLegacyCampaignSlot(disk)).ok, true);
  let slot = api.loadCampaignSlots(disk).slots[0];
  const saved = await api.saveCampaignCheckpoint(1, {kind: 'manual', index: 1, expectedRevision: slot.revision, location: 'game-reserve'}, disk);
  assert.equal(saved.ok, true, saved.message);
  slot = api.loadCampaignSlots(disk).slots[0];
  const loaded = await api.activateCampaignCheckpoint(1, saved.checkpoint.id, {expectedRevision: slot.revision}, disk);
  assert.equal(loaded.ok, true, loaded.message); assert.equal(loaded.checkpoint.resumeLocation, 'game-reserve');
  assert.deepEqual(loaded.save.gameReserveV66, state);
  assert.deepEqual(loaded.save.profile, original.profile); assert.deepEqual(loaded.save.inventory, original.inventory);
  const archive = api.parseCompleteArchive(api.createCompleteArchive(loaded.save, disk).serialized);
  assert.deepEqual(archive.archive?.campaign.gameReserveV66, state);
}
for (const id of api.GAME_RESERVE_GRAND_IDS) {
  test(id + ': live active and physically returned states survive imports, campaign slots and complete archives without reward', async () => locked(async () => {
    let active = api.createGameReserveV109(113, id);
    for (let frame = 0; frame < 90; frame++) active = api.stepGameReserveV66(active, {move: 1});
    await roundtrip(active);
    let returned = api.stepGameReserveV66(api.createGameReserveV109(113, id));
    for (let frame = 0; frame < 60; frame++) returned = api.stepGameReserveV66(returned, {interact: true});
    assert.equal(returned.status, 'returned');
    await roundtrip(returned);
  }));
  test(id + ': a real survey channel event remains exact through storage; geometry fixture is not a combat victory', async () => locked(async () => {
    const definition = api.GAME_RESERVE_GRAND_CATALOGUE.find(item => item.id === id), site = definition.sites[0];
    let state = api.createGameReserveV109(113, id);
    // Declared persistence/geometry fixture. The companion source tests reach
    // all six posts by real jumps; this case isolates the earned event's storage.
    for (const human of state.humans) {human.status = 'down'; human.hp = 0; human.downAt = 0;}
    state.player.x = site.x; state.player.y = site.y; state.visited = Array.from({length: site.sector + 1}, (_, index) => index);
    assert(api.normalizeGameReserveV66(state));
    state = api.stepGameReserveV66(state); // Release inputs before the real held channel.
    for (let frame = 0; frame < 120; frame++) state = api.stepGameReserveV66(state, {interact: true});
    assert.equal(state.routeV109.siteRecords[0].recordedAt, state.tick);
    assert.equal(state.routeV109.siteRecords[0].hunterX, site.x);
    assert.equal(state.routeV109.siteRecords[0].hunterY, site.y);
    await roundtrip(state);
  }));
  test(id + ': refused campaign-slot writes retain every durable byte and retry the identical V6 identity', async () => locked(async () => {
    const original = api.createGameReserveV109(113, id), disk = storage(saveWith(original));
    assert.equal((await api.migrateLegacyCampaignSlot(disk)).ok, true);
    const slot = api.loadCampaignSlots(disk).slots[0], before = disk.bytes(); disk.refuse(true);
    const refused = await api.saveCampaignCheckpoint(1, {kind: 'manual', index: 1, expectedRevision: slot.revision, location: 'game-reserve'}, disk);
    assert.equal(refused.ok, false); assert.equal(disk.bytes(), before); disk.refuse(false);
    const retry = await api.saveCampaignCheckpoint(1, {kind: 'manual', index: 1, expectedRevision: slot.revision, location: 'game-reserve'}, disk);
    assert.equal(retry.ok, true, retry.message);
    const updated = api.loadCampaignSlots(disk).slots[0];
    const restored = await api.activateCampaignCheckpoint(1, retry.checkpoint.id, {expectedRevision: updated.revision}, disk);
    assert.equal(restored.ok, true, restored.message); assert.deepEqual(restored.save.gameReserveV66, original);
  }));
}
test('V7 is future, mixed V6/V5 identities remain invalid and six-group authority never leaks into legacy saves', () => {
  for (const id of api.GAME_RESERVE_GRAND_IDS) {
    const state = api.createGameReserveV109(113, id), source = saveWith(state);
    for (const version of [7, 99]) assert.equal(api.parseSaveImport(JSON.stringify({...source, gameReserveV66: {...state, version}})).failure, 'future-version');
    for (const wrong of [{...state, version: 5}, {...state, reserveId: 'iskhel-ice-expedition'}]) assert.equal(api.normalizeGameReserveV66(wrong), null);
  }
  for (const id of ['khar-duun-canyon-expedition', 'iskhel-ice-expedition']) {
    const legacy = api.createGameReserveV109(113, id); legacy.humans[0].team = 5;
    assert.equal(api.normalizeGameReserveV66(legacy), null);
  }
});
