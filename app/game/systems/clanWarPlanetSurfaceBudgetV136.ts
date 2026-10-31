import type { WarPlanetV96 } from "./clanWarPlanetsV96";
import { sphericalPolygonAreaV103 } from "./clanWarPlanetGeographyV103";
import { PLANET_RADII_KM_V115 } from "./clanWarShapeAtlasV115";

/** V136 is a read-only geographic accounting sidecar.
 * No existing world code, territorial boundary, liquid or war resource changes. */
export interface PlanetPhysicalSurfaceBudgetV136 {
  worldCode: string;
  radiusKm: number;
  surfaceKm2: number;
  dryLandKm2: number;
  inlandMediumKm2: number;
  exteriorMediumKm2: number;
  grossContinentalKm2: number;
  coastCoveragePercent: number;
  inlandFeatureCount: number;
  regions: {
    regionId: string;
    regionName: string;
    grossTerritoryKm2: number;
    inlandAllocationKm2: number;
    estimatedNetDryKm2: number;
    shareOfNetMappedLandPercent: number;
  }[];
  landmasses: {
    landmassId: string;
    name: string;
    grossFootprintKm2: number;
    physicalBand: "islet" | "island" | "subcontinental" | "continental" | "supercontinental";
  }[];
  notes: readonly string[];
}

const bandV136 = (km2: number): PlanetPhysicalSurfaceBudgetV136["landmasses"][number]["physicalBand"] =>
  km2 < 10000 ? "islet" : km2 < 1000000 ? "island" :
    km2 < 10000000 ? "subcontinental" : km2 < 80000000 ? "continental" : "supercontinental";

const areaKm2 = (points: readonly (readonly [number, number])[], radiusKm: number): number =>
  Math.round(Math.abs(sphericalPolygonAreaV103(points)) * radiusKm * radiusKm);

/** One authoritative sphere budget, with additive zero-effect regional
 * estimates derived from the already-frozen map and hydrology polygons.
 * The global land area is the native V115 physical result, which ALREADY
 * subtracts coveredFraction; do not subtract inland areas twice. */
export function analyzePlanetPhysicalSurfaceV136(planet: WarPlanetV96): PlanetPhysicalSurfaceBudgetV136 | null {
  const procedural = planet.procedural;
  if (!procedural || procedural.recipe.version !== 115 || !("physical" in procedural)) return null;
  const radiusKm = PLANET_RADII_KM_V115[procedural.recipe.planetSize];
  const surfaceKm2 = procedural.physical.surfaceKm2;
  const dryLandKm2 = procedural.physical.landAreaKm2;
  const inlandMediumKm2 = Math.round(surfaceKm2 * procedural.hydrology.coveredFraction);
  const exteriorMediumKm2 = Math.max(0, surfaceKm2 - dryLandKm2 - inlandMediumKm2);
  const grossContinentalKm2 = dryLandKm2 + inlandMediumKm2;

  const regionGross = new Map(planet.regions.map(region => [region.id, 0]));
  for (const territory of planet.territories) {
    if (!regionGross.has(territory.regionId)) continue;
    regionGross.set(territory.regionId, regionGross.get(territory.regionId)! + areaKm2(territory.points, radiusKm));
  }
  const regionalInland = new Map(planet.regions.map(region => [region.id, 0]));
  for (const feature of procedural.hydrology.features) {
    const members = [...new Set(feature.regionIds)].filter(id => regionalInland.has(id));
    if (!members.length) continue;
    const squareKm = areaKm2(feature.points, radiusKm), perRegion = squareKm / members.length;
    for (const id of members) regionalInland.set(id, regionalInland.get(id)! + perRegion);
  }
  const preliminary = planet.regions.map(region => {
    const grossTerritoryKm2 = regionGross.get(region.id) ?? 0;
    const inlandAllocationKm2 = Math.min(grossTerritoryKm2, Math.round(regionalInland.get(region.id) ?? 0));
    return {
      regionId: region.id, regionName: region.name,
      grossTerritoryKm2,
      inlandAllocationKm2,
      estimatedNetDryKm2: Math.max(0, grossTerritoryKm2 - inlandAllocationKm2),
    };
  });
  const mappedNetTotal = preliminary.reduce((sum, region) => sum + region.estimatedNetDryKm2, 0);
  const regions = preliminary.map(region => ({
    ...region,
    shareOfNetMappedLandPercent: mappedNetTotal
      ? Math.round(region.estimatedNetDryKm2 / mappedNetTotal * 1000) / 10 : 0,
  }));
  const landmasses = planet.landmasses.map(landmass => {
    const grossFootprintKm2 = areaKm2(landmass.points, radiusKm);
    return {
      landmassId: landmass.id,
      name: procedural.landmasses.find(item => item.landmassId === landmass.id)?.name ?? landmass.id,
      grossFootprintKm2,
      physicalBand: bandV136(grossFootprintKm2),
    };
  });
  return {
    worldCode: planet.id, radiusKm, surfaceKm2, dryLandKm2, inlandMediumKm2,
    exteriorMediumKm2, grossContinentalKm2,
    coastCoveragePercent: surfaceKm2 ? Math.round(grossContinentalKm2 / surfaceKm2 * 1000) / 10 : 0,
    inlandFeatureCount: procedural.hydrology.features.length, regions, landmasses,
    notes: [
      "Terres nettes = aire physique V115 deja reduite des bassins interieurs : pas de double soustraction.",
      "Surface exterieure = surface du globe moins terres nettes et bassins interieurs.",
      "Pourcentages regionaux = parts de la somme des polygones regionaux, corriges des bassins affectes.",
      "Pour une hydrologie concernant plusieurs regions, l'aire est partagee egalement : estimation et non decoupe cadastrale.",
      "La qualification physique des masses est derivee de km2 reels : elle ne modifie pas les noms, les formes ou les territoires.",
    ],
  };
}
