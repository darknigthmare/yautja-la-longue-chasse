import routes from '../data/homeworldRegionConnectionsV72.json';
import gateway from '../data/homeworldGatewayArtV72.json';
import { HOMEWORLD_PROP_ART_V64 } from './homeworldArtV64';
import { HOMEWORLD_FURNITURE_ART_V72, homeworldFurnitureFootprintV72, homeworldFurnitureTouchesV72,
  type HomeworldFurnitureInstanceV72 } from './homeworldFurnitureV72';
import type { HomeworldNativeSpriteCellV64 } from '../HomeworldNativePropV64';
import type { HomeworldRegionIdV68 } from './homeworldRegionsV68';

type Point = {readonly x:number; readonly y:number};
export type HomeworldGatewayArtIdV72 = keyof typeof gateway;
export interface HomeworldRegionConnectionV72 {
  readonly regionId: HomeworldRegionIdV68; readonly name: string;
  readonly artId: HomeworldGatewayArtIdV72;
  readonly material: 'basalt' | 'slabs' | 'resinwood' | 'ribbed';
  readonly clearWidth: number; readonly nodes: readonly Point[];
  readonly threshold: Point; readonly arrival: Point; readonly legacySign: Point;
  readonly note: string; readonly lore: 'original-adaptation';
  readonly traversal: 'existing-region-action'; readonly rewards: false;
}
export interface HomeworldGatewayArtV72 extends HomeworldNativeSpriteCellV64 {
  readonly opening: {readonly left:number; readonly right:number; readonly top:number; readonly bottom:number};
  readonly sha256: string; readonly lore: string; readonly measurementStatus: string;
}
export const HOMEWORLD_GATEWAY_ART_V72: Readonly<Record<HomeworldGatewayArtIdV72, HomeworldGatewayArtV72>> = gateway;
export const HOMEWORLD_REGION_CONNECTIONS_V72 = routes as readonly HomeworldRegionConnectionV72[];
export const HOMEWORLD_CONNECTION_WORLD_V72 = {width: 7200, height: 5900, cameraTop: -620} as const;
const accents: Readonly<Record<HomeworldRegionIdV68, string>> = {
  'ash-marches':'#da9a60', 'glass-desert':'#dbb979', 'pillar-jungle':'#83ba79', 'luminous-marshes':'#6cd3b3',
  'storm-chain':'#a7b9d2', 'leviathan-coast':'#68b5cb', 'thermal-caves':'#ed9562', 'cold-crown':'#b5dae0',
  'first-city-ruins':'#c2aa7d', 'forbidden-reserve':'#bd78b6',
};
export function homeworldConnectionByRegionV72(regionId: string) {
  return HOMEWORLD_REGION_CONNECTIONS_V72.find(item=>item.regionId===regionId) ?? null;
}
export function homeworldConnectionThresholdV72(regionId: string) {
  const item=homeworldConnectionByRegionV72(regionId); return item ? {...item.threshold} : null;
}
export function homeworldConnectionArrivalV72(regionId: string) {
  const item=homeworldConnectionByRegionV72(regionId); return item ? {...item.arrival} : null;
}
export function homeworldGatewayScaleV72(item: HomeworldRegionConnectionV72) {
  const art=HOMEWORLD_GATEWAY_ART_V72[item.artId]; return item.clearWidth/(art.opening.right-art.opening.left);
}
export function homeworldConnectionLengthV72(item: HomeworldRegionConnectionV72) {
  return item.nodes.slice(1).reduce((length,p,index)=>length+Math.hypot(p.x-item.nodes[index].x,p.y-item.nodes[index].y),0);
}

/** Each segment is a capsule-shaped polygon. Their actual overlaps are public
 * terrain, not just a drawn line. The aperture apron overlaps the final cap.
 * No runtime import of City is permitted: City imports these pure polygons. */
