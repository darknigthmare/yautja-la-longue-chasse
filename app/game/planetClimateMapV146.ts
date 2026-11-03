import type { WarPlanetLandBiomeV96, WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import { createPlanetRegionIndexMaskV124 } from "./planetModularExportV124";

/** Region colours correspond to the canonical *biomes* of this world.
 * Water, sand, crystal, spores and other non-terrestrial media remain
 * transparent, not replaced with an invented blue ocean. */
export const PLANET_ENV_BIOME_RGB_V146: Readonly<Record<WarPlanetLandBiomeV96, readonly [number,number,number]>> = {
  temperate:[88,147,99], jungle:[31,116,73], tundra:[161,179,161], snow:[224,232,233],
  desert:[205,157,87], volcanic:[93,69,69], salt:[214,193,161], mountain:[131,126,119],
  ocean:[64,162,148], swamp:[77,127,88], crystal:[165,110,189],
  fungal:[164,121,180], irradiated:[153,193,79],
};

export function encodePlanetClimatePixelsV146(
  regionIndexPixels:Uint8ClampedArray,biomes:readonly WarPlanetLandBiomeV96[],
):Uint8ClampedArray {
  if(regionIndexPixels.length%4!==0 || biomes.length<1 || biomes.length>254 ||
     biomes.some(b=>!Object.prototype.hasOwnProperty.call(PLANET_ENV_BIOME_RGB_V146,b)))
    throw new RangeError("Masque climatique ou table de biomes invalides.");
  const output=new Uint8ClampedArray(regionIndexPixels.length);
  for(let i=0;i<regionIndexPixels.length;i+=4){
    const region=regionIndexPixels[i];
    if(regionIndexPixels[i+3]<128)continue;
    if(region<1||region>biomes.length)throw new RangeError("Pixel régional hors du monde.");
    const color=PLANET_ENV_BIOME_RGB_V146[biomes[region-1]];
    output[i]=color[0];output[i+1]=color[1];output[i+2]=color[2];output[i+3]=255;
  }
  return output;
}

export function createPlanetClimateMapV146(planet:WarPlanetV96,width=512):HTMLCanvasElement {
  if(!Number.isInteger(width)||width<256||width>2048||width%2!==0)
    throw new RangeError("Largeur de l'export de climat invalide.");
  const regionIndex=createPlanetRegionIndexMaskV124(planet,width);
  const input=regionIndex.getContext("2d",{willReadFrequently:true})?.getImageData(0,0,width,width/2);
  if(!input)throw new Error("Pixels du masque géographique indisponibles.");
  const biomes=planet.regions.map(region=>
    planet.procedural?.regions.find(item=>item.regionId===region.id)?.biome??planet.landBiome);
  const encoded=encodePlanetClimatePixelsV146(input.data,biomes);
  const canvas=document.createElement("canvas");canvas.width=width;canvas.height=width/2;
  const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas du planisphère climatique indisponible.");
  const image=ctx.createImageData(width,width/2);
  image.data.set(encoded);ctx.putImageData(image,0,0);
  return canvas;
}
