import sources from '../data/homeworldStreetDecorSourcesV84.json';
import authored from '../data/homeworldStreetDecorPlacementV84.json';
import {HOMEWORLD_GEOMETRY_V64} from './homeworldGeometryV64';
import {homeworldStreetDecorOverlapV83} from './homeworldStreetDecorV83';
import type {HomeworldNativeSpriteCellV64} from '../HomeworldNativePropV64';
import type {HomeworldLevelV77} from './homeworldWorldV77';

type Point={readonly x:number;readonly y:number};
type Body={readonly halfWidth:number;readonly halfDepth:number};
interface Measurement {heightWorld:number;family:string;function:string;facing:string;pivot:Point;support:readonly Point[];workingEdge:readonly Point[]|null;usageDepth:number;socialMargin:number;safetyMargin:number}
export interface HomeworldStreetDecorArtV84 extends HomeworldNativeSpriteCellV64 {
 readonly id:string;readonly sha256:string;readonly nativeGroundSupport:readonly Point[];
 readonly workingEdge:readonly Point[]|null;readonly usageDepth:number;readonly socialMargin:number;readonly safetyMargin:number;
 readonly family:string;readonly function:string;readonly facing:string;readonly provenance:'LORE_COMPATIBLE_ORIGINAL';readonly metrology:string;
}
export interface HomeworldStreetDecorPropV84 extends Point {
 readonly id:string;readonly artId:string;readonly levelId:HomeworldLevelV77;readonly districtId:string;
 readonly buildingId:string|null;readonly scale:number;readonly label:string;readonly purpose:string;
 readonly interactive:false;readonly solid:true;
}
export interface HomeworldStreetDecorReserveV84 {readonly id:string;readonly levelId:HomeworldLevelV77;readonly polygon:readonly Point[]}
export interface HomeworldStreetDecorPlacementInputV84 {
 readonly reserves:readonly HomeworldStreetDecorReserveV84[];
 readonly terrain:(level:HomeworldLevelV77,point:Point,body:Body)=>boolean;
 readonly collision:(level:HomeworldLevelV77,point:Point,body:Body)=>{id:string}|null;
}
/** Source/geometry only: safe to reuse in interiors, World collisions and
 * preload. Activation belongs to the late mount provider after old native
 * city furniture has compiled; no already preserved fixture is displaced. */
const hull=(points:readonly Point[]):readonly Point[]=>{
 const rows=points.slice().sort((a,b)=>a.x-b.x||a.y-b.y),cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const half=(list:readonly Point[])=>{const out:Point[]=[];for(const p of list){while(out.length>1&&cross(out[out.length-2],out[out.length-1],p)<=0)out.pop();out.push(p);}return out;};
 return[...half(rows).slice(0,-1),...half(rows.slice().reverse()).slice(0,-1)];
};
const measurements=authored.measurements as Readonly<Record<string,Measurement>>;
export const HOMEWORLD_STREET_DECOR_ART_V84=Object.fromEntries(sources.sources.map(source=>{
 const measured=measurements[source.id],art:HomeworldStreetDecorArtV84={...source,...measured,
  sourceRect:{x:0,y:0,width:source.sourceWidth,height:source.sourceHeight},nativeGroundSupport:hull(measured.support),
  provenance:'LORE_COMPATIBLE_ORIGINAL',metrology:authored.metrology};
 return[source.id,art];
})) as Readonly<Record<string,HomeworldStreetDecorArtV84>>;
export const HOMEWORLD_STREET_DECOR_CANDIDATES_V84:readonly HomeworldStreetDecorPropV84[]=authored.placements.map(p=>({...p,levelId:p.levelId as HomeworldLevelV77,interactive:false,solid:true}));
export const HOMEWORLD_STREET_DECOR_SCENE_SOURCES_V84=Object.values(HOMEWORLD_STREET_DECOR_ART_V84).map(a=>({src:a.src,sourceWidth:a.sourceWidth,sourceHeight:a.sourceHeight,kind:'scene' as const}));
export function homeworldStreetDecorPolygonV84(item:HomeworldStreetDecorPropV84):readonly Point[]{
 const art=HOMEWORLD_STREET_DECOR_ART_V84[item.artId],scale=art.heightWorld*item.scale/art.alphaBounds.height;
 return art.nativeGroundSupport.map(p=>({x:item.x+(p.x-art.pivot.x)*scale,y:item.y+(p.y-art.pivot.y)*scale/HOMEWORLD_GEOMETRY_V64.depthScale}));
}
export function homeworldStreetDecorUsageV84(item:HomeworldStreetDecorPropV84):readonly Point[]|null{
 const art=HOMEWORLD_STREET_DECOR_ART_V84[item.artId];if(!art.workingEdge||!art.usageDepth)return null;
 const scale=art.heightWorld*item.scale/art.alphaBounds.height,points=art.workingEdge.map(p=>({x:item.x+(p.x-art.pivot.x)*scale,y:item.y+(p.y-art.pivot.y)*scale/HOMEWORLD_GEOMETRY_V64.depthScale}));
 const a=points[0],b=points[1],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),tx=dx/length,ty=dy/length,nx=-ty,ny=tx,pad=24;
 return[{x:a.x-tx*pad,y:a.y-ty*pad},{x:b.x+tx*pad,y:b.y+ty*pad},{x:b.x+tx*pad+nx*art.usageDepth,y:b.y+ty*pad+ny*art.usageDepth},{x:a.x-tx*pad+nx*art.usageDepth,y:a.y-ty*pad+ny*art.usageDepth}];
}
/** Reservation only. Heat/working clearance never creates an invisible wall. */
export function homeworldStreetDecorSafetyV84(item:HomeworldStreetDecorPropV84):readonly Point[]|null{
 const margin=HOMEWORLD_STREET_DECOR_ART_V84[item.artId].safetyMargin;if(!margin)return null;
 return hull(homeworldStreetDecorPolygonV84(item).flatMap(p=>[-1,1].flatMap(x=>[-1,1].map(y=>({x:p.x+x*margin,y:p.y+y*margin})))));
}
const rect=(p:Point,b:Body)=>[{x:p.x-b.halfWidth,y:p.y-b.halfDepth},{x:p.x+b.halfWidth,y:p.y-b.halfDepth},{x:p.x+b.halfWidth,y:p.y+b.halfDepth},{x:p.x-b.halfWidth,y:p.y+b.halfDepth}];
const contains=(p:Point,poly:readonly Point[])=>{let positive=false,negative=false;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],side=(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);if(side>1e-8)positive=true;else if(side< -1e-8)negative=true;if(positive&&negative)return false;}return true;};
/** Cover the actual convex contact polygon in triangles, not its transparent
 * alpha rectangle. Vertex and interstitial samples share runtime semantics. */
