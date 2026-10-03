import {useCallback,useEffect,useState} from 'react';
import {HOMEWORLD_CIVILIAN_MOTION_V74} from './systems/homeworldCivilianMotionV74';
import {HOMEWORLD_YOUTH_MOTION_ART_V74} from './systems/homeworldYouthMotionV74';

export interface HomeworldMotionSourceV74 {src:string;sourceWidth:number;sourceHeight:number;kind?:'scene'}
export interface HomeworldMotionAssetsProgressV74 {ready:boolean;error:string|null;loaded:number;total:number}
export interface HomeworldMotionAssetsV74 extends HomeworldMotionAssetsProgressV74 {retry:()=>void}

const civilianSourceIds=new Set(Object.values(HOMEWORLD_CIVILIAN_MOTION_V74.roles).flatMap(actor=>
  [...actor.clips.left,...actor.clips.right].map(frame=>frame.sourceId)));
const youthSourceIds=new Set(Object.values(HOMEWORLD_YOUTH_MOTION_ART_V74.actors).flatMap(actor=>
  [actor.idle,...actor.walk].map(frame=>frame.sourceId)));
const civilianSources=Object.entries(HOMEWORLD_CIVILIAN_MOTION_V74.sources)
  .filter(([id])=>civilianSourceIds.has(id)).map(([,source])=>source);
const youthSources=Object.entries(HOMEWORLD_YOUTH_MOTION_ART_V74.sources)
  .filter(([id])=>youthSourceIds.has(id)).map(([,source])=>source);
const allSources=[...civilianSources,...youthSources];
const noAdditionalSources:readonly HomeworldMotionSourceV74[]=[];

/** Metadata/string references only. No decoded image or GPU resource is cached. */
export function homeworldMotionSourcesV74(youth:boolean):readonly HomeworldMotionSourceV74[]{
  return youth?allSources:civilianSources;
}
function resources(youth:boolean,additionalSources:readonly HomeworldMotionSourceV74[]){
  return [...new Map([...homeworldMotionSourcesV74(youth),...additionalSources].map(source=>[source.src,source])).values()];
}

/** Resource loader separated for lifecycle tests. It has no simulation clock,
 * rAF, save access or gameplay action; cancel only abandons pending static PNGs. */
export function preloadHomeworldMotionAssetsV74({youth,reload=false,additionalSources=noAdditionalSources,onProgress}:{
  youth:boolean;reload?:boolean;additionalSources?:readonly HomeworldMotionSourceV74[];onProgress:(progress:HomeworldMotionAssetsProgressV74)=>void;
}){
  const sources=resources(youth,additionalSources),total=sources.length;
  const pending=new Set<()=>void>();let alive=true,loaded=0,error:string|null=null;
  const report=()=>{if(alive)onProgress({ready:loaded===total&&error===null,error,loaded,total});};
  const tasks=sources.map(async source=>{
    let image:HTMLImageElement|null=null;
    const controller=reload?new AbortController():null;
    const cancel=()=>{controller?.abort();image?.removeAttribute('src');image=null;};
    pending.add(cancel);
    try{
      if(reload){
        // Refresh the SAME URL used by CSS sprites. A cache-busting query alone
        // would decode a different URL and leave the renderer's original cold.
        const response=await fetch(source.src,{cache:'reload',signal:controller!.signal});
        if(!response.ok)throw new Error(`PNG indisponible (HTTP ${response.status}) : ${source.src}`);
        await response.arrayBuffer();
      }
      if(!alive)return;
      image=new Image();image.decoding='async';image.src=source.src;
      await image.decode();
      if(!alive||!image)return;
      if(image.naturalWidth!==source.sourceWidth||image.naturalHeight!==source.sourceHeight){
        throw new Error(`Dimensions ${source.kind==='scene'?'de décor':'d’animation'} incompatibles : ${source.src}. Attendues ${source.sourceWidth}×${source.sourceHeight}, reçues ${image.naturalWidth}×${image.naturalHeight}.`);
      }
      loaded++;report();
    }catch(reason){
      if(!alive)return;
      error??=reason instanceof Error&&reason.message.startsWith('Dimensions ')?reason.message:
        `Impossible de charger ou de décoder ${source.kind==='scene'?'le décor natif':'l’animation'} : ${source.src}. Vérifie la connexion puis réessaie.`;
      report();
    }finally{
      pending.delete(cancel);
      // Neither the hook nor a module-level map keeps a decoded Image alive.
      image=null;
    }
  });
  return {done:Promise.allSettled(tasks).then(()=>undefined),cancel:()=>{
    alive=false;for(const cancel of pending)cancel();pending.clear();
  }};
}

/** The owner must block controls while !ready and keep its existing simulation
 * paused. A new source set or retry is synchronously unready before effects run. */
export function useHomeworldMotionAssetsV74({youth,additionalSources=noAdditionalSources}:{youth:boolean;additionalSources?:readonly HomeworldMotionSourceV74[]}):HomeworldMotionAssetsV74{
  const [attempt,setAttempt]=useState(0);
  const key=`${youth?'youth':'adult'}:${attempt}:${additionalSources.map(source=>`${source.src}:${source.sourceWidth}:${source.sourceHeight}`).join('|')}`,total=resources(youth,additionalSources).length;
  const [progress,setProgress]=useState<HomeworldMotionAssetsProgressV74&{key:string}>({key:'',ready:false,error:null,loaded:0,total});
  const retry=useCallback(()=>setAttempt(previous=>previous+1),[]);
  useEffect(()=>{
    let alive=true;
    const preload=preloadHomeworldMotionAssetsV74({youth,reload:attempt>0,additionalSources,onProgress:next=>{if(alive)setProgress({...next,key});}});
    return()=>{alive=false;preload.cancel();};
  },[youth,attempt,key,additionalSources]);
  return progress.key===key?{ready:progress.ready,error:progress.error,loaded:progress.loaded,total,retry}:
    {ready:false,error:null,loaded:0,total,retry};
}

export default useHomeworldMotionAssetsV74;
