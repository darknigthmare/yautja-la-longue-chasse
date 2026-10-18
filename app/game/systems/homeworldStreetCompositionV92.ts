import authored from '../data/homeworldStreetCompositionsV92.json';
import {HOMEWORLD_STREET_DECOR_ART_V83,homeworldStreetDecorOverlapV83} from './homeworldStreetDecorV83';
import {HOMEWORLD_STREET_DECOR_ART_V84,compileHomeworldStreetDecorV84,homeworldStreetDecorPolygonV84,
 homeworldStreetDecorUsageV84,homeworldStreetDecorSafetyV84,type HomeworldStreetDecorArtV84,
 type HomeworldStreetDecorPropV84,type HomeworldStreetDecorPlacementInputV84} from './homeworldStreetDecorV84';
import {HOMEWORLD_GEOMETRY_V64} from './homeworldGeometryV64';
import type {HomeworldLevelV77} from './homeworldWorldV77';
import type {HomeworldNativeSpriteCellV64} from '../HomeworldNativePropV64';

type Point={readonly x:number;readonly y:number};
export interface HomeworldStreetCompositionPropV92 extends HomeworldStreetDecorPropV84 {
 readonly compositionId:string;
}
export interface HomeworldStreetCompositionInputV92 extends HomeworldStreetDecorPlacementInputV84 {
 readonly facadeObstruction:(item:HomeworldStreetCompositionPropV92)=>string|null;
}
/** Reuse original bytes, pivot, contact hull, native facing and working face.
 * Nine sources remain nine sources; adding instances never fabricates art. */
export const HOMEWORLD_STREET_COMPOSITION_ART_V92:Readonly<Record<string,HomeworldStreetDecorArtV84>>={
 ...Object.fromEntries(Object.entries(HOMEWORLD_STREET_DECOR_ART_V83).map(([id,art])=>[id,{...art,safetyMargin:0}])),
 ...HOMEWORLD_STREET_DECOR_ART_V84,
};
export const HOMEWORLD_STREET_COMPOSITION_CANDIDATES_V92:readonly HomeworldStreetCompositionPropV92[]=authored.placements.map(p=>({...p,levelId:p.levelId as HomeworldLevelV77,interactive:false,solid:true}));
export const homeworldStreetCompositionPolygonV92=(item:HomeworldStreetCompositionPropV92)=>homeworldStreetDecorPolygonV84(item,HOMEWORLD_STREET_COMPOSITION_ART_V92);
export const homeworldStreetCompositionUsageV92=(item:HomeworldStreetCompositionPropV92)=>homeworldStreetDecorUsageV84(item,HOMEWORLD_STREET_COMPOSITION_ART_V92);
export const homeworldStreetCompositionSafetyV92=(item:HomeworldStreetCompositionPropV92)=>homeworldStreetDecorSafetyV84(item,HOMEWORLD_STREET_COMPOSITION_ART_V92);

export let HOMEWORLD_STREET_COMPOSITION_PROPS_V92:readonly HomeworldStreetCompositionPropV92[]=[];
export let HOMEWORLD_STREET_COMPOSITION_REFUSALS_V92:readonly {id:string;reason:string}[]=[];
let initialized=false;
const contacts=new Map<string,readonly Point[]>();
const bounds=new Map<string,{left:number;right:number;top:number;bottom:number}>();
/** Same convex contact as render/codex; a cheap broad phase keeps city movement
 * from rebuilding polygons every frame. Reservations never become solids. */
export function homeworldStreetCompositionCollisionV92(level:HomeworldLevelV77,p:Point,body={halfWidth:24,halfDepth:14}):string|null{
 for(const item of HOMEWORLD_STREET_COMPOSITION_PROPS_V92){
  if(item.levelId!==level)continue;const b=bounds.get(item.id)!;
  if(p.x+body.halfWidth<b.left||p.x-body.halfWidth>b.right||p.y+body.halfDepth<b.top||p.y-body.halfDepth>b.bottom)continue;
  const polygon=contacts.get(item.id)!;
  if(!body.halfWidth&&!body.halfDepth){
   let positive=false,negative=false;
   for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],side=(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);if(side>1e-8)positive=true;else if(side< -1e-8)negative=true;}
   if(!positive||!negative)return item.id;
  }else if(homeworldStreetDecorOverlapV83(polygon,[{x:p.x-body.halfWidth,y:p.y-body.halfDepth},{x:p.x+body.halfWidth,y:p.y-body.halfDepth},{x:p.x+body.halfWidth,y:p.y+body.halfDepth},{x:p.x-body.halfWidth,y:p.y+body.halfDepth}]))return item.id;
 }return null;
}
/** Compile exact authored placements once after V84. No search, random scatter,
 * scale reduction, doorway relocation or additional public terrain at runtime. */
