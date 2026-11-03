import authored from '../data/homeworldDressingV113.json';
import {HOMEWORLD_COURT_ART_V80,homeworldCourtPolygonV80,homeworldCourtTouchesV80} from './homeworldCourtArtV80';
import type {HomeworldExteriorModuleV76} from './homeworldExteriorDecorV76';
import {homeworldBuildingTouchesV76,homeworldBuildingGroundFrameV76} from './homeworldGeometryV64';
import {HOMEWORLD_STREET_COMPOSITION_ART_V92,compileHomeworldStreetCompositionV92,homeworldStreetCompositionPolygonV92,
  type HomeworldStreetCompositionInputV92,type HomeworldStreetCompositionPropV92} from './homeworldStreetCompositionV92';
import {homeworldStreetDecorOverlapV83} from './homeworldStreetDecorV83';
import type {HomeworldLevelV77} from './homeworldWorldV77';
import type {HomeworldBuildingModule} from './homeworldCity';

/** V113 dressing: more life in the existing city with existing native sources.
 *
 * Three kinds of authored instance, none of them a new image, room, service,
 * discovery or encounter:
 *  - fixtures: court/exterior sources (HOMEWORLD_COURT_ART_V80), measured
 *    contact polygon and collision of the V76/V80 exterior decor;
 *  - street places: V92 street sources compiled by the V92 compiler, so each
 *    keeps its working face, warm reserve and facade-obstruction refusal;
 *  - closed facades: copies of an existing residence, workshop or store volume
 *    (same source, scale and footprint), `interactive: false`, like V78/V83.
 *
 * This registry does not import World; the mount builds facades and the V92
 * input after World is initialized (same order as V112 public places).
 * Placements are authored, never searched or moved at runtime. */
type Point={readonly x:number;readonly y:number};
type Body={halfWidth:number;halfDepth:number};

export interface HomeworldDressingFixtureV113 extends HomeworldExteriorModuleV76 {
  readonly levelId:HomeworldLevelV77;readonly purpose:string;readonly provenance:'LORE_COMPATIBLE_ORIGINAL';
}
export type HomeworldDressingPlaceV113=HomeworldStreetCompositionPropV92;
export interface HomeworldDressingFacadePlanV113 {
  readonly id:string;readonly label:string;readonly sourceBuildingId:string;readonly levelId:HomeworldLevelV77;
  readonly districtId:string|null;readonly x:number;readonly y:number;readonly purpose:string;
}
export type HomeworldDressingFacadeV113=HomeworldBuildingModule&{
  readonly levelId:HomeworldLevelV77;
  readonly sourceBuildingId:string;readonly interactive:false;readonly placementPurpose:string;
  readonly provenance:'LORE_COMPATIBLE_ORIGINAL';readonly nativeStatus:'EXISTING_NATIVE_VOLUME_REUSE_V113';
};

export const HOMEWORLD_DRESSING_ART_V113={court:HOMEWORLD_COURT_ART_V80,street:HOMEWORLD_STREET_COMPOSITION_ART_V92} as const;
export const HOMEWORLD_DRESSING_GROUPS_V113:readonly {id:string;label:string;detail:string}[]=authored.groups;
export const HOMEWORLD_DRESSING_FIXTURES_V113:readonly HomeworldDressingFixtureV113[]=authored.fixtures.map(item=>({
  ...item,levelId:item.levelId as HomeworldLevelV77,solid:true,provenance:'LORE_COMPATIBLE_ORIGINAL' as const,
}));
export const HOMEWORLD_DRESSING_PLACE_CANDIDATES_V113:readonly HomeworldDressingPlaceV113[]=authored.places.map(item=>({
  ...item,levelId:item.levelId as HomeworldLevelV77,interactive:false,solid:true,
}));
export const HOMEWORLD_DRESSING_FACADE_PLANS_V113:readonly HomeworldDressingFacadePlanV113[]=authored.facades.map(item=>({
  ...item,levelId:item.levelId as HomeworldLevelV77,
}));
export const homeworldDressingFixturePolygonV113=(item:HomeworldDressingFixtureV113)=>homeworldCourtPolygonV80(item);
export const homeworldDressingPlacePolygonV113=(item:HomeworldDressingPlaceV113)=>homeworldStreetCompositionPolygonV92(item);
export const homeworldDressingFacadePolygonV113=(item:HomeworldDressingFacadeV113)=>homeworldBuildingGroundFrameV76(item).polygon;

export let HOMEWORLD_DRESSING_PLACES_V113:readonly HomeworldDressingPlaceV113[]=[];
export let HOMEWORLD_DRESSING_PLACE_REFUSALS_V113:readonly {id:string;reason:string}[]=[];
export let HOMEWORLD_DRESSING_FACADES_V113:readonly HomeworldDressingFacadeV113[]=[];

