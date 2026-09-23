import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import {createInquiryFixture} from "./fixtures/homeworld-inquiry.mjs";
const compiled = await build({ stdin: { contents: `
export * from "./app/game/systems/campaignSlots";
export * from "./app/game/systems/archiveTransaction";
export * from "./app/game/systems/archiveTransferGuard";
export {defaultSave, SAVE_STORAGE_KEY, SAVE_VERSION} from "./app/game/save";
export {createDefaultShipProgression, SHIP_PROGRESSION_STORAGE_KEY} from "./app/game/systems/progression";
export {createPitSave, pitSaveStorageKey, PIT_SAVE_STORAGE_KEY, PIT_SAVE_VERSION} from "./app/game/systems/pitSave";
export {createPitReplayArchive, pitReplayStorageKey} from "./app/game/systems/pitReplayStorage";
export {ACTIVE_HUNT_STORAGE_KEY, ACTIVE_HUNT_SAVE_VERSION, ACTIVE_HUNT_RUNTIME_REVISION} from "./app/game/systems/activeHuntSave";
export * from "./app/game/systems/homeworld";
`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const p = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const MAIN = p.SAVE_STORAGE_KEY, owner = "2026-09-01T12:00:00.000Z";
let lockHeld = false;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks: { async request(_name, _options, callback) {
  if (lockHeld) return callback(null);
  lockHeld = true; try { return await callback({ name: "yautja-full-archive-transfer" }); } finally { lockHeld = false; }
} } } });
function store(entries = []) {
  const values = new Map(entries), writes = [];
  return { values, writes, getItem(key) { return values.get(key) ?? null; }, setItem(key, value) { writes.push(["set", key]); values.set(key, value); }, removeItem(key) { writes.push(["remove", key]); values.delete(key); } };
}
function fixture() {
  const campaign = p.defaultSave(owner); campaign.profile.hunterName = "Ancienne chasse";
  campaign.profile.playTimeSeconds = 77; campaign.inventory.weaponUpgrades.combistick = 1;
  const ship = p.createDefaultShipProgression(campaign, owner), discipline = Object.keys(ship.training)[0];
  ship.training[discipline] = { ...ship.training[discipline], attempts: 3 };
  const pit = p.createPitSave(owner, owner), replay = p.createPitReplayArchive(owner, owner);
  return store([[MAIN, JSON.stringify(campaign)], [MAIN + ".backup", JSON.stringify(campaign)],
    [p.SHIP_PROGRESSION_STORAGE_KEY, JSON.stringify(ship)], [p.pitSaveStorageKey(owner), JSON.stringify(pit)],
    [p.pitReplayStorageKey(owner), JSON.stringify(replay)]]);
}
const catalog = s => p.loadCampaignSlots(s);
const doc = (s, id = 1) => JSON.parse(s.getItem(p.campaignSlotStorageKey(id)));
const revision = (s, id = 1) => doc(s, id).revision;
const autosave = (s, extra = {}) => p.saveCampaignCheckpoint(1, { kind: "auto", expectedRevision: revision(s), ...extra }, s);
function advance(s, seconds) { const save = JSON.parse(s.getItem(MAIN)); save.profile.playTimeSeconds = seconds; s.values.set(MAIN, JSON.stringify(save)); return save; }
async function migrated(s = fixture()) { const result = await p.migrateLegacyCampaignSlot(s); assert.equal(result.ok, true, result.message); return s; }
function assertPreserved(original, s) { for (const [key, value] of original) assert.equal(s.getItem(key), value, key); }

