import {HOMEWORLD_CARGO_V108 as b} from './homeworldCargoDefinitionV108';
import {HOMEWORLD_STREET_DECOR_ART_V83,homeworldStreetDecorOverlapV83} from './homeworldStreetDecorV83';
import {HOMEWORLD_CITY_NATIVE_ART_V78} from './homeworldCityNativeArtV78';
import {HOMEWORLD_GEOMETRY_V64} from './homeworldGeometryV64';
type Point={readonly x:number;readonly y:number};
type Body={readonly halfWidth:number;readonly halfDepth:number};
/** Explicit V108 instances. Rejected V83 candidate placements remain rejected.
 * The full native rack/cart contact hull is retained at the painted scale. */
export const HOMEWORLD_CARGO_SOLIDS_V108=[
 ...b.racks.map(r=>{const a=HOMEWORLD_STREET_DECOR_ART_V83[r.artId],scale=a.heightWorld*r.scale/a.alphaBounds.height;return{id:`cargo-rack-${r.id}-v108`,polygon:a.nativeGroundSupport.map(p=>({x:r.x+(p.x-a.pivot.x)*scale,y:r.y+(p.y-a.pivot.y)*scale/HOMEWORLD_GEOMETRY_V64.depthScale}))};}),
 (()=>{const a=HOMEWORLD_CITY_NATIVE_ART_V78[b.cart.artId],scale=b.cart.height/a.alphaBounds.height;return{id:b.cart.id,polygon:a.nativeGroundSupport.map(p=>({x:b.cart.x+(p.x-a.pivot.x)*scale,y:b.cart.y+(p.y-a.pivot.y)*scale/HOMEWORLD_GEOMETRY_V64.depthScale}))};})(),
] as const;
const inside=(point:Point,poly:readonly Point[])=>{let positive=false,negative=false;for(let i=0;i<poly.length;i++){const a=poly[i],c=poly[(i+1)%poly.length],cross=(c.x-a.x)*(point.y-a.y)-(c.y-a.y)*(point.x-a.x);if(cross>1e-8)positive=true;else if(cross< -1e-8)negative=true;if(positive&&negative)return false;}return true;};
export function cargoFixedCollisionV108(level:string,point:Point,body:Body={halfWidth:24,halfDepth:14}):string|null{
 if(level!=='0')return null;
 const rect=[{x:point.x-body.halfWidth,y:point.y-body.halfDepth},{x:point.x+body.halfWidth,y:point.y-body.halfDepth},{x:point.x+body.halfWidth,y:point.y+body.halfDepth},{x:point.x-body.halfWidth,y:point.y+body.halfDepth}];
 return HOMEWORLD_CARGO_SOLIDS_V108.find(s=>body.halfWidth===0&&body.halfDepth===0?inside(point,s.polygon):homeworldStreetDecorOverlapV83(s.polygon,rect))?.id??null;
}
