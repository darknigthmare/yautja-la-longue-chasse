import type { CSSProperties } from 'react';
import { homeworldCivilianArtV72,type HomeworldCivilianRoleV72 } from './systems/homeworldIdentityV72';
/** Clip the preserved PNG, using the native ground pivot and uniform scale.
 * Civilian residents retain their existing locomotion paths. These are dedicated
 * clothed portraits, not full movement sheets; the playable Unblooded has a separate native cycle. */
export default function HomeworldCivilianV72({role,facing=1,height,style}:{role:HomeworldCivilianRoleV72;facing?:1|-1;height?:number;style?:CSSProperties}){
  const art=homeworldCivilianArtV72(role),scale=(height??art.heightWorld)/art.alphaBounds.height;
  return <span data-homeworld-civilian-v72={role} data-native-source={art.src} aria-hidden="true" style={{position:'absolute',
    left:-art.pivot.x*scale,top:-art.pivot.y*scale,width:art.sourceRect.width*scale,height:art.sourceRect.height*scale,
    backgroundImage:`url('${art.src}')`,backgroundRepeat:'no-repeat',backgroundPosition:`${-art.sourceRect.x*scale}px ${-art.sourceRect.y*scale}px`,
    backgroundSize:`${art.sourceWidth*scale}px ${art.sourceHeight*scale}px`,transform:`scaleX(${facing})`,transformOrigin:`${art.pivot.x*scale}px ${art.pivot.y*scale}px`,pointerEvents:'none',...style}}/>;
}
