import {HOMEWORLD_BUILDINGS_V77,homeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_URBAN_FACADES_V78} from './homeworldUrbanFacadesV78';
import {homeworldBuildingRenderDepthV76} from './homeworldCity';
import {homeworldProjectGroundV64,homeworldBuildingSpritePlacementV64} from './homeworldGeometryV64';
import {HOMEWORLD_PUBLIC_PLACE_INPUT_V112} from './homeworldPublicPlacesMountV112';
import {HOMEWORLD_PUBLIC_PLACES_V112,homeworldPublicPlacePolygonV112,homeworldPublicPlaceUsageV112,homeworldPublicPlaceSafetyV112} from './homeworldPublicPlacesV112';
import {HOMEWORLD_STREET_COMPOSITION_ART_V92,type HomeworldStreetCompositionInputV92} from './homeworldStreetCompositionV92';
import {HOMEWORLD_DRESSING_FACADE_PLANS_V113,HOMEWORLD_DRESSING_FIXTURES_V113,configureHomeworldDressingV113,
  homeworldDressingFixturePolygonV113,homeworldDressingFacadePolygonV113,type HomeworldDressingFacadeV113,
  type HomeworldDressingPlaceV113} from './homeworldDressingV113';

/** A closed facade is the complete source volume at its own scale: same
 * drawing, footprint, wall height and door size, never a shrunken copy. */
export const HOMEWORLD_DRESSING_FACADES_BUILT_V113:readonly HomeworldDressingFacadeV113[]=HOMEWORLD_DRESSING_FACADE_PLANS_V113.map(plan=>{
  const source=HOMEWORLD_BUILDINGS_V77.find(b=>b.id===plan.sourceBuildingId);
  if(!source)throw new Error('V113 facade source is not a current building: '+plan.sourceBuildingId);
  return{...source,id:'dressing-v113:'+plan.id+':facade',label:plan.label,districtId:plan.districtId??source.districtId,
    levelId:plan.levelId,x:plan.x,y:plan.y,sourceBuildingId:source.id,interactive:false as const,placementPurpose:plan.purpose,
    provenance:'LORE_COMPATIBLE_ORIGINAL' as const,nativeStatus:'EXISTING_NATIVE_VOLUME_REUSE_V113' as const};
});

/** Same painter test as V92, with the V113 closed facades also painted. */
function facadeObstructionV113(item:HomeworldDressingPlaceV113):string|null{
  const art=HOMEWORLD_STREET_COMPOSITION_ART_V92[item.artId],scale=art.heightWorld*item.scale/art.alphaBounds.height;
  const point=homeworldProjectGroundV64(item,homeworldLevelV77(item.levelId).elevation);
  const alpha={left:point.x+(art.alphaBounds.x-art.pivot.x)*scale,right:point.x+(art.alphaBounds.x+art.alphaBounds.width-art.pivot.x)*scale,
    top:point.y+(art.alphaBounds.y-art.pivot.y)*scale,bottom:point.y+(art.alphaBounds.y+art.alphaBounds.height-art.pivot.y)*scale};
  for(const building of [...HOMEWORLD_BUILDINGS_V77,...HOMEWORLD_URBAN_FACADES_V78,...HOMEWORLD_DRESSING_FACADES_BUILT_V113]){
    if(building.levelId!==item.levelId||homeworldBuildingRenderDepthV76(building,item)<=item.y)continue;
    const painted=homeworldBuildingSpritePlacementV64(building),top=painted.top-homeworldLevelV77(building.levelId).elevation;
    const intersection=Math.max(0,Math.min(alpha.right,painted.left+painted.width)-Math.max(alpha.left,painted.left))*Math.max(0,Math.min(alpha.bottom,top+painted.height)-Math.max(alpha.top,top));
    if(intersection>(alpha.right-alpha.left)*(alpha.bottom-alpha.top)*.2)return building.id;
  }
  return null;
}

/** Every earlier source, working face, warm reserve, resident route, door,
 * V112 place, V113 fixture and V113 facade keeps priority over a V113 place. */
export const HOMEWORLD_DRESSING_INPUT_V113:HomeworldStreetCompositionInputV92={
  ...HOMEWORLD_PUBLIC_PLACE_INPUT_V112,
  facadeObstruction:facadeObstructionV113,
  reserves:[...HOMEWORLD_PUBLIC_PLACE_INPUT_V112.reserves,
    ...HOMEWORLD_PUBLIC_PLACES_V112.flatMap(item=>[homeworldPublicPlacePolygonV112(item),homeworldPublicPlaceUsageV112(item),homeworldPublicPlaceSafetyV112(item)]
      .flatMap((polygon,index)=>polygon?[{id:'preserved-v112:'+item.id+':'+index,levelId:item.levelId,polygon}]:[])),
    ...HOMEWORLD_DRESSING_FIXTURES_V113.map(item=>({id:'dressing-v113-fixture:'+item.id,levelId:item.levelId,polygon:homeworldDressingFixturePolygonV113(item)})),
    ...HOMEWORLD_DRESSING_FACADES_BUILT_V113.map(item=>({id:'dressing-v113-facade:'+item.id,levelId:item.levelId,polygon:homeworldDressingFacadePolygonV113(item)})),
  ],
};
configureHomeworldDressingV113(HOMEWORLD_DRESSING_INPUT_V113,HOMEWORLD_DRESSING_FACADES_BUILT_V113);
export {HOMEWORLD_DRESSING_PLACES_V113,HOMEWORLD_DRESSING_PLACE_REFUSALS_V113,HOMEWORLD_DRESSING_FACADES_V113,
  HOMEWORLD_DRESSING_FIXTURES_V113} from './homeworldDressingV113';
