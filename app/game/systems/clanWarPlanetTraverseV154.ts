import type { PlanetReliefRasterV150 } from "./clanWarPlanetReliefV150";
import type { PlanetTerrainSlopeV152 } from "./clanWarPlanetTerrainV152";

/** V154 uses actual workbook RTS-U identifiers. Mobility limits are
 * explicitly ORIGINAL prototype rules, not values or abilities asserted
 * by the Predator films or proof of local road-level accessibility. */
export const PLANET_MOBILITY_PROFILES_V154 = [
  { unitTypeId:"RTS-U01",maxGradePercent:18,effort:1.0,kind:"patrol" },
  { unitTypeId:"RTS-U02",maxGradePercent:27,effort:.85,kind:"scout" },
  { unitTypeId:"RTS-U07",maxGradePercent:32,effort:.82,kind:"mobile-hunter" },
  { unitTypeId:"RTS-U21",maxGradePercent:7,effort:1.55,kind:"armored-cart" },
  { unitTypeId:"RTS-U23",maxGradePercent:16,effort:1.15,kind:"rider" },
  { unitTypeId:"RTS-U24",maxGradePercent:11,effort:1.5,kind:"pack-beast" },
] as const;
export type PlanetMobilityUnitIdV154=typeof PLANET_MOBILITY_PROFILES_V154[number]["unitTypeId"];
export interface PlanetTraversalPointV154 {x:number;y:number}
export interface PlanetTraversalCellV154 {
  x:number;y:number;sourceX:number;sourceY:number;
  longitude:number;latitude:number;
  regionIndex:number;
  land:boolean;outside:boolean;
  elevationMeters:number;gradePercent:number;
}
export interface PlanetTraversalGridV154 {
  format:"yautja-planet-traversal-lab";
  version:154;worldCode:string;
  width:number;height:number;
  samplePixels:number;
  radiusKm:number;
  center:{ longitude:number;latitude:number;sourceX:number;sourceY:number };
  cells:readonly PlanetTraversalCellV154[];
  /** Only "dry land" is traversable. Crossing an ocean requires a separately
   * authored and verified bridge/transport connection, never a new shortcut. */
  limitations:readonly string[];
}
export interface PlanetTraversalPathV154 {
  status:"reachable"|"already-there"|"blocked"|"no-route";
  unitTypeId:PlanetMobilityUnitIdV154;
  source:PlanetTraversalPointV154;
  target:PlanetTraversalPointV154;
  path:readonly PlanetTraversalPointV154[];
  effort:number;
  distanceKm:number;
}
export interface PlanetTraversalSessionV154 {
  format:"yautja-planet-traversal-session";
  version:154;worldCode:string;
  unitTypeId:PlanetMobilityUnitIdV154;
  position:PlanetTraversalPointV154|null;
  queued:readonly PlanetTraversalPointV154[];
  walked:readonly PlanetTraversalPointV154[];
  totalDistanceKm:number;
  steps:number;
}
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const rad=Math.PI/180;
const wrap=(x:number,width:number)=>((x%width)+width)%width;
const at=(grid:PlanetTraversalGridV154,x:number,y:number)=>{
  if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=grid.width||y>=grid.height)
    throw new RangeError("Coordonnées de marche hors du terrain.");
  return grid.cells[y*grid.width+x];
};
const profileFor=(id:PlanetMobilityUnitIdV154)=>
  PLANET_MOBILITY_PROFILES_V154.find(p=>p.unitTypeId===id)!;
export function isTraversalCellPassableV154(
  cell:PlanetTraversalCellV154,unitTypeId:PlanetMobilityUnitIdV154,
):boolean{
  const profile=profileFor(unitTypeId);
  if(!profile)throw new RangeError("Unité RTS inconnue pour la traversée.");
  return cell.land&&!cell.outside&&Number.isFinite(cell.gradePercent)&&
    cell.gradePercent<=profile.maxGradePercent;
}

