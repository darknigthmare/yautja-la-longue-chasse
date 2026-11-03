import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  stdin: { contents: `
    export * from "./app/game/systems/clanWarPlanetGeneratorV102";
    export * from "./app/game/systems/clanWarGeneratedCatalogV102";
    export * from "./app/game/systems/clanWarPlanetsV96";
    export * from "./app/game/systems/clanWarV85";
    export * from "./app/game/systems/clanWarSessionV85";
    export * from "./app/game/systems/clanWarFenceV94";
    export * from "./app/game/systems/cloudArchiveV71";
  `, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent",
});
const bundleUrl = "data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64");
const api = await import(bundleUrl);
const lock = async operation => ({ acquired: true, value: await operation() });
const code = (seed = 10217, options = {}) => api.encodeWarPlanetV102(api.normalizeWarPlanetRecipeV102({ seed, ...options }));

function disk(entries = []) {
  const data = new Map(entries), reads = [], writes = [];
  return {
    data, reads, writes, full: false,
    get length() { return data.size; },
    key(index) { return [...data.keys()][index] ?? null; },
    getItem(key) { reads.push(key); return data.get(key) ?? null; },
    setItem(key, raw) { if (this.full) throw new Error("Quota exceeded"); writes.push([key, raw]); data.set(key, raw); },
    removeItem(key) { writes.push([key, null]); data.delete(key); },
  };
}

function fences() {
  const data = new Map();
  let sequence = 0;
  return { data, port: {
    async read(key) { return structuredClone(data.get(key) ?? null); },
    async reserve(key, expected, before, after) {
      if (JSON.stringify(data.get(key) ?? null) !== JSON.stringify(expected)) throw new api.WarFenceErrorV94("conflict");
      const next = { version: 1, token: String(++sequence), before, after, phase: "intent" };
      data.set(key, next); return structuredClone(next);
    },
    async confirm(key, expected) {
      if (JSON.stringify(data.get(key) ?? null) !== JSON.stringify(expected)) throw new api.WarFenceErrorV94("conflict");
      const next = { ...expected, phase: "confirmed" };
      data.set(key, next); return structuredClone(next);
    },
  } };
}

async function mount(storage, id, fence = null) {
  const session = api.createWarSessionV85(() => storage, lock, fence, { planetId: id });
  session.subscribe(() => {});
  await session.whenSettled();
  return session;
}

test("generated codes resolve outside the historical catalog and round-trip through storage keys", () => {
  const historical = JSON.stringify(api.WAR_PLANETS_V96);
  assert.equal(api.WAR_PLANETS_V96.length, 30);
  assert.equal(api.WAR_PLANET_STORAGE_KEYS_V96.length, 30);
  const id = code(), planet = api.warPlanetV96(id), key = api.warPlanetStorageKeyV96(id);
  assert.equal(planet.id, id);
  assert.equal(planet.procedural.recipe.seed, 10217);
  assert.equal(api.warPlanetIdForStorageKeyV96(key), id);
  assert.equal(api.WAR_PLANET_STORAGE_KEYS_V96.includes(key), false, "The fixed catalog remains the thirty historical worlds");
  assert.equal(api.warPlanetStorageKeyV96(), api.WAR_STORAGE_KEY_V85);
  assert.equal(JSON.stringify(api.WAR_PLANETS_V96), historical);
  for (const invalid of [id + "-extra", id.replace("v102", "v103"), id.toUpperCase(), "proc-v102-", "x".repeat(10_000)]) {
    assert.equal(api.warPlanetV96(invalid), undefined);
    assert.throws(() => api.warPlanetStorageKeyV96(invalid), RangeError);
    assert.equal(api.warPlanetIdForStorageKeyV96(`yautja.clan-war.v96.planet.${invalid}.free.v1`), undefined);
  }
});

