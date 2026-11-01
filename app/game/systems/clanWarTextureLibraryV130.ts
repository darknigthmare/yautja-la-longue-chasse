import {
  WAR_PLANET_TEXTURES_V125, createPlanetTextureCanvasV125, findPlanetTextureV125,
  type PlanetTextureDefinitionV125, type PlanetTextureChannelV125,
} from "./clanWarTextureLibraryV125";

/** Additive regional studies. Each V130 variant has a separate noise seed and
 * palette but inherits a V125 tileable morphology. These are not film/PHG UVs. */
type Study = readonly [
  string, string, string, string, readonly [number, number, number], number, number, number
];
const studies: readonly Study[] = [
  ["land-granite-talus", "Éboulis granitique", "land-karst", "Roches froides, éboulis et cassures", [129,129,131], .83, 0, 2001],
  ["land-salt-pan", "Polygones de sel", "land-redclay", "Croûte saline sèche aux fissures claires", [209,201,181], .82, 0, 2003],
  ["land-mangrove-silt", "Limon de mangrove", "land-riverdelta", "Racines émergentes, alluvions et vase", [85,103,75], .88, 0, 2007],
  ["land-dark-moraine", "Moraine sombre", "land-gravel", "Pierres glaciaires et dépôts froids", [102,118,126], .76, 0, 2011],
  ["land-cryo-glass", "Cryoverre étoilé", "land-hex-prism", "Prismes gelés sur une croûte extraterrestre", [91,164,208], .38, .07, 2017],
  ["land-ferrospore", "Ferrosphères sporifères", "land-spore-bed", "Nodules ferreux portant des spores fictives", [94,88,143], .69, .15, 2027],
  ["land-ceramic-coral", "Corail céramique", "land-bioceramic", "Plaques littorales biomécaniques", [151,95,124], .54, .09, 2029],
  ["land-amber-fossils", "Dunes fossiles ambrées", "land-glass-erg", "Lentilles ambrées et strates vitrifiées", [187,125,71], .57, .04, 2039],
  ["liquid-tropical-lagoon", "Lagon turquoise", "liquid-estuary", "Remous clairs de littoral tropical", [73,179,185], .12, 0, 2041],
  ["liquid-glacial-melt", "Eau de fonte glaciaire", "liquid-iceflow", "Écoulements bleutés entre plaques de glace", [137,195,212], .23, 0, 2053],
  ["liquid-mangrove-tide", "Marée de mangrove", "liquid-bogwater", "Chenaux lents et sédiments côtiers", [67,122,102], .3, 0, 2063],
  ["liquid-brackish-estuary", "Estuaire saumâtre", "liquid-saltlake", "Bandes de salinité et d'eau douce", [105,146,132], .22, 0, 2069],
  ["liquid-methane-mirror", "Miroir cryohydrocarboné", "liquid-cryo-solvent", "Solvant extraterrestre froid sous une croûte", [73,109,148], .11, .09, 2081],
  ["liquid-violet-foam", "Écume acide violette", "liquid-violet-acid", "Bulles et marbrures corrosives fictives", [168,73,161], .21, .34, 2083],
  ["liquid-glass-magma", "Magma vitrifiant", "liquid-magma-crust", "Verre noir et crevasses thermiques lumineuses", [187,74,50], .58, .58, 2087],
  ["liquid-mercury-tide", "Marée métallofluide", "liquid-mercury-film", "Ondulations métalliques dans un solvant imaginaire", [154,179,202], .08, .06, 2089],
];
interface StudySource extends PlanetTextureDefinitionV125 { baseId: string; seedSalt: number }
const additional: readonly StudySource[] = Object.freeze(studies.map(([id, name, baseId, description, baseColor, roughness, emission, seedSalt]) => {
  const base = findPlanetTextureV125(baseId);
  if (!base) throw new Error("V130 base source missing: " + baseId);
  return Object.freeze({ ...base, id, name, description, baseColor, roughness, emission, baseId, seedSalt });
}));
export const WAR_PLANET_TEXTURES_V130: readonly PlanetTextureDefinitionV125[] =
  Object.freeze([...WAR_PLANET_TEXTURES_V125, ...additional]);
export const WAR_PLANET_TEXTURE_COUNT_V130 = 48;
export function findPlanetTextureV130(id: string): PlanetTextureDefinitionV125 | undefined {
  return WAR_PLANET_TEXTURES_V130.find(item => item.id === id);
}
const channelClamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

/** Five independently exportable channels. Old V125 IDs dispatch unchanged. */
export function createPlanetTextureCanvasV130(
  id: string, channel: PlanetTextureChannelV125 = "albedo", size = 256, seed = 0,
): HTMLCanvasElement {
  const variant = additional.find(item => item.id === id);
  if (!variant) return createPlanetTextureCanvasV125(id, channel, size, seed);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError("Graine V130 invalide.");
  const source = findPlanetTextureV125(variant.baseId)!;
  const canvas = createPlanetTextureCanvasV125(source.id, channel, size, (seed ^ variant.seedSalt) >>> 0);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas V130 indisponible.");
  const image = context.getImageData(0, 0, size, size);
  const rgba = image.data;
  for (let offset = 0; offset < rgba.length; offset += 4) {
    if (channel === "albedo") {
      for (let k = 0; k < 3; k++)
        rgba[offset + k] = channelClamp(rgba[offset + k] + variant.baseColor[k] - source.baseColor[k]);
    } else if (channel === "roughness") {
      const value = channelClamp(rgba[offset] + (variant.roughness - source.roughness) * 255);
      rgba[offset] = value; rgba[offset + 1] = value; rgba[offset + 2] = value;
    } else if (channel === "emissive" && source.emission > 0) {
      const ratio = variant.emission / source.emission;
      for (let k = 0; k < 3; k++) rgba[offset + k] = channelClamp(
        rgba[offset + k] * ratio * (variant.baseColor[k] + 1) / (source.baseColor[k] + 1));
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}
