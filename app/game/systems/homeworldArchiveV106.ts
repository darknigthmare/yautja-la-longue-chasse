import './homeworldStreetCompositionMountV92';
import {HOMEWORLD_ACTOR,type HomeworldActor,type HomeworldInput} from './homeworldCity';
import {homeworldCivicWalkableV80,stepHomeworldCivicActorV80} from './homeworldCivicWorldV80';
import {homeworldRouteSegmentV77} from './homeworldNavigationV77';
import {homeworldResidentOccludedV100} from './homeworldResidentVisibilityV100';
import type {HomeworldLevelV77} from './homeworldWorldV77';
import {HOMEWORLD_ARCHIVE_V106 as b,HOMEWORLD_ARCHIVE_SOURCE_V106 as source} from './homeworldArchiveDefinitionV106';
import {defaultHomeworldArchiveV106,normalizeHomeworldArchiveV106,type ArchivePointV106,type HomeworldArchiveLedgerV106} from './homeworldArchiveLedgerV106';
export interface ArchiveContextV106 {ownerCreatedAt:string;currentOwnerCreatedAt:string;actor:ArchivePointV106;levelId:string;visitedDistrictIds:readonly string[];interiorId?:string|null;inTransit?:boolean;active:boolean;otherOperationActive?:boolean;hostPresent?:boolean}
export type ArchiveActionV106='choose-b'|'reply'|'start'|'take-a'|'take-b'|'deposit-a'|'deposit-b'|'interrupt'|'resume'|'park'|'report';
export interface ArchiveResultV106 {ok:boolean;changed:boolean;ledger:HomeworldArchiveLedgerV106;message:string;writeRefused?:boolean}
const distance=(a:ArchivePointV106,c:ArchivePointV106)=>Math.hypot(a.x-c.x,a.y-c.y);
export const archiveActiveV106=(ledger:HomeworldArchiveLedgerV106|undefined)=>!!ledger?.receipt&&ledger.receipt.phase!=='completed';
/** Physics records every supported native step, including beneath foreground paint. */
export const archiveWalkableV106=(c:ArchiveContextV106)=>c.ownerCreatedAt===c.currentOwnerCreatedAt&&c.active&&c.levelId==='0'&&!c.interiorId&&!c.inTransit&&c.visitedDistrictIds.includes('port')
  &&[c.actor.x,c.actor.y].every(Number.isFinite)&&homeworldCivicWalkableV80('0',c.actor);
