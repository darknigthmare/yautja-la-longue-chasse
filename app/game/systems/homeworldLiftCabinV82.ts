import art from '../data/homeworldLiftCabinArtV82.json';
import {homeworldConnectorPlacementV82} from './homeworldConnectorArtV82';
import {homeworldLevelV77,type HomeworldConnectorV77,type HomeworldLevelV77,type HomeworldTransitV77} from './homeworldWorldV77';
import {homeworldProjectGroundV64} from './homeworldGeometryV64';
import {homeworldSceneDepthV78} from './homeworldVisualLayersV78';
import {homeworldTransitFractionsV82} from './homeworldTransitJourneyV82';

export const HOMEWORLD_LIFT_CABIN_ART_V82=art;
export const HOMEWORLD_LIFT_CABIN_SCENE_SOURCES_V82=[{src:art.src,sourceWidth:art.sourceWidth,sourceHeight:art.sourceHeight,kind:'scene' as const}];

/** A fixed gantry and independently movable cabin use separate untouched PNGs.
 * The cabin follows actual transit time, including its stationary boarding
 * phase; ambience time, pause, reduced-motion and camera do not move it. */
export function homeworldLiftCabinPlacementV82(connector:HomeworldConnectorV77,level:HomeworldLevelV77,transit:HomeworldTransitV77|null){
 if(connector.kind!=='lift')return null;
 const layout=homeworldConnectorPlacementV82(connector);if(!layout)return null;
 const ride=transit?.connectorId===connector.id?transit:null;
 const from=ride?.reverse?connector.to:connector.from,to=ride?.reverse?connector.from:connector.to;
 const t=ride?homeworldTransitFractionsV82('lift',ride.elapsed,connector.duration).travel
  :level===connector.to.levelId?1:0;
 const point={x:from.point.x+(to.point.x-from.point.x)*t,y:from.point.y+(to.point.y-from.point.y)*t};
 const elevation=homeworldLevelV77(from.levelId).elevation+(homeworldLevelV77(to.levelId).elevation-homeworldLevelV77(from.levelId).elevation)*t;
 const foot=homeworldProjectGroundV64(point,elevation),scale=layout.scale*art.scaleRelativeToGantry;
 return{left:foot.x-art.floorSocket.x*scale,top:foot.y-art.floorSocket.y*scale,width:art.sourceWidth*scale,height:art.sourceHeight*scale,
  scale,foot,elevation,travelFraction:t,depth:homeworldSceneDepthV78(point.y,elevation)-1,moving:!!ride&&t>0&&t<1};
}