function capsule(a: Point,b: Point,radius: number): readonly Point[] {
  const angle=Math.atan2(b.y-a.y,b.x-a.x),points:Point[]=[];
  for(let n=0;n<=8;n++){const t=angle-Math.PI/2+n*Math.PI/8;points.push({x:b.x+Math.cos(t)*radius,y:b.y+Math.sin(t)*radius});}
  for(let n=0;n<=8;n++){const t=angle+Math.PI/2+n*Math.PI/8;points.push({x:a.x+Math.cos(t)*radius,y:a.y+Math.sin(t)*radius});}
  return points;
}
export const HOMEWORLD_CONNECTION_STREETS_V72 = HOMEWORLD_REGION_CONNECTIONS_V72.flatMap(item=>[
  ...item.nodes.slice(1).map((point,index)=>({id:`connection-v72:${item.regionId}:${index}`,label:item.name,
    kind:'passage' as const,accent:accents[item.regionId],polygon:capsule(item.nodes[index],point,item.clearWidth/2)})),
  {id:`connection-v72:${item.regionId}:aperture`,label:`Seuil · ${item.name}`,kind:'court' as const,accent:accents[item.regionId],
    polygon:[{x:item.threshold.x-item.clearWidth/2,y:item.threshold.y-125},{x:item.threshold.x+item.clearWidth/2,y:item.threshold.y-125},
      {x:item.threshold.x+item.clearWidth/2,y:item.arrival.y+60},{x:item.threshold.x-item.clearWidth/2,y:item.arrival.y+60}]},
]);
function contains(point:Point,polygon:readonly Point[]) {
  let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j]; if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }return inside;
}
export function homeworldConnectionFloorV72(point:Point) {
  return Number.isFinite(point.x)&&Number.isFinite(point.y)&&HOMEWORLD_CONNECTION_STREETS_V72.some(street=>contains(point,street.polygon));
}
export function homeworldConnectionNearestV72(point:Point,maximumDistance=120) {
  if(!Number.isFinite(maximumDistance)||maximumDistance<0)return null;
  return HOMEWORLD_REGION_CONNECTIONS_V72.filter(item=>Math.hypot(point.x-item.threshold.x,point.y-item.threshold.y)<=maximumDistance)
    .sort((a,b)=>Math.hypot(point.x-a.threshold.x,point.y-a.threshold.y)-Math.hypot(point.x-b.threshold.x,point.y-b.threshold.y))[0]??null;
}

export function homeworldGatewayFootprintsV72(item:HomeworldRegionConnectionV72) {
  const art=HOMEWORLD_GATEWAY_ART_V72[item.artId],scale=homeworldGatewayScaleV72(item),x=item.threshold.x,y=item.threshold.y;
  return [
    {id:`gateway-v72:${item.regionId}:left`,left:x+(art.alphaBounds.x-art.pivot.x)*scale,right:x-item.clearWidth/2,top:y-90,bottom:y},
    {id:`gateway-v72:${item.regionId}:right`,left:x+item.clearWidth/2,right:x+(art.alphaBounds.x+art.alphaBounds.width-art.pivot.x)*scale,top:y-90,bottom:y},
  ];
}
function rectTouches(point:Point,body:{halfWidth:number;halfDepth:number},r:{left:number;right:number;top:number;bottom:number}) {
  return point.x+body.halfWidth>r.left&&point.x-body.halfWidth<r.right&&point.y+body.halfDepth>r.top&&point.y-body.halfDepth<r.bottom;
}
/** The central opening is NEVER a beacon collision. Legacy directional pylons
 * remain solid at their original ground supports, with no departure action. */
export const HOMEWORLD_CONNECTION_DIRECTION_SIGNS_V72 = HOMEWORLD_REGION_CONNECTIONS_V72.map(item=>({
  id:`direction-v72:${item.regionId}`,regionId:item.regionId,...item.legacySign,
  artId:'beacon' as const,label:item.name,footprintWorld:HOMEWORLD_PROP_ART_V64.beacon.footprintWorld,
}));

