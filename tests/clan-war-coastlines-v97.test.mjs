import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({ stdin: { contents: "export * from './app/game/systems/clanWarPlanetsV96'; export * from './app/game/systems/clanWarV85'; export * from './app/game/systems/clanWarAtlasV95';", resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const pointInside = (point, polygon) => {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index], b = polygon[previous];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
};
const signedArea = points => points.reduce((sum, point, index) => { const next = points[(index + 1) % points.length]; return sum + point[0] * next[1] - next[0] * point[1]; }, 0) / 2;
const bounds = points => ({ left: Math.min(...points.map(point => point[0])), right: Math.max(...points.map(point => point[0])), bottom: Math.min(...points.map(point => point[1])), top: Math.max(...points.map(point => point[1])) });
const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const properCrossing = (a, b, c, d) => Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0])) < Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0])) + 1e-8 && Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1])) < Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1])) + 1e-8 && orient(a, b, c) * orient(a, b, d) < -1e-8 && orient(c, d, a) * orient(c, d, b) < -1e-8;
function assertSimple(points, label) {
  assert(points.length >= 3 && points.every(point => point.length === 2 && point.every(Number.isFinite)), label);
  assert(Math.abs(signedArea(points)) > 0.001, `${label}: nonzero area`);
  for (let first = 0; first < points.length; first++) {
    const a = points[first], b = points[(first + 1) % points.length];
    assert(Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-7, `${label}: duplicate consecutive vertex`);
    for (let second = first + 2; second < points.length; second++) {
      if (first === 0 && second === points.length - 1) continue;
      assert(!properCrossing(a, b, points[second], points[(second + 1) % points.length]), `${label}: self-intersecting coast`);
    }
  }
}
function hull(points) {
  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const half = sequence => { const result = []; for (const point of sequence) { while (result.length > 1 && orient(result.at(-2), result.at(-1), point) <= 0) result.pop(); result.push(point); } return result; };
  return half(sorted).slice(0, -1).concat(half(sorted.reverse()).slice(0, -1));
}
function normalizedShape(points) {
  const box = bounds(points), width = box.right - box.left, height = box.top - box.bottom;
  const normalized = points.map(point => [Math.round((point[0] - box.left) / width * 30), Math.round((point[1] - box.bottom) / height * 30)].join(","));
  const distinct = normalized.filter((point, index) => point !== normalized[(index + normalized.length - 1) % normalized.length]);
  const canonical = sequence => sequence.map((_, index) => sequence.slice(index).concat(sequence.slice(0, index)).join(";")).sort()[0];
  return [canonical(distinct), canonical(distinct.toReversed())].sort()[0];
}

test("V97 coastlines preserve all thirty existing travel graphs and initial archive bytes", () => {
  const planets = api.WAR_PLANETS_V96;
  assert.equal(planets.length, 30);
  assert.equal(hash(planets.map(planet => planet.definitions.map(territory => [territory.id, territory.neighbors]))), "e3a0e1c46206d455f4ea1abb399e9385e1199567decd1f772345f354f75c5972");
  assert.equal(hash(planets.map(planet => ({ id: planet.id, stateHash: hash(api.createWarSimulationV85(undefined, planet.id)) }))), "5d342a693430c63f457742c420d96e7f8ce1ae403b97747bdb446a57ba4bac54");
});

test("old queued reconnaissance archives remain readable and resolve against the same roads", () => {
  for (const planet of api.WAR_PLANETS_V96) {
    const initial = api.createWarSimulationV85(undefined, planet.id), origin = planet.definitions.find(territory => territory.id === "CON-T01"), targetId = origin.neighbors[0];
    // This is the pre-V97 persisted order envelope; construct its bytes
    // independently of the current queue implementation and geometry.
    const archived = { ...initial, revision: 1, orders: [{ kind: "recon", fromId: origin.id, targetId, combatantIds: ["P01"], cargo: { s: 0, m: 0, i: 0 }, id: `free-${initial.seed}-t1-r1`, factionId: "CON-F01", mode: "auto" }] };
    const raw = JSON.stringify(archived), restored = api.readWarSimulationV85(JSON.parse(raw));
    assert.deepEqual(restored, archived, planet.id);
    const resolved = api.advanceWarTurnV85(restored);
    assert.equal(resolved.accepted, true); assert.equal(resolved.state.turn, 2);
    assert.ok(resolved.state.observations.some(observation => observation.territoryId === targetId && observation.sourceId === "P01"), planet.id);
    assert.equal(api.warPlanetStorageKeyV96(planet.id), planet.id === "korthas" ? api.WAR_STORAGE_KEY_V85 : `yautja.clan-war.v96.planet.${planet.id}.free.v1`);
  }
});

