import native from '../data/homeworldExteriorArtV76.json';
import layout from '../data/homeworldExteriorDecorV76.json';
import {HOMEWORLD_FURNITURE_ART_V72} from './homeworldFurnitureV72';
import {HOMEWORLD_GEOMETRY_V64,homeworldProjectGroundV64} from './homeworldGeometryV64';
import type {HomeworldNativeSpriteCellV64} from '../HomeworldNativePropV64';
import type {HomeworldElementRecordV64} from './homeworldElementCodexV64';

type Point={readonly x:number;readonly y:number};
export interface HomeworldExteriorArtV76 extends HomeworldNativeSpriteCellV64 {
  readonly footprintWorld:{readonly width:number;readonly depth:number};
  readonly scaleWorldPerPixel:number;readonly sha256:string;readonly lore:string;
  readonly nativeGroundSupport?:readonly Point[];
}
export const HOMEWORLD_EXTERIOR_ART_V76:Readonly<Record<string,HomeworldExteriorArtV76>>={...HOMEWORLD_FURNITURE_ART_V72,...native};
export interface HomeworldExteriorModuleV76 {
  readonly id:string;readonly artId:string;readonly x:number;readonly y:number;readonly scale:number;
  readonly districtId:string;readonly groupId:string;readonly function:string;readonly label:string;
  readonly associatedBuildingId:string|null;readonly solid:boolean;readonly elevation?:number;
}
export const HOMEWORLD_EXTERIOR_MODULES_V76:readonly HomeworldExteriorModuleV76[]=layout.modules;
export const HOMEWORLD_EXTERIOR_SOLIDS_V76=HOMEWORLD_EXTERIOR_MODULES_V76.filter(item=>item.solid);

/** Independent native contact points are deprojected exactly once into ground
 * coordinates. No camera rotation or mirror manufactures a new orientation. */
const polygonCache=new WeakMap<HomeworldExteriorModuleV76,readonly Point[]>();
export function homeworldExteriorPolygonV76(item:HomeworldExteriorModuleV76):readonly Point[] {
  const cached=polygonCache.get(item);if(cached)return cached;
  const art=HOMEWORLD_EXTERIOR_ART_V76[item.artId],scale=art.scaleWorldPerPixel*item.scale;
  if(art.nativeGroundSupport){const polygon=art.nativeGroundSupport.map(p=>({x:item.x+(p.x-art.pivot.x)*scale,
    y:item.y+(p.y-art.pivot.y)*scale/HOMEWORLD_GEOMETRY_V64.depthScale}));polygonCache.set(item,polygon);return polygon;}
  const w=art.footprintWorld.width*item.scale/2,d=art.footprintWorld.depth*item.scale;
  const polygon=[{x:item.x-w,y:item.y-d},{x:item.x+w,y:item.y-d},{x:item.x+w,y:item.y},{x:item.x-w,y:item.y}];
  polygonCache.set(item,polygon);return polygon;
}
type Footprint={left:number;right:number;top:number;bottom:number;polygon:readonly Point[]};
const footprintCache=new WeakMap<HomeworldExteriorModuleV76,Footprint>();
export function homeworldExteriorFootprintV76(item:HomeworldExteriorModuleV76) {
  const cached=footprintCache.get(item);if(cached)return cached;
  const polygon=homeworldExteriorPolygonV76(item);
  const footprint={left:Math.min(...polygon.map(p=>p.x)),right:Math.max(...polygon.map(p=>p.x)),
    top:Math.min(...polygon.map(p=>p.y)),bottom:Math.max(...polygon.map(p=>p.y)),polygon};
  footprintCache.set(item,footprint);return footprint;
}
/** SAT uses the same measured convex base as the codex and placement checks.
 * Angled benches/bins remain solid without a rectangular invisible fence. */
