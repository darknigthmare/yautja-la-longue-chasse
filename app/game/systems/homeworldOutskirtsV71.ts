import placements from '../data/homeworldOutskirtsV71.json';
import { HOMEWORLD_OUTSKIRTS_ART_V71, HOMEWORLD_OUTSKIRTS_GROUND_V71, type HomeworldOutskirtsArtIdV71 } from './homeworldOutskirtsArtV71';
import { HOMEWORLD_GEOMETRY_V64, homeworldProjectGroundV64, homeworldBuildingDoorwayV64 } from './homeworldGeometryV64';
import { HOMEWORLD_BUILDINGS } from './homeworldCity';
import { HOMEWORLD_GROUND_ART_V64 } from './homeworldArtV64';
export interface HomeworldOutskirtsModuleV71 {
  id: string; artId: HomeworldOutskirtsArtIdV71; x: number; y: number; scale: number; districtId: string;
}
/** Placement is baked, not re-rolled on load. Every support is outside existing
 * walkable ground; scenery never grants access or silently blocks a route. */
export const HOMEWORLD_OUTSKIRTS_MODULES_V71 = placements.modules as readonly HomeworldOutskirtsModuleV71[];
export const HOMEWORLD_OUTSKIRTS_BOUNDS_V71 = { left: -900, top: -650, width: 8100, depth: 6600 } as const;
export const HOMEWORLD_OUTSKIRTS_CLEARANCE_V71 = placements.clearanceWorld;
/** Only a tile-snapped camera window is rasterized, not the entire 8100×6600
 * natural belt. The world-space pattern origin stays fixed. One tile of padding
 * keeps the mask stable during small steps and hides chunk-boundary updates. */
export function homeworldOutskirtsGroundWindowV71(camera:{x:number;y:number;width:number;height:number}) {
  const bounds=HOMEWORLD_OUTSKIRTS_BOUNDS_V71,tile=HOMEWORLD_OUTSKIRTS_GROUND_V71.tileWorldSize,depthScale=HOMEWORLD_GEOMETRY_V64.depthScale;
  const left=Math.max(bounds.left,Math.floor((camera.x-tile)/tile)*tile);
  const top=Math.max(bounds.top,Math.floor((camera.y-tile)/depthScale/tile)*tile);
  const right=Math.min(bounds.left+bounds.width,Math.ceil((camera.x+camera.width+tile)/tile)*tile);
  const bottom=Math.min(bounds.top+bounds.depth,Math.ceil((camera.y+camera.height+tile)/depthScale/tile)*tile);
  return {left,top,width:Math.max(0,right-left),depth:Math.max(0,bottom-top)};
}
export const HOMEWORLD_BUILDING_APPROACHES_V71=HOMEWORLD_BUILDINGS.map(building=>{
  const door=homeworldBuildingDoorwayV64(building);
  return {id:`approach-v71:${building.id}`,buildingId:building.id,districtId:building.districtId,
    x:building.x-door.clearWidth/2,y:building.y,width:door.clearWidth,depth:door.approach.y-building.y+36,
    threshold:door.threshold,approach:door.approach,src:HOMEWORLD_GROUND_ART_V64.src};
});
export function homeworldOutskirtsFootprintV71(module: HomeworldOutskirtsModuleV71) {
  const art = HOMEWORLD_OUTSKIRTS_ART_V71[module.artId];
  return { left: module.x-art.footprintWorld.width*module.scale/2,
    right: module.x+art.footprintWorld.width*module.scale/2,
    top: module.y-art.footprintWorld.depth*module.scale, bottom: module.y };
}
export function homeworldOutskirtsPaintV71(module: HomeworldOutskirtsModuleV71) {
  const art = HOMEWORLD_OUTSKIRTS_ART_V71[module.artId], scale = art.heightWorld*module.scale/art.alphaBounds.height;
  const p = homeworldProjectGroundV64(module);
  return { left:p.x+(art.alphaBounds.x-art.pivot.x)*scale, top:p.y+(art.alphaBounds.y-art.pivot.y)*scale,
    width:art.alphaBounds.width*scale,height:art.alphaBounds.height*scale,scale };
}
export function homeworldOutskirtsVisibleV71(module: HomeworldOutskirtsModuleV71, camera: {x:number;y:number;width:number;height:number}) {
  const rect=homeworldOutskirtsPaintV71(module);
  return rect.left+rect.width>camera.x-60&&rect.left<camera.x+camera.width+60
    &&rect.top+rect.height>camera.y-60&&rect.top<camera.y+camera.height+60;
}
/** Only foreground silhouettes overlapping the hero fade. Ground depth remains
 * the common actor/building depth, not the unprojected image top. */
export function shouldFadeHomeworldOutskirtsV71(module: HomeworldOutskirtsModuleV71, actor: {x:number;y:number}) {
  if(actor.y>=module.y)return false;
  const p=homeworldProjectGroundV64(actor),rect=homeworldOutskirtsPaintV71(module);
  return p.x>rect.left-18&&p.x<rect.left+rect.width+18&&p.y>rect.top&&p.y-100<rect.top+rect.height;
}
