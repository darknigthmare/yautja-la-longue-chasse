import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const ssr = homeworldSceneSsrV78();
const api = ssr.load("app/game/systems/clanWarPlanetGeneratorV103.ts");
const materials = ssr.load("app/game/systems/planetMaterialProfilesV103.ts");
const geography = ssr.load("app/game/systems/clanWarPlanetGeographyV103.ts");
const recipe = overrides => api.normalizeWarPlanetRecipeV103(overrides);
const generate = overrides => api.generateWarPlanetV103(recipe(overrides));
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const suffix = (planet, id) => id.replace(planet.id, "WORLD");
function geometry(planet) {
  return {
    territories: planet.territories.map(({ id, regionId, landmassId, longitude, latitude, points }) => ({ id, regionId, landmassId: suffix(planet, landmassId), longitude, latitude, points })),
    regions: planet.regions.map(({ id, territoryIds, longitude, latitude }) => ({ id, territoryIds, longitude, latitude })),
    landmasses: planet.landmasses.map(({ id, ...mass }) => ({ id: suffix(planet, id), ...mass })),
    adjacency: planet.definitions.map(({ id, neighbors }) => ({ id, neighbors })),
    sites: planet.definitions.map(({ id, initialController, income }) => ({ id, initialController, income })),
    routes: planet.procedural.routes.map(route => ({ ...route, hydrologyIds: route.hydrologyIds.map(id => suffix(planet, id)) })),
    hydrology: {
      coveredFraction: planet.procedural.hydrology.coveredFraction,
      features: planet.procedural.hydrology.features.map(({ id, kind, landmassId, regionIds, points }) => ({ id: suffix(planet, id), kind, landmassId: suffix(planet, landmassId), regionIds, points })),
    },
    strategy: planet.procedural.strategy,
  };
}
function contains([x, y], points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const area = points => Math.abs(points.reduce((sum, point, index) => { const next = points[(index + 1) % points.length]; return sum + point[0] * next[1] - point[1] * next[0]; }, 0)) / 2;
const intersects = (a, b, c, d) => orient(a, b, c) * orient(a, b, d) < -1e-9 && orient(c, d, a) * orient(c, d, b) < -1e-9;
const bounds = points => [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))];
const boxesMeet = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
function reachable(definitions, start, allowed = new Set(definitions.map(item => item.id))) {
  const byId = new Map(definitions.map(item => [item.id, item])), visited = new Set([start]), queue = [start];
  for (let i = 0; i < queue.length; i++) for (const next of byId.get(queue[i]).neighbors) if (allowed.has(next) && !visited.has(next)) { visited.add(next); queue.push(next); }
  return visited;
}
function convexHull(points) {
  const ordered = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const half = values => { const result = []; for (const p of values) { while (result.length >= 2 && orient(result.at(-2), result.at(-1), p) <= 0) result.pop(); result.push(p); } return result.slice(0, -1); };
  return [...half(ordered), ...half(ordered.reverse())];
}
function assertSimple(points, label) {
  assert.ok(points.length >= 3 && area(points) > 0, `${label}: positive polygon`);
  for (const point of points) assert.ok(point.every(Number.isFinite), `${label}: finite coordinates`);
  for (let a = 0; a < points.length; a++) for (let b = a + 2; b < points.length; b++) {
    if (a === 0 && b === points.length - 1) continue;
    assert.equal(intersects(points[a], points[(a + 1) % points.length], points[b], points[(b + 1) % points.length]), false, `${label}: self intersection at ${a}/${b}`);
  }
}
function assertNoBoundaryCrossings(first, second, label) {
  if (!boxesMeet(bounds(first), bounds(second))) return;
  for (let a = 0; a < first.length; a++) for (let b = 0; b < second.length; b++) assert.equal(intersects(first[a], first[(a + 1) % first.length], second[b], second[(b + 1) % second.length]), false, label);
}
function assertWorld(planet) {
  const r = planet.procedural.recipe, byId = new Map(planet.definitions.map(site => [site.id, site]));
  assert.equal(planet.territories.length, r.territoryCount);
  assert.equal(planet.definitions.length, r.territoryCount);
  assert.equal(planet.regions.length, r.regionCount);
  assert.equal(planet.procedural.regions.length, r.regionCount);
  assert.equal(new Set(planet.territories.map(site => site.id)).size, r.territoryCount);
  assert.equal(new Set(planet.landmasses.flatMap(mass => mass.territoryIds)).size, r.territoryCount);
  assert.equal(planet.landmasses.flatMap(mass => mass.territoryIds).length, r.territoryCount);
  assert.equal(reachable(planet.definitions, planet.definitions[0].id).size, r.territoryCount, `${planet.id}: globally connected`);
  assert.ok(planet.landFraction > 0 && planet.landFraction < .8);
  for (const region of planet.regions) {
    assert.ok(region.territoryIds.length >= 3);
    assert.equal(reachable(planet.definitions, region.territoryIds[0], new Set(region.territoryIds)).size, region.territoryIds.length, `${planet.id}/${region.id}: internally connected`);
    assert.ok(region.territoryIds.some(id => contains([region.longitude, region.latitude], planet.territories.find(site => site.id === id).points)));
  }
  if (r.regionBalance === "balanced") assert.ok(Math.max(...planet.regions.map(region => region.territoryIds.length)) - Math.min(...planet.regions.map(region => region.territoryIds.length)) <= 1);
  for (const territory of planet.territories) {
    const mass = planet.landmasses.find(mass => mass.id === territory.landmassId), marker = [territory.longitude, territory.latitude], site = byId.get(territory.id);
    assert.ok(contains(marker, territory.points), `${planet.id}/${territory.id}: own marker`);
    assert.ok(contains(marker, mass.points), `${planet.id}/${territory.id}: marker on landmass`);
    assert.ok(mass.territoryIds.includes(territory.id));
    assert.ok(!planet.procedural.hydrology.features.some(feature => contains(marker, feature.points)), `${planet.id}/${territory.id}: dry marker`);
    for (const point of territory.points) assert.ok(point.every(Number.isFinite) && Math.abs(point[0]) < 180 && Math.abs(point[1]) < 90);
    assert.ok(site.neighbors.length > 0);
    assert.equal(new Set(site.neighbors).size, site.neighbors.length);
    for (const next of site.neighbors) { assert.notEqual(next, site.id); assert.ok(byId.get(next)?.neighbors.includes(site.id)); }
  }
  for (const route of planet.procedural.routes) {
    assert.ok(byId.get(route.fromId).neighbors.includes(route.toId));
    assert.ok(route.distanceDegrees > 0 && route.distanceDegrees <= 180);
    assert.ok(route.points.length >= 4);
    assert.deepEqual(route.points[0], [planet.territories.find(t => t.id === route.fromId).longitude, planet.territories.find(t => t.id === route.fromId).latitude]);
    const target = planet.territories.find(t => t.id === route.toId), last = route.points.at(-1);
    assert.ok(Math.abs(last[1] - target.latitude) < 1e-5 && Math.abs(((last[0] - target.longitude + 180) % 360 + 360) % 360 - 180) < 1e-5);
    for (let i = 1; i < route.points.length; i++) assert.ok(Math.abs(route.points[i][0] - route.points[i - 1][0]) <= 180);
    if (route.hydrologyIds.length) assert.equal(route.kind, "crossing");
    for (const id of route.hydrologyIds) assert.ok(planet.procedural.hydrology.features.some(feature => feature.id === id));
  }
  const strategy = planet.procedural.strategy;
  for (const faction of ["CON-F01", "CON-F02"]) {
    const ids = strategy.startingTerritoryIds[faction], headquarters = strategy.headquarters[faction];
    assert.ok(ids.includes(headquarters));
    assert.ok(ids.length >= 3 && ids.length <= 6);
    assert.equal(reachable(planet.definitions, headquarters, new Set(ids)).size, ids.length);
    assert.deepEqual(new Set(ids), new Set(planet.definitions.filter(site => site.initialController === faction).map(site => site.id)));
    for (const income of ["s", "m", "i"]) assert.ok(ids.some(id => byId.get(id).income[income] > 0));
  }
  assert.ok(planet.definitions.filter(site => site.initialController === "CON-F03").length >= 6);
  const corridor = strategy.objectiveCorridor;
  assert.equal(corridor[0], strategy.headquarters["CON-F01"]);
  assert.equal(corridor.at(-1), strategy.headquarters["CON-F02"]);
  assert.equal(new Set(corridor).size, corridor.length);
  for (let i = 1; i < corridor.length; i++) assert.ok(byId.get(corridor[i - 1]).neighbors.includes(corridor[i]));
  assert.ok(planet.definitions.some(site => site.initialController === "CON-F03" && site.neighbors.some(next => corridor.includes(next))), "a neutral transit site remains reachable from the objective corridor");
}