/** Object and speaker interactions still require an unobscured approach. */
export const archiveGroundV106=(c:ArchiveContextV106)=>archiveWalkableV106(c)&&!homeworldResidentOccludedV100('0',c.actor);
export const archivePostReachedV106=(c:ArchiveContextV106)=>archiveGroundV106(c)&&c.hostPresent!==false&&distance(c.actor,b.post)<=b.radius&&homeworldCivicWalkableV80('0',b.host)&&!homeworldResidentOccludedV100('0',b.host)&&homeworldRouteSegmentV77('0',c.actor,b.host);
export function stepHomeworldArchiveActorV106(actor:HomeworldActor,input:HomeworldInput,seconds:number,level:HomeworldLevelV77){return stepHomeworldCivicActorV80(actor,input,seconds,level);}
export function archiveNearbyActionV106(ledger:HomeworldArchiveLedgerV106|undefined,c:ArchiveContextV106):{action:ArchiveActionV106;label:string}|null {
  if(!archiveGroundV106(c))return null;
  const r=ledger?.receipt;if(!r||!['working','return'].includes(r.phase))return null;
  if(distance(r.last,c.actor)>2)return null;
  for(let i=0;i<2;i++){
    const item=r.cases[i],target=b.supports[i];
    if(item.place==='ground'&&!r.carrier&&!homeworldResidentOccludedV100('0',item)&&distance(c.actor,item)<=66&&homeworldRouteSegmentV77('0',c.actor,item))return {action:i===0?'take-a':'take-b',label:`Prendre le dossier ${item.id}`};
    if(r.carrier===item.id&&distance(c.actor,target.stand)<=36)return {action:i===0?'deposit-a':'deposit-b',label:`Déposer le dossier ${item.id} sur le support ${item.id}`};
  }return null;
}
export function applyArchiveActionV106(raw:unknown,action:ArchiveActionV106,expectedRevision:number,c:ArchiveContextV106):ArchiveResultV106 {
  const previous=raw===undefined?defaultHomeworldArchiveV106(c.ownerCreatedAt):normalizeHomeworldArchiveV106(raw);
  const fail=(message:string):ArchiveResultV106=>({ok:false,changed:false,ledger:previous??defaultHomeworldArchiveV106(c.ownerCreatedAt),message});
  if(!previous||previous.ownerCreatedAt!==c.ownerCreatedAt||c.currentOwnerCreatedAt!==c.ownerCreatedAt)return fail('Ces dossiers appartiennent à une autre partie.');
  if(previous.revision!==expectedRevision)return fail('L’archivage a changé. Relis son état avant de poursuivre.');
  if(previous.revision>=999990)return fail('La limite de cette archive est atteinte ; les dossiers restent conservés.');
  if(c.otherOperationActive)return fail('Termine le relevé du cartographe avant une nouvelle opération.');
  const ledger=structuredClone(previous),r=ledger.receipt,foot={x:c.actor.x,y:c.actor.y};
  if(action==='interrupt'){
    if(!r||!['working','return'].includes(r.phase))return {ok:true,changed:false,ledger,message:'Les dossiers restent à leur place.'};
    r.resumePhase=r.phase as 'working'|'return';r.phase='interrupted';r.interruptedCount++;
  }else if(action==='resume'){
    if(!r||r.phase!=='interrupted'||!archiveWalkableV106(c)||distance(r.last,c.actor)>4)return fail('Rejoins le dernier point confirmé pour reprendre les dossiers.');
    r.phase=r.resumePhase!;r.resumePhase=null;r.last=foot;
  }else if(action==='park'){
    if(!r||r.phase!=='interrupted'||!r.carrier||!archiveGroundV106(c)||distance(r.last,c.actor)>2)return fail('Le dossier porté ne peut être posé qu’au dernier point confirmé.');
    const item=r.cases.find(v=>v.id===r.carrier)!;item.place='ground';item.x=foot.x;item.y=foot.y;r.carrier=null;r.pickupWalked=null;
  }else if(['take-a','take-b','deposit-a','deposit-b'].includes(action)){
    if(!r||r.phase!=='working'||archiveNearbyActionV106(previous,c)?.action!==action)return fail('Rejoins à pied le dossier ou son support correspondant.');
    const index=action.endsWith('-a')?0:1,item=r.cases[index];
    if(action.startsWith('take')){item.place='carried';item.x=foot.x;item.y=foot.y;r.carrier=item.id;r.pickupWalked=r.walked;}
    else {
      if(r.pickupWalked===null||r.walked-r.pickupWalked<40)return fail('Le dossier doit être porté à pied jusqu’à son support.');
      item.place='support';item.x=b.supports[index].x;item.y=b.supports[index].y;r.carrier=null;r.pickupWalked=null;
      if(r.cases.every(v=>v.place==='support'))r.phase='return';
    }
  }else {
    if(!archivePostReachedV106(c))return fail('Rejoins l’archiviste au quai oriental.');
    if(action==='choose-b'){
      if(r)return fail('Les dossiers existants doivent être repris sans les remplacer.');
      ledger.receipt={sceneId:b.sceneId,operationId:b.operationId,sourceSha256:source.source.sha256,sourceCorpusSha256:source.sourceCorpusSha256,
        phase:'choice',resumePhase:null,last:foot,walked:0,cases:b.cases.map(v=>({id:v.id,...v.origin,place:'ground'})) as NonNullable<HomeworldArchiveLedgerV106['receipt']>['cases'],carrier:null,pickupWalked:null,interruptedCount:0,uncertaintyRecorded:false};
    }else if(action==='reply'){if(!r||r.phase!=='choice')return fail('Choisis d’abord le dépôt séparé.');r.phase='ready';}
    else if(action==='start'){if(!r||r.phase!=='ready')return fail('Écoute la réponse avant de prendre un dossier.');r.phase='working';r.last=foot;}
    else if(action==='report'){
      if(!r||r.phase!=='return'||r.cases.some(v=>v.place!=='support')||distance(r.last,c.actor)>2)return fail('Dépose les deux dossiers séparément puis reviens à pied.');
      r.phase='completed';r.uncertaintyRecorded=true;
    }else return fail('Action inconnue.');
  }
  ledger.revision++;if(!normalizeHomeworldArchiveV106(ledger))return fail('Ces dossiers ne peuvent pas être conservés dans cet état.');
  return {ok:true,changed:true,ledger,message:action==='report'?'Les deux dossiers restent séparés. Aucun lien historique n’est établi.':action==='park'?'Le dossier est posé au sol ; son emplacement est conservé.':action==='interrupt'?'Le dernier point et les dossiers sont conservés. Reprends ici, ou pose le dossier avant de repartir.':action==='resume'?'L’archivage reprend au dernier point confirmé.':'La position des dossiers est enregistrée.'};
}
export function sampleArchiveWalkV106(ledger:HomeworldArchiveLedgerV106,before:ArchivePointV106,after:ArchivePointV106,seconds:number,c:ArchiveContextV106){
  const r=ledger.receipt;if(!r||!['working','return'].includes(r.phase))return {ledger,invalid:false};
  const moved=distance(before,after);if(seconds===0&&moved===0)return {ledger,invalid:false};
  if(ledger.ownerCreatedAt!==c.ownerCreatedAt||c.otherOperationActive||!archiveWalkableV106({...c,actor:after})||distance(r.last,before)>1||!Number.isFinite(seconds)||seconds<=0||seconds>1/30+1e-6
    ||moved>Math.max(HOMEWORLD_ACTOR.walkSpeed,HOMEWORLD_ACTOR.depthSpeed)*seconds*2+.1||!homeworldRouteSegmentV77('0',before,after))return {ledger,invalid:true};
  if(moved<.001)return {ledger,invalid:false};
  const next=structuredClone(ledger),n=next.receipt!;n.last={x:after.x,y:after.y};n.walked=Math.min(1e9,n.walked+moved);
  if(n.carrier){const item=n.cases.find(v=>v.id===n.carrier)!;item.x=after.x;item.y=after.y;}
  return {ledger:next,invalid:false};
}
export function createArchiveTransactionV106(read:()=>unknown,context:()=>ArchiveContextV106,commit:(ledger:HomeworldArchiveLedgerV106)=>boolean){
  return(action:ArchiveActionV106,revision:number):ArchiveResultV106=>{
    const raw=read(),c=context(),result=applyArchiveActionV106(raw,action,revision,c);
    if(!result.ok||!result.changed)return result;
    return commit(result.ledger)?result:{ok:false,changed:false,ledger:normalizeHomeworldArchiveV106(raw)??defaultHomeworldArchiveV106(c.ownerCreatedAt),writeRefused:true,message:'L’archivage n’a pas été enregistré. Réessaie ici avant de poursuivre.'};
  };
}