test("five initially empty parties are read-only; creation refuses occupied and invalid ids", async () => {
  const s = store(); assert.equal(catalog(s).slots.length, 5); assert.equal(catalog(s).legacy, "empty"); assert.deepEqual(s.writes, []);
  for (const id of p.CAMPAIGN_SLOT_IDS) assert.equal((await p.createCampaignSlot(id, "Partie " + id, s)).ok, true);
  assert.equal(new Set(catalog(s).slots.map(slot => slot.ownerCreatedAt)).size, 5, "even same-millisecond creations receive distinct owners");
  assert.equal(s.getItem(MAIN), null, "creation never switches the working campaign implicitly");
  const original = [...s.values]; assert.equal((await p.createCampaignSlot(1, "Replace", s)).failure, "slot-occupied");
  assert.equal((await p.createCampaignSlot(6, "Invalid", s)).failure, "invalid-slot"); assertPreserved(original, s);
});
test("legacy migration retains all source bytes and all complete-party families; retry is idempotent", async () => {
  const s = fixture(), original = [...s.values];
  assert.equal((await p.createCampaignSlot(2, "New", s)).failure, "migration-required"); assertPreserved(original, s);
  const result = await p.migrateLegacyCampaignSlot(s); assert.equal(result.ok, true, result.message);
  assert.equal(result.slotId, 1); assert.equal(result.checkpoint.resumeLocation, "deck"); assertPreserved(original, s);
  const first = doc(s).checkpoints[0].archive;
  assert.equal(first.campaign.inventory.weaponUpgrades.combistick, 1); assert.equal(first.campaign.profile.playTimeSeconds, 77);
  assert.deepEqual(first.attachments.shipProgression, JSON.parse(s.getItem(p.SHIP_PROGRESSION_STORAGE_KEY)));
  assert.deepEqual(first.attachments.pit, JSON.parse(s.getItem(p.pitSaveStorageKey(owner))));
  assert.deepEqual(first.attachments.pitReplay, JSON.parse(s.getItem(p.pitReplayStorageKey(owner))));
  const preserved = [...s.values].find(([key]) => key.includes(".legacy.")); assert(preserved);
  assert.equal(JSON.parse(preserved[1]).original.find(e => e.key === MAIN).raw, original[0][1]);
  const count = s.writes.length; assert.equal((await p.migrateLegacyCampaignSlot(s)).ok, true); assert.equal(s.writes.length, count);
});
test("a legacy owner-scoped unscoped PIT archive is copied, never erased or silently omitted", async () => {
  const s = fixture(), raw = s.getItem(p.pitSaveStorageKey(owner)); s.values.delete(p.pitSaveStorageKey(owner)); s.values.set(p.PIT_SAVE_STORAGE_KEY, raw);
  await migrated(s); assert.deepEqual(doc(s).checkpoints[0].archive.attachments.pit, JSON.parse(raw)); assert.equal(s.getItem(p.PIT_SAVE_STORAGE_KEY), raw);
});
test("exactly ten manual and two rotating autos retain complete distinct states", async () => {
  const s = await migrated();
  for (let index = 1; index <= 10; index++) { advance(s, 100 + index); const r = await p.saveCampaignCheckpoint(1, { kind: "manual", index, expectedRevision: revision(s), location: "homeworld" }, s); assert.equal(r.ok, true, r.message); }
  for (const seconds of [201, 202, 203]) { advance(s, seconds); assert.equal((await autosave(s)).ok, true); }
  const checkpoints = doc(s).checkpoints; assert.equal(checkpoints.length, 12);
  assert.deepEqual(checkpoints.filter(c => c.kind === "auto").map(c => c.playTimeSeconds).sort(), [202, 203]);
  for (let index = 1; index <= 10; index++) { const c = checkpoints.find(c => c.id === "manual-" + index); assert.equal(c.archive.campaign.profile.playTimeSeconds, 100 + index); assert.equal(c.resumeLocation, "homeworld"); }
  const before = s.getItem(p.campaignSlotStorageKey(1));
  assert.equal((await p.saveCampaignCheckpoint(1, { kind: "manual", index: 11, expectedRevision: revision(s) }, s)).failure, "missing-checkpoint");
  assert.equal(s.getItem(p.campaignSlotStorageKey(1)), before);
});
test("switching parties first captures current progress, restores full attachments and never merges owners", async () => {
  const s = await migrated(), created = await p.createCampaignSlot(2, "Deuxième", s); assert.equal(created.ok, true);
  advance(s, 999);
  const switched = await p.activateCampaignCheckpoint(2, "auto-1", { expectedRevision: revision(s, 2) }, s);
  assert.equal(switched.ok, true, switched.message); assert.equal(switched.checkpoint.resumeLocation, "prologue");
  const secondOwner = switched.save.createdAt; assert.notEqual(secondOwner, owner); assert.equal(catalog(s).activeSlotId, 2);
  assert.equal(JSON.parse(s.getItem(p.SHIP_PROGRESSION_STORAGE_KEY)).ownerSaveCreatedAt, secondOwner);
  assert.equal(doc(s).checkpoints.find(c => c.id === doc(s).lastCheckpointId).playTimeSeconds, 999);
  assert.equal((await autosave(s)).failure, "owner-conflict");
  const returned = await p.activateCampaignCheckpoint(1, doc(s).lastCheckpointId, { expectedRevision: revision(s) }, s);
  assert.equal(returned.ok, true, returned.message); assert.equal(returned.save.profile.playTimeSeconds, 999);
  assert.equal(JSON.parse(s.getItem(p.pitSaveStorageKey(owner))).ownerSaveCreatedAt, owner);
});
test("same-party auto load pins the selected archive before safety rotation overwrites that slot", async () => {
  const s = await migrated(); advance(s, 200); await autosave(s); // next auto is 1
  const desired = doc(s).checkpoints.find(c => c.id === "auto-1").archive.campaign;
  advance(s, 300);
  const result = await p.activateCampaignCheckpoint(1, "auto-1", { expectedRevision: revision(s) }, s);
  assert.equal(result.ok, true, result.message); assert.deepEqual(result.save, desired);
  assert.equal(doc(s).checkpoints.find(c => c.id === "auto-1").playTimeSeconds, 300, "pre-load live progress still has a durable safety auto");
});
test("Continue uses durable current progress newer than either autosave without importing an older snapshot", async () => {
  const s = await migrated(); advance(s, 555); const raw = s.getItem(MAIN);
  const result = await p.continueCampaignSlot(1, { expectedRevision: revision(s), location: "homeworld" }, s);
  assert.equal(result.ok, true, result.message); assert.equal(result.save.profile.playTimeSeconds, 555);
  assert.equal(result.checkpoint.resumeLocation, "homeworld"); assert.equal(s.getItem(MAIN), raw);
});
test("stale or absent revisions refuse without writes, and a held Web Lock prevents mutations", async () => {
  const s = await migrated(), oldRevision = revision(s); advance(s, 78); await autosave(s); const before = [...s.values], count = s.writes.length;
  assert.equal((await p.saveCampaignCheckpoint(1, { kind: "auto", expectedRevision: oldRevision }, s)).failure, "save-conflict");
  assert.equal((await p.saveCampaignCheckpoint(1, { kind: "auto" }, s)).failure, "save-conflict");
  assert.equal((await p.activateCampaignCheckpoint(1, "auto-1", {}, s)).failure, "save-conflict");
  lockHeld = true; try { assert.equal((await autosave(s)).failure, "lock-unavailable"); } finally { lockHeld = false; }
  assert.equal(s.writes.length, count); assertPreserved(before, s);
});
test("future campaign, nested Homeworld, backup and slot versions stay byte-identical", async () => {
  for (const patch of [c => ({ ...c, version: p.SAVE_VERSION + 1 }), c => ({ ...c, homeworld: { ...c.homeworld, inquiry: { version: 2, futureEvidence: ["keep"] } } })]) {
    const s = fixture(); s.values.set(MAIN, JSON.stringify(patch(JSON.parse(s.getItem(MAIN))))); const before = [...s.values];
    assert.equal((await p.migrateLegacyCampaignSlot(s)).failure, "future-version"); assert.equal(s.writes.length, 0); assertPreserved(before, s);
  }
  const s = await migrated(); s.values.set(MAIN + ".backup", JSON.stringify({ ...p.defaultSave(owner), version: 99 }));
  const before = [...s.values]; assert.equal((await autosave(s)).failure, "future-version"); assertPreserved(before, s);
  const other = await migrated(); await autosave(other); const key = p.campaignSlotStorageKey(1);
  const future = JSON.stringify({ ...doc(other), version: 2 }); other.values.set(key, future);
  assert.equal(catalog(other).slots[0].recoveryAvailable, false); assert.equal((await p.recoverCampaignSlot(1, other)).failure, "future-version"); assert.equal(other.getItem(key), future);
});
test("target-owner future PIT sidecar refuses activation instead of downgrading it", async () => {
  const s = await migrated(); await p.createCampaignSlot(2, "Two", s); const target = doc(s, 2).ownerCreatedAt;
  const future = JSON.stringify({ ...p.createPitSave(target, target), version: p.PIT_SAVE_VERSION + 1 }); s.values.set(p.pitSaveStorageKey(target), future);
  const working = s.getItem(MAIN); const result = await p.activateCampaignCheckpoint(2, "auto-1", { expectedRevision: revision(s, 2) }, s);
  assert.equal(result.failure, "future-version"); assert.equal(s.getItem(MAIN), working); assert.equal(s.getItem(p.pitSaveStorageKey(target)), future);
});
test("quota during migration or checkpoint commit never consumes old data or announces success", async () => {
  const s = fixture(), before = [...s.values], set = s.setItem.bind(s);
  s.setItem = (key, value) => { if (key === p.campaignSlotStorageKey(1)) throw new DOMException("full", "QuotaExceededError"); set(key, value); };
  assert.equal((await p.migrateLegacyCampaignSlot(s)).failure, "quota-exceeded"); assertPreserved(before, s); assert.equal(s.getItem(p.campaignSlotStorageKey(1)), null);
  s.setItem = set; await migrated(s); advance(s, 78); const slotRaw = s.getItem(p.campaignSlotStorageKey(1));
  s.setItem = (key, value) => { if (key === p.campaignSlotStorageKey(1)) throw new DOMException("full", "QuotaExceededError"); set(key, value); };
  const r = await autosave(s); assert.equal(r.failure, "quota-exceeded"); assert.equal(s.getItem(p.campaignSlotStorageKey(1)), slotRaw);
  assert.equal(s.getItem(p.campaignSlotStorageKey(1) + ".backup"), slotRaw);
});
test("a readback failure cannot report success; refresh observes the one actual commit without duplicate autos", async () => {
  const s = await migrated(), get = s.getItem.bind(s), set = s.setItem.bind(s), key = p.campaignSlotStorageKey(1); let unreadable = false; advance(s, 78);
  s.setItem = (k, v) => { set(k, v); if (k === key) unreadable = true; };
  s.getItem = k => { if (unreadable && k === key) throw Error("unreadable"); return get(k); };
  const result = await p.saveCampaignCheckpoint(1, { kind: "auto", expectedRevision: 1 }, s); assert.equal(result.failure, "unconfirmed-write");
  unreadable = false; s.setItem = set; assert.equal(revision(s), 2);
  assert.equal((await p.saveCampaignCheckpoint(1, { kind: "auto", expectedRevision: 1 }, s)).failure, "save-conflict");
});
test("corrupt or missing slot primary requires explicit recovery; original bad bytes are retained", async () => {
  for (const missing of [false, true]) {
    const s = await migrated(); advance(s, 78); await autosave(s); const key = p.campaignSlotStorageKey(1), backup = s.getItem(key + ".backup");
    if (missing) s.values.delete(key); else s.values.set(key, "{damaged");
    const loaded = catalog(s); assert.equal(loaded.slots[0].status, "blocked"); assert.equal(loaded.slots[0].recoveryAvailable, true);
    assert.equal((await p.createCampaignSlot(1, "Replace", s)).failure, "slot-occupied");
    const result = await p.recoverCampaignSlot(1, s); assert.equal(result.ok, true, result.message); assert.deepEqual(JSON.parse(s.getItem(key)), JSON.parse(backup));
    if (!missing) assert.equal(s.getItem(key + ".damaged"), "{damaged");
  }
});
test("a partial activation rolls back every working family and retains both complete slot archives", async () => {
  const s = await migrated(); await p.createCampaignSlot(2, "Two", s); const before = new Map([MAIN, MAIN + ".backup", p.ACTIVE_HUNT_STORAGE_KEY, p.SHIP_PROGRESSION_STORAGE_KEY].map(key => [key, s.getItem(key)]));
  const set = s.setItem.bind(s); let once = true;
  s.setItem = (key, value) => { if (key === p.SHIP_PROGRESSION_STORAGE_KEY && once) { once = false; throw Error("disk interrupted"); } set(key, value); };
  const result = await p.activateCampaignCheckpoint(2, "auto-1", { expectedRevision: revision(s, 2) }, s);
  assert.equal(result.ok, false); assertPreserved(before, s); assert.equal(s.getItem(p.ARCHIVE_TRANSFER_JOURNAL_KEY), null);
  assert.equal(catalog(s).slots.filter(slot => slot.status === "ready").length, 2);
});
test("a sidecar changed after the safety auto is detected rather than lost during switch", async () => {
  const s = await migrated(); await p.createCampaignSlot(2, "Two", s); advance(s, 78); const set = s.setItem.bind(s); let changed;
  s.setItem = (key, value) => { set(key, value); if (key === p.campaignSlotStorageKey(1)) { const ship = JSON.parse(s.getItem(p.SHIP_PROGRESSION_STORAGE_KEY)); ship.training[Object.keys(ship.training)[0]].attempts += 7; changed = JSON.stringify(ship); s.values.set(p.SHIP_PROGRESSION_STORAGE_KEY, changed); } };
  const original = s.getItem(MAIN), r = await p.activateCampaignCheckpoint(2, "auto-1", { expectedRevision: revision(s, 2) }, s);
  assert.equal(r.failure, "save-conflict"); assert.equal(s.getItem(MAIN), original); assert.equal(s.getItem(p.SHIP_PROGRESSION_STORAGE_KEY), changed);
});