test("V103 codes strictly encode every independent field, uint32 seeds and compatible strategic counts", () => {
  const base = recipe();
  for (const seed of [0, 1, 1038507, 0xffffffff]) for (const territoryCount of api.WAR_PLANET_TERRITORY_COUNTS_V103) for (const regionCount of api.WAR_PLANET_REGION_COUNTS_V103) {
    if (territoryCount < 3 * regionCount) { assert.throws(() => recipe({ territoryCount, regionCount }), RangeError); continue; }
    const input = recipe({ seed, territoryCount, regionCount }), id = api.encodeWarPlanetV103(input);
    assert.ok(id.length <= 64);
    assert.deepEqual(api.parseWarPlanetV103(id), input);
  }
  const code = api.encodeWarPlanetV103(base);
  for (const invalid of [code.toUpperCase(), code + " ", code.replace("v103", "v102"), code.replace("m9bf", "0m9bf"), code.slice(0, -1) + (code.endsWith("0") ? "1" : "0"), "proc-v103-" + "z".repeat(10000), "../world", "", null, 3]) assert.equal(api.parseWarPlanetV103(invalid), null);
  for (const invalid of [{ ...base, seed: -1 }, { ...base, seed: 2 ** 32 }, { ...base, seed: .5 }, { ...base, seed: NaN }, { ...base, territoryCount: 25 }, { ...base, territoryCount: 18, regionCount: 12 }, { ...base, version: 102 }, { ...base, landVariant: "old" }, { ...base, extra: 1 }, {}, null, []]) assert.equal(api.validateWarPlanetRecipeV103(invalid), null);
  assert.throws(() => recipe({ extra: 1 }), RangeError);
  assert.equal(api.seedFromTextV103("4294967295"), 0xffffffff);
  assert.equal(api.seedFromTextV103(" Échos des clans "), api.seedFromTextV103("E\u0301chos des clans"));
  assert.throws(() => api.seedFromTextV103(" "), RangeError);
});

