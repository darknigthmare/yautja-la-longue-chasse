import type { WarPlanetV96 } from "./clanWarPlanetsV96";

export const WAR_SURFACE_LABELS_V96: Record<WarPlanetV96["surface"]["kind"], string> = {
  water: "Océans", acid: "Mers acides", ice: "Glaces", sand: "Déserts",
  lava: "Lave", brine: "Saumures", radioactive: "Radiations", crystal: "Cristaux",
  spores: "Spores", mist: "Brumes",
};
export const WAR_BIOME_LABELS_V96: Record<WarPlanetV96["landBiome"], string> = {
  temperate: "Forêts tempérées", jungle: "Jungles", tundra: "Toundras", snow: "Neiges",
  desert: "Déserts", volcanic: "Terres volcaniques", salt: "Plateaux salins", mountain: "Montagnes",
  ocean: "Terres littorales", swamp: "Marécages", crystal: "Reliefs cristallins", fungal: "Forêts fongiques", irradiated: "Terres irradiées",
};