/** Pitches are existing GLOBAL V150 pixels, not invented 2-metre paths.
 * The sampled zone is a playable cartographic exercise and is never used as
 * a tactical mission collision mesh or an alien biotope generator. */
export function buildPlanetTraversalGridV154(
  raster:PlanetReliefRasterV150,
  slope:PlanetTerrainSlopeV152,
  regionIndexRGBA:Uint8ClampedArray,
  options:{
    worldCode:string;
    longitude:number;
    latitude:number;
    width?:number;height?:number;samplePixels?:number;
  },
):PlanetTraversalGridV154 {
  const {width:sourceW,height:sourceH,radiusKm,maxElevationMeters}=raster;
  const width=options.width??19,height=options.height??13,pitch=options.samplePixels??1;
  if(!options.worldCode||options.worldCode.length>256||
    !Number.isFinite(options.longitude)||!Number.isFinite(options.latitude)||
    Math.abs(options.latitude)>90||!Number.isInteger(width)||!Number.isInteger(height)||
    width<7||width>25||height<7||height>19||width%2!==1||height%2!==1||
    !Number.isInteger(pitch)||pitch<1||pitch>4||
    sourceW!==slope.width||sourceH!==slope.height||radiusKm!==slope.radiusKm||
    slope.gradeHundredthsPercent.length!==sourceW*sourceH||
    raster.rg16.length!==sourceW*sourceH*4 ||
    regionIndexRGBA.length!==raster.rg16.length ||
    !Number.isInteger(maxElevationMeters)||maxElevationMeters<500||maxElevationMeters>20000)
    throw new RangeError("Carte, rayon ou emplacement du franchissement incompatibles.");
  const normalized=(((options.longitude+180)%360)+360)%360;
  const requestedX=clamp(Math.floor(normalized/360*sourceW),0,sourceW-1);
  const requestedY=clamp(Math.floor((90-options.latitude)/180*sourceH),0,sourceH-1);
  let centerX=requestedX,centerY=requestedY;
  const dry=(x:number,y:number)=>y>=0&&y<sourceH&&raster.rg16[(y*sourceW+wrap(x,sourceW))*4+3]>=128;
  // Use the actual nearest known V150 dry pixel to the chosen territory
  // marker. No invented island is created when a marker lies on a shoreline.
  if(!dry(centerX,centerY)){
    let found=false;
    for(let distance=1;distance<=32&&!found;distance++){
      for(let dy=-distance;dy<=distance&&!found;dy++){
        const dx=Math.abs(distance-Math.abs(dy));
        for(const sign of dx===0?[0]:[-1,1]){
          const x=requestedX+sign*dx,y=requestedY+dy;
          if(dry(x,y)){centerX=wrap(x,sourceW);centerY=y;found=true;break;}
        }
      }
    }
  }
  const cells:PlanetTraversalCellV154[]=[];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const sx=wrap(centerX+(x-Math.floor(width/2))*pitch,sourceW);
    const sy=centerY+(y-Math.floor(height/2))*pitch;
    const outside=sy<0||sy>=sourceH;
    const index=sy*sourceW+sx;
    const land=!outside&&raster.rg16[index*4+3]>=128;
    if(!outside&&(regionIndexRGBA[index*4+3]>=128)!==land)
      throw new RangeError("Masque V124 et relief V150 désynchronisés.");
    const regionIndex=land?regionIndexRGBA[index*4]:0;
    if(land&&(regionIndex<1||regionIndex>raster.regions.length))
      throw new RangeError("Source de région étrangère dans le franchissement.");
    const bit=land?raster.rg16[index*4]*256+raster.rg16[index*4+1]:0;
    cells.push({
      x,y,sourceX:sx,sourceY:sy,
      longitude:(sx+.5)/sourceW*360-180,
      latitude:90-(sy+.5)/sourceH*180,
      regionIndex:land?regionIndex:0,
      land,outside,
      elevationMeters:land?Math.round(bit/65535*maxElevationMeters):0,
      gradePercent:land?slope.gradeHundredthsPercent[index]/100:0,
    });
  }
  return {
    format:"yautja-planet-traversal-lab",version:154,
    worldCode:options.worldCode,width,height,samplePixels:pitch,radiusKm,
    center:{
      longitude:options.longitude,latitude:options.latitude,
      sourceX:centerX,sourceY:centerY,
    },cells,
    limitations:[
      "Authoring exercise on actual V150 global pixels: cells can span several kilometres, not a local metre-scale mission map.",
      "Slope limits are prototype per-unit options based on existing RTS-U roles; no official Predator movement specifications are claimed.",
      "Medium/water pixels are blocking; legitimate strategic crossing routes require a separate verified transport actor or bridge.",
      "No war save, mission result, naval travel, mounts ownership, lore registry or territory borders are changed.",
    ],
  };
}