test("deterministic randomization respects editor locks and all count constraints", () => {
  const base = recipe({ territoryCount: 18, regionCount: 6 });
  for (let entropy = 0; entropy < 180; entropy++) for (const locks of [[], ["seed", "landform", "surface", "landPalette"], ["territoryCount"], ["regionCount"], ["territoryCount", "regionCount"]]) {
    const randomized = api.randomizeWarPlanetRecipeV103(base, entropy, locks);
    assert.ok(api.validateWarPlanetRecipeV103(randomized));
    assert.deepEqual(api.randomizeWarPlanetRecipeV103(base, entropy, locks), randomized);
    for (const field of locks) assert.equal(randomized[field], base[field]);
  }
  for (const field of api.WAR_PLANET_RECIPE_FIELDS_V103) {
    const locks = api.WAR_PLANET_RECIPE_FIELDS_V103.filter(name => name !== field), next = api.randomizeWarPlanetRecipeV103(base, 183, locks);
    for (const name of locks) assert.equal(next[name], base[name]);
  }
  assert.deepEqual(api.randomizeWarPlanetRecipeV103(base, 79, api.WAR_PLANET_RECIPE_FIELDS_V103), base);
  assert.throws(() => api.randomizeWarPlanetRecipeV103(base, -1), RangeError);
  assert.throws(() => api.randomizeWarPlanetRecipeV103(base, 1, ["unknown"]), RangeError);
});

