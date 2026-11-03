import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

// V156 level-design contract for the thirty clan-war worlds: what the atlas
// draws as a land border is a road, old roads (and therefore saved orders)
// survive, and no world degenerates into a single-file corridor.
const bundle = await build({
  stdin: { contents: "export * from './app/game/systems/clanWarPlanetsV96';", resolveDir: fileURLToPath(new URL("../", import.meta.url)) },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const planets = api.WAR_PLANETS_V96;
const baseline = JSON.parse(fs.readFileSync(new URL("./fixtures/clan-war-routes-v96-baseline.json", import.meta.url), "utf8")).planets;
const edgeKey = (a, b) => [a.join(","), b.join(",")].sort().join("|");
const edges = tile => new Set(tile.points.map((point, index) => edgeKey(point, tile.points[(index + 1) % tile.points.length])));
const sharedEdges = (a, b) => { const own = edges(a); let count = 0; for (const edge of edges(b)) if (own.has(edge)) count++; return count; };
const graph = planet => new Map(planet.definitions.map(territory => [territory.id, new Set(territory.neighbors)]));

test("every pre-V156 road is still present on all thirty worlds", () => {
  assert.equal(Object.keys(baseline).length, 30);
  for (const planet of planets) {
    const roads = graph(planet);
    for (const [id, neighbors] of Object.entries(baseline[planet.id])) for (const neighbor of neighbors) assert(roads.get(id).has(neighbor), `${planet.id} lost ${id}-${neighbor}`);
  }
  const korthas = api.warPlanetV96("korthas");
  for (const territory of korthas.definitions) assert.deepEqual(territory.neighbors, baseline.korthas[territory.id], "the Korthas workbook graph is unchanged");
});

for (const planet of planets) test(`${planet.name}: drawn land borders are roads and the map has no corridor dead ends`, () => {
  const roads = graph(planet), tiles = planet.territories;
  for (let first = 0; first < tiles.length; first++) for (let second = first + 1; second < tiles.length; second++) {
    const a = tiles[first], b = tiles[second];
    if (sharedEdges(a, b) >= 2) assert(roads.get(a.id).has(b.id), `${a.id}/${b.id} share a drawn land border but have no road`);
    // A road between two non-touching tiles of one continent is an undrawn
    // shortcut. The few that predate V156 are kept for save compatibility;
    // no new one may be introduced.
    else if (roads.get(a.id).has(b.id) && a.landmassId === b.landmassId) assert(baseline[planet.id][a.id].includes(b.id), `${a.id}/${b.id} new road crosses no sea and no border`);
  }
  for (const [id, neighbors] of roads) assert(neighbors.size >= 2, `${id} is a dead end`);
  // No single territory may cut the map in two (Tarjan articulation points).
  let clock = 0; const entry = new Map(), low = new Map(), cuts = new Set();
  const visit = (vertex, parent) => {
    entry.set(vertex, clock); low.set(vertex, clock++); let children = 0;
    for (const next of roads.get(vertex)) {
      if (next === parent) continue;
      if (entry.has(next)) { low.set(vertex, Math.min(low.get(vertex), entry.get(next))); continue; }
      visit(next, vertex); low.set(vertex, Math.min(low.get(vertex), low.get(next))); children++;
      if (parent && low.get(next) >= entry.get(vertex)) cuts.add(vertex);
    }
    if (!parent && children > 1) cuts.add(vertex);
  };
  visit("CON-T01", null);
  assert.equal(entry.size, 36);
  assert.deepEqual([...cuts], [], "no territory is a mandatory chokepoint for the whole map");
  let diameter = 0;
  for (const source of roads.keys()) {
    const distance = new Map([[source, 0]]), queue = [source];
    while (queue.length) { const current = queue.shift(); for (const next of roads.get(current)) if (!distance.has(next)) { distance.set(next, distance.get(current) + 1); queue.push(next); } }
    diameter = Math.max(diameter, ...distance.values());
  }
  assert(diameter <= 13, `crossing the map takes ${diameter} steps`);
});

test("acid worlds are described as corrosive basalt, not wetlands", () => {
  for (const planet of planets.filter(world => world.style === "exotic" && world.surface.kind === "acid")) {
    assert.notEqual(planet.landBiome, "swamp", planet.id);
    assert.doesNotMatch(planet.description, /marécage/i, planet.id);
    assert.match(planet.description, /corrosi|acide/i, planet.id);
  }
  assert.equal(api.warPlanetV96("chloris").landBiome, "swamp", "the classical peat-marsh world keeps its biome");
});
