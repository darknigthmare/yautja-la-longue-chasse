import manifest from '../data/homeworldCivilianMotionV74.json';
import type { HomeworldCivilianRoleV72 } from './homeworldIdentityV72';
export const HOMEWORLD_CIVILIAN_MOTION_V74 = manifest;
export type HomeworldCivilianMotionRoleV74 = HomeworldCivilianRoleV72;
type NativeFrame = typeof manifest.roles.chief.clips.right[number];
export function homeworldCivilianMotionFrameV74(role:HomeworldCivilianRoleV72,seconds:number,facing:1|-1,height?:number,speed?:number){
  const actor=manifest.roles[role],clip=facing===1?'right':'left';
  // Four key drawings advance from the city's paused clock. Residents use their
  // existing stable phaseSeconds and speed; there is no independent CSS timer.
  const worldHeight=height??actor.heightWorld;
  const fps=speed!==undefined&&Number.isFinite(speed)?Math.max(.5,Math.min(8,4*Math.max(0,speed)/(worldHeight*.72))):actor.fps;
  const time=Number.isFinite(seconds)?Math.max(0,seconds):0;
  const index=Math.floor(time*fps+1e-8)%actor.clips[clip].length;
  const frame:NativeFrame=actor.clips[clip][index];
  const source=manifest.sources[frame.sourceId as keyof typeof manifest.sources];
  return {actor,source,frame,index,clip,scale:worldHeight/actor.nativeHeight,fps};
}
