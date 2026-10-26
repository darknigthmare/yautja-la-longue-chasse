import {HOMEWORLD_ARCHIVE_CONTINUATION_V111 as definition,archiveContinuationOpeningLinesV111} from './homeworldArchiveContinuationDefinitionV111';
import {applyArchivePlaqueV109,archivePlaquePostReachedV109,archivePlaqueNearbyV109,sampleArchivePlaqueWalkV109,
  type ArchivePlaqueContextV109,type ArchivePlaqueActionV109} from './homeworldArchivePlaqueV109';
import {archiveContinuationBaseV111,defaultHomeworldArchiveContinuationV111,normalizeHomeworldArchiveContinuationV111,
  type HomeworldArchiveContinuationV111} from './homeworldArchiveContinuationLedgerV111';
import type {ArchivePlaquePointV109,HomeworldArchivePlaqueV109} from './homeworldArchivePlaqueLedgerV109';

export interface ArchiveContinuationContextV111 extends ArchivePlaqueContextV109 {basePlaque:unknown}
export type ArchiveContinuationActionV111=Exclude<ArchivePlaqueActionV109,'choose-b'>;
export interface ArchiveContinuationResultV111 {ok:boolean;changed:boolean;ledger:HomeworldArchiveContinuationV111;message:string;writeRefused?:boolean}
const prelude=['open','choose-a','reply','authorize','start'] as const;
const failureText='Le reçu différé et ses pièces ne correspondent plus à cette partie. Relis le constat conservé.';

export function archiveContinuationNearbyV111(ledger:HomeworldArchiveContinuationV111,context:ArchiveContinuationContextV111){
  const current=normalizeHomeworldArchiveContinuationV111(ledger,context.basePlaque);
  return current?.receipt?.phase==='active'&&current.receipt.study
    ?archivePlaqueNearbyV109(current.receipt.study,context):null;
}

/** Prelude lines are explicit new interactions. Only after the player's new
 * choice, response and consent do we reuse the physical A state machine. Its
 * initial two deposits/provenances are inherited facts, never replayed gains. */