/** Broad phase: 256u buckets per floor; the narrow phase is each source's own
 * collision (court SAT, V92 convex contact, building ground frame). */
const CELL=256;
type Entry={kind:'prop'|'building';id:string;left:number;right:number;top:number;bottom:number;touches:(p:Point,body:Body)=>boolean};
const buckets=new Map<string,Entry[]>();
const recoveryBounds=new Map<string,Pick<Entry,'left'|'right'|'top'|'bottom'>>();
const key=(level:string,x:number,y:number)=>level+':'+x+':'+y;
function index(level:string,polygon:readonly Point[],entry:Omit<Entry,'left'|'right'|'top'|'bottom'>){
  const xs=polygon.map(p=>p.x),ys=polygon.map(p=>p.y);
  const e:Entry={...entry,left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};
  recoveryBounds.set(e.id,{left:e.left,right:e.right,top:e.top,bottom:e.bottom});
  for(let x=Math.floor(e.left/CELL);x<=Math.floor(e.right/CELL);x++)for(let y=Math.floor(e.top/CELL);y<=Math.floor(e.bottom/CELL);y++){
    const k=key(level,x,y);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k)!.push(e);
  }
}

/** A retained checkpoint may lie inside a whole newly placed facade. Bound
 * its recovery search by that actual contact, never by the whole city. */
export function homeworldDressingRecoveryRadiusV113(id:string,point:Point,body:Body):number {
  const box=recoveryBounds.get(id);if(!box)return 0;
  const corner=Math.hypot(Math.max(Math.abs(point.x-box.left),Math.abs(point.x-box.right)),
    Math.max(Math.abs(point.y-box.top),Math.abs(point.y-box.bottom)));
  return Math.ceil((corner+Math.hypot(body.halfWidth,body.halfDepth)+48)/8)*8;
}

export function homeworldDressingCollisionV113(levelId:HomeworldLevelV77,point:Point,body:Body={halfWidth:24,halfDepth:14}):{kind:'prop'|'building';id:string}|null{
  const seen=new Set<Entry>();
  for(let x=Math.floor((point.x-body.halfWidth)/CELL);x<=Math.floor((point.x+body.halfWidth)/CELL);x++)
    for(let y=Math.floor((point.y-body.halfDepth)/CELL);y<=Math.floor((point.y+body.halfDepth)/CELL);y++){
      for(const e of buckets.get(key(levelId,x,y))??[]){
        if(seen.has(e))continue;seen.add(e);
        if(point.x+body.halfWidth<e.left||point.x-body.halfWidth>e.right||point.y+body.halfDepth<e.top||point.y-body.halfDepth>e.bottom)continue;
        if(e.touches(point,body))return{kind:e.kind,id:e.id};
      }
    }
  return null;
}

let configured=false;
/** Called once by the mount, after World and every earlier provider exist. */
export function configureHomeworldDressingV113(input:HomeworldStreetCompositionInputV92,facades:readonly HomeworldDressingFacadeV113[]){
  if(configured)return;configured=true;
  HOMEWORLD_DRESSING_FACADES_V113=facades;
  // Solids appear only once mounted: every provider compiled before V113
  // (V78 generated props, V84, V92, V112) keeps priority over the dressing.
  for(const item of HOMEWORLD_DRESSING_FIXTURES_V113)
    index(item.levelId,homeworldDressingFixturePolygonV113(item),{kind:'prop',id:item.id,touches:(p,body)=>homeworldCourtTouchesV80(item,p,body)});
  for(const facade of facades)index(facade.levelId,homeworldDressingFacadePolygonV113(facade),
    {kind:'building',id:facade.id,touches:(p,body)=>homeworldBuildingTouchesV76(facade,p,body)});
  const result=compileHomeworldStreetCompositionV92(input,HOMEWORLD_DRESSING_PLACE_CANDIDATES_V113);
  HOMEWORLD_DRESSING_PLACES_V113=result.accepted;HOMEWORLD_DRESSING_PLACE_REFUSALS_V113=result.refusals;
  for(const item of result.accepted){
    const polygon=homeworldDressingPlacePolygonV113(item);
    index(item.levelId,polygon,{kind:'prop',id:item.id,touches:(p,body)=>{
      if(!body.halfWidth&&!body.halfDepth){
        let positive=false,negative=false;
        for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],side=(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
          if(side>1e-8)positive=true;else if(side< -1e-8)negative=true;}
        return !positive||!negative;
      }
      return homeworldStreetDecorOverlapV83(polygon,[{x:p.x-body.halfWidth,y:p.y-body.halfDepth},{x:p.x+body.halfWidth,y:p.y-body.halfDepth},
        {x:p.x+body.halfWidth,y:p.y+body.halfDepth},{x:p.x-body.halfWidth,y:p.y+body.halfDepth}]);
    }});
  }
}
