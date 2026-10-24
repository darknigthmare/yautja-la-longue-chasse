import * as previous from './pitWorkbookCampaignV107';
import {PIT_FIGHTERS, type PitCombatState} from './pitCombat';
import {getPitFighterBoxes} from './pitCombat';
import type {PitNarrativeResultInput} from './pitNarrativeTrialsV57';

export type PitWorkbookCampaignFighterV108 = previous.PitWorkbookCampaignFighterV107;
export const getPitWorkbookCampaignRouteV108 = previous.getPitWorkbookCampaignRouteV107;
export interface PitWorkbookCarryV108 {
  health: number; traque: number;
  device: {id: string; item: 'mine' | 'shuriken'; status: 'ready' | 'spent'};
}
interface ObservationV108 {encounterId:string;frame:number;phase:string;winnerId:string|null;health:number;traque:number;released:boolean}
export interface PitWorkbookCampaignRunV108 extends previous.PitWorkbookCampaignRunV107 {
  continuityV108: {version:1;carry:PitWorkbookCarryV108;observation:ObservationV108|null;
    inspected:{stageIndex:number;actionId:string;facing:'right'|'left';nativeTicks:40}|null;
    victories:Array<{stageIndex:number;resultId:string;carry:PitWorkbookCarryV108}>};
}
export interface PitWorkbookCampaignFieldV108 extends previous.PitWorkbookCampaignFieldV107 {
  inspectionV108:{nativeTicks:number;facing:1|-1;startedFrame:number|null};
}
const copy = <T,>(value:T):T => structuredClone(value);
const identity = (run:Pick<PitWorkbookCampaignRunV108,'runId'|'fighterId'>) => ({id:run.runId+':source-kit-'+(run.fighterId==='scar'?'shuriken':'mine'),item:run.fighterId==='scar'?'shuriken' as const:'mine' as const});

export function createPitWorkbookCampaignRunV108(fighterId:PitWorkbookCampaignFighterV108,owner:string,runId:string):PitWorkbookCampaignRunV108 {
  const run=previous.createPitWorkbookCampaignRunV107(fighterId,owner,runId);
  return {...run,continuityV108:{version:1,carry:{health:PIT_FIGHTERS[fighterId].maxHealth,traque:0,device:{...identity(run),status:'ready'}},observation:null,inspected:null,victories:[]}};
}
export function getPitWorkbookCampaignEncounterV108(run:PitWorkbookCampaignRunV108) {
  const encounter=previous.getPitWorkbookCampaignEncounterV107(run);
  return encounter?{...encounter,normalMoves:'workbook-v107' as const,workbookCarryV108:copy(run.continuityV108.carry)}:null;
}
/** One decisive round prevents a normal second round from replenishing the
 * exercise kit. The engine and all historical recipes remain unchanged. */
