/** Planet V115: 120 original modular shape recipes, not 120 static pictures.
 * Four independent footprint scales per family and ten topological motifs.
 * Historical V102/V103 geometry is never passed a shape argument. */
export type WarShapeCategoryV115 = "island" | "continent" | "region";
export type PlanetSizeV115 = "dwarf" | "small" | "terran" | "large" | "giant" | "colossal";
export const PLANET_RADII_KM_V115: Readonly<Record<PlanetSizeV115, number>> = Object.freeze({
  dwarf: 1900, small: 3900, terran: 6371, large: 9700, giant: 14500, colossal: 21000,
});
export const PLANET_SIZE_LABELS_V115: Readonly<Record<PlanetSizeV115, string>> = Object.freeze({
  dwarf: "Naine — 1 900 km", small: "Petite — 3 900 km", terran: "Terrestre — 6 371 km",
  large: "Grande — 9 700 km", giant: "Géante rocheuse fictive — 14 500 km",
  colossal: "Colossale fictive — 21 000 km",
});
export interface WarShapeTemplateV115 {
  id: string;
  category: WarShapeCategoryV115;
  index: number;
  name: string;
  description: string;
  scale: number;
  primaryLobes: number;
  secondaryLobes: number;
  sharpness: number;
  eccentricity: number;
  phase: number;
}
const motifs = [
  ["Croissant", "arc dissymétrique et baie ouverte", 2, 5, .20, .12],
  ["Dorsale", "grand axe rocheux et nervures latérales", 3, 7, .12, .28],
  ["Éventail", "caps rayonnants et larges baies", 5, 9, .15, .17],
  ["Lame", "silhouette étroite aux pointes allongées", 2, 11, .13, .35],
  ["Dentelle", "petites anses et presqu'îles fines", 9, 17, .23, .07],
  ["Corolle", "lobes arrondis reliés par des isthmes", 6, 11, .18, .05],
  ["Méandre", "ligne sinueuse et golfes alternés", 3, 13, .22, .19],
  ["Trident", "trois grands promontoires et des criques", 3, 9, .25, .14],
  ["Éperon", "grand cap dominant une rive découpée", 4, 7, .16, .26],
  ["Écaille", "plaques irrégulières et bords nervurés", 7, 15, .11, .10],
] as const;
const scaleNames = ["micro", "compacte", "étendue", "immense"] as const;
const sizes = [.60, .73, .85, .98] as const;
const categoryNames: Record<WarShapeCategoryV115, string> = { island: "Île", continent: "Continent", region: "Région" };
function templates(category: WarShapeCategoryV115): readonly WarShapeTemplateV115[] {
  return Object.freeze(Array.from({ length: 40 }, (_, index) => {
    const motif = motifs[Math.floor(index / 4)];
    const scaleIndex = index % 4;
    return Object.freeze({
      id: `${category.slice(0, 3)}-${String(index + 1).padStart(2, "0")}`,
      category, index,
      name: `${categoryNames[category]} ${motif[0].toLowerCase()} ${scaleNames[scaleIndex]}`,
      description: `${motif[1]} ; emprise ${scaleNames[scaleIndex]}. Dessin original destiné à des mondes procéduraux.`,
      scale: sizes[scaleIndex],
      primaryLobes: motif[2],
      secondaryLobes: motif[3],
      sharpness: motif[4] * (.75 + scaleIndex * .09),
      eccentricity: motif[5],
      phase: ((index * 0.61803398875) % 1) * Math.PI * 2,
    });
  }));
}
export const WAR_SHAPE_TEMPLATES_V115: Readonly<Record<WarShapeCategoryV115, readonly WarShapeTemplateV115[]>> = Object.freeze({
  island: templates("island"), continent: templates("continent"), region: templates("region"),
});
export const WAR_SHAPE_TOTAL_V115 = 120;
export function warShapeTemplateV115(category: WarShapeCategoryV115, index: number): WarShapeTemplateV115 {
  const result = WAR_SHAPE_TEMPLATES_V115[category][index];
  if (!result || !Number.isInteger(index)) throw new RangeError("Forme planétaire inconnue.");
  return result;
}
/** A bounded radial perturbation: no holes or topology claims, compatible with
 * existing V103 Voronoi welding and coastline/hydrology masks. */
export function shapedRadiusV115(radius: number, angle: number, template: WarShapeTemplateV115, macroIndex: number): number {
  const direction = angle + template.phase + macroIndex * .51;
  const wave = Math.cos(template.primaryLobes * direction) * template.sharpness
    + Math.sin(template.secondaryLobes * direction + .73) * template.sharpness * .38
    + Math.sin(direction - .4) * template.eccentricity;
  return Math.max(.23, Math.min(.985, radius * (.9 + wave * .5)));
}
/** Physical size is not a change in normalized spherical coordinates.
 * It changes kilometers and km² without secretly altering turn costs. */
export function planetArcKilometersV115(distanceDegrees: number, size: PlanetSizeV115): number {
  return distanceDegrees * Math.PI / 180 * PLANET_RADII_KM_V115[size];
}
export function planetAreaKm2V115(areaSteradians: number, size: PlanetSizeV115): number {
  return areaSteradians * PLANET_RADII_KM_V115[size] ** 2;
}
