import rivers from "../data/earthRiversNaturalEarth110mV127.json";
import lakes from "../data/earthLakesNaturalEarth110mV127.json";
import {projectEarthCoordV126} from "./clanWarEarthV126";

/** Natural Earth real-world rivers/lakes; global-scale schematic, not riverbank
 * geometry, lake stage or local depth at a film shooting/fiction scene. */
export const EARTH_HYDRO_SOURCE_V127=Object.freeze({
 scale:110000000,license:"Public Domain",projection:"OGC:CRS84",
 riversUrl:"https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_rivers_lake_centerlines.geojson",
 lakesUrl:"https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_lakes.geojson",
 precision:"global overview only; no level navigation or modern bathymetry",
});
type GeoLine={type:"LineString"|"MultiLineString";coordinates:number[][]|number[][][]};
type GeoPoly={type:"Polygon"|"MultiPolygon";coordinates:number[][][]|number[][][][]};
interface GeoCollection<T>{type:"FeatureCollection";features:{type:"Feature";geometry:T}[];}
const knownRivers=rivers as unknown as GeoCollection<GeoLine>;
const knownLakes=lakes as unknown as GeoCollection<GeoPoly>;
function mapPoint(pair:number[],width:number,height:number){
 return projectEarthCoordV126({lon:pair[0],lat:pair[1]},width,height);
}
function asPath(points:number[][],width:number,height:number,closed=false):string{
 let path="",previous:number[]|null=null,first=true;
 for(const p of points){
  if(!Array.isArray(p)||p.length<2)return "";
  const pos=mapPoint(p,width,height);
  if(!pos)return "";
  const jumps=previous&&Math.abs(p[0]-previous[0])>180;
  path+=(first||jumps?"M":"L")+pos.x.toFixed(2)+" "+pos.y.toFixed(2)+" ";
  previous=p;first=false;
 }
 return path.trim()+(closed?" Z":"");
}
export function earthRiverPathsV127(width=1000,height=500):string[]{
 const result:string[]=[];
 for(const f of knownRivers.features){
  const coords=f.geometry.coordinates;
  const lines=f.geometry.type==="LineString"?
   [coords as number[][]]:coords as number[][][];
  for(const line of lines) {
   const path=asPath(line,width,height);
   if(path)result.push(path);
  }
 }
 return result;
}
export function earthLakePathsV127(width=1000,height=500):string[]{
 const result:string[]=[];
 for(const f of knownLakes.features){
  const coords=f.geometry.coordinates;
  const polys=f.geometry.type==="Polygon"?
    [coords as number[][][]]:coords as number[][][][];
  for(const poly of polys){
   const path=poly.map(ring=>asPath(ring,width,height,true)).filter(Boolean).join(" ");
   if(path)result.push(path);
  }
 }
 return result;
}
export function auditEarthHydrologyV127(){
 const errors:string[]=[];
 if(knownRivers.features.length<10)errors.push("Missing main rivers");
 if(knownLakes.features.length<20)errors.push("Missing main lakes");
 const rp=earthRiverPathsV127(),lp=earthLakePathsV127();
 if(rp.length<10||lp.length<20)errors.push("Cannot project hydrology");
 if(rp.some(path=>!path.startsWith("M"))||lp.some(path=>!path.includes("Z")))errors.push("Bad hydrology geometry");
 return {riverFeatures:knownRivers.features.length,lakeFeatures:knownLakes.features.length,
  projectedRivers:rp.length,projectedLakes:lp.length,errors};
}
