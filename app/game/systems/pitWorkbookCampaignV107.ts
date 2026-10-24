import scope from '../data/pitWorkbookScopeV105.json';
import admissions from '../data/pitWorkbookAnimationsV100.json';
import {PIT_ARENAS,createPitCombatState,stepPitCombat,getPitFighterBoxes,type PitCombatState,type PitInput,type PitArenaId} from './pitCombat';
import {isPitVersusFighterId,type PitVersusFighterId} from './pitRosterExpansion';
import {getPitWorkbookRuntimeBindingV106} from '../pitWorkbookRegistryV106';
import type {PitNarrativeResultInput} from './pitNarrativeTrialsV57';
export type PitWorkbookCampaignFighterV107='feral-hunter'|'scar';
export type PitWorkbookFieldGoalV107='recover-beacon'|'inspect-kit'|'face-off'|'deposit-beacon';
export const PIT_WORKBOOK_CAMPAIGN_SOURCE_SHA_V107=scope.source.workbookSha256;
const partnerIds:Record<PitWorkbookCampaignFighterV107,readonly PitVersusFighterId[]>={
 'feral-hunter':['scar','scar','tracker','tracker','greyback','scar','greyback','scar'],
 scar:['feral-hunter','feral-hunter','wolf','wolf','celtic','feral-hunter','celtic','feral-hunter'],
};
const fieldGoals:Partial<Record<number,PitWorkbookFieldGoalV107>>={1:'recover-beacon',4:'inspect-kit',5:'face-off',8:'deposit-beacon'};
export const PIT_WORKBOOK_CAMPAIGN_ROUTES_V107=scope.fighters.map(fighter=>({
 fighterId:fighter.fighterId as PitWorkbookCampaignFighterV107,
 id:'pit-workbook-exercise-v107-'+fighter.fighterId,
 title:fighter.fighterId==='scar'?'Les passages de la pyramide':'La piste retournée',
 continuity:'Exercice alternatif du Cercle, avec partenaires substituts déclarés. Les scènes source restent ouvertes.',
 stages:fighter.campaignStages.map(stage=>({...stage,exerciseKind:fieldGoals[stage.ordinal]?'field' as const:'fight' as const,fieldGoal:fieldGoals[stage.ordinal]??null,
  substituteId:partnerIds[fighter.fighterId as PitWorkbookCampaignFighterV107][stage.ordinal-1],
  sourceStagePlayable:Object.hasOwn(PIT_ARENAS,stage.stageId),sourceOpponentPlayable:stage.opponentId==='Aucun'||isPitVersusFighterId(stage.opponentId),
  sourceBodyAdmitted:admissions.some(admission=>admission.actionId===stage.sourceActionId),
  actionBinding:stage.sourceActionId?getPitWorkbookRuntimeBindingV106(fighter.fighterId,stage.sourceActionId):null,
  sourceComplete:false as const,
 }))
}));
export const getPitWorkbookCampaignRouteV107=(fighterId:string)=>PIT_WORKBOOK_CAMPAIGN_ROUTES_V107.find(route=>route.fighterId===fighterId);
export type PitWorkbookCampaignRouteV107=typeof PIT_WORKBOOK_CAMPAIGN_ROUTES_V107[number];
export interface PitWorkbookCampaignRunV107 {
 version:1;sourceSha:string;runId:string;owner:string;fighterId:PitWorkbookCampaignFighterV107;
 stageIndex:number;phase:'briefing'|'field'|'fight'|'stage-result'|'retry'|'complete';attempt:number;
 objects:{beacon:{id:string;state:'placed'|'carried'|'secured';provenance:'public-exercise-kit-v107'};mask:{id:string;equipped:true;functional:true}};
 receipts:Array<{id:string;stageIndex:number;attempt:number;kind:'field'|'victory'|'defeat'|'draw';detail:string;match?:PitNarrativeResultInput;fieldEvidence?:{frame:number;holdTicks:number;goal:PitWorkbookFieldGoalV107;targetX:number;playerX:number;guarded:boolean;objectState:string};counterEvidence?:{frame:number;round:number;actionStart:number;actionKey:string}}>;
 counters:number;lastObservedFrame:number;shieldBlock:{round:number;actionStart:number}|null;
 completedStages:number[];lastMessage:string;
}
const MAX_CAMPAIGN_RECEIPTS_V107=96,MAX_CAMPAIGN_CHECKPOINT_BYTES_V107=65536;
const checkpointBytesV107=(text:string)=>new TextEncoder().encode(text).length;
/** Keep earned progression and its counter proofs, then the newest attempts.
 * Failed attempts are a bounded history, not an ever-growing save prerequisite. */
