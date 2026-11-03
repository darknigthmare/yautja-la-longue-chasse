import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const bundle = await build({
  stdin: { contents: "export * from './app/game/systems/clanWarPlanetsV96'; export * from './app/game/systems/clanWarV85Data';", resolveDir: fileURLToPath(new URL("../", import.meta.url)) },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const planets = api.WAR_PLANETS_V96;
const pointKey = point => point.join(",");
const radians = Math.PI / 180;
const pointInside = (point, polygon) => {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index], b = polygon[previous];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
};
const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const bounds = points => ({ left: Math.min(...points.map(point => point[0])), right: Math.max(...points.map(point => point[0])), bottom: Math.min(...points.map(point => point[1])), top: Math.max(...points.map(point => point[1])) });
const touchesBounds = (a, b) => a.left <= b.right + 1e-8 && b.left <= a.right + 1e-8 && a.bottom <= b.top + 1e-8 && b.bottom <= a.top + 1e-8;
const properCrossing = (a, b, c, d) => Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0])) <= Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0])) + 1e-8 && Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1])) <= Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1])) + 1e-8 && orient(a, b, c) * orient(a, b, d) < -1e-8 && orient(c, d, a) * orient(c, d, b) < -1e-8;
const edgeKey = (a, b) => [pointKey(a), pointKey(b)].sort().join("|");
const edgeKeys = tile => new Set(tile.points.map((point, index) => edgeKey(point, tile.points[(index + 1) % tile.points.length])));
const sharesBorder = (a, b) => {
  const edges = edgeKeys(a);
  return b.points.some((point, index) => {
    const next = b.points[(index + 1) % b.points.length];
    return Math.hypot(next[0] - point[0], next[1] - point[1]) > 1e-6 && edges.has(edgeKey(point, next));
  });
};

test("the catalog offers 30 stable, independently named and geographically distinct playable worlds", () => {
  assert.equal(planets.length, 30);
  assert.equal(new Set(planets.map(planet => planet.id)).size, 30);
  assert.equal(new Set(planets.map(planet => planet.name)).size, 30);
  assert.equal(new Set(planets.map(planet => planet.seed)).size, 30);
  assert.equal(new Set(planets.map(planet => JSON.stringify(planet.territories))).size, 30, "worlds must change geography, not just the surface color");
  assert.equal(new Set(planets.map(planet => JSON.stringify(planet.definitions.map(territory => territory.neighbors)))).size, 30, "each world has its own actual travel topology");
  assert.equal(api.DEFAULT_WAR_PLANET_ID_V96, "korthas");
  assert.equal(api.warPlanetV96(), planets[0]);
  for (const planet of planets) assert.equal(api.warPlanetV96(planet.id), planet);
  for (const id of ["", "unknown-world", "__proto__", "constructor", null]) assert.equal(api.warPlanetV96(id), undefined);
});

