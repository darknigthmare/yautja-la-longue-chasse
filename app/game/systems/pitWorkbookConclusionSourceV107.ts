import source from '../data/pitWorkbookConclusionAnchorsV107.json';
import type {PitBox} from './pitCombat';
export type PitWorkbookConclusionKeyV107 = 'FATALITE_2' | 'CLEMENCE';
export type PitWorkbookConclusionContactV107 = 'guard' | 'thrust' | 'thrustExtended' | 'disarm' | 'pickup' | 'heldObject';
interface NativeFrame {facing:string;index:number;path:string;rect:number[];pivot:number[];bodyHeightPx:number;contactOffsetPx:number;durationTicks:number}
interface NativeGeometry {index:number;bounds?:number[];point?:number[]}
export const PIT_WORKBOOK_CONCLUSION_SOURCES_V107 = source.entries;
export function getPitWorkbookConclusionFrameIndexV107(tick:number): number {
  if (!Number.isFinite(tick) || tick < 0 || tick >= 300) return -1;
  return tick < 30 ? 0 : tick < 60 ? 1 : tick < 120 ? 2 : tick < 180 ? 3 : tick < 240 ? 4 : 5;
}
export function getPitWorkbookConclusionSourceV107(key:PitWorkbookConclusionKeyV107) {return source.entries.find(entry=>entry.key===key);}
export function getPitWorkbookConclusionFrameV107(key:PitWorkbookConclusionKeyV107,facing:1|-1,index:number): NativeFrame|undefined {
  return getPitWorkbookConclusionSourceV107(key)?.frames.find(frame=>frame.facing===(facing===1?'right':'left')&&frame.index===index);
}
export function projectPitWorkbookConclusionContactV107(key:PitWorkbookConclusionKeyV107,facing:1|-1,kind:PitWorkbookConclusionContactV107,x:number,y:number,bodyHeight:number): PitBox|null {
  if (![x,y,bodyHeight].every(Number.isFinite) || bodyHeight<=0) return null;
  const entry=getPitWorkbookConclusionSourceV107(key);
  const geometry=(entry?.geometry as unknown as Record<string,Record<string,NativeGeometry>>)?.[facing===1?'right':'left']?.[kind];
  const frame=geometry&&getPitWorkbookConclusionFrameV107(key,facing,geometry.index);
  if (!geometry || !frame) return null;
  const scale=bodyHeight/frame.bodyHeightPx;
  const bounds=geometry.bounds??[geometry.point?.[0]??0,geometry.point?.[1]??0,0,0];
  return {x:x+(bounds[0]-frame.pivot[0])*scale,y:y+(frame.pivot[1]-bounds[1]-bounds[3]-frame.contactOffsetPx)*scale,width:bounds[2]*scale,height:bounds[3]*scale};
}

/** No standalone offensive weapon + genuinely disarmed victim pair has been
 * admitted yet. A caller-supplied capability flag cannot substitute for pixels
 * and provenance. Curated future entries must identify both actual admissions. */
export const PIT_WORKBOOK_CONCLUSION_DISARM_ADMISSIONS_V107: readonly {
 fighterId:string;mechanicId:string;sourceId:string;poseId:string;weaponAdmissionId:string;victimAdmissionId:string;
}[]=[];
