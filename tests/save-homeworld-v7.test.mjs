import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { after, test } from "node:test";
import { build } from "vite";

const output = await mkdtemp(join(tmpdir(), "yautja-homeworld-save-"));
after(() => rm(output, { recursive: true, force: true }));
await build({ configFile: false, logLevel: "silent", publicDir: false, build: {
  outDir: output, ssr: resolve("app/game/save.ts"),
  rollupOptions: { output: { entryFileNames: "save.mjs" } },
}});
const { defaultSave, normalizeSave, writeSaveWithStatus, loadSave, SAVE_VERSION } =
  await import(pathToFileURL(join(output, "save.mjs")).href);

const completed = {
  version: 1, visitedDistrictIds: ["port", "memory", "undercity", "citadel"],
  evidenceIds: ["suspect-trophy", "memory-register", "undercity-testimony"],
  greetedNpcIds: ["dock-officer"], witnessChoice: "protect",
  audienceOutcome: "protected-witness",
  relations: { "exile-network": 3, "throne-court": -1 },
};
function memoryStorage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
test("v6 campaign migrates without inventing a city investigation or spending honor", () => {
  const legacy = defaultSave("2026-08-31T12:00:00.000Z");
  legacy.version = 6; delete legacy.homeworld; delete legacy.justice;
  legacy.profile.honor = 1250; legacy.profile.clanMarks = 257;
  const migrated = normalizeSave(legacy);
  assert.equal(migrated.version, SAVE_VERSION);
  assert.equal(migrated.createdAt, legacy.createdAt);
  assert.equal(migrated.profile.honor, 1250);
  assert.equal(migrated.profile.clanMarks, 257);
  assert.deepEqual(migrated.missionProgress, legacy.missionProgress);
  assert.deepEqual(migrated.inventory, legacy.inventory);
  assert.deepEqual(migrated.homeworld.evidenceIds, []);
  assert.equal(migrated.homeworld.audienceOutcome, null);
  assert.equal(migrated.justice.declaration, "recognized");
  assert.deepEqual(migrated.justice.warrants, []);
});
test("city evidence and irreversible first choice survive durable write and reload", () => {
  const storage = memoryStorage();
  const save = defaultSave("2026-08-31T12:00:00.000Z");
  save.homeworld = completed;
  const result = writeSaveWithStatus(save, storage, "city");
  assert.equal(result.persisted, true);
  const loaded = loadSave(storage, "city");
  assert.deepEqual(loaded.homeworld, result.save.homeworld);
  assert.equal(loaded.homeworld.audienceOutcome, "protected-witness");
  assert.equal(loaded.homeworld.relations["exile-network"], 3);
});
test("a truncated or invented city dossier cannot grant an audience", () => {
  const save = defaultSave();
  save.homeworld = { ...completed, evidenceIds: ["undercity-testimony"], relations: { "exile-network": Infinity } };
  const loaded = normalizeSave(save);
  assert.deepEqual(loaded.homeworld.evidenceIds, []);
  assert.equal(loaded.homeworld.witnessChoice, null);
  assert.equal(loaded.homeworld.audienceOutcome, null);
  assert.equal(loaded.homeworld.relations["exile-network"], 0);
});
test("failed city storage keeps the last durable campaign untouched", () => {
  const storage = memoryStorage();
  const saved = writeSaveWithStatus(defaultSave(), storage, "city");
  const before = storage.getItem("city");
  const failedStorage = { ...storage, setItem() { throw new DOMException("Full", "QuotaExceededError"); } };
  const result = writeSaveWithStatus({ ...saved.save, homeworld: completed }, failedStorage, "city");
  assert.equal(result.persisted, false);
  assert.equal(storage.getItem("city"), before);
  assert.equal(loadSave(storage, "city").homeworld.audienceOutcome, null);
});
test("a newer campaign writer wins over a stale city choice", () => {
  const storage = memoryStorage();
  const initial = writeSaveWithStatus(defaultSave(), storage, "city").save;
  const newer = { ...initial, updatedAt: "2099-01-01T00:00:00.000Z" };
  storage.setItem("city", JSON.stringify(newer));
  const result = writeSaveWithStatus({ ...initial, homeworld: completed }, storage, "city");
  assert.equal(result.persisted, false);
  assert.equal(result.failure, "save-conflict");
  assert.equal(loadSave(storage, "city").homeworld.audienceOutcome, null);
});

