import {HOMEWORLD_STREET_DECOR_INPUT_V84,HOMEWORLD_STREET_DECOR_PROPS_V84} from './homeworldStreetDecorMountV84';
import {homeworldStreetDecorPolygonV84,homeworldStreetDecorUsageV84,homeworldStreetDecorSafetyV84} from './homeworldStreetDecorV84';
import {configureHomeworldStreetCompositionV92,HOMEWORLD_STREET_COMPOSITION_ART_V92,type HomeworldStreetCompositionInputV92,type HomeworldStreetCompositionPropV92} from './homeworldStreetCompositionV92';
import {HOMEWORLD_BUILDINGS_V77,homeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_URBAN_FACADES_V78} from './homeworldUrbanFacadesV78';
import {homeworldBuildingRenderDepthV76} from './homeworldCity';
import {homeworldProjectGroundV64,homeworldBuildingSpritePlacementV64} from './homeworldGeometryV64';
import {HOMEWORLD_CIVIC_PROPS_V80,homeworldCivicPolygonV80} from './homeworldCivicDecorV80';
import {homeworldUrbanRectV78} from './homeworldUrbanLayoutV78';

/** Match the native painter's depth. A small prop hidden behind another facade
 * is refused rather than accepted and made visible by fading that building. */
export function homeworldStreetCompositionFacadeObstructionV92(item:HomeworldStreetCompositionPropV92):string|null{
 const art=HOMEWORLD_STREET_COMPOSITION_ART_V92[item.artId],scale=art.heightWorld*item.scale/art.alphaBounds.height;
 const point=homeworldProjectGroundV64(item,homeworldLevelV77(item.levelId).elevation);
 const alpha={left:point.x+(art.alphaBounds.x-art.pivot.x)*scale,right:point.x+(art.alphaBounds.x+art.alphaBounds.width-art.pivot.x)*scale,
  top:point.y+(art.alphaBounds.y-art.pivot.y)*scale,bottom:point.y+(art.alphaBounds.y+art.alphaBounds.height-art.pivot.y)*scale};
 for(const building of [...HOMEWORLD_BUILDINGS_V77,...HOMEWORLD_URBAN_FACADES_V78]){
  if(building.levelId!==item.levelId||homeworldBuildingRenderDepthV76(building,item)<=item.y)continue;
  const painted=homeworldBuildingSpritePlacementV64(building),top=painted.top-homeworldLevelV77(building.levelId).elevation;
  const intersection=Math.max(0,Math.min(alpha.right,painted.left+painted.width)-Math.max(alpha.left,painted.left))*Math.max(0,Math.min(alpha.bottom,top+painted.height)-Math.max(alpha.top,top));
  if(intersection>(alpha.right-alpha.left)*(alpha.bottom-alpha.top)*.2)return building.id;
 }return null;
}

/** Existing V83/V84/civic sources, working faces, streets, doors, landings and
 * all resident paths win. V92 does not move or replace a prior composition. */
export const HOMEWORLD_STREET_COMPOSITION_INPUT_V92:HomeworldStreetCompositionInputV92={
 ...HOMEWORLD_STREET_DECOR_INPUT_V84,
 facadeObstruction:homeworldStreetCompositionFacadeObstructionV92,
 reserves:[...HOMEWORLD_STREET_DECOR_INPUT_V84.reserves,
 // V80 admission conservatively samples the entire contact box with a 12-unit
 // body. Preserve that existing margin too, not only its convex solid hull.
 ...HOMEWORLD_CIVIC_PROPS_V80.map(item=>{const polygon=homeworldCivicPolygonV80(item),x=polygon.map(p=>p.x),y=polygon.map(p=>p.y);
  return{id:'preserved-civic-contact:'+item.id,levelId:item.levelId,
   polygon:homeworldUrbanRectV78(Math.min(...x)-12,Math.min(...y)-12,Math.max(...x)+12,Math.max(...y)+12)};
 }),...HOMEWORLD_STREET_DECOR_PROPS_V84.flatMap(item=>{
  const usage=homeworldStreetDecorUsageV84(item),safety=homeworldStreetDecorSafetyV84(item);
  return[{id:'preserved-v84:'+item.id,levelId:item.levelId,polygon:homeworldStreetDecorPolygonV84(item)},
   ...(usage?[{id:'preserved-v84-use:'+item.id,levelId:item.levelId,polygon:usage}]:[]),
   ...(safety?[{id:'preserved-v84-heat:'+item.id,levelId:item.levelId,polygon:safety}]:[])];
 })],
};
configureHomeworldStreetCompositionV92(HOMEWORLD_STREET_COMPOSITION_INPUT_V92);
export {HOMEWORLD_STREET_COMPOSITION_PROPS_V92,HOMEWORLD_STREET_COMPOSITION_REFUSALS_V92} from './homeworldStreetCompositionV92';
