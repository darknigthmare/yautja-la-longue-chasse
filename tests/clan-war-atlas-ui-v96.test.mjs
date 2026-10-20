import assert from "node:assert/strict";
import test from "node:test";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

function atlasFixture() {
  const ssr = homeworldSceneSsrV78();
  const catalogue = ssr.load("app/game/systems/clanWarPlanetsV96.ts");
  const engine = ssr.load("app/game/systems/clanWarV85.ts");
  const model = ssr.load("app/game/systems/clanWarAtlasV95.ts");
  const render = (planet, simulation = engine.createWarSimulationV85(undefined, planet.id)) => {
    const source = planet.definitions.find(item => simulation.territories[item.id].controller === "CON-F01");
    return ssr.render("app/game/ClanWarAtlasV95.tsx", {
      simulation, selectedTerritoryId: source.id, targetTerritoryId: source.neighbors[0],
      onSelectTerritory() {}, onSelectTarget() {},
    });
  };
  return { ...catalogue, engine, model, render };
}

test("every planetary atlas renders its own geography, names, surface and keyboard destinations", t => {
  const { WAR_PLANETS_V96, render } = atlasFixture();
  const errors = t.mock.method(console, "error");
  assert.equal(WAR_PLANETS_V96.length, 30);
  const rendered = new Set();
  for (const planet of WAR_PLANETS_V96) {
    const html = render(planet);
    assert.ok(html.includes(`data-planet-id="${planet.id}"`), planet.id);
    assert.ok(html.includes(`data-surface-kind="${planet.surface.kind}"`), planet.id);
    assert.ok(html.includes(`data-land-biome="${planet.landBiome}"`), planet.id);
    assert.ok(html.includes(planet.name), planet.id);
    assert.ok(html.includes(planet.surface.name), planet.id);
    assert.match(html, /36 territoires · 6 régions/);
    assert.match(html, /Surface non jouable/);
    assert.match(html, /destinations accessibles du départ/);
    assert.match(html, /aria-label="Longitude du globe"/);
    assert.match(html, /data-testid="war-planet-surface-texture"/);
    assert.match(html, /clip-path="url\(#war-atlas-[^"]+-surface-clip\)"/);
    assert.doesNotMatch(html, /NaN|Infinity|undefined/);
    for (const definition of planet.definitions) assert.ok(html.includes(definition.name.replaceAll("&", "&amp;").replaceAll("'", "&#x27;")), `${planet.id}: ${definition.name}`);
    rendered.add(html);
  }
  assert.equal(rendered.size, 30, "all 30 planets have a distinct actual rendered atlas");
  assert.equal(errors.mock.callCount(), 0, "all planetary atlases render without React warnings");
});

