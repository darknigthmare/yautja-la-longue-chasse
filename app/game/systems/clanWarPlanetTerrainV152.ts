import type { WarPlanetV96 } from "./clanWarPlanetsV96";
import type { PlanetReliefRasterV150 } from "./clanWarPlanetReliefV150";

/** V152 is a read-only route-design diagnostic, NOT a pathfinding rule
 * injected into existing clan-war saves. The source is always V150's real
 * dry-land RG16 output, not a parallel procedural island generator. */
export const PLANET_TERRAIN_CLASS_NAMES_V152 = ["flat","rolling","steep","extreme"] as const;
export type PlanetTerrainClassV152 = typeof PLANET_TERRAIN_CLASS_NAMES_V152[number];
export type PlanetTerrainRouteKindV152 = "land" | "crossing";
export interface PlanetTerrainRegionV152 {
  regionIndex: number;
  pixelCount: number;
  counts: readonly [number,number,number,number];
  steepAndExtremePercent: number;
  maximumGradePercent: number;
}
export interface PlanetTerrainSlopeV152 {
  width:number;height:number;radiusKm:number;
  gradeHundredthsPercent:Uint16Array;
  /** RGB gradient; alpha=255 over true dry land, alpha=0 for all media. */
  preview:Uint8ClampedArray;
  counts:readonly [number,number,number,number];
  landPixels:number;
  steepAndExtremePercent:number;
  highestGradePercent:number;
  regions:readonly PlanetTerrainRegionV152[];
}
export interface PlanetRouteTerrainV152 {
  fromId:string;toId:string;kind:PlanetTerrainRouteKindV152;
  lengthKm:number;
  samples:number;landSamples:number;nonLandSamples:number;
  maximumGradePercent:number;
  averageGradePercent:number;
  uphillMeters:number;downhillMeters:number;
  /** Advisory ONLY. Never blocks a route, vehicle or war order. */
  class:"flat"|"rolling"|"steep"|"extreme"|"medium-crossing"|"insufficient-samples";
}
export interface PlanetTerrainRouteDossierV152 {
  format:"yautja-planet-route-terrain-study";
  version:152;worldCode:string;radiusKm:number;mapWidth:number;mapHeight:number;
  routes:readonly PlanetRouteTerrainV152[];
  classCounts:Readonly<Record<PlanetRouteTerrainV152["class"],number>>;
  limitations:readonly string[];
}
const PI=Math.PI;
const palette:readonly (readonly [number,number,number])[]=[
  [74,151,104],[171,173,99],[203,131,62],[172,70,66],
];
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
const degree=PI/180;

