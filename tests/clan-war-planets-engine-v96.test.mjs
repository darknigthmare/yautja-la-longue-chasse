import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({ stdin: { contents: "export * from './app/game/systems/clanWarV85'; export * from './app/game/systems/clanWarSessionV85'; export * from './app/game/systems/clanWarPlanetsV96'; export * from './app/game/systems/clanWarCanyonV85'; export * from './app/game/systems/clanWarFenceV94';", resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const lock = async operation => ({ acquired: true, value: await operation() });
function disk(entries = []) {
  const data = new Map(entries), reads = [], writes = [];
  return { data, reads, writes, full: false,
    getItem(key) { reads.push(key); return data.get(key) ?? null; },
    setItem(key, value) { if (this.full) throw Error("Quota exceeded"); writes.push([key, value]); data.set(key, value); },
  };
}
async function mount(storage, planetId, fence = null, gate = lock) {
  const session = api.createWarSessionV85(() => storage, gate, fence, { planetId });
  session.subscribe(() => {}); await session.whenSettled(); return session;
}
function fences() {
  const data = new Map(); let sequence = 0;
  return { data, port: {
    async read(key) { return structuredClone(data.get(key) ?? null); },
    async reserve(key, expected, before, after) {
      if (JSON.stringify(data.get(key) ?? null) !== JSON.stringify(expected)) throw new api.WarFenceErrorV94("conflict");
      const next = { version: 1, token: String(++sequence), before, after, phase: "intent" };
      data.set(key, next); return structuredClone(next);
    },
    async confirm(key, expected) {
      if (JSON.stringify(data.get(key) ?? null) !== JSON.stringify(expected)) throw new api.WarFenceErrorV94("conflict");
      const next = { ...expected, phase: "confirmed" }; data.set(key, next); return structuredClone(next);
    },
  } };
}

test("Korthas keeps the original simulation bytes and legacy archive key", () => {
  const state = api.createWarSimulationV85();
  assert.equal(Object.hasOwn(state, "planetId"), false);
  assert.equal(createHash("sha256").update(JSON.stringify(state)).digest("hex"), "4deef449d389e1290c68fcb22dba2ba1c5b07c9ca99242e05d44c134b6c7b5b3");
  assert.equal(api.warPlanetStorageKeyV96(), api.WAR_STORAGE_KEY_V85);
  assert.deepEqual(api.createWarSimulationV85(undefined, "korthas"), state);
  assert.equal(api.createWarSimulationV85(123).seed, 123);
});

for (const planet of api.WAR_PLANETS_V96) {
  test(`${planet.name}: a real local road accepts reconnaissance, resolves it and reloads independently`, async () => {
    const state = api.createWarSimulationV85(undefined, planet.id);
    assert.equal(state.planetId ?? "korthas", planet.id);
    assert.equal(state.seed, planet.id === "korthas" ? 8507 : planet.seed);
    assert.deepEqual(api.warTerritoriesForSimulationV96(state), planet.definitions);
    const actor = state.combatants.find(item => item.factionId === "CON-F01" && api.warTerritoryForSimulationV96(state, item.territoryId)?.neighbors.length);
    assert.ok(actor, "the initial deployment reaches a real road");
    const origin = api.warTerritoryForSimulationV96(state, actor.territoryId), targetId = origin.neighbors[0];
    const update = api.queueWarOrderV85(state, { kind: "recon", fromId: origin.id, targetId, combatantIds: [actor.id], cargo: { s: 0, m: 0, i: 0 } });
    assert.equal(update.accepted, true, update.message);
    const advanced = api.advanceWarTurnV85(update.state);
    assert.equal(advanced.accepted, true, advanced.message);
    assert.equal(advanced.state.turn, 2);
    assert.equal(advanced.state.observations.some(item => item.territoryId === targetId && item.turn === 1 && item.sourceId === actor.id), true);
    assert.equal(advanced.state.appliedResultIds.includes(update.state.orders[0].id), true);
    assert.deepEqual(api.readWarSimulationV85(advanced.state), advanced.state);
    const storage = disk(), session = await mount(storage, planet.id);
    session.setSimulation(advanced.state); await session.whenSettled();
    assert.equal(session.getSnapshot().persistedWar, true);
    assert.deepEqual(storage.writes.map(([key]) => key), [api.warPlanetStorageKeyV96(planet.id)]);
    const reopened = await mount(storage, planet.id);
    assert.deepEqual(reopened.getSnapshot().simulation, advanced.state);
    const corridor = api.warObjectiveCorridorV96(state);
    assert.equal(corridor[0], "CON-T01"); assert.equal(corridor.at(-1), "CON-T25");
    for (let index = 1; index < corridor.length; index++) assert.ok(api.warTerritoryForSimulationV96(state, corridor[index - 1]).neighbors.includes(corridor[index]));
  });
}

test("the thirty independent archive keys round-trip to their exact planet IDs", () => {
  assert.equal(api.WAR_PLANETS_V96.length, 30);
  assert.equal(api.WAR_PLANET_STORAGE_KEYS_V96.length, 30);
  assert.equal(new Set(api.WAR_PLANET_STORAGE_KEYS_V96).size, 30);
  for (const planet of api.WAR_PLANETS_V96) assert.equal(api.warPlanetIdForStorageKeyV96(api.warPlanetStorageKeyV96(planet.id)), planet.id);
  assert.equal(api.warPlanetIdForStorageKeyV96("yautja.clan-war.v96.planet.unknown.free.v1"), undefined);
  assert.throws(() => api.warPlanetStorageKeyV96("unknown"), RangeError);
  assert.throws(() => api.createWarSimulationV85(undefined, "unknown"), RangeError);
  assert.throws(() => api.createWarSessionV85(() => { throw Error("must not read"); }, lock, null, { planetId: "unknown" }), RangeError);
});

test("unknown planets, future versions and foreign territory entries fail closed", () => {
  const state = api.createWarSimulationV85(undefined, api.WAR_PLANETS_V96[1].id);
  for (const change of [{ planetId: "future-world" }, { planetId: null }, { planetId: "" }, { version: 2 }, { territories: { ...state.territories, "FOREIGN-T01": state.territories["CON-T01"] } }, { stocks: { ...state.stocks, "FOREIGN-T01": { s: 0, m: 0, i: 0 } } }]) assert.equal(api.readWarSimulationV85({ ...state, ...change }), null);
  assert.equal(api.advanceWarTurnV85({ ...state, planetId: "unknown" }).accepted, false);
  assert.equal(api.validWarPlanetArchiveRawV96(JSON.stringify(state), "korthas"), false);
  assert.equal(api.validWarPlanetArchiveRawV96(JSON.stringify(api.createWarSimulationV85()), state.planetId), false);
  assert.equal(api.validWarPlanetArchiveRawV96("{broken", state.planetId), false);
  assert.equal(api.validWarPlanetArchiveRawV96(JSON.stringify(state), state.planetId), true);
});

test("an order saved with a road belonging to another graph is refused", () => {
  const first = api.WAR_PLANETS_V96[0];
  const planet = api.WAR_PLANETS_V96.find(item => first.definitions.some(origin => origin.neighbors.some(id => !item.definitions.find(territory => territory.id === origin.id).neighbors.includes(id))));
  assert.ok(planet, "planetary roads must differ");
  const state = api.createWarSimulationV85(undefined, planet.id);
  const origin = first.definitions.find(item => item.neighbors.some(id => !api.warTerritoryForSimulationV96(state, item.id).neighbors.includes(id)));
  const targetId = origin.neighbors.find(id => !api.warTerritoryForSimulationV96(state, origin.id).neighbors.includes(id));
  state.territories[origin.id].controller = "CON-F01";
  const actor = state.combatants.find(item => item.factionId === "CON-F01"); actor.territoryId = origin.id;
  const order = { id: "foreign-road", kind: "recon", fromId: origin.id, targetId, combatantIds: [actor.id], cargo: { s: 0, m: 0, i: 0 }, factionId: "CON-F01", mode: "auto" };
  assert.match(api.warOrderIssueV85(state, order), /route voisine/);
  assert.equal(api.readWarSimulationV85({ ...state, orders: [order] }), null);
});

test("switching planets preserves every prior archive and never touches shared canyon/composition", async () => {
  const legacy = `  ${JSON.stringify({ ...api.createWarSimulationV85(), turn: 7 })}\n`;
  const canyon = "{future-canyon-byte-for-byte}", composition = '{"version":999,"private":"formation"}';
  const storage = disk([[api.WAR_STORAGE_KEY_V85, legacy], [api.CANYON_STORAGE_KEY_V85, canyon], [api.COMPOSITION_STORAGE_KEY_V85, composition]]);
  for (const [index, planet] of api.WAR_PLANETS_V96.slice(1).entries()) {
    const session = await mount(storage, planet.id);
    assert.equal(session.getSnapshot().writableCanyon, false); assert.equal(session.getSnapshot().writableComposition, false);
    session.setCanyon(api.createCanyonV85("must-not-write-shared")); session.setSelection({ "RTS-U01": 12 }); session.unlockCanyonAfterExplicitReset();
    session.setSimulation(current => ({ ...current, turn: index + 2 })); await session.whenSettled();
  }
  assert.equal(storage.data.get(api.WAR_STORAGE_KEY_V85), legacy);
  assert.equal(storage.data.get(api.CANYON_STORAGE_KEY_V85), canyon);
  assert.equal(storage.data.get(api.COMPOSITION_STORAGE_KEY_V85), composition);
  assert.equal(storage.reads.includes(api.CANYON_STORAGE_KEY_V85), false); assert.equal(storage.reads.includes(api.COMPOSITION_STORAGE_KEY_V85), false);
  for (const [index, planet] of api.WAR_PLANETS_V96.slice(1).entries()) assert.equal((await mount(storage, planet.id)).getSnapshot().simulation.turn, index + 2);
  assert.equal(storage.writes.length, 29);
});

test("foreign planet hydration and outgoing updates preserve both memory and exact disk bytes", async () => {
  const [first, second] = api.WAR_PLANETS_V96.slice(1, 3), foreign = api.createWarSimulationV85(undefined, second.id);
  const raw = JSON.stringify(foreign), key = api.warPlanetStorageKeyV96(first.id), storage = disk([[key, raw]]), session = await mount(storage, first.id);
  assert.equal(session.getSnapshot().writableWar, false);
  assert.equal(session.getSnapshot().simulation.planetId, first.id);
  const before = session.getSnapshot().simulation;
  session.setSimulation(foreign); session.retryPersistence(); await session.whenSettled();
  assert.equal(session.getSnapshot().simulation, before); assert.equal(storage.data.get(key), raw); assert.equal(storage.writes.length, 0);
  assert.match(session.getSnapshot().storageMessage, /invalide/);
});

test("new planet quota failures remain in memory and retry the newest state without reset", async () => {
  const planet = api.WAR_PLANETS_V96[1], key = api.warPlanetStorageKeyV96(planet.id), original = JSON.stringify(api.createWarSimulationV85(undefined, planet.id)), storage = disk([[key, original]]);
  const session = await mount(storage, planet.id); storage.full = true;
  session.setSimulation(current => ({ ...current, turn: 2 })); await session.whenSettled();
  assert.equal(storage.data.get(key), original); assert.equal(session.getSnapshot().persistedWar, false); assert.equal(session.getSnapshot().canRetryPersistence, true);
  session.setSimulation(current => ({ ...current, turn: 3 })); storage.full = false; session.retryPersistence(); await session.whenSettled();
  assert.equal(session.getSnapshot().persistedWar, true); assert.equal(JSON.parse(storage.data.get(key)).turn, 3);
});

test("new planet fence ports reject a stale writer while another planet remains writable", async () => {
  const [first, second] = api.WAR_PLANETS_V96.slice(1, 3), storage = disk(), fence = fences();
  const one = await mount(storage, first.id, fence.port), stale = await mount(storage, first.id, fence.port), other = await mount(storage, second.id, fence.port);
  one.setSimulation(current => ({ ...current, turn: 2 })); await one.whenSettled();
  stale.setSimulation(current => ({ ...current, turn: 3 })); other.setSimulation(current => ({ ...current, turn: 4 })); await Promise.all([stale.whenSettled(), other.whenSettled()]);
  assert.equal(one.getSnapshot().persistedWar, true); assert.equal(stale.getSnapshot().persistedWar, false); assert.match(stale.getSnapshot().storageMessage, /autre session/);
  assert.equal(other.getSnapshot().persistedWar, true); assert.equal(JSON.parse(storage.data.get(api.warPlanetStorageKeyV96(first.id))).turn, 2); assert.equal(JSON.parse(storage.data.get(api.warPlanetStorageKeyV96(second.id))).turn, 4);
  assert.equal(storage.writes.length, 2);
});

test("new planet fence port recovers and explicitly repairs an interrupted mirror intent", async () => {
  const planet = api.WAR_PLANETS_V96[2], key = api.warPlanetStorageKeyV96(planet.id), storage = disk(), fence = fences(), session = await mount(storage, planet.id, fence.port);
  const write = storage.setItem; storage.setItem = () => {};
  session.setSimulation(current => ({ ...current, turn: 5 })); await session.whenSettled();
  assert.equal(fence.data.get(key).phase, "intent"); assert.equal(session.getSnapshot().persistedWar, false);
  storage.setItem = write;
  const reopened = await mount(storage, planet.id, fence.port); assert.equal(reopened.getSnapshot().simulation.turn, 5); assert.equal(reopened.getSnapshot().persistedWar, false);
  reopened.retryPersistence(); await reopened.whenSettled();
  assert.equal(reopened.getSnapshot().persistedWar, true); assert.equal(JSON.parse(storage.data.get(key)).turn, 5); assert.equal(fence.data.get(key).phase, "confirmed"); assert.equal(storage.writes.length, 1);
});

test("native fence adapter accepts only known planet keys before opening IndexedDB", async () => {
  let opens = 0;
  const port = api.createWarFencePortV94({ open() { opens++; throw Error("Denied"); } }, 10);
  for (const key of api.WAR_PLANET_STORAGE_KEYS_V96) await assert.rejects(port.read(key), error => error.reason === "unavailable");
  assert.equal(opens, 30);
  for (const key of ["yautja.clan-war.v96.planet.unknown.free.v1", "yautja-long-hunt.save", "yautja.clan-war.v96.planet.../korthas.free.v1"]) await assert.rejects(port.read(key), error => error.reason === "incompatible");
  assert.equal(opens, 30);
});

test("a new planet supports a complete logistics, assault, occupation and durable reload sequence", async () => {
  const planet = api.WAR_PLANETS_V96.find(item => item.id !== "korthas" && item.definitions.find(territory => territory.id === "CON-T02").neighbors.includes("CON-T01") && item.definitions.find(territory => territory.id === "CON-T01").neighbors.some(id => item.definitions.find(territory => territory.id === id).initialController === "CON-F02"));
  assert.ok(planet);
  let state = api.createWarSimulationV85(undefined, planet.id);
  const targetId = api.warTerritoryForSimulationV96(state, "CON-T01").neighbors.find(id => state.territories[id].controller === "CON-F02");
  const actorIds = state.combatants.filter(actor => actor.factionId === "CON-F01" && actor.territoryId === "CON-T02" && !actor.garrison).slice(0, 8).map(actor => actor.id);
  const convoy = api.queueWarOrderV85(state, { kind: "logistics", fromId: "CON-T02", targetId: "CON-T01", combatantIds: actorIds, cargo: { s: 8, m: 3, i: 0 } });
  assert.equal(convoy.accepted, true, convoy.message);
  state = api.advanceWarTurnV85(convoy.state).state;
  assert.ok(actorIds.every(id => state.combatants.find(actor => actor.id === id).territoryId === "CON-T01"));
  const assault = api.queueWarOrderV85(state, { kind: "attack", fromId: "CON-T01", targetId, combatantIds: actorIds, cargo: { s: 0, m: 0, i: 0 } });
  assert.equal(assault.accepted, true, assault.message);
  state = api.advanceWarTurnV85(assault.state).state;
  assert.equal(state.territories[targetId].controller, "CON-F01");
  assert.ok(api.warGarrisonV85(state, targetId).length > 0);
  assert.ok(api.warSuppliedV85(state).has(targetId));
  assert.ok(state.reports.some(report => report.text.includes(`${targetId} : CON-F01 prend le contrôle`)));
  const storage = disk(), session = await mount(storage, planet.id);
  session.setSimulation(state); await session.whenSettled();
  const reopened = await mount(storage, planet.id);
  assert.equal(reopened.getSnapshot().simulation.territories[targetId].controller, "CON-F01");
  assert.equal(reopened.getSnapshot().persistedWar, true);
  assert.equal(storage.data.has(api.WAR_STORAGE_KEY_V85), false);
});

test("supply follows the selected planet's roads rather than Korthas adjacency", () => {
  const korthas = api.WAR_PLANETS_V96[0], originalRoads = korthas.definitions.find(territory => territory.id === "CON-T01").neighbors;
  const planet = api.WAR_PLANETS_V96.find(item => item.id !== "korthas" && originalRoads.some(id => !item.definitions.find(territory => territory.id === "CON-T01").neighbors.includes(id)));
  assert.ok(planet);
  const targetId = originalRoads.find(id => !planet.definitions.find(territory => territory.id === "CON-T01").neighbors.includes(id));
  const isolate = planetId => {
    const state = api.createWarSimulationV85(undefined, planetId);
    for (const [id, territory] of Object.entries(state.territories)) territory.controller = ["CON-T01", targetId].includes(id) ? "CON-F01" : "CON-F02";
    return state;
  };
  assert.deepEqual([...api.warSuppliedV85(isolate("korthas"))].sort(), ["CON-T01", targetId].sort());
  assert.deepEqual([...api.warSuppliedV85(isolate(planet.id))], ["CON-T01"]);
});

// A late-game objective fixture uses the original 24 people and six garrisons;
// it does not invent recruits to make the 36-site domination objective pass.
function occupiedPlanet(planetId) {
  const state = api.createWarSimulationV85(undefined, planetId), definitions = api.warTerritoriesForSimulationV96(state);
  const regions = [...new Set(definitions.map(territory => territory.region))];
  for (const definition of definitions) {
    state.territories[definition.id] = { controller: "CON-F01", installationIntact: true, transitUntilTurn: null };
    state.stocks[definition.id] = { s: 100, m: 10, i: 10 };
  }
  const people = state.combatants.filter(actor => actor.factionId === "CON-F01");
  assert.equal(people.length, 24);
  people.forEach((actor, index) => {
    const regionIndex = index % regions.length, places = definitions.filter(territory => territory.region === regions[regionIndex]);
    actor.territoryId = places[Math.floor(index / regions.length)].id;
    actor.garrison = index < regions.length;
  });
  return state;
}
function resolveTwice(state) {
  const first = api.advanceWarTurnV85(state); assert.equal(first.accepted, true);
  const second = api.advanceWarTurnV85(first.state); assert.equal(second.accepted, true);
  return [first.state, second.state];
}

test("all thirty theatres can complete domination after two paid turns with only the original 24 people", () => {
  for (const planet of api.WAR_PLANETS_V96) {
    const state = occupiedPlanet(planet.id), originalPeople = state.combatants.filter(actor => actor.factionId === "CON-F01").map(actor => actor.id);
    assert.equal(api.warSuppliedV85(state).size, 36);
    assert.equal(state.combatants.filter(actor => actor.factionId === "CON-F01" && actor.garrison).length, 6);
    assert.ok(api.readWarSimulationV85(state));
    const [first, second] = resolveTwice(state);
    assert.equal(first.totalStability, 1, planet.name); assert.equal(first.completedObjectives.includes("CON-O01"), false);
    assert.equal(second.totalStability, 2, planet.name); assert.equal(second.completedObjectives.includes("CON-O01"), true);
    assert.deepEqual(second.combatants.filter(actor => actor.factionId === "CON-F01").map(actor => actor.id), originalPeople);
    assert.ok(api.readWarSimulationV85(second));
  }
});

test("one enemy-controlled zone prevents domination", () => {
  const state = occupiedPlanet(api.WAR_PLANETS_V96[1].id);
  state.territories["CON-T36"].controller = "CON-F02";
  for (const resolved of resolveTwice(state)) {
    assert.equal(resolved.totalStability, 0); assert.equal(resolved.completedObjectives.includes("CON-O01"), false);
  }
});

test("a broken supply origin prevents domination", () => {
  const state = occupiedPlanet(api.WAR_PLANETS_V96[1].id);
  state.territories["CON-T01"].installationIntact = false;
  assert.equal(api.warSuppliedV85(state).size, 0);
  for (const resolved of resolveTwice(state)) {
    assert.equal(resolved.totalStability, 0); assert.equal(resolved.completedObjectives.includes("CON-O01"), false);
  }
});

test("a damaged installation prevents domination even with all 36 supply links open", () => {
  const state = occupiedPlanet(api.WAR_PLANETS_V96[1].id);
  state.territories["CON-T36"].installationIntact = false;
  assert.equal(api.warSuppliedV85(state).size, 36);
  for (const resolved of resolveTwice(state)) {
    assert.equal(resolved.totalStability, 0); assert.equal(resolved.completedObjectives.includes("CON-O01"), false);
  }
});

test("a region without a fit garrison prevents domination", () => {
  const state = occupiedPlanet(api.WAR_PLANETS_V96[1].id), lastRegion = api.warTerritoriesForSimulationV96(state).at(-1).region;
  for (const actor of state.combatants.filter(actor => actor.factionId === "CON-F01" && api.warTerritoryForSimulationV96(state, actor.territoryId).region === lastRegion)) actor.garrison = false;
  assert.equal(api.warSuppliedV85(state).size, 36);
  for (const resolved of resolveTwice(state)) {
    assert.equal(resolved.totalStability, 0); assert.equal(resolved.completedObjectives.includes("CON-O01"), false);
  }
});

test("unpaid upkeep suspends the domination counter", () => {
  const state = occupiedPlanet(api.WAR_PLANETS_V96[1].id);
  for (const stock of Object.values(state.stocks)) stock.s = 0;
  const result = api.advanceWarTurnV85(state);
  assert.equal(result.accepted, true); assert.equal(result.state.totalStability, 0); assert.equal(result.state.completedObjectives.includes("CON-O01"), false);
  assert.ok(result.state.reports.some(report => report.text.includes("CON-F01 : entretien") && report.text.includes("non couvert")));
});

test("an old Korthas archive with the original 24 people can finish under the V96 balancing rule", async () => {
  const original = occupiedPlanet("korthas");
  assert.equal(Object.hasOwn(original, "planetId"), false);
  const raw = JSON.stringify(original), storage = disk([[api.WAR_STORAGE_KEY_V85, raw]]);
  const session = await mount(storage, "korthas");
  assert.equal(storage.writes.length, 0); assert.equal(storage.data.get(api.WAR_STORAGE_KEY_V85), raw);
  const [first, second] = resolveTwice(session.getSnapshot().simulation);
  assert.equal(first.totalStability, 1); assert.equal(first.completedObjectives.includes("CON-O01"), false);
  assert.equal(second.totalStability, 2); assert.equal(second.completedObjectives.includes("CON-O01"), true);
  session.setSimulation(second); await session.whenSettled();
  assert.equal(session.getSnapshot().persistedWar, true);
  assert.equal(Object.hasOwn(JSON.parse(storage.data.get(api.WAR_STORAGE_KEY_V85)), "planetId"), false);
  const reopened = await mount(storage, "korthas");
  assert.equal(reopened.getSnapshot().simulation.completedObjectives.includes("CON-O01"), true);
  assert.deepEqual(reopened.getSnapshot().simulation.combatants.filter(actor => actor.factionId === "CON-F01").map(actor => actor.id), original.combatants.filter(actor => actor.factionId === "CON-F01").map(actor => actor.id));
});
