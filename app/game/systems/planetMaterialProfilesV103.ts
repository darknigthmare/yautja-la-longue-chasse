/** Independent visual controls. Importing this contract never loads a planet
 * registry or a generator, so recipe validation can safely share these enums. */
export const PLANET_MATERIAL_VARIANTS_V103 = Object.freeze(["native", "earthlike", "alien"] as const);
export const PLANET_MATERIAL_SCALES_V103 = Object.freeze(["broad", "medium", "fine"] as const);
export const PLANET_MATERIAL_CONTRASTS_V103 = Object.freeze(["soft", "balanced", "strong"] as const);
export const PLANET_LAND_PALETTES_V103 = Object.freeze(["native", "verdant", "ochre", "violet", "ashen"] as const);
export const PLANET_SURFACE_PALETTES_V103 = Object.freeze(["native", "azure", "turquoise", "amber", "violet", "obsidian"] as const);

export type PlanetMaterialVariantV103 = typeof PLANET_MATERIAL_VARIANTS_V103[number];
export type PlanetMaterialScaleV103 = typeof PLANET_MATERIAL_SCALES_V103[number];
export type PlanetMaterialContrastV103 = typeof PLANET_MATERIAL_CONTRASTS_V103[number];
export type PlanetLandPaletteV103 = typeof PLANET_LAND_PALETTES_V103[number];
export type PlanetSurfacePaletteV103 = typeof PLANET_SURFACE_PALETTES_V103[number];

export interface PlanetMaterialOptionsV103 {
  landVariant: PlanetMaterialVariantV103;
  surfaceVariant: PlanetMaterialVariantV103;
  landScale: PlanetMaterialScaleV103;
  surfaceScale: PlanetMaterialScaleV103;
  landContrast: PlanetMaterialContrastV103;
  surfaceContrast: PlanetMaterialContrastV103;
  landPalette: PlanetLandPaletteV103;
  surfacePalette: PlanetSurfacePaletteV103;
}

export const DEFAULT_PLANET_MATERIAL_OPTIONS_V103: Readonly<PlanetMaterialOptionsV103> = Object.freeze({
  landVariant: "native", surfaceVariant: "native",
  landScale: "medium", surfaceScale: "medium",
  landContrast: "balanced", surfaceContrast: "balanced",
  landPalette: "native", surfacePalette: "native",
});

export const PLANET_MATERIAL_ROOT_V103 = "/game/planets/v103/runtime/";
export const PLANET_MATERIAL_SOURCE_ROOT_V103 = "/game/planets/v103/materials/";

const scales = Object.freeze({ broad: .65, medium: 1, fine: 1.6 });
const contrasts = Object.freeze({ soft: .72, balanced: 1, strong: 1.35 });
const landPalettes = Object.freeze({ native: null, verdant: "#6c9754", ochre: "#ba8950", violet: "#9b70bb", ashen: "#989b9f" });
const surfacePalettes = Object.freeze({
  native: null,
  azure: Object.freeze({ deep: "#071e43", base: "#1d6d9c", accent: "#56c8e4", detail: "#aadbe8" }),
  turquoise: Object.freeze({ deep: "#06372f", base: "#248d80", accent: "#73d8b7", detail: "#b1eed4" }),
  amber: Object.freeze({ deep: "#3e1e0b", base: "#a96c23", accent: "#f4bf55", detail: "#ffe2a0" }),
  violet: Object.freeze({ deep: "#21133c", base: "#71549f", accent: "#c68be5", detail: "#e2bef5" }),
  obsidian: Object.freeze({ deep: "#080d15", base: "#2e3b4e", accent: "#768ca7", detail: "#b9c7d5" }),
});

/** Module-local profiles deliberately read only that module's four controls. */
export function planetLandProfileV103(options: PlanetMaterialOptionsV103) {
  return {
    detail: options.landVariant === "native" ? null : `${PLANET_MATERIAL_ROOT_V103}land-${options.landVariant}.webp`,
    scale: scales[options.landScale], contrast: contrasts[options.landContrast], palette: landPalettes[options.landPalette],
  };
}

export function planetSurfaceProfileV103(options: PlanetMaterialOptionsV103) {
  return {
    detail: options.surfaceVariant === "native" ? null : `${PLANET_MATERIAL_ROOT_V103}surface-${options.surfaceVariant}.webp`,
    scale: scales[options.surfaceScale], contrast: contrasts[options.surfaceContrast], palette: surfacePalettes[options.surfacePalette],
  };
}

export function planetMaterialSourceV103(path: string) {
  return path.replace(PLANET_MATERIAL_ROOT_V103, PLANET_MATERIAL_SOURCE_ROOT_V103).replace(/\.webp$/, ".png");
}

/** A bounded atlas keeps 3–12 regions inside WebGL1's seven used samplers.
 * V102 still selects its original 4x2 layout in the existing renderer. */
export function planetRegionalLayoutV103(regionCount: number, requestedSize: number, maxTextureSize: number) {
  if (!Number.isInteger(regionCount) || regionCount < 3 || regionCount > 12) throw new RangeError("V103 supports 3 to 12 regional materials");
  if (!Number.isFinite(requestedSize) || requestedSize < 16 || !Number.isFinite(maxTextureSize) || maxTextureSize < 64) throw new RangeError("Regional texture dimensions unavailable");
  const columns = regionCount <= 4 ? 2 : 4, rows = Math.ceil(regionCount / columns);
  const pixelBudget = 8 * 1024 * 1024;
  const maximumTile = Math.min(1024, requestedSize, maxTextureSize / columns, maxTextureSize / rows, Math.sqrt(pixelBudget / (columns * rows)));
  const tileSize = 2 ** Math.floor(Math.log2(maximumTile));
  return { columns, rows, tileSize, width: columns * tileSize, height: rows * tileSize, regionCount };
}