for (const planet of api.WAR_PLANETS_V96) test(`${planet.name}: organic landmasses partition the actual playable territories without changing administrative regions`, () => {
  assert.ok(Array.isArray(planet.landmasses), planet.id);
  assert(planet.landmasses.length >= 2 && planet.landmasses.length <= 6);
  assert.equal(new Set(planet.landmasses.map(landmass => landmass.id)).size, planet.landmasses.length);
  assert.equal(planet.regions.length, 6); assert.equal(planet.territories.length, 36);
  const assigned = planet.landmasses.flatMap(landmass => landmass.territoryIds);
  assert.equal(new Set(assigned).size, 36); assert.equal(assigned.length, 36);
  assert.deepEqual(assigned.slice().sort(), planet.territories.map(territory => territory.id).sort());
  let totalMacroVertices = 0;
  for (const landmass of planet.landmasses) {
    assert.equal(typeof landmass.id, "string");
    assert(landmass.points.length >= 32 && landmass.points.length <= 1024, "a coast has actual detail and a bounded mobile drawing cost");
    totalMacroVertices += landmass.points.length;
    assertSimple(landmass.points, `${planet.id}/${landmass.id}`);
    assert(landmass.points.every(([longitude, latitude]) => longitude > -180 && longitude < 180 && latitude > -85 && latitude < 85), "macro coasts stay inside the atlas projection bounds");
    const tiles = landmass.territoryIds.map(id => planet.territories.find(territory => territory.id === id));
    for (const tile of tiles) {
      assert.equal(tile.landmassId, landmass.id);
      assertSimple(tile.points, `${planet.id}/${tile.id}`);
      assert(pointInside([tile.longitude, tile.latitude], tile.points), `${tile.id}: marker remains selectable on its own land`);
      assert(pointInside([tile.longitude, tile.latitude], landmass.points), `${tile.id}: the advertised macro coastline contains its real territory`);
    }
    const tileArea = tiles.reduce((sum, tile) => sum + Math.abs(signedArea(tile.points)), 0), coastArea = Math.abs(signedArea(landmass.points));
    assert(Math.abs(tileArea - coastArea) / coastArea < 0.015, `${landmass.id}: macro silhouette must describe the actual territory union, not a decorative replacement`);
  }
  assert(totalMacroVertices <= 3000);
  assert(planet.territories.reduce((sum, territory) => sum + territory.points.length, 0) <= 6000);
});

test("macro geography varies beyond six repeated rectangular islands", () => {
  const planets = api.WAR_PLANETS_V96, shapes = new Set(), counts = new Set();
  let multiRegionContinents = 0, indentedCoasts = 0;
  for (const planet of planets) {
    counts.add(planet.landmasses.length);
    for (const landmass of planet.landmasses) {
      shapes.add(normalizedShape(landmass.points));
      const regionIds = new Set(landmass.territoryIds.map(id => planet.territories.find(territory => territory.id === id).regionId));
      if (regionIds.size > 1) multiRegionContinents++;
      const solid = Math.abs(signedArea(landmass.points)) / Math.abs(signedArea(hull(landmass.points)));
      if (solid < 0.97) indentedCoasts++;
    }
  }
  assert(counts.size >= 3, "worlds offer several macro continent arrangements");
  assert(multiRegionContinents >= 20, "administrative borders must also lie inside large continuous continents");
  assert(shapes.size >= 30, "translated or resized copies of the same few outlines are insufficient");
  assert(indentedCoasts >= 30, "curved concave bays must survive in actual coasts, rather than merely subdividing rectangles");
});

test("dense complex coasts stay finite, clipped and bounded through rotations and polar views", () => {
  for (const planet of api.WAR_PLANETS_V96) {
    for (const [longitude, latitude] of [[0, 0], [90, 0], [180, 0], [-90, 0], [0, 85], [0, -85]]) {
      const view = { longitude, latitude, radius: 200, centerX: 240, centerY: 230 };
      let pathSize = 0;
      for (const territory of planet.territories) {
        const path = api.warAtlasGlobePathV95(territory.points, view); pathSize += path.length;
        assert.doesNotMatch(path, /NaN|Infinity|undefined/);
        for (const match of path.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)) assert(Math.hypot(Number(match[1]) - view.centerX, Number(match[2]) - view.centerY) <= view.radius + 0.002, `${planet.id}/${territory.id}: clipped to the planet`);
        assert.doesNotMatch(api.warAtlasMapPathV95(territory.points), /NaN|Infinity|undefined/);
      }
      assert(pathSize <= 500000, `${planet.id}: one atlas frame stays within a deterministic SVG budget`);
    }
  }
});
