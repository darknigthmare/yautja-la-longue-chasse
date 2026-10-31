import {
  WAR_PLANET_TERRITORY_COUNTS_V103, WAR_PLANET_REGION_COUNTS_V103,
  type WarPlanetRecipeV103, type WarPlanetRecipeFieldV103,
} from "./clanWarPlanetGeneratorV103";
import type { PlanetSizeV115 } from "./clanWarShapeAtlasV115";

export const PLANET_SIZE_TOPOLOGY_PRESETS_V139=Object.freeze({
  dwarf:{territoryCount:18,regionCount:3},small:{territoryCount:24,regionCount:4},
  terran:{territoryCount:48,regionCount:8},large:{territoryCount:72,regionCount:12},
  giant:{territoryCount:96,regionCount:12},colossal:{territoryCount:96,regionCount:12},
} as const);
const nearest=(options:readonly number[],target:number):number=>
  options.slice().sort((a,b)=>Math.abs(a-target)-Math.abs(b-target)||b-a)[0];

/** Real bounds from V103 geography.plans(), not an image-based guess. */
export function planetLandmassCountRangeV139(
  landform:WarPlanetRecipeV103["landform"],territoryCount:number,
):readonly [number,number] {
  if(!WAR_PLANET_TERRITORY_COUNTS_V103.some(x=>x===territoryCount))
    throw new RangeError("Nombre de territoires hors catalogue.");
  if(landform==="supercontinent")return [1,1];
  if(landform==="continents")return [3,5];
  if(landform==="archipelago"){
    const n=Math.round(Math.sqrt(territoryCount)*1.5);
    return [Math.min(territoryCount,Math.max(6,n-1)),Math.min(territoryCount,Math.max(6,n+1))];
  }
  if(landform==="shattered"){
    const n=Math.round(territoryCount*.42);
    return [Math.min(32,territoryCount,Math.max(10,n-1)),Math.min(32,territoryCount,Math.max(10,n+1))];
  }
  throw new RangeError("Disposition terrestre inconnue.");
}

/** Explicit draft-only recommendation, never silent V115 world migration. */
export function recommendPlanetTopologyV139(
  size:PlanetSizeV115,recipe:Pick<WarPlanetRecipeV103,"territoryCount"|"regionCount"|"landform">,
  locked:readonly WarPlanetRecipeFieldV103[]=[],
) {
  const ideal=PLANET_SIZE_TOPOLOGY_PRESETS_V139[size];
  if(!ideal||!WAR_PLANET_TERRITORY_COUNTS_V103.some(x=>x===recipe.territoryCount)||
     !WAR_PLANET_REGION_COUNTS_V103.some(x=>x===recipe.regionCount))
    throw new RangeError("Recette de maillage incompatible.");
  const lockTerritory=locked.includes("territoryCount"),lockRegion=locked.includes("regionCount");
  const territoryCount=lockTerritory?recipe.territoryCount:
    nearest(WAR_PLANET_TERRITORY_COUNTS_V103.filter(x=>x>=3*(lockRegion?recipe.regionCount:ideal.regionCount)),ideal.territoryCount);
  const regionCount=lockRegion?recipe.regionCount:
    nearest(WAR_PLANET_REGION_COUNTS_V103.filter(x=>x*3<=territoryCount),ideal.regionCount);
  return {territoryCount,regionCount,
    recommendedTerritories:ideal.territoryCount,recommendedRegions:ideal.regionCount,
    locked:lockTerritory&&lockRegion,range:planetLandmassCountRangeV139(recipe.landform,territoryCount)};
}
