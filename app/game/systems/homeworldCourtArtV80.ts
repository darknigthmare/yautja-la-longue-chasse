import native from '../data/homeworldNativeDecorV80.json';
import {HOMEWORLD_EXTERIOR_ART_V76,homeworldExteriorPolygonV76,type HomeworldExteriorModuleV76,type HomeworldExteriorArtV76} from './homeworldExteriorDecorV76';
import {HOMEWORLD_GEOMETRY_V64} from './homeworldGeometryV64';
import {homeworldUrbanHullV78,homeworldUrbanOverlapV78,homeworldUrbanRectV78} from './homeworldUrbanLayoutV78';
import type {HomeworldFootprint} from './homeworldCity';
type Point={readonly x:number;readonly y:number};
const measured=Object.fromEntries(Object.entries(native.assets).map(([id,a])=>{
 const scale=a.heightWorld/a.alphaBounds.height,hull=homeworldUrbanHullV78(a.nativeGroundSupport);
 const width=(Math.max(...hull.map(p=>p.x))-Math.min(...hull.map(p=>p.x)))*scale;
 const depth=(Math.max(...hull.map(p=>p.y))-Math.min(...hull.map(p=>p.y)))*scale/HOMEWORLD_GEOMETRY_V64.depthScale;
 return['court-native-v80:'+id,{...a,nativeGroundSupport:hull,scaleWorldPerPixel:scale,footprintWorld:{width,depth}}];
}));
export const HOMEWORLD_COURT_ART_V80:Readonly<Record<string,HomeworldExteriorArtV76>>={...HOMEWORLD_EXTERIOR_ART_V76,...measured};
export function homeworldCourtPolygonV80(item:HomeworldExteriorModuleV76):readonly Point[]{
 if(!item.artId.startsWith('court-native-v80:'))return homeworldExteriorPolygonV76(item);
 const a=HOMEWORLD_COURT_ART_V80[item.artId],scale=a.scaleWorldPerPixel*item.scale;
 return a.nativeGroundSupport!.map(p=>({x:item.x+(p.x-a.pivot.x)*scale,y:item.y+(p.y-a.pivot.y)*scale/HOMEWORLD_GEOMETRY_V64.depthScale}));
}
export function homeworldCourtTouchesV80(item:HomeworldExteriorModuleV76,p:Point,body:HomeworldFootprint={halfWidth:24,halfDepth:14}){
 const poly=homeworldCourtPolygonV80(item),left=Math.min(...poly.map(v=>v.x)),right=Math.max(...poly.map(v=>v.x)),top=Math.min(...poly.map(v=>v.y)),bottom=Math.max(...poly.map(v=>v.y));
 if(p.x+body.halfWidth<left||p.x-body.halfWidth>right||p.y+body.halfDepth<top||p.y-body.halfDepth>bottom)return false;
 if(body.halfWidth===0&&body.halfDepth===0){const sides=poly.map((a,i)=>{const b=poly[(i+1)%poly.length];return(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);});return sides.every(v=>v>=-1e-8)||sides.every(v=>v<=1e-8);}
 return homeworldUrbanOverlapV78(poly,homeworldUrbanRectV78(p.x-body.halfWidth,p.y-body.halfDepth,p.x+body.halfWidth,p.y+body.halfDepth));
}
/** Seven authored uses differ rather than cloning a single courtyard kit.
 * Legacy sources and instances remain available; refused changes use their
 * original measured solid, never an invisible/mismatched visual replacement. */
export const HOMEWORLD_COURT_RECIPES_V80=[
 {id:'arrival-cargo',label:'Chargements du départ',art:['sealed-cargo-case-left','maintenance-rack','bench-left','amber-lamp-post']},
 {id:'repair',label:'Relais de maintenance',art:['maintenance-rack','sealed-cargo-case-left','bench-left','mineral-basin-right']},
 {id:'rest',label:'Halte de la promenade',art:['bench-left','amber-lamp-post','mineral-basin-right','corner-wall-left']},
 {id:'clan-relay',label:'Relais des délégations',art:['clan-banner-standard','sealed-cargo-case-left','bench-left','amber-lamp-post']},
 {id:'consultation',label:'Halte des registres',art:['clan-lectern-right','sealed-cargo-case-left','bench-left','mineral-basin-right']},
 {id:'supplies',label:'Chargements de la relève',art:['sealed-cargo-case-left','maintenance-rack','mineral-basin-right','amber-lamp-post']},
 {id:'return',label:'Halte du quai oriental',art:['clan-banner-standard','bench-left','sealed-cargo-case-left','corner-wall-left']},
] as const;
const slots=['storage','covered-work','bench','mineral-bed'];
export function homeworldCourtAlternativeV80<T extends HomeworldExteriorModuleV76>(item:T):T|null{
 const match=/^urban-v78:port-court-(\d+):(storage|covered-work|bench|mineral-bed)$/.exec(item.id);if(!match)return null;
 const recipe=HOMEWORLD_COURT_RECIPES_V80[Number(match[1])],slot=slots.indexOf(match[2]),artId='court-native-v80:'+recipe.art[slot];
 if(!HOMEWORLD_COURT_ART_V80[artId])return null;
 return{...item,artId,scale:1,label:recipe.label+' · '+recipe.art[slot],function:recipe.id};
}
