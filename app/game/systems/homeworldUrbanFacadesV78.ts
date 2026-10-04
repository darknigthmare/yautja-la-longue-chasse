import {HOMEWORLD_BUILDINGS_V77,homeworldLevelV77,type HomeworldLevelV77} from './homeworldWorldV77';
import type {HomeworldBuildingModule,HomeworldFootprint} from './homeworldCity';
import {HOMEWORLD_ACTOR} from './homeworldCity';
import {homeworldBuildingSpriteScaleV64,homeworldBuildingSpritePlacementV64,homeworldBuildingGroundFrameV76,homeworldBuildingTouchesV76,homeworldBuildingDoorwayV64} from './homeworldGeometryV64';
import type {HomeworldUrbanPointV78} from './homeworldUrbanLayoutV78';
import {HOMEWORLD_URBAN_FACADE_PLANS_V83} from './homeworldUrbanFacadePlansV83';
export interface HomeworldUrbanFacadeV78 extends HomeworldBuildingModule {
 readonly levelId:HomeworldLevelV77;readonly sourceBuildingId:string;readonly interactive:false;
 readonly nativeStatus:'MEASURED_NATIVE_OBLIQUE_REUSE_V83';readonly targetNativeStatus:'DEDICATED_DISTRICT_VARIANTS_STILL_REQUIRED';
 readonly placementPurpose:string;readonly provenance:'LORE_COMPATIBLE_ORIGINAL';
}
/** Native sources and IDs survive. These eight authored closed exterior
 * volumes use eight different sources, rather than three identical frontal
 * houses. No new discovery, room, institution or saved visit is fabricated. */
export const HOMEWORLD_URBAN_FACADES_V78:readonly HomeworldUrbanFacadeV78[]=HOMEWORLD_URBAN_FACADE_PLANS_V83.map(plan=>{
 const source=HOMEWORLD_BUILDINGS_V77.find(b=>b.id===plan.sourceBuildingId)!;
 return{...source,id:plan.id+':facade',label:plan.label,districtId:'undercity',x:plan.x,y:plan.y,levelId:'-1A',art:plan.art,
  width:plan.footprint.width,footprint:plan.footprint,variant:plan.variant,
  wallHeight:plan.art.wallHeightWorld*plan.footprint.width/plan.art.footprintWorld.width,height:plan.art.alphaBounds.height*plan.scale,
  sourceBuildingId:source.id,interactive:false,nativeStatus:plan.nativeStatus,targetNativeStatus:'DEDICATED_DISTRICT_VARIANTS_STILL_REQUIRED',
  placementPurpose:plan.purpose,provenance:plan.provenance};
});
export function homeworldUrbanFacadePlacementV78(facade:HomeworldUrbanFacadeV78){
 const image=homeworldBuildingSpritePlacementV64(facade),elevation=homeworldLevelV77(facade.levelId).elevation,scale=homeworldBuildingSpriteScaleV64(facade),door=homeworldBuildingDoorwayV64(facade);
 return{...image,top:image.top-elevation,src:facade.art.src,sourceWidth:facade.art.sourceWidth,sourceHeight:facade.art.sourceHeight,
  elevation,scale,footprint:homeworldBuildingGroundFrameV76(facade).polygon,paintedDoorWidth:door.clearWidth,paintedDoorHeight:door.clearHeight};
}
export function homeworldUrbanFacadeCollisionV78(level:HomeworldLevelV77,point:HomeworldUrbanPointV78,body:HomeworldFootprint=HOMEWORLD_ACTOR){
 const facade=HOMEWORLD_URBAN_FACADES_V78.find(f=>f.levelId===level&&homeworldBuildingTouchesV76(f,point,body));
 return facade?{kind:'building' as const,id:facade.id}:null;
}