export function homeworldExteriorTouchesV76(item:HomeworldExteriorModuleV76,point:Point,
  actor={halfWidth:24,halfDepth:14}):boolean {
  if(!item.solid)return false;
  const bounds=homeworldExteriorFootprintV76(item);
  if(point.x+actor.halfWidth<=bounds.left||point.x-actor.halfWidth>=bounds.right
    ||point.y+actor.halfDepth<=bounds.top||point.y-actor.halfDepth>=bounds.bottom)return false;
  const polygon=homeworldExteriorPolygonV76(item),box=[{x:point.x-actor.halfWidth,y:point.y-actor.halfDepth},
    {x:point.x+actor.halfWidth,y:point.y-actor.halfDepth},{x:point.x+actor.halfWidth,y:point.y+actor.halfDepth},
    {x:point.x-actor.halfWidth,y:point.y+actor.halfDepth}];
  const axes=[{x:1,y:0},{x:0,y:1},...polygon.map((p,i)=>({x:-(polygon[(i+1)%polygon.length].y-p.y),y:polygon[(i+1)%polygon.length].x-p.x}))];
  for(const axis of axes){
    const a=polygon.map(p=>p.x*axis.x+p.y*axis.y),b=box.map(p=>p.x*axis.x+p.y*axis.y);
    if(Math.max(...a)<=Math.min(...b)||Math.max(...b)<=Math.min(...a))return false;
  }
  return true;
}
export function homeworldExteriorCollisionV76(point:Point,actor={halfWidth:24,halfDepth:14}):string|null {
  return HOMEWORLD_EXTERIOR_SOLIDS_V76.find(item=>homeworldExteriorTouchesV76(item,point,actor))?.id??null;
}
export function homeworldExteriorVisibleBoundsV76(item:HomeworldExteriorModuleV76) {
  const art=HOMEWORLD_EXTERIOR_ART_V76[item.artId],s=art.scaleWorldPerPixel*item.scale,p=homeworldProjectGroundV64(item,item.elevation??0);
  return {left:p.x+(art.alphaBounds.x-art.pivot.x)*s,top:p.y+(art.alphaBounds.y-art.pivot.y)*s,
    width:art.alphaBounds.width*s,height:art.alphaBounds.height*s};
}
export function homeworldExteriorVisibleV76(item:HomeworldExteriorModuleV76,camera:{x:number;y:number;width:number;height:number}) {
  const b=homeworldExteriorVisibleBoundsV76(item),gutter=120;
  return b.left<camera.x+camera.width+gutter&&b.left+b.width>camera.x-gutter
    &&b.top<camera.y+camera.height+gutter&&b.top+b.height>camera.y-gutter;
}
export function homeworldExteriorFadeV76(item:HomeworldExteriorModuleV76,actor:Point):boolean {
  const b=homeworldExteriorVisibleBoundsV76(item),p=homeworldProjectGroundV64(actor);
  return item.y>=actor.y&&p.x+24>b.left&&p.x-24<b.left+b.width&&p.y>b.top&&p.y-100<b.top+b.height;
}
export const HOMEWORLD_EXTERIOR_CODEX_V76:readonly HomeworldElementRecordV64[]=HOMEWORLD_EXTERIOR_MODULES_V76.map(item=>{
  const art=HOMEWORLD_EXTERIOR_ART_V76[item.artId],box=homeworldExteriorFootprintV76(item);
  return {id:item.id,label:item.label,category:'prop',districtId:item.districtId,spaceId:'world',
    position:{x:item.x,y:item.y,z:item.elevation??0},dimensions:{width:box.right-box.left,depth:box.bottom-box.top,
      height:Math.max(0,art.heightWorld*item.scale-(box.bottom-box.top)*HOMEWORLD_GEOMETRY_V64.depthScale)},
    footprint:item.solid?box:null,door:null,lore:'original-adaptation',asset:art.src,source:[
      {label:'PNG OpenAI natif mesuré',url:art.src,note:`SHA256 ${art.sha256}. ${art.lore}`}],
    constraints:[`Fonction : ${item.function}. Ensemble : ${item.groupId}.`,
      item.associatedBuildingId?`Mobilier lié à ${item.associatedBuildingId}, hors de son seuil et de son approche.`:'Mobilier de quartier sans service supplémentaire.',
      item.solid?'Volume solide au sol mesuré, partagé avec la collision réelle.':'Ornement mural non solide, sans nouveau volume de circulation.',
      'Placement individuel conservé ; aucun butin, aucune interaction ni modification des sauvegardes.',
      `Caméra yaw0/pitch35 ; échelle uniforme ${item.scale}. Appuis natifs, pas de rotation ni miroir CSS.`,
      `Pivot source (${art.pivot.x}, ${art.pivot.y}) ; projection du terrain une seule fois.`,
      'Création civique originale compatible avec le vocabulaire visuel du projet, aucune topographie canonique 1:1 affirmée.']};
});