test("suspended hunt and Homeworld dossier survive complete checkpoints with mission resume priority", async () => {
  const s = fixture(), save = JSON.parse(s.getItem(MAIN));
  save.homeworld = createInquiryFixture(p); s.values.set(MAIN, JSON.stringify(save));
  const hunt = { version: p.ACTIVE_HUNT_SAVE_VERSION, runtimeRevision: p.ACTIVE_HUNT_RUNTIME_REVISION,
    ownerSaveCreatedAt: owner, missionId: "jungle-vey", difficultyId: "hunter", encounterRun: 0,
    runId: "slot-fixture-hunt", sequence: 1, startedAt: owner, savedAt: owner,
    configuration: { inventory: save.inventory, loadout: save.loadout, appearance: save.appearance,
      visualOptions: { screenShake: true, reducedGore: false, highContrastVision: false } },
    snapshot: { elapsed: 60, health: 42, completedObjectives: ["scan-traces"] }, retryCheckpoint: { relayIndex: 1 } };
  s.values.set(p.ACTIVE_HUNT_STORAGE_KEY, JSON.stringify(hunt));
  const migratedResult = await p.migrateLegacyCampaignSlot(s); assert.equal(migratedResult.ok, true, migratedResult.message);
  assert.equal(migratedResult.checkpoint.resumeLocation, "mission"); assert.equal(migratedResult.checkpoint.hasActiveHunt, true);
  const archived = doc(s).checkpoints[0].archive; assert.deepEqual(archived.attachments.activeHunt, hunt); assert.deepEqual(archived.campaign.homeworld, save.homeworld);
  await p.createCampaignSlot(2, "Two", s); assert.equal((await p.activateCampaignCheckpoint(2, "auto-1", { expectedRevision: 1 }, s)).ok, true);
  assert.equal(s.getItem(p.ACTIVE_HUNT_STORAGE_KEY), null);
  const restored = await p.activateCampaignCheckpoint(1, "auto-1", { expectedRevision: revision(s) }, s);
  assert.equal(restored.ok, true, restored.message); assert.equal(restored.checkpoint.resumeLocation, "mission");
  assert.deepEqual(JSON.parse(s.getItem(p.ACTIVE_HUNT_STORAGE_KEY)), hunt); assert.deepEqual(restored.save.homeworld, save.homeworld);
});

