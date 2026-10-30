import type { WarPlanetV96 } from "./clanWarPlanetsV96";
import type { WarPlanetProceduralV103 } from "./clanWarPlanetGeneratorV103";
import type { WarPlanetProceduralV115 } from "./clanWarPlanetGeneratorV115";
import { planetArcKilometersV115 } from "./clanWarShapeAtlasV115";

export interface WarPlanetRegionStrategyV114 {
  regionId: string;
  name: string;
  territoryCount: number;
  neighboringRegionIds: string[];
  borderLinks: number;
  crossingLinks: number;
  income: { s: number; m: number; i: number };
  chokepointTerritoryIds: string[];
  headquarters: ("CON-F01" | "CON-F02")[];
}

export interface WarPlanetStrategicDossierV114 {
  territoryCount: number;
  regionCount: number;
  topology: "continental" | "insular" | "fragmented";
  scale: "compact" | "standard" | "extended" | "grand";
  headquarters: { "CON-F01": string; "CON-F02": string };
  headquartersDistance: number;
  headquartersDistanceKm?: number;
  headquartersPath: string[];
  crossingCount: number;
  chokepointTerritoryIds: string[];
  regions: WarPlanetRegionStrategyV114[];
}

function proceduralV103(planet: WarPlanetV96): WarPlanetProceduralV103 | WarPlanetProceduralV115 | null {
  const procedural = planet.procedural as unknown;
  if (!procedural || typeof procedural !== "object" || !("recipe" in procedural)) return null;
  const recipe = (procedural as { recipe?: { version?: unknown } }).recipe;
  return recipe?.version === 103 || recipe?.version === 115 ? procedural as WarPlanetProceduralV103 | WarPlanetProceduralV115 : null;
}

function graphFor(planet: WarPlanetV96): Map<string, Set<string>> {
  const ids = new Set(planet.definitions.map(item => item.id));
  return new Map<string, Set<string>>(planet.definitions.map(item =>
    [item.id, new Set(item.neighbors.filter(id => ids.has(id)))] as const
  ));
}