for (const [index, landform] of ["supercontinent", "continents", "archipelago", "shattered"].entries()) {
  test(`${landform}: a generated front plays reconnaissance, advances and reloads its own graph`, async () => {
    const id = code(4102 + index, { landform }), planet = api.warPlanetV96(id);
    const state = api.createWarSimulationV85(undefined, id);
    assert.equal(state.planetId, id);
    assert.equal(state.seed, planet.seed);
    const actor = state.combatants.find(item => item.factionId === "CON-F01" && api.warTerritoryForSimulationV96(state, item.territoryId)?.neighbors.length);
    const origin = api.warTerritoryForSimulationV96(state, actor.territoryId), targetId = origin.neighbors[0];
    const queued = api.queueWarOrderV85(state, { kind: "recon", fromId: origin.id, targetId, combatantIds: [actor.id], cargo: { s: 0, m: 0, i: 0 } });
    assert.equal(queued.accepted, true, queued.message);
    const advanced = api.advanceWarTurnV85(queued.state);
    assert.equal(advanced.accepted, true, advanced.message);
    assert.equal(advanced.state.turn, 2);
    assert.ok(advanced.state.observations.some(item => item.territoryId === targetId && item.sourceId === actor.id));
    assert.deepEqual(api.readWarSimulationV85(advanced.state), advanced.state);
    const storage = disk(), fence = fences(), session = await mount(storage, id, fence.port);
    session.setSimulation(advanced.state);
    await session.whenSettled();
    assert.equal(session.getSnapshot().persistedWar, true);
    assert.deepEqual(storage.writes.map(([key]) => key), [api.warPlanetStorageKeyV96(id)]);
    assert.equal(fence.data.get(api.warPlanetStorageKeyV96(id)).phase, "confirmed");
    const reopened = await mount(storage, id, fence.port);
    assert.deepEqual(reopened.getSnapshot().simulation, advanced.state);
    assert.equal(reopened.getSnapshot().persistedWar, true);
    const corridor = api.warObjectiveCorridorV96(state);
    assert.equal(corridor[0], "CON-T01"); assert.equal(corridor.at(-1), "CON-T25");
    for (let i = 1; i < corridor.length; i++) assert.ok(api.warTerritoryForSimulationV96(state, corridor[i - 1]).neighbors.includes(corridor[i]));
  });
}

test("a fresh module reconstructs the saved generated world without catalog registration", async () => {
  const id = code(0xfedcba98, { landform: "shattered", surface: "acid" });
  const original = api.warPlanetV96(id);
  const serialized = JSON.stringify(api.createWarSimulationV85(undefined, id));
  const cold = await import(bundleUrl + "#cold-generated-world");
  assert.deepEqual(cold.warPlanetV96(id), original);
  assert.equal(cold.readWarSimulationV85(JSON.parse(serialized)).planetId, id);
  assert.equal(cold.WAR_PLANETS_V96.some(item => item.id === id), false);
});

test("generated fronts reject stale fenced writes while another seed remains independently writable", async () => {
  const first = code(1122), second = code(1123), storage = disk(), fence = fences();
  const live = await mount(storage, first, fence.port), stale = await mount(storage, first, fence.port), other = await mount(storage, second, fence.port);
  live.setSimulation(current => ({ ...current, turn: 2 }));
  await live.whenSettled();
  stale.setSimulation(current => ({ ...current, turn: 3 }));
  other.setSimulation(current => ({ ...current, turn: 4 }));
  await Promise.all([stale.whenSettled(), other.whenSettled()]);
  assert.equal(live.getSnapshot().persistedWar, true);
  assert.equal(stale.getSnapshot().persistedWar, false);
  assert.match(stale.getSnapshot().storageMessage, /autre session/);
  assert.equal(other.getSnapshot().persistedWar, true);
  assert.equal(JSON.parse(storage.getItem(api.warPlanetStorageKeyV96(first))).turn, 2);
  assert.equal(JSON.parse(storage.getItem(api.warPlanetStorageKeyV96(second))).turn, 4);
});

