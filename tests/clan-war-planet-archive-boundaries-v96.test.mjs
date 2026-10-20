import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const compiled = await build({
  stdin: { contents: `
    export * from "./app/game/systems/clanWarV85";
    export * from "./app/game/systems/clanWarPlanetsV96";
    export * from "./app/game/systems/campaignSlots";
    export * from "./app/game/systems/completeArchive";
    export * from "./app/game/systems/cloudArchiveV71";
    export * from "./app/game/systems/cloudArchiveRestoreV71";
    export { SAVE_STORAGE_KEY, parseSaveImport } from "./app/game/save";
  `, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const ACCOUNT = "c4fcb61c-644f-448a-8d89-b47bd9d90e9c";
const TRANSACTION = "f5b6377b-81e4-44a0-93b1-8dcb7c0e601f";
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { locks: { request: async (_name, _options, callback) => callback({}) } },
});

function storage() {
  const data = new Map(), writes = [];
  return {
    data, writes,
    get length() { return data.size; },
    key(index) { return [...data.keys()][index] ?? null; },
    getItem: key => data.get(key) ?? null,
    setItem(key, raw) { writes.push(key); data.set(key, raw); },
    removeItem(key) { writes.push(key); data.delete(key); },
  };
}

async function campaign(name) {
  const disk = storage();
  const created = await api.createCampaignSlot(1, name, disk);
  assert.equal(created.ok, true, created.message);
  const active = await api.activateCampaignCheckpoint(1, "auto-1", {
    expectedRevision: api.loadCampaignSlots(disk).slots[0].revision,
  }, disk);
  assert.equal(active.ok, true, active.message);
  return disk;
}

function seedPlanetArchives(disk) {
  assert.equal(api.WAR_PLANETS_V96.length, 30);
  const archives = new Map(api.WAR_PLANETS_V96.map((planet, index) => {
    const simulation = { ...api.createWarSimulationV85(index + 500, planet.id), turn: index + 2 };
    const raw = JSON.stringify(simulation, null, index % 2 ? 2 : 0) + "\n";
    assert.equal(api.validWarPlanetArchiveRawV96(raw, planet.id), true, planet.id);
    return [api.warPlanetStorageKeyV96(planet.id), raw];
  }));
  for (const [key, raw] of archives) disk.data.set(key, raw);
  disk.writes.length = 0;
  return archives;
}

function assertPlanetArchivesUntouched(disk, before) {
  for (const [key, raw] of before) assert.equal(disk.getItem(key), raw, key);
  assert.deepEqual(disk.writes.filter(key => before.has(key)), []);
}

test("campaign creation, switching, checkpoints and replacement preserve all thirty local planetary archives byte for byte", async () => {
  const disk = await campaign("Première chasse");
  const before = seedPlanetArchives(disk);
  // A future/unreadable free archive is protected too; campaign maintenance
  // must not repair, replace or erase an unrelated local planet.
  const protectedKey = api.warPlanetStorageKeyV96(api.WAR_PLANETS_V96[29].id);
  before.set(protectedKey, "{future planetary archive: preserve these original bytes}");
  disk.data.set(protectedKey, before.get(protectedKey));

  const second = await api.createCampaignSlot(2, "Deuxième chasse", disk);
  assert.equal(second.ok, true, second.message);
  const switched = await api.activateCampaignCheckpoint(2, "auto-1", {
    expectedRevision: api.loadCampaignSlots(disk).slots[1].revision,
  }, disk);
  assert.equal(switched.ok, true, switched.message);
  const checkpoint = await api.saveCampaignCheckpoint(2, {
    kind: "manual", index: 1, expectedRevision: api.loadCampaignSlots(disk).slots[1].revision,
  }, disk);
  assert.equal(checkpoint.ok, true, checkpoint.message);
  const first = api.loadCampaignSlots(disk).slots[0];
  const replaced = await api.replaceCampaignSlot(1, "Nouvelle chasse", {
    expectedRevision: first.revision, expectedOwnerCreatedAt: first.ownerCreatedAt,
  }, disk);
  assert.equal(replaced.ok, true, replaced.message);
  assert.equal(api.parseSaveImport(disk.getItem(api.SAVE_STORAGE_KEY)).save.profile.hunterName, "Nouvelle chasse");
  assertPlanetArchivesUntouched(disk, before);
});

test("a campaign integral import never transfers or overwrites the independent local planets", async () => {
  const source = await campaign("Chasse importée"), destination = await campaign("Chasse remplacée");
  const sourcePlanets = seedPlanetArchives(source), destinationPlanets = seedPlanetArchives(destination);
  const differingKey = api.warPlanetStorageKeyV96(api.WAR_PLANETS_V96[5].id);
  const localRaw = JSON.stringify({ ...JSON.parse(destinationPlanets.get(differingKey)), turn: 97 }, null, 2) + "\n";
  assert.notEqual(localRaw, sourcePlanets.get(differingKey));
  destination.data.set(differingKey, localRaw); destinationPlanets.set(differingKey, localRaw);
  const sourceSave = api.parseSaveImport(source.getItem(api.SAVE_STORAGE_KEY)).save;
  const exported = api.createCompleteArchive(sourceSave, source);
  const parsed = api.parseCompleteArchive(exported.serialized);
  assert(parsed.archive);
  const result = api.importCompleteArchive(api.prepareCompleteArchiveImport(parsed.archive, destination), destination);
  assert.equal(result.persisted, true, result.recovery.message);
  assert.equal(api.parseSaveImport(destination.getItem(api.SAVE_STORAGE_KEY)).save.profile.hunterName, "Chasse importée");
  assertPlanetArchivesUntouched(source, sourcePlanets);
  assertPlanetArchivesUntouched(destination, destinationPlanets);
});

test("account capture and restore preserve local planets and refuse injected planetary keys before a write", async () => {
  const source = await campaign("Compte distant"), destination = await campaign("Compte local");
  const sourcePlanets = seedPlanetArchives(source), destinationPlanets = seedPlanetArchives(destination);
  const captured = api.captureCloudArchiveV71(source);
  assert.equal(captured.entries.some(entry => sourcePlanets.has(entry.key)), false);
  for (const key of [...api.WAR_PLANET_STORAGE_KEYS_V96, "yautja.clan-war.v96.planet.unknown.free.v1"]) {
    assert.equal(api.isCloudArchiveStorageKeyV71(key), false, key);
    const injected = structuredClone(captured);
    injected.entries.push({ key, raw: sourcePlanets.get(key) ?? "{}" });
    assert.equal(api.parseCloudArchiveV71(JSON.stringify(injected)).archive, null, key);
    assert.throws(() => api.prepareCloudArchiveRestoreV71(destination, ACCOUNT, injected), /interdite/);
  }
  const plan = api.prepareCloudArchiveRestoreV71(destination, ACCOUNT, captured);
  const result = api.applyCloudArchiveRestoreV71(destination, plan, { transactionId: TRANSACTION, now: 0 });
  assert.equal(result.persisted, true, result.recovery.message);
  assert.equal(api.parseSaveImport(destination.getItem(api.SAVE_STORAGE_KEY)).save.profile.hunterName, "Compte distant");
  assertPlanetArchivesUntouched(source, sourcePlanets);
  assertPlanetArchivesUntouched(destination, destinationPlanets);
});