test("unconfirmed rollback keeps the recovery journal and mutations frozen until explicit repair", async () => {
  const s = await migrated(); await p.createCampaignSlot(2, "Two", s);
  const before = s.getItem(MAIN), set = s.setItem.bind(s); let first = true;
  s.setItem = (key, value) => { if (key === p.SHIP_PROGRESSION_STORAGE_KEY) {
    if (first) { first = false; set(key, value); } throw Error("ship write/readback blocked");
  } set(key, value); };
  const result = await p.activateCampaignCheckpoint(2, "auto-1", { expectedRevision: 1 }, s);
  assert.equal(result.ok, false); assert.equal(result.failure, "recovery-required");
  assert(s.getItem(p.ARCHIVE_TRANSFER_JOURNAL_KEY)); assert.equal(catalog(s).status, "blocked");
  assert.equal((await p.createCampaignSlot(3, "No", s)).failure, "protected-save"); assert.equal(s.getItem(MAIN), before);
  s.setItem = set;
  const recovered = p.recoverArchiveTransaction(s, { now: Date.now() + 30_000 }); assert.equal(recovered.status, "rolled-back");
  assert.equal(s.getItem(p.ARCHIVE_TRANSFER_JOURNAL_KEY), null); assert.equal(catalog(s).activeSlotId, 1);
});