// Shoulder furnishings are outside the walking lane. Back-facing footprint y
// follows the same front pivot used by the renderer and collision authority.
export const HOMEWORLD_CONNECTION_FURNITURE_V72: readonly (HomeworldFurnitureInstanceV72 & {regionId:HomeworldRegionIdV68})[] =
  HOMEWORLD_REGION_CONNECTIONS_V72.flatMap((item,index)=>{
    const side=item.clearWidth/2+170, base=item.threshold;
    const artIds=(item.regionId==='thermal-caves'?['artisan-bench','sealed-jars','resin-lantern','convoy-crates']:
      item.regionId==='forbidden-reserve'?['register-desk','clan-banner','resin-lantern','convoy-crates']:
        item.regionId==='first-city-ruins'?['register-desk','clan-banner','resin-lantern','stone-bench']:
          ['stone-bench','sealed-jars','resin-lantern','convoy-crates']) as readonly (keyof typeof HOMEWORLD_FURNITURE_ART_V72)[];
    const authoredShoulders: Record<string, Point> = {
      'ash-marches:1':{x:150,y:2380}, 'ash-marches:2':{x:960,y:2460}, 'ash-marches:3':{x:150,y:2900},
      'storm-chain:1':{x:3710,y:280}, 'storm-chain:3':{x:3870,y:720},
      'luminous-marshes:1':{x:6050,y:2440}, 'luminous-marshes:3':{x:6260,y:2600},
      'first-city-ruins:2':{x:1150,y:350}, 'first-city-ruins:3':{x:280,y:450},
      'leviathan-coast:1':{x:920,y:1150}, 'leviathan-coast:2':{x:960,y:1440}, 'leviathan-coast:3':{x:1440,y:1450},
      'cold-crown:3':{x:6070,y:680},
    };
    return artIds.map((artId,n)=>{
      const location=authoredShoulders[`${item.regionId}:${n}`]??{x:base.x+(n%2?-side:side),y:base.y+180+Math.floor(n/2)*150};
      return {id:`connection-furniture-v72:${item.regionId}:${n}`,regionId:item.regionId,artId,...location,scale:n===2?.85:index%2?.9:1};
    });
  });
export function homeworldConnectionCollisionV72(point:Point,body={halfWidth:24,halfDepth:14}): {kind:'prop';id:string}|null {
  for(const item of HOMEWORLD_REGION_CONNECTIONS_V72)for(const foot of homeworldGatewayFootprintsV72(item))
    if(rectTouches(point,body,foot))return {kind:'prop',id:foot.id};
  for(const sign of HOMEWORLD_CONNECTION_DIRECTION_SIGNS_V72){const f=sign.footprintWorld;
    if(rectTouches(point,body,{left:sign.x-f.width/2,right:sign.x+f.width/2,top:sign.y-f.depth,bottom:sign.y}))return {kind:'prop',id:sign.id};
  }
  for(const item of HOMEWORLD_CONNECTION_FURNITURE_V72)if(homeworldFurnitureTouchesV72(item,point,body))return {kind:'prop',id:item.id};
  return null;
}
export function homeworldConnectionVisibleV72(item:HomeworldRegionConnectionV72,camera:{x:number;y:number;width:number;height:number},depthScale:number) {
  const art=HOMEWORLD_GATEWAY_ART_V72[item.artId],scale=homeworldGatewayScaleV72(item);
  const left=item.threshold.x-art.pivot.x*scale,top=item.threshold.y*depthScale-art.pivot.y*scale;
  return left<camera.x+camera.width+120&&left+art.sourceRect.width*scale>camera.x-120
    &&top<camera.y+camera.height+120&&top+art.sourceRect.height*scale>camera.y-120;
}
export function homeworldConnectionFurnitureFootprintsV72() {
  return HOMEWORLD_CONNECTION_FURNITURE_V72.map(item=>({id:item.id,...homeworldFurnitureFootprintV72(item)}));
}