test("foreign or damaged generated archives preserve their original bytes and never hydrate another world", async () => {
  const first = code(3021), second = code(3022), foreign = api.createWarSimulationV85(undefined, second);
  for (const raw of [JSON.stringify(foreign), '{"version":999,"future":"preserve"}', "{truncated"]) {
    const key = api.warPlanetStorageKeyV96(first), storage = disk([[key, raw]]), session = await mount(storage, first);
    assert.equal(session.getSnapshot().simulation.planetId, first);
    assert.equal(session.getSnapshot().writableWar, false);
    assert.equal(session.getSnapshot().persistedWar, false);
    const previous = session.getSnapshot().simulation;
    session.setSimulation(foreign);
    await session.whenSettled();
    assert.equal(session.getSnapshot().simulation, previous);
    assert.equal(storage.getItem(key), raw);
    assert.equal(storage.writes.length, 0);
  }
  assert.equal(api.validWarPlanetArchiveRawV96(JSON.stringify(foreign), first), false);
  assert.equal(api.validWarPlanetArchiveRawV96(JSON.stringify(foreign), second), true);
});

test("a stored order cannot invent a route on the generated world", () => {
  const id = code(8675309, { landform: "archipelago" }), state = api.createWarSimulationV85(undefined, id);
  const origin = api.warTerritoryForSimulationV96(state, "CON-T01");
  const remote = api.warTerritoriesForSimulationV96(state).find(item => item.id !== origin.id && !origin.neighbors.includes(item.id));
  assert.ok(remote);
  const actor = state.combatants.find(item => item.factionId === "CON-F01" && item.territoryId === origin.id);
  const forged = { id: "forged-generated-route", kind: "recon", fromId: origin.id, targetId: remote.id, combatantIds: [actor.id], cargo: { s: 0, m: 0, i: 0 }, factionId: "CON-F01", mode: "auto" };
  assert.match(api.warOrderIssueV85(state, forged), /route voisine/);
  assert.equal(api.readWarSimulationV85({ ...state, orders: [forged] }), null);
});

test("the native fence validates canonical generated keys before opening IndexedDB", async () => {
  const id = code(55), key = api.warPlanetStorageKeyV96(id);
  let opens = 0;
  const port = api.createWarFencePortV94({ open() { opens++; throw new Error("Denied"); } }, 10);
  await assert.rejects(port.read(key), error => error.reason === "unavailable");
  assert.equal(opens, 1, "A real generated key reaches the native persistence adapter");
  for (const invalid of [key + ".backup", key.replace("v102", "v103"), key.replace("proc-v102-", "../proc-v102-"), api.GENERATED_WAR_CATALOG_KEY_V102, "yautja-long-hunt.save"]) {
    await assert.rejects(port.read(invalid), error => error.reason === "incompatible");
  }
  assert.equal(opens, 1);
});

test("the bounded catalog deduplicates recent codes without deleting evicted fronts", async () => {
  const id = code(0), key = api.warPlanetStorageKeyV96(id);
  const raw = `  ${JSON.stringify({ ...api.createWarSimulationV85(undefined, id), turn: 8 })}\n`;
  const storage = disk([[key, raw]]);
  for (let seed = 0; seed < 31; seed++) {
    const result = api.rememberGeneratedWarPlanetV102(storage, code(seed));
    assert.equal(result.persisted, true);
    assert.equal(result.ids[0], code(seed));
    assert.ok(result.ids.length <= api.MAX_GENERATED_WAR_CATALOG_V102);
  }
  const recent = api.rememberGeneratedWarPlanetV102(storage, code(30));
  assert.equal(recent.ids.length, 24);
  assert.equal(new Set(recent.ids).size, 24);
  assert.equal(recent.ids.includes(id), false);
  assert.deepEqual(api.readGeneratedWarCatalogV102(storage).ids, recent.ids);
  assert.equal(storage.getItem(key), raw);
  assert.ok(storage.writes.every(([written]) => written === api.GENERATED_WAR_CATALOG_KEY_V102));
  assert.equal((await mount(storage, id)).getSnapshot().simulation.turn, 8, "An evicted shortcut does not erase its independently recoverable front");
});