test("corrupt legacy primary migrates from valid backup without changing any original byte", async () => {
  const s = fixture(); s.values.set(MAIN, "{old primary corrupted"); const before = [...s.values];
  const result = await p.migrateLegacyCampaignSlot(s); assert.equal(result.ok, true, result.message); assertPreserved(before, s);
  assert.equal(doc(s).checkpoints[0].archive.campaign.profile.playTimeSeconds, 77);
  const source = [...s.values].find(([key]) => key.includes(".legacy."));
  assert.equal(JSON.parse(source[1]).original.find(e => e.key === MAIN).raw, "{old primary corrupted");
});


test("switching away from an unfinished nursery preserves prologue until a real completion", async () => {
  const s = store(); await p.createCampaignSlot(1, "A", s); await p.activateCampaignCheckpoint(1, "auto-1", { expectedRevision: 1 }, s);
  await p.createCampaignSlot(2, "B", s); await p.activateCampaignCheckpoint(2, "auto-1", { expectedRevision: 1 }, s);
  const last = doc(s).checkpoints.find(c => c.id === doc(s).lastCheckpointId); assert.equal(last.resumeLocation, "prologue");
  const resumed = await p.activateCampaignCheckpoint(1, last.id, { expectedRevision: revision(s) }, s);
  assert.equal(resumed.ok, true); assert.equal(resumed.checkpoint.resumeLocation, "prologue");
  const explicit = await p.saveCampaignCheckpoint(1, { kind: "auto", expectedRevision: revision(s), location: "deck" }, s);
  assert.equal(explicit.ok, true); assert.equal(explicit.checkpoint.resumeLocation, "prologue", "route hints cannot bypass an unfinished nursery");
});


