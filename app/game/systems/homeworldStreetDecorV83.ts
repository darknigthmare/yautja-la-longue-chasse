import sources from '../data/homeworldStreetDecorSourcesV83.json';
import authored from '../data/homeworldStreetDecorPlacementV83.json';
import {HOMEWORLD_GEOMETRY_V64} from './homeworldGeometryV64';
import type {HomeworldNativeSpriteCellV64} from '../HomeworldNativePropV64';
import type {HomeworldLevelV77} from './homeworldWorldV77';

type Point={readonly x:number;readonly y:number};
type Body={readonly halfWidth:number;readonly halfDepth:number};
export interface HomeworldStreetDecorArtV83 extends HomeworldNativeSpriteCellV64 {
 readonly id:string;readonly sha256:string;readonly nativeGroundSupport:readonly Point[];
 readonly workingEdge:readonly Point[]|null;readonly usageDepth:number;readonly socialMargin:number;
 readonly family:string;readonly function:string;readonly facing:string;
 readonly provenance:'LORE_COMPATIBLE_ORIGINAL';readonly metrology:string;
}
export interface HomeworldStreetDecorPropV83 extends Point {
 readonly id:string;readonly artId:string;readonly levelId:HomeworldLevelV77;readonly districtId:string;
 readonly buildingId:string|null;readonly scale:number;readonly label:string;readonly purpose:string;
 readonly interactive:false;readonly solid:true;
}
/** Pure source/geometry/placement provider, with no live World import. It is
 * safe for the World collision function, renderer, preload and interior art
 * reuse. A composite drawing remains ONE source, including its fused items. */
const hull=(points:readonly Point[]):readonly Point[]=>{
 const rows=[...points].sort((a,b)=>a.x-b.x||a.y-b.y),cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const half=(list:readonly Point[])=>{const out:Point[]=[];for(const point of list){while(out.length>1&&cross(out[out.length-2],out[out.length-1],point)<=0)out.pop();out.push(point);}return out;};
 return[...half(rows).slice(0,-1),...half(rows.slice().reverse()).slice(0,-1)];
};
export const HOMEWORLD_STREET_DECOR_ART_V83=Object.fromEntries(sources.sources.map(source=>{
 const measurement=(authored.measurements as Record<string,typeof authored.measurements['merchant-counter-left']|typeof authored.measurements['basalt-planter-left']>)[source.id];
 const art:HomeworldStreetDecorArtV83={...source,...measurement,id:source.id,
  sourceRect:{x:0,y:0,width:source.sourceWidth,height:source.sourceHeight},nativeGroundSupport:hull(measurement.support),
  provenance:'LORE_COMPATIBLE_ORIGINAL',metrology:authored.metrology};
 return[source.id,art];
})) as Readonly<Record<string,HomeworldStreetDecorArtV83>>;
export const HOMEWORLD_STREET_DECOR_CANDIDATES_V83:readonly HomeworldStreetDecorPropV83[]=authored.placements.map(p=>({...p,levelId:p.levelId as HomeworldLevelV77,interactive:false,solid:true}));
export const HOMEWORLD_STREET_DECOR_SCENE_SOURCES_V83=Object.values(HOMEWORLD_STREET_DECOR_ART_V83).map(a=>({src:a.src,sourceWidth:a.sourceWidth,sourceHeight:a.sourceHeight,kind:'scene' as const}));
export function homeworldStreetDecorPolygonV83(item:HomeworldStreetDecorPropV83):readonly Point[]{
 const art=HOMEWORLD_STREET_DECOR_ART_V83[item.artId],scale=art.heightWorld*item.scale/art.alphaBounds.height;
 return art.nativeGroundSupport.map(p=>({x:item.x+(p.x-art.pivot.x)*scale,y:item.y+(p.y-art.pivot.y)*scale/HOMEWORLD_GEOMETRY_V64.depthScale}));
}
export function homeworldStreetDecorUsageV83(item:HomeworldStreetDecorPropV83):readonly Point[]|null{
 const art=HOMEWORLD_STREET_DECOR_ART_V83[item.artId];if(!art.workingEdge||!art.usageDepth)return null;
 const scale=art.heightWorld*item.scale/art.alphaBounds.height,points=art.workingEdge.map(p=>({x:item.x+(p.x-art.pivot.x)*scale,y:item.y+(p.y-art.pivot.y)*scale/HOMEWORLD_GEOMETRY_V64.depthScale}));
 const a=points[0],b=points[1],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),tx=dx/length,ty=dy/length,nx=-ty,ny=tx,pad=24;
 return[{x:a.x-tx*pad,y:a.y-ty*pad},{x:b.x+tx*pad,y:b.y+ty*pad},{x:b.x+tx*pad+nx*art.usageDepth,y:b.y+ty*pad+ny*art.usageDepth},{x:a.x-tx*pad+nx*art.usageDepth,y:a.y-ty*pad+ny*art.usageDepth}];
}
export function homeworldStreetDecorOverlapV83(a:readonly Point[],b:readonly Point[]){
 for(const poly of [a,b])for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length],nx=-(q.y-p.y),ny=q.x-p.x,left=a.map(v=>v.x*nx+v.y*ny),right=b.map(v=>v.x*nx+v.y*ny);
  if(Math.max(...left)<=Math.min(...right)||Math.max(...right)<=Math.min(...left))return false;
 }return true;
}
const rect=(point:Point,body:Body)=>[{x:point.x-body.halfWidth,y:point.y-body.halfDepth},{x:point.x+body.halfWidth,y:point.y-body.halfDepth},{x:point.x+body.halfWidth,y:point.y+body.halfDepth},{x:point.x-body.halfWidth,y:point.y+body.halfDepth}];
const contains=(point:Point,polygon:readonly Point[])=>{let positive=false,negative=false;for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],side=(b.x-a.x)*(point.y-a.y)-(b.y-a.y)*(point.x-a.x);if(side>1e-8)positive=true;else if(side< -1e-8)negative=true;if(positive&&negative)return false;}return true;};
export let HOMEWORLD_STREET_DECOR_PROPS_V83:readonly HomeworldStreetDecorPropV83[]=[];
export let HOMEWORLD_STREET_DECOR_REFUSALS_V83:readonly {id:string;reason:string}[]=[];
export function homeworldStreetDecorCollisionV83(level:HomeworldLevelV77,point:Point,body:Body={halfWidth:24,halfDepth:14}):string|null{
 return HOMEWORLD_STREET_DECOR_PROPS_V83.find(item=>item.levelId===level&&(!body.halfWidth&&!body.halfDepth?contains(point,homeworldStreetDecorPolygonV83(item)):homeworldStreetDecorOverlapV83(homeworldStreetDecorPolygonV83(item),rect(point,body))))?.id??null;
}
export interface HomeworldStreetDecorReserveV83 {readonly id:string;readonly levelId:HomeworldLevelV77;readonly polygon:readonly Point[]}
/** Invoked by the real World AFTER its terrain/doors/routines exist. This is
 * the placement safety policy of the running game, not an executed QA report.
 * It never searches arbitrary offsets or shrinks a source to force approval.
 * Rejected authored candidates remain inventoried rather than silently moved. */