test("future, corrupt and oversized catalogs stay byte-for-byte intact while new codes remain in memory", () => {
  const first = code(9), second = code(10);
  for (const raw of ["{truncated", JSON.stringify({ version: 103, ids: [first] }), JSON.stringify({ version: 102, ids: ["not-a-world"] }), " ".repeat(16_385)]) {
    const storage = disk([[api.GENERATED_WAR_CATALOG_KEY_V102, raw]]);
    const read = api.readGeneratedWarCatalogV102(storage);
    assert.equal(read.persisted, false); assert.match(read.issue, /conservé sans modification/);
    const updated = api.rememberGeneratedWarPlanetV102(storage, second, [first]);
    assert.equal(updated.persisted, false); assert.deepEqual(updated.ids, [second, first]);
    assert.equal(storage.getItem(api.GENERATED_WAR_CATALOG_KEY_V102), raw);
    assert.equal(storage.writes.length, 0);
  }
});

test("catalog persistence requires confirmed bytes and keeps temporary worlds on quota or denial", () => {
  const id = code(700), previous = code(701), storage = disk();
  assert.equal(api.rememberGeneratedWarPlanetV102(storage, previous).persisted, true);
  const before = storage.getItem(api.GENERATED_WAR_CATALOG_KEY_V102);
  storage.full = true;
  const failed = api.rememberGeneratedWarPlanetV102(storage, id, [previous]);
  assert.equal(failed.persisted, false); assert.deepEqual(failed.ids, [id, previous]);
  assert.equal(storage.getItem(api.GENERATED_WAR_CATALOG_KEY_V102), before);
  storage.full = false;
  assert.equal(api.rememberGeneratedWarPlanetV102(storage, id, failed.ids).persisted, true);
  assert.equal(api.rememberGeneratedWarPlanetV102({ getItem: () => null, setItem() {} }, id).persisted, false);
  const denied = api.rememberGeneratedWarPlanetV102(null, id, [previous]);
  assert.equal(denied.persisted, false); assert.deepEqual(denied.ids, [id, previous]);
  const writtenThenThrow = disk();
  writtenThenThrow.setItem = (key, raw) => { writtenThenThrow.data.set(key, raw); throw new Error("Error after persistence"); };
  assert.equal(api.rememberGeneratedWarPlanetV102(writtenThenThrow, id).persisted, true, "Only the verified stored bytes decide whether persistence succeeded");
  const invalid = api.rememberGeneratedWarPlanetV102(storage, "future-world", [id]);
  assert.equal(invalid.persisted, false); assert.deepEqual(invalid.ids, [id]);
});

test("an observed concurrent catalog edit is preserved and asks for retry", () => {
  const original = JSON.stringify({ version: 102, ids: [code(1)] });
  const concurrent = JSON.stringify({ version: 102, ids: [code(2)] });
  let reads = 0, writes = 0;
  const result = api.rememberGeneratedWarPlanetV102({ getItem: () => ++reads === 1 ? original : concurrent, setItem: () => { writes++; } }, code(3));
  assert.equal(result.persisted, false);
  assert.match(result.issue, /autre session/);
  assert.equal(writes, 0);
});

test("campaign cloud capture excludes generated fronts and their catalog and refuses injected keys", () => {
  const id = code(9328), key = api.warPlanetStorageKeyV96(id);
  const storage = disk([[key, JSON.stringify(api.createWarSimulationV85(undefined, id))]]);
  api.rememberGeneratedWarPlanetV102(storage, id);
  const before = new Map(storage.data);
  storage.writes.length = 0;
  const captured = api.captureCloudArchiveV71(storage, "2026-10-22T12:00:00.000Z");
  assert.deepEqual(captured.entries, []);
  for (const injectedKey of [key, api.GENERATED_WAR_CATALOG_KEY_V102]) {
    assert.equal(api.isCloudArchiveStorageKeyV71(injectedKey), false);
    const injected = { ...captured, entries: [{ key: injectedKey, raw: storage.getItem(injectedKey) }] };
    const parsed = api.parseCloudArchiveV71(JSON.stringify(injected));
    assert.equal(parsed.archive, null); assert.match(parsed.error, /interdite/);
  }
  assert.deepEqual(storage.data, before);
  assert.equal(storage.writes.length, 0);
});