test("unchanged autos ignore only export envelope metadata and make zero writes or rotation", async () => {
  const s = await migrated(), key = p.campaignSlotStorageKey(1), saved = doc(s);
  saved.checkpoints[0].archive.exportedAt = "2020-01-01T00:00:00.000Z";
  saved.checkpoints[0].archive.contentVersion = "V42";
  s.values.set(key, JSON.stringify(saved));
  const before = [...s.values], writes = s.writes.length;
  for (let retry = 0; retry < 3; retry++) {
    const result = await autosave(s);
    assert.equal(result.ok, true, result.message);
    assert.equal(result.checkpoint.id, saved.lastCheckpointId);
    assert.equal(result.checkpoint.savedAt, saved.checkpoints[0].savedAt);
  }
  assert.equal(s.writes.length, writes);
  assert.deepEqual([...s.values], before);
  assert.equal(revision(s), 1); assert.equal(doc(s).nextAutoIndex, 2);
});

test("changed campaign, every owned annex and route remain meaningful autosave changes", async () => {
  const s = await migrated();
  const changes = [
    () => advance(s, 78),
    () => { const ship = JSON.parse(s.getItem(p.SHIP_PROGRESSION_STORAGE_KEY)); ship.training[Object.keys(ship.training)[0]].attempts++; s.values.set(p.SHIP_PROGRESSION_STORAGE_KEY, JSON.stringify(ship)); },
    () => { const pit = JSON.parse(s.getItem(p.pitSaveStorageKey(owner))); pit.updatedAt = "2026-09-02T00:00:00.000Z"; s.values.set(p.pitSaveStorageKey(owner), JSON.stringify(pit)); },
    () => { const replay = JSON.parse(s.getItem(p.pitReplayStorageKey(owner))); replay.updatedAt = "2026-09-02T00:00:00.000Z"; s.values.set(p.pitReplayStorageKey(owner), JSON.stringify(replay)); },
  ];
  for (const change of changes) {
    const before = doc(s); change(); const result = await autosave(s);
    assert.equal(result.ok, true, result.message);
    assert.equal(revision(s), before.revision + 1);
    assert.equal(result.checkpoint.id, "auto-" + before.nextAutoIndex);
    const writes = s.writes.length;
    assert.equal((await autosave(s)).ok, true); assert.equal(s.writes.length, writes);
  }
  const before = doc(s), result = await autosave(s, { location: "homeworld" });
  assert.equal(result.ok, true, result.message); assert.equal(result.checkpoint.resumeLocation, "homeworld");
  assert.equal(revision(s), before.revision + 1);
  const writes = s.writes.length; assert.equal((await autosave(s, { location: "homeworld" })).ok, true);
  assert.equal(s.writes.length, writes);
});