test("all 27 valid strategic count pairs and both balance modes produce connected playable fronts", () => {
  let pairs = 0;
  for (const territoryCount of api.WAR_PLANET_TERRITORY_COUNTS_V103) for (const regionCount of api.WAR_PLANET_REGION_COUNTS_V103) {
    if (territoryCount < regionCount * 3) continue;
    pairs++;
    for (const regionBalance of api.WAR_PLANET_REGION_BALANCES_V103) {
      const index = pairs % 4;
      assertWorld(generate({ territoryCount, regionCount, regionBalance, seed: territoryCount * 103 + regionCount, landform: api.WAR_PLANET_LANDFORMS_V103[index], arrangement: api.WAR_PLANET_ARRANGEMENTS_V103[index] }));
    }
  }
  assert.equal(pairs, 27);
});

test("all landforms and arrangements retain valid centers, reciprocal graphs and coherent regional descriptions", () => {
  for (const seed of [0, 0xffffffff]) for (const landform of api.WAR_PLANET_LANDFORMS_V103) for (const arrangement of api.WAR_PLANET_ARRANGEMENTS_V103) {
    const planet = generate({ seed, landform, arrangement, regionBalance: "uneven", coast: seed ? "fjords" : "lobed" });
    assertWorld(planet);
    assert.equal(planet.landmasses.length === 1, landform === "supercontinent");
    for (const descriptor of planet.procedural.regions) {
      const region = planet.regions.find(item => item.id === descriptor.regionId);
      assert.ok(descriptor.description.includes(region.name) && descriptor.description.includes(String(region.territoryIds.length)));
      assert.deepEqual(new Set(descriptor.resources), new Set(planet.definitions.filter(item => region.territoryIds.includes(item.id)).map(item => item.kind)));
      assert.equal(descriptor.features.length, 2);
    }
    assert.ok(planet.procedural.traits.find(trait => trait.id === "gravity").description.includes("aucun multiplicateur"));
  }
});

test("piecewise affine Voronoi cells fill organic coastlines exactly without overlap or folded polygons", () => {
  // The uint32-max / continents / organic fixture includes the formerly
  // microscopic CON-T07 corner loop. Keep its exact seed and strict tolerance.
  for (const [seed, territoryCount, regionCount] of [[1038507, 48, 8], [0xffffffff, 96, 12]]) for (const landform of api.WAR_PLANET_LANDFORMS_V103) for (const territoryStyle of api.WAR_PLANET_TERRITORY_STYLES_V103) {
    const planet = generate({ seed, territoryCount, regionCount, landform, territoryStyle, coast: seed === 1038507 ? "peninsulas" : "fjords", landCoverage: "high", regionBalance: "uneven" });
    for (const polygon of [...planet.territories, ...planet.landmasses]) assertSimple(polygon.points, `${planet.id}/${polygon.id}`);
    for (let a = 0; a < planet.territories.length; a++) for (let b = a + 1; b < planet.territories.length; b++) assertNoBoundaryCrossings(planet.territories[a].points, planet.territories[b].points, `${planet.id}: distinct territories intersect`);
    for (const mass of planet.landmasses) {
      const covered = planet.territories.filter(t => t.landmassId === mass.id).reduce((sum, territory) => sum + area(territory.points), 0);
      assert.ok(Math.abs(covered - area(mass.points)) < area(mass.points) * 2e-6, `${mass.id}: complete area partition`);
      assert.ok(1 - area(mass.points) / area(convexHull(mass.points)) > .03, `${mass.id}: visible bays and peninsulas`);
    }
    for (let y = -78.13; y < 79; y += 5.73) for (let x = -175.32; x < 176; x += 5.19) {
      const territoryCount = planet.territories.filter(t => contains([x, y], t.points)).length, landCount = planet.landmasses.filter(mass => contains([x, y], mass.points)).length;
      assert.ok(territoryCount <= 1);
      assert.equal(territoryCount, landCount, `${planet.id}: silhouette filled without gaps at ${x}/${y}`);
    }
  }
});