function boundPitWorkbookCampaignReceiptsV107(run:PitWorkbookCampaignRunV107):PitWorkbookCampaignRunV107 {
 const size=(value:PitWorkbookCampaignRunV107)=>checkpointBytesV107(JSON.stringify(value));
 if(run.receipts.length<=MAX_CAMPAIGN_RECEIPTS_V107&&size(run)<=MAX_CAMPAIGN_CHECKPOINT_BYTES_V107)return run;
 const protectedIds=new Set<string>(),route=getPitWorkbookCampaignRouteV107(run.fighterId)!;
 const keep=(receipt:PitWorkbookCampaignRunV107['receipts'][number]|undefined)=>{if(receipt)protectedIds.add(receipt.id);};
 const counters=(stageIndex:number,attempt:number)=>run.receipts.filter(receipt=>receipt.stageIndex===stageIndex&&receipt.attempt===attempt&&receipt.counterEvidence);
 for(const index of run.completedStages){
  const completed=route.stages[index].exerciseKind==='field'
   ?run.receipts.find(receipt=>receipt.stageIndex===index&&receipt.id===run.runId+':field:'+index&&receipt.fieldEvidence)
   :run.receipts.find(receipt=>receipt.stageIndex===index&&receipt.kind==='victory'&&receipt.match&&(index!==5||counters(index,receipt.attempt).length>=3));
  keep(completed);if(index===5&&completed)counters(index,completed.attempt).slice(0,3).forEach(keep);
 }
 counters(run.stageIndex,run.attempt).slice(0,3).forEach(keep);
 keep(run.receipts.at(-1));
 const receipts=run.receipts.slice();
 while(receipts.length>MAX_CAMPAIGN_RECEIPTS_V107||size({...run,receipts})>MAX_CAMPAIGN_CHECKPOINT_BYTES_V107){
  const oldestDiscardable=receipts.findIndex(receipt=>!protectedIds.has(receipt.id));
  if(oldestDiscardable<0)break;receipts.splice(oldestDiscardable,1);
 }
 return {...run,receipts};
}
export function createPitWorkbookCampaignRunV107(fighterId:PitWorkbookCampaignFighterV107,owner:string,runId:string):PitWorkbookCampaignRunV107 {
 if(!getPitWorkbookCampaignRouteV107(fighterId)||!owner||!runId||owner.length>200||runId.length>200)throw new Error('Invalid V107 exercise owner.');
 return {version:1,sourceSha:PIT_WORKBOOK_CAMPAIGN_SOURCE_SHA_V107,runId,owner,fighterId,stageIndex:0,phase:'briefing',attempt:0,objects:{beacon:{id:runId+':exercise-beacon',state:'placed',provenance:'public-exercise-kit-v107'},mask:{id:runId+':source-kit-mask',equipped:true,functional:true}},receipts:[],counters:0,lastObservedFrame:0,shieldBlock:null,completedStages:[],lastMessage:'La balise appartient au kit de cet exercice. Aucun objet de campagne ni récompense n’est créé.'};
}
export function getPitWorkbookCampaignEncounterV107(run:PitWorkbookCampaignRunV107){
 const stage=getPitWorkbookCampaignRouteV107(run.fighterId)?.stages[run.stageIndex];if(!stage||stage.exerciseKind!=='fight'||!stage.sourceStagePlayable)return null;
 return {id:run.runId+':'+stage.id+':attempt-'+run.attempt,title:'Exercice · '+stage.sourceText.split('\n')[0],leftId:run.fighterId,rightId:stage.substituteId,arenaId:stage.stageId as PitArenaId,normalMoves:'workbook-v106' as const};
}
export function beginPitWorkbookCampaignStageV107(run:PitWorkbookCampaignRunV107):PitWorkbookCampaignRunV107 {
 if(run.phase!=='briefing'&&run.phase!=='retry')return run;const stage=getPitWorkbookCampaignRouteV107(run.fighterId)?.stages[run.stageIndex];if(!stage||!stage.sourceStagePlayable)return run;
 return {...run,phase:stage.exerciseKind==='field'?'field':'fight',attempt:run.attempt+1,counters:0,lastObservedFrame:0,shieldBlock:null,lastMessage:''};
}
export function advancePitWorkbookCampaignV107(run:PitWorkbookCampaignRunV107):PitWorkbookCampaignRunV107 {
 if(run.phase!=='stage-result')return run;if(run.stageIndex===7)return {...run,phase:'complete',lastMessage:'Exercice terminé. Les huit scènes source conservent leurs besoins de PNJ et d’animation dédiés.'};
 return {...run,stageIndex:run.stageIndex+1,phase:'briefing',counters:0,lastObservedFrame:0,shieldBlock:null};
}
export function observePitWorkbookCampaignCombatV107(run:PitWorkbookCampaignRunV107,combat:Readonly<PitCombatState>):PitWorkbookCampaignRunV107 {
 const encounter=getPitWorkbookCampaignEncounterV107(run);if(run.phase!=='fight'||run.stageIndex!==5||!encounter||combat.version!==14||combat.rules.normalMoves!=='workbook-v106'||combat.fighters[0].definitionId!==encounter.leftId||combat.fighters[1].definitionId!==encounter.rightId||combat.arenaId!==encounter.arenaId||combat.frame<=run.lastObservedFrame)return run;
 const hero=combat.fighters[0],action=hero.action;let shield=run.shieldBlock,count=run.counters;const receipts=run.receipts.slice();
 if(action?.workbookMove==='S2'&&run.fighterId==='feral-hunter'&&combat.events.some(event=>event.type==='block'&&event.defenderId===hero.definitionId&&event.damage===0))shield={round:combat.round,actionStart:combat.frame-action.frame};
 const strike=combat.events.some(event=>event.type==='hit'&&event.attackerId===hero.definitionId&&event.attack==='technique');
 const scar=run.fighterId==='scar'&&action?.workbookMove==='S4'&&hero.phase==='active'&&action.connected&&strike;
 const feral=run.fighterId==='feral-hunter'&&action?.workbookMove==='S2'&&action.connected&&action.frame>=18&&shield?.round===combat.round&&shield.actionStart===combat.frame-action.frame&&strike&&getPitFighterBoxes(hero).hitbox!==null;
 if((scar||feral)&&action&&count<3){const receipt=encounter.id+':counter:'+combat.round+':'+(combat.frame-action.frame);if(!receipts.some(item=>item.id===receipt)){count=Math.min(3,count+1);receipts.push({id:receipt,stageIndex:5,attempt:run.attempt,kind:'field',detail:'Contre réellement observé sur le partenaire d’exercice.',counterEvidence:{frame:combat.frame,round:combat.round,actionStart:combat.frame-action.frame,actionKey:action.workbookMove!}});}}
 const next={...run,counters:count,lastObservedFrame:combat.frame,shieldBlock:shield,receipts};return receipts.length===run.receipts.length?next:boundPitWorkbookCampaignReceiptsV107(next);
}
export function applyPitWorkbookCampaignResultV107(run:PitWorkbookCampaignRunV107,result:PitNarrativeResultInput,observedEncounterId:string):{run:PitWorkbookCampaignRunV107;applied:boolean} {
 const encounter=getPitWorkbookCampaignEncounterV107(run);if(run.phase!=='fight'||!encounter||observedEncounterId!==encounter.id||result.mode!=='cpu'||result.leftId!==encounter.leftId||result.rightId!==encounter.rightId||result.arenaId!==encounter.arenaId||typeof result.resultId!=='string'||!result.resultId||result.resultId.length>600||run.receipts.some(receipt=>receipt.id===result.resultId))return {run,applied:false};
 const kind=result.winnerId===encounter.leftId?'victory':result.winnerId===encounter.rightId?'defeat':result.winnerId===null?'draw':null;if(!kind)return{run,applied:false};
 const successful=kind==='victory'&&(run.stageIndex!==5||run.counters>=3);
 return {run:boundPitWorkbookCampaignReceiptsV107({...run,phase:successful?'stage-result':'retry',completedStages:successful?[...new Set([...run.completedStages,run.stageIndex])]:run.completedStages,receipts:[...run.receipts,{id:result.resultId,stageIndex:run.stageIndex,attempt:run.attempt,kind,match:{...result},detail:successful?'Duel d’exercice réellement gagné.':kind==='victory'?'Victoire obtenue, mais les trois contres ne sont pas accomplis.':'Reprise de cette rencontre, sans effacer les étapes précédentes.'}],lastMessage:successful?'Le partenaire d’exercice cède la voie. Le PNJ source n’est pas remplacé dans la bible.':kind==='victory'?'Réussir trois contres puis gagner le duel.':'Cette rencontre peut être reprise.'}),applied:true};
}
export interface PitWorkbookCampaignFieldV107 {version:1;runId:string;stageIndex:number;goal:PitWorkbookFieldGoalV107;combat:PitCombatState;targetX:number;holdTicks:number;complete:boolean;objectState:'placed'|'carried'|'secured';receiptId:string}
export function createPitWorkbookCampaignFieldV107(run:PitWorkbookCampaignRunV107):PitWorkbookCampaignFieldV107 {
 const stage=getPitWorkbookCampaignRouteV107(run.fighterId)?.stages[run.stageIndex];if(run.phase!=='field'||!stage?.fieldGoal||!stage.sourceStagePlayable)throw new Error('No active V107 field exercise.');
 const combat=createPitCombatState(run.fighterId,stage.substituteId,{mode:'training',normalMoves:'workbook-v106',arenaId:stage.stageId as PitArenaId});combat.fighters[0].x=240;combat.fighters[1].x=650;
 return {version:1,runId:run.runId,stageIndex:run.stageIndex,goal:stage.fieldGoal,combat,targetX:stage.fieldGoal==='face-off'?650:600,holdTicks:0,complete:false,objectState:run.objects.beacon.state,receiptId:run.runId+':field:'+run.stageIndex};
}
export function stepPitWorkbookCampaignFieldV107(current:PitWorkbookCampaignFieldV107,input:{left?:boolean;right?:boolean;interact?:boolean;guard?:boolean}):PitWorkbookCampaignFieldV107 {
 if(current.complete)return current;const player:PitInput={left:input.left,right:input.right,guardHigh:input.guard};
 const combat=stepPitCombat(current.combat,[player,current.goal==='face-off'?{guardHigh:true}:{}]);const actor=combat.fighters[0],arena=PIT_ARENAS[combat.arenaId];actor.x=Math.max(arena.leftWall+30,Math.min(arena.rightWall-30,actor.x));const distance=Math.abs(actor.x-current.targetX);
 const performing=current.goal==='face-off'?distance>=70&&distance<=140&&actor.guard==='high':distance<=65&&actor.grounded&&Boolean(input.interact);
 const hold=performing?Math.min(90,current.holdTicks+1):0,required=current.goal==='face-off'?90:60;
 const complete=hold>=required;let objectState=current.objectState;if(complete&&current.goal==='recover-beacon')objectState='carried';if(complete&&current.goal==='deposit-beacon'&&objectState==='carried')objectState='secured';
 return {...current,combat,holdTicks:hold,complete:complete&&(current.goal!=='deposit-beacon'||objectState==='secured'),objectState};
}
export function applyPitWorkbookCampaignFieldV107(run:PitWorkbookCampaignRunV107,field:PitWorkbookCampaignFieldV107):PitWorkbookCampaignRunV107 {
 const expected=getPitWorkbookCampaignRouteV107(run.fighterId)?.stages[run.stageIndex];if(run.phase!=='field'||!field.complete||field.runId!==run.runId||field.stageIndex!==run.stageIndex||expected?.fieldGoal!==field.goal||field.receiptId!==run.runId+':field:'+run.stageIndex||run.receipts.some(receipt=>receipt.id===field.receiptId)||field.holdTicks<(field.goal==='face-off'?90:60))return run;
 const actor=field.combat.fighters[0],distance=Math.abs(actor.x-field.targetX);if(field.combat.arenaId!==expected.stageId||actor.definitionId!==run.fighterId||field.combat.fighters[1].definitionId!==expected.substituteId||field.combat.frame<field.holdTicks||(field.goal==='face-off'?(distance<70||distance>140||actor.guard!=='high'):distance>65)||field.goal==='recover-beacon'&&field.objectState!=='carried'||field.goal==='deposit-beacon'&&(run.objects.beacon.state!=='carried'||field.objectState!=='secured'))return run;
 return boundPitWorkbookCampaignReceiptsV107({...run,phase:'stage-result',objects:{...run.objects,beacon:{...run.objects.beacon,state:field.objectState}},completedStages:[...new Set([...run.completedStages,run.stageIndex])],receipts:[...run.receipts,{id:field.receiptId,stageIndex:run.stageIndex,attempt:run.attempt,kind:'field',detail:'Interaction physique de proximité accomplie dans le lieu d’exercice.',fieldEvidence:{frame:field.combat.frame,holdTicks:field.holdTicks,goal:field.goal,targetX:field.targetX,playerX:actor.x,guarded:actor.guard==='high',objectState:field.objectState}}],lastMessage:field.goal==='deposit-beacon'?'La même balise est déposée. Aucun trophée ni pouvoir n’est attribué.':'Objectif de terrain d’exercice accompli.'});
}
export function checkpointPitWorkbookCampaignV107(run:PitWorkbookCampaignRunV107):PitWorkbookCampaignRunV107 {return run.phase==='fight'||run.phase==='field'?{...run,phase:'briefing',counters:0,lastObservedFrame:0,shieldBlock:null,lastMessage:'Reprise au début de cette étape ; les objets et étapes précédentes sont conservés.'}:run;}
export const pitWorkbookCampaignStorageKeyV107=(owner:string,fighter:PitWorkbookCampaignFighterV107)=>'yautja-pit-workbook-exercise-v107:'+encodeURIComponent(owner)+':'+fighter;
export function serializePitWorkbookCampaignV107(run:PitWorkbookCampaignRunV107):string{const text=JSON.stringify(boundPitWorkbookCampaignReceiptsV107(run));if(checkpointBytesV107(text)>MAX_CAMPAIGN_CHECKPOINT_BYTES_V107)throw new Error('The protected exercise evidence exceeds the checkpoint budget.');return text;}
export function deserializePitWorkbookCampaignV107(text:string,owner:string):PitWorkbookCampaignRunV107|null {
 if(text.length>MAX_CAMPAIGN_CHECKPOINT_BYTES_V107||checkpointBytesV107(text)>MAX_CAMPAIGN_CHECKPOINT_BYTES_V107)return null;try{const r=JSON.parse(text) as PitWorkbookCampaignRunV107;const route=getPitWorkbookCampaignRouteV107(r.fighterId);if(r.version!==1||r.sourceSha!==PIT_WORKBOOK_CAMPAIGN_SOURCE_SHA_V107||r.owner!==owner||!route||typeof r.runId!=='string'||!r.runId||r.runId.length>200||!Number.isInteger(r.stageIndex)||r.stageIndex<0||r.stageIndex>7||!['briefing','field','fight','stage-result','retry','complete'].includes(r.phase)||!Number.isInteger(r.attempt)||r.attempt<0||!Number.isInteger(r.counters)||r.counters<0||r.counters>3||!Array.isArray(r.receipts)||r.receipts.length>96||new Set(r.receipts.map(item=>item.id)).size!==r.receipts.length||!r.objects||r.objects.beacon.id!==r.runId+':exercise-beacon'||r.objects.beacon.provenance!=='public-exercise-kit-v107'||!['placed','carried','secured'].includes(r.objects.beacon.state)||r.objects.mask.id!==r.runId+':source-kit-mask'||r.objects.mask.equipped!==true||r.objects.mask.functional!==true||!Array.isArray(r.completedStages)||r.completedStages.some((stage,index)=>stage!==index||stage>r.stageIndex)||r.completedStages.length>8||r.phase==='complete'&&(r.completedStages.length!==8||r.objects.beacon.state!=='secured'))return null;
 for(const receipt of r.receipts)if(!receipt||typeof receipt.id!=='string'||!receipt.id||receipt.id.length>600||!Number.isInteger(receipt.stageIndex)||receipt.stageIndex<0||receipt.stageIndex>r.stageIndex||!Number.isInteger(receipt.attempt)||receipt.attempt<1||receipt.attempt>r.attempt||!['field','victory','defeat','draw'].includes(receipt.kind)||typeof receipt.detail!=='string')return null;
 const completedCount=r.phase==='stage-result'||r.phase==='complete'?r.stageIndex+1:r.stageIndex;if(r.completedStages.length!==completedCount)return null;
 for(const index of r.completedStages){const stage=route.stages[index];if(stage.exerciseKind==='field'?!r.receipts.some(receipt=>receipt.stageIndex===index&&receipt.kind==='field'&&receipt.id===r.runId+':field:'+index&&receipt.fieldEvidence):!r.receipts.some(receipt=>receipt.stageIndex===index&&receipt.kind==='victory'&&receipt.match))return null;}
 if(r.completedStages.includes(5)&&!r.receipts.some(victory=>victory.stageIndex===5&&victory.kind==='victory'&&r.receipts.filter(receipt=>receipt.stageIndex===5&&receipt.attempt===victory.attempt&&receipt.counterEvidence).length>=3))return null;
 if(r.objects.beacon.state!==(r.completedStages.includes(7)?'secured':r.completedStages.includes(0)?'carried':'placed'))return null;
 if(r.phase==='field'&&route.stages[r.stageIndex].exerciseKind!=='field'||r.phase==='fight'&&route.stages[r.stageIndex].exerciseKind!=='fight')return null;
 for(const receipt of r.receipts){const stage=route.stages[receipt.stageIndex];if(receipt.kind!=='field'){const match=receipt.match,expected=receipt.kind==='victory'?r.fighterId:receipt.kind==='defeat'?stage.substituteId:null;if(!match||match.mode!=='cpu'||match.resultId!==receipt.id||match.leftId!==r.fighterId||match.rightId!==stage.substituteId||match.arenaId!==stage.stageId||match.winnerId!==expected)return null;}else if(receipt.fieldEvidence){const e=receipt.fieldEvidence,d=Math.abs(e.playerX-e.targetX);if(stage.fieldGoal!==e.goal||!Number.isInteger(e.holdTicks)||e.holdTicks<(e.goal==='face-off'?90:60)||!Number.isInteger(e.frame)||e.frame<e.holdTicks||!Number.isFinite(d)||(e.goal==='face-off'?(d<70||d>140||!e.guarded):d>65))return null;}else if(receipt.counterEvidence){const e=receipt.counterEvidence;if(receipt.stageIndex!==5||!Number.isInteger(e.frame)||!Number.isInteger(e.round)||e.round<1||!Number.isInteger(e.actionStart)||e.actionStart>e.frame||e.actionKey!==(r.fighterId==='scar'?'S4':'S2'))return null;}else return null;}
 return checkpointPitWorkbookCampaignV107(r);}catch{return null;}
}
export function getPitWorkbookCampaignSourceAuditV107(){return PIT_WORKBOOK_CAMPAIGN_ROUTES_V107.flatMap(route=>route.stages.map(stage=>({fighterId:route.fighterId,id:stage.id,source:stage.sheet+'!'+stage.cell,sourceText:stage.sourceText,stageId:stage.stageId,stagePlayable:stage.sourceStagePlayable,opponentId:stage.opponentId,opponentPlayable:stage.sourceOpponentPlayable,bodyId:stage.bodyId,bodyAdmitted:stage.sourceBodyAdmitted,actionBinding:stage.actionBinding,exerciseSubstitute:stage.substituteId,sourceComplete:false as const})));}
