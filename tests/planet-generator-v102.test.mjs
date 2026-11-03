import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const ssr = homeworldSceneSsrV78();
const api = ssr.load("app/game/systems/clanWarPlanetGeneratorV102.ts");
const { WAR_TERRITORIES_V85 } = ssr.load("app/game/systems/clanWarV85Data.ts");
const recipe = overrides => api.normalizeWarPlanetRecipeV102(overrides);
const generate = overrides => api.generateWarPlanetV102(recipe(overrides));
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const geometry = planet => ({
  territories: planet.territories.map(({ id, regionId, longitude, latitude, points }) => ({ id, regionId, longitude, latitude, points })),
  landmasses: planet.landmasses.map(({ territoryIds, longitude, latitude, points }) => ({ territoryIds, longitude, latitude, points })),
  regions: planet.regions,
  routes: planet.definitions.map(({ id, neighbors }) => ({ id, neighbors })),
  crossings: planet.procedural.routes,
});
function contains([x, y], points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function convexHull(points) {
  const ordered = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const half = points => {
    const result = [];
    for (const point of points) {
      while (result.length >= 2 && orient(result.at(-2), result.at(-1), point) <= 0) result.pop();
      result.push(point);
    }
    return result.slice(0, -1);
  };
  return [...half(ordered), ...half(ordered.reverse())];
}
const planarArea = points => Math.abs(points.reduce((total, point, index) => {
  const next = points[(index + 1) % points.length];
  return total + point[0] * next[1] - next[0] * point[1];
}, 0)) / 2;
function properIntersection(a, b, c, d) {
  return orient(a, b, c) * orient(a, b, d) < -1e-10 && orient(c, d, a) * orient(c, d, b) < -1e-10;
}
function bounds(points) {
  return [Math.min(...points.map(point => point[0])), Math.min(...points.map(point => point[1])), Math.max(...points.map(point => point[0])), Math.max(...points.map(point => point[1]))];
}
function assertValidWorld(planet) {
  assert.equal(planet.territories.length, 36);
  assert.equal(planet.definitions.length, 36);
  assert.equal(planet.regions.length, 6);
  assert.ok(planet.landFraction > .06 && planet.landFraction < .8, `land fraction ${planet.landFraction}`);
  assert.equal(new Set(planet.territories.map(territory => territory.id)).size, 36);
  assert.equal(planet.landmasses.flatMap(landmass => landmass.territoryIds).length, 36);
  assert.equal(new Set(planet.landmasses.flatMap(landmass => landmass.territoryIds)).size, 36);
  const byId = new Map(planet.definitions.map(definition => [definition.id, definition]));
  const visited = new Set(), queue = [planet.definitions[0].id];
  while (queue.length) {
    const id = queue.pop();
    if (visited.has(id)) continue;
    visited.add(id);
    queue.push(...byId.get(id).neighbors);
  }
  assert.equal(visited.size, 36, "the entire strategic front must be reachable");
  for (const region of planet.regions) {
    assert.equal(region.territoryIds.length, 6);
    assert.ok(region.territoryIds.some(id => {
      const territory = planet.territories.find(item => item.id === id);
      return contains([region.longitude, region.latitude], territory.points);
    }), "administrative label remains on one of its own territories");
  }
  for (const territory of planet.territories) {
    const own = planet.landmasses.find(landmass => landmass.id === territory.landmassId);
    const marker = [territory.longitude, territory.latitude];
    assert.ok(contains(marker, territory.points), `${planet.id}/${territory.id} marker lies inside its territory`);
    assert.ok(contains(marker, own.points), "territorial center is on its actual landmass");
    assert.ok(own.territoryIds.includes(territory.id));
    for (const point of territory.points) assert.ok(point.every(Number.isFinite) && Math.abs(point[0]) < 180 && Math.abs(point[1]) < 90);
    const definition = byId.get(territory.id);
    assert.ok(definition.neighbors.length > 0);
    assert.equal(new Set(definition.neighbors).size, definition.neighbors.length);
    for (const neighbor of definition.neighbors) {
      assert.notEqual(neighbor, territory.id);
      assert.ok(byId.get(neighbor)?.neighbors.includes(territory.id), "every route is reciprocal and resolves to a real territory");
    }
  }
  for (const route of planet.procedural.routes) {
    const a = planet.territories.find(item => item.id === route.fromId), b = planet.territories.find(item => item.id === route.toId);
    assert.equal(route.kind === "land", a.landmassId === b.landmassId);
    assert.ok(byId.get(a.id).neighbors.includes(b.id));
    assert.ok(Number.isFinite(route.distanceDegrees) && route.distanceDegrees > 0 && route.distanceDegrees < 180);
  }
}

test("complete recipes round-trip through bounded canonical world codes, including uint32 extremes", () => {
  for (const seed of [0, 1, 1028507, 0xffffffff]) for (const landform of api.WAR_PLANET_LANDFORMS_V102) for (const surface of api.WAR_PLANET_SURFACES_V102) {
    const original = recipe({ seed, landform, surface });
    const code = api.encodeWarPlanetV102(original);
    assert.ok(code.length <= 40);
    assert.deepEqual(api.parseWarPlanetV102(code), original);
    assert.equal(api.encodeWarPlanetV102(api.parseWarPlanetV102(code)), code);
  }
  const code = api.encodeWarPlanetV102(recipe());
  for (const invalid of [code.toUpperCase(), `${code} `, code.replace("v102", "v103"), code.replace("m1ln", "0m1ln"), code.slice(0, -1) + (code.endsWith("0") ? "1" : "0"), "proc-v102-" + "z".repeat(10000), "../korthas", "korthas", ""]) assert.equal(api.parseWarPlanetV102(invalid), null);
  for (const invalid of [{ ...recipe(), seed: -1 }, { ...recipe(), seed: 2 ** 32 }, { ...recipe(), seed: 1.5 }, { ...recipe(), seed: NaN }, { ...recipe(), landform: "unknown" }, { ...recipe(), version: 103 }, { ...recipe(), arbitrary: true }, {}, null, [], "recipe"]) assert.equal(api.validateWarPlanetRecipeV102(invalid), null);
  assert.throws(() => api.normalizeWarPlanetRecipeV102({ surface: "unknown" }), RangeError);
  assert.throws(() => api.normalizeWarPlanetRecipeV102({ arbitrary: true }), RangeError);
});

test("named seeds are reproducible and bounded while numeric seeds retain their uint32 value", () => {
  assert.equal(api.seedFromTextV102("4294967295"), 0xffffffff);
  assert.equal(api.seedFromTextV102(" 0 "), 0);
  assert.equal(api.seedFromTextV102("  Échos des clans  "), api.seedFromTextV102("E\u0301chos des clans"));
  assert.notEqual(api.seedFromTextV102("Échos des clans"), api.seedFromTextV102("Échos des terres"));
  assert.throws(() => api.seedFromTextV102(" "), RangeError);
  assert.throws(() => api.seedFromTextV102("a".repeat(129)), RangeError);
});

test("shared codes regenerate identical immutable worlds without registration and the cache stays bounded", () => {
  const original = generate({ seed: 829123, landform: "archipelago", surface: "brine" });
  const expected = digest(original);
  assert.equal(digest(api.generatedWarPlanetV102(original.id)), expected);
  assert.equal(digest(generate(original.procedural.recipe)), expected);
  assert.ok(Object.isFrozen(original) && Object.isFrozen(original.procedural.recipe) && Object.isFrozen(original.territories[0].points));
  assert.throws(() => { original.territories[0].points[0][0] = 99; }, TypeError);
  const oldest = api.generatedWarPlanetV102(original.id);
  for (let seed = 0; seed < api.WAR_GENERATED_PLANET_CACHE_LIMIT_V102 + 1; seed++) api.generatedWarPlanetV102(api.encodeWarPlanetV102(recipe({ seed })));
  const reloaded = api.generatedWarPlanetV102(original.id);
  assert.notEqual(reloaded, oldest, "older generated worlds are evicted rather than accumulating indefinitely");
  assert.equal(digest(reloaded), expected, "eviction never changes a regenerated world");
  assert.equal(api.generatedWarPlanetV102("proc-v102-invalid"), undefined);
});

test("published V102 recipes preserve their fixed geography and route fingerprints", () => {
  // These are compatibility fixtures, not snapshots to update during routine
  // refactors. A different geographic interpretation needs a new generator
  // version while V102 must continue resolving its existing saved fronts.
  const expected = {
    "proc-v102-m1ln-1110011-xkz70": "0be7ae091fa71f02a1a561af28da61db82ea1b134837ef701fb9407747903b3b",
    "proc-v102-hrr7-2021513-xoorc": "158cf553f151a2157b13d72a77e6b2cd16070d657c544745b4428e498f0acd6c",
    "proc-v102-1z141z3-321a900-tn9g3": "10d71ce64fb0a4db233525260f8cf5e00893f1ef1a313c5256768b40a09a0d91",
  };
  for (const [code, fingerprint] of Object.entries(expected)) {
    const planet = api.generatedWarPlanetV102(code);
    assert.ok(planet, "the published code must remain resolvable");
    // Exclude display names so editorial changes cannot require a new world;
    // coordinates, memberships, adjacency and crossing distances are frozen.
    const versionedGeometry = { ...geometry(planet), regions: planet.regions.map(({ id, territoryIds, longitude, latitude }) => ({ id, territoryIds, longitude, latitude })) };
    assert.equal(digest(versionedGeometry), fingerprint, `${code}: geographic changes require a new generator version`);
  }
});

test("changing materials, diversity or atmosphere preserves coast geometry and strategic routes", () => {
  const original = generate({ seed: 110237, landform: "shattered", coast: "fjords" });
  const expected = geometry(original);
  const changes = [
    ...api.WAR_PLANET_SURFACES_V102.map(surface => ({ surface })),
    ...api.WAR_PLANET_BIOMES_V102.map(landBiome => ({ landBiome })),
    ...api.WAR_PLANET_ATMOSPHERES_V102.map(atmosphere => ({ atmosphere })),
    { biomeDiversity: "uniform" },
  ];
  for (const change of changes) assert.deepEqual(geometry(generate({ ...original.procedural.recipe, ...change })), expected);
  assert.equal(new Set(changes.map(change => generate({ ...original.procedural.recipe, ...change }).id)).size, changes.length - 2, "only repeated original settings share an identity");
});

test("seed, landform, coverage and coast modules really alter the generated geography", () => {
  const original = generate({ seed: 173 });
  const identity = digest(geometry(original));
  for (const change of [{ seed: 174 }, { landform: "supercontinent" }, { landform: "archipelago" }, { landform: "shattered" }, { landCoverage: "low" }, { landCoverage: "high" }, { coast: "smooth" }, { coast: "fjords" }]) assert.notEqual(digest(geometry(generate({ ...original.procedural.recipe, ...change }))), identity);
  for (const seed of [0, 67, 0xffffffff]) for (const landform of api.WAR_PLANET_LANDFORMS_V102) {
    const values = api.WAR_PLANET_COVERAGES_V102.map(landCoverage => generate({ seed, landform, landCoverage }).landFraction);
    assert.ok(values[0] < values[1] && values[1] < values[2], `${seed}/${landform} coverage increases actual measured land area`);
  }
});

test("the default rugged and fjord coasts retain visible bays instead of degenerating into smooth ovals", () => {
  for (const coast of ["rugged", "fjords"]) for (const landmass of generate({ coast }).landmasses) {
    const bayFraction = 1 - planarArea(landmass.points) / planarArea(convexHull(landmass.points));
    assert.ok(bayFraction > .02, `${coast}/${landmass.id} keeps meaningful inward coastal indentations`);
  }
  for (const landmass of generate({ coast: "smooth" }).landmasses) {
    const bayFraction = 1 - planarArea(landmass.points) / planarArea(convexHull(landmass.points));
    assert.ok(bayFraction < .01, "the smooth module remains visually distinct from broken coastlines");
  }
});

test("72 worlds cover every topology, coastline and density with valid centers and a connected reciprocal graph", () => {
  const identities = new Set();
  for (const seed of [0, 0xffffffff]) for (const landform of api.WAR_PLANET_LANDFORMS_V102) for (const landCoverage of api.WAR_PLANET_COVERAGES_V102) for (const coast of api.WAR_PLANET_COASTS_V102) {
    const planet = generate({ seed, landform, landCoverage, coast });
    assertValidWorld(planet);
    identities.add(digest(geometry(planet)));
    const expected = landform === "supercontinent" ? [1, 1] : landform === "continents" ? [3, 5] : landform === "archipelago" ? [8, 10] : [12, 16];
    assert.ok(planet.landmasses.length >= expected[0] && planet.landmasses.length <= expected[1]);
  }
  assert.equal(identities.size, 72, "the tested parameter combinations produce distinct real layouts");
});

test("sampled coasts and territory polygons are simple and meet without overlaps or missing land", () => {
  for (const seed of [7731, 0xffffffff]) for (const landform of api.WAR_PLANET_LANDFORMS_V102) for (const coast of api.WAR_PLANET_COASTS_V102) {
    const planet = generate({ seed, landform, coast, landCoverage: "high" });
    for (const polygon of [...planet.territories, ...planet.landmasses]) {
      const points = polygon.points;
      for (let a = 0; a < points.length; a++) for (let b = a + 2; b < points.length; b++) {
        if (a === 0 && b === points.length - 1) continue;
        assert.equal(properIntersection(points[a], points[(a + 1) % points.length], points[b], points[(b + 1) % points.length]), false, `${landform}/${coast}/${polygon.id} self intersection`);
      }
    }
    const boxes = planet.territories.map(territory => bounds(territory.points));
    for (let a = 0; a < planet.territories.length; a++) for (let b = a + 1; b < planet.territories.length; b++) {
      if (boxes[a][0] >= boxes[b][2] || boxes[b][0] >= boxes[a][2] || boxes[a][1] >= boxes[b][3] || boxes[b][1] >= boxes[a][3]) continue;
      const first = planet.territories[a].points, second = planet.territories[b].points;
      for (let i = 0; i < first.length; i++) for (let j = 0; j < second.length; j++) assert.equal(properIntersection(first[i], first[(i + 1) % first.length], second[j], second[(j + 1) % second.length]), false, `${landform}/${coast} two territories cross`);
    }
    let samples = 0;
    for (let y = -77.3; y < 78; y += 7.1) for (let x = -176.2; x < 177; x += 7.3) {
      const coveredByTerritories = planet.territories.filter(territory => contains([x, y], territory.points)).length;
      const coveredByLand = planet.landmasses.filter(landmass => contains([x, y], landmass.points)).length;
      assert.ok(coveredByTerritories <= 1, "a geographic point cannot belong to overlapping territories");
      assert.equal(coveredByTerritories, coveredByLand, "the land silhouette is exactly filled by its territories");
      samples++;
    }
    assert.ok(samples > 1000);
  }
});

test("regional descriptions, island inventory and actual scenario resources agree with their generated geography", () => {
  const originalSources = JSON.stringify(WAR_TERRITORIES_V85);
  for (const landBiome of api.WAR_PLANET_BIOMES_V102) {
    const world = generate({ seed: 7103, landBiome, landform: "archipelago" });
    assert.equal(world.procedural.regions[0].biome, landBiome);
    assert.ok(new Set(world.procedural.regions.map(region => region.biome)).size > 1);
    assert.equal(world.procedural.landmasses.length, world.landmasses.length);
    for (const region of world.procedural.regions) {
      const source = world.regions.find(item => item.id === region.regionId);
      assert.ok(region.description.includes(source.name));
      assert.equal(region.features.length, 2);
      assert.ok(region.climate.length > 10 && region.resources.length > 0);
      assert.deepEqual(new Set(region.resources), new Set(world.definitions.filter(item => source.territoryIds.includes(item.id)).map(item => item.kind)));
    }
    for (const item of world.procedural.landmasses) assert.ok(world.landmasses.some(landmass => landmass.id === item.landmassId) && item.name && item.description);
    for (let i = 0; i < world.definitions.length; i++) {
      assert.deepEqual(world.definitions[i].income, WAR_TERRITORIES_V85[i].income);
      assert.equal(world.definitions[i].initialController, WAR_TERRITORIES_V85[i].initialController);
      assert.equal(world.definitions[i].kind, WAR_TERRITORIES_V85[i].kind);
    }
    assert.ok(world.procedural.traits.find(trait => trait.id === "gravity").description.includes("aucun multiplicateur"));
    const uniform = generate({ seed: 7103, landBiome, biomeDiversity: "uniform" });
    assert.deepEqual([...new Set(uniform.procedural.regions.map(region => region.biome))], [landBiome]);
  }
  for (const surface of ["sand", "crystal", "mist"]) assert.match(generate({ surface }).procedural.environment.liquid, /solide|n’est pas une mer liquide/);
  assert.equal(JSON.stringify(WAR_TERRITORIES_V85), originalSources, "the generator must never modify the historical scenario source");
});
