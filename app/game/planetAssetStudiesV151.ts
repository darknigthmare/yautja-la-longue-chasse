import type { WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import { createPlanetRegionIndexMaskV124 } from "./planetModularExportV124";
import { analyzePlanetEnvironmentV146 } from "./systems/clanWarPlanetEnvironmentV146";
import { auditPlanetPreflightV149 } from "./systems/clanWarPlanetPreflightV149";
import {
  encodePlanetReliefV150, PLANET_RELIEF_DEFAULT_V150,
  type PlanetReliefRasterV150,
} from "./systems/clanWarPlanetReliefV150";
import {
  analyzePlanetTerrainSlopesV152, samplePlanetTerrainRoutesV152,
  type PlanetTerrainSlopeV152, type PlanetTerrainRouteDossierV152,
} from "./systems/clanWarPlanetTerrainV152";

export const PLANET_STUDY_PACK_VERSION_V151 = 151;
export const PLANET_STUDY_RELIEF_WIDTH_V151 = 512;
export type PlanetReliefExportLayerV151 = "relief-height-rg16" | "relief-preview" | "terrain-slope-v152";
const reliefLayerFiles={
  "relief-height-rg16":"relief-height-rg16-map.png",
  "relief-preview":"relief-preview-map.png",
  "terrain-slope-v152":"terrain-slope-v152-map.png",
} as const;
const reliefCache=new Map<string,PlanetReliefRasterV150>();
const terrainCache=new Map<string,{slope:PlanetTerrainSlopeV152;routes:PlanetTerrainRouteDossierV152}>();
const CACHE_LIMIT=2;

export function planetHasPhysicalReliefV151(planet:WarPlanetV96):boolean {
  const p=planet.procedural;
  return Boolean(p && p.recipe.version===115 && "physical" in p);
}
export function planetStudyManifestV151(planet:WarPlanetV96) {
  const physical=planetHasPhysicalReliefV151(planet);
  return {
    format:"yautja-planet-study-sidecars",version:PLANET_STUDY_PACK_VERSION_V151,
    worldCode:planet.id,sourceRegionMask:"V124 dry-land regional index",
    environmentFile:"environment-study-v146.json",
    preflightFile:"world-preflight-v149.json",
    terrainV153:physical?{
      slopePng:reliefLayerFiles["terrain-slope-v152"],
      routeReportJson:"terrain-routes-v152.json",
      slopeThresholdsPercent:[1,3,8],
      width:PLANET_STUDY_RELIEF_WIDTH_V151,
      height:PLANET_STUDY_RELIEF_WIDTH_V151/2,
      note:"Coarse geographic slopes and existing war routes only; no new combat collision or movement rule.",
    }:null,
    relief:physical?{
      heightFile:reliefLayerFiles["relief-height-rg16"],
      previewFile:reliefLayerFiles["relief-preview"],
      width:PLANET_STUDY_RELIEF_WIDTH_V151,height:PLANET_STUDY_RELIEF_WIDTH_V151/2,
      seed:planet.seed,maxElevationMeters:PLANET_RELIEF_DEFAULT_V150.maxElevationMeters,
      ruggedness:PLANET_RELIEF_DEFAULT_V150.ruggedness,
      highByte:"R",lowByte:"G",seaAndInlandAlpha:0,
      decoder:"round(((R*256+G)/65535)*maxElevationMeters)",
    }:null,
    note:"Read-only studies. Relief in this ZIP uses the declared default settings; the separate V150 inspector exports individually edited configurations. The original V124 manifest, codecs, gameplay and saves are unchanged.",
  };
}

export function planetStudyReportsV151(planet:WarPlanetV96) {
  return {
    environment:analyzePlanetEnvironmentV146(planet),
    preflight:auditPlanetPreflightV149(planet),
  };
}
function reliefRasterV151(planet:WarPlanetV96):PlanetReliefRasterV150{
  const procedural=planet.procedural;
  if(!procedural || procedural.recipe.version!==115 || !("physical" in procedural))
    throw new RangeError("Pas de rayon physique : aucune altitude métrique inventée.");
  const key=planet.id+"/"+PLANET_STUDY_RELIEF_WIDTH_V151;
  const cached=reliefCache.get(key);
  if(cached){reliefCache.delete(key);reliefCache.set(key,cached);return cached;}
  const size=PLANET_STUDY_RELIEF_WIDTH_V151;
  const regionCanvas=createPlanetRegionIndexMaskV124(planet,size);
  const indices=regionCanvas.getContext("2d",{willReadFrequently:true})
    ?.getImageData(0,0,size,size/2).data;
  if(!indices)throw new Error("Impossible de lire la géographie du monde.");
  const biomes=planet.regions.map(region=>
    procedural.regions.find(item=>item.regionId===region.id)?.biome??planet.landBiome);
  const value=encodePlanetReliefV150(indices,size,size/2,
    procedural.physical.radiusKm,biomes,{
      ...PLANET_RELIEF_DEFAULT_V150,
      seed:planet.seed,
    });
  reliefCache.set(key,value);
  while(reliefCache.size>CACHE_LIMIT)reliefCache.delete(reliefCache.keys().next().value!);
  return value;
}

function terrainStudiesV153(planet:WarPlanetV96) {
  if(!planetHasPhysicalReliefV151(planet))
    throw new RangeError("Étude des pentes sans rayon physique indisponible.");
  const key=planet.id+"/"+PLANET_STUDY_RELIEF_WIDTH_V151;
  const cached=terrainCache.get(key);
  if(cached){terrainCache.delete(key);terrainCache.set(key,cached);return cached;}
  const relief=reliefRasterV151(planet);
  const size=PLANET_STUDY_RELIEF_WIDTH_V151;
  const source=createPlanetRegionIndexMaskV124(planet,size);
  const mask=source.getContext("2d",{willReadFrequently:true})
    ?.getImageData(0,0,size,size/2).data;
  if(!mask)throw new Error("Masque régional illisible pour les pentes.");
  const slope=analyzePlanetTerrainSlopesV152(relief,mask);
  const routes=samplePlanetTerrainRoutesV152(planet,relief,slope);
  const data={slope,routes};terrainCache.set(key,data);
  while(terrainCache.size>CACHE_LIMIT)terrainCache.delete(terrainCache.keys().next().value!);
  return data;
}
/** V153 reports are real source terrain studies, never user saved game files. */
export function planetTerrainReportsV153(planet:WarPlanetV96) {
  if(!planetHasPhysicalReliefV151(planet))return null;
  const study=terrainStudiesV153(planet);
  return {
    ...study.routes,
    landPixels:study.slope.landPixels,
    highestGradePercent:study.slope.highestGradePercent,
    steepAndExtremePercent:study.slope.steepAndExtremePercent,
    regionSlopeSummary:study.slope.regions.map((region,index)=>({
      ...region,regionId:planet.regions[index]?.id??null,
      regionName:planet.regions[index]?.name??null,
    })),
    gradientEncoding:"RGBA colours: green flat, olive rolling, orange steep, red extreme; alpha zero for non-land",
    classBreaksPercent:[1,3,8],
  };
}

/** Export-only canvas: no alterations to the editable height study or V115
 * topology. Both height and preview use the SAME one-time cached raster. */
export function createPlanetReliefExportV151(
  planet:WarPlanetV96,layer:PlanetReliefExportLayerV151,
):HTMLCanvasElement {
  if(!(layer in reliefLayerFiles))
    throw new RangeError("Calque d'altitude inconnu.");
  const raster=reliefRasterV151(planet);
  const canvas=document.createElement("canvas");
  canvas.width=raster.width;canvas.height=raster.height;
  const ctx=canvas.getContext("2d");
  if(!ctx)throw new Error("Canvas d'export altimétrique indisponible.");
  const pixels=ctx.createImageData(raster.width,raster.height);
  pixels.data.set(layer==="terrain-slope-v152"?
    terrainStudiesV153(planet).slope.preview:
    layer==="relief-height-rg16"?raster.rg16:raster.preview);
  ctx.putImageData(pixels,0,0);
  return canvas;
}
