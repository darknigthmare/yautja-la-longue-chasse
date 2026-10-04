import art from '../data/homeworldLiftCabinArtV82.json';
import {homeworldConnectorPlacementV82} from './homeworldConnectorArtV82';
import {homeworldLevelV77,type HomeworldConnectorV77,type HomeworldLevelV77,type HomeworldTransitV77} from './homeworldWorldV77';
import {homeworldProjectGroundV64} from './homeworldGeometryV64';
import {homeworldSceneDepthV78} from './homeworldVisualLayersV78';
import {homeworldTransitFractionsV82} from './homeworldTransitJourneyV82';
import type {HomeworldLiftStationV83} from './homeworldLiftStationV83';
export type {HomeworldLiftStationV83} from './homeworldLiftStationV83';

export const HOMEWORLD_LIFT_CABIN_ART_V82=art;
export const HOMEWORLD_LIFT_CABIN_SCENE_SOURCES_V82=[{src:art.src,sourceWidth:art.sourceWidth,sourceHeight:art.sourceHeight,kind:'scene' as const}];

/** The fixed gantry and cabin remain separate untouched PNGs. The V83 station
 * supplies a canonical shaft position, including empty calls; the player's
 * floor is never a command to move it. Legacy callers start at connector.from. */
export function homeworldLiftCabinPlacementV82(connector:HomeworldConnectorV77,_level:HomeworldLevelV77,transit:HomeworldTransitV77|null,station?:HomeworldLiftStationV83|null){
 // Explicit null means the session is not restored yet: never flash a fake
 // default-floor cabin before its real local position becomes available.
 if(connector.kind!=='lift'||station===null)return null;
 const layout=homeworldConnectorPlacementV82(connector);if(!layout)return null;
 const ride=transit?.connectorId===connector.id?transit:null;
 const from=connector.from,to=connector.to;
 const rideFraction=ride?homeworldTransitFractionsV82('lift',ride.elapsed,connector.duration).travel:0;
 const t=station?.connectorId===connector.id?station.position:ride?(ride.reverse?1-rideFraction:rideFraction):0;
 const point={x:from.point.x+(to.point.x-from.point.x)*t,y:from.point.y+(to.point.y-from.point.y)*t};
 const elevation=homeworldLevelV77(from.levelId).elevation+(homeworldLevelV77(to.levelId).elevation-homeworldLevelV77(from.levelId).elevation)*t;
 const foot=homeworldProjectGroundV64(point,elevation),scale=layout.scale*art.scaleRelativeToGantry;
 return{left:foot.x-art.floorSocket.x*scale,top:foot.y-art.floorSocket.y*scale,width:art.sourceWidth*scale,height:art.sourceHeight*scale,
  scale,foot,elevation,travelFraction:t,depth:homeworldSceneDepthV78(point.y,elevation)-1,moving:!!(station?.journey||ride)&&t>0&&t<1};
}
