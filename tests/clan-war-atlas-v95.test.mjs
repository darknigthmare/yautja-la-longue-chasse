import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const bundle = await build({
  stdin: { contents: "export * from './app/game/systems/clanWarAtlasV95'; export * from './app/game/systems/clanWarV85'; export * from './app/game/systems/clanWarV85Data'; export * from './app/game/systems/clanWarSessionV85';", resolveDir: fileURLToPath(new URL("../", import.meta.url)) },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const factions = ["CON-F01", "CON-F02", "CON-F03"];
const view = { longitude: 0, latitude: 0, radius: 200, centerX: 240, centerY: 230 };
const near = (actual, expected, tolerance = 1e-8) => assert(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected}`);
const pointsEqual = (a, b) => a[0] === b[0] && a[1] === b[1];
const clone = value => structuredClone(value);

test("six schematic landmasses tessellate all 36 source territories with shared irregular borders", () => {
  assert.equal(api.WAR_ATLAS_REGIONS_V95.length, 6);
  assert.equal(api.WAR_ATLAS_TERRITORIES_V95.length, 36);
  assert.deepEqual(api.WAR_ATLAS_TERRITORIES_V95.map(item => item.id).sort(), api.WAR_TERRITORIES_V85.map(item => item.id).sort());
  assert.equal(new Set(api.WAR_ATLAS_TERRITORIES_V95.map(item => item.id)).size, 36);
  for (const region of api.WAR_ATLAS_REGIONS_V95) {
    assert.equal(region.territoryIds.length, 6);
    assert(region.name.length > 0);
    const land = region.territoryIds.map(id => api.WAR_ATLAS_TERRITORIES_V95.find(item => item.id === id));
    for (const territory of land) {
      assert.equal(territory.regionId, region.id);
      assert(territory.points.length >= 6);
      assert(territory.points.every(([lon, lat]) => lon > -180 && lon < 180 && lat > -90 && lat < 90));
      const source = api.WAR_TERRITORIES_V85.find(item => item.id === territory.id);
      assert(source.region.startsWith(region.id + " "));
      assert(!("neighbors" in territory), "atlas geometry must not create gameplay adjacency");
    }
    for (const [a, b] of [[0, 1], [2, 3], [4, 5], [0, 2], [1, 3], [2, 4], [3, 5]]) {
      assert.equal(land[a].points.filter(point => land[b].points.some(other => pointsEqual(point, other))).length, 3, `${land[a].id}/${land[b].id} share their exact edge and bend`);
    }
  }
  for (const id of factions) {
    assert.equal(api.WAR_ATLAS_FACTIONS_V95[id].name, api.WAR_FACTIONS_V85[id]);
    assert.match(api.WAR_ATLAS_FACTIONS_V95[id].color, /^#[0-9a-f]{6}$/i);
  }
  assert.equal(new Set(factions.map(id => api.WAR_ATLAS_FACTIONS_V95[id].color)).size, 3);
});

test("orthographic projection rotates the chosen center and never marks the far hemisphere visible", () => {
  const center = api.projectWarAtlasGlobeV95(0, 0, view);
  near(center.x, 240); near(center.y, 230); near(center.depth, 1); assert.equal(center.visible, true);
  const east = api.projectWarAtlasGlobeV95(90, 0, view);
  near(east.x, 440); near(east.y, 230); assert.equal(east.visible, true);
  const north = api.projectWarAtlasGlobeV95(0, 90, view);
  near(north.x, 240); near(north.y, 30);
  const back = api.projectWarAtlasGlobeV95(180, 0, view);
  assert.equal(back.visible, false); near(back.depth, -1);
  for (const [longitude, latitude] of [[-120, 50], [47, -32], [535, 80]]) {
    const rotated = { ...view, longitude, latitude };
    const front = api.projectWarAtlasGlobeV95(longitude, latitude, rotated);
    near(front.x, view.centerX); near(front.y, view.centerY); near(front.depth, 1);
    assert.equal(api.projectWarAtlasGlobeV95(longitude + 180, -latitude, rotated).visible, false);
  }
});

test("globe paths clip hidden territory polygons at the horizon and connect their outline along the limb", () => {
  const crossing = [[75, -12], [105, -12], [105, 12], [75, 12]];
  const path = api.warAtlasGlobePathV95(crossing, view);
  assert.match(path, /^M/); assert.match(path, /A200,200/); assert.match(path, / Z$/);
  assert.equal(api.warAtlasGlobePathV95([[150, -10], [170, -10], [170, 10], [150, 10]], view), "");
  for (const region of api.WAR_ATLAS_REGIONS_V95) {
    const territory = api.WAR_ATLAS_TERRITORIES_V95.find(item => item.id === region.territoryIds[0]);
    assert(api.warAtlasGlobePathV95(territory.points, { ...view, longitude: region.longitude, latitude: region.latitude }));
    assert.equal(api.warAtlasGlobePathV95(territory.points, { ...view, longitude: region.longitude + 180, latitude: -region.latitude }), "");
  }
  // Check many camera positions, including pole views and partially visible coastlines.
  for (const longitude of [-180, -120, -60, 0, 60, 120]) for (const latitude of [-90, -65, 0, 65, 90]) {
    const camera = { ...view, longitude, latitude };
    for (const territory of api.WAR_ATLAS_TERRITORIES_V95) {
      const outline = api.warAtlasGlobePathV95(territory.points, camera);
      assert.doesNotMatch(outline, /NaN|Infinity/);
      for (const match of outline.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)) {
        assert(Math.hypot(Number(match[1]) - view.centerX, Number(match[2]) - view.centerY) <= view.radius + 0.002, `${territory.id} should remain inside the projected planet`);
      }
    }
  }
});

test("flat projection preserves map bounds, territory identity and finite paths", () => {
  assert.deepEqual(api.projectWarAtlasMapV95(-180, 90), { x: 0, y: 0 });
  assert.deepEqual(api.projectWarAtlasMapV95(180, -90), { x: 960, y: 480 });
  assert.deepEqual(api.projectWarAtlasMapV95(0, 0, 600, 300), { x: 300, y: 150 });
  for (const territory of api.WAR_ATLAS_TERRITORIES_V95) {
    const path = api.warAtlasMapPathV95(territory.points);
    assert.match(path, /^M/); assert.match(path, / Z$/); assert.doesNotMatch(path, /NaN|Infinity/);
  }
  assert.equal(api.warAtlasMapPathV95([]), "");
  assert.equal(api.warAtlasGlobePathV95([[NaN, 0], [0, 0], [10, 10]], view), "");
});

test("faction and region metrics depend on public territorial flags and never on hidden rosters or stockpiles", () => {
  const state = api.createWarSimulationV85(), before = clone(state);
  const metrics = api.warAtlasFactionMetricsV95(state), regions = api.warAtlasRegionMetricsV95(state);
  assert.equal(metrics.reduce((total, item) => total + item.territoryCount, 0), 36);
  near(metrics.reduce((total, item) => total + item.share, 0), 1);
  assert.equal(regions.reduce((total, item) => total + item.territoryCount, 0), 36);
  assert.equal(regions[0].playerCount, 6); assert.equal(regions[0].controller, "CON-F01");
  assert.deepEqual(state, before, "selectors are pure");
  const altered = clone(state);
  altered.combatants = altered.combatants.filter(actor => actor.factionId === "CON-F01");
  for (const id of Object.keys(altered.stocks)) altered.stocks[id] = { s: 999, m: 999, i: 999 };
  assert.deepEqual(api.warAtlasFactionMetricsV95(altered), metrics);
  assert.deepEqual(api.warAtlasRegionMetricsV95(altered), regions);
  altered.territories["CON-T08"].controller = "CON-F01";
  assert.equal(api.warAtlasFactionMetricsV95(altered).find(item => item.id === "CON-F01").territoryCount, metrics.find(item => item.id === "CON-F01").territoryCount + 1);
});

test("atlas intelligence reveals own fit people, hides unobserved opponents and keeps reconnaissance estimates dated", () => {
  const state = api.createWarSimulationV85();
  assert.equal(api.warAtlasIntelV95(state, "CON-T02").count, 12);
  for (const id of ["CON-T08", "CON-T09"]) {
    const intel = api.warAtlasIntelV95(state, id);
    assert.equal(intel.kind, "unknown"); assert.equal(intel.count, null); assert.equal(intel.lower, null);
  }
  state.observations = [{ territoryId: "CON-T08", turn: 1, lower: 3, upper: 5, sourceId: "P08" }];
  const before = api.warAtlasIntelV95(state, "CON-T08");
  assert.equal(before.kind, "observed"); assert.equal(before.count, null); assert.equal(before.lower, 3); assert.equal(before.upper, 5);
  state.combatants = state.combatants.filter(actor => actor.factionId === "CON-F01");
  assert.deepEqual(api.warAtlasIntelV95(state, "CON-T08"), before, "hidden roster changes do not reveal actual defenders");
  state.turn = 4;
  assert.equal(api.warAtlasIntelV95(state, "CON-T08").stale, true);
  state.observations.push({ territoryId: "CON-T08", turn: 3, lower: 1, upper: 3, sourceId: "P08" });
  assert.equal(api.warAtlasIntelV95(state, "CON-T08").turn, 3);
  state.observations.push({ territoryId: "CON-T08", turn: 5, lower: 99, upper: 100, sourceId: "future" });
  assert.equal(api.warAtlasIntelV95(state, "CON-T08").turn, 3, "a future report is not current intelligence");
});

test("played reconnaissance then a reserved assault capture a territory, update atlas control and survive a real session reload", async () => {
  const disk = new Map(), writes = [];
  const storage = { getItem: key => disk.get(key) ?? null, setItem: (key, value) => { writes.push(key); disk.set(key, value); } };
  disk.set("campaign", "original-campaign-bytes");
  // Use the actual asynchronous store with its browser fence contract. This
  // injected port is an in-memory transactional test dependency, not a bypass
  // of a browser failure or a replacement for native IndexedDB integration QA.
  const records = new Map();
  let sequence = 0;
  const lock = async operation => ({ acquired: true, value: await operation() });
  const fence = {
    async read(key) { return clone(records.get(key) ?? null); },
    async reserve(key, expected, before, after) {
      assert.deepEqual(records.get(key) ?? null, expected);
      const record = { version: 1, token: String(++sequence), before, after, phase: "intent" };
      records.set(key, record); return clone(record);
    },
    async confirm(key, expected) {
      assert.deepEqual(records.get(key), expected);
      const record = { ...expected, phase: "confirmed" };
      records.set(key, record); return clone(record);
    },
  };
  const session = api.createWarSessionV85(() => storage, lock, fence);
  session.subscribe(() => {});
  assert.equal(session.getSnapshot().loaded, false);
  await session.whenSettled();
  assert.equal(session.getSnapshot().loaded, true);
  const original = session.getSnapshot().simulation;
  assert.equal(api.warAtlasIntelV95(original, "CON-T08").kind, "unknown");
  const recon = api.queueWarOrderV85(original, { kind: "recon", fromId: "CON-T02", targetId: "CON-T08", combatantIds: ["P08"], cargo: { s: 0, m: 0, i: 0 } });
  assert.equal(recon.accepted, true, recon.message);
  assert.equal(original.orders.length, 0);
  session.setSimulation(recon.state);
  await session.whenSettled();
  session.setSimulation(api.advanceWarTurnV85(session.getSnapshot().simulation).state);
  await session.whenSettled();
  const prepared = session.getSnapshot().simulation;
  const report = api.warAtlasIntelV95(prepared, "CON-T08");
  assert.equal(report.kind, "observed"); assert.equal(report.count, null); assert.equal(report.turn, 1);
  // The first opposing counterattack used real mobile actors; their departure
  // must not silently refresh the previously observed 3–5 person estimate.
  assert.deepEqual([report.lower, report.upper], [3, 5]);
  const attackers = prepared.combatants.filter(actor => actor.factionId === "CON-F01" && actor.territoryId === "CON-T02" && actor.status === "fit" && !actor.garrison && actor.trainingUntilTurn === null).slice(0, 8).map(actor => actor.id);
  const assault = api.queueWarOrderV85(prepared, { kind: "attack", fromId: "CON-T02", targetId: "CON-T08", combatantIds: attackers, cargo: { s: 0, m: 0, i: 0 } });
  assert.equal(assault.accepted, true, assault.message);
  assert.equal(assault.state.territories["CON-T08"].controller, "CON-F02", "reserving an order grants no control");
  const resolution = api.advanceWarTurnV85(assault.state);
  assert.equal(resolution.accepted, true);
  assert.equal(resolution.state.territories["CON-T08"].controller, "CON-F01");
  assert(api.warGarrisonV85(resolution.state, "CON-T08").length > 0);
  assert.equal(api.warAtlasIntelV95(resolution.state, "CON-T08").kind, "own");
  const countBefore = api.warAtlasFactionMetricsV95(original).find(item => item.id === "CON-F01").territoryCount;
  assert.equal(api.warAtlasFactionMetricsV95(resolution.state).find(item => item.id === "CON-F01").territoryCount, countBefore + 1);
  session.setSimulation(resolution.state);
  assert.equal(session.getSnapshot().persistedWar, false);
  assert(session.getSnapshot().pendingWrites > 0);
  await session.whenSettled();
  assert.equal(session.getSnapshot().persistedWar, true);
  assert.equal(session.getSnapshot().pendingWrites, 0);
  const reloaded = api.createWarSessionV85(() => storage, lock, fence);
  reloaded.subscribe(() => {});
  await reloaded.whenSettled();
  assert.equal(reloaded.getSnapshot().loaded, true);
  assert.equal(reloaded.getSnapshot().persistedWar, true);
  assert.equal(reloaded.getSnapshot().simulation.territories["CON-T08"].controller, "CON-F01");
  assert.deepEqual(api.warAtlasFactionMetricsV95(reloaded.getSnapshot().simulation), api.warAtlasFactionMetricsV95(resolution.state));
  assert.deepEqual(reloaded.getSnapshot().simulation.combatants, resolution.state.combatants);
  assert.equal(disk.get("campaign"), "original-campaign-bytes");
  assert(writes.length >= 3); assert(writes.every(key => key === api.WAR_STORAGE_KEY_V85));
});
