import {PIT_ARENAS,serializePitCombat,deserializePitCombat,getPitCombatFighterDefinition,getPitFighterBoxes,type PitCombatState,type PitFighterState,type PitBox} from './pitCombat';
import type {PitFinisherViewV80} from './pitFinishersV80';
import {PIT_WORKBOOK_CONCLUSION_DISARM_ADMISSIONS_V107,getPitWorkbookConclusionFrameIndexV107,projectPitWorkbookConclusionContactV107,type PitWorkbookConclusionKeyV107} from './pitWorkbookConclusionSourceV107';

export type {PitWorkbookConclusionKeyV107} from './pitWorkbookConclusionSourceV107';
export const PIT_WORKBOOK_CONCLUSION_DURATION_V107=300;
export const PIT_WORKBOOK_CONCLUSION_SESSION_VERSION_V107=1;
type Slot=0|1;
export interface PitWorkbookSessionWeaponV107 {
  id:string;sourceId:string;poseId:string;offensiveMechanicId:string|null;disarmedPoseAdmitted:boolean;ownerSlot:Slot;state:'held'|'flying'|'ground';
  attachment:{offsetX:number;offsetY:number;width:number;height:number};
  x:number;y:number;velocityX:number;velocityY:number;
}
export interface PitWorkbookSessionObjectV107 {
  id:string;sourceId:string;appearance:'scar-red-beacon-v100';ownerSlot:Slot|null;
  state:'ground'|'recovered';x:number;y:number;
}
export interface PitWorkbookConclusionSessionV107 {
  version:1;id:string;provenance:'public-alternative-duel-v107';createdAtFrame:0;
  fighterIds:[string,string];arenaId:string;sourceWeaponAvailable:boolean;
  targetWeapon:PitWorkbookSessionWeaponV107;missionObject:PitWorkbookSessionObjectV107;
  receiptId:string|null;
}
export interface PitWorkbookConclusionContextV107 {
  enabled:boolean;relation:'hostile-adult'|'ally'|'training'|'unarmed-civil'|'unknown';
  reducedGore:boolean;reducedMotion:boolean;narrative:boolean;replay:boolean;
  session:PitWorkbookConclusionSessionV107|null;
}
export interface PitWorkbookConclusionContactEventV107 {
  type:'guard-contact'|'thrust-contact'|'disarm'|'device-detached'|'object-recovered';tick:number;
  actorSlot:Slot;targetSlot:Slot;box:PitBox;objectId?:string;receiptId?:string;
}
export interface PitWorkbookConclusionStateV107 {
  version:1;key:string;phase:'idle'|'window'|'approach'|'sequence'|'complete';
  winnerSlot:Slot|null;actionKey:PitWorkbookConclusionKeyV107|null;
  clipTick:number;approachTick:number;windowTicks:number;remainderMs:number;
  combatSnapshot:string|null;context:PitWorkbookConclusionContextV107|null;session:PitWorkbookConclusionSessionV107|null;
  actors:[PitFighterState,PitFighterState]|null;initialActors:[PitFighterState,PitFighterState]|null;
  contacts:PitWorkbookConclusionContactEventV107[];
  available:Partial<Record<PitWorkbookConclusionKeyV107,boolean>>;reasons:Record<PitWorkbookConclusionKeyV107,string[]>;
  outcome:'pending'|'finished'|'skipped'|'ineligible'|'contact-missed'|'partial-source';
}
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const other=(slot:Slot):Slot=>slot===0?1:0;
const overlap=(a:PitBox,b:PitBox)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
const finite=(value:unknown,min=-1e6,max=1e6):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
const id=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=200;
const point=(actor:PitFighterState,kind:'pickup'|'heldObject')=>projectPitWorkbookConclusionContactV107('CLEMENCE',actor.facing,kind,actor.x,actor.y,getPitCombatFighterDefinition(actor).bodyHeight);
function weaponBox(session:PitWorkbookConclusionSessionV107,actors:readonly[PitFighterState,PitFighterState]):PitBox {
  const weapon=session.targetWeapon,attachment=weapon.attachment,actor=actors[weapon.ownerSlot];
  return weapon.state==='held'?{x:actor.x+attachment.offsetX*actor.facing-attachment.width/2,y:actor.y+attachment.offsetY-attachment.height/2,width:attachment.width,height:attachment.height}:{x:weapon.x-attachment.width/2,y:weapon.y,width:attachment.width,height:attachment.height};
}
export function createPitWorkbookConclusionSessionV107(combat:PitCombatState,options:{sessionId:string;targetSlot:Slot;sourceWeaponAvailable:boolean;targetWeapon:Pick<PitWorkbookSessionWeaponV107,'id'|'sourceId'|'poseId'|'offensiveMechanicId'|'disarmedPoseAdmitted'|'attachment'>;missionObject:Pick<PitWorkbookSessionObjectV107,'id'|'sourceId'|'appearance'|'x'|'y'>}):PitWorkbookConclusionSessionV107 {
  if (combat.frame!==0 || combat.phase!=='round' || !id(options.sessionId) || options.targetSlot!==0&&options.targetSlot!==1 || options.targetWeapon.id===options.missionObject.id) throw new Error('V107 objective must be created publicly before the duel.');
  const session:PitWorkbookConclusionSessionV107={version:1,id:options.sessionId,provenance:'public-alternative-duel-v107',createdAtFrame:0,fighterIds:combat.fighters.map(f=>f.definitionId) as[string,string],arenaId:combat.arenaId,sourceWeaponAvailable:options.sourceWeaponAvailable,targetWeapon:{...clone(options.targetWeapon),ownerSlot:options.targetSlot,state:'held',x:0,y:0,velocityX:0,velocityY:0},missionObject:{...clone(options.missionObject),ownerSlot:null,state:'ground'},receiptId:null};
  if (!validSession(session)||session.missionObject.y!==0||session.missionObject.x<PIT_ARENAS[combat.arenaId].leftWall+20||session.missionObject.x>PIT_ARENAS[combat.arenaId].rightWall-20) throw new Error('Invalid V107 objective provenance or physical props.');
  return advancePitWorkbookConclusionSessionV107(session,combat);
}
export function advancePitWorkbookConclusionSessionV107(session:PitWorkbookConclusionSessionV107,combat:Pick<PitCombatState,'fighters'|'arenaId'>):PitWorkbookConclusionSessionV107 {
  if (session.arenaId!==combat.arenaId || session.fighterIds.some((fighter,index)=>fighter!==combat.fighters[index].definitionId)) return session;
  if (session.targetWeapon.state!=='held') return session;
  const box=weaponBox(session,combat.fighters),x=box.x+box.width/2,y=box.y;
  return session.targetWeapon.x===x&&session.targetWeapon.y===y?session:{...session,targetWeapon:{...session.targetWeapon,x,y}};
}
export function createPitWorkbookConclusionV107():PitWorkbookConclusionStateV107 {
  return {version:1,key:'',phase:'idle',winnerSlot:null,actionKey:null,clipTick:0,approachTick:0,windowTicks:300,remainderMs:0,combatSnapshot:null,context:null,session:null,actors:null,initialActors:null,contacts:[],available:{},reasons:{FATALITE_2:[],CLEMENCE:[]},outcome:'pending'};
}
function sceneBounds(state:PitWorkbookConclusionStateV107):{winnerX:number;victimX:number}|null {
  if (!state.actors||state.winnerSlot===null) return null;
  const winner=state.actors[state.winnerSlot],victim=state.actors[other(state.winnerSlot)],arena=PIT_ARENAS[state.session?.arenaId as keyof typeof PIT_ARENAS]??PIT_ARENAS['the-pit'];
  const gap=state.actionKey==='FATALITE_2'?60:100,direction=winner.facing;
  const centre=(winner.x+victim.x)/2;
  const pickup=point({...winner,x:0,y:0},'pickup');
  const wanted=state.actionKey==='CLEMENCE'&&state.session&&pickup?state.session.missionObject.x-pickup.x:Math.max(arena.leftWall+180,Math.min(arena.rightWall-180,centre-direction*gap/2));
  const target=wanted+direction*gap;
  return wanted>=arena.leftWall+getPitCombatFighterDefinition(winner).bodyWidth/2&&wanted<=arena.rightWall-getPitCombatFighterDefinition(winner).bodyWidth/2&&target>=arena.leftWall+getPitCombatFighterDefinition(victim).bodyWidth/2&&target<=arena.rightWall-getPitCombatFighterDefinition(victim).bodyWidth/2?{winnerX:wanted,victimX:target}:null;
}
export function observePitWorkbookConclusionV107(previous:PitWorkbookConclusionStateV107,combat:PitCombatState,v80:PitFinisherViewV80,context:PitWorkbookConclusionContextV107):PitWorkbookConclusionStateV107 {
  if (!context.enabled||v80.phase==='idle'||combat.phase!=='match-over') return previous.phase==='idle'?previous:createPitWorkbookConclusionV107();
  const key=[v80.key,combat.frame,combat.matchWinnerId].join(':');
  if (previous.key===key&&previous.phase!=='idle') {
    if (!previous.context||!context.reducedGore||previous.context.reducedGore) return previous;
    // A running lethal scene cannot become safe by merely recolouring an impact.
    return previous.actionKey==='FATALITE_2'?{...previous,phase:'complete',outcome:'skipped',context:{...previous.context,reducedGore:true}}:{...previous,context:{...previous.context,reducedGore:true}};
  }
  const slot=v80.winnerSlot,winner=slot===null?null:combat.fighters[slot],victim=slot===null?null:combat.fighters[other(slot)];
  const resultValid=slot!==null&&winner&&victim&&winner.definitionId==='scar'&&!winner.variantId&&winner.health>0&&winner.roundsWon>=2&&victim.health===0&&combat.matchWinnerId==='scar'&&combat.lastRoundResult?.reason==='ko'&&combat.lastRoundResult.winnerId==='scar';
  const common=[] as string[];
  if (!resultValid)common.push('SOURCE_SCAR_FINAL_VICTORY_REQUIRED');
  if (context.replay||v80.options.mode==='off'||combat.rules.stageJourney)common.push('CONCLUSION_CONTEXT_DISABLED');
  const fatal=[...common],mercy=[...common];
  if (context.relation!=='hostile-adult'||context.reducedGore||context.narrative||combat.rules.mode==='training')fatal.push('LETHAL_CONTEXT_NOT_AUTHORIZED');
  if (!context.session?.sourceWeaponAvailable)fatal.push('SCAR_EQUIPMENT_CONTEXT_REQUIRED');
  const session=context.session;
  if (!session||!validSession(session)||session.fighterIds.some((fighter,index)=>fighter!==combat.fighters[index].definitionId)||session.arenaId!==combat.arenaId)mercy.push('PREMATCH_OBJECTIVE_REQUIRED');
  else {
    if (session.targetWeapon.ownerSlot!== (slot===null?-1:other(slot))||session.targetWeapon.state!=='held'||session.missionObject.state!=='ground'||session.receiptId)mercy.push('OBJECTIVE_ALREADY_RESOLVED_OR_WRONG_OWNER');
    if (!session.sourceWeaponAvailable)mercy.push('SCAR_EQUIPMENT_CONTEXT_REQUIRED');
  }
  const actors=clone(combat.fighters);for(const actor of actors){actor.action=null;actor.guard=null;actor.grounded=true;actor.y=0;actor.velocityX=0;actor.velocityY=0;actor.crouching=false;actor.phase='idle';}
  if(slot!==null){actors[slot].facing=actors[slot].x<=actors[other(slot)].x?1:-1;actors[other(slot)].facing=actors[slot].facing===1?-1:1;}
  const state:PitWorkbookConclusionStateV107={...createPitWorkbookConclusionV107(),key,phase:common.length?'complete':'window',winnerSlot:slot,combatSnapshot:serializePitCombat(combat),context:clone(context),session:session?clone(session):null,actors,initialActors:clone(combat.fighters),available:{FATALITE_2:fatal.length===0,CLEMENCE:mercy.length===0},reasons:{FATALITE_2:fatal,CLEMENCE:mercy},outcome:common.length?'ineligible':'pending'};
  return state;
}
export function triggerPitWorkbookConclusionV107(current:PitWorkbookConclusionStateV107,key:PitWorkbookConclusionKeyV107):PitWorkbookConclusionStateV107 {
  if(current.phase!=='window'||!current.available[key])return current;
  const state={...clone(current),phase:'approach' as const,actionKey:key};
  if(key==='FATALITE_2'&&state.actors&&state.winnerSlot!==null)state.actors[other(state.winnerSlot)].guard='high';
  if(!sceneBounds(state))return {...state,phase:'complete',outcome:'ineligible'};
  return state;
}
export function skipPitWorkbookConclusionV107(state:PitWorkbookConclusionStateV107):PitWorkbookConclusionStateV107 {return state.phase==='idle'||state.phase==='complete'?state:{...state,phase:'complete',outcome:'skipped'};}
function dropInertDeviceAtThrust(state:PitWorkbookConclusionStateV107):void {
  if(!state.session||!state.actors||state.winnerSlot===null)return;
  const weapon=state.session.targetWeapon;
  if(weapon.state!=='held'||weapon.offensiveMechanicId!==null||weapon.ownerSlot!==other(state.winnerSlot))return;
  const actual=weaponBox(state.session,state.actors);
  weapon.state='flying';weapon.x=actual.x+actual.width/2;weapon.y=actual.y;
  weapon.velocityX=state.actors[state.winnerSlot].facing*1.2;weapon.velocityY=2.4;
}
function advanceDroppedDevice(weapon:PitWorkbookSessionWeaponV107):void {
  if((weapon.state!=='ground'&&weapon.state!=='flying')||(weapon.y===0&&weapon.velocityY===0))return;
  weapon.velocityY-=.4;weapon.x+=weapon.velocityX;weapon.y=Math.max(0,weapon.y+weapon.velocityY);
  if(weapon.y===0){weapon.state='ground';weapon.velocityY=0;weapon.velocityX=0;}
}
function sequenceTick(state:PitWorkbookConclusionStateV107):void {
  if(!state.actors||state.winnerSlot===null||!state.actionKey)return;
  const winner=state.actors[state.winnerSlot],victim=state.actors[other(state.winnerSlot)],tick=state.clipTick;
  const once=(type:PitWorkbookConclusionContactEventV107['type'])=>state.contacts.some(contact=>contact.type===type);
  const contact=(kind:'guard'|'thrust'|'thrustExtended'|'disarm')=>projectPitWorkbookConclusionContactV107(state.actionKey!,winner.facing,kind,winner.x,winner.y,getPitCombatFighterDefinition(winner).bodyHeight);
  if(state.actionKey==='FATALITE_2') {
    if(tick>=30&&tick<60&&!once('guard-contact')){const box=contact('guard');if(box&&victim.guard==='high'&&overlap(box,getPitFighterBoxes(victim).hurtbox)){state.contacts.push({type:'guard-contact',tick,actorSlot:winner.slot,targetSlot:victim.slot,box});victim.guard=null;victim.phase='hitstun';victim.stunFrames=24;}}
    if(tick>=60&&tick<180&&!once('thrust-contact')){const box=contact(tick<120?'thrust':'thrustExtended');if(box&&overlap(box,getPitFighterBoxes(victim).hurtbox)){state.contacts.push({type:'thrust-contact',tick,actorSlot:winner.slot,targetSlot:victim.slot,box});victim.phase='hitstun';victim.stunFrames=48;victim.action=null;victim.guard=null;dropInertDeviceAtThrust(state);}}
  } else if(state.session) {
    const session=state.session,weapon=session.targetWeapon,object=session.missionObject;
    if(tick>=30&&tick<60&&!once('disarm')&&!once('device-detached')){const box=contact('disarm');if(box&&weapon.state==='held'&&overlap(box,weaponBox(session,state.actors))){const actual=weaponBox(session,state.actors);weapon.state='ground';weapon.x=actual.x+actual.width/2;weapon.y=actual.y;weapon.velocityX=winner.facing*1.2;weapon.velocityY=2.4;victim.action=null;victim.guard=null;victim.phase='hitstun';victim.stunFrames=24;const offensive=weapon.offensiveMechanicId===getPitCombatFighterDefinition(victim).technique.id&&weapon.disarmedPoseAdmitted&&PIT_WORKBOOK_CONCLUSION_DISARM_ADMISSIONS_V107.some(admission=>admission.fighterId===victim.definitionId&&admission.mechanicId===weapon.offensiveMechanicId&&admission.sourceId===weapon.sourceId&&admission.poseId===weapon.poseId);state.contacts.push({type:offensive?'disarm':'device-detached',tick,actorSlot:winner.slot,targetSlot:victim.slot,box,objectId:weapon.id});}}
    if(tick>=240&&!once('object-recovered')&&(once('disarm')||once('device-detached'))){const pickup=point(winner,'pickup');if(pickup&&object.state==='ground'&&Math.abs(pickup.x-object.x)<=12&&Math.abs(pickup.y-object.y)<=12){object.state='recovered';object.ownerSlot=winner.slot;session.receiptId=session.id+':recover:'+object.id;state.contacts.push({type:'object-recovered',tick,actorSlot:winner.slot,targetSlot:victim.slot,box:{x:pickup.x-6,y:pickup.y-6,width:12,height:12},objectId:object.id,receiptId:session.receiptId});}}
    if(object.state==='recovered'){const hand=point(winner,'heldObject');if(hand){object.x=hand.x;object.y=hand.y;}}
  }
  if(state.session)advanceDroppedDevice(state.session.targetWeapon);
  if(victim.stunFrames>0)victim.stunFrames-=1;
  if(victim.stunFrames===0&&victim.phase==='hitstun')victim.phase='idle';
}
export function advancePitWorkbookConclusionV107(current:PitWorkbookConclusionStateV107,elapsedMs:number,options:{frozen?:boolean;reducedMotion?:boolean;reducedGore?:boolean}={}):PitWorkbookConclusionStateV107 {
  if(options.frozen||current.phase==='idle'||current.phase==='complete'||!finite(elapsedMs,0,1e9)||elapsedMs===0)return current;
  if(options.reducedGore&&current.actionKey==='FATALITE_2')return skipPitWorkbookConclusionV107(current);
  const state=clone(current);if(state.context&&options.reducedMotion)state.context.reducedMotion=true;
  const total=state.remainderMs+Math.min(elapsedMs,100),ticks=Math.floor((total+1e-8)/(1000/60));state.remainderMs=total-ticks*(1000/60);
  for(let index=0;index<ticks&&state.phase!=='complete';index++){
    if(state.phase==='window'){if(--state.windowTicks<=0){state.phase='complete';state.outcome='skipped';}continue;}
    if(state.phase==='approach'&&state.actors&&state.winnerSlot!==null){const target=sceneBounds(state);if(!target||++state.approachTick>600){state.phase='complete';state.outcome='ineligible';break;}let ready=true;for(const slot of [state.winnerSlot,other(state.winnerSlot)] as const){const actor=state.actors[slot],x=slot===state.winnerSlot?target.winnerX:target.victimX,step=Math.min(getPitCombatFighterDefinition(actor).walkSpeed,Math.abs(x-actor.x));actor.velocityX=Math.sign(x-actor.x)*step;actor.x+=actor.velocityX;if(Math.abs(x-actor.x)>.001)ready=false;}if(ready){for(const actor of state.actors)actor.velocityX=0;state.phase='sequence';state.clipTick=0;}continue;}
    if(state.phase==='sequence'){sequenceTick(state);state.clipTick++;if(state.clipTick>=300){state.phase='complete';const complete=state.actionKey==='FATALITE_2'?state.contacts.some(c=>c.type==='guard-contact')&&state.contacts.some(c=>c.type==='thrust-contact'):state.contacts.some(c=>c.type==='disarm')&&state.contacts.some(c=>c.type==='object-recovered');state.outcome=complete?'finished':state.actionKey==='CLEMENCE'&&state.contacts.some(c=>c.type==='device-detached')&&state.contacts.some(c=>c.type==='object-recovered')?'partial-source':'contact-missed';}}
  }
  return state;
}
export function samplePitWorkbookConclusionV107(state:PitWorkbookConclusionStateV107){
  if((state.phase!=='approach'&&state.phase!=='sequence'&&!(state.phase==='complete'&&(state.outcome==='finished'||state.outcome==='partial-source')))||!state.actors||state.winnerSlot===null||!state.actionKey)return null;
  const clipTick=state.phase==='approach'?0:state.actionKey==='CLEMENCE'&&state.session?.missionObject.state!=='recovered'?Math.min(239,state.clipTick):Math.min(299,state.clipTick);
  const props=state.session?clone({targetWeapon:state.session.targetWeapon,missionObject:state.session.missionObject}):null;
  if(props?.targetWeapon.state==='held'&&state.session){const box=weaponBox(state.session,state.actors);props.targetWeapon.x=box.x+box.width/2;props.targetWeapon.y=box.y;}
  return {actors:clone(state.actors),winnerSlot:state.winnerSlot,actionKey:state.actionKey,clipTick,frameIndex:state.phase==='approach'?-1:getPitWorkbookConclusionFrameIndexV107(clipTick),contacts:clone(state.contacts),props,reducedMotion:state.context?.reducedMotion??false,qualification:getPitWorkbookConclusionQualificationV107(state),phase:state.phase};
}
function validSession(value:unknown):value is PitWorkbookConclusionSessionV107 {
  if(!value||typeof value!=='object')return false;const s=value as PitWorkbookConclusionSessionV107,w=s.targetWeapon,o=s.missionObject;
  return s.version===1&&id(s.id)&&s.provenance==='public-alternative-duel-v107'&&s.createdAtFrame===0&&Array.isArray(s.fighterIds)&&s.fighterIds.length===2&&s.fighterIds.every(id)&&Object.hasOwn(PIT_ARENAS,s.arenaId)&&typeof s.sourceWeaponAvailable==='boolean'&&!!w&&id(w.id)&&id(w.sourceId)&&id(w.poseId)&&(w.offensiveMechanicId===null||id(w.offensiveMechanicId))&&typeof w.disarmedPoseAdmitted==='boolean'&&(w.ownerSlot===0||w.ownerSlot===1)&&(w.state==='held'||w.state==='ground'||w.state==='flying'&&finite(w.y,Number.MIN_VALUE))&&!!w.attachment&&Object.values(w.attachment).length===4&&Object.values(w.attachment).every(v=>finite(v,-300,300))&&w.attachment.width>0&&w.attachment.height>0&&[w.x,w.y,w.velocityX,w.velocityY].every(v=>finite(v))&&!!o&&id(o.id)&&id(o.sourceId)&&o.id!==w.id&&o.appearance==='scar-red-beacon-v100'&&(o.ownerSlot===null||o.ownerSlot===0||o.ownerSlot===1)&&(o.state==='ground'?o.ownerSlot===null:o.state==='recovered'&&o.ownerSlot!==null)&&finite(o.x)&&finite(o.y,0)&&((o.state==='ground'&&s.receiptId===null)||(o.state==='recovered'&&s.receiptId===s.id+':recover:'+o.id));
}
export function serializePitWorkbookConclusionSessionV107(session:PitWorkbookConclusionSessionV107):string{if(!validSession(session))throw new Error('Invalid V107 objective session.');return JSON.stringify(session);}
export function deserializePitWorkbookConclusionSessionV107(text:string):PitWorkbookConclusionSessionV107{const value:unknown=JSON.parse(text);if(!validSession(value))throw new Error('Invalid V107 objective session.');return value;}
export function serializePitWorkbookConclusionV107(state:PitWorkbookConclusionStateV107):string{return JSON.stringify(state);}
export function deserializePitWorkbookConclusionV107(text:string):PitWorkbookConclusionStateV107 {
 const value:unknown=JSON.parse(text);if(!value||typeof value!=='object')throw new Error('Invalid V107 conclusion.');const s=value as PitWorkbookConclusionStateV107;
 const reject=()=>{throw new Error('Invalid V107 conclusion.');};
 if(s.version!==1||!['idle','window','approach','sequence','complete'].includes(s.phase)||!id(s.key)&&s.key!==''||!Number.isInteger(s.clipTick)||s.clipTick<0||s.clipTick>300||!Number.isInteger(s.approachTick)||s.approachTick<0||s.approachTick>601||!Number.isInteger(s.windowTicks)||s.windowTicks<0||s.windowTicks>300||!finite(s.remainderMs,-1e-6,1000/60)||!Array.isArray(s.contacts)||s.contacts.length>4||s.session!==null&&!validSession(s.session)||s.actionKey!==null&&s.actionKey!=='FATALITE_2'&&s.actionKey!=='CLEMENCE'||s.winnerSlot!==null&&s.winnerSlot!==0&&s.winnerSlot!==1||!['pending','finished','skipped','ineligible','contact-missed','partial-source'].includes(s.outcome))reject();
 if(s.phase==='idle'){if(s.combatSnapshot!==null||s.actors!==null||s.initialActors!==null||s.actionKey!==null||s.contacts.length!==0)reject();return s;}
 if(typeof s.combatSnapshot!=='string')reject();
 const combat=deserializePitCombat(s.combatSnapshot!);
 if(combat.phase!=='match-over'||JSON.stringify(s.initialActors)!==JSON.stringify(combat.fighters)||!s.context||typeof s.context.enabled!=='boolean'||!['hostile-adult','ally','training','unarmed-civil','unknown'].includes(s.context.relation)||!['reducedGore','reducedMotion','narrative','replay'].every(key=>typeof s.context![key as keyof PitWorkbookConclusionContextV107]==='boolean')||s.context.session!==null&&!validSession(s.context.session)||!s.available||!Object.values(s.available).every(v=>typeof v==='boolean')||!s.reasons||!['FATALITE_2','CLEMENCE'].every(key=>Array.isArray(s.reasons[key as PitWorkbookConclusionKeyV107])&&s.reasons[key as PitWorkbookConclusionKeyV107].every(id)))reject();
 if(!Array.isArray(s.actors)||s.actors.length!==2)reject();
 const mutable=new Set(['x','y','velocityX','velocityY','facing','grounded','crouching','guard','phase','action','stunFrames']);
 for(const[index,actor]of s.actors!.entries()){
  const original=combat.fighters[index];
  if(!actor||Object.keys(actor).length!==Object.keys(original).length||Object.keys(original).some(key=>!mutable.has(key)&&JSON.stringify(actor[key as keyof PitFighterState])!==JSON.stringify(original[key as keyof PitFighterState]))||![actor.x,actor.y,actor.velocityX,actor.velocityY].every(v=>finite(v))||(actor.facing!==1&&actor.facing!==-1)||actor.y!==0||actor.grounded!==true||actor.crouching!==false||actor.guard!==null&&actor.guard!=='high'||actor.action!==null||!['idle','hitstun'].includes(actor.phase)||!Number.isInteger(actor.stunFrames)||actor.stunFrames<0||actor.stunFrames>1000)reject();
 }
 if(s.session&&(s.session.fighterIds.some((fighter,index)=>fighter!==combat.fighters[index].definitionId)||s.session.arenaId!==combat.arenaId||!s.context?.session||s.session.id!==s.context.session.id||s.session.targetWeapon.id!==s.context.session.targetWeapon.id||s.session.missionObject.id!==s.context.session.missionObject.id))reject();
 if(s.session&&s.context?.session){const before=s.context.session;for(const key of ['id','sourceId','poseId','offensiveMechanicId','disarmedPoseAdmitted','ownerSlot','attachment'] as const)if(JSON.stringify(s.session.targetWeapon[key])!==JSON.stringify(before.targetWeapon[key]))reject();for(const key of ['id','sourceId','appearance'] as const)if(s.session.missionObject[key]!==before.missionObject[key])reject();if(s.session.missionObject.state==='ground'&&(s.session.missionObject.x!==before.missionObject.x||s.session.missionObject.y!==before.missionObject.y))reject();}
 if((s.phase==='window'||s.phase==='approach')&&s.clipTick!==0||s.phase==='sequence'&&s.clipTick>=300||s.phase==='window'&&s.actionKey!==null||(s.phase==='approach'||s.phase==='sequence')&&s.actionKey===null)reject();
 const seen=new Set<string>();
 for(const event of s.contacts){
  if(seen.has(event.type)||!Number.isInteger(event.tick)||event.tick<0||event.tick>=s.clipTick||!['guard-contact','thrust-contact','disarm','device-detached','object-recovered'].includes(event.type)||event.actorSlot!==s.winnerSlot||s.winnerSlot===null||event.targetSlot!==other(s.winnerSlot)||!event.box||Object.values(event.box).length!==4||!Object.values(event.box).every(v=>finite(v)))reject();seen.add(event.type);
  const winner=s.actors![s.winnerSlot!];let expected:PitBox|null=null;
  if(event.type==='object-recovered'){
   const pickup=point(winner,'pickup');if(s.actionKey!=='CLEMENCE'||event.tick<240||event.tick>=300||event.objectId!==s.session?.missionObject.id||event.receiptId!==s.session?.receiptId||!pickup)reject();
   expected={x:pickup!.x-6,y:pickup!.y-6,width:12,height:12};
  } else {
   const thrust=event.type==='thrust-contact',kind=thrust?event.tick<120?'thrust':'thrustExtended':event.type==='guard-contact'?'guard':'disarm';
   if(thrust?(s.actionKey!=='FATALITE_2'||event.tick<60||event.tick>=180):(event.tick<30||event.tick>=60)||kind==='disarm'&&(s.actionKey!=='CLEMENCE'||event.objectId!==s.session?.targetWeapon.id))reject();
   if(event.type==='disarm'&&!PIT_WORKBOOK_CONCLUSION_DISARM_ADMISSIONS_V107.some(admission=>admission.fighterId===s.actors![event.targetSlot].definitionId&&admission.mechanicId===s.session?.targetWeapon.offensiveMechanicId&&admission.sourceId===s.session.targetWeapon.sourceId&&admission.poseId===s.session.targetWeapon.poseId))reject();
   expected=projectPitWorkbookConclusionContactV107(s.actionKey!,winner.facing,kind,winner.x,winner.y,getPitCombatFighterDefinition(winner).bodyHeight);
  }
  if(!expected||JSON.stringify(event.box)!==JSON.stringify(expected))reject();
 }
 if(s.session){
  const weapon=s.session.targetWeapon,before=s.context!.session!.targetWeapon;
  const thrust=s.contacts.find(event=>event.type==='thrust-contact');
  const fatalDrop=s.actionKey==='FATALITE_2'&&weapon.offensiveMechanicId===null&&weapon.ownerSlot===other(s.winnerSlot!)&&!!thrust;
  if(fatalDrop){
   // The existing true thrust is the only cause: no disarm or mission event is
   // invented for this inert alternative-duel prop. Reconstruct its full flight
   // to reject floating, teleporting, duplicate or prematurely grounded saves.
   if(before.state!=='held'||seen.has('disarm')||seen.has('device-detached')||seen.has('object-recovered'))reject();
   const expected=clone(s);expected.session!.targetWeapon=clone(before);dropInertDeviceAtThrust(expected);
   for(let tick=thrust!.tick;tick<s.clipTick;tick++)advanceDroppedDevice(expected.session!.targetWeapon);
   for(const key of ['state','x','y','velocityX','velocityY'] as const)if(weapon[key]!==expected.session!.targetWeapon[key])reject();
  }else if((weapon.state==='ground')!==(seen.has('disarm')||seen.has('device-detached'))||weapon.state==='flying')reject();
  if((s.session.missionObject.state==='recovered')!==seen.has('object-recovered'))reject();
 }
 if(s.outcome==='finished'&&(s.actionKey==='FATALITE_2'?!seen.has('guard-contact')||!seen.has('thrust-contact'):!seen.has('disarm')||!seen.has('object-recovered'))||s.outcome==='partial-source'&&(s.actionKey!=='CLEMENCE'||!seen.has('device-detached')||!seen.has('object-recovered')))reject();
 return s;
}

