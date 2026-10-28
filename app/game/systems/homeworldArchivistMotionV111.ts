import manifest from '../data/homeworldArchivistMotionV111.json';

export const HOMEWORLD_ARCHIVIST_MOTION_V111=manifest;
export const HOMEWORLD_ARCHIVIST_SCENE_SOURCES_V111=manifest.frames.map(({src,sourceWidth,sourceHeight})=>({src,sourceWidth,sourceHeight}));
export const HOMEWORLD_ARCHIVIST_SEQUENCE_MS_V111=manifest.durationMs;
export interface ArchivistClockV111 {elapsedMs:number;previousTimestamp:number|null}
export const createArchivistClockV111=():ArchivistClockV111=>({elapsedMs:0,previousTimestamp:null});
export const suspendArchivistClockV111=(clock:ArchivistClockV111):ArchivistClockV111=>({...clock,previousTimestamp:null});

/** Decorative elapsed time only. No city time, receipt or gameplay callback. */
export function sampleArchivistClockV111(clock:ArchivistClockV111,timestamp:number,advancing:boolean):ArchivistClockV111 {
  const elapsedMs=Number.isFinite(clock.elapsedMs)?Math.max(0,Math.min(HOMEWORLD_ARCHIVIST_SEQUENCE_MS_V111,clock.elapsedMs)):0;
  if(!advancing||!Number.isFinite(timestamp)||timestamp<0)return{elapsedMs,previousTimestamp:null};
  if(clock.previousTimestamp===null||!Number.isFinite(clock.previousTimestamp)||timestamp<clock.previousTimestamp)return{elapsedMs,previousTimestamp:timestamp};
  return{elapsedMs:Math.min(HOMEWORLD_ARCHIVIST_SEQUENCE_MS_V111,elapsedMs+Math.min(50,timestamp-clock.previousTimestamp)),previousTimestamp:timestamp};
}

/** The resting drawing returns after one short explicit conversation gesture. */
export function homeworldArchivistFrameV111(elapsedMs:number,active=true,reducedMotion=false) {
  const t=Number.isFinite(elapsedMs)?Math.max(0,elapsedMs):0;
  const index=!active||reducedMotion?0:manifest.frameEndMs.findIndex(end=>t<end);
  return manifest.frames[index<0?0:index];
}

/** All frames share ONE scale. Only the native foot registration varies. */
export function homeworldArchivistPlacementV111(id:string,heightWorld=100) {
  const frame=manifest.frames.find(frame=>frame.id===id);
  if(!frame||!Number.isFinite(heightWorld)||heightWorld<=0)return null;
  const scale=heightWorld/manifest.nativeHeight;
  return{left:-frame.pivot.x*scale,top:-frame.pivot.y*scale,width:frame.sourceWidth*scale,height:frame.sourceHeight*scale};
}
