import type { WarPlanetLandBiomeV96 } from "./clanWarPlanetsV96";

export const PLANET_RELIEF_VERSION_V150 = 150;
export const PLANET_RELIEF_DEFAULT_V150 = Object.freeze({
  maxElevationMeters: 8000,
  ruggedness: 0.55,
  seed: 0,
});
export interface PlanetReliefOptionsV150 {
  maxElevationMeters: number;
  ruggedness: number;
  seed: number;
}
export interface PlanetReliefRegionV150 {
  regionIndex: number;
  biome: WarPlanetLandBiomeV96;
  landPixels: number;
  averageElevationMeters: number;
  maximumElevationMeters: number;
}
export interface PlanetReliefRasterV150 {
  width: number;
  height: number;
  maxElevationMeters: number;
  radiusKm: number;
  /** R=height high byte, G=height low byte, B=0, A=255 only over land. */
  rg16: Uint8ClampedArray;
  /** Visual authoring preview: colour gradient, transparent over non-land. */
  preview: Uint8ClampedArray;
  landPixels: number;
  waterPixels: number;
  highestElevationMeters: number;
  regions: readonly PlanetReliefRegionV150[];
}
const TWOPI=Math.PI*2;
const biomeWeights:Readonly<Record<WarPlanetLandBiomeV96,number>>={
  temperate:0.85,jungle:0.8,tundra:0.9,snow:1.05,desert:0.73,
  volcanic:1.2,salt:0.5,mountain:1.28,ocean:0.55,swamp:0.35,
  crystal:0.95,fungal:0.7,irradiated:0.85,
};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

export function validatePlanetReliefOptionsV150(options:PlanetReliefOptionsV150):boolean{
  return Number.isInteger(options.maxElevationMeters)&&
    options.maxElevationMeters>=500&&options.maxElevationMeters<=20000&&
    Number.isFinite(options.ruggedness)&&options.ruggedness>=0&&options.ruggedness<=1&&
    Number.isInteger(options.seed)&&options.seed>=0&&options.seed<=0xffffffff;
}
function reliefNoiseV150(x:number,y:number,width:number,height:number,seed:number):number{
  const lon=(x+.5)/width*TWOPI-Math.PI,lat=Math.PI/2-(y+.5)/height*Math.PI;
  const a=Math.cos(lat)*Math.cos(lon),b=Math.cos(lat)*Math.sin(lon),c=Math.sin(lat);
  const phase=(seed%65521)*0.00037;
  const large=Math.sin(18.3*a+12.7*b+21.1*c+phase);
  const medium=Math.sin(49.7*a-35.1*b+37.4*c+phase*1.71);
  const fine=Math.sin(112.2*a+90.5*b-68.7*c-phase*2.13);
  return clamp(.5+.27*large+.15*medium+.08*fine,0,1);
}
function gradientV150(height:number,maxHeight:number):readonly [number,number,number] {
  const t=clamp(height/Math.max(1,maxHeight),0,1);
  if(t<.28)return [Math.round(48+85*t),Math.round(108+105*t),Math.round(67+45*t)];
  if(t<.68){const u=(t-.28)/.4;return [Math.round(72+105*u),Math.round(140-25*u),Math.round(80+10*u)];}
  const u=(t-.68)/.32;
  return [Math.round(177+74*u),Math.round(115+134*u),Math.round(90+161*u)];
}

/** Pure elevation study derived from V124's EXACT dry-land region index mask.
 * No terrain cell, coastline or historical save data is ever changed.
 *
 * Distances use a spherical equirectangular grid, wrap longitude once, and
 * clamp latitude. Water/lakes/river pixels are zero. Ridge noise is sampled
 * in 3D unit-sphere coordinates, preserving geographic seam continuity. */