function validPoint(grid:PlanetTraversalGridV154,p:PlanetTraversalPointV154):boolean{
  return Number.isInteger(p.x)&&Number.isInteger(p.y)&&
    p.x>=0&&p.x<grid.width&&p.y>=0&&p.y<grid.height;
}
function physDistanceV154(a:PlanetTraversalCellV154,b:PlanetTraversalCellV154,radiusKm:number):number{
  const mid=(a.latitude+b.latitude)*rad/2;
  const lon=b.longitude-a.longitude;
  const shortest=((lon+540)%360)-180;
  return Math.hypot(shortest*rad*Math.cos(mid), (b.latitude-a.latitude)*rad)*radiusKm;
}
export function preferredTraversalStartV154(
  grid:PlanetTraversalGridV154,unitTypeId:PlanetMobilityUnitIdV154,
):PlanetTraversalPointV154|null{
  const choices=grid.cells.filter(c=>isTraversalCellPassableV154(c,unitTypeId));
  const cx=Math.floor(grid.width/2),cy=Math.floor(grid.height/2);
  choices.sort((a,b)=>{
    const da=Math.abs(a.x-cx)+Math.abs(a.y-cy);
    const db=Math.abs(b.x-cx)+Math.abs(b.y-cy);
    return da-db||a.y-b.y||a.x-b.x;
  });
  return choices.length?{x:choices[0].x,y:choices[0].y}:null;
}
/** Dijkstra with weighted grade and world-distance cells. Four-neighbour
 * edges prevent diagonal corner-cutting through an ocean or sharp cliff. */
