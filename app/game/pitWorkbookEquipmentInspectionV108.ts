import {getPitWorkbookNativeV100} from './pitWorkbookAnimationV100';
import {resolvePitSpriteSheetInspectionV100,type PitSpriteSheetAnimationBank} from './pitSpriteSheetAnimation';
import {PIT_FIGHTERS,type PitFighterState} from './systems/pitCombat';
import {getSpriteContact} from './spriteContact';

export const PIT_WORKBOOK_EQUIPMENT_INSPECTION_REGISTRY_V108=(['feral-hunter','scar'] as const).map(fighterId=>{
  const native=getPitWorkbookNativeV100(fighterId,fighterId==='scar'?'M_F003_EQUIP':'M_F006_EQUIP');
  if(!native||!(['left','right'] as const).every(facing=>native.definition.atlas.clips.some(clip=>clip.facing===facing&&clip.status==='validated'&&!clip.loop&&clip.ticksPerSecond===60&&clip.frames.length===6&&clip.frames.reduce((sum,frame)=>sum+frame.durationTicks,0)===40)))throw new Error('Incomplete native equipment inspection.');
  return native.definition;
});
/** Twenty proximity ticks precede the exact, uninterrupted forty-tick native
 * draw/inspect/stow cycle. This selection never alters inventory or pixels. */
export function resolvePitWorkbookEquipmentInspectionV108(bank:PitSpriteSheetAnimationBank|null,fighter:PitFighterState,holdTicks:number){
  if(fighter.variantId||!fighter.grounded||fighter.phase!=='idle'||fighter.action||!Number.isSafeInteger(holdTicks)||holdTicks<21||holdTicks>60)return null;
  const definition=PIT_WORKBOOK_EQUIPMENT_INSPECTION_REGISTRY_V108.find(entry=>entry.fighterId===fighter.definitionId);
  if(!definition)return null;
  return resolvePitSpriteSheetInspectionV100(bank,{fighterId:fighter.definitionId,atlasId:definition.atlas.id,clipId:'workbook.'+(fighter.definitionId==='scar'?'M_F003_EQUIP':'M_F006_EQUIP'),facing:fighter.facing===1?'right':'left',elapsedTicks:holdTicks-21});
}
export function pitWorkbookEquipmentInspectionReadyV108(bank:PitSpriteSheetAnimationBank|null,fighter:PitFighterState){
  return ([-1,1] as const).every(facing=>!!resolvePitWorkbookEquipmentInspectionV108(bank,{...fighter,facing},21));
}
export function drawPitWorkbookEquipmentInspectionV108(context:CanvasRenderingContext2D,bank:PitSpriteSheetAnimationBank|null,fighter:PitFighterState,holdTicks:number,groundY:number):boolean{
  const selected=resolvePitWorkbookEquipmentInspectionV108(bank,fighter,holdTicks);if(!selected)return false;
  const {rect,pivot}=selected.frame.frame,reference=selected.definition.pageBodyHeightPx?.[selected.frame.page.id]??selected.definition.bodyHeightPx;
  const scale=PIT_FIGHTERS[fighter.definitionId].bodyHeight/reference,contact=getSpriteContact(selected.source,rect,pivot[1])?.offsetY??0;
  context.save();try{context.imageSmoothingEnabled=false;context.drawImage(selected.source,...rect,fighter.x-pivot[0]*scale,groundY-fighter.y-(pivot[1]-contact)*scale,rect[2]*scale,rect[3]*scale);return true;}finally{context.restore();}
}
