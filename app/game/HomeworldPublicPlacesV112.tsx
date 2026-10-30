import {memo} from 'react';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
import {HOMEWORLD_PUBLIC_PLACES_V112} from './systems/homeworldPublicPlacesMountV112';
import {HOMEWORLD_PUBLIC_PLACE_ART_V112} from './systems/homeworldPublicPlacesV112';
import {homeworldStreetCompositionOpacityV92} from './systems/homeworldStreetCompositionV92';
import {homeworldLevelV77,type HomeworldLevelV77} from './systems/homeworldWorldV77';
import {homeworldProjectGroundV64} from './systems/homeworldGeometryV64';
import {homeworldSceneDepthV78} from './systems/homeworldVisualLayersV78';

/** Separate native instances on retained paving. No new image, room, service,
 * discovery or encounter is implied by a civic furniture composition. */
export default memo(function HomeworldPublicPlacesV112({actor,levelId,paintedLevels,camera}:{
  actor:{x:number;y:number};levelId:HomeworldLevelV77;paintedLevels:readonly HomeworldLevelV77[];
  camera:{x:number;y:number;viewWidth:number;viewHeight:number};
}) {
  return <>{HOMEWORLD_PUBLIC_PLACES_V112.filter(item=>paintedLevels.includes(item.levelId)).map(item=>{
    const art=HOMEWORLD_PUBLIC_PLACE_ART_V112[item.artId],height=art.heightWorld*item.scale;
    const scale=height/art.alphaBounds.height,z=homeworldLevelV77(item.levelId).elevation;
    const position=homeworldProjectGroundV64(item,z),left=position.x-art.pivot.x*scale,top=position.y-art.pivot.y*scale;
    if (left+art.sourceRect.width*scale<camera.x-160 || left>camera.x+camera.viewWidth+160 ||
      top+art.sourceRect.height*scale<camera.y-160 || top>camera.y+camera.viewHeight+160) return null;
    return <HomeworldNativePropV64 key={item.id} id={item.id} artId={'public-place-v112:'+item.artId}
      art={art} x={position.x} y={position.y} heightWorld={height} depth={homeworldSceneDepthV78(item.y,z)}
      style={{opacity:homeworldStreetCompositionOpacityV92(item,actor,levelId)}}/>;
  })}</>;
});
