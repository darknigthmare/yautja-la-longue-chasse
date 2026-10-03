import {HOMEWORLD_BUILDINGS_V77,homeworldLevelV77,type HomeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_BUILDING_ART_V64} from './homeworldArtV64';
import type {HomeworldBuildingModule,HomeworldFootprint} from './homeworldCity';
import {HOMEWORLD_ACTOR} from './homeworldCity';
import {homeworldBuildingSpriteScaleV64,homeworldBuildingSpritePlacementV64,homeworldBuildingGroundFrameV76,homeworldBuildingTouchesV76} from './homeworldGeometryV64';
import {HOMEWORLD_URBAN_LOTS_V78,type HomeworldUrbanPointV78} from './homeworldUrbanLayoutV78';
export interface HomeworldUrbanFacadeV78 extends HomeworldBuildingModule {
 readonly levelId:HomeworldLevelV77;readonly sourceBuildingId:string;readonly interactive:false;
 readonly nativeStatus:'EXISTING_FRONTAL_NATIVE_PLACEHOLDER';readonly targetNativeStatus:'OBLIQUE_V78_NATIVE_REQUIRED';
}
/** Reuse only three genuinely measured original house PNGs. Each is uniformly
 * scaled and its painted doorway meets the128x80 convention for a100u adult.
 * These are scenery facades, not fabricated visitable rooms or services.
 * Dedicated oblique V78 architecture is still missing from this fallback. */
export const HOMEWORLD_URBAN_FACADES_V78:readonly HomeworldUrbanFacadeV78[]=HOMEWORLD_URBAN_LOTS_V78.map((lot,i)=>{
 const key=(i===1||i===5?'house-b':i===2||i===4?'house-c':'house-a') as keyof typeof HOMEWORLD_BUILDING_ART_V64,art=HOMEWORLD_BUILDING_ART_V64[key];
 const source=HOMEWORLD_BUILDINGS_V77.find(b=>b.entranceKind==='domestic'&&b.art.src===art.src)!;
 const factor=Math.min((lot.bounds.right-lot.bounds.left-32)/art.footprintWorld.width,(lot.bounds.bottom-lot.bounds.top-64)/art.footprintWorld.depth);
 const footprint={width:art.footprintWorld.width*factor,depth:art.footprintWorld.depth*factor};
 const facade:HomeworldUrbanFacadeV78={...source,id:lot.id+':facade',label:'Façade de cour · '+lot.label,districtId:'undercity',
  x:(lot.bounds.left+lot.bounds.right)/2,y:lot.bounds.bottom-40,levelId:lot.levelId,art,width:footprint.width,
  footprint,wallHeight:art.wallHeightWorld*factor,height:source.height*factor,sourceBuildingId:source.id,
  interactive:false,nativeStatus:'EXISTING_FRONTAL_NATIVE_PLACEHOLDER',targetNativeStatus:'OBLIQUE_V78_NATIVE_REQUIRED'};
 const scale=homeworldBuildingSpriteScaleV64(facade),box=homeworldBuildingGroundFrameV76(facade).polygon;
 if(art.doorway.height*scale<128||art.doorway.width*scale<80)throw Error('Facade scale makes the real painted adult doorway too small: '+facade.id);
 if(box.some(p=>p.x<lot.bounds.left||p.x>lot.bounds.right||p.y<lot.bounds.top||p.y>lot.bounds.bottom))throw Error('Facade ground contact exceeds its actual reserved lot: '+facade.id);
 return facade;
});
export function homeworldUrbanFacadePlacementV78(facade:HomeworldUrbanFacadeV78){
 const image=homeworldBuildingSpritePlacementV64(facade),elevation=homeworldLevelV77(facade.levelId).elevation,scale=homeworldBuildingSpriteScaleV64(facade);
 return{...image,top:image.top-elevation,src:facade.art.src,sourceWidth:facade.art.sourceWidth,sourceHeight:facade.art.sourceHeight,
  elevation,scale,footprint:homeworldBuildingGroundFrameV76(facade).polygon,paintedDoorWidth:facade.art.doorway.width*scale,paintedDoorHeight:facade.art.doorway.height*scale};
}
export function homeworldUrbanFacadeCollisionV78(level:HomeworldLevelV77,point:HomeworldUrbanPointV78,body:HomeworldFootprint=HOMEWORLD_ACTOR){
 const facade=HOMEWORLD_URBAN_FACADES_V78.find(f=>f.levelId===level&&homeworldBuildingTouchesV76(f,point,body));
 return facade?{kind:'building' as const,id:facade.id}:null;
}
