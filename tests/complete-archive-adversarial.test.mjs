import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const bundled = await build({
  entryPoints: [fileURLToPath(new URL("../app/game/systems/archiveTransaction.ts", import.meta.url))],
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
const { applyArchiveTransaction, recoverArchiveTransaction } = await import(
  "data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64")
);
const owner = "2026-09-08T12:00:00.000Z";
const journalKey = "yautja-long-hunt.archive-transfer";
const campaignKey = "yautja-long-hunt.save";
function fixture() {
  const keys = [
    "yautja-long-hunt.active-hunt", "yautja-long-hunt.ship-progression",
    "yautja-long-hunt.the-pit." + encodeURIComponent(owner),
    "yautja-long-hunt.the-pit.replay." + encodeURIComponent(owner),
    campaignKey + ".backup", campaignKey,
  ];
  const replacements = keys.map((key) => ({
    key,
    before: JSON.stringify({ createdAt: owner, content: "before:" + key }),
    after: JSON.stringify({ createdAt: owner, content: "after:" + key }),
  }));
  const values = new Map(replacements.map((entry) => [entry.key, entry.before]));
  const writes = [];
  const storage = {
    values, writes, afterSet: null,
    getItem: key => values.get(key) ?? null,
    setItem(key, value) { writes.push(["set", key]); values.set(key, value); storage.afterSet?.(key, value); },
    removeItem(key) { writes.push(["remove", key]); values.delete(key); },
  };
  return { storage, replacements };
}
function foreignJournal(replacements, phase = "committed") {
  return JSON.stringify({
    format: "yautja-archive-transaction", version: 1, id: "foreign-transfer",
    phase, leaseUntil: 0,
    replacements: replacements.map(entry => ({ ...entry, before: entry.before, after: entry.before })),
  });
}

test("a replaced committed journal cannot make the caller acknowledge another transaction", () => {
  const { storage, replacements } = fixture();
  const foreign = foreignJournal(replacements);
  storage.afterSet = (key, raw) => {
    if (key === journalKey && JSON.parse(raw).id === "own-transfer") storage.values.set(journalKey, foreign);
  };
  const result = applyArchiveTransaction(storage, replacements, { id: "own-transfer", now: 0 });
  assert.equal(result.persisted, false, "no intended archive bytes were applied");
  assert.equal(result.recovery.status, "blocked");
  assert.equal(storage.values.get(journalKey), foreign, "the foreign recovery marker must remain untouched");
  for (const entry of replacements) assert.equal(storage.values.get(entry.key), entry.before);
});

test("owned recovery refuses a different transaction even if its prepared lease expired", () => {
  for (const phase of ["prepared", "committed"]) {
    const { storage, replacements } = fixture();
    const foreign = foreignJournal(replacements, phase);
    storage.values.set(journalKey, foreign);
    const result = recoverArchiveTransaction(storage, { ownedTransactionId: "own-transfer", now: 100_000 });
    assert.equal(result.status, "blocked");
    assert.equal(storage.values.get(journalKey), foreign);
    assert.deepEqual(storage.writes, []);
  }
});

test("standalone startup recovery can still close a committed foreign document journal", () => {
  const { storage, replacements } = fixture();
  storage.values.set(journalKey, foreignJournal(replacements));
  assert.equal(recoverArchiveTransaction(storage, { now: 100_000 }).status, "committed");
  assert.equal(storage.values.has(journalKey), false);
});

test("a single post-cleanup read denial is reconciled without abandoning a durable committed import", () => {
  const { storage, replacements } = fixture();
  const getItem = storage.getItem;
  const removeItem = storage.removeItem;
  let failNextJournalRead = false;
  storage.removeItem = key => {
    removeItem(key);
    if (key === journalKey) failNextJournalRead = true;
  };
  storage.getItem = key => {
    if (key === journalKey && failNextJournalRead) {
      failNextJournalRead = false;
      throw new Error("one transient cleanup read denial");
    }
    return getItem(key);
  };
  const result = applyArchiveTransaction(storage, replacements, { id: "own-transfer", now: 0 });
  assert.equal(result.persisted, true, "the committed marker and exact after values were durable; a successful cleanup must not strand stale memory");
  assert.equal(result.recovery.status, "committed");
  assert.equal(storage.values.has(journalKey), false);
  for (const entry of replacements) assert.equal(storage.values.get(entry.key), entry.after);
});


test("repeated cleanup read denial stays explicitly blocked without changing the committed values", () => {
  const { storage, replacements } = fixture();
  const getItem = storage.getItem, removeItem = storage.removeItem;
  let remaining = 0;
  storage.removeItem = key => {
    removeItem(key);
    if (key === journalKey) remaining = 2;
  };
  storage.getItem = key => {
    if (key === journalKey && remaining > 0) { remaining -= 1; throw new Error("cleanup still unreadable"); }
    return getItem(key);
  };
  const result = applyArchiveTransaction(storage, replacements, { id: "own-transfer", now: 0 });
  assert.equal(result.persisted, false);
  assert.equal(result.recovery.status, "blocked", "caller must freeze and reload after a subsequent clean recovery");
  for (const entry of replacements) assert.equal(storage.values.get(entry.key), entry.after);
  assert.equal(recoverArchiveTransaction(storage).status, "none");
});

const archiveBundle = await build({
  stdin: { contents: [
    'export {createCompleteArchive} from "./app/game/systems/completeArchive";',
    'export {defaultSave} from "./app/game/save";',
    'export {createDefaultShipProgression, SHIP_PROGRESSION_STORAGE_KEY} from "./app/game/systems/progression";',
  ].join("\n"), resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
const archiveApi = await import("data:text/javascript;base64," + Buffer.from(archiveBundle.outputFiles[0].text).toString("base64"));
function shipExportFixture() {
  const { storage } = fixture();
  storage.values.clear();
  const campaign = archiveApi.defaultSave(owner);
  const ship = archiveApi.createDefaultShipProgression(campaign, owner);
  ship.training.targeting.attempts = 7;
  ship.training.targeting.bestScore = 80;
  storage.values.set(campaignKey, JSON.stringify(campaign));
  storage.values.set(archiveApi.SHIP_PROGRESSION_STORAGE_KEY, JSON.stringify(ship));
  return { storage, campaign, ship };
}
for (const [name, mutate] of [
  ["string schema version", state => { state.version = "3"; }],
  ["invalid legacy owner", state => { state.version = 2; state.ownerSaveCreatedAt = "not-a-date"; }],
  ["corrupt V3 training shape", state => { state.training = "corrupt"; }],
  ["corrupt nested V3 loadout", state => { state.loadoutPresets[0].loadout.weaponIds[0] = "unknown-weapon"; }],
  ["negative V3 training statistics", state => { state.training.targeting.bestScore = -10; }],
]) {
  test("full export rejects " + name + " instead of silently replacing the ship by defaults", () => {
    const { storage, campaign, ship } = shipExportFixture();
    mutate(ship);
    storage.values.set(archiveApi.SHIP_PROGRESSION_STORAGE_KEY, JSON.stringify(ship));
    const before = [...storage.values];
    assert.throws(() => archiveApi.createCompleteArchive(campaign, storage, owner));
    assert.deepEqual([...storage.values], before);
    assert.deepEqual(storage.writes, []);
  });
}
test("genuine ownerless V1/V2 ship progress remains exportable and is not rebound in storage", () => {
  for (const version of [1, 2]) {
    const { storage, campaign, ship } = shipExportFixture();
    ship.version = version;
    delete ship.ownerSaveCreatedAt;
    storage.values.set(archiveApi.SHIP_PROGRESSION_STORAGE_KEY, JSON.stringify(ship));
    const before = [...storage.values];
    const result = archiveApi.createCompleteArchive(campaign, storage, owner);
    assert.equal(result.archive.attachments.shipProgression.training.targeting.attempts, 7);
    assert.equal(result.archive.attachments.shipProgression.training.targeting.bestScore, 80);
    assert.deepEqual([...storage.values], before);
    assert.deepEqual(storage.writes, []);
  }
});