function assertSlopeInput(raster:PlanetReliefRasterV150,mask:Uint8ClampedArray):void{
  const {width,height,rg16,maxElevationMeters,radiusKm}=raster;
  if(!Number.isInteger(width)||width<64||width>2048||
    !Number.isInteger(height)||height*2!==width||
    !Number.isFinite(radiusKm)||radiusKm<100||radiusKm>100000||
    !Number.isInteger(maxElevationMeters)||maxElevationMeters<500||maxElevationMeters>20000||
    rg16.length!==width*height*4||mask.length!==rg16.length||
    raster.regions.length<1||raster.regions.length>254)
    throw new RangeError("Altitude RG16, masque régional ou rayon invalides.");
}
function sampleHeightMeters(bytes:Uint8ClampedArray,index:number,max:number):number{
  return (bytes[index*4]*256+bytes[index*4+1])*max/65535;
}
function categoryForGrade(value:number):0|1|2|3{
  return value<1?0:value<3?1:value<8?2:3;
}
export function analyzePlanetTerrainSlopesV152(
  raster:PlanetReliefRasterV150,regionIndexRGBA:Uint8ClampedArray,
):PlanetTerrainSlopeV152{
  assertSlopeInput(raster,regionIndexRGBA);
  const {width,height,rg16,radiusKm,maxElevationMeters}=raster;
  const land=new Uint8Array(width*height),elevation=new Float32Array(width*height);
  for(let k=0;k<land.length;k++){
    const a=rg16[k*4+3],m=regionIndexRGBA[k*4+3];
    if((a>=128)!==(m>=128))
      throw new RangeError("Terres de l'altitude et du masque régional désynchronisées.");
    if(a<128)continue;
    const region=regionIndexRGBA[k*4];
    if(region<1||region>raster.regions.length)
      throw new RangeError("Indice régional de pente inconnu.");
    land[k]=region;
    elevation[k]=sampleHeightMeters(rg16,k,maxElevationMeters);
  }
  const gradeHundredthsPercent=new Uint16Array(width*height);
  const preview=new Uint8ClampedArray(width*height*4);
  const counts:[number,number,number,number]=[0,0,0,0];
  const regionStats=raster.regions.map((region,index)=>({
    regionIndex:index+1,pixelCount:0,
    counts:[0,0,0,0] as [number,number,number,number],maximumGradePercent:0,
  }));
  const verticalMeters=PI*radiusKm*1000/height;
  let max=0,landPixels=0;
  for(let y=0;y<height;y++){
    const lat=PI/2-(y+.5)*PI/height;
    const horizontalMeters=2*PI*radiusKm*1000/width*Math.max(.001,Math.cos(lat));
    for(let x=0;x<width;x++){
      const k=y*width+x,reg=land[k];
      if(!reg)continue;
      landPixels++;
      const center=elevation[k];
      const left=y*width+(x+width-1)%width,right=y*width+(x+1)%width;
      const top=y>0?(y-1)*width+x:-1,bottom=y+1<height?(y+1)*width+x:-1;
      const hasL=land[left]>0,hasR=land[right]>0;
      const hasT=top>=0&&land[top]>0,hasB=bottom>=0&&land[bottom]>0;
      // Central difference on dry pixels; one-sided at a genuine shoreline.
      // Never treat adjacent sea height=0 as a cliff face.
      const dx=hasL&&hasR?(elevation[right]-elevation[left])/(2*horizontalMeters):
        hasR?(elevation[right]-center)/horizontalMeters:
        hasL?(center-elevation[left])/horizontalMeters:0;
      const dy=hasT&&hasB?(elevation[bottom]-elevation[top])/(2*verticalMeters):
        hasB?(elevation[bottom]-center)/verticalMeters:
        hasT?(center-elevation[top])/verticalMeters:0;
      const percent=100*Math.hypot(dx,dy);
      const grade=clamp(Math.round(percent*100),0,65535);
      gradeHundredthsPercent[k]=grade;
      const category=categoryForGrade(percent),color=palette[category],o=k*4;
      preview[o]=color[0];preview[o+1]=color[1];preview[o+2]=color[2];preview[o+3]=255;
      counts[category]++;
      const stats=regionStats[reg-1];
      stats.pixelCount++;stats.counts[category]++;
      stats.maximumGradePercent=Math.max(stats.maximumGradePercent,percent);
      max=Math.max(max,percent);
    }
  }
  if(landPixels!==raster.landPixels)throw new RangeError("Statistiques terrestres V150 incohérentes.");
  return {
    width,height,radiusKm,gradeHundredthsPercent,preview,counts,
    landPixels,highestGradePercent:Number(max.toFixed(2)),
    steepAndExtremePercent:landPixels?Number((100*(counts[2]+counts[3])/landPixels).toFixed(1)):0,
    regions:regionStats.map(region=>({
      ...region,maximumGradePercent:Number(region.maximumGradePercent.toFixed(2)),
      steepAndExtremePercent:region.pixelCount?
        Number((100*(region.counts[2]+region.counts[3])/region.pixelCount).toFixed(1)):0,
    })),
  };
}

/** Sample an existing original war route along its canonical great-circle
 * polyline (fallback to endpoints for historical V102). Unwrapped longitudes
 * are normalized through the exact longitude-seam mapping from V101.
 * At this map scale grades are landform indicators, not tactical road slopes. */