test("manual saves remain explicit even for identical content and autos do not duplicate the latest manual", async () => {
  const s = await migrated();
  for (let write = 0; write < 2; write++) {
    const before = revision(s), count = s.writes.length;
    const result = await p.saveCampaignCheckpoint(1, { kind: "manual", index: 1, expectedRevision: before }, s);
    assert.equal(result.ok, true, result.message); assert.equal(result.checkpoint.id, "manual-1");
    assert.equal(revision(s), before + 1); assert(s.writes.length > count);
  }
  const before = [...s.values], count = s.writes.length;
  const auto = await autosave(s); assert.equal(auto.ok, true); assert.equal(auto.checkpoint.id, "manual-1");
  assert.equal(s.writes.length, count); assert.deepEqual([...s.values], before);
});

test("unchanged autos still refuse protected backup, stale revision and slot mutation during capture", async () => {
  for (const invalidBackup of ["{damaged", JSON.stringify({ version: 2 })]) {
    const s = await migrated(); s.values.set(p.campaignSlotStorageKey(1) + ".backup", invalidBackup);
    const before = [...s.values], count = s.writes.length, result = await autosave(s);
    assert.equal(result.ok, false); assert.equal(s.writes.length, count); assert.deepEqual([...s.values], before);
  }
  const s = await migrated(), key = p.campaignSlotStorageKey(1), get = s.getItem.bind(s);
  const originalRevision = revision(s), count = s.writes.length; let changed = false;
  s.getItem = k => {
    const value = get(k);
    if (k === p.SHIP_PROGRESSION_STORAGE_KEY && !changed) {
      changed = true; const replacement = JSON.parse(get(key)); replacement.revision++;
      s.values.set(key, JSON.stringify(replacement));
    }
    return value;
  };
  const result = await p.saveCampaignCheckpoint(1, { kind: "auto", expectedRevision: originalRevision }, s);
  assert.equal(result.failure, "save-conflict"); assert.equal(s.writes.length, count); assert.equal(revision(s), originalRevision + 1);
});