test("inland basins and channel ribbons are simple, disjoint, inside their landmass and clear of markers", () => {
  for (const hydrology of api.WAR_PLANET_HYDROLOGIES_V103) for (const landform of ["supercontinent", "continents", "shattered"]) {
    const planet = generate({ seed: 173103, territoryCount: 24, regionCount: 8, hydrology, landform, arrangement: "polar", coast: "fjords" }), features = planet.procedural.hydrology.features;
    assert.equal(features.length, hydrology === "none" ? 0 : planet.regions.length * (hydrology === "mixed" ? 2 : 1));
    for (const feature of features) {
      assertSimple(feature.points, feature.id);
      const mass = planet.landmasses.find(mass => mass.id === feature.landmassId);
      for (const point of feature.points) assert.ok(contains(point, mass.points), `${feature.id}: feature inside land`);
      for (const marker of planet.territories) assert.ok(!contains([marker.longitude, marker.latitude], feature.points));
      assert.ok(feature.name && feature.description);
      if (hydrology !== "mixed") assert.equal(feature.kind, hydrology === "lakes" ? "lake" : "river");
    }
    for (let a = 0; a < features.length; a++) for (let b = a + 1; b < features.length; b++) {
      assertNoBoundaryCrossings(features[a].points, features[b].points, "hydrology polygons must not overlap");
      assert.equal(features[a].points.some(p => contains(p, features[b].points)), false);
      assert.equal(features[b].points.some(p => contains(p, features[a].points)), false);
    }
    assert.equal(planet.procedural.hydrology.coveredFraction, features.reduce((sum, feature) => sum + geography.sphericalPolygonAreaV103(feature.points), 0) / (4 * Math.PI));
    const outer = planet.landmasses.reduce((sum, mass) => sum + geography.sphericalPolygonAreaV103(mass.points), 0) / (4 * Math.PI);
    assert.ok(Math.abs(planet.landFraction + planet.procedural.hydrology.coveredFraction - outer) < 1e-12);
    for (const route of planet.procedural.routes) {
      const actual = features.filter(feature => [-360, 0, 360].some(shift => {
        const points = feature.points.map(([x, y]) => [x + shift, y]);
        return route.points.some(p => contains(p, points)) || route.points.some((p, i) => i > 0 && points.some((q, j) => intersects(route.points[i - 1], p, q, points[(j + 1) % points.length])));
      })).map(feature => feature.id);
      assert.deepEqual(route.hydrologyIds, actual, "water-crossing metadata uses precisely the rendered path");
    }
  }
  for (const surface of ["ice", "sand", "crystal", "spores", "mist"]) assert.match(generate({ surface, territoryCount: 18, regionCount: 3 }).procedural.environment.liquid, /n’implique pas une eau liquide/);
});

test("biomes, sea materials, eight material modules and atmosphere never move geography or strategic routes", () => {
  const original = generate({ seed: 7103, territoryCount: 18, regionCount: 3, landform: "archipelago" }), expected = geometry(original);
  const changes = [
    ...api.WAR_PLANET_SURFACES_V103.map(surface => ({ surface })), ...api.WAR_PLANET_BIOMES_V103.map(landBiome => ({ landBiome })),
    ...api.WAR_PLANET_ATMOSPHERES_V103.map(atmosphere => ({ atmosphere })), { biomeDiversity: "uniform" },
    ...["landVariant", "surfaceVariant"].flatMap(field => materials.PLANET_MATERIAL_VARIANTS_V103.map(value => ({ [field]: value }))),
    ...["landScale", "surfaceScale"].flatMap(field => materials.PLANET_MATERIAL_SCALES_V103.map(value => ({ [field]: value }))),
    ...["landContrast", "surfaceContrast"].flatMap(field => materials.PLANET_MATERIAL_CONTRASTS_V103.map(value => ({ [field]: value }))),
    ...materials.PLANET_LAND_PALETTES_V103.map(landPalette => ({ landPalette })), ...materials.PLANET_SURFACE_PALETTES_V103.map(surfacePalette => ({ surfacePalette })),
  ];
  for (const change of changes) {
    const next = generate({ ...original.procedural.recipe, ...change });
    assert.deepEqual(geometry(next), expected, JSON.stringify(change));
    assert.equal(next.name, original.name);
    assert.deepEqual(next.procedural.landmasses.map(mass => mass.name), original.procedural.landmasses.map(mass => mass.name));
  }
});