export function configureHomeworldStreetDecorV83(input:{
 readonly reserves:readonly HomeworldStreetDecorReserveV83[];
 readonly terrain:(level:HomeworldLevelV77,p:Point,body:Body)=>boolean;
 readonly collision:(level:HomeworldLevelV77,p:Point,body:Body)=>{id:string}|null;
}){
 const accepted:HomeworldStreetDecorPropV83[]=[],refusals:{id:string;reason:string}[]=[];
 for(const item of HOMEWORLD_STREET_DECOR_CANDIDATES_V83){
  const physical=homeworldStreetDecorPolygonV83(item),usage=homeworldStreetDecorUsageV83(item),reserve=input.reserves.find(r=>r.levelId===item.levelId&&(homeworldStreetDecorOverlapV83(physical,r.polygon)||!!usage&&homeworldStreetDecorOverlapV83(usage,r.polygon)));
  let reason=reserve?'reserved:'+reserve.id:null;
  if(!reason)for(const other of accepted){if(other.levelId!==item.levelId)continue;const otherPhysical=homeworldStreetDecorPolygonV83(other),otherUsage=homeworldStreetDecorUsageV83(other);
   if(homeworldStreetDecorOverlapV83(physical,otherPhysical)||usage&&homeworldStreetDecorOverlapV83(usage,otherPhysical)||otherUsage&&homeworldStreetDecorOverlapV83(physical,otherUsage)){reason='other-native-use:'+other.id;break;}
  }
  const support=[...physical,...physical.map((p,i)=>({x:(p.x+physical[(i+1)%physical.length].x)/2,y:(p.y+physical[(i+1)%physical.length].y)/2}))];
  if(!reason)for(const point of support){if(!input.terrain(item.levelId,point,{halfWidth:0,halfDepth:0})){reason='unsupported-contact';break;}const old=input.collision(item.levelId,point,{halfWidth:12,halfDepth:12});if(old){reason='existing-solid:'+old.id;break;}}
  if(!reason&&usage){const center={x:usage.reduce((sum,p)=>sum+p.x,0)/usage.length,y:usage.reduce((sum,p)=>sum+p.y,0)/usage.length};
   const usePoints=[center,...usage.map(p=>({x:center.x+(p.x-center.x)*.6,y:center.y+(p.y-center.y)*.6}))];
   for(const point of usePoints){if(!input.terrain(item.levelId,point,{halfWidth:24,halfDepth:14})){reason='unsupported-use';break;}const old=input.collision(item.levelId,point,{halfWidth:24,halfDepth:14});if(old){reason='blocked-use:'+old.id;break;}}
  }
  if(reason)refusals.push({id:item.id,reason});else accepted.push(item);
 }
 HOMEWORLD_STREET_DECOR_PROPS_V83=accepted;HOMEWORLD_STREET_DECOR_REFUSALS_V83=refusals;
}