test("alien surfaces use ten structural textures while faction control retains its three canonical colors", () => {
  const { WAR_PLANETS_V96, render } = atlasFixture();
  const kinds = new Map();
  for (const planet of WAR_PLANETS_V96) if (!kinds.has(planet.surface.kind)) kinds.set(planet.surface.kind, planet);
  assert.deepEqual([...kinds.keys()].sort(), ["acid", "brine", "crystal", "ice", "lava", "mist", "radioactive", "sand", "spores", "water"]);
  const tiles = new Set();
  for (const [kind, planet] of kinds) {
    const html = render(planet);
    const tile = html.match(/<pattern id="[^"]+-surface"[\s\S]*?<\/pattern>/)?.[0];
    assert.ok(tile, kind);
    assert.ok(tile.includes(planet.surface.detail), `${kind}: the surface detail palette is drawn`);
    assert.match(tile, /<path/);
    assert.match(tile, /<circle/);
    // Ignore colors, seed offsets and decorative grain; the actual path
    // commands must differ between waves, bubbles, fractures, dunes, etc.
    tiles.add([...tile.matchAll(/<path d="([^"]+)"/g)].map(match => match[1].replaceAll(/-?\d*\.?\d+/g, "N")).join("|"));
    for (const color of ["#63dcc5", "#f1816b", "#d8be79"]) assert.ok(html.includes(`fill="${color}"`), `${kind}: unchanged faction color ${color}`);
    assert.match(html, /class="surfaceTexture"[^>]+aria-hidden="true"/);
  }
  assert.equal(tiles.size, 10, "the families differ in actual SVG geometry, beyond their palette");
});

test("natural jungles, tundra, snow and desert also texture the playable land beneath faction patterns", () => {
  const { WAR_PLANETS_V96, render } = atlasFixture();
  const biomes = new Map();
  for (const planet of WAR_PLANETS_V96) if (!biomes.has(planet.landBiome)) biomes.set(planet.landBiome, planet);
  for (const biome of ["jungle", "tundra", "snow", "desert", "temperate"]) assert.ok(biomes.has(biome));
  const structures = new Set();
  for (const [biome, planet] of biomes) {
    const html = render(planet);
    const relief = html.match(/<pattern id="[^"]+-relief"[\s\S]*?<\/pattern>/)?.[0];
    assert.ok(relief, biome);
    assert.ok(relief.includes(`data-land-biome="${biome}"`), biome);
    assert.match(relief, /<path/);
    structures.add([...relief.matchAll(/<path d="([^"]+)"/g)].map(match => match[1].replaceAll(/-?\d*\.?\d+/g, "N")).join("|"));
    assert.match(html, /<path d="[^"]+" fill="url\(#[^"]+-relief\)" class="landPattern"/);
  }
  assert.equal(structures.size, biomes.size, "vegetation and terrain are different drawn structures, beyond a biome label");
});

test("planetary metrics use the active regions and exposing a foreign atlas never reveals hidden stocks", () => {
  const { WAR_PLANETS_V96, engine, model, render } = atlasFixture();
  const planet = WAR_PLANETS_V96.find(item => item.surface.kind === "acid");
  const simulation = engine.createWarSimulationV85(undefined, planet.id);
  const enemy = planet.definitions.find(item => simulation.territories[item.id].controller !== "CON-F01");
  simulation.stocks[enemy.id] = { s: 923813, m: 923814, i: 923815 };
  const metrics = model.warAtlasRegionMetricsV95(simulation, planet.regions);
  assert.deepEqual(metrics.map(item => item.name), planet.regions.map(item => item.name));
  assert.equal(metrics.reduce((total, item) => total + item.territoryCount, 0), 36);
  assert.equal(model.warAtlasFactionMetricsV95(simulation, planet.regions).reduce((total, item) => total + item.territoryCount, 0), 36);
  assert.doesNotMatch(render(planet, simulation), /923813|923814|923815/);
});

test("real continents are counted separately from administrative regions and their coastlines remain noninteractive", () => {
  const ssr = homeworldSceneSsrV78();
  const { WAR_PLANETS_V96 } = ssr.load("app/game/systems/clanWarPlanetsV96.ts");
  const { createWarSimulationV85 } = ssr.load("app/game/systems/clanWarV85.ts");
  for (const planet of WAR_PLANETS_V96) {
    const count = planet.landmasses.length;
    assert.ok(count >= 2 && count <= 6, planet.id);
    const html = ssr.render("app/game/ClanWarAtlasV95.tsx", {
      simulation: createWarSimulationV85(undefined, planet.id), selectedTerritoryId: "CON-T02",
      targetTerritoryId: planet.definitions.find(item => item.id === "CON-T02").neighbors[0], onSelectTerritory() {}, onSelectTarget() {},
    });
    assert.ok(html.includes(`data-landmass-count="${count}"`), planet.id);
    assert.ok(html.includes(`${count} continents`), planet.id);
    assert.match(html, /6 régions administratives/);
    assert.doesNotMatch(html, /Région \/ continent/);
    const coastline = html.match(/<g class="coastlines"[^>]*>[\s\S]*?<\/g>/)?.[0];
    assert.ok(coastline, planet.id);
    assert.match(coastline, /aria-hidden="true" pointer-events="none"/);
    assert.equal([...coastline.matchAll(/<path /g)].length, count);
    assert.doesNotMatch(coastline, /role="button"|tabindex=/);
    for (const mass of planet.landmasses) assert.ok(coastline.includes(`data-landmass-id="${mass.id}"`), mass.id);
    const picker = ssr.render("app/game/ClanWarPlanetsV96.tsx", { planet, turn: 1, persisted: false, pending: false, onSelect() {} });
    assert.ok(picker.includes(`${count} continents`), planet.id);
    assert.match(picker, /6 régions administratives · 36 territoires/);
  }
});
