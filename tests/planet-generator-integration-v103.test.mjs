import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({ stdin: { contents: `
  export * from "./app/game/systems/clanWarPlanetGeneratorV103";
  export * from "./app/game/systems/clanWarPlanetGeneratorV102";
  export * from "./app/game/systems/clanWarProceduralV103";
  export * from "./app/game/systems/clanWarPlanetsV96";
  export * from "./app/game/systems/clanWarV85";
  export * from "./app/game/systems/clanWarCommandV98";
  export * from "./app/game/systems/clanWarGeneratedCatalogV103";
  export * from "./app/game/systems/clanWarGeneratedCatalogV102";
  export * from "./app/game/systems/clanWarSessionV85";
  export * from "./app/game/systems/clanWarFenceV94";
`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const url = "data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64");
const api = await import(url);
const code = (options = {}) => api.encodeWarPlanetV103(api.normalizeWarPlanetRecipeV103({ seed: 103, ...options }));
const legacyCode = api.encodeWarPlanetV102(api.normalizeWarPlanetRecipeV102({ seed: 10217 }));
const sorted = ids => [...ids].sort();
const zero = () => ({ s: 0, m: 0, i: 0 });

function fixture(entries = []) {
  const data = new Map(entries), records = new Map(), writes = [];
  let sequence = 0;
  const storage = {
    full: false,
    getItem: key => data.get(key) ?? null,
    setItem(key, value) { if (this.full) throw new Error("Quota exceeded"); data.set(key, value); writes.push([key, value]); },
  };
  const fence = {
    async read(key) { return structuredClone(records.get(key) ?? null); },
    async reserve(key, expected, before, after) {
      if (JSON.stringify(records.get(key) ?? null) !== JSON.stringify(expected)) throw new api.WarFenceErrorV94("conflict");
      const record = { version: 1, token: String(++sequence), before, after, phase: "intent" };
      records.set(key, record); return structuredClone(record);
    },
    async confirm(key, expected) {
      if (JSON.stringify(records.get(key)) !== JSON.stringify(expected)) throw new api.WarFenceErrorV94("conflict");
      const record = { ...expected, phase: "confirmed" };
      records.set(key, record); return structuredClone(record);
    },
  };
  async function mount(id, target = storage) {
    const session = api.createWarSessionV85(() => target, async operation => ({ acquired: true, value: await operation() }), fence, { planetId: id });
    session.subscribe(() => {}); await session.whenSettled(); return session;
  }
  return { data, writes, records, storage, fence, mount };
}

test("version dispatch preserves exact V102 worlds and refuses altered, unknown or oversized codes", () => {
  const original = api.generatedWarPlanetV102(legacyCode);
  assert.equal(api.resolveProceduralWarPlanetV103(legacyCode), original);
  assert.equal(api.warPlanetV96(legacyCode), original);
  assert.equal(api.parseWarPlanetRecipeCodeV103(legacyCode).version, 102);
  assert.equal(api.encodeWarPlanetRecipeCodeV103(original.procedural.recipe), legacyCode);
  const id = code(), world = api.warPlanetV96(id);
  assert.equal(world.procedural.recipe.version, 103);
  assert.equal(api.warPlanetIdForStorageKeyV96(api.warPlanetStorageKeyV96(id)), id);
  for (const invalid of [id + "-extra", id.toUpperCase(), id.replace("v103", "v104"), legacyCode.replace("v102", "v103"), "x".repeat(10000)]) {
    assert.equal(api.parseWarPlanetRecipeCodeV103(invalid), null);
    assert.equal(api.warPlanetV96(invalid), undefined);
    assert.equal(api.warPlanetIdForStorageKeyV96(`yautja.clan-war.v96.planet.${invalid}.free.v1`), undefined);
  }
  assert.equal(api.validateWarPlanetRecipeAnyV103({ ...world.procedural.recipe, version: 104 }), null);
  assert.equal(api.WAR_PLANETS_V96.length, 30);
});

test("catalog summaries preserve identity without generating or evicting any full worlds", () => {
  for (const id of [legacyCode, code({ territoryCount: 96, regionCount: 12, landform: "shattered" })]) {
    const world = api.warPlanetV96(id), summary = api.describeProceduralWarPlanetV103(id);
    assert.equal(summary.name, world.name);
    assert.deepEqual(summary.surface, world.surface);
    assert.equal(summary.territoryCount, world.territories.length);
    assert.equal(summary.regionCount, world.regions.length);
    assert.equal(summary.version, world.procedural.recipe.version);
    for (let seed = 300; seed < 340; seed++) {
      const other = summary.version === 103 ? code({ seed, territoryCount: 96, regionCount: 12 })
        : api.encodeWarPlanetV102(api.normalizeWarPlanetRecipeV102({ seed }));
      assert(api.describeProceduralWarPlanetV103(other));
    }
    assert.equal(api.warPlanetV96(id), world, "Reading shortcut labels must not allocate worlds in the 24-entry geometry cache");
  }
});

test("all supported count pairs create valid, supplied armies and sufficient objective rosters", () => {
  for (const territoryCount of api.WAR_PLANET_TERRITORY_COUNTS_V103) for (const regionCount of api.WAR_PLANET_REGION_COUNTS_V103) {
    if (territoryCount < 3 * regionCount) continue;
    const id = code({ territoryCount, regionCount, seed: territoryCount * 103 + regionCount, regionBalance: "uneven" });
    const planet = api.warPlanetV96(id), state = api.createWarSimulationV85(undefined, id);
    assert.equal(Object.keys(state.territories).length, territoryCount);
    assert.equal(Object.keys(state.stocks).length, territoryCount);
    assert(state.combatants.length <= 300);
    assert.deepEqual(api.readWarSimulationV85(state), state, `${territoryCount}/${regionCount} must be reloadable`);
    for (const faction of ["CON-F01", "CON-F02"]) {
      const initial = planet.procedural.strategy.startingTerritoryIds[faction];
      assert.deepEqual(sorted(api.warSuppliedV85(state, faction)), sorted(initial));
      const actors = state.combatants.filter(actor => actor.factionId === faction);
      assert(actors.length >= Math.max(...planet.regions.map(region => region.territoryIds.length)) + 8);
      assert(actors.length >= planet.procedural.strategy.objectiveCorridor.length + 8);
      for (const actor of actors) assert.equal(state.territories[actor.territoryId].controller, faction);
      for (const key of ["s", "m", "i"]) assert(planet.definitions.filter(site => initial.includes(site.id)).some(site => site.income[key] > 0));
      assert(api.warBudgetV85(state, faction).s >= 12 * api.warUpkeepV85(state, faction));
      for (const site of initial) assert.equal(api.warGarrisonV85(state, site).length, 1);
      const headquarters = api.warHeadquartersV103(state, faction);
      assert(initial.includes(headquarters));
      const cut = structuredClone(state); cut.territories[headquarters].installationIntact = false;
      assert.equal(api.warSuppliedV85(cut, faction).size, 0);
    }
    const command = api.warCommandV98(state);
    assert.equal(command.regions.length, regionCount);
    assert.equal(command.corridorBaseLinked, true);
    assert.deepEqual(command.corridor.map(site => site.id), planet.procedural.strategy.objectiveCorridor);
  }
});

for (const [territoryCount, regionCount, landform] of [[18, 3, "supercontinent"], [24, 8, "shattered"], [48, 8, "continents"], [96, 12, "archipelago"]]) {
  test(`${territoryCount}/${regionCount} ${landform}: real orders, fenced save and cold reload retain the generated graph`, async () => {
    const id = code({ territoryCount, regionCount, landform }), state = api.createWarSimulationV85(undefined, id);
    const actor = state.combatants.find(person => person.factionId === "CON-F01" && !person.garrison);
    const origin = api.warTerritoryForSimulationV96(state, actor.territoryId), targetId = origin.neighbors[0];
    const queued = api.queueWarOrderV85(state, { kind: "recon", fromId: origin.id, targetId, combatantIds: [actor.id], cargo: zero() });
    assert.equal(queued.accepted, true, queued.message);
    const advanced = api.advanceWarTurnV85(queued.state);
    assert.equal(advanced.accepted, true, advanced.message);
    assert.equal(advanced.state.turn, 2);
    assert(advanced.state.observations.some(item => item.territoryId === targetId && item.sourceId === actor.id));
    const disk = fixture(), session = await disk.mount(id);
    session.setSimulation(advanced.state); await session.whenSettled();
    assert.equal(session.getSnapshot().persistedWar, true);
    assert.equal(disk.records.get(api.warPlanetStorageKeyV96(id)).phase, "confirmed");
    assert.deepEqual((await disk.mount(id)).getSnapshot().simulation, advanced.state);
    assert.deepEqual(disk.writes.map(([key]) => key), [api.warPlanetStorageKeyV96(id)]);
    const cold = await import(url + `#cold-${territoryCount}`);
    assert.deepEqual(cold.readWarSimulationV85(JSON.parse(disk.data.get(api.warPlanetStorageKeyV96(id)))), advanced.state);
    assert.deepEqual(cold.warPlanetV96(id), api.warPlanetV96(id));
  });
}

test("dynamic regions and corridors can complete the actual two-turn objectives without T25", () => {
  for (const options of [{ territoryCount: 18, regionCount: 3 }, { territoryCount: 96, regionCount: 12 }]) {
    const id = code(options), planet = api.warPlanetV96(id), source = api.createWarSimulationV85(undefined, id);
    for (const objective of ["CON-O01", "CON-O02", "CON-O03"]) {
      let state = structuredClone(source);
      const corridor = api.warObjectiveCorridorV96(state);
      const guarded = objective === "CON-O01" ? planet.regions.map(region => region.territoryIds[0])
        : objective === "CON-O02" ? [...planet.regions].sort((a, b) => b.territoryIds.length - a.territoryIds.length)[0].territoryIds : corridor;
      for (const [id, site] of Object.entries(state.territories)) {
        site.controller = "CON-F01"; state.stocks[id] = { s: 100, m: 100, i: 100 };
      }
      if (objective === "CON-O03") {
        const neutralId = planet.definitions.find(site => !corridor.includes(site.id) && site.neighbors.some(neighbor => corridor.includes(neighbor)))?.id;
        assert(neutralId, "corridor must retain an accessible third-party transit site");
        state.territories[neutralId].controller = "CON-F03";
        state.territories[neutralId].transitUntilTurn = 10;
      }
      const own = state.combatants.filter(actor => actor.factionId === "CON-F01");
      assert(own.length >= guarded.length);
      state.combatants.forEach(actor => { actor.garrison = false; if (actor.factionId !== "CON-F01") actor.status = "wounded"; });
      guarded.forEach((id, index) => { own[index].territoryId = id; own[index].garrison = true; });
      for (let turn = 0; turn < 2; turn++) {
        const next = api.advanceWarTurnV85(state); assert.equal(next.accepted, true, next.message); state = next.state;
      }
      assert(state.completedObjectives.includes(objective), `${options.territoryCount}/${options.regionCount} ${objective}`);
      assert.equal(state.combatants.length, source.combatants.length, "No reinforcements may be fabricated to achieve objectives");
    }
  }
});

test("mixed catalog migrates shortcuts read-only, preserves legacy bytes and never touches saved fronts", () => {
  const raw = JSON.stringify({ version: 102, ids: [legacyCode] });
  const disk = fixture([[api.GENERATED_WAR_CATALOG_KEY_V102, raw], [api.warPlanetStorageKeyV96(legacyCode), "untouched archive"]]);
  assert.deepEqual(api.readGeneratedWarCatalogV103(disk.storage).ids, [legacyCode]);
  const id = code(), result = api.rememberGeneratedWarPlanetV103(disk.storage, id);
  assert.equal(result.persisted, true);
  assert.deepEqual(result.ids, [id, legacyCode]);
  assert.equal(disk.data.get(api.GENERATED_WAR_CATALOG_KEY_V102), raw);
  assert.equal(disk.data.get(api.warPlanetStorageKeyV96(legacyCode)), "untouched archive");
  assert.deepEqual(disk.writes.map(([key]) => key), [api.GENERATED_WAR_CATALOG_KEY_V103]);
  for (let seed = 0; seed < 28; seed++) api.rememberGeneratedWarPlanetV103(disk.storage, code({ seed }));
  assert.equal(api.readGeneratedWarCatalogV103(disk.storage).ids.length, 24);
  assert.equal(disk.data.get(api.GENERATED_WAR_CATALOG_KEY_V102), raw);
});

test("corrupt/future catalogs, silent setters, quota and concurrent edits never claim an unconfirmed write", () => {
  const id = code(), key = api.GENERATED_WAR_CATALOG_KEY_V103;
  for (const raw of ["broken", JSON.stringify({ version: 104, ids: [] }), JSON.stringify({ version: 103, ids: ["unknown"] }), " ".repeat(16385)]) {
    const disk = fixture([[key, raw]]), result = api.rememberGeneratedWarPlanetV103(disk.storage, id);
    assert.equal(result.persisted, false); assert(result.issue); assert.equal(disk.data.get(key), raw); assert.equal(disk.writes.length, 0);
  }
  const full = fixture(); full.storage.full = true;
  assert.equal(api.rememberGeneratedWarPlanetV103(full.storage, id).persisted, false);
  assert.equal(api.rememberGeneratedWarPlanetV103({ getItem: () => null, setItem() {} }, id).persisted, false);
  let reads = 0, writes = 0;
  const changed = JSON.stringify({ version: 103, ids: [code({ seed: 7 })] });
  const concurrent = { getItem(k) { return k === key && ++reads > 1 ? changed : null; }, setItem() { writes++; } };
  assert.equal(api.rememberGeneratedWarPlanetV103(concurrent, id).persisted, false); assert.equal(writes, 0);
  const legacy = fixture([[api.GENERATED_WAR_CATALOG_KEY_V102, "future-or-damaged"]]);
  const saved = api.rememberGeneratedWarPlanetV103(legacy.storage, id);
  assert.equal(saved.persisted, true); assert.match(saved.issue, /V102/);
  assert.equal(legacy.data.get(api.GENERATED_WAR_CATALOG_KEY_V102), "future-or-damaged");
});

test("stale V103 writers cannot overwrite another turn and quota recovery retains the newest local state", async () => {
  const disk = fixture(), id = code();
  const one = await disk.mount(id), stale = await disk.mount(id);
  one.setSimulation(current => ({ ...current, turn: 2 })); await one.whenSettled();
  stale.setSimulation(current => ({ ...current, turn: 3 })); await stale.whenSettled();
  assert.equal(stale.getSnapshot().persistedWar, false);
  assert.match(stale.getSnapshot().storageMessage, /autre session/);
  assert.equal(JSON.parse(disk.data.get(api.warPlanetStorageKeyV96(id))).turn, 2);
  const otherId = code({ seed: 104 }), other = await disk.mount(otherId);
  disk.storage.full = true;
  other.setSimulation(current => ({ ...current, turn: 4 })); await other.whenSettled();
  assert.equal(other.getSnapshot().persistedWar, false);
  assert.equal(other.getSnapshot().simulation.turn, 4);
  disk.storage.full = false;
  await other.retryPersistence(); await other.whenSettled();
  assert.equal(other.getSnapshot().persistedWar, true);
  assert.equal(JSON.parse(disk.data.get(api.warPlanetStorageKeyV96(otherId))).turn, 4);
});
