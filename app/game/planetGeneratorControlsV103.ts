import {
  WAR_PLANET_TERRITORY_COUNTS_V103, WAR_PLANET_REGION_COUNTS_V103,
  type WarPlanetRecipeFieldV103,
} from "./systems/clanWarPlanetGeneratorV103";
import { WAR_BIOME_LABELS_V96, WAR_SURFACE_LABELS_V96 } from "./systems/clanWarPlanetLabelsV102";

export type PlanetGeneratorSelectFieldV103 = Exclude<WarPlanetRecipeFieldV103, "seed">;
export interface PlanetGeneratorControlV103 {
  label: string;
  help?: string;
  choices: readonly { value: string | number; label: string }[];
}
const choices = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));
const variants = choices({ native: "Texture d’origine", earthlike: "Texture terrestre", alien: "Texture extraterrestre" });
const scales = choices({ broad: "Motifs larges", medium: "Motifs moyens", fine: "Motifs fins" });
const contrasts = choices({ soft: "Doux", balanced: "Équilibré", strong: "Marqué" });

export const PLANET_GENERATOR_CONTROLS_V103: Record<PlanetGeneratorSelectFieldV103, PlanetGeneratorControlV103> = {
  territoryCount: { label: "Nombre de territoires", choices: WAR_PLANET_TERRITORY_COUNTS_V103.map(value => ({ value, label: `${value} territoires` })) },
  regionCount: { label: "Nombre de régions", choices: WAR_PLANET_REGION_COUNTS_V103.map(value => ({ value, label: `${value} régions` })) },
  landform: { label: "Répartition des terres", choices: choices({ supercontinent: "Supercontinent", continents: "Continents", archipelago: "Archipels", shattered: "Îles fragmentées" }) },
  arrangement: { label: "Disposition sur le globe", choices: choices({ scattered: "Terres dispersées", equatorial: "Ceinture équatoriale", hemispheres: "Deux hémisphères", polar: "Couronnes polaires" }) },
  landCoverage: { label: "Étendue des terres", choices: choices({ low: "Terres réduites", balanced: "Équilibrée", high: "Terres étendues" }) },
  coast: { label: "Dessin des côtes", choices: choices({ smooth: "Côtes douces", rugged: "Caps et baies", fjords: "Fjords et criques", peninsulas: "Péninsules", lobed: "Baies arrondies" }) },
  territoryStyle: { label: "Forme des territoires", choices: choices({ compact: "Territoires compacts", organic: "Frontières irrégulières" }) },
  regionBalance: { label: "Taille des régions", choices: choices({ balanced: "Répartition équilibrée", uneven: "Régions de tailles variées" }) },
  landBiome: { label: "Terres dominantes", choices: choices(WAR_BIOME_LABELS_V96) },
  biomeDiversity: { label: "Biomes des régions", choices: choices({ uniform: "Même famille de terres", varied: "Régions variées" }) },
  landVariant: { label: "Texture des sols", choices: variants },
  landScale: { label: "Échelle des motifs du sol", choices: scales },
  landContrast: { label: "Contraste des sols", choices: contrasts },
  landPalette: { label: "Palette des sols", choices: choices({ native: "Palette d’origine", verdant: "Végétale", ochre: "Ocre", violet: "Violette", ashen: "Cendrée" }) },
  surface: { label: "Mers et milieux intermédiaires", choices: choices(WAR_SURFACE_LABELS_V96) },
  hydrology: { label: "Bassins et cours intérieurs", help: "Ils reprennent le milieu choisi pour les mers.", choices: choices({ none: "Aucun", lakes: "Bassins intérieurs", rivers: "Cours et chenaux", mixed: "Bassins et cours" }) },
  surfaceVariant: { label: "Texture des mers et milieux", choices: variants },
  surfaceScale: { label: "Échelle des motifs des mers", choices: scales },
  surfaceContrast: { label: "Contraste des mers", choices: contrasts },
  surfacePalette: { label: "Palette des mers", choices: choices({ native: "Palette d’origine", azure: "Azur", turquoise: "Turquoise", amber: "Ambre", violet: "Violette", obsidian: "Obsidienne" }) },
  atmosphere: { label: "Atmosphère", choices: choices({ clear: "Ciel clair", haze: "Brumes et aérosols", storm: "Systèmes orageux", aurora: "Aurores polaires" }) },
};

export const PLANET_GENERATOR_SECTIONS_V103: readonly { id: string; title: string; description: string; fields: readonly PlanetGeneratorSelectFieldV103[] }[] = [
  { id: "geography", title: "Format et géographie", description: "Le nombre de territoires, les continents et leurs frontières.", fields: ["territoryCount", "regionCount", "landform", "arrangement", "landCoverage", "coast", "territoryStyle", "regionBalance"] },
  { id: "land", title: "Terres et régions", description: "Biomes et textures des sols, avec leur palette propre.", fields: ["landBiome", "biomeDiversity", "landVariant", "landScale", "landContrast", "landPalette"] },
  { id: "surface", title: "Mers et milieux", description: "Étendues entre les terres, bassins et textures indépendantes.", fields: ["surface", "hydrology", "surfaceVariant", "surfaceScale", "surfaceContrast", "surfacePalette"] },
  { id: "atmosphere", title: "Atmosphère", description: "Diffusion, nuages et émissions autour du globe.", fields: ["atmosphere"] },
];
