import { mobilityDefinition, mobilityRankIndex, MOBILITY_MODULES, emptyMobilityLevels, type MobilityLevels, type MobilityModule } from './catalogue.ts';
import { createMobilityCourse, validMobilityCourse, validMobilityInput, stepMobilityCourse, mobilityCoursePassed, parkedAtDepot, type MobilityCourseState, type MobilityInput } from './course.ts';
import type { SaveGame } from '../../types';
import { evaluateClanShipAccess } from '../clanShipOperations';
export interface OwnedMobility {
  id: string; acquiredBy: 'purchase'|'quest'; condition: number; energy: number; bond: number;
  upgrades: MobilityLevels; distance: number;
}
export interface MobilityRun { id: number; modelId: string; loaned: boolean; course: MobilityCourseState }
export interface MobilityReport { runId: number; modelId: string; result: 'passed'|'returned'|'recovered'; distance: number; impacts: number; ticks: number }
/** An earned, owner-bound receipt. Never inferred from a legacy permit or report. */
export interface MobilityTrainingReward {
  version: 1; runId: number; status: 'available'|'claimed'; course: MobilityCourseState;
}
export interface MobilityLedger {
  version: 1; ownerCreatedAt: string; revision: number; circulationPermit: boolean;
  owned: OwnedMobility[]; active: MobilityRun | null; nextRunId: number; lastReport: MobilityReport | null;
  spentMarks: number; repairCount: number; recoveryDebt: number; recoveryCount: number;
  trainingReward: MobilityTrainingReward | null;
}
export type MobilityOrder =
  | { type:'claim-training'; rewardRunId:number }
  | { type:'settle-recovery'; expectedCost:number }
  | { type:'buy'; modelId:string; expectedCost:number }
  | { type:'upgrade'; modelId:string; module:MobilityModule; expectedCost:number }
  | { type:'repair'|'recharge'|'care'; modelId:string; expectedCost:number }
  | { type:'start'; modelId:string; loaned:boolean }
  | { type:'drive'; runId:number; inputs:MobilityInput[] }
  | { type:'return'; runId:number }
  | { type:'recover'; runId:number };