export function applyArchiveContinuationV111(raw:unknown,action:ArchiveContinuationActionV111,revision:number,context:ArchiveContinuationContextV111):ArchiveContinuationResultV111 {
  const previous=raw===undefined?defaultHomeworldArchiveContinuationV111(context.ownerCreatedAt):normalizeHomeworldArchiveContinuationV111(raw,context.basePlaque);
  const fail=(message:string):ArchiveContinuationResultV111=>({ok:false,changed:false,ledger:previous??defaultHomeworldArchiveContinuationV111(context.ownerCreatedAt),message});
  const base=archiveContinuationBaseV111(context.basePlaque);
  if(!previous||!base||base.ownerCreatedAt!==context.ownerCreatedAt||previous.ownerCreatedAt!==context.ownerCreatedAt
    ||context.currentOwnerCreatedAt!==context.ownerCreatedAt)return fail(failureText);
  if(previous.revision!==revision||revision>=999990)return fail('Cette reprise a changé. Relis le dernier point confirmé.');
  if(context.otherOperationActive)return fail('Termine l’autre opération avant de reprendre les pièces K-17.');
  const ledger=structuredClone(previous);
  if(action==='open'){
    if(ledger.receipt||!archivePlaquePostReachedV109(context)||context.hostConsenting===false)return fail('Rejoins l’archiviste disponible pour reprendre volontairement l’étude différée.');
    ledger.receipt={operationId:definition.operationId,baseLedgerJson:JSON.stringify(base),phase:'offer',ownerConsent:false,lineIds:archiveContinuationOpeningLinesV111('offer'),study:null};
  }else if(ledger.receipt?.phase!=='active'){
    const receipt=ledger.receipt;
    if(!receipt||!archivePlaquePostReachedV109(context)||context.hostConsenting===false)return fail('Rejoins l’archiviste présent pour cette nouvelle approche.');
    if(action==='choose-a'&&receipt.phase==='offer'){receipt.phase='choice';receipt.lineIds=archiveContinuationOpeningLinesV111('choice');}
    else if(action==='reply'&&receipt.phase==='choice'){receipt.phase='ready';receipt.lineIds=archiveContinuationOpeningLinesV111('ready');}
    else if(action==='authorize'&&receipt.phase==='ready'&&!receipt.ownerConsent)receipt.ownerConsent=true;
    else if(action==='start'&&receipt.phase==='ready'&&receipt.ownerConsent){
      const study=structuredClone(base),r=study.receipt!;
      study.revision=1;r.phase='working';r.option='A';r.last={x:context.actor.x,y:context.actor.y};
      r.resumePhase=null;r.interruptedCount=0;r.lineIds=[...receipt.lineIds];
      receipt.phase='active';receipt.study=study;
    }else return fail('Écoute la nouvelle approche et reçois l’accord avant de poursuivre.');
  }else{
    const receipt=ledger.receipt;
    if((prelude as readonly string[]).includes(action)||!receipt.study)return fail('La continuation a déjà commencé. Conserve ses pièces et son dernier point.');
    const out=applyArchivePlaqueV109(receipt.study,action,receipt.study.revision,context);
    if(!out.ok)return fail(out.message);
    if(!out.changed)return{ok:true,changed:false,ledger:previous,message:out.message};
    receipt.study=out.ledger;receipt.lineIds=[...out.ledger.receipt!.lineIds];
  }
  ledger.revision++;
  if(!normalizeHomeworldArchiveContinuationV111(ledger,context.basePlaque))return fail('Cette continuation ne peut pas être enregistrée dans cet état.');
  return{ok:true,changed:true,ledger,message:action==='start'?'L’étude reprend à partir des deux surfaces conservées. Le reçu différé reste intact.':action==='report'?'La nouvelle étude conserve le bord manquant et le fragment séparé ; le premier constat reste inchangé.':'La continuation et ses pièces sont enregistrées sans réécrire le reçu différé.'};
}

export function sampleArchiveContinuationWalkV111(ledger:HomeworldArchiveContinuationV111,before:ArchivePlaquePointV109,after:ArchivePlaquePointV109,seconds:number,context:ArchiveContinuationContextV111){
  const current=normalizeHomeworldArchiveContinuationV111(ledger,context.basePlaque);
  if(!current)return{ledger,invalid:true};
  if(current.receipt?.phase!=='active'||!current.receipt.study)return{ledger,invalid:false};
  const sampled=sampleArchivePlaqueWalkV109(current.receipt.study,before,after,seconds,context);
  if(sampled.invalid||sampled.ledger===current.receipt.study)return{ledger,invalid:sampled.invalid};
  const next=structuredClone(current);next.receipt!.study=sampled.ledger;
  return normalizeHomeworldArchiveContinuationV111(next,context.basePlaque)?{ledger:next,invalid:false}:{ledger,invalid:true};
}

export function createArchiveContinuationTransactionV111(read:()=>unknown,context:()=>ArchiveContinuationContextV111,commit:(ledger:HomeworldArchiveContinuationV111)=>boolean){
  return(action:ArchiveContinuationActionV111,revision:number)=>{
    const raw=read(),current=context(),result=applyArchiveContinuationV111(raw,action,revision,current);
    if(!result.ok||!result.changed)return result;
    return commit(result.ledger)?result:{ok:false,changed:false,ledger:normalizeHomeworldArchiveContinuationV111(raw,current.basePlaque)??defaultHomeworldArchiveContinuationV111(current.ownerCreatedAt),writeRefused:true,message:'La continuation n’a pas été enregistrée. Le reçu différé, les pièces et le dernier point sont conservés ; réessaie ici.'};
  };
}

export type {HomeworldArchiveContinuationV111,HomeworldArchivePlaqueV109};