test("geographic modules and territorial format each alter actual geometry while hydrology preserves the underlying partition", () => {
  const original = generate(), expected = digest(geometry(original));
  for (const change of [{ seed: 1038508 }, { territoryCount: 72 }, { regionCount: 12 }, { regionBalance: "uneven" }, { territoryStyle: "compact" }, { landCoverage: "low" }, { coast: "lobed" }, { coast: "smooth" }, { coast: "rugged" }, { coast: "fjords" }, { landform: "supercontinent" }, { landform: "shattered" }, { arrangement: "equatorial" }, { arrangement: "polar" }, { arrangement: "hemispheres" }]) assert.notEqual(digest(geometry(generate(change))), expected, JSON.stringify(change));
  assert.ok(original.definitions.some(site => site.neighbors.length >= 5), "Voronoi territories are not a regular four-neighbor grid");
  for (const landform of api.WAR_PLANET_LANDFORMS_V103) {
    const fractions = api.WAR_PLANET_COVERAGES_V103.map(landCoverage => generate({ seed: 91, territoryCount: 18, regionCount: 3, landform, landCoverage }).landFraction);
    assert.ok(fractions[0] < fractions[1] && fractions[1] < fractions[2]);
  }
  const dry = geometry(generate({ hydrology: "none" })), wet = geometry(original);
  assert.deepEqual(dry.territories, wet.territories);
  assert.deepEqual(dry.landmasses, wet.landmasses);
  assert.deepEqual(dry.adjacency, wet.adjacency);
  assert.deepEqual(dry.strategy, wet.strategy);
});

test("cold regeneration, bounded LRU and cheap catalogue summaries preserve complete identity", () => {
  const original = generate({ seed: 103117, territoryCount: 18, regionCount: 3 }), expected = digest(original), old = api.generatedWarPlanetV103(original.id);
  assert.equal(digest(old), expected);
  assert.equal(digest(generate(original.procedural.recipe)), expected);
  assert.ok(Object.isFrozen(original) && Object.isFrozen(original.procedural.strategy.startingTerritoryIds) && Object.isFrozen(original.territories[0].points));
  assert.throws(() => { original.territories[0].points[0][0] = 99; }, TypeError);
  for (const overrides of [{}, { territoryCount: 96, regionCount: 12, surface: "lava" }, { seed: 0xffffffff, landBiome: "fungal", surface: "mist" }]) {
    const world = generate(overrides), summary = api.describeWarPlanetV103(world.id);
    for (const field of ["id", "name", "subtitle", "landBiome", "surface", "style"]) assert.deepEqual(summary[field], world[field]);
    assert.equal(summary.territoryCount, world.territories.length); assert.equal(summary.regionCount, world.regions.length); assert.equal(summary.version, 103);
    assert.equal(Object.hasOwn(summary, "territories"), false);
  }
  for (let seed = 0; seed < api.WAR_GENERATED_PLANET_CACHE_LIMIT_V103 + 1; seed++) api.generatedWarPlanetV103(api.encodeWarPlanetV103(recipe({ seed, territoryCount: 18, regionCount: 3, hydrology: "none", landform: "supercontinent" })));
  const fresh = api.generatedWarPlanetV103(original.id);
  assert.notEqual(fresh, old);
  assert.equal(digest(fresh), expected);
  assert.equal(api.describeWarPlanetV103("proc-v103-invalid"), undefined);
  assert.equal(api.generatedWarPlanetV103("proc-v103-invalid"), undefined);
});

test("published V103 codes preserve fixed geography, hydrology, route and gameplay-site fingerprints", () => {
  // A recipe is an archive identity. Do not replace these compatibility
  // references during an ordinary refactor: a changed world needs V104+.
  // The max-seed fixture also locks the repaired CON-T07 shared fan corner.
  const expected = {
    "proc-v103-m9bf-331013100011300111100-m6545": "60ae6ac723e72211fd166597f00806f4ea7a7faf991682987a0d29a53e2fd827",
    "proc-v103-hrr7-002114100011300111100-6j2cj": "3dc08cdfc9b30858d7d1a27d6bd939e8e027e2498c1a6d82bfbb2c7ab4a07077",
    "proc-v103-1z141z3-541022110011300111100-t5j3n": "d1ac652fad68294ece565a0ed0d3aa00ca75bff5898c7b4275706be6feade59e",
  };
  for (const [code, fingerprint] of Object.entries(expected)) {
    const planet = api.generatedWarPlanetV103(code);
    assert.ok(planet, "published V103 code must remain resolvable");
    assert.equal(digest(geometry(planet)), fingerprint, `${code}: changes require a new generator version`);
  }
});
