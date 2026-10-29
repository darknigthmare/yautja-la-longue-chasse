import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const directory = await mkdtemp(join(tmpdir(), "planet-archive-validation-v103-"));
after(() => rm(directory, { recursive: true, force: true }));
const bundle = await build({
  stdin: { contents: `
    export * from "./app/game/systems/clanWarV85";
    export * from "./app/game/systems/clanWarSessionV85";
    export * from "./app/game/systems/clanWarPlanetGeneratorV102";
    export * from "./app/game/systems/clanWarPlanetGeneratorV103";
  `, resolveDir: fileURLToPath(new URL("../", import.meta.url)), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent",
});
const modulePath = join(directory, "archive.mjs");
await writeFile(modulePath, bundle.outputFiles[0].text);
const moduleUrl = pathToFileURL(modulePath).href;
const api = await import(moduleUrl);
const worlds = [
  "korthas",
  api.encodeWarPlanetV102(api.normalizeWarPlanetRecipeV102({ seed: 10217 })),
  api.encodeWarPlanetV103(api.normalizeWarPlanetRecipeV103({ seed: 10317, territoryCount: 18, regionCount: 3 })),
];
const lock = async operation => ({ acquired: true, value: await operation() });

function storage(key, raw) {
  const data = new Map([[key, raw]]), writes = [];
  return {
    data, writes,
    getItem: name => data.get(name) ?? null,
    setItem(name, value) { data.set(name, value); writes.push([name, value]); },
  };
}

function pendingRecon(planetId) {
  const state = api.createWarSimulationV85(1703, planetId);
  const actor = state.combatants.find(person => person.factionId === "CON-F01" && !person.garrison);
  const origin = api.warTerritoryForSimulationV96(state, actor.territoryId);
  const queued = api.queueWarOrderV85(state, {
    kind: "recon", fromId: origin.id, targetId: origin.neighbors[0], combatantIds: [actor.id],
    cargo: { s: 0, m: 0, i: 0 },
  });
  assert.equal(queued.accepted, true, queued.message);
  return queued.state;
}

test("valid Korthas, V102 and V103 archives retain real pending orders through a cold reload", async () => {
  const cold = await import(`${moduleUrl}#cold-archive-validation`);
  for (const planetId of worlds) {
    const state = pendingRecon(planetId), raw = JSON.stringify(state, null, 2) + "\n";
    const key = api.warPlanetStorageKeyV96(planetId), disk = storage(key, raw);
    assert.deepEqual(cold.readWarSimulationV85(JSON.parse(raw)), state);
    assert.equal(cold.validWarPlanetArchiveRawV96(raw, planetId), true);
    const session = cold.createWarSessionV85(() => disk, lock, null, { planetId });
    const unsubscribe = session.subscribe(() => {});
    await session.whenSettled();
    assert.deepEqual(session.getSnapshot().simulation, state);
    assert.equal(session.getSnapshot().persistedWar, true);
    assert.equal(session.getSnapshot().writableWar, true);
    assert.equal(disk.data.get(key), raw);
    assert.deepEqual(disk.writes, []);
    const advanced = cold.advanceWarTurnV85(session.getSnapshot().simulation);
    assert.equal(advanced.accepted, true, advanced.message);
    assert.equal(advanced.state.turn, state.turn + 1);
    assert(advanced.state.observations.some(observation => observation.sourceId === state.orders[0].combatantIds[0]));
    session.setSimulation(advanced.state);
    await session.whenSettled();
    assert.equal(session.getSnapshot().persistedWar, true);
    assert.deepEqual(api.readWarSimulationV85(JSON.parse(disk.data.get(key))), advanced.state);
    assert.deepEqual(disk.writes.map(([name]) => name), [key]);
    unsubscribe();
  }
});

test("strict identities preserve legacy optional fields, zero markers and the V2 empty-convoy schema", () => {
  for (const planetId of worlds) {
    const state = api.createWarSimulationV85(1703, planetId);
    delete state.stableRegionId;
    delete state.heldStocks;
    if (planetId === "korthas") delete state.planetId;
    state.combatants[0].trainingUntilTurn = 0;
    state.territories[state.combatants[0].territoryId].transitUntilTurn = 0;
    const raw = JSON.stringify(state), loaded = api.readWarSimulationV85(JSON.parse(raw));
    assert(loaded);
    assert.deepEqual(loaded, { ...state, stableRegionId: null, heldStocks: [] });
    assert.equal(api.validWarPlanetArchiveRawV96(raw, planetId), true);
    const convoy = { ...state, version: 2, convoyRouteV105: null };
    assert.deepEqual(api.readWarSimulationV85(convoy), { ...convoy, stableRegionId: null, heldStocks: [] });
    assert.equal(api.readWarSimulationV85({ ...state, version: 2 }), null);
    assert.equal(api.readWarSimulationV85({ ...state, convoyRouteV105: null }), null);
  }
});

const malformed = [
  ["version object with a noncallable toString", state => { state.version = { toString: "1" }; }],
  ["combatant status array", state => { state.combatants[0].status = [state.combatants[0].status]; }],
  ["combatant territory array", state => { state.combatants[0].territoryId = [state.combatants[0].territoryId]; }],
  ["status object with a noncallable toString", state => { state.combatants[0].status = { toString: "fit" }; }],
  ["completed objective array", state => { state.completedObjectives = [["CON-O01"]]; }],
  ["observation territory array", state => { state.observations.push({
    sourceId: state.combatants[0].id, territoryId: [state.combatants[0].territoryId], turn: state.turn, lower: 0, upper: 1,
  }); }],
  ["held stock territory array", state => { state.heldStocks.push({
    territoryId: [state.combatants[0].territoryId], owner: "CON-F01", budget: { s: 3, m: 2, i: 1 },
  }); }],
  ["order kind array", state => { state.orders[0].kind = [state.orders[0].kind]; }],
  ["order origin array", state => { state.orders[0].fromId = [state.orders[0].fromId]; }],
  ["order target array", state => { state.orders[0].targetId = [state.orders[0].targetId]; }],
];

for (const [label, mutate] of malformed) test(`archive validation refuses ${label} instead of coercing JSON`, () => {
  for (const planetId of worlds) {
    const state = pendingRecon(planetId);
    mutate(state);
    const raw = JSON.stringify(state), parsed = JSON.parse(raw);
    let result;
    assert.doesNotThrow(() => { result = api.readWarSimulationV85(parsed); }, `${planetId}: malformed data must be refused without throwing`);
    assert.equal(result === null, true, `${planetId}: ${label} is not a valid live-state value`);
    assert.equal(api.validWarPlanetArchiveRawV96(raw, planetId), false);
    assert.equal(JSON.stringify(parsed), raw, "validation must not rewrite the supplied archive");
  }
});

test("a damaged garrison archive stays protected instead of silently reloading without its guard", async () => {
  for (const planetId of worlds) for (const field of ["status", "territoryId"]) {
    const intact = pendingRecon(planetId), damaged = structuredClone(intact);
    const guard = damaged.combatants.find(actor => actor.factionId === "CON-F01" && actor.garrison);
    const territoryId = guard.territoryId;
    assert.equal(api.warGarrisonV85(intact, territoryId).length, 1);
    guard[field] = [guard[field]];
    const raw = JSON.stringify(damaged, null, 2) + "\n", key = api.warPlanetStorageKeyV96(planetId), disk = storage(key, raw);
    const session = api.createWarSessionV85(() => disk, lock, null, { planetId });
    const unsubscribe = session.subscribe(() => {});
    await session.whenSettled();
    assert.equal(session.getSnapshot().writableWar, false);
    assert.equal(session.getSnapshot().persistedWar, false);
    assert.match(session.getSnapshot().storageMessage, /incompatible ou illisible/);
    session.setSimulation(intact);
    await session.whenSettled();
    assert.equal(session.getSnapshot().persistedWar, false, "a valid in-memory exercise cannot implicitly replace the damaged archive");
    assert.equal(disk.data.get(key), raw);
    assert.deepEqual(disk.writes, []);
    unsubscribe();
  }
});

test("an invalid live update preserves the previous playable snapshot and its confirmed save", async () => {
  const planetId = worlds[2], intact = pendingRecon(planetId), raw = JSON.stringify(intact);
  const key = api.warPlanetStorageKeyV96(planetId), disk = storage(key, raw);
  const session = api.createWarSessionV85(() => disk, lock, null, { planetId });
  const unsubscribe = session.subscribe(() => {});
  await session.whenSettled();
  const previous = session.getSnapshot().simulation, invalid = structuredClone(previous);
  invalid.combatants[0].status = [invalid.combatants[0].status];
  session.setSimulation(invalid);
  await session.whenSettled();
  assert.equal(session.getSnapshot().simulation, previous);
  assert.equal(session.getSnapshot().persistedWar, true);
  assert.match(session.getSnapshot().storageMessage, /état invalide refusé/);
  assert.equal(disk.data.get(key), raw);
  assert.deepEqual(disk.writes, []);
  unsubscribe();
});