const coverage=(poly:readonly Point[])=>{
 const center={x:poly.reduce((sum,p)=>sum+p.x,0)/poly.length,y:poly.reduce((sum,p)=>sum+p.y,0)/poly.length},points:Point[]=[center,...poly];
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],steps=Math.max(1,Math.ceil(Math.max(Math.hypot(a.x-center.x,a.y-center.y),Math.hypot(b.x-center.x,b.y-center.y),Math.hypot(b.x-a.x,b.y-a.y))/20));
  for(let u=0;u<=steps;u++)for(let v=0;v<=steps-u;v++)points.push({x:center.x+(a.x-center.x)*u/steps+(b.x-center.x)*v/steps,y:center.y+(a.y-center.y)*u/steps+(b.y-center.y)*v/steps});
 }return points;
};
export let HOMEWORLD_STREET_DECOR_PROPS_V84:readonly HomeworldStreetDecorPropV84[]=[];
export let HOMEWORLD_STREET_DECOR_REFUSALS_V84:readonly {id:string;reason:string}[]=[];
let initialized=false;
export function homeworldStreetDecorCollisionV84(level:HomeworldLevelV77,p:Point,body:Body={halfWidth:24,halfDepth:14}):string|null{
 return HOMEWORLD_STREET_DECOR_PROPS_V84.find(item=>item.levelId===level&&(!body.halfWidth&&!body.halfDepth?contains(p,homeworldStreetDecorPolygonV84(item)):homeworldStreetDecorOverlapV83(homeworldStreetDecorPolygonV84(item),rect(p,body))))?.id??null;
}
/** Runtime policy, never an executed QA report. Exact candidates are accepted
 * or retained as refusals: no scatter search, doorway move or size reduction. */
export function configureHomeworldStreetDecorV84(input:HomeworldStreetDecorPlacementInputV84){
 if(initialized)return;initialized=true;
 const accepted:HomeworldStreetDecorPropV84[]=[],refusals:{id:string;reason:string}[]=[];
 for(const item of HOMEWORLD_STREET_DECOR_CANDIDATES_V84){
  const physical=homeworldStreetDecorPolygonV84(item),usage=homeworldStreetDecorUsageV84(item),safety=homeworldStreetDecorSafetyV84(item),zones=[physical,...(usage?[usage]:[]),...(safety?[safety]:[])];
  const reserve=input.reserves.find(r=>r.levelId===item.levelId&&zones.some(poly=>homeworldStreetDecorOverlapV83(poly,r.polygon)));let reason=reserve?'reserved:'+reserve.id:null;
  if(!reason)for(const other of accepted){if(other.levelId!==item.levelId)continue;
   const otherZones=[homeworldStreetDecorPolygonV84(other),homeworldStreetDecorUsageV84(other),homeworldStreetDecorSafetyV84(other)].filter((poly):poly is readonly Point[]=>poly!==null);
   if(zones.some(poly=>otherZones.some(otherPoly=>homeworldStreetDecorOverlapV83(poly,otherPoly)))){reason='other-native-space:'+other.id;break;}
  }
  if(!reason)for(const p of coverage(physical)){if(!input.terrain(item.levelId,p,{halfWidth:0,halfDepth:0})){reason='unsupported-contact';break;}const old=input.collision(item.levelId,p,{halfWidth:12,halfDepth:12});if(old){reason='existing-solid:'+old.id;break;}}
  if(!reason&&usage){const center={x:usage.reduce((sum,p)=>sum+p.x,0)/usage.length,y:usage.reduce((sum,p)=>sum+p.y,0)/usage.length};
   for(const p of coverage(usage).map(p=>({x:center.x+(p.x-center.x)*.7,y:center.y+(p.y-center.y)*.7}))){if(!input.terrain(item.levelId,p,{halfWidth:24,halfDepth:14})){reason='unsupported-use';break;}const old=input.collision(item.levelId,p,{halfWidth:24,halfDepth:14});if(old){reason='blocked-use:'+old.id;break;}}
  }
  if(!reason&&safety)for(const p of coverage(safety)){const old=input.collision(item.levelId,p,{halfWidth:0,halfDepth:0});if(old){reason='blocked-safety:'+old.id;break;}}
  if(reason)refusals.push({id:item.id,reason});else accepted.push(item);
 }
 HOMEWORLD_STREET_DECOR_PROPS_V84=accepted;HOMEWORLD_STREET_DECOR_REFUSALS_V84=refusals;
}