export function samplePlanetTerrainRoutesV152(
  planet:WarPlanetV96,raster:PlanetReliefRasterV150,slopes:PlanetTerrainSlopeV152,
):PlanetTerrainRouteDossierV152{
  if(planet.procedural?.recipe.version!==115||raster.width!==slopes.width||
    raster.height!==slopes.height||raster.radiusKm!==slopes.radiusKm)
    throw new RangeError("Seuls les profils des routes physiques V115 sont éligibles.");
  const width=raster.width,height=raster.height;
  const center=new Map(planet.territories.map(t=>[t.id,[t.longitude,t.latitude] as const]));
  const heightAt=(index:number)=>sampleHeightMeters(raster.rg16,index,raster.maxElevationMeters);
  const read=(lon:number,lat:number)=>{
    const x=clamp(Math.floor((((lon+180)%360+360)%360)/360*width),0,width-1);
    const y=clamp(Math.floor((90-clamp(lat,-90,90))/180*height),0,height-1);
    const k=y*width+x;
    return raster.rg16[k*4+3]>=128?{index:k,meters:heightAt(k),grade:slopes.gradeHundredthsPercent[k]/100}:null;
  };
  const routes:PlanetRouteTerrainV152[]=[];
  for(const route of planet.procedural.routes){
    const start=center.get(route.fromId),end=center.get(route.toId);
    if(!start||!end)throw new RangeError("Route possédant un territoire inexistant.");
    const existing="points" in route&&Array.isArray(route.points)&&route.points.length>=2
      ? route.points:[start,end];
    let samples=0,landSamples=0,nonLandSamples=0,totalGrade=0,maxGrade=0;
    let previous:{index:number;meters:number;grade:number}|null=null;
    let up=0,down=0;
    for(let section=0;section<existing.length-1;section++){
      const a=existing[section],b=existing[section+1];
      if(![a[0],a[1],b[0],b[1]].every(Number.isFinite))continue;
      let dlon=b[0]-a[0];
      if(dlon>180)dlon-=360;
      if(dlon< -180)dlon+=360;
      const dlat=b[1]-a[1];
      const steps=clamp(Math.ceil(Math.max(Math.abs(dlon)*width/360,
        Math.abs(dlat)*height/180)),1,2048);
      for(let step=section===0?0:1;step<=steps;step++){
        const t=step/steps;
        const point=read(a[0]+dlon*t,a[1]+dlat*t);
        samples++;
        if(!point){nonLandSamples++;previous=null;continue;}
        landSamples++;
        totalGrade+=point.grade;
        maxGrade=Math.max(maxGrade,point.grade);
        if(previous&&previous.index!==point.index){
          const delta=point.meters-previous.meters;
          if(delta>=0)up+=delta;else down-=delta;
        }
        previous=point;
      }
    }
    const avg=landSamples?totalGrade/landSamples:0;
    const terrainClass:PlanetRouteTerrainV152["class"]=
      route.kind==="crossing"?"medium-crossing":
        landSamples<2?"insufficient-samples":
          maxGrade<1?"flat":maxGrade<3?"rolling":maxGrade<8?"steep":"extreme";
    routes.push({
      fromId:route.fromId,toId:route.toId,kind:route.kind,
      lengthKm:Math.round(route.distanceDegrees*degree*raster.radiusKm),
      samples,landSamples,nonLandSamples,maximumGradePercent:Number(maxGrade.toFixed(2)),
      averageGradePercent:Number(avg.toFixed(2)),
      uphillMeters:Math.round(up),downhillMeters:Math.round(down),class:terrainClass,
    });
  }
  const classCounts={
    flat:0,rolling:0,steep:0,extreme:0,"medium-crossing":0,"insufficient-samples":0,
  };
  for(const r of routes)classCounts[r.class]++;
  return {
    format:"yautja-planet-route-terrain-study",version:152,
    worldCode:planet.id,radiusKm:raster.radiusKm,mapWidth:width,mapHeight:height,
    routes,classCounts,
    limitations:[
      "This is a coarse visual slope diagnostic based on V150, not an in-game movement or passability rule.",
      "Route samples approximate existing canonical polylines. Medium crossings remain valid existing routes.",
      "Sampled water along a land route may be aliasing of the categorical coast mask; it does not invalidate a military link.",
      "The study does not modify borders, faction ownership, pathfinding, resources, V115 codes or campaign saves.",
    ],
  };
}
