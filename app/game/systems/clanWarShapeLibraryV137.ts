import {
  WAR_SHAPE_TEMPLATES_V115,
  type WarShapeCategoryV115, type WarShapeTemplateV115,
} from "./clanWarShapeAtlasV115";

export const PLANET_SHAPE_SCALES_V137 = ["all", "micro", "compacte", "étendue", "immense"] as const;
export type PlanetShapeScaleV137 = typeof PLANET_SHAPE_SCALES_V137[number];

const scaleNames = ["micro", "compacte", "étendue", "immense"] as const;
const clean = (word: string) => word.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("fr-FR").trim();

/** A real browseable view of the V115 library, never a parallel fake shape bank.
 * Page and search operations neither regenerate planets nor mutate shape IDs. */
export function planetShapeLibraryPageV137(
  category: WarShapeCategoryV115, search = "", scale: PlanetShapeScaleV137 = "all",
  page = 0, pageSize = 8,
): { category: WarShapeCategoryV115; total: number; pages: number; page: number;
  shapes: readonly WarShapeTemplateV115[] } {
  const group = WAR_SHAPE_TEMPLATES_V115[category];
  if (!group || typeof search !== "string" || search.length > 100 ||
      !PLANET_SHAPE_SCALES_V137.includes(scale) ||
      !Number.isInteger(page) || page < 0 ||
      !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 12)
    throw new RangeError("Filtres de la bibliothèque de formes invalides.");
  const wanted = clean(search), matched = group.filter(item =>
    (scale === "all" || scaleNames[item.index % 4] === scale) &&
    (!wanted || clean(item.name+" "+item.description).includes(wanted)));
  const pages = Math.ceil(matched.length / pageSize);
  const bounded = pages ? Math.min(page, pages-1) : 0;
  return { category, total: matched.length, pages, page: bounded,
    shapes: matched.slice(bounded * pageSize, (bounded + 1) * pageSize) };
}