export type MobilityCommand = MobilityOrder & { ownerCreatedAt:string; expectedRevision:number };
export interface MobilityResult { accepted:boolean; message:string; state:MobilityLedger|null; clanMarks:number }
const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const finite=(v:unknown,lo:number,hi:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
const integer=(v:unknown,lo=0,hi=1_000_000_000):v is number=>Number.isSafeInteger(v)&&finite(v,lo,hi);
const keys=(v:object,allowed:readonly string[])=>Object.keys(v).length===allowed.length&&allowed.every(k=>Object.hasOwn(v,k));
export const createMobilityLedger=(ownerCreatedAt:string):MobilityLedger=>({version:1,ownerCreatedAt,revision:0,circulationPermit:false,owned:[],active:null,nextRunId:1,lastReport:null,spentMarks:0,repairCount:0,recoveryDebt:0,recoveryCount:0,trainingReward:null});
export function inspectMobilityLedger(raw:unknown,owner:string): {status:'absent'|'valid'|'future-version'|'invalid-save';state:MobilityLedger|null} {
  const bad={status:'invalid-save' as const,state:null};
  if(raw===undefined||raw===null)return {status:'absent',state:null};
  if(!record(raw))return bad;
  if(typeof raw.version==='number'&&raw.version>1)return {status:'future-version',state:null};
  // The earlier, unpublished V1 draft had no recovery ledger. Preserve its data.
  if(raw.version===1&&!Object.hasOwn(raw,'recoveryDebt')&&!Object.hasOwn(raw,'recoveryCount'))raw={...raw,recoveryDebt:0,recoveryCount:0};
  if(!record(raw))return bad;
  // Additive V1 migration: old successful reports never create a reward retroactively.
  if(raw.version===1&&!Object.hasOwn(raw,'trainingReward'))raw={...raw,trainingReward:null};
  if(!record(raw))return bad;
  if(record(raw.trainingReward)&&typeof raw.trainingReward.version==='number'&&raw.trainingReward.version>1)return {status:'future-version',state:null};
  if(raw.version!==1||raw.ownerCreatedAt!==owner||!Number.isFinite(Date.parse(owner))||!keys(raw,['version','ownerCreatedAt','revision','circulationPermit','owned','active','nextRunId','lastReport','spentMarks','repairCount','recoveryDebt','recoveryCount','trainingReward'])||
     !integer(raw.revision)||typeof raw.circulationPermit!=='boolean'||!Array.isArray(raw.owned)||raw.owned.length>50||!integer(raw.nextRunId,1)||!integer(raw.spentMarks)||!integer(raw.repairCount)||!integer(raw.recoveryDebt)||!integer(raw.recoveryCount))return bad;
  const reward=raw.trainingReward;
  if(reward!==null&&(!record(reward)||!keys(reward,['version','runId','status','course'])||reward.version!==1||
    !integer(reward.runId,1)||reward.runId>=raw.nextRunId||!['available','claimed'].includes(String(reward.status))||
    !raw.circulationPermit||!validMobilityCourse(reward.course)||!mobilityCoursePassed(reward.course)))return bad;
  const ids=new Set<string>();
  for(const item of raw.owned){
    if(!record(item)||!keys(item,['id','acquiredBy','condition','energy','bond','upgrades','distance'])||typeof item.id!=='string'||ids.has(item.id))return bad;
    const d=mobilityDefinition(item.id);if(!d||['faction','narrative','insertion','non-pilotable','clan-service'].includes(d.acquisitionMode))return bad;
    if(d.acquisitionMode==='training-loan'&&(item.id!=='scout_grav_sled'||!record(reward)||reward.status!=='claimed'||item.acquiredBy!=='quest'))return bad;
    if(item.acquiredBy!=='purchase'&&item.acquiredBy!=='quest'||item.acquiredBy==='purchase'&&d.acquisitionMode!=='purchase')return bad;
    if(!finite(item.condition,0,100)||!finite(item.energy,0,100)||!finite(item.bond,0,100)||!finite(item.distance,0,1e9)||!record(item.upgrades)||
       !keys(item.upgrades,['drive','armor','cargo','cooling'])||!Object.values(item.upgrades).every(n=>integer(n,0,3)))return bad;
    if(d.kind==='mount'&&Object.values(item.upgrades).some(n=>n!==0)||d.kind==='machine'&&item.bond!==0)return bad;
    ids.add(item.id);
  }
  if(record(reward)&&((reward.status==='claimed')!==ids.has('scout_grav_sled')))return bad;
  if(raw.active!==null){
    const a=raw.active;
    if(!record(a)||!keys(a,['id','modelId','loaned','course'])||!integer(a.id,1)||a.id>=raw.nextRunId||typeof a.modelId!=='string'||
       typeof a.loaned!=='boolean'||!validMobilityCourse(a.course)||!mobilityDefinition(a.modelId)?.trialEnabled)return bad;
    if(a.loaned?a.modelId!=='scout_grav_sled':!ids.has(a.modelId))return bad;
    if(!a.loaned){
      const owned=raw.owned.find(v=>v.id===a.modelId);
      if(owned.condition!==a.course.condition||owned.energy!==a.course.energy)return bad;
    }
  }
  if(raw.lastReport!==null){
    const r=raw.lastReport;
    if(!record(r)||!keys(r,['runId','modelId','result','distance','impacts','ticks'])||!integer(r.runId,1)||r.runId>=raw.nextRunId||
      !mobilityDefinition(r.modelId)||!['passed','returned','recovered'].includes(String(r.result))||!finite(r.distance,0,300000)||!integer(r.impacts,0,72000)||!integer(r.ticks,0,72000))return bad;
  }
  return {status:'valid',state:structuredClone(raw) as unknown as MobilityLedger};
}
export function mobilityServiceQuote(state:MobilityLedger,id:string,type:'repair'|'recharge'|'care'|'upgrade',module?:MobilityModule):number|null {
  const d=mobilityDefinition(id),v=state.owned.find(o=>o.id===id);
  if(!d||!v||state.active)return null;
  if(type==='repair')return d.kind==='machine'&&v.condition<100?Math.max(1,Math.ceil((100-v.condition)*(1+d.tier*.25))):null;
  if(type==='recharge')return d.kind==='machine'&&v.energy<100?Math.max(1,Math.ceil((100-v.energy)*.4)):null;
  if(type==='care')return d.kind==='mount'&&(v.condition<100||v.energy<100)?Math.max(1,Math.ceil((100-v.condition)*1.2+(100-v.energy)*.2)):null;
  const m=MOBILITY_MODULES.find(o=>o.id===module);
  return d.kind==='machine'&&m&&v.upgrades[m.id]<3?m.price*(2**v.upgrades[m.id]):null;
}
export function mobilityCampaignEligible(campaign:Pick<SaveGame,'prologue'>):boolean {return evaluateClanShipAccess(campaign).allowed;}
export function actMobility(campaign:Pick<SaveGame,'createdAt'|'profile'|'prologue'> & {mobilityV1?:MobilityLedger|null}, command:MobilityCommand):MobilityResult {
  const refuse=(message:string):MobilityResult=>({accepted:false,message,state:null,clanMarks:campaign.profile.clanMarks});
  if(!record(command)||command.ownerCreatedAt!==campaign.createdAt)return refuse('Le propriétaire de la campagne a changé.');
  const inspected=inspectMobilityLedger(campaign.mobilityV1,campaign.createdAt);
  if(!['absent','valid'].includes(inspected.status))return refuse('Archive de mobilité incompatible ; elle reste protégée.');
  const old=inspected.state??createMobilityLedger(campaign.createdAt);
  if(command.expectedRevision!==old.revision)return refuse('Le registre a changé. Actualise le devis avant de confirmer.');
  if(!mobilityCampaignEligible(campaign))return refuse('Le rite Blooded doit être reconnu avant cette activité autonome.');
  if(!integer(campaign.profile.clanMarks)||old.revision>=1e9-1)return refuse('Registre ou solde hors limites.');
  const state=structuredClone(old);let marks=campaign.profile.clanMarks;
  const pay=(cost:number)=>{if(!integer(cost)||cost>marks||state.spentMarks+cost>1e9)return false;marks-=cost;state.spentMarks+=cost;return true;};
  let message='Registre confirmé.';
  if(command.type==='claim-training'){
    const reward=state.trainingReward;
    if(state.active||state.recoveryDebt>0)return refuse('Reviens au comptoir et règle les récupérations avant la remise.');
    if(!reward||reward.status!=='available'||command.rewardRunId!==reward.runId||!state.circulationPermit||
       mobilityRankIndex(campaign.profile.rankId)<mobilityRankIndex('blooded')||state.owned.some(v=>v.id==='scout_grav_sled'))return refuse('Remise indisponible : parcours réussi, rang Blooded et reçu actuel requis.');
    // Transfer the inspected hull: no repair/refill, currency, rank or ship berth is granted.
    state.owned.push({id:'scout_grav_sled',acquiredBy:'quest',condition:reward.course.condition,energy:reward.course.energy,
      bond:0,upgrades:emptyMobilityLevels(),distance:reward.course.distance});
    reward.status='claimed';message='Le clan te confie ce Grav-Sled. Son usure et sa réserve restent celles du retour ; aucune place à bord n’est créée.';
  }else if(command.type==='settle-recovery'){
    if(state.active||state.recoveryDebt===0||command.expectedCost!==state.recoveryDebt||!pay(state.recoveryDebt))return refuse('Dette absente, devis périmé ou marques insuffisantes.');
    state.recoveryDebt=0;message='Remorquage réglé ; le registre de sortie est de nouveau disponible.';
  }else if(command.type==='start'){
    if(typeof command.loaned!=='boolean')return refuse('Type de prêt invalide.');
    if(!command.loaned&&state.recoveryDebt>0)return refuse('Règle le remorquage avant de sortir un engin personnel.');
    if(state.active||!mobilityDefinition(command.modelId)?.trialEnabled)return refuse('Aire occupée ou modèle non admis sur cette piste.');
    const owned=state.owned.find(v=>v.id===command.modelId);
    if(command.loaned?command.modelId!=='scout_grav_sled':!owned)return refuse('Modèle non possédé ou prêt de formation incompatible.');
    if(!command.loaned&&(!state.circulationPermit||mobilityRankIndex(campaign.profile.rankId)<mobilityRankIndex(mobilityDefinition(command.modelId)!.minimumRank)))return refuse('Permis et rang du modèle requis pour une sortie personnelle.');
    if(owned&&!command.loaned&&(owned.condition<25||owned.energy<10))return refuse('Répare et recharge cet engin avant de repartir.');
    if(state.nextRunId>=1e9)return refuse('Limite du registre atteinte.');
    state.active={id:state.nextRunId++,modelId:command.modelId,loaned:command.loaned,
      course:createMobilityCourse(command.loaned?100:owned!.energy,command.loaned?100:owned!.condition)};
    message=command.loaned?'Prêt de formation ouvert, sans propriété ni récompense de rang.':'Engin sorti sur l’aire des convois.';
  }else if(command.type==='drive'){
    if(!state.active||state.active.id!==command.runId||!Array.isArray(command.inputs)||command.inputs.length<1||command.inputs.length>60||!command.inputs.every(validMobilityInput))return refuse('Séquence de conduite invalide ou périmée.');
    const owned=state.owned.find(v=>v.id===state.active!.modelId);
    const previousDistance=state.active.course.distance;
    for(const input of command.inputs)state.active.course=stepMobilityCourse(state.active.course,input,state.active.modelId,state.active.loaned?emptyMobilityLevels():owned?.upgrades??emptyMobilityLevels());
    if(!state.active.loaned&&owned){owned.condition=state.active.course.condition;owned.energy=state.active.course.energy;owned.distance+=state.active.course.distance-previousDistance;}
    message='Conduite sauvegardée.';
  }else if(command.type==='return'||command.type==='recover'){
    const active=state.active;
    if(!active||active.id!==command.runId)return refuse('Cette sortie est déjà terminée ou appartient à une autre session.');
    if(command.type==='return'&&!parkedAtDepot(active.course))return refuse('Reviens au sas du garage et immobilise le véhicule.');
    // Recovery never grants the permit, even when a forged/misplaced stop reaches the button.
    const passed=command.type==='return'&&mobilityCoursePassed(active.course);
    if(passed&&active.loaned){
      state.circulationPermit=true;
      // The juvenile supervised initiation never transfers ownership. Adults confirm separately.
      if(!state.trainingReward&&mobilityRankIndex(campaign.profile.rankId)>=mobilityRankIndex('blooded'))
        state.trainingReward={version:1,runId:active.id,status:'available',course:structuredClone(active.course)};
    }
    state.lastReport={runId:active.id,modelId:active.modelId,result:command.type==='recover'?'recovered':passed?'passed':'returned',distance:active.course.distance,impacts:active.course.impacts,ticks:active.course.tick};
    if(command.type==='recover'&&!active.loaned){
      const fee=Math.min(120,20+Math.ceil(active.course.distance/50)+2*active.course.impacts);
      if(state.recoveryDebt+fee>1e9||state.recoveryCount>=1e9)return refuse('Limite du registre de récupération atteinte.');
      state.recoveryDebt+=fee;state.recoveryCount++;
    }
    state.active=null;
    message=passed&&active.loaned?'Permis de circulation confirmé. La remise éventuelle du Grav-Sled se confirme séparément aux Forges ; aucun rang ni honneur accordé.':command.type==='recover'?'Retour de sécurité du clan. Usure et énergie consommée conservées.':'Engin remisé ; état conservé.';
  }else{
    if(state.active)return refuse('Remise au garage requise avant toute transaction.');
    if(state.recoveryDebt>0)return refuse('Règle le remorquage avant toute nouvelle transaction d’atelier.');
    const d=mobilityDefinition(command.modelId);if(!d)return refuse('Modèle inconnu.');
    if(command.type==='buy'){
      if(!d.shopEnabled||d.acquisitionMode!=='purchase'||d.purchasePrice===null)return refuse('Ce modèle relève d’une quête, d’un service ou d’une faction ; il n’est pas vendu ici.');
      if(!state.circulationPermit||mobilityRankIndex(campaign.profile.rankId)<mobilityRankIndex(d.minimumRank))return refuse('Permis et rang Blooded requis pour cette commande.');
      if(state.owned.some(v=>v.id===d.id))return refuse('Ce modèle est déjà inscrit au registre.');
      if(command.expectedCost!==d.purchasePrice||!pay(d.purchasePrice))return refuse('Devis périmé ou marques insuffisantes.');
      state.owned.push({id:d.id,acquiredBy:'purchase',condition:100,energy:100,bond:0,upgrades:emptyMobilityLevels(),distance:0});
      message='Moto inscrite au garage des Forges. Aucun embarquement orbital automatique.';
    }else{
      const vehicle=state.owned.find(v=>v.id===d.id);if(!vehicle)return refuse('Véhicule non possédé.');
      const module=command.type==='upgrade'?command.module:undefined;
      const cost=mobilityServiceQuote(state,d.id,command.type,module);
      if(cost===null||cost!==command.expectedCost||!pay(cost))return refuse('Intervention non applicable, devis périmé ou marques insuffisantes.');
      if(command.type==='upgrade'){vehicle.upgrades[command.module]++;message='Module installé. Masse, consommation et performances recalculées.';}
      if(command.type==='repair'){vehicle.condition=100;state.repairCount++;message='Réparation confirmée ; la recharge reste une opération distincte.';}
      if(command.type==='recharge'){vehicle.energy=100;message='Noyau rechargé ; les dommages sont inchangés.';}
      if(command.type==='care'){vehicle.condition=100;vehicle.energy=100;message='Soins et repos confirmés ; aucun lien BOND gratuit.';}
    }
  }
  state.revision++;
  if(inspectMobilityLedger(state,campaign.createdAt).status!=='valid')return refuse('Résultat incompatible ; aucune transaction appliquée.');
  return {accepted:true,message,state,clanMarks:marks};
}