// Justice survives the same campaign serialization and never consumes equipment.
const justiceOutput = await build({ configFile: false, logLevel: "silent", publicDir: false, build: {
  outDir: output, emptyOutDir: false, ssr: resolve("app/game/systems/justice.ts"),
  rollupOptions: { output: { entryFileNames: "justice.mjs" } },
}});
void justiceOutput;
const { applyJusticeAction } = await import(pathToFileURL(join(output, "justice.mjs")).href);
test("mandates survive save reload and a lawful release preserves the inventory", () => {
  const storage = memoryStorage();
  let save = defaultSave();
  const equipment = structuredClone({ inventory: save.inventory, loadout: save.loadout, appearance: save.appearance, profile: save.profile });
  for (const action of [
    { type: "choose-origin", choice: "resale" },
    { type: "transmit-evidence", evidenceId: "cargo-recording", jurisdictionId: "homeworld" },
    { type: "identify", jurisdictionId: "homeworld", source: "transponder" },
    { type: "share-warrant", warrantId: "warrant-ritual-trophy-case", jurisdictionId: "clan-core" },
    { type: "defy-warrant" },
  ]) save.justice = applyJusticeAction(save.justice, action).progress;
  save = writeSaveWithStatus(save, storage, "justice").save;
  save = loadSave(storage, "justice");
  assert.equal(save.justice.declaration, "bad-blood");
  assert.deepEqual(save.justice.warrants[0].jurisdictionIds, ["homeworld", "clan-core"]);
  for (const action of [
    { type: "request-control", jurisdictionId: "clan-core" },
    { type: "answer-control", response: "surrender" },
    { type: "resolve-case", incidentId: "ritual-trophy-case", method: "restitution" },
  ]) save.justice = applyJusticeAction(save.justice, action).progress;
  const released = writeSaveWithStatus(save, storage, "justice");
  assert.equal(released.persisted, true);
  save = loadSave(storage, "justice");
  assert.equal(save.justice.detention, null);
  assert.equal(save.justice.warrants[0].status, "resolved");
  assert.equal(save.justice.declaration, "conditional");
  assert.deepEqual({ inventory: save.inventory, loadout: save.loadout, appearance: save.appearance, profile: save.profile }, equipment);
});

test("only a complete expedition report survives serialization, without duplicating a trophy", () => {
  const storage = memoryStorage();
  const initial = defaultSave();
  const proof = { expeditionId: "ash-marches", trueTrailInspected: true, falseTrailRejected: true,
    obstacleMoved: true, convoyRecovered: true, shortcutOpened: true, secretFound: true, ticks: 1327 };
  initial.homeworld.expeditions = { "ash-marches": proof };
  const saved = writeSaveWithStatus(initial, storage, "expedition");
  assert.equal(saved.persisted, true);
  assert.deepEqual(loadSave(storage, "expedition").homeworld.expeditions["ash-marches"], proof);
  assert.deepEqual(saved.save.trophies, initial.trophies);
  assert.deepEqual(saved.save.inventory, initial.inventory);
  assert.deepEqual(saved.save.profile, initial.profile);
  const broken = { ...saved.save, homeworld: { ...saved.save.homeworld,
    expeditions: { "ash-marches": { ...proof, convoyRecovered: false } } } };
  assert.equal(normalizeSave(broken).homeworld.expeditions["ash-marches"], null);
  assert.equal(normalizeSave({ ...initial, homeworld: { ...initial.homeworld, expeditions: null } }).homeworld.expeditions["ash-marches"], null);
});