test("suspended-hunt changes create a new auto and mission priority cannot be suppressed by a route hint", async () => {
  const s = await migrated(), save = JSON.parse(s.getItem(MAIN));
  const hunt = { version: p.ACTIVE_HUNT_SAVE_VERSION, runtimeRevision: p.ACTIVE_HUNT_RUNTIME_REVISION,
    ownerSaveCreatedAt: owner, missionId: "jungle-vey", difficultyId: "hunter", encounterRun: 0,
    runId: "slot-fixture-idempotence", sequence: 1, startedAt: owner, savedAt: owner,
    configuration: { inventory: save.inventory, loadout: save.loadout, appearance: save.appearance,
      visualOptions: { screenShake: true, reducedGore: false, highContrastVision: false } },
    snapshot: { elapsed: 60, health: 42, completedObjectives: ["scan-traces"] }, retryCheckpoint: { relayIndex: 1 } };
  s.values.set(p.ACTIVE_HUNT_STORAGE_KEY, JSON.stringify(hunt));
  const result = await autosave(s, { location: "homeworld" });
  assert.equal(result.ok, true, result.message); assert.equal(result.checkpoint.resumeLocation, "mission");
  assert.equal(revision(s), 2);
  const writes = s.writes.length; assert.equal((await autosave(s, { location: "deck" })).ok, true);
  assert.equal(s.writes.length, writes, "same active hunt remains the same mission despite irrelevant deck hint");
  hunt.sequence++; hunt.snapshot.health = 39; s.values.set(p.ACTIVE_HUNT_STORAGE_KEY, JSON.stringify(hunt));
  assert.equal((await autosave(s)).ok, true); assert.equal(revision(s), 3);
  assert.deepEqual(doc(s).checkpoints.find(c => c.id === doc(s).lastCheckpointId).archive.attachments.activeHunt, hunt);
});

test("a skipped safety auto still freezes every source preimage before switching parties", async () => {
  const s = await migrated(); await p.createCampaignSlot(2, "Two", s);
  const sourceKey = p.campaignSlotStorageKey(1), get = s.getItem.bind(s), before = get(MAIN), writes = s.writes.length;
  let armed = false, changed = null;
  s.getItem = key => {
    const value = get(key);
    if (key === sourceKey + ".backup" && !changed) armed = true;
    if (key === sourceKey && armed && !changed) {
      const ship = JSON.parse(get(p.SHIP_PROGRESSION_STORAGE_KEY));
      ship.training[Object.keys(ship.training)[0]].attempts += 7;
      changed = JSON.stringify(ship); s.values.set(p.SHIP_PROGRESSION_STORAGE_KEY, changed); armed = false;
    }
    return value;
  };
  const result = await p.activateCampaignCheckpoint(2, "auto-1", { expectedRevision: 1 }, s);
  assert(changed, "counterexample must change the annex after the no-op captures its preimage");
  assert.equal(result.failure, "save-conflict"); assert.equal(s.getItem(MAIN), before);
  assert.equal(s.getItem(p.SHIP_PROGRESSION_STORAGE_KEY), changed);
  assert.equal(s.writes.length, writes); assert.equal(revision(s), 1);
});