export function compileHomeworldStreetCompositionV92(input:HomeworldStreetCompositionInputV92,candidates:readonly HomeworldStreetCompositionPropV92[]=HOMEWORLD_STREET_COMPOSITION_CANDIDATES_V92){
 const compiled=compileHomeworldStreetDecorV84(input,candidates,HOMEWORLD_STREET_COMPOSITION_ART_V92);
 const candidatesById=new Map(candidates.map(item=>[item.id,item]));
 const accepted:HomeworldStreetCompositionPropV92[]=[],refusals=[...compiled.refusals];
 for(const admitted of compiled.accepted){const item=candidatesById.get(admitted.id)!;const hidden=input.facadeObstruction(item);
  if(hidden)refusals.push({id:item.id,reason:'painted-facade:'+hidden});else accepted.push(item);
 }return{accepted,refusals};
}
export function configureHomeworldStreetCompositionV92(input:HomeworldStreetCompositionInputV92){
 if(initialized)return;initialized=true;
 const compiled=compileHomeworldStreetCompositionV92(input);
 HOMEWORLD_STREET_COMPOSITION_PROPS_V92=compiled.accepted;HOMEWORLD_STREET_COMPOSITION_REFUSALS_V92=compiled.refusals;
 for(const item of compiled.accepted){const polygon=homeworldStreetCompositionPolygonV92(item);contacts.set(item.id,polygon);
  bounds.set(item.id,{left:Math.min(...polygon.map(p=>p.x)),right:Math.max(...polygon.map(p=>p.x)),top:Math.min(...polygon.map(p=>p.y)),bottom:Math.max(...polygon.map(p=>p.y))});
 }
}
/** Fade only when the real actor stands behind this source on the same floor.
 * Source scale, contact, native orientation and collision remain unchanged. */
export function homeworldStreetCompositionOpacityV92(item:HomeworldStreetCompositionPropV92,actor:Point,level:HomeworldLevelV77){
 if(item.levelId!==level||actor.y>=item.y)return 1;
 const art=HOMEWORLD_STREET_COMPOSITION_ART_V92[item.artId],polygon=homeworldStreetCompositionPolygonV92(item);
 const left=Math.min(...polygon.map(p=>p.x)),right=Math.max(...polygon.map(p=>p.x));
 return actor.x>left-24&&actor.x<right+24&&(item.y-actor.y)*HOMEWORLD_GEOMETRY_V64.depthScale<art.heightWorld*item.scale+16?.28:1;
}
/** A rear occupant can meet the painted roof of a fused native prop despite
 * correct ground depth. Fade that source, never move its contact or the actor.
 * This conservative alpha-box check is not a per-pixel roof/collision model. */
export function homeworldCityFurnitureOpacityV92(item:Point&{levelId:HomeworldLevelV77},art:HomeworldNativeSpriteCellV64,
 occupants:readonly (Point&{levelId:HomeworldLevelV77})[]){
 const scale=art.heightWorld/art.alphaBounds.height,box=art.alphaBounds;
 const halfWidth=24/scale,halfDepth=14*HOMEWORLD_GEOMETRY_V64.depthScale/scale;
 for(const occupant of occupants){
  if(occupant.levelId!==item.levelId||occupant.y>=item.y)continue;
  const x=art.pivot.x+(occupant.x-item.x)/scale;
  const y=art.pivot.y+(occupant.y-item.y)*HOMEWORLD_GEOMETRY_V64.depthScale/scale;
  if(x+halfWidth>=box.x&&x-halfWidth<=box.x+box.width&&y+halfDepth>=box.y&&y-halfDepth<=box.y+box.height)return .28;
 }
 return 1;
}
/** Read-only place descriptions, not guide destinations or discovered regions.
 * Only admitted instances identify the current neighbourhood, on its own floor. */
export function homeworldStreetCompositionNeighborhoodV92(level:HomeworldLevelV77,point:Point){
 let closest:HomeworldStreetCompositionPropV92|null=null,distance=240;
 for(const item of HOMEWORLD_STREET_COMPOSITION_PROPS_V92){if(item.levelId!==level)continue;
  const current=Math.hypot(point.x-item.x,point.y-item.y);if(current<distance){closest=item;distance=current;}
 }
 if(!closest)return null;const composition=authored.compositions.find(row=>row.id===closest!.compositionId);
 return composition?{id:'composition-v92:'+composition.id,label:composition.label,detail:composition.detail}:null;
}
