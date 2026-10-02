import type { CSSProperties } from 'react';
import { homeworldCivilianArtV72,type HomeworldCivilianRoleV72 } from './systems/homeworldIdentityV72';
import {homeworldCivilianMotionFrameV74} from './systems/homeworldCivilianMotionV74';
/** Clip the preserved PNG, using the native ground pivot and uniform scale.
 * Existing named inhabitants remain on their preserved idle portraits by default.
 * Walking residents use genuine separately drawn native left/right frames. */
export default function HomeworldCivilianV72({role,facing=1,height,style,moving=false,seconds=0,speed}:{role:HomeworldCivilianRoleV72;facing?:1|-1;height?:number;style?:CSSProperties;moving?:boolean;seconds?:number;speed?:number}){
  if(moving){
    const {source,frame,index,clip,scale}=homeworldCivilianMotionFrameV74(role,seconds,facing,height,speed);
    return <span data-homeworld-civilian-v72={role} data-native-source={source.src} data-native-clip={`walk-${clip}`} data-native-frame={index} data-native-facing={facing} data-motion-version="74" aria-hidden="true" style={{position:'absolute',
      left:-frame.pivot.x*scale,top:-frame.pivot.y*scale,width:frame.sourceRect.width*scale,height:frame.sourceRect.height*scale,
      backgroundImage:`url('${source.src}')`,backgroundRepeat:'no-repeat',backgroundPosition:`${-frame.sourceRect.x*scale}px ${-frame.sourceRect.y*scale}px`,
      backgroundSize:`${source.sourceWidth*scale}px ${source.sourceHeight*scale}px`,pointerEvents:'none',...style}}/>;
  }
  const art=homeworldCivilianArtV72(role),scale=(height??art.heightWorld)/art.alphaBounds.height;
  return <span data-homeworld-civilian-v72={role} data-native-source={art.src} data-native-clip="idle" data-native-frame="0" data-native-facing={facing} data-motion-version="74" aria-hidden="true" style={{position:'absolute',
    left:-art.pivot.x*scale,top:-art.pivot.y*scale,width:art.sourceRect.width*scale,height:art.sourceRect.height*scale,
    backgroundImage:`url('${art.src}')`,backgroundRepeat:'no-repeat',backgroundPosition:`${-art.sourceRect.x*scale}px ${-art.sourceRect.y*scale}px`,
    backgroundSize:`${art.sourceWidth*scale}px ${art.sourceHeight*scale}px`,transform:`scaleX(${facing})`,transformOrigin:`${art.pivot.x*scale}px ${art.pivot.y*scale}px`,pointerEvents:'none',...style}}/>;
}