test("classical hunting biomes coexist with alien worlds and have distinct land and non-playable surface metadata", () => {
  const classics = planets.filter(planet => planet.style === "classic"), exotic = planets.filter(planet => planet.style === "exotic");
  assert(classics.length >= 15, "at least half the worlds must retain natural classical palettes");
  assert(exotic.length >= 10);
  for (const biome of ["temperate", "jungle", "tundra", "snow", "desert", "volcanic", "ocean", "swamp"]) assert(classics.some(planet => planet.landBiome === biome), `${biome} must be playable on a classical world`);
  assert(exotic.some(planet => planet.surface.kind === "radioactive"));
  assert(exotic.some(planet => planet.surface.kind === "acid"));
  assert(exotic.some(planet => planet.surface.kind === "crystal"));
  assert(exotic.some(planet => planet.surface.kind === "lava" && /bleue|violette/.test(planet.surface.name)));
  for (const planet of planets) {
    assert(planet.name && planet.subtitle && planet.description && planet.surface.name && planet.landBiome);
    for (const field of ["base", "deep", "accent", "detail"]) assert.match(planet.surface[field], /^#[0-9a-f]{6}$/i);
    assert.notEqual(planet.surface.base, planet.surface.deep);
  }
  for (const id of ["cryovant", "ochria", "aerune", "boralis", "dunara"]) assert.doesNotMatch(JSON.stringify(api.warPlanetV96(id)), /électrique|dunes bleues|glace violette|brumes roses|poussière mauve/i);
});

test("Korthas preserves all workbook gameplay definitions and archives while receiving denser geography", () => {
  const korthas = api.warPlanetV96("korthas");
  assert.deepEqual(korthas.definitions, api.WAR_TERRITORIES_V85);
  assert.notEqual(korthas.definitions, api.WAR_TERRITORIES_V85);
  for (let index = 0; index < 36; index++) {
    assert.notEqual(korthas.definitions[index].neighbors, api.WAR_TERRITORIES_V85[index].neighbors);
    assert.notEqual(korthas.definitions[index].income, api.WAR_TERRITORIES_V85[index].income);
  }
});

test("new theaters advertise only actual neighboring routes in inherited site, capture, defense and risk descriptions", () => {
  const original = api.WAR_TERRITORIES_V85.find(territory => territory.id === "CON-T21");
  assert.match(original.effect, /vers T22/);
  assert.equal(api.warPlanetV96("korthas").definitions.find(territory => territory.id === "CON-T21").effect, original.effect);
  const thalassa = api.warPlanetV96("thalassa").definitions.find(territory => territory.id === "CON-T21");
  assert(!thalassa.neighbors.includes("CON-T22"), "this new mesh must reproduce the workbook route mismatch");
  assert.doesNotMatch(thalassa.effect, /\bT22\b/);
  for (const planet of planets.filter(planet => planet.id !== "korthas")) for (const territory of planet.definitions) {
    for (const field of ["sites", "capture", "defenses", "effect", "risk"]) for (const reference of territory[field].matchAll(/\b(?:CON-)?(T\d{2})\b/g)) assert(territory.neighbors.includes(`CON-${reference[1]}`), `${planet.id}/${territory.id} ${field} must not advertise unreachable ${reference[1]}`);
    if (territory.id === "CON-T21") for (const neighbor of territory.neighbors) assert(territory.effect.includes(neighbor.replace("CON-", "")), "the convoy description should list this world's real connections");
  }
});

for (const planet of planets) test(`${planet.name}: 36 tessellated territories, six administrative regions and short reachable routes`, () => {
  assert.equal(planet.regions.length, 6);
  assert.equal(planet.territories.length, 36);
  assert.equal(planet.definitions.length, 36);
  assert.deepEqual(planet.definitions.map(territory => territory.id), api.WAR_TERRITORIES_V85.map(territory => territory.id));
  assert.equal(new Set(planet.definitions.map(territory => territory.name)).size, 36);
  const definitions = new Map(planet.definitions.map(territory => [territory.id, territory]));
  const geometry = new Map(planet.territories.map(territory => [territory.id, territory]));
  for (const region of planet.regions) {
    assert(region.name && region.id);
    assert.equal(region.territoryIds.length, 6);
    const tiles = region.territoryIds.map(id => geometry.get(id));
    for (const tile of tiles) {
      assert.equal(tile.regionId, region.id);
      assert(planet.definitions.find(territory => territory.id === tile.id).region.startsWith(`${region.id} `));
      assert(tile.points.length >= 3 && tile.points.length <= 256, "coastline detail remains bounded for an interactive atlas");
      assert(tile.points.every(([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude) && longitude > -180 && longitude < 180 && latitude > -85 && latitude < 85));
      assert(pointInside([tile.longitude, tile.latitude], tile.points), `${tile.id} marker must remain inside its territory`);
    }
    const reached = new Set([region.territoryIds[0]]);
    for (let pass = 0; pass < 6; pass++) for (const tile of tiles) if (reached.has(tile.id)) for (const other of tiles) {
      const actualRoad = definitions.get(tile.id).neighbors.includes(other.id);
      if (tile.id !== other.id && actualRoad && (sharesBorder(tile, other) || api.warPlanetCoastDistanceV96(tile, other) <= 22.000001)) reached.add(other.id);
    }
    assert.equal(reached.size, 6, "an administrative region stays connected through its actual land routes or short straits");
  }
  const reached = new Set(["CON-T01"]);
  for (let pass = 0; pass < 36; pass++) for (const definition of planet.definitions) if (reached.has(definition.id)) for (const neighbor of definition.neighbors) reached.add(neighbor);
  assert.equal(reached.size, 36, "all territories must be reachable from the player's landing zone");
  let front = false, shortCrossings = 0;
  for (let index = 0; index < 36; index++) {
    const definition = planet.definitions[index], original = api.WAR_TERRITORIES_V85[index];
    assert.equal(definition.initialController, original.initialController);
    assert.equal(definition.kind, original.kind);
    assert.deepEqual(definition.income, original.income);
    assert.equal(new Set(definition.neighbors).size, definition.neighbors.length);
    for (const neighborId of definition.neighbors) {
      const neighbor = definitions.get(neighborId);
      assert(neighbor && neighbor.id !== definition.id);
      assert(neighbor.neighbors.includes(definition.id), `${definition.id}/${neighborId} route must be symmetric`);
      if (definition.initialController === "CON-F01" && neighbor.initialController !== "CON-F01") front = true;
      const a = geometry.get(definition.id), b = geometry.get(neighborId);
      if (!sharesBorder(a, b)) {
        const distance = api.warPlanetCoastDistanceV96(a, b);
        assert(distance <= 22.000001, `${definition.id}/${neighborId} coastline gap ${distance}° is too large`);
      }
      if (a.regionId !== b.regionId) shortCrossings++;
    }
  }
  assert(front, "the initial player region needs a usable frontier");
  assert(shortCrossings >= 10, "the six administrative regions retain their actual connecting routes");
  assert(planet.territories.reduce((total, tile) => total + tile.points.length, 0) <= 6000, "planetary SVG geometry has a deterministic mobile budget");
  for (let first = 0; first < 36; first++) for (let second = first + 1; second < 36; second++) {
    const a = planet.territories[first], b = planet.territories[second];
    if (!touchesBounds(bounds(a.points), bounds(b.points))) continue;
    for (let edgeA = 0; edgeA < a.points.length; edgeA++) for (let edgeB = 0; edgeB < b.points.length; edgeB++) assert(!properCrossing(a.points[edgeA], a.points[(edgeA + 1) % a.points.length], b.points[edgeB], b.points[(edgeB + 1) % b.points.length]), `${a.id}/${b.id} territory borders must not cross`);
  }
});

test("land covers 45–75% of every sphere with active fronts around both hemispheres, rather than a tiny isolated archipelago", () => {
  for (const planet of planets) {
    assert(planet.landFraction >= 0.45 && planet.landFraction <= 0.75, `${planet.id} land fraction ${planet.landFraction}`);
    let land = 0, total = 0, west = 0, east = 0;
    // Equal-area spherical sampling is independent of the catalog's polygon
    // area integral and catches overlaps as well as a misleading density metric.
    for (let y = 0; y < 48; y++) for (let x = 0; x < 96; x++) {
      const point = [-180 + (x + 0.372) * 360 / 96, Math.asin(-1 + (y + 0.419) * 2 / 48) / radians];
      const containing = planet.territories.filter(territory => pointInside(point, territory.points));
      assert(containing.length <= 1, `${planet.id} has overlapping playable territory at ${point}`);
      if (containing.length) { land++; if (point[0] < 0) west++; else east++; }
      total++;
    }
    assert(Math.abs(land / total - planet.landFraction) < 0.025, `${planet.id} spherical area must agree with independently sampled geography`);
    assert(west / total >= 0.20 && east / total >= 0.20, `${planet.id} must have substantial land on both sides of its globe`);
  }
});
