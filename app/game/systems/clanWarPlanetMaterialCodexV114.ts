import type { WarPlanetLandBiomeV96, WarPlanetSurfaceKindV96, WarPlanetV96 } from "./clanWarPlanetsV96";
import { WAR_BIOME_LABELS_V96, WAR_SURFACE_LABELS_V96 } from "./clanWarPlanetLabelsV102";

interface MaterialDescription { substrate: string; structure: string; peculiarity: string }

/** All biome entries correspond to the published, immutable V103 material IDs. */
export const WAR_PLANET_LAND_MATERIAL_CODEX_V114: Readonly<Record<WarPlanetLandBiomeV96, MaterialDescription>> = Object.freeze({
  temperate: { substrate: "Terre minérale et humus", structure: "Versants boisés, alluvions et clairières", peculiarity: "Lisières et vallées servent de repères aux frontières régionales." },
  jungle: { substrate: "Sol ferrugineux et racines", structure: "Canopées serrées, méandres et escarpements", peculiarity: "La végétation ne donne aucun camouflage automatique." },
  tundra: { substrate: "Permafrost, cailloutis et lichens", structure: "Plaques gelées, vallons ouverts et mousses", peculiarity: "La neige et la roche distinguent les plaines froides." },
  snow: { substrate: "Glace compactée et roche", structure: "Congères, crevasses et plateaux", peculiarity: "Les fissures sont graphiques, sans collisions supplémentaires." },
  desert: { substrate: "Sable, grès et lits asséchés", structure: "Dunes, ergs rocheux et regs", peculiarity: "Les crêtes soulignent le relief sans modifier les routes." },
  volcanic: { substrate: "Basalte, scories et soufre", structure: "Coulées vitrifiées et champs de lave fossile", peculiarity: "Les lueurs volcaniques sont exportables séparément." },
  salt: { substrate: "Halite, argiles et croûtes de sel", structure: "Polygones de dessiccation et cuvettes minérales", peculiarity: "Un bassin salin ne suppose pas d'eau liquide." },
  mountain: { substrate: "Roche métamorphique et éboulis", structure: "Crêtes, ravins et moraines", peculiarity: "L'altitude apparente ne change pas le graphe des passages." },
  ocean: { substrate: "Sables humides, galets et récifs", structure: "Plages, promontoires et lagunes", peculiarity: "Le littoral reste indépendant du calque de mer." },
  swamp: { substrate: "Tourbe, limon et sédiments organiques", structure: "Tourbières, chenaux et racines", peculiarity: "Les véritables traversées restent définies par les routes." },
  crystal: { substrate: "Réseaux silicatés extraterrestres", structure: "Aiguilles, filons et druses polygonales", peculiarity: "Les veines lumineuses ne créent pas de revenu implicite." },
  fungal: { substrate: "Mycélium et roches poreuses", structure: "Colonnes, réseaux de spores et alvéoles", peculiarity: "Les spores atmosphériques sont un calque indépendant du sol." },
  irradiated: { substrate: "Poussières altérées et roches fissurées", structure: "Trames décolorées et dépôts brillants", peculiarity: "L'irradiation visuelle n'inflige aucun dégât automatique." },
});

export const WAR_PLANET_SURFACE_MATERIAL_CODEX_V114: Readonly<Record<WarPlanetSurfaceKindV96, MaterialDescription & { state: "liquid" | "solid" | "particulate" | "aerosol" }>> = Object.freeze({
  water: { state: "liquid", substrate: "Eau et sels dissous", structure: "Houle, courants et écume", peculiarity: "Les reflets sont indépendants des nuages et des côtes." },
  acid: { state: "liquid", substrate: "Bain corrosif extraterrestre", structure: "Tourbillons et vapeurs", peculiarity: "Un détroit est franchissable uniquement si une route l'autorise." },
  ice: { state: "solid", substrate: "Glace superficielle", structure: "Banquise et fractures", peculiarity: "Cette surface ne devient pas automatiquement praticable." },
  sand: { state: "particulate", substrate: "Sédiments éoliens", structure: "Crêtes et vagues de sable", peculiarity: "Une mer peut être composée de particules et non d'eau." },
  lava: { state: "liquid", substrate: "Roche fondue", structure: "Coulées et plaques refroidies", peculiarity: "La luminosité est traitée dans le calque émissif." },
  brine: { state: "liquid", substrate: "Solution saline concentrée", structure: "Nappes et dendrites", peculiarity: "La couleur ne change pas l'économie des territoires." },
  radioactive: { state: "liquid", substrate: "Fluide altéré", structure: "Circulations troubles et lueurs", peculiarity: "La texture ne crée pas de mécanisme de radiation." },
  crystal: { state: "solid", substrate: "Cristaux interconnectés", structure: "Plaques polygonales et filaments", peculiarity: "Une étendue solide peut séparer des continents sans être conquérable." },
  spores: { state: "particulate", substrate: "Dépôts biologiques", structure: "Tapis de particules", peculiarity: "Les particules aériennes sont distinctes du sol." },
  mist: { state: "aerosol", substrate: "Brouillard et aérosols", structure: "Volutes et bassins opaques", peculiarity: "La frontière géographique ne devient pas un plan d'eau." },
});

/** Descriptions derived from exact published region IDs, with no modification of saves or combat. */
export function describeWarPlanetMaterialsV114(planet: WarPlanetV96) {
  const regionBiomes = new Map(planet.procedural?.regions.map(item => [item.regionId, item.biome] as const) ?? []);
  const regions = planet.regions.map(region => {
    const biome = regionBiomes.get(region.id) ?? planet.landBiome;
    const material = planet.procedural?.recipe.version === 126
      ? planet.procedural.regionalMaterialAssignments.find(item => item.regionId === region.id)
      : null;
    return { regionId: region.id, regionName: region.name, biome,
      title: material ? `${WAR_BIOME_LABELS_V96[biome]} · ${material.landMaterialName}` : WAR_BIOME_LABELS_V96[biome],
      sourceTextureId: material?.landMaterialId ?? `land-${biome}`,
      ...WAR_PLANET_LAND_MATERIAL_CODEX_V114[biome],
      ...(material ? { peculiarity: `${material.description}. ${WAR_PLANET_LAND_MATERIAL_CODEX_V114[biome].peculiarity}` } : {}),
    };
  });
  const kind = planet.surface.kind;
  return {
    code: planet.id,
    surface: { kind, title: WAR_SURFACE_LABELS_V96[kind],
      sourceTextureId: planet.procedural?.recipe.version === 126
        ? planet.procedural.globalLiquidAssignment.id : `surface-${kind}`,
      ...WAR_PLANET_SURFACE_MATERIAL_CODEX_V114[kind] },
    regions,
    rule: "Descriptions et textures uniquement : aucun changement implicite aux déplacements, dégâts, revenus ou routes.",
  };
}