export function preparePitWorkbookCampaignCombatV108(combat:PitCombatState,carry:PitWorkbookCarryV108):PitCombatState {
  const hero=combat.fighters[0],item=hero.definitionId==='scar'?'shuriken':'mine';
  if(combat.version!==15||combat.rules.normalMoves!=='workbook-v107'||combat.frame!==0||hero.variantId||
      !['feral-hunter','scar'].includes(hero.definitionId)||!validCarry(carry,hero.definitionId)||carry.device.item!==item)throw new Error('Invalid V108 exercise carry.');
  const state=copy(combat);state.fighters[0].health=carry.health;state.fighters[0].traque=carry.traque;
  state.fighters[0].workbookDeviceV107={item,status:carry.device.status,effectId:null};
  state.fighters[0].roundsWon=1;state.fighters[1].roundsWon=1;
  return state;
}
export function beginPitWorkbookCampaignStageV108(run:PitWorkbookCampaignRunV108):PitWorkbookCampaignRunV108 {
  const next=previous.beginPitWorkbookCampaignStageV107(run);
  return next===run?run:{...next,continuityV108:{...run.continuityV108,observation:null}};
}
export function advancePitWorkbookCampaignV108(run:PitWorkbookCampaignRunV108):PitWorkbookCampaignRunV108 {
  return previous.advancePitWorkbookCampaignV107(run) as PitWorkbookCampaignRunV108;
}
export function observePitWorkbookCampaignCombatV108(run:PitWorkbookCampaignRunV108,combat:Readonly<PitCombatState>):PitWorkbookCampaignRunV108 {
  const encounter=getPitWorkbookCampaignEncounterV108(run),hero=combat.fighters[0];
  if(run.phase!=='fight'||!encounter||combat.version!==15||combat.rules.normalMoves!=='workbook-v107'||
      hero.definitionId!==encounter.leftId||hero.variantId||combat.fighters[1].definitionId!==encounter.rightId||combat.arenaId!==encounter.arenaId||
      combat.frame<=(run.continuityV108.observation?.frame??-1))return run;
  const wasReleased=run.continuityV108.carry.device.status==='spent'||Boolean(run.continuityV108.observation?.released);
  const released=wasReleased||combat.events.some(event=>event.type==='workbook-device-v107'&&event.fighterId===run.fighterId&&
    event.kind===run.continuityV108.carry.device.item&&(event.event==='placed'||event.event==='launched'));
  const observation:ObservationV108={encounterId:encounter.id,frame:combat.frame,phase:combat.phase,winnerId:combat.matchWinnerId,
    health:hero.health,traque:hero.traque,released};
  let counters=run.counters,shield=run.shieldBlock;const receipts=run.receipts.slice(),action=hero.action;
  if(run.stageIndex===5&&combat.frame>run.lastObservedFrame){
    if(action?.workbookMove==='S2'&&run.fighterId==='feral-hunter'&&combat.events.some(event=>event.type==='block'&&event.defenderId===hero.definitionId&&event.damage===0))shield={round:combat.round,actionStart:combat.frame-action.frame};
    const strike=combat.events.some(event=>event.type==='hit'&&event.attackerId===hero.definitionId&&event.attack==='technique');
    const scar=run.fighterId==='scar'&&action?.workbookMove==='S4'&&hero.phase==='active'&&action.connected&&strike;
    const feral=run.fighterId==='feral-hunter'&&action?.workbookMove==='S2'&&action.connected&&action.frame>=18&&shield?.round===combat.round&&shield.actionStart===combat.frame-action.frame&&strike&&getPitFighterBoxes(hero).hitbox!==null;
    if((scar||feral)&&action&&counters<3){const id=encounter.id+':counter:'+combat.round+':'+(combat.frame-action.frame);if(!receipts.some(receipt=>receipt.id===id)){counters++;receipts.push({id,stageIndex:5,attempt:run.attempt,kind:'field',detail:'Contre physique de l’exercice avec kit conservé.',counterEvidence:{frame:combat.frame,round:combat.round,actionStart:combat.frame-action.frame,actionKey:action.workbookMove!}});}}
  }
  return {...run,counters,shieldBlock:shield,receipts,lastObservedFrame:combat.frame,continuityV108:{...run.continuityV108,observation}};
}
export function applyPitWorkbookCampaignResultV108(run:PitWorkbookCampaignRunV108,result:PitNarrativeResultInput,observedEncounterId:string):{run:PitWorkbookCampaignRunV108;applied:boolean} {
  const observation=run.continuityV108.observation;
  if(!observation||observation.encounterId!==observedEncounterId||observation.phase!=='match-over'||observation.winnerId!==result.winnerId)return {run,applied:false};
  const applied=previous.applyPitWorkbookCampaignResultV107(run,result,observedEncounterId);
  if(!applied.applied)return {run,applied:false};
  const earned=applied.run.phase==='stage-result';
  const carry:PitWorkbookCarryV108=earned?{health:observation.health,traque:observation.traque,device:{...run.continuityV108.carry.device,status:observation.released?'spent':'ready'}}:copy(run.continuityV108.carry);
  if(!validCarry(carry,run.fighterId))return {run,applied:false};
  return {applied:true,run:{...applied.run,continuityV108:{...run.continuityV108,carry,observation:null,
    victories:earned?[...run.continuityV108.victories,{stageIndex:run.stageIndex,resultId:result.resultId,carry:copy(carry)}]:run.continuityV108.victories},
    lastMessage:earned?'Victoire : santé, Traque et le même dispositif sont conservés. Aucune recharge.':'Reprise de cette rencontre avec le kit et les ressources de son entrée.'}};
}
export function createPitWorkbookCampaignFieldV108(run:PitWorkbookCampaignRunV108):PitWorkbookCampaignFieldV108 {
  const field=previous.createPitWorkbookCampaignFieldV107(run);
  // Terrain has no offensive input. Its original actor state remains a V106
  // scene; only the actual saved health/gauge are restored, without conversion.
  field.combat.fighters[0].health=run.continuityV108.carry.health;field.combat.fighters[0].traque=run.continuityV108.carry.traque;
  return {...field,inspectionV108:{nativeTicks:0,facing:field.combat.fighters[0].facing,startedFrame:null}};
}
export function stepPitWorkbookCampaignFieldV108(field:PitWorkbookCampaignFieldV108,input:Parameters<typeof previous.stepPitWorkbookCampaignFieldV107>[1]):PitWorkbookCampaignFieldV108 {
  if(field.complete)return field;
  const actor=field.combat.fighters[0],eligible=actor.health>0&&actor.grounded&&actor.phase==='idle'&&!actor.action&&!input.left&&!input.right;
  const next=previous.stepPitWorkbookCampaignFieldV107(field,field.goal==='inspect-kit'&&!eligible?{...input,interact:false}:input);
  // Solo field actors face their actual travel direction and keep that native
  // facing at rest, rather than tracking the unused combat helper off screen.
  if(field.goal!=='face-off')next.combat.fighters[0].facing=input.left&&!input.right?-1:input.right&&!input.left?1:actor.facing;
  if(field.goal!=='inspect-kit')return {...next,inspectionV108:field.inspectionV108};
  if(next.holdTicks<=20)return {...next,inspectionV108:{nativeTicks:0,facing:next.combat.fighters[0].facing,startedFrame:null}};
  const facing=next.combat.fighters[0].facing;
  if(field.inspectionV108.nativeTicks>0&&facing!==field.inspectionV108.facing)return {...next,holdTicks:0,complete:false,inspectionV108:{nativeTicks:0,facing,startedFrame:null}};
  return {...next,inspectionV108:{nativeTicks:field.inspectionV108.nativeTicks+1,facing,startedFrame:field.inspectionV108.startedFrame??next.combat.frame}};
}
export function applyPitWorkbookCampaignFieldV108(run:PitWorkbookCampaignRunV108,field:PitWorkbookCampaignFieldV108):PitWorkbookCampaignRunV108 {
  if(field.goal==='inspect-kit'&&(field.inspectionV108.nativeTicks!==40||field.inspectionV108.startedFrame===null||field.combat.frame-field.inspectionV108.startedFrame!==39||field.combat.fighters[0].facing!==field.inspectionV108.facing))return run;
  const next=previous.applyPitWorkbookCampaignFieldV107(run,field);if(next===run)return run;
  const actor=field.combat.fighters[0];
  return {...next,continuityV108:{...run.continuityV108,inspected:field.goal==='inspect-kit'?{stageIndex:run.stageIndex,actionId:run.fighterId==='scar'?'M_F003_EQUIP':'M_F006_EQUIP',facing:actor.facing===1?'right':'left',nativeTicks:40}:run.continuityV108.inspected},
    lastMessage:field.goal==='inspect-kit'?'Arme sortie, contrôlée puis rangée pendant le cycle natif. Les ressources et le dispositif restent inchangés.':next.lastMessage};
}
export function checkpointPitWorkbookCampaignV108(run:PitWorkbookCampaignRunV108):PitWorkbookCampaignRunV108 {
  return {...previous.checkpointPitWorkbookCampaignV107(run),continuityV108:{...run.continuityV108,observation:null}};
}
export const pitWorkbookCampaignStorageKeyV108=(owner:string,fighter:PitWorkbookCampaignFighterV108)=>'yautja-pit-workbook-exercise-v108:'+encodeURIComponent(owner)+':'+fighter;
function validCarry(value:unknown,fighterId:string):value is PitWorkbookCarryV108 {
  const c=value as PitWorkbookCarryV108,item=fighterId==='scar'?'shuriken':'mine';
  return !!c&&Number.isSafeInteger(c.health)&&c.health>0&&c.health<=PIT_FIGHTERS[fighterId as PitWorkbookCampaignFighterV108].maxHealth&&
    Number.isSafeInteger(c.traque)&&c.traque>=0&&c.traque<=1000&&!!c.device&&typeof c.device.id==='string'&&c.device.item===item&&['ready','spent'].includes(c.device.status);
}
export function serializePitWorkbookCampaignV108(run:PitWorkbookCampaignRunV108):string {
  const text=previous.serializePitWorkbookCampaignV107(run);if(!deserializePitWorkbookCampaignV108(text,run.owner))throw new Error('Invalid V108 exercise checkpoint.');return text;
}
export function deserializePitWorkbookCampaignV108(text:string,owner:string):PitWorkbookCampaignRunV108|null {
  const base=previous.deserializePitWorkbookCampaignV107(text,owner) as PitWorkbookCampaignRunV108|null;
  if(!base)return null;const c=base.continuityV108,expected=identity(base);
  if(!c||c.version!==1||!validCarry(c.carry,base.fighterId)||c.carry.device.id!==expected.id||!Array.isArray(c.victories)||c.victories.length>4)return null;
  const completedFights=base.completedStages.filter(index=>[1,2,5,6].includes(index));if(c.victories.length!==completedFights.length)return null;
  for(let index=0;index<c.victories.length;index++){const entry=c.victories[index];if(!entry)return null;const win=base.receipts.find(receipt=>receipt.kind==='victory'&&receipt.id===entry.resultId);if(!win||entry.stageIndex!==completedFights[index]||entry.stageIndex!==win.stageIndex||!validCarry(entry.carry,base.fighterId)||entry.carry.device.id!==expected.id||index>0&&c.victories[index-1].carry.device.status==='spent'&&entry.carry.device.status!=='spent')return null;}
  const last=c.victories.at(-1)?.carry??createPitWorkbookCampaignRunV108(base.fighterId,owner,base.runId).continuityV108.carry;
  if(JSON.stringify(last)!==JSON.stringify(c.carry))return null;
  if(c.inspected&&(c.inspected.stageIndex!==3||c.inspected.nativeTicks!==40||c.inspected.actionId!==(base.fighterId==='scar'?'M_F003_EQUIP':'M_F006_EQUIP')||!['left','right'].includes(c.inspected.facing)||!base.completedStages.includes(3)))return null;
  if(base.completedStages.includes(3)&&!c.inspected)return null;
  return {...base,continuityV108:{...c,observation:null}};
}