/** A physical prop transfer is not silently promoted to an armed disarm. */
export function getPitWorkbookConclusionQualificationV107(state:PitWorkbookConclusionStateV107):{sourceActionComplete:boolean;missing:string[]} {
 const missing:string[]=[];
 if(state.actionKey==='CLEMENCE'){
  if(!state.contacts.some(event=>event.type==='disarm'))missing.push('OFFENSIVE_WEAPON_DISARM_NOT_DELIVERED');
  if(!state.contacts.some(event=>event.type==='object-recovered'))missing.push('EXISTING_SESSION_OBJECT_NOT_RECOVERED');
 } else if(state.actionKey==='FATALITE_2'){if(!state.contacts.some(event=>event.type==='guard-contact'))missing.push('REAL_GUARD_OPENING_NOT_CONFIRMED');if(!state.contacts.some(event=>event.type==='thrust-contact'))missing.push('REAL_NATIVE_CONTACT_NOT_CONFIRMED');}
 else if(state.actionKey===null)missing.push('NO_SOURCE_ACTION_SELECTED');
 return {sourceActionComplete:state.phase==='complete'&&state.outcome==='finished'&&missing.length===0,missing};
}

export function pitWorkbookConclusionBlocksResultV107(state:PitWorkbookConclusionStateV107):boolean {return state.phase==='window'||state.phase==='approach'||state.phase==='sequence';}
