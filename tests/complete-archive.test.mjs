import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
const compiled = await build({ stdin: { contents: `
export * from "./app/game/systems/archiveTransaction";
export * from "./app/game/systems/completeArchive";
export * from "./app/game/systems/archiveTransferGuard";
export {defaultSave, SAVE_STORAGE_KEY} from "./app/game/save";
export {createDefaultShipProgression, SHIP_PROGRESSION_STORAGE_KEY} from "./app/game/systems/progression";
export {createPitSave, pitSaveStorageKey, PIT_SAVE_VERSION} from "./app/game/systems/pitSave";
export {createPitReplayArchive, pitReplayStorageKey} from "./app/game/systems/pitReplayStorage";
`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const api = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const { defaultSave, SAVE_STORAGE_KEY: MAIN, ARCHIVE_TRANSFER_JOURNAL_KEY: JOURNAL,
  createCompleteArchive, parseCompleteArchive, prepareCompleteArchiveImport, importCompleteArchive,
  applyArchiveTransaction, recoverArchiveTransaction } = api;
const owner = "2026-08-01T00:00:00.000Z";
const other = "2026-08-02T00:00:00.000Z";
function store(entries = []) {
  const data = new Map(entries), writes = [];
  return { data, writes, getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) { writes.push(["set", key]); data.set(key, value); },
    removeItem(key) { writes.push(["remove", key]); data.delete(key); } };
}
function fixture(createdAt = owner) {
  const campaign = defaultSave(createdAt);
  const ship = api.createDefaultShipProgression(campaign, createdAt);
  const discipline = Object.keys(ship.training)[0];
  ship.training[discipline] = { ...ship.training[discipline], attempts: 3 };
  const pit = api.createPitSave(createdAt, createdAt);
  const replay = api.createPitReplayArchive(createdAt, createdAt);
  const data = store([
    [MAIN, JSON.stringify(campaign)], [MAIN + ".backup", JSON.stringify(campaign)],
    [api.SHIP_PROGRESSION_STORAGE_KEY, JSON.stringify(ship)],
    [api.pitSaveStorageKey(createdAt), JSON.stringify(pit)],
    [api.pitReplayStorageKey(createdAt), JSON.stringify(replay)],
  ]);
  return { campaign, data };
}
function transaction() {
  const campaign = JSON.stringify(defaultSave(owner));
  const keys = ["yautja-long-hunt.active-hunt", "yautja-long-hunt.ship-progression",
    api.pitSaveStorageKey(owner), api.pitReplayStorageKey(owner), MAIN + ".backup", MAIN];
  return keys.map((key, i) => ({ key, before: i === 5 ? JSON.stringify(defaultSave(other)) : "before-" + i, after: i === 5 ? campaign : "after-" + i }));
}
function snapshot(storage) { return [...storage.data].sort(([a], [b]) => a.localeCompare(b)); }
function seedJournal(storage, replacements, phase = "prepared") {
  const journal = { format: "yautja-archive-transaction", version: 1, id: "test-transfer", phase, leaseUntil: 1000, replacements };
  storage.data.set(JOURNAL, JSON.stringify(journal));
}

test("complete export reads the known campaign and four annex families without a write", () => {
  const { campaign, data } = fixture();
  const before = snapshot(data);
  const result = createCompleteArchive(campaign, data, owner);
  assert.equal(result.archive.campaign.createdAt, owner);
  assert.equal(result.archive.attachments.shipProgression.ownerSaveCreatedAt, owner);
  assert.equal(result.archive.attachments.pit.ownerSaveCreatedAt, owner);
  assert.equal(result.archive.attachments.pitReplay.ownerSaveCreatedAt, owner);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(snapshot(data), before); assert.equal(data.writes.length, 0);
  assert(parseCompleteArchive(result.serialized).archive);
});
test("complete export rejects a transfer journal that appears after its stable snapshot", () => {
  const { campaign, data } = fixture();
  const getItem = data.getItem.bind(data);
  let journalReads = 0;
  data.getItem = key => {
    if (key === JOURNAL) return ++journalReads === 1 ? null : "prepared";
    return getItem(key);
  };
  assert.throws(() => createCompleteArchive(campaign, data, owner), /import a commencé/);
  assert.equal(data.writes.length, 0);
});
test("full import replaces the six selected keys and preserves another owner's PIT archives", () => {
  const source = fixture(), destination = fixture(other);
  const archive = createCompleteArchive(source.campaign, source.data, owner).archive;
  const foreignPit = destination.data.getItem(api.pitSaveStorageKey(other));
  const plan = prepareCompleteArchiveImport(archive, destination.data);
  const result = importCompleteArchive(plan, destination.data);
  assert.equal(result.persisted, true);
  for (const entry of plan.replacements) assert.equal(destination.data.getItem(entry.key), entry.after);
  assert.equal(destination.data.getItem(api.pitSaveStorageKey(other)), foreignPit);
  assert.equal(destination.data.getItem(JOURNAL), null);
  assert.deepEqual(createCompleteArchive(archive.campaign, destination.data, owner).archive, archive);
});
test("unconfirmed in-memory progress refuses a full export but never writes over stored progress", () => {
  const { campaign, data } = fixture();
  campaign.profile.honor += 50;
  assert.throws(() => createCompleteArchive(campaign, data), /confirmée/);
  assert.equal(data.writes.length, 0);
});
test("corrupt, foreign, future and incomplete annexes refuse the entire import", () => {
  const source = fixture();
  const clean = createCompleteArchive(source.campaign, source.data, owner).archive;
  for (const mutate of [
    a => a.attachments.pit.ownerSaveCreatedAt = other,
    a => a.attachments.pit.version = 100,
    a => a.attachments.shipProgression.version = 100,
    a => a.attachments.pitReplay = {broken: true},
    a => delete a.attachments.activeHunt,
    a => a.campaign.version = 100,
  ]) {
    const invalid = structuredClone(clean); mutate(invalid);
    assert.equal(parseCompleteArchive(JSON.stringify(invalid)).archive, null);
  }
});
test("current ship annexes reject corrupt nested loadouts and negative statistics before normalization", () => {
  const source = fixture();
  const clean = createCompleteArchive(source.campaign, source.data, owner).archive;
  for (const [label, mutate] of [
    ["unknown preset armor", archive => { archive.attachments.shipProgression.loadoutPresets[0].loadout.armorId = "corrupt-armor"; }],
    ["negative training attempts", archive => { archive.attachments.shipProgression.training.targeting.attempts = -1; }],
    ["negative completed treatments", archive => { archive.attachments.shipProgression.medbay.treatmentsCompleted = -1; }],
  ]) {
    const invalid = structuredClone(clean);
    mutate(invalid);
    const parsed = parseCompleteArchive(JSON.stringify(invalid));
    assert.equal(parsed.archive, null, label);
    assert.equal(parsed.failure, "invalid-sidecar", label);
    const destination = fixture(other);
    assert.throws(() => prepareCompleteArchiveImport(invalid, destination.data), /Archive invalide/, label);
    assert.deepEqual(destination.data.writes, [], label);
  }
});
test("current PIT V5 annexes reject silently repairable identifiers and preferences", () => {
  const source = fixture();
  const clean = createCompleteArchive(source.campaign, source.data, owner).archive;
  for (const [label, mutate] of [
    ["unknown selected fighter", pit => { pit.lastFighterId = "forged-yautja"; }],
    ["unknown selected arena", pit => { pit.lastArenaId = "forged-arena"; }],
    ["unknown training opponent", pit => { pit.trainingPreferences.opponentId = "forged-yautja"; }],
    ["invalid training guard", pit => { pit.trainingPreferences.guard = "always"; }],
    ["non-boolean frame-data preference", pit => { pit.trainingPreferences.showFrameData = "true"; }],
    ["trimmed result identifier", pit => { pit.appliedResultIds = [" padded-result "]; }],
    ["duplicate result identifiers", pit => { pit.appliedResultIds = ["repeat", "repeat"]; }],
    ["invalid result identifier", pit => { pit.appliedResultIds = [""]; }],
  ]) {
    const invalid = structuredClone(clean);
    mutate(invalid.attachments.pit);
    const parsed = parseCompleteArchive(JSON.stringify(invalid));
    assert.equal(parsed.archive, null, label);
    assert.equal(parsed.failure, "invalid-sidecar", label);
    const destination = fixture(other);
    assert.throws(() => prepareCompleteArchiveImport(invalid, destination.data), /Archive invalide/, label);
    assert.deepEqual(destination.data.writes, [], label);
  }
});
test("a genuine PIT V4 annex still migrates while preserving its historical choices", () => {
  const source = fixture();
  const legacy = createCompleteArchive(source.campaign, source.data, owner).archive;
  const pit = legacy.attachments.pit;
  pit.version = 4;
  pit.runtimeRevision = 4;
  pit.revision = 1;
  pit.sequence = 1;
  pit.lastFighterId = "wolf";
  pit.lastArenaId = "frost-chamber";
  pit.trainingPreferences = {
    opponentId: "berserker", guard: "alternating", showFrameData: true, showHitboxes: false,
  };
  pit.appliedResultIds = ["historic-v4-result"];
  delete pit.stats.descent;
  delete pit.circuitRuns;
  delete pit.descentProgress;
  delete pit.descentRuns;

  const parsed = parseCompleteArchive(JSON.stringify(legacy));
  assert.ok(parsed.archive);
  assert.equal(parsed.archive.attachments.pit.version, api.PIT_SAVE_VERSION);
  assert.equal(parsed.archive.attachments.pit.lastFighterId, "wolf");
  assert.equal(parsed.archive.attachments.pit.lastArenaId, "frost-chamber");
  assert.deepEqual(parsed.archive.attachments.pit.trainingPreferences, pit.trainingPreferences);
  assert.deepEqual(parsed.archive.attachments.pit.appliedResultIds, ["historic-v4-result"]);
});
test("archive parsing cannot inject arbitrary storage keys", () => {
  const source = fixture();
  const archive = createCompleteArchive(source.campaign, source.data, owner).archive;
  archive.attachments["unrelated-secret"] = {ownerSaveCreatedAt:owner, value:"not copied"};
  const parsed = parseCompleteArchive(JSON.stringify(archive));
  assert(parsed.archive);
  const destination = fixture(other);
  const plan = prepareCompleteArchiveImport(parsed.archive, destination.data);
  assert.equal(plan.replacements.length, 6);
  assert(!plan.replacements.some(e => e.key.includes("unrelated")));
});
test("every changed preview key prevents confirmation before a journal or replacement is written", () => {
  const source = fixture();
  const archive = createCompleteArchive(source.campaign, source.data, owner).archive;
  for (let index = 0; index < 6; index++) {
    const destination = fixture(other);
    const plan = prepareCompleteArchiveImport(archive, destination.data);
    destination.data.data.set(plan.replacements[index].key, "third-session");
    const before = snapshot(destination.data);
    assert.equal(importCompleteArchive(plan, destination.data).persisted, false);
    assert.deepEqual(snapshot(destination.data), before);
    assert.equal(destination.data.writes.length, 0);
  }
});
test("interruption after any prepared write restores the full preimage", () => {
  for (let count = 0; count <= 6; count++) {
    const replacements = transaction(), storage = store(replacements.map(e => [e.key, e.before]));
    const before = snapshot(storage);
    seedJournal(storage, replacements);
    for (const entry of replacements.slice(0, count)) storage.data.set(entry.key, entry.after);
    assert.equal(recoverArchiveTransaction(storage, {now: 2000}).status, "rolled-back", String(count));
    assert.deepEqual(snapshot(storage), before);
    assert.equal(recoverArchiveTransaction(storage).status, "none");
  }
});
test("identical campaign bytes cannot turn a partially applied import into a committed one", () => {
  const replacements = transaction();
  replacements[5].before = replacements[5].after;
  const storage = store(replacements.map(e => [e.key, e.before])), before = snapshot(storage);
  seedJournal(storage, replacements);
  storage.data.set(replacements[0].key, replacements[0].after);
  assert.equal(recoverArchiveTransaction(storage, {now:2000}).status, "rolled-back");
  assert.deepEqual(snapshot(storage), before);
});
test("an explicit committed marker completes without rolling back any data", () => {
  const replacements = transaction(), storage = store(replacements.map(e => [e.key, e.after]));
  seedJournal(storage, replacements, "committed");
  assert.equal(recoverArchiveTransaction(storage).status, "committed");
  for (const entry of replacements) assert.equal(storage.getItem(entry.key), entry.after);
});
test("third-party bytes are preserved and block recovery before any restoration write", () => {
  const replacements = transaction(), storage = store(replacements.map(e => [e.key, e.after]));
  seedJournal(storage, replacements);
  storage.data.set(replacements[3].key, "unrelated-revision");
  const before = snapshot(storage);
  assert.equal(recoverArchiveTransaction(storage, {now:2000}).status, "blocked");
  assert.deepEqual(snapshot(storage), before); assert.equal(storage.writes.length, 0);
});
test("a live prepared lease is left alone by another window but its own attempt may roll back", () => {
  const replacements = transaction(), storage = store(replacements.map(e => [e.key, e.before]));
  seedJournal(storage, replacements);
  assert.equal(recoverArchiveTransaction(storage, {now:500}).status, "blocked");
  assert.equal(storage.writes.length, 0);
  assert.equal(recoverArchiveTransaction(storage, {now:500,ownedTransactionId:"test-transfer"}).status, "rolled-back");
});
test("quota failure at every mutation leaves a complete old or complete committed set", () => {
  for (let failAt = 1; failAt <= 9; failAt++) {
    const replacements = transaction(), storage = store(replacements.map(e => [e.key, e.before]));
    let mutations = 0;
    const set = storage.setItem.bind(storage), remove = storage.removeItem.bind(storage);
    storage.setItem = (key,value) => { if (++mutations === failAt) throw new Error("QuotaExceededError"); set(key,value); };
    storage.removeItem = key => { if (++mutations === failAt) throw new Error("write-denied"); remove(key); };
    const result = applyArchiveTransaction(storage, replacements, {id:"quota",now:2000});
    if (storage.getItem(JOURNAL)) recoverArchiveTransaction(storage, {now:100000});
    const state = replacements.map(e => storage.getItem(e.key));
    assert(state.every((value,i) => value === replacements[i].before) || state.every((value,i) => value === replacements[i].after), String(failAt));
    if (result.persisted) assert(state.every((value,i) => value === replacements[i].after));
  }
});
test("successful setItem followed by a transient readback error is reconciled from the durable marker", () => {
  const replacements = transaction(), storage = store(replacements.map(e => [e.key,e.before]));
  const get = storage.getItem.bind(storage), set = storage.setItem.bind(storage);
  let failRead = false;
  storage.setItem = (key,value) => {set(key,value); if(key === JOURNAL && JSON.parse(value).phase === "committed") failRead = true;};
  storage.getItem = key => {if(failRead && key === JOURNAL){failRead=false;throw new Error("read-failed");}return get(key);};
  assert.equal(applyArchiveTransaction(storage,replacements,{id:"readback",now:2000}).persisted,true);
  for (const entry of replacements) assert.equal(storage.getItem(entry.key),entry.after);
});
test("corrupt/future journal and unapproved target keys are kept untouched", () => {
  for (const raw of ["{broken", JSON.stringify({version:100}), (() => {
    const replacements=transaction(); replacements[0].key="unrelated-user-data";
    return JSON.stringify({format:"yautja-archive-transaction",version:1,id:"bad",phase:"prepared",leaseUntil:0,replacements});
  })()]) {
    const storage=store([[JOURNAL,raw],["unrelated-user-data","keep"]]), before=snapshot(storage);
    assert.equal(recoverArchiveTransaction(storage).status,"blocked");
    assert.deepEqual(snapshot(storage),before);assert.equal(storage.writes.length,0);
  }
});
