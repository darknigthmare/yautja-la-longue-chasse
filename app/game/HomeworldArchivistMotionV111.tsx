'use client';
/* eslint-disable @next/next/no-img-element -- original native whole-body PNGs with exact foot registration */
import {useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {useNativeImageAssetsV94} from './useNativeImageAssetsV94';
import {HOMEWORLD_ARCHIVIST_SCENE_SOURCES_V111,HOMEWORLD_ARCHIVIST_SEQUENCE_MS_V111,createArchivistClockV111,sampleArchivistClockV111,suspendArchivistClockV111,homeworldArchivistFrameV111,homeworldArchivistPlacementV111} from './systems/homeworldArchivistMotionV111';

export function HomeworldArchivistDrawingV111({elapsedMs=0,heightWorld=100,onFailure}:{elapsedMs?:number;heightWorld?:number;onFailure?():void}) {
  const frame=homeworldArchivistFrameV111(elapsedMs),placement=homeworldArchivistPlacementV111(frame.id,heightWorld);
  if(!placement)return null;
  return <img src={frame.src} alt="" aria-hidden="true" draggable={false} width={frame.sourceWidth} height={frame.sourceHeight}
    data-homeworld-archivist-frame-v111={frame.id} data-homeworld-archivist-elapsed-v111={Math.round(elapsedMs)}
    data-native-source={frame.src} data-native-facing="right" data-native-mirror-v111="false" onError={onFailure}
    style={{position:'absolute',maxWidth:'none',pointerEvents:'none',userSelect:'none',...placement}}/>;
}

function ConversationSequence({paused,heightWorld,onFailure}:{paused:boolean;heightWorld:number;onFailure():void}) {
  const clock=useRef(createArchivistClockV111()),[elapsedMs,setElapsedMs]=useState(0);
  useLayoutEffect(()=>{
    clock.current=suspendArchivistClockV111(clock.current);
    if(paused||clock.current.elapsedMs>=HOMEWORLD_ARCHIVIST_SEQUENCE_MS_V111)return;
    let alive=true,frame=0;
    const suspend=()=>{clock.current=suspendArchivistClockV111(clock.current);};
    const tick=(timestamp:number)=>{
      if(!alive)return;
      const before=clock.current.elapsedMs;
      clock.current=sampleArchivistClockV111(clock.current,timestamp,!document.hidden&&document.hasFocus());
      if(clock.current.elapsedMs!==before)setElapsedMs(clock.current.elapsedMs);
      if(clock.current.elapsedMs<HOMEWORLD_ARCHIVIST_SEQUENCE_MS_V111)frame=requestAnimationFrame(tick);
    };
    window.addEventListener('blur',suspend);window.addEventListener('focus',suspend);document.addEventListener('visibilitychange',suspend);
    frame=requestAnimationFrame(tick);
    return()=>{alive=false;cancelAnimationFrame(frame);window.removeEventListener('blur',suspend);window.removeEventListener('focus',suspend);document.removeEventListener('visibilitychange',suspend);};
  },[paused]);
  return <HomeworldArchivistDrawingV111 elapsedMs={elapsedMs} heightWorld={heightWorld} onFailure={onFailure}/>;
}

/** Four native drawings, one local actor/facing and one bounded gesture per
 * explicit sequence key. A frozen city dialogue never starts a second city clock. */
export default function HomeworldArchivistMotionV111({active,paused,reducedMotion,sequenceKey,heightWorld=100,children}:{
  active:boolean;paused:boolean;reducedMotion:boolean;sequenceKey:string;heightWorld?:number;children:ReactNode;
}) {
  const assets=useNativeImageAssetsV94(HOMEWORLD_ARCHIVIST_SCENE_SOURCES_V111);
  const [paintFailed,setPaintFailed]=useState(false),ready=assets.ready&&!paintFailed;
  const onFailure=()=>setPaintFailed(true);
  return <span data-homeworld-archivist-motion-v111 data-archivist-native-ready={ready} data-archivist-native-status={assets.error||paintFailed?'error':ready?'ready':'loading'}
    data-archivist-active-v111={active} data-archivist-paused-v111={paused} data-archivist-reduced-motion-v111={reducedMotion}
    style={{position:'absolute',left:0,top:0,pointerEvents:'none'}}>
    {!ready?children:active&&!reducedMotion?<ConversationSequence key={sequenceKey} paused={paused} heightWorld={heightWorld} onFailure={onFailure}/>:<HomeworldArchivistDrawingV111 heightWorld={heightWorld} onFailure={onFailure}/>}
  </span>;
}