function shortestPath(graph: Map<string, Set<string>>, start: string, target: string): string[] {
  if (start === target) return [start];
  const queue = [start], parent = new Map<string, string | null>([[start, null]]);
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const next of [...(graph.get(current) ?? [])].sort()) {
      if (parent.has(next)) continue;
      parent.set(next, current);
      if (next === target) {
        const path = [target];
        let cursor: string | null = current;
        while (cursor) { path.push(cursor); cursor = parent.get(cursor) ?? null; }
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return [];
}

function articulationPoints(graph: Map<string, Set<string>>): string[] {
  let time = 0;
  const discovery = new Map<string, number>(), low = new Map<string, number>(), parent = new Map<string, string | null>();
  const points = new Set<string>();
  function visit(node: string) {
    discovery.set(node, ++time); low.set(node, time);
    let children = 0;
    for (const next of [...(graph.get(node) ?? [])].sort()) {
      if (!discovery.has(next)) {
        parent.set(next, node); children++; visit(next);
        low.set(node, Math.min(low.get(node)!, low.get(next)!));
        if ((parent.get(node) == null && children > 1) || (parent.get(node) != null && low.get(next)! >= discovery.get(node)!)) points.add(node);
      } else if (next !== parent.get(node)) low.set(node, Math.min(low.get(node)!, discovery.get(next)!));
    }
  }
  for (const node of [...graph.keys()].sort()) if (!discovery.has(node)) { parent.set(node, null); visit(node); }
  return [...points].sort();
}

function headquartersFor(planet: WarPlanetV96, procedural: WarPlanetProceduralV103 | WarPlanetProceduralV115 | null) {
  if (procedural) return procedural.strategy.headquarters;
  const choose = (faction: "CON-F01" | "CON-F02") =>
    planet.definitions.find(item => item.initialController === faction)?.id ?? planet.definitions[0]?.id ?? "";
  return { "CON-F01": choose("CON-F01"), "CON-F02": choose("CON-F02") };
}

function topologyFor(planet: WarPlanetV96, procedural: WarPlanetProceduralV103 | WarPlanetProceduralV115 | null): WarPlanetStrategicDossierV114["topology"] {
  if (!procedural) return planet.landmasses.length > Math.max(4, planet.regions.length) ? "fragmented" : planet.landmasses.length > 1 ? "insular" : "continental";
  if (procedural.recipe.landform === "shattered") return "fragmented";
  if (procedural.recipe.landform === "archipelago") return "insular";
  return "continental";
}

function scaleFor(count: number): WarPlanetStrategicDossierV114["scale"] {
  if (count <= 24) return "compact";
  if (count <= 48) return "standard";
  if (count <= 72) return "extended";
  return "grand";
}

/** Pure derived intelligence. No campaign state, hidden roster or enemy stock is read. */
export function analyzeWarPlanetStrategyV114(planet: WarPlanetV96): WarPlanetStrategicDossierV114 {
  const graph = graphFor(planet), procedural = proceduralV103(planet);
  const headquarters = headquartersFor(planet, procedural);
  const path = shortestPath(graph, headquarters["CON-F01"], headquarters["CON-F02"]);
  const chokepoints = articulationPoints(graph);
  // Capture the V115 discriminant outside asynchronous/iterator callbacks.
  // A V102/V103 world keeps the historical unitless distance.
  const planetSizeV115 = procedural?.recipe.version === 115 ? procedural.recipe.planetSize : null;
  const territoryRegion = new Map<string, string>();
  for (const region of planet.regions) for (const id of region.territoryIds) territoryRegion.set(id, region.id);

  const crossingRoutes = procedural?.routes.filter(route => route.kind === "crossing") ?? [];

  const definitionById = new Map(planet.definitions.map(item => [item.id, item] as const));
  const regionName = new Map(planet.regions.map(item => [item.id, item.name] as const));
  const regions = planet.regions.map(region => {
    const neighboring = new Set<string>();
    let borderLinks = 0, s = 0, m = 0, i = 0;
    const members = new Set(region.territoryIds);
    // A crossing belongs to each region it touches, but only once per region.
    // Half-counting endpoints would discard cross-region links entirely.
    const crossingLinks = crossingRoutes.filter(route => members.has(route.fromId) || members.has(route.toId)).length;
    for (const territoryId of region.territoryIds) {
      const definition = definitionById.get(territoryId);
      if (definition) {
        s += definition.income.s; m += definition.income.m; i += definition.income.i;
      }
      for (const next of graph.get(territoryId) ?? []) {
        const other = territoryRegion.get(next);
        if (other && other !== region.id) { neighboring.add(other); borderLinks++; }
      }
    }
    const headquartersInRegion = (["CON-F01", "CON-F02"] as const).filter(faction => territoryRegion.get(headquarters[faction]) === region.id);
    return {
      regionId: region.id, name: regionName.get(region.id) ?? region.id, territoryCount: region.territoryIds.length,
      neighboringRegionIds: [...neighboring].sort(), borderLinks, crossingLinks,
      income: { s, m, i }, chokepointTerritoryIds: chokepoints.filter(id => territoryRegion.get(id) === region.id),
      headquarters: headquartersInRegion,
    };
  });

  return {
    territoryCount: planet.territories.length, regionCount: planet.regions.length,
    topology: topologyFor(planet, procedural), scale: scaleFor(planet.territories.length), headquarters,
    headquartersDistance: Math.max(0, path.length - 1),
    ...(planetSizeV115 !== null ? {
      headquartersDistanceKm: Math.round(path.slice(1).reduce((distance, target, index) => {
        const source = path[index];
        const route = procedural.routes.find(item => (item.fromId === source && item.toId === target) || (item.fromId === target && item.toId === source));
        return distance + (route ? planetArcKilometersV115(route.distanceDegrees, planetSizeV115) : 0);
      }, 0)),
    } : {}),
    headquartersPath: path,
    crossingCount: crossingRoutes.length, chokepointTerritoryIds: chokepoints, regions,
  };
}
