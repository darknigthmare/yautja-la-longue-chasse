import assert from "node:assert/strict";
import test from "node:test";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const ssr = homeworldSceneSsrV78();
const { WAR_PLANETS_V96 } = ssr.load("app/game/systems/clanWarPlanetsV96.ts");
const { projectWarAtlasGlobeV95, projectWarAtlasMapV95 } = ssr.load("app/game/systems/clanWarAtlasV95.ts");
const { createWarSimulationV85 } = ssr.load("app/game/systems/clanWarV85.ts");
const { planetPointFromPixelV101, wrapPlanetLongitudeV101, unwrapPlanetPolygonV101, planetMaterialRecipeV101 } = ssr.load("app/game/systems/planetMaterialV101.ts");

test("inverse texture projection keeps world coordinates aligned with the real atlas at rotated and tilted views", () => {
  let samples = 0;
  for (const [longitude, latitude] of [[-25, 15], [144, -35], [-179, 65], [0, 0]]) {
    const view = { projection: "globe", width: 960, height: 620, longitude, latitude, radius: 244, centerX: 480, centerY: 306, mapTop: 70, mapHeight: 480 };
    for (const planet of WAR_PLANETS_V96) for (const territory of planet.territories) {
      const point = projectWarAtlasGlobeV95(territory.longitude, territory.latitude, view);
      if (!point.visible || point.depth < .001) continue;
      const actual = planetPointFromPixelV101(point.x, point.y, view);
      assert.ok(actual, `${planet.id}/${territory.id}`);
      assert.ok(Math.abs(wrapPlanetLongitudeV101(actual[0] - territory.longitude)) < 1e-7, `longitude ${planet.id}/${territory.id}`);
      assert.ok(Math.abs(actual[1] - territory.latitude) < 1e-7, `latitude ${planet.id}/${territory.id}`);
      samples++;
    }
    assert.equal(planetPointFromPixelV101(480 + 245, 306, view), null, "outside the globe has no geographic point");
  }
  assert.ok(samples > 1800, `verified ${samples} visible territory centers`);
});

test("planispheres use the same north-up coordinates and the atlas vertical offset", () => {
  const view = { projection: "map", width: 960, height: 620, longitude: 123, latitude: -60, radius: 244, centerX: 480, centerY: 306, mapTop: 70, mapHeight: 480 };
  for (const [lon, lat] of [[-180, 90], [180, -90], [0, 0], [-149.5, 43.6], [115, -57]]) {
    const point = projectWarAtlasMapV95(lon, lat);
    const actual = planetPointFromPixelV101(point.x, point.y + 70, view);
    assert.ok(Math.abs(actual[0] - lon) < 1e-9);
    assert.ok(Math.abs(actual[1] - lat) < 1e-9);
  }
  assert.equal(planetPointFromPixelV101(400, 69, view), null);
  assert.equal(planetPointFromPixelV101(400, 551, view), null);
});

test("dateline masks preserve narrow continents instead of drawing across the whole map", () => {
  const original = [[170, 25], [-175, 25], [-175, -5], [170, -5]];
  const unwrapped = unwrapPlanetPolygonV101(original);
  assert.deepEqual(unwrapped, [[170, 25], [185, 25], [185, -5], [170, -5]]);
  assert.deepEqual(original, [[170, 25], [-175, 25], [-175, -5], [170, -5]], "geography is never mutated");
  for (const planet of WAR_PLANETS_V96) for (const landmass of planet.landmasses) {
    const points = unwrapPlanetPolygonV101(landmass.points);
    for (let index = 1; index < points.length; index++) assert.ok(Math.abs(points[index][0] - points[index - 1][0]) <= 180);
  }
});

test("all thirty recipes honor effective profiles, reuse independent materials and leave game data untouched", () => {
  const before = JSON.stringify(WAR_PLANETS_V96);
  const recipes = WAR_PLANETS_V96.map(planetMaterialRecipeV101);
  assert.equal(recipes.length, 30);
  assert.equal(new Set(recipes.map(item => item.land)).size, 13);
  assert.equal(new Set(recipes.map(item => item.surface)).size, 10);
  for (let index = 0; index < recipes.length; index++) {
    const recipe = recipes[index], planet = WAR_PLANETS_V96[index];
    assert.ok(recipe.land.endsWith(`/land-${planet.landBiome}.webp`));
    assert.ok(recipe.surface.endsWith(`/surface-${planet.surface.kind}.webp`));
    assert.match(recipe.clouds, /\/clouds-[a-z]+\.webp$/);
    assert.match(recipe.weather, /\/(?:clouds|haze|particles)-[a-z]+\.webp$/);
    assert.ok(recipe.cloudOpacity >= 0 && recipe.cloudOpacity <= 1);
    assert.ok(recipe.weatherOpacity >= 0 && recipe.weatherOpacity <= 1);
  }
  const byId = Object.fromEntries(recipes.map(recipe => [recipe.id, recipe]));
  assert.ok(byId.chloris.surface.endsWith("surface-water.webp"), "Chloris is the effective peat swamp, not the superseded chlorine design");
  assert.ok(byId.cryovant.land.endsWith("land-tundra.webp"));
  assert.equal(byId.pyroclaste.weather.endsWith("haze-ash.webp"), true);
  assert.equal(byId.nyctera.weather.endsWith("particles-spores.webp"), true);
  assert.ok(byId.nivalis.auroraOpacity > 0);
  assert.equal(byId.serak.auroraOpacity, 0);
  assert.equal(JSON.stringify(WAR_PLANETS_V96), before);
});

test("SSR retains territory keyboard access and geographic fallback while material layers remain decorative", () => {
  for (const id of ["korthas", "obsidra", "nyctera"]) {
    const simulation = createWarSimulationV85(undefined, id);
    const planet = WAR_PLANETS_V96.find(item => item.id === id);
    const source = planet.definitions.find(item => simulation.territories[item.id].controller === "CON-F01");
    const html = ssr.render("app/game/ClanWarAtlasV95.tsx", { simulation, selectedTerritoryId: source.id, targetTerritoryId: source.neighbors[0], onSelectTerritory() {}, onSelectTarget() {} });
    assert.match(html, /data-material-ready="false"/);
    assert.match(html, /<foreignObject[^>]*pointer-events="none"[^>]*aria-hidden="true"/);
    assert.match(html, /<canvas[^>]*aria-hidden="true"[^>]*data-testid="planet-material-v101"/);
    assert.match(html, /role="button" tabindex="0"/);
    assert.match(html, /data-testid="war-planet-coastlines"/);
    assert.match(html, /data-testid="war-planet-neighbor-routes"/);
    assert.match(html, /Affichage planétaire/);
    assert.match(html, /Atmosphère/);
    assert.match(html, /Nuages/);
    assert.match(html, /Brumes et météo/);
    assert.match(html, /Aurores/);
    assert.match(html, /Éclairage/);
    assert.doesNotMatch(html, /NaN|Infinity/);
  }
});