export function encodePlanetReliefV150(
  regionIndexRGBA:Uint8ClampedArray,width:number,height:number,
  radiusKm:number,biomes:readonly WarPlanetLandBiomeV96[],
  options:PlanetReliefOptionsV150=PLANET_RELIEF_DEFAULT_V150,
):PlanetReliefRasterV150 {
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<64||width>2048||
    width!==height*2||regionIndexRGBA.length!==width*height*4||
    !Number.isFinite(radiusKm)||radiusKm<100||radiusKm>100000||
    biomes.length<1||biomes.length>254||
    biomes.some(value=>!Object.prototype.hasOwnProperty.call(biomeWeights,value))||
    !validatePlanetReliefOptionsV150(options))
    throw new RangeError("Grille d'altitude, biome ou paramètres physiques invalides.");
  const n=width*height;
  const land=new Uint8Array(n),dist=new Float64Array(n);
  const landStats=biomes.map((biome,index)=>({
    regionIndex:index+1,biome,landPixels:0,meters:0,max:0,
  }));
  let waterPixels=0,landPixels=0;
  for(let k=0;k<n;k++){
    const off=k*4,r=regionIndexRGBA[off],alpha=regionIndexRGBA[off+3];
    if(alpha<128){dist[k]=0;waterPixels++;continue;}
    if(!r||r>biomes.length)throw new RangeError("Indice de région du masque incompatible.");
    land[k]=r;dist[k]=Number.POSITIVE_INFINITY;landPixels++;
  }
  const verticalKm=Math.PI*radiusKm/height;
  const horizontalKm=new Float64Array(height),diagonalKm=new Float64Array(height);
  for(let y=0;y<height;y++){
    const lat=Math.PI/2-(y+.5)/height*Math.PI;
    horizontalKm[y]=TWOPI*radiusKm*Math.max(.001,Math.cos(lat))/width;
    diagonalKm[y]=Math.hypot(verticalKm,horizontalKm[y]);
  }
  // Bounded chamfer relaxation with horizontal longitude periodicity.
  // Four bidirectional sweeps handle the seam and narrow inland channels.
  for(let pass=0;pass<4;pass++){
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const k=y*width+x;if(land[k]===0)continue;
      const left=y*width+(x+width-1)%width;
      const up=y>0?(y-1)*width+x:-1;
      let value=Math.min(dist[k],dist[left]+horizontalKm[y]);
      if(up>=0){
        value=Math.min(value,dist[up]+verticalKm);
        value=Math.min(value,dist[(y-1)*width+(x+width-1)%width]+diagonalKm[y]);
        value=Math.min(value,dist[(y-1)*width+(x+1)%width]+diagonalKm[y]);
      }
      dist[k]=value;
    }
    for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){
      const k=y*width+x;if(land[k]===0)continue;
      const right=y*width+(x+1)%width,below=y<height-1?(y+1)*width+x:-1;
      let value=Math.min(dist[k],dist[right]+horizontalKm[y]);
      if(below>=0){
        value=Math.min(value,dist[below]+verticalKm);
        value=Math.min(value,dist[(y+1)*width+(x+width-1)%width]+diagonalKm[y]);
        value=Math.min(value,dist[(y+1)*width+(x+1)%width]+diagonalKm[y]);
      }
      dist[k]=value;
    }
  }
  const rg16=new Uint8ClampedArray(n*4),preview=new Uint8ClampedArray(n*4);
  let highest=0;
  const shorelineScaleKm=120+180*Math.sqrt(radiusKm/6371);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const k=y*width+x,region=land[k];
    if(region===0)continue;
    const coast=Number.isFinite(dist[k])?dist[k]/shorelineScaleKm:5;
    const ramp=clamp(1-Math.exp(-Math.max(0,coast)*1.4),0,1);
    const ridges=reliefNoiseV150(x,y,width,height,options.seed);
    const weight=biomeWeights[biomes[region-1]];
    const amount=ramp*weight*(.72-.35*options.ruggedness+
      (.2+.7*options.ruggedness)*ridges);
    const meters=Math.round(options.maxElevationMeters*clamp(amount,0,1));
    const encoded=Math.round(meters/options.maxElevationMeters*65535);
    const o=k*4;
    rg16[o]=encoded>>>8;
    rg16[o+1]=encoded&255;
    rg16[o+3]=255;
    const color=gradientV150(meters,options.maxElevationMeters);
    preview[o]=color[0];preview[o+1]=color[1];preview[o+2]=color[2];preview[o+3]=255;
    const record=landStats[region-1];
    record.landPixels++;record.meters+=meters;record.max=Math.max(record.max,meters);
    highest=Math.max(highest,meters);
  }
  return {
    width,height,maxElevationMeters:options.maxElevationMeters,radiusKm,rg16,preview,
    landPixels,waterPixels,highestElevationMeters:highest,
    regions:landStats.map(entry=>({
      regionIndex:entry.regionIndex,biome:entry.biome,
      landPixels:entry.landPixels,
      averageElevationMeters:entry.landPixels?Math.round(entry.meters/entry.landPixels):0,
      maximumElevationMeters:entry.max,
    })),
  };
}

export function decodePlanetHeightPixelV150(high:number,low:number,maxElevationMeters:number):number{
  if(!Number.isInteger(high)||high<0||high>255||!Number.isInteger(low)||low<0||low>255||
    !Number.isInteger(maxElevationMeters)||maxElevationMeters<500||maxElevationMeters>20000)
    throw new RangeError("Hauteur RG16 invalide.");
  return Math.round((high*256+low)/65535*maxElevationMeters);
}
