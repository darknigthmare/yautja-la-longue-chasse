import {preloadNativeImagesV94} from './systems/nativeImagePreloadV94';
import {useNativeImageAssetsV94} from './useNativeImageAssetsV94';
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
  return preloadNativeImagesV94({sources:resources(youth,additionalSources),reload,onProgress});
}

/** The owner must block controls while !ready and keep its existing simulation
 * paused. A new source set or retry is synchronously unready before effects run. */
export function useHomeworldMotionAssetsV74({youth,additionalSources=noAdditionalSources}:{youth:boolean;additionalSources?:readonly HomeworldMotionSourceV74[]}):HomeworldMotionAssetsV74{
  return useNativeImageAssetsV94(resources(youth,additionalSources));
}

export default useHomeworldMotionAssetsV74;