export function planPlanetTraversalV154(
  grid:PlanetTraversalGridV154,
  start:PlanetTraversalPointV154,
  target:PlanetTraversalPointV154,
  unitTypeId:PlanetMobilityUnitIdV154,
):PlanetTraversalPathV154{
  const profile=profileFor(unitTypeId);
  if(!profile)throw new RangeError("Unité RTS inconnue.");
  if(!validPoint(grid,start)||!validPoint(grid,target))
    throw new RangeError("Origine ou destination hors de la carte.");
  const prefix={unitTypeId,source:start,target};
  const blocked=(status:PlanetTraversalPathV154["status"]):PlanetTraversalPathV154=>({
    ...prefix,status,path:[],effort:0,distanceKm:0,
  });
  if(!isTraversalCellPassableV154(at(grid,start.x,start.y),unitTypeId)||
    !isTraversalCellPassableV154(at(grid,target.x,target.y),unitTypeId))
    return blocked("blocked");
  if(start.x===target.x&&start.y===target.y)
    return {...prefix,status:"already-there",path:[start],effort:0,distanceKm:0};
  const size=grid.width*grid.height;
  const costs=new Float64Array(size).fill(Infinity);
  const distances=new Float64Array(size),previous=new Int32Array(size).fill(-1);
  const visited=new Uint8Array(size);
  const index=(p:PlanetTraversalPointV154)=>p.y*grid.width+p.x;
  const begin=index(start),end=index(target);
  costs[begin]=0;
  const offsets=[[1,0],[0,1],[-1,0],[0,-1]] as const;
  for(let search=0;search<size;search++){
    let current=-1,best=Infinity;
    for(let i=0;i<size;i++)if(!visited[i]&&costs[i]<best){best=costs[i];current=i;}
    if(current<0||!Number.isFinite(best))break;
    if(current===end)break;
    visited[current]=1;
    const cx=current%grid.width,cy=Math.floor(current/grid.width);
    const from=at(grid,cx,cy);
    for(const [dx,dy] of offsets){
      const nx=cx+dx,ny=cy+dy;
      if(nx<0||ny<0||nx>=grid.width||ny>=grid.height)continue;
      const ni=ny*grid.width+nx,to=at(grid,nx,ny);
      if(visited[ni]||!isTraversalCellPassableV154(to,unitTypeId))continue;
      const distance=physDistanceV154(from,to,grid.radiusKm);
      const hill=Math.max(0,to.elevationMeters-from.elevationMeters);
      const normalizedGrade=to.gradePercent/Math.max(1,profile.maxGradePercent);
      const step=profile.effort*(1+normalizedGrade*.5+hill/10000)+distance/1000;
      const alternative=costs[current]+step;
      if(alternative<costs[ni]){
        costs[ni]=alternative;distances[ni]=distances[current]+distance;
        previous[ni]=current;
      }
    }
  }
  if(!Number.isFinite(costs[end]))return blocked("no-route");
  const route:PlanetTraversalPointV154[]=[];
  for(let cursor=end;cursor>=0;cursor=previous[cursor]){
    route.push({x:cursor%grid.width,y:Math.floor(cursor/grid.width)});
    if(cursor===begin)break;
  }
  route.reverse();
  if(route[0]?.x!==start.x||route[0]?.y!==start.y)
    throw new Error("Chemin de franchissement impossible à reconstruire.");
  return {
    ...prefix,status:"reachable",path:route,
    effort:Math.round(costs[end]*100)/100,
    distanceKm:Math.round(distances[end]*100)/100,
  };
}
export function createPlanetTraversalSessionV154(
  grid:PlanetTraversalGridV154,unitTypeId:PlanetMobilityUnitIdV154,
):PlanetTraversalSessionV154{
  if(!profileFor(unitTypeId))throw new RangeError("Unité RTS inconnue.");
  const start=preferredTraversalStartV154(grid,unitTypeId);
  return {
    format:"yautja-planet-traversal-session",version:154,worldCode:grid.worldCode,
    unitTypeId,position:start,queued:[],walked:start?[start]:[],
    totalDistanceKm:0,steps:0,
  };
}
export function commitPlanetTraversalPlanV154(
  state:PlanetTraversalSessionV154,grid:PlanetTraversalGridV154,
  plan:PlanetTraversalPathV154,
):PlanetTraversalSessionV154{
  if(state.worldCode!==grid.worldCode||!state.position||
    plan.unitTypeId!==state.unitTypeId||
    plan.source.x!==state.position.x||plan.source.y!==state.position.y||
    plan.status!=="reachable")
    return state;
  const canonical=planPlanetTraversalV154(grid,state.position,plan.target,state.unitTypeId);
  if(canonical.status!=="reachable")return state;
  return {...state,queued:canonical.path.slice(1)};
}
export function advancePlanetTraversalV154(
  state:PlanetTraversalSessionV154,grid:PlanetTraversalGridV154,
):PlanetTraversalSessionV154{
  if(!state.position||!state.queued.length||state.worldCode!==grid.worldCode)return state;
  const next=state.queued[0];
  if(Math.abs(next.x-state.position.x)+Math.abs(next.y-state.position.y)!==1||
    !validPoint(grid,next)||
    !isTraversalCellPassableV154(at(grid,next.x,next.y),state.unitTypeId))
    return state;
  const distance=physDistanceV154(at(grid,state.position.x,state.position.y),
    at(grid,next.x,next.y),grid.radiusKm);
  return {
    ...state,position:next,queued:state.queued.slice(1),
    walked:[...state.walked,next],steps:state.steps+1,
    totalDistanceKm:Math.round((state.totalDistanceKm+distance)*100)/100,
  };
}
