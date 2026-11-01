import type { WarPlanetV96 } from "./clanWarPlanetsV96";
import { sphericalPolygonAreaV103 } from "./clanWarPlanetGeographyV103";
import { PLANET_RADII_KM_V115, WAR_SHAPE_TEMPLATES_V115, type PlanetSizeV115 } from "./clanWarShapeAtlasV115";

/**
 * Read-only, recipe-derived physical coverage. These are projected areas of
 * existing authored polygons, not a new set of borders or combat distances.
 * Older planets deliberately have no inferred radius.
 */
export interface WarPlanetPhysicalIndexV125 {
  planetId: string;
  planetSize: PlanetSizeV115;
  radiusKm: number;
  diameterKm: number;
  circumferenceKm: number;
  surfaceKm2: number;
  landAreaKm2: number;
  surroundingsKm2: number;
  territories: { id: string; regionId: string; landmassId: string | null; areaKm2: number }[];
  regions: { id: string; name: string; territoryCount: number; projectedAreaKm2: number; percentageOfLand: number }[];
  landmasses: { id: string; areaKm2: number; territoryCount: number; category: "island" | "continent" }[];
  routes: { fromId: string; toId: string; distanceKm: number }[];
  scaleNote: string;
}

const finiteArea = (value: number) => Number.isFinite(value) && value >= 0 ? value : 0;
const km2 = (points: readonly (readonly [number, number])[], radius: number) =>
  Math.round(finiteArea(sphericalPolygonAreaV103(points)) * radius * radius);

export function analyzeWarPlanetPhysicalIndexV125(planet: WarPlanetV96): WarPlanetPhysicalIndexV125 | null {
  const procedural = planet.procedural;
  if (!procedural || procedural.recipe.version !== 115 || !("physical" in procedural)) return null;
  const size = procedural.recipe.planetSize;
  const radiusKm = PLANET_RADII_KM_V115[size];
  const regionOf = new Map(planet.territories.map(t => [t.id, t.regionId] as const));
  const territories = planet.territories.map(t => ({
    id: t.id, regionId: t.regionId, landmassId: t.landmassId ?? null,
    areaKm2: km2(t.points, radiusKm),
  }));
  const byId = new Map(territories.map(t => [t.id, t] as const));
  const landArea = Math.max(0, procedural.physical.landAreaKm2);
  const regions = planet.regions.map(r => {
    const projectedAreaKm2 = r.territoryIds.reduce((sum, id) => sum + (byId.get(id)?.areaKm2 ?? 0), 0);
    return { id: r.id, name: r.name, territoryCount: r.territoryIds.length,
      projectedAreaKm2, percentageOfLand: landArea ? Math.round(projectedAreaKm2 / landArea * 1000) / 10 : 0 };
  });
  const landmasses = planet.landmasses.map(m => {
    const territoryCount = territories.filter(t => t.landmassId === m.id).length;
    return { id: m.id, areaKm2: km2(m.points, radiusKm), territoryCount,
      category: territoryCount >= Math.max(6, planet.territories.length / 10) ? "continent" as const : "island" as const };
  });
  return {
    planetId: planet.id, planetSize: size, radiusKm,
    diameterKm: procedural.physical.diameterKm, circumferenceKm: procedural.physical.circumferenceKm,
    surfaceKm2: procedural.physical.surfaceKm2, landAreaKm2: landArea,
    surroundingsKm2: Math.max(0, procedural.physical.surfaceKm2 - landArea),
    territories, regions, landmasses,
    routes: procedural.physical.routeDistancesKm.map(route => ({ ...route })),
    scaleNote: "Les aires sont calculées sur les polygones sphériques existants et arrondies. Les régions correspondent à la somme brute des cellules, sans soustraction locale des lacs/chenaux. La taille physique ne modifie ni les frontières, ni les coûts de guerre.",
  };
}

/** The full 120-form library is available for UI/catalog exports without
 * instantiating 120 worlds or allocating 120 atlas meshes. */
export function describeWarPlanetShapeCatalogV125() {
  return (["island", "continent", "region"] as const).flatMap(category =>
    WAR_SHAPE_TEMPLATES_V115[category].map(template => ({
      id: template.id, index: template.index, category, name: template.name,
      description: template.description, footprintScale: template.scale,
      primaryLobes: template.primaryLobes, secondaryLobes: template.secondaryLobes,
      sharpness: template.sharpness, eccentricity: template.eccentricity,
    }))
  );
}
