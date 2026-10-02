import { YOUTH_ART_MANIFEST } from './youthArtManifest';
/** Two genuine native Unblooded walk drawings per facing from V48. No fixed portrait
 * translated over the floor and no CSS pretend limb animation. Direction depth
 * remains side-facing as in the original authored sheets (not an eight-way set). */
export function homeworldYouthFrameV72(seconds:number,moving:boolean,facing:1|-1){
  const actor=YOUTH_ART_MANIFEST.actors.player[facing===1?'right':'left'];
  const clip=actor.clips[moving?'walk':'idle'];
  const ticks=Math.floor(Math.max(0,Number.isFinite(seconds)?seconds:0)*60);
  const duration=clip.frames.reduce((sum,frame)=>sum+frame.durationTicks,0);
  let cursor=ticks%duration,index=0;
  for(;index<clip.frames.length-1;index++){if(cursor<clip.frames[index].durationTicks)break;cursor-=clip.frames[index].durationTicks;}
  return {actor,frame:clip.frames[index],index,clipId:moving?'walk':'idle'};
}
export default function HomeworldYouthMotionV72({seconds,moving,facing,height=82}:{seconds:number;moving:boolean;facing:1|-1;height?:number}){
  const {actor,frame,index,clipId}=homeworldYouthFrameV72(seconds,moving,facing),scale=height/actor.bodyHeight;
  return <span aria-hidden="true" data-homeworld-unblooded-v72={clipId} data-native-frame={index} data-native-facing={facing}
    style={{position:'absolute',left:-frame.pivot[0]*scale,top:-frame.pivot[1]*scale,width:frame.rect[2]*scale,height:frame.rect[3]*scale,
    backgroundImage:`url('${actor.src}')`,backgroundRepeat:'no-repeat',backgroundSize:`${1122*scale}px ${1402*scale}px`,backgroundPosition:`${-frame.rect[0]*scale}px ${-frame.rect[1]*scale}px`,pointerEvents:'none'}}/>;
}
